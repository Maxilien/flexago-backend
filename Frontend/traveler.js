/* ============================================================
   FLEXAGO TRAVELER — FINAL VERSION
   PART 1 — GLOBAL STATE • MAP • ROUTE • AUTOCOMPLETE • HELPERS
   ============================================================ */


/* ============================================================
   GLOBAL STATE (TRAVELER)
   ============================================================ */
let travelerMap = null;
let travelerDirections = null;
let travelerDirectionsRenderer = null;

let currentTravelerStart = null;        // { lat, lng }
let currentTravelerDest = null;         // { lat, lng }
let currentTravelerPolyline = [];       // [ [lng, lat], ... ]

let ws = null;
let availableJobs = [];
let acceptedJobs = [];
let completedJobs = [];

let travelerRouteRadiusMiles = 5;
let travelerPickupMarker = null;
let travelerDropoffMarker = null;


/* ============================================================
   DARK MAP STYLE
   ============================================================ */
const FLEXAGO_DARK_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1e293b" }]
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cbd5e1" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0a0f1f" }]
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }]
  }
];

/* ============================================================
   TRAVELER MAP INITIALIZATION (NEW)
   ============================================================ */
function initTravelerMap() {
  const container = document.getElementById("travelerMap");
  if (!container || typeof google === "undefined" || !google.maps) {
    console.warn("⚠️ travelerMap container missing or Google Maps not loaded");
    return;
  }

  travelerMap = new google.maps.Map(container, {
    center: { lat: 30.2672, lng: -97.7431 },
    zoom: 7,
    styles: FLEXAGO_DARK_STYLE,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false
  });

  travelerDirections = new google.maps.DirectionsService();
  travelerDirectionsRenderer = new google.maps.DirectionsRenderer({
    suppressMarkers: false,
    preserveViewport: false,
    polylineOptions: {
      strokeColor: "#3b82f6",
      strokeOpacity: 0.9,
      strokeWeight: 5
    }
  });

  travelerDirectionsRenderer.setMap(travelerMap);

  console.log("🗺️ Traveler map initialized");
}

/* ============================================================
   TRAVELER ROUTE DRAWING + POLYLINE EXTRACTION
   ============================================================ */
function updateTravelerRoute() {
  if (!currentTravelerStart || !currentTravelerDest) {
    console.warn("⚠️ Missing start or destination — cannot draw route");
    return;
  }

  travelerDirections.route(
    {
      origin: currentTravelerStart,
      destination: currentTravelerDest,
      travelMode: google.maps.TravelMode.DRIVING
    },
    (result, status) => {
      if (status !== "OK") {
        console.warn("⚠️ Directions failed:", status);
        return;
      }

      travelerDirectionsRenderer.setDirections(result);

      const path = result.routes[0].overview_path;
      currentTravelerPolyline = path.map(p => [p.lng(), p.lat()]);

      console.log("🟢 Traveler polyline updated:", currentTravelerPolyline);
    }
  );
}

/* ============================================================
   AUTOCOMPLETE (2025+ API)
   ============================================================ */
function initTravelerAutocomplete() {
  initTravelerAutocompleteField("pickupInput", "start");
  initTravelerAutocompleteField("dropoffInput", "dest");
}


function initTravelerAutocompleteField(inputId, type) {
  const input = document.getElementById(inputId);
  if (!input) {
    console.warn("Traveler autocomplete: input not found:", inputId);
    return;
  }

  const autocomplete = new google.maps.places.Autocomplete(input, {
    fields: ["geometry", "formatted_address"]
  });

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place || !place.geometry) {
      console.warn("Traveler autocomplete: missing geometry");
      return;
    }

    const coords = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    };

 if (type === "start") {
  currentTravelerStart = coords;
  setTravelerMarker("pickup", coords);
}

if (type === "dest") {
  currentTravelerDest = coords;
  setTravelerMarker("dropoff", coords);
}


    updateTravelerRoute();
  });
}

/* ============================================================
   ROUTE PLANNER INIT
   ============================================================ */
