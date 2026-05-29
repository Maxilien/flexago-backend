/* ============================================================
   SENDER VERIFICATION LOGIC (Option B Status Model)
   ============================================================ */

let senderVerification = {
  idStatus: "unverified",
  selfieStatus: "unverified",
  emailStatus: "unverified",
  phoneStatus: "unverified",
  overallStatus: "unverified"
};

/* ============================================================
   UPDATE BADGES
   ============================================================ */
function updateBadges() {
  setBadge("idStatusBadge", senderVerification.idStatus);
  setBadge("selfieStatusBadge", senderVerification.selfieStatus);
  setBadge("emailStatusBadge", senderVerification.emailStatus);
  setBadge("phoneStatusBadge", senderVerification.phoneStatus);
  setBadge("overallStatusBadge", senderVerification.overallStatus);

  document.getElementById("overallStatusText").textContent =
    senderVerification.overallStatus === "verified"
      ? "Your identity is fully verified."
      : "You must complete verification before creating a delivery.";
}

function setBadge(id, status) {
  const el = document.getElementById(id);
  el.className = "badge badge-" + status;
  el.textContent = status.replace("_", " ");
}

/* ============================================================
   SUBMIT ID
   ============================================================ */
document.getElementById("submitIDBtn").onclick = () => {
  senderVerification.idStatus = "pending";
  updateOverallStatus();
  updateBadges();
};

/* ============================================================
   SUBMIT SELFIE
   ============================================================ */
document.getElementById("submitSelfieBtn").onclick = () => {
  senderVerification.selfieStatus = "pending";
  updateOverallStatus();
  updateBadges();
};

/* ============================================================
   EMAIL VERIFICATION
   ============================================================ */
document.getElementById("sendEmailVerificationBtn").onclick = () => {
  senderVerification.emailStatus = "pending";
  updateOverallStatus();
  updateBadges();
};

/* ============================================================
   PHONE VERIFICATION (placeholder)
   ============================================================ */
document.getElementById("verifyPhoneBtn").onclick = () => {
  senderVerification.phoneStatus = "pending";
  updateOverallStatus();
  updateBadges();
};

/* ============================================================
   OVERALL STATUS LOGIC
   ============================================================ */
function updateOverallStatus() {
  const { idStatus, selfieStatus, emailStatus } = senderVerification;

  if (idStatus === "verified" &&
      selfieStatus === "verified" &&
      emailStatus === "verified") {
    senderVerification.overallStatus = "verified";
  } else if (
      idStatus === "rejected" ||
      selfieStatus === "rejected") {
    senderVerification.overallStatus = "rejected";
  } else if (
      idStatus === "needs_resubmission" ||
      selfieStatus === "needs_resubmission") {
    senderVerification.overallStatus = "needs_resubmission";
  } else if (
      idStatus === "pending" ||
      selfieStatus === "pending" ||
      emailStatus === "pending") {
    senderVerification.overallStatus = "pending";
  } else {
    senderVerification.overallStatus = "unverified";
  }
}

/* INITIAL RENDER */
updateBadges();
