// routes/onboardingRoutes.js
// ------------------------------------------------------
// Strict signup: name + role -> email code -> SMS code ->
// Stripe Identity -> date of birth + password.
//
// Each step is checked by the server. The browser only holds
// a signed session token, so nothing can be skipped or faked.
// ------------------------------------------------------

const crypto = require("crypto");
const express = require("express");
const jwt = require("jsonwebtoken");

const OnboardingSession = require("../models/OnboardingSession");
const User = require("../models/User");
const Traveler = require("../models/Traveler");
const auth = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");
const generateToken = require("../utils/generateToken");
const { sendVerificationEmail } = require("../utils/emailService");

const router = express.Router();

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const MIN_AGE = 18;
const MIN_PASSWORD_LENGTH = 8;

const FRONTEND_URL = (
  process.env.FRONTEND_URL || "https://flexago-frontend.onrender.com"
).replace(/\/$/, "");

// Phone carriers share IP addresses across many customers, so the
// strict limit is per signup and the per-IP limit is only a backstop.
const startLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 30 });
const ipSendLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 60 });
const sessionSendLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  keyFn: (req) => String(req.onboarding._id),
  message: "Too many codes requested. Please try again later."
});

/* ---------------- helpers ---------------- */

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  const Stripe = require("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function getTwilio() {
  const twilio = require("twilio");
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

function hashCode(sessionId, code) {
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`${sessionId}:${code}`)
    .digest("hex");
}

function newCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function codesMatch(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function sessionToken(session) {
  return jwt.sign(
    { sid: session._id.toString(), purpose: "onboarding" },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);
}

// Allows middle names and double surnames, but every name the
// user typed must appear on the ID.
function namesMatch(typed, fromId) {
  const idParts = normalizeName(fromId);
  const typedParts = normalizeName(typed);
  return typedParts.length > 0 && typedParts.every((p) => idParts.includes(p));
}

function ageOn(dob, now = new Date()) {
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() &&
      now.getUTCDate() < dob.getUTCDate());
  return beforeBirthday ? age - 1 : age;
}

function publicState(session) {
  return {
    firstName: session.firstName,
    lastName: session.lastName,
    role: session.role,
    email: session.email,
    phone: session.phone,
    emailVerified: Boolean(session.emailVerifiedAt),
    phoneVerified: Boolean(session.phoneVerifiedAt),
    identityStatus: session.identityStatus,
    identityVerified: session.identityStatus === "verified",
    reverify: Boolean(session.userId)
  };
}

async function requireSession(req, res, next) {
  try {
    const [scheme, token] = (req.headers.authorization || "").split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ success: false, error: "Signup session required." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.purpose !== "onboarding") {
      return res.status(401).json({ success: false, error: "Invalid signup session." });
    }

    const session = await OnboardingSession.findById(decoded.sid);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: "Your signup session expired. Please start again."
      });
    }

    req.onboarding = session;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Your signup session expired. Please start again."
    });
  }
}

// Applies a finished Stripe Identity session. Called by the status
// check and by the webhook, whichever arrives first.
async function applyIdentityResult(session, verification) {
  if (verification.status === "verified") {
    const outputs = verification.verified_outputs || {};

    if (
      (outputs.first_name && !namesMatch(session.firstName, outputs.first_name)) ||
      (outputs.last_name && !namesMatch(session.lastName, outputs.last_name))
    ) {
      session.identityStatus = "mismatch";
    } else {
      session.identityStatus = "verified";
      session.identityVerifiedAt = new Date();

      const dob = outputs.dob;

      if (dob?.year && dob?.month && dob?.day) {
        session.identityDob = [
          dob.year,
          String(dob.month).padStart(2, "0"),
          String(dob.day).padStart(2, "0")
        ].join("-");
      }
    }
  } else if (verification.status === "requires_input") {
    session.identityStatus = verification.last_error ? "failed" : "pending";
  } else if (verification.status === "canceled") {
    session.identityStatus = "failed";
  }

  await session.save();
}

async function retrieveVerification(stripe, id) {
  try {
    return await stripe.identity.verificationSessions.retrieve(id, {
      expand: ["verified_outputs", "verified_outputs.dob"]
    });
  } catch (error) {
    // Date of birth needs a restricted key; the name check still runs.
    return stripe.identity.verificationSessions.retrieve(id, {
      expand: ["verified_outputs"]
    });
  }
}

/* ---------------- step 1: name + role ---------------- */

router.post("/start", startLimit, async (req, res) => {
  try {
    const firstName = String(req.body?.firstName || "").trim();
    const lastName = String(req.body?.lastName || "").trim();
    const role = req.body?.role;

    if (!firstName || !lastName || firstName.length > 60 || lastName.length > 60) {
      return res.status(400).json({
        success: false,
        error: "Please enter your legal first and last name."
      });
    }

    if (!["sender", "traveler"].includes(role)) {
      return res.status(400).json({ success: false, error: "Please choose a role." });
    }

    const session = await OnboardingSession.create({ firstName, lastName, role });

    return res.status(201).json({
      success: true,
      token: sessionToken(session),
      data: publicState(session)
    });
  } catch (error) {
    console.error("Onboarding start error:", error);
    return res.status(500).json({ success: false, error: "Unable to start signup." });
  }
});

