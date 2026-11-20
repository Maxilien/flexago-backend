// ------------------------------------------------------
// Flexagoo User Controller (CommonJS)
// ------------------------------------------------------

console.log("🟢 userController.js LOADED");

const User = require("../models/User");
const Traveler = require("../models/Traveler");
const bcrypt = require("bcryptjs");
const Delivery = require("../models/Delivery");
const generateToken = require("../utils/generateToken");
const { uploadImage } = require("../utils/imageUpload");

// ------------------------------------------------------
// CURRENT USER
// ------------------------------------------------------
const PRIVATE_FIELDS = "-password -kyc -resetToken -resetTokenExpire";
const EDITABLE_FIELDS = ["address", "city", "state", "zipcode", "country"];

async function loadProfile(userId) {
  const user = await User.findById(userId).select(PRIVATE_FIELDS).lean();
  if (!user) return null;

  const traveler = user.role === "traveler"
    ? await Traveler.findOne({ user: user._id }).lean()
    : null;

  const deliveryFilter = traveler
    ? { travelerId: traveler._id }
    : { senderId: String(user._id) };

  const totalDeliveries = await Delivery.countDocuments(deliveryFilter);

  return { ...user, traveler, totalDeliveries };
}

async function getMe(req, res) {
  try {
    const profile = await loadProfile(req.user.id);

    if (!profile) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.json({ success: true, data: profile });
  } catch (err) {
    console.error("Get profile error:", err);
    return res.status(500).json({ success: false, error: "Unable to load profile" });
  }
}

// Verified identity (name, email, phone, DOB) can never change here.
async function updateMe(req, res) {
  try {
    const update = {};

    for (const field of EDITABLE_FIELDS) {
      if (typeof req.body?.[field] === "string") {
        update[field] = req.body[field].trim().slice(0, 200);
      }
    }

    await User.updateOne({ _id: req.user.id }, { $set: update });

    return res.json({ success: true, data: await loadProfile(req.user.id) });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ success: false, error: "Unable to save changes" });
  }
}

async function updateMyPhoto(req, res) {
  try {
    const photoUrl = await uploadImage(req.body?.photo, "flexago/profiles");

    await User.updateOne({ _id: req.user.id }, { $set: { photoUrl } });

    return res.json({ success: true, data: { photoUrl } });
  } catch (err) {
    console.error("Profile photo error:", err.message);
    return res.status(400).json({ success: false, error: "Unable to save that photo" });
  }
}

// App Store requirement. Personal details are removed; delivery and
// payment records stay, without the person's details, for tax and disputes.
async function deleteMe(req, res) {
  try {
    const password = req.body?.password;
    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (
      typeof password !== "string" ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({ success: false, error: "Incorrect password" });
    }

    const traveler = await Traveler.findOne({ user: user._id }).select("_id").lean();

    const activeFilter = {
      status: { $in: ["accepted", "picked_up", "in_transit"] },
      $or: [
        { senderId: String(user._id) },
        ...(traveler ? [{ travelerId: traveler._id }] : [])
      ]
    };

    if (await Delivery.exists(activeFilter)) {
      return res.status(409).json({
        success: false,
        error: "Finish your active deliveries before deleting your account."
      });
    }

    await Delivery.updateMany(
      { senderId: String(user._id) },
      { $set: { "sender.name": "Deleted user", "sender.phone": "", "sender.email": "" } }
    );

    if (traveler) {
      await Delivery.updateMany(
        { travelerId: traveler._id },
        { $set: { "travelerDetails.firstName": "Deleted", "travelerDetails.lastName": "user" } }
      );
      await Traveler.deleteOne({ _id: traveler._id });
    }

    await User.deleteOne({ _id: user._id });

    return res.json({ success: true });
  } catch (err) {
    console.error("Delete account error:", err);
    return res.status(500).json({ success: false, error: "Unable to delete account" });
  }
}

// ------------------------------------------------------
// LOGIN USER (SECURE VERSION)
// ------------------------------------------------------
async function loginUser(req, res) {
  try {
    const email = String(
      req.body?.email || ""
    )
      .trim()
      .toLowerCase();

    const password =
      req.body?.password;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error:
          "Email and password are required"
      });
    }

    const user =
      await User.findOne({
        email
      }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password"
      });
    }

    const isMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password"
      });
    }

    const token =
      generateToken(user);

    const safeUser =
      user.toObject();

    delete safeUser.password;

    return res.json({
      success: true,
      data: safeUser,
      token
    });
  } catch (err) {
    console.error(
      "User login error:",
      err
    );

    return res.status(500).json({
      success: false,
      error: "Unable to log in"
    });
  }
}
module.exports = {
  getMe,
  updateMe,
  updateMyPhoto,
  deleteMe,
  loginUser
};