function initRoutePlanner() {
  initTravelerAutocomplete();

  const radiusSlider = document.getElementById("routeRadiusSlider");
  const radiusLabel = document.getElementById("routeRadiusLabel");

  if (radiusSlider) {
    travelerRouteRadiusMiles = Number(radiusSlider.value) || 5;

    if (radiusLabel) {
      radiusLabel.textContent = `${travelerRouteRadiusMiles} mi`;
    }

    radiusSlider.addEventListener("input", (e) => {
      travelerRouteRadiusMiles = Number(e.target.value) || 5;

      if (radiusLabel) {
        radiusLabel.textContent = `${travelerRouteRadiusMiles} mi`;
      }

      refreshJobs();
    });
  }
}

/* ============================================================
   FLEXAGO TRAVELER — FINAL VERSION
   PART 2 — HELPERS • MAP CALLBACK • JOB FETCHING
   ============================================================ */

/* ============================================================
   SMALL HELPERS
   ============================================================ */
function debounce(fn, delay = 250) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function safe(fn) {
  try {
    fn();
  } catch (err) {
    console.warn("Flexago error:", err);
  }
}
async function getRealMiles(pickupAddress, dropoffAddress) {
  return new Promise((resolve) => {
    const service = new google.maps.DirectionsService();

    service.route(
      {
        origin: pickupAddress,
        destination: dropoffAddress,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          const meters = result.routes[0].legs[0].distance.value;
          const miles = meters * 0.000621371;
          resolve(miles);
        } else {
          console.warn("Directions API failed:", status);
          resolve(null);
        }
      }
    );
  });
}

async function acceptJob(jobId) {
  try {
    const res = await fetch(`http://localhost:3000/api/deliveries/${jobId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ travelerId: window.travelerId })
    });

    if (!res.ok) {
      console.warn("Accept failed");
      return;
    }

    const updated = await res.json();

    // Move job to accepted list
    acceptedJobs.push(updated.data);
    availableJobs = availableJobs.filter(j => j._id !== jobId);

    refreshJobs();
  } catch (err) {
    console.error("Error accepting job:", err);
  }
}

async function declineJob(jobId) {
  try {
    const res = await fetch(`http://localhost:3000/api/deliveries/${jobId}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if (!res.ok) {
      console.warn("Decline failed");
      return;
    }

    // Remove from available list
    availableJobs = availableJobs.filter(j => j._id !== jobId);

    refreshJobs();
  } catch (err) {
    console.error("Error declining job:", err);
  }
}


function setTravelerMarker(type, position) {
  if (!travelerMap) return;

  // Remove old marker
  if (type === "pickup" && travelerPickupMarker) {
    travelerPickupMarker.setMap(null);
  }
  if (type === "dropoff" && travelerDropoffMarker) {
    travelerDropoffMarker.setMap(null);
  }

  const isPickup = type === "pickup";

  const marker = new google.maps.Marker({
    position,
    map: travelerMap,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: isPickup ? "#22c55e" : "#ef4444",   // green / red
      fillOpacity: 1,
      strokeColor: isPickup ? "#166534" : "#7f1d1d",
      strokeWeight: 2
    }
  });

  if (isPickup) travelerPickupMarker = marker;
  else travelerDropoffMarker = marker;
}

function calculatePayout(job, miles) {
  const type = job.deliveryType || "local"; 
  const weight = job.package?.weight || 0;
  const insurance = job.package?.insurance || "waive";

  let base = 0;
  let perMile = 0;

  if (type === "local") {
    base = 5;
    perMile = 0.8;
  } else if (type === "nationwide") {
    base = 10;
    perMile = 1.2;
  } else if (type === "international") {
    return 200 * 0.8; // traveler gets 80%
  }

  let price = base + (miles * perMile);

  // Weight fee
  price += weight * 0.25;

  // Insurance
  if (insurance === "basic") price += 10;
  if (insurance === "premium") price += weight * 1.0;

  // Traveler receives 80%
  return price * 0.8;
}

/* ============================================================
   GOOGLE MAP CALLBACK (TRAVELER)
   ============================================================ */
window.initMap = initTravelerMap;

/* ============================================================
   JOB FETCHING (PRODUCTION SEARCH)
   ============================================================ */
let isSearching = false;   // <-- ADD THIS ABOVE THE FUNCTION