// Existing accounts verify with the same checks. Their email stays fixed.
router.post("/reverify/start", startLimit, auth, async (req, res) => {
  try {
    const { user } = req.user;

    if (!["sender", "traveler"].includes(user.role)) {
      return res.status(403).json({ success: false, error: "This account can't be verified here." });
    }

    await OnboardingSession.deleteMany({ userId: user._id });

    const session = await OnboardingSession.create({
      userId: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      email: user.email,
      emailVerifiedAt: user.emailVerified ? new Date() : null
    });

    return res.status(201).json({
      success: true,
      token: sessionToken(session),
      data: publicState(session)
    });
  } catch (error) {
    console.error("Reverify start error:", error);
    return res.status(500).json({ success: false, error: "Unable to start verification." });
  }
});

router.get("/status", requireSession, async (req, res) => {
  try {
    const session = req.onboarding;

    if (session.stripeIdentitySessionId && session.identityStatus === "pending") {
      const stripe = getStripe();

      if (stripe) {
        await applyIdentityResult(
          session,
          await retrieveVerification(stripe, session.stripeIdentitySessionId)
        );
      }
    }

    return res.json({ success: true, data: publicState(session) });
  } catch (error) {
    console.error("Onboarding status error:", error);
    return res.status(500).json({ success: false, error: "Unable to load signup." });
  }
});

/* ---------------- step 2: email ---------------- */

router.post("/email/send", ipSendLimit, requireSession, sessionSendLimit, async (req, res) => {
  try {
    const session = req.onboarding;
    const email = session.userId
      ? session.email
      : String(req.body?.email || "").trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: "Enter a valid email address." });
    }

    if (!session.userId && await User.exists({ email })) {
      return res.status(409).json({
        success: false,
        error: "An account already exists with this email."
      });
    }

    const code = newCode();

    session.email = email;
    session.emailVerifiedAt = null;
    session.emailCodeHash = hashCode(session._id, code);
    session.emailCodeExpires = new Date(Date.now() + CODE_TTL_MS);
    session.emailAttempts = 0;
    await session.save();

    await sendVerificationEmail(email, code);

    return res.json({ success: true });
  } catch (error) {
    console.error("Onboarding email error:", error);
    return res.status(500).json({ success: false, error: "Unable to send the code." });
  }
});

router.post("/email/verify", requireSession, async (req, res) => {
  return verifyCode(req, res, "email");
});

/* ---------------- step 3: phone ---------------- */

