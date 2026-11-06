// support/checkr.js
// ------------------------------------------------------
// Sends a user to Checkr's hosted application, where they
// give consent and enter their own details. Sensitive data such
// as Social Security numbers never touches Flexago.
// ------------------------------------------------------

const BASE_URL = (
  process.env.CHECKR_BASE_URL || "https://api.checkr.com/v1"
).replace(/\/$/, "");

// Signup doesn't ask for an address, and FlexaGo launches in Texas.
const LAUNCH_STATE = "TX";

function isConfigured() {
  return Boolean(process.env.CHECKR_API_KEY && process.env.CHECKR_PACKAGE);
}

async function post(path, body) {
  const credentials = Buffer
    .from(`${process.env.CHECKR_API_KEY}:`)
    .toString("base64");

  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Checkr ${path} failed with status ${response.status}`);
  }

  return data;
}

async function createCandidate(user) {
  const candidate = await post("/candidates", {
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    phone: user.phone
  });

  return candidate.id;
}

async function createInvitation(candidateId, user) {
  const invitation = await post("/invitations", {
    candidate_id: candidateId,
    package: process.env.CHECKR_PACKAGE,
    work_locations: [{ country: "US", state: user.state || LAUNCH_STATE }]
  });

  return invitation.invitation_url;
}

module.exports = { isConfigured, createCandidate, createInvitation };