async function loadAvailableJobs() {
  if (isSearching) return;   // ⛔ Prevent double-render
  isSearching = true;

  try {
    if (!currentTravelerStart || !currentTravelerDest) {
      console.warn("Missing start or destination");
      return;
    }

    const payload = {
      start: {
        lng: Number(currentTravelerStart.lng),
        lat: Number(currentTravelerStart.lat)
      },
      destination: {
        lng: Number(currentTravelerDest.lng),
        lat: Number(currentTravelerDest.lat)
      },
      route: Array.isArray(currentTravelerPolyline)
        ? currentTravelerPolyline
        : [],
      maxMiles: 999999
    };

    console.log("🔵 Sending payload to backend:", payload);

    const res = await fetch("http://localhost:3000/api/deliveries/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.warn("Failed to load available jobs");
      return;
    }

    const data = await res.json();
    availableJobs = Array.isArray(data.data) ? data.data : [];

    console.log("🟢 Jobs received:", availableJobs);

    refreshJobs();
    refreshEarnings();

  } catch (err) {
    console.error("Error loading jobs:", err);
  } finally {
    isSearching = false;   // 🔵 Allow next refresh
  }
}

/* ============================================================
   ROUTE MATCHING (BACKEND-DRIVEN)
   ============================================================ */
function isJobOnRoute(job) {
  // Backend already applies full route + distance logic.
  // For now, treat all returned jobs as on-route.
  return true;
}

/* ============================================================
   REFRESH JOB LISTS
   ============================================================ */
function refreshJobs() {
  const availableList = document.getElementById("jobsAvailableList");
  const acceptedList = document.getElementById("jobsAcceptedList");
  const completedList = document.getElementById("jobsCompletedList");

  if (availableList) availableList.innerHTML = "";
  if (acceptedList) acceptedList.innerHTML = "";
  if (completedList) completedList.innerHTML = "";

  if (availableList) {
    const sorted = [...availableJobs]
      .map(job => ({ ...job, onRoute: isJobOnRoute(job) }))
      .sort((a, b) => {
        if (a.onRoute && !b.onRoute) return -1;
        if (!a.onRoute && b.onRoute) return 1;
        return 0;
      });

    sorted.forEach(job => renderJobCard(job, "available", availableList));
  }

  if (acceptedList) {
    acceptedJobs.forEach(job => renderJobCard(job, "accepted", acceptedList));
  }

  if (completedList) {
    completedJobs.forEach(job => renderJobCard(job, "completed", completedList));
  }
}

/* ============================================================
   EARNINGS REFRESH (BASIC)
   ============================================================ */
function refreshEarnings() {
  const earningsEl = document.getElementById("earningsValue");
  if (!earningsEl) return;

  const total = completedJobs.reduce((sum, job) => {
    const price = Number(job.price || 0);
    return sum + (isNaN(price) ? 0 : price);
  }, 0);

  earningsEl.textContent = `$${total.toFixed(2)}`;
}
/* ============================================================
   JOB RENDERING
   ============================================================ */
function renderJobCard(job, status, listElement) {
  const template = document.getElementById("jobCardTemplate");
  if (!template || !listElement) return;

  // 1. Clone template
  const cardFragment = template.content.cloneNode(true);
  const card = cardFragment.querySelector(".job-card");

  // ===============================
  // CREATE ACTION BUTTONS  ✅ KEEP THIS
  // ===============================
const acceptBtn = card.querySelector(".accept-btn");
const declineBtn = card.querySelector(".decline-btn");



  // ===============================
  // BASIC FIELDS
  // ===============================
  card.querySelector(".job-pickup").textContent =
    job.pickup?.address || "";

  card.querySelector(".job-dropoff").textContent =
    job.dropoff?.address || "";

  card.querySelector(".job-size").textContent =
    `${job.package?.type || ""}, ${job.package?.weight || ""} lbs`;

  // ===============================
  // DISTANCE + PAYOUT
  // ===============================
  const tempMiles =
    (job.distance?.pickupStartMiles || 0) +
    (job.distance?.dropoffDestMiles || 0);

  card.querySelector(".job-distance").textContent =
    `${tempMiles.toFixed(2)} miles`;

  getRealMiles(job.pickup?.address, job.dropoff?.address).then((miles) => {
    const milesValue = miles || tempMiles;

    card.querySelector(".job-distance").textContent =
      `${milesValue.toFixed(2)} miles`;

    const payout = calculatePayout(job, milesValue);
    card.querySelector(".job-price").textContent =
      `$${payout.toFixed(2)}`;
  });

// ===============================
// ACCEPT / DECLINE BUTTONS  ✅ USE THE NEW BUTTONS
// ===============================
if (status === "available") {

  acceptBtn.addEventListener("click", () => {
    console.log("ACCEPT CLICKED", job._id);   // ⭐ TEST A
    acceptJob(job._id, window.travelerId);
  });

  declineBtn.addEventListener("click", () => {
    console.log("DECLINE CLICKED", job._id);  // optional test
    declineJob(job._id);
  });

} else {
  acceptBtn.style.display = "none";
  declineBtn.style.display = "none";
}

  // ===============================
  // ACCEPTED JOB — EXPANDED DETAILS
  // ===============================
  if (status === "accepted") {
    const details = document.createElement("div");
    details.className = "job-expanded";
    details.innerHTML = `
      <div class="job-section">
        <strong>Sender:</strong> ${job.sender?.name || ""}
        <br><strong>Phone:</strong> ${job.sender?.phone || ""}
        <br><strong>Email:</strong> ${job.sender?.email || ""}
      </div>

      <div class="job-section">
        <strong>Pickup Instructions:</strong> ${job.pickup?.location || ""}
      </div>

      <div class="job-section">
        <strong>Dropoff Instructions:</strong> ${job.dropoff?.location || ""}
      </div>

      <div class="job-section">
        <strong>Package:</strong> ${job.package?.type}, ${job.package?.weight} lbs
      </div>
    `;
    card.appendChild(details);
  }

  listElement.appendChild(card);
}