router.post("/phone/send", ipSendLimit, requireSession, sessionSendLimit, async (req, res) => {
  try {
    const session = req.onboarding;

    if (!session.emailVerifiedAt) {
      return res.status(409).json({ success: false, error: "Verify your email first." });
    }

    const phone = String(req.body?.phone || "").replace(/[^\d+]/g, "");

    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      return res.status(400).json({ success: false, error: "Enter a valid phone number." });
    }

    if (await User.exists({ phone, _id: { $ne: session.userId } })) {
      return res.status(409).json({
        success: false,
        error: "An account already exists with this phone number."
      });
    }

    const code = newCode();

    session.phone = phone;
    session.phoneVerifiedAt = null;
    session.phoneCodeHash = hashCode(session._id, code);
    session.phoneCodeExpires = new Date(Date.now() + CODE_TTL_MS);
    session.phoneAttempts = 0;
    await session.save();

    await getTwilio().messages.create({
      body: `Your Flexago verification code is: ${code}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Onboarding SMS error:", error);

    // Twilio: country not enabled, or no route to that number.
    if ([21408, 21612].includes(error.code)) {
      return res.status(422).json({
        success: false,
        error: "SMS isn't available for this country yet."
      });
    }

    if (error.code === 21211 || error.code === 21614) {
      return res.status(400).json({ success: false, error: "Enter a valid phone number." });
    }

    return res.status(500).json({ success: false, error: "Unable to send the SMS code." });
  }
});

router.post("/phone/verify", requireSession, async (req, res) => {
  return verifyCode(req, res, "phone");
});

async function verifyCode(req, res, channel) {
  try {
    const session = req.onboarding;
    const code = String(req.body?.code || "").trim();
    const hash = session[`${channel}CodeHash`];
    const expires = session[`${channel}CodeExpires`];

    if (!hash) {
      return res.status(400).json({ success: false, error: "Request a code first." });
    }

    if (!expires || expires < new Date()) {
      return res.status(400).json({ success: false, error: "That code expired. Request a new one." });
    }

    if (session[`${channel}Attempts`] >= MAX_CODE_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        error: "Too many wrong attempts. Request a new code."
      });
    }

    if (!codesMatch(hash, hashCode(session._id, code))) {
      session[`${channel}Attempts`] += 1;
      await session.save();
      return res.status(400).json({ success: false, error: "Invalid code." });
    }

    session[`${channel}VerifiedAt`] = new Date();
    session[`${channel}CodeHash`] = null;
    session[`${channel}CodeExpires`] = null;
    await session.save();

    return res.json({ success: true, data: publicState(session) });
  } catch (error) {
    console.error(`Onboarding ${channel} verify error:`, error);
    return res.status(500).json({ success: false, error: "Verification failed." });
  }
}

/* ---------------- step 4: identity ---------------- */

router.post("/identity/start", ipSendLimit, requireSession, sessionSendLimit, async (req, res) => {
  try {
    const session = req.onboarding;

    if (!session.emailVerifiedAt || !session.phoneVerifiedAt) {
      return res.status(409).json({
        success: false,
        error: "Verify your email and phone first."
      });
    }

    if (session.identityStatus === "verified") {
      return res.json({ success: true, alreadyVerified: true });
    }

    const stripe = getStripe();

    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: "Identity verification is unavailable."
      });
    }

    const verification = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: { onboardingSessionId: session._id.toString() },
      options: {
        document: {
          require_matching_selfie: true,
          require_live_capture: true
        }
      },
      return_url: `${FRONTEND_URL}/verify-stripe`
    });

    session.stripeIdentitySessionId = verification.id;
    session.identityStatus = "pending";
    await session.save();

    return res.json({ success: true, url: verification.url });
  } catch (error) {
    console.error("Onboarding identity error:", error);
    return res.status(500).json({
      success: false,
      error: "Unable to start identity verification."
    });
  }
});

/* ---------------- step 5: create the account ---------------- */

router.post("/complete", requireSession, async (req, res) => {
  try {
    const session = req.onboarding;
    const dobText = String(req.body?.dob || "").trim();
    const password = req.body?.password;

    if (
      !session.emailVerifiedAt ||
      !session.phoneVerifiedAt ||
      session.identityStatus !== "verified"
    ) {
      return res.status(403).json({
        success: false,
        error: "Finish all verification steps first."
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dobText)) {
      return res.status(400).json({ success: false, error: "Enter your date of birth." });
    }

    const dob = new Date(`${dobText}T00:00:00Z`);

    if (Number.isNaN(dob.getTime()) || dob.toISOString().slice(0, 10) !== dobText) {
      return res.status(400).json({ success: false, error: "Enter a valid date of birth." });
    }

    if (ageOn(dob) < MIN_AGE) {
      return res.status(403).json({
        success: false,
        error: `You must be at least ${MIN_AGE} to use Flexago.`
      });
    }

    if (session.identityDob && session.identityDob !== dobText) {
      return res.status(403).json({
        success: false,
        error: "Date of birth does not match your ID."
      });
    }

    if (session.userId) {
      return finishReverification(session, dobText, res);
    }

    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      });
    }

    if (
      (await User.exists({ email: session.email })) ||
      (await User.exists({ phone: session.phone }))
    ) {
      return res.status(409).json({ success: false, error: "This account already exists." });
    }

    const user = await User.create({
      firstName: session.firstName,
      lastName: session.lastName,
      email: session.email,
      phone: session.phone,
      password,
      role: session.role,
      dob: dobText,
      emailVerified: true,
      phoneVerified: true,
      identityVerified: true,
      identityVerifiedAt: session.identityVerifiedAt,
      stripeIdentitySessionId: session.stripeIdentitySessionId,
      kycVerified: true
    });

    if (user.role === "traveler") {
      await Traveler.create({
        user: user._id,
        status: "offline",
        verified: true,
        location: { type: "Point", coordinates: [0, 0], updatedAt: new Date() }
      });
    }

    await session.deleteOne();

    const safeUser = user.toObject();
    delete safeUser.password;

    return res.status(201).json({
      success: true,
      token: generateToken(user),
      data: safeUser
    });
  } catch (error) {
    console.error("Onboarding complete error:", error);
    return res.status(500).json({ success: false, error: "Unable to create your account." });
  }
});

async function finishReverification(session, dobText, res) {
  const user = await User.findById(session.userId);

  if (!user) {
    return res.status(404).json({ success: false, error: "Account not found." });
  }

  Object.assign(user, {
    phone: session.phone,
    dob: dobText,
    emailVerified: true,
    phoneVerified: true,
    identityVerified: true,
    identityVerifiedAt: session.identityVerifiedAt,
    stripeIdentitySessionId: session.stripeIdentitySessionId,
    kycVerified: true
  });

  await user.save();

  if (user.role === "traveler") {
    await Traveler.updateOne({ user: user._id }, { verified: true });
  }

  await session.deleteOne();

  const safeUser = user.toObject();
  delete safeUser.password;

  return res.json({ success: true, token: generateToken(user), data: safeUser });
}

router.applyIdentityResult = applyIdentityResult;
router.retrieveVerification = retrieveVerification;
router.namesMatch = namesMatch;

module.exports = router;