/* ============================================================
   FLEXAGO TRAVELER — FINAL VERSION
   PART 3 — JOB ACTIONS • WEBSOCKETS • CHAT • JOB TABS
   ============================================================ */


/* ============================================================
   JOB ACTIONS — FIXED VERSION
   ============================================================ */
async function acceptJob(jobId, travelerId) {
  try {
    console.log("Traveler ID:", travelerId);

    const res = await fetch(
      `http://localhost:3000/api/traveler/jobs/${jobId}/accept`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ travelerId })
      }
    );

    if (!res.ok) throw new Error("Failed to accept job");

    await loadAvailableJobs();
  } catch (err) {
    console.error("Accept job failed:", err);
    alert("Unable to accept job. Please try again.");
  }
}

async function declineJob(jobId) {
  try {
    const res = await fetch(
      `http://localhost:3000/api/travelers-db/jobs/${jobId}/decline`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      }
    );
    if (!res.ok) throw new Error("Failed to decline job");

    await loadAvailableJobs();
  } catch (err) {
    console.error("Decline job failed:", err);
    alert("Unable to decline job. Please try again.");
  }
}

async function updateTravelerStatus(jobId, status) {
  try {
    const res = await fetch(
      `http://localhost:3000/api/travelers-db/jobs/${jobId}/status`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      }
    );
    if (!res.ok) throw new Error("Failed to update job status");

    await loadAvailableJobs();
  } catch (err) {
    console.error("Update job status failed:", err);
    alert("Unable to update status. Please try again.");
  }
}

async function completeJob(jobId, photoBase64) {
  try {
    const res = await fetch(
      `http://localhost:3000/api/travelers-db/jobs/${jobId}/complete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofPhoto: photoBase64 })
      }
    );
    if (!res.ok) throw new Error("Failed to complete delivery");

    await loadAvailableJobs();
  } catch (err) {
    console.error("Complete delivery failed:", err);
    alert("Unable to complete delivery. Please try again.");
  }
}
/* ============================================================
   REAL-TIME JOB UPDATES (WEBSOCKETS)
   ============================================================ */
let wsUpdateTimeout = null;   // <-- MUST be OUTSIDE initJobSocket()

function initJobSocket() {
  try {
    ws = new WebSocket("ws://localhost:3000/ws/traveler");

    ws.addEventListener("open", () => {
      console.log("Job WebSocket connected");
    });

    ws.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (
          msg.type === "job_update" ||
          msg.type === "job_completed" ||
          msg.type === "new_job"
        ) {
          clearTimeout(wsUpdateTimeout);

          wsUpdateTimeout = setTimeout(() => {
            if (!isSearching) {
              loadAvailableJobs();   // 🔵 Debounced refresh
            }
          }, 300);
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    });

    ws.addEventListener("close", () => {
      console.warn("Job WebSocket closed — reconnecting in 3s");
      setTimeout(initJobSocket, 3000);
    });
  } catch (err) {
    console.error("initJobSocket failed:", err);
  }
}
/* ============================================================
   CHAT WIDGET
   ============================================================ */
function initChatWidget() {
  const toggleBtn = document.getElementById("chatToggleBtn");
  const bubble = document.getElementById("chatBubble");
  const closeBtn = document.getElementById("chatCloseBtn");
  const sendBtn = document.getElementById("chatSendBtn");
  const input = document.getElementById("chatInput");
  const body = document.getElementById("chatBody");

  if (!toggleBtn || !bubble || !closeBtn || !sendBtn || !input || !body) return;

  toggleBtn.addEventListener("click", () => {
    bubble.classList.toggle("open");
  });

  closeBtn.addEventListener("click", () => {
    bubble.classList.remove("open");
  });

  sendBtn.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text) return;

    appendChatMessage(body, text, "user");
    input.value = "";

    appendChatMessage(
      body,
      "Thanks! A support agent will review your delivery details shortly.",
      "system"
    );
  });
}

function appendChatMessage(container, text, type) {
  const div = document.createElement("div");
  div.style.marginBottom = "0.35rem";
  div.style.fontSize = "0.75rem";
  div.style.color = type === "user" ? "#e5e7eb" : "#9ca3af";
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

/* ============================================================
   JOB TABS
   ============================================================ */
function initJobsTabs() {
  const tabs = document.querySelectorAll(".jobs-tab");
  const lists = {
    available: document.getElementById("jobsAvailableList"),
    accepted: document.getElementById("jobsAcceptedList"),
    completed: document.getElementById("jobsCompletedList")
  };

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      Object.keys(lists).forEach(key => {
        if (lists[key]) {
          lists[key].classList.toggle("hidden", key !== target);
        }
      });

      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

/* ============================================================
   FLEXAGO TRAVELER — FINAL VERSION
   PART 4 — ACCOUNT • VERIFICATION • PAYOUTS
   ============================================================ */

/* ============================================================
   ACCOUNT STATE
   ============================================================ */
let accountState = {
  profilePhoto: null,
  firstName: "",
  lastName: "",
  dob: "",
  phone: "",
  email: ""
};

let accountOriginalState = null;

/* ============================================================
   ACCOUNT PAGE INITIALIZER
   ============================================================ */
function initAccountPage() {
  safe(initProfilePhotoUpload);
  safe(initAccountFieldTracking);
  safe(initAccountSaveButton);
  safe(loadAccountData);
}

/* ============================================================
   PROFILE PHOTO UPLOAD
   ============================================================ */
function initProfilePhotoUpload() {
  const btn = document.getElementById("profilePhotoUploadBtn");
  const input = document.getElementById("profilePhotoInput");
  const preview = document.getElementById("profilePhotoPreview");

  if (!btn || !input || !preview) return;

  btn.addEventListener("click", () => input.click());

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      preview.src = dataUrl;
      accountState.profilePhoto = dataUrl;
      markAccountDirty();
    };
    reader.readAsDataURL(file);
  });
}

/* ============================================================
   ACCOUNT FIELD TRACKING
   ============================================================ */
function initAccountFieldTracking() {
  const fields = [
    "firstNameInput",
    "lastNameInput",
    "dobInput",
    "phoneInput",
    "emailInput"
  ];

  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener("input", () => {
      syncAccountState();
      markAccountDirty();
    });
  });
}

function syncAccountState() {
  accountState.firstName = valueOf("firstNameInput");
  accountState.lastName = valueOf("lastNameInput");
  accountState.dob = valueOf("dobInput");
  accountState.phone = valueOf("phoneInput");
  accountState.email = valueOf("emailInput");
}

function markAccountDirty() {
  const btn = document.getElementById("saveAccountBtn");
  if (!btn) return;
  btn.disabled = false;
  btn.classList.remove("disabled");
}
/* ============================================================
   SAVE BUTTON
   ============================================================ */
function initAccountSaveButton() {
  const btn = document.getElementById("saveAccountBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    if (btn.disabled) return;

    btn.disabled = true;
    btn.classList.add("disabled");
    const originalText = btn.textContent;
    btn.textContent = "Saving...";

    syncAccountState();

    try {
      // TODO: Replace fake API with real backend endpoint
      await fakeSaveAccountApi(accountState);

      accountOriginalState = JSON.parse(JSON.stringify(accountState));
      showAccountToast("Your account details have been saved.");
    } catch (err) {
      console.warn("Save account error:", err);
      showAccountToast("Unable to save changes. Please try again.");
      btn.disabled = false;
      btn.classList.remove("disabled");
    } finally {
      btn.textContent = originalText;
    }
  });
}

// Placeholder for real backend call
async function fakeSaveAccountApi(payload) {
  return new Promise(resolve => setTimeout(resolve, 800));
}

function showAccountToast(message) {
  alert(message);
}

/* ============================================================
   LOAD EXISTING DATA (OPTIONAL BACKEND)
   ============================================================ */
async function loadAccountData() {
  const data = null;

  if (!data) {
    accountOriginalState = JSON.parse(JSON.stringify(accountState));
    return;
  }

  accountOriginalState = JSON.parse(JSON.stringify(accountState));
}

/* ============================================================
   ACCOUNT HELPERS
   ============================================================ */
function valueOf(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

/* ============================================================
   VERIFICATION STATE
   ============================================================ */
let verificationState = {
  step1: null, // ID Front
  step2: null, // ID Back
  step3: null, // Selfie
  step4: null, // Address Proof
  submitted: false
};

/* ============================================================
   INIT VERIFICATION PAGE
   ============================================================ */
function initVerificationPage() {
  safe(initVerificationUploads);
  safe(updateVerificationProgressBar);
  safe(updateVerificationStatusBadge);
  safe(initVerificationSubmit);
}

/* ============================================================
   UPLOAD HANDLER (TRAVELER VERSION)
   ============================================================ */
function initVerificationUploads() {
  setupUpload(1);
  setupUpload(2);
  setupUpload(3);
  setupUpload(4);
}

function setupUpload(step) {
  const box = document.getElementById(`uploadBox${step}`);
  const input = document.getElementById(`fileInput${step}`);
  const preview = document.getElementById(`preview${step}`);

  if (!box || !input) return;

  box.addEventListener("click", () => input.click());

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      verificationState[`step${step}`] = reader.result;

      preview.src = reader.result;
      preview.classList.remove("hidden");

      updateVerificationProgressBar();
      updateVerificationStatusBadge();
    };

    reader.readAsDataURL(file);
  });
}

/* ============================================================
   PROGRESS BAR (TRAVELER VERSION)
   ============================================================ */
function updateVerificationProgressBar() {
  const total = 4;
  const completed = [
    verificationState.step1,
    verificationState.step2,
    verificationState.step3,
    verificationState.step4
  ].filter(Boolean).length;

  const percent = (completed / total) * 100;

  const fill = document.getElementById("verificationProgressFill");
  if (fill) fill.style.width = percent + "%";
}

/* ============================================================
   STATUS BADGE (TRAVELER VERSION)
   ============================================================ */
function updateVerificationStatusBadge() {
  const badge = document.getElementById("verificationStatusBadge");
  if (!badge) return;

  if (verificationState.submitted) {
    badge.textContent = "Submitted";
    badge.className = "status-badge submitted";
    return;
  }

  const completed = [
    verificationState.step1,
    verificationState.step2,
    verificationState.step3,
    verificationState.step4
  ].filter(Boolean).length;

  if (completed === 4) {
    badge.textContent = "Ready to Submit";
    badge.className = "status-badge ready";
  } else {
    badge.textContent = "Pending";
    badge.className = "status-badge pending";
  }
}

/* ============================================================
   SUBMIT VERIFICATION (TRAVELER VERSION)
   ============================================================ */
function initVerificationSubmit() {
  const btn = document.querySelector("#template-verification .primary-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const allDone =
      verificationState.step1 &&
      verificationState.step2 &&
      verificationState.step3 &&
      verificationState.step4;

    if (!allDone) {
      alert("Please complete all 4 steps before submitting.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Submitting...";

    try {
      const res = await fetch("/api/traveler/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idFront: verificationState.step1,
          idBack: verificationState.step2,
          selfie: verificationState.step3,
          addressProof: verificationState.step4
        })
      });

      if (!res.ok) throw new Error("Verification submission failed");

      verificationState.submitted = true;
      updateVerificationStatusBadge();

      btn.textContent = "Submitted";
    } catch (err) {
      console.error(err);
      alert("Unable to submit verification. Please try again.");
      btn.disabled = false;
      btn.textContent = "Submit Verification";
    }
  });
}

/* ============================================================
   VERIFICATION NAVIGATION (SUCCESS / FAILURE)
   ============================================================ */
function showVerificationSuccess() {
  document.getElementById("template-verification").classList.add("hidden");
  document.getElementById("template-verification-failed").classList.add("hidden");
  document.getElementById("template-verification-success").classList.remove("hidden");

  const backBtn = document.getElementById("backToAccount");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      navigateTo("account");
    });
  }
}

function showVerificationFailed() {
  document.getElementById("template-verification").classList.add("hidden");
  document.getElementById("template-verification-success").classList.add("hidden");
  document.getElementById("template-verification-failed").classList.remove("hidden");

  const retryBtn = document.getElementById("retryVerification");
  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      navigateTo("verification");
    });
  }
}

/* ============================================================
   PAYOUT VALIDATION HELPERS
   ============================================================ */
function validateCardFields() {
  const name = document.getElementById("cardName").value.trim();
  const number = document.getElementById("cardNumber").value.trim();
  const expiry = document.getElementById("cardExpiry").value.trim();
  const cvc = document.getElementById("cardCVC").value.trim();

  if (!name) return "Please enter the name on the card.";
  if (!/^\d{12,19}$/.test(number.replace(/\s+/g, ""))) return "Invalid card number.";
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return "Expiry must be in MM/YY format.";
  if (!/^\d{3,4}$/.test(cvc)) return "Invalid CVC.";

  return null;
}

function validateBankFields() {
  const routing = document.getElementById("bankRoutingInput").value.trim();
  const account = document.getElementById("bankAccountInput").value.trim();
  const iban = document.getElementById("bankIbanInput").value.trim();

  if (iban) {
    if (!/^[A-Z0-9]{10,34}$/i.test(iban.replace(/\s+/g, ""))) {
      return "Invalid IBAN format.";
    }
    return null;
  }

  if (!/^\d{9}$/.test(routing)) return "Routing number must be 9 digits.";
  if (!/^\d{6,17}$/.test(account)) return "Account number must be 6–17 digits.";

  return null;
}

/* ============================================================
   PAYOUTS PAGE — FULL BACKEND VERSION
   ============================================================ */
function initPayoutsPage() {
  safe(loadPayoutMethod);
  safe(initPayoutForm);

  const openAddPayment = document.getElementById("openAddPaymentModal");
  const addPaymentModal = document.getElementById("addPaymentModal");
  const closeAddPayment = document.getElementById("closeAddPaymentModal");

  if (openAddPayment) {
    openAddPayment.addEventListener("click", () => {
      if (addPaymentModal) addPaymentModal.classList.remove("hidden");
    });
  }

  if (closeAddPayment) {
    closeAddPayment.addEventListener("click", () => {
      if (addPaymentModal) addPaymentModal.classList.add("hidden");
    });
  }

  const cardFields = document.getElementById("cardFields");
  const bankFields = document.getElementById("bankFields");

  document.querySelectorAll("input[name='payoutType']").forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "card") {
        if (cardFields) cardFields.classList.remove("hidden");
        if (bankFields) bankFields.classList.add("hidden");
      } else {
        if (cardFields) cardFields.classList.add("hidden");
        if (bankFields) bankFields.classList.remove("hidden");
      }
    });
  });
}

async function loadPayoutMethod() {
  try {
    const res = await fetch("/api/traveler/payouts");
    if (!res.ok) return;

    const data = await res.json();
    const display = document.getElementById("payoutMethodDisplay");
    if (!display) return;

    if (data.type === "card") {
      display.textContent = `Card •••• ${data.last4}`;
    }

    if (data.type === "bank") {
      display.textContent = `Bank Account •••• ${data.last4}`;
    }
  } catch (err) {
    console.error("Failed to load payout method:", err);
  }
}

function initPayoutForm() {
  const saveBtn = document.getElementById("savePaymentMethod");
  if (!saveBtn) return;

  saveBtn.addEventListener("click", async () => {
    const type = document.querySelector("input[name='payoutType']:checked")?.value;
    if (!type) {
      alert("Please select a payout method.");
      return;
    }

    let error = type === "card" ? validateCardFields() : validateBankFields();
    if (error) {
      alert(error);
      return;
    }

    let payload = { type };

    if (type === "card") {
      payload.card = {
        number: valueOf("cardNumber"),
        expiry: valueOf("cardExpiry"),
        cvc: valueOf("cardCVC"),
        name: valueOf("cardName")
      };
    }

    if (type === "bank") {
      const routing = valueOf("bankRoutingInput");
      const account = valueOf("bankAccountInput");
      const iban = valueOf("bankIbanInput");

      payload.bank = iban
        ? { iban }
        : { routing, account };
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      const res = await fetch("/api/traveler/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save payout method");

      alert("Payout method saved.");
      await loadPayoutMethod();
    } catch (err) {
      console.error("Payout save failed:", err);
      alert("Unable to save payout method.");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
    }
  });
}

/* ============================================================
   SUPPORT PAGE (BASIC)
   ============================================================ */
function initSupportPage() {
  // Placeholder for future expansion
}
/* ============================================================
   PAGE SWITCHING (FINAL WIRING)
   ============================================================ */
function loadPage(view) {
  const main = document.getElementById("mainContentArea");
  const jobsLayout = document.getElementById("jobsLayout");
  if (!main || !jobsLayout) return;

  function showJobsLayout() {
    jobsLayout.style.display = "";
    main.style.display = "none";

    setTimeout(() => {
      if (typeof initTravelerMap === "function") initTravelerMap();
      safe(initRoutePlanner);
      safe(initJobsTabs);
      loadAvailableJobs();
    }, 50);
  }

  function showMainLayout() {
    jobsLayout.style.display = "none";
    main.style.display = "";
  }

  if (view === "jobs") {
    showJobsLayout();
    return;
  }

  showMainLayout();

  if (view === "account") {
    main.innerHTML = document.getElementById("template-account").innerHTML;
    setTimeout(() => initAccountPage(), 20);
  }
  else if (view === "verification") {
    main.innerHTML = document.getElementById("template-verification").innerHTML;
    setTimeout(() => initVerificationPage(), 20);
  }
  else if (view === "payments") {
    main.innerHTML = document.getElementById("template-payments").innerHTML;
    setTimeout(() => initPayoutsPage(), 20);
  }
  else if (view === "support") {
    main.innerHTML = "";
    const panel = document.getElementById("supportPanel");
    if (panel) panel.classList.remove("hidden");
    setTimeout(() => initSupportPage(), 20);
  }
}

/* ============================================================
   SIDEBAR NAVIGATION
   ============================================================ */
function initTravelerSidebar() {
  const items = document.querySelectorAll(".sidebar-item");
  if (!items.length) return;

  items.forEach(btn => {
    btn.addEventListener("click", () => {
      items.forEach(i => i.classList.remove("active"));
      btn.classList.add("active");

      const view = btn.getAttribute("data-view");
      loadPage(view);
      window.scrollTo(0, 0);
    });
  });
}

/* ============================================================
   TRAVELER ID LOADING
   ============================================================ */
async function loadTravelerIdentity() {
  try {
    // assumes window.userId is already set from your auth flow
    if (!window.userId) {
      console.warn("No userId on window — cannot load traveler");
      return;
    }

    const res = await fetch(`http://localhost:3000/api/traveler/user/${window.userId}`);
    if (!res.ok) {
      console.warn("Failed to load traveler for user:", window.userId);
      return;
    }

    const traveler = await res.json();
    // if your controller wraps in { data: traveler }, adjust accordingly:
    // const traveler = (await res.json()).data;

    window.travelerId = traveler._id;
    console.log("Traveler ID loaded:", window.travelerId);
  } catch (err) {
    console.error("Error loading traveler identity:", err);
  }
}




/* ============================================================
   FINAL DOM READY BOOTSTRAP
   ============================================================ */
document.getElementById("generate-matches-btn")?.addEventListener("click", (e) => {
  e.preventDefault();
  loadAvailableJobs();
});

document.addEventListener("DOMContentLoaded", () => {
  safe(initTravelerSidebar);
  safe(initChatWidget);
  safe(initJobSocket);

  safe(loadTravelerIdentity);   // ⭐ REQUIRED — loads travelerId

  loadPage("account");
});
