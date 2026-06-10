window.userId = localStorage.getItem("userId");

if (!window.userId) {
  console.warn("No userId on window – redirecting to login");
  window.location.href = "login.html";
}

/* ============================================================
   FLEXAGO TRAVELER — FINAL VERSION
   PART 1 — GLOBAL STATE • MAP • ROUTE • AUTOCOMPLETE • HELPERS
   ============================================================ */

/* ============================================================
   GLOBAL CONFIG
   ============================================================ */
// const BASE_URL = "https://flexago-backend.onrender.com";
// const WS_URL = "wss://flexago-backend.onrender.com";

// const socket = io(WS_URL, {
//   path: "/socket.io",
//   transports: ["websocket"]
// });

/* ============================================================
   GLOBAL CONFIG
   ============================================================ */
const BASE_URL = "https://flexago-backend.onrender.com";
const WS_URL = "wss://flexago-backend.onrender.com";

// Socket.IO removed — using native WebSocket instead


/* ============================================================
   GLOBAL STATE (TRAVELER)
   ============================================================ */
let travelerMap = null;
let travelerDirections = null;
let travelerDirectionsRenderer = null;

let currentTravelerStart = null;
let currentTravelerDest = null;
let currentTravelerPolyline = [];

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
   TRAVELER MAP INITIALIZATION
   ============================================================ */
function initTravelerMap() {
  const container = document.getElementById("travelerMap");
  if (!container || typeof google === "undefined" || !google.maps) return;

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
}

/* ============================================================
   TRAVELER ROUTE DRAWING
   ============================================================ */
function updateTravelerRoute() {
  if (!currentTravelerStart || !currentTravelerDest) return;

  travelerDirections.route(
    {
      origin: currentTravelerStart,
      destination: currentTravelerDest,
      travelMode: google.maps.TravelMode.DRIVING
    },
    (result, status) => {
      if (status !== "OK") return;

      travelerDirectionsRenderer.setDirections(result);

      const path = result.routes[0].overview_path;
      currentTravelerPolyline = path.map(p => [p.lng(), p.lat()]);
    }
  );
}
/* ============================================================
   AUTOCOMPLETE INIT (REQUIRED)
   ============================================================ */
function initTravelerAutocomplete() {
  initTravelerAutocompleteField("pickupInput", "start");
  initTravelerAutocompleteField("dropoffInput", "dest");
}

/* ============================================================
   AUTOCOMPLETE (2025+ API — FIXED)
   ============================================================ */
function initTravelerAutocompleteField(inputId, type) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const autocomplete = new google.maps.places.Autocomplete(input, {
    fields: ["geometry", "formatted_address"],
    types: ["geocode"]
  });

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();

    if (!place || !place.geometry) {
      console.warn("⚠ Autocomplete returned no geometry for:", inputId);
      return;
    }

    const coords = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    };

    // ⭐ FIX: Write coordinates to global state + hidden inputs
    if (type === "start") {
      currentTravelerStart = coords;
      document.getElementById("pickup-lat").value = coords.lat;
      document.getElementById("pickup-lng").value = coords.lng;
      setTravelerMarker("pickup", coords);
    }

    if (type === "dest") {
      currentTravelerDest = coords;
      document.getElementById("dropoff-lat").value = coords.lat;
      document.getElementById("dropoff-lng").value = coords.lng;
      setTravelerMarker("dropoff", coords);
    }

    // ⭐ Now the route can draw correctly
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
    if (radiusLabel) radiusLabel.textContent = `${travelerRouteRadiusMiles} mi`;

    radiusSlider.addEventListener("input", (e) => {
      travelerRouteRadiusMiles = Number(e.target.value) || 5;
      if (radiusLabel) radiusLabel.textContent = `${travelerRouteRadiusMiles} mi`;
      refreshJobs();
    });
  }
}
/* ============================================================
   HELPERS
   ============================================================ */
function debounce(fn, delay = 250) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function safe(fn) {
  try { fn(); } catch (err) { console.warn("Flexago error:", err); }
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
          resolve(meters * 0.000621371);
        } else {
          resolve(null);
        }
      }
    );
  });
}

/* ============================================================
   ACCEPT / DECLINE (UPDATED URLs + WEBSOCKET HOOK)
   ============================================================ */
async function acceptJob(jobId) {
  try {
    const res = await fetch(`${BASE_URL}/api/deliveries/${jobId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ travelerId: window.travelerId })
    });

    if (!res.ok) return;

    const updated = await res.json();

    // Update local state
    acceptedJobs.push(updated.data);
    availableJobs = availableJobs.filter(j => j._id !== jobId);

    // ⭐ START REAL-TIME UPDATES FOR THIS DELIVERY
    initJobSocket(jobId);

    refreshJobs();
  } catch (err) {
    console.error("Error accepting job:", err);
  }
}

async function declineJob(jobId) {
  try {
    const res = await fetch(`${BASE_URL}/api/deliveries/${jobId}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if (!res.ok) return;

    availableJobs = availableJobs.filter(j => j._id !== jobId);
    refreshJobs();
  } catch (err) {
    console.error("Error declining job:", err);
  }
}
/* ============================================================
   MARKERS (CLEAN + FINAL)
   ============================================================ */
function setTravelerMarker(type, position) {
  if (!travelerMap) return;

  if (type === "pickup" && travelerPickupMarker) travelerPickupMarker.setMap(null);
  if (type === "dropoff" && travelerDropoffMarker) travelerDropoffMarker.setMap(null);

  const isPickup = type === "pickup";

  const marker = new google.maps.Marker({
    position,
    map: travelerMap,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: isPickup ? "#22c55e" : "#ef4444",
      fillOpacity: 1,
      strokeColor: isPickup ? "#166534" : "#7f1d1d",
      strokeWeight: 2
    }
  });

  if (isPickup) travelerPickupMarker = marker;
  else travelerDropoffMarker = marker;
}

/* ============================================================
   PAYOUT CALCULATION (UNIFIED + FINAL)
   ============================================================ */
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
    return 200 * 0.8;
  }

  let price = base + (miles * perMile);
  price += weight * 0.25;

  if (insurance === "basic") price += 10;
  if (insurance === "premium") price += weight * 1.0;

  return price * 0.8;
}

/* ============================================================
   GOOGLE MAP CALLBACK (FINAL + CORRECT ORDER)
   ============================================================ */
window.initMap = function () {
  initTravelerMap();
  initTravelerAutocomplete();
  initJobSearch();        // must be before user clicks
  initRoutePlanner();     // safe to run last
};

/* ============================================================
   JOB FETCHING (CLEAN + GUARDED + OPTIMIZED)
   ============================================================ */

// Compute real driving miles safely
async function computeMiles(pickup, dropoff) {
  return new Promise(resolve => {
    if (!pickup?.lat || !pickup?.lng || !dropoff?.lat || !dropoff?.lng) {
      console.warn("Skipping computeMiles — missing coordinates");
      return resolve(0);
    }

    const service = new google.maps.DistanceMatrixService();

    service.getDistanceMatrix(
      {
        origins: [{ lat: pickup.lat, lng: pickup.lng }],
        destinations: [{ lat: dropoff.lat, lng: dropoff.lng }],
        travelMode: "DRIVING"
      },
      (res, status) => {
        if (status !== "OK") return resolve(0);

        const meters = res.rows[0].elements[0].distance.value;
        resolve(meters / 1609.34);
      }
    );
  });
}

let isSearching = false;

// Load available jobs
async function loadAvailableJobs() {
  if (isSearching) return;
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

    const res = await fetch(`${BASE_URL}/api/deliveries/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.error("Job search failed:", res.status);
      return;
    }

    const data = await res.json();
    availableJobs = Array.isArray(data.data) ? data.data : [];

    // Enrich jobs
    await Promise.all(
      availableJobs.map(async (job) => {
        job.realMiles = await computeMiles(job.pickup, job.dropoff);
        job.payout = calculatePayout(job, job.realMiles);
      })
    );

    refreshJobs();
    refreshEarnings();

  } catch (err) {
    console.error("Error loading jobs:", err);
  } finally {
    isSearching = false;
  }
}

/* ============================================================
   ROUTE MATCHING (PLACEHOLDER)
   ============================================================ */
function isJobOnRoute(job) {
  return true;
}

/* ============================================================
   REFRESH JOB LISTS (CLEAN + FINAL)
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
   EARNINGS
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
   JOB CARD RENDERING — TRAVELER VERSION (ENHANCED)
   ============================================================ */
function renderJobCard(job, status, listElement) {
  if (!listElement) return;

  const card = document.createElement("div");
  card.className = "job-card";

  // --- Compute Miles ---
  const miles =
    job.distanceMiles ??
    job.distance ??
    ((job._distance?.pickupStartMiles || 0) +
     (job._distance?.dropoffDestMiles || 0));

  // --- Compute Payout ---
  const payout =
    job.payout != null
      ? Number(job.payout).toFixed(2)
      : "0.00";

  // --- Badge Color ---
  const badgeColor =
    miles < 10 ? "green" :
    miles < 50 ? "orange" :
    "red";

  card.innerHTML = `
    <div class="job-header">
      <span class="badge badge-${badgeColor}">
        ${miles.toFixed(1)} mi
      </span>
      <button class="details-btn" data-id="${job._id}">View Details</button>
    </div>

    <div class="job-row">
      <div class="job-label"><span class="icon-pin pickup"></span> Pickup:</div>
      <div class="job-value">${job.pickupAddress || job.pickup?.address || "—"}</div>
    </div>

    <div class="job-row">
      <div class="job-label"><span class="icon-pin dropoff"></span> Dropoff:</div>
      <div class="job-value">${job.dropoffAddress || job.dropoff?.address || "—"}</div>
    </div>

    <div class="job-row">
      <div class="job-label"><span class="icon-money"></span> Payout:</div>
      <div class="job-value">$${payout}</div>
    </div>

    <div class="job-actions">
      ${status === "available" ? `
        <button class="primary-btn accept-btn" data-id="${job._id}">Accept</button>
        <button class="secondary-btn decline-btn" data-id="${job._id}">Decline</button>
      ` : ""}

      ${status === "accepted" ? `
        <button class="primary-btn complete-btn" data-id="${job._id}">Complete Delivery</button>
      ` : ""}

      ${status === "completed" ? `
        <div class="completed-tag">Completed</div>
      ` : ""}
    </div>
  `;

  listElement.appendChild(card);

  // Attach handlers
  if (status === "available") {
    card.querySelector(".accept-btn").addEventListener("click", () => acceptJob(job._id));
    card.querySelector(".decline-btn").addEventListener("click", () => declineJob(job._id));
  }

  if (status === "accepted") {
    card.querySelector(".complete-btn").addEventListener("click", () => completeJob(job._id));
  }

  // View Details Modal
  card.querySelector(".details-btn").addEventListener("click", () => openJobDetailsModal(job));
}

/* ============================================================
   JOB ACTIONS — FINAL CORRECT VERSION
   ============================================================ */

// ACCEPT JOB
async function acceptJob(jobId) {
  try {
    const res = await fetch(`${BASE_URL}/api/traveler/jobs/${jobId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if (!res.ok) throw new Error("Failed to accept job");

    await loadAvailableJobs();
    await loadAcceptedJobs();
  } catch (err) {
    console.error("Accept job failed:", err);
    alert("Unable to accept job. Please try again.");
  }
}

// DECLINE JOB
async function declineJob(jobId) {
  try {
    const res = await fetch(`${BASE_URL}/api/traveler/jobs/${jobId}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if (!res.ok) throw new Error("Failed to decline job");

    await loadAvailableJobs();
  } catch (err) {
    console.error("Decline job failed:", err);
    alert("Unable to decline job. Please try again.");
  }
}

// UPDATE JOB STATUS (optional)
async function updateTravelerStatus(jobId, status) {
  try {
    const res = await fetch(`${BASE_URL}/api/traveler/jobs/${jobId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    if (!res.ok) throw new Error("Failed to update job status");

    await loadAvailableJobs();
    await loadAcceptedJobs();
  } catch (err) {
    console.error("Update job status failed:", err);
    alert("Unable to update status. Please try again.");
  }
}

// COMPLETE JOB
async function completeJob(jobId, photoBase64) {
  try {
    const res = await fetch(`${BASE_URL}/api/traveler/jobs/${jobId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proofPhoto: photoBase64 })
    });

    if (!res.ok) throw new Error("Failed to complete delivery");

    await loadAvailableJobs();
    await loadCompletedJobs();
  } catch (err) {
    console.error("Complete delivery failed:", err);
    alert("Unable to complete delivery. Please try again.");
  }
}

/* ============================================================
   REAL-TIME JOB UPDATES (DELIVERY-SPECIFIC WEBSOCKET)
   ============================================================ */
let wsUpdateTimeout = null;

function initJobSocket(deliveryId) {
  if (!deliveryId) {
    console.warn("❗ initJobSocket called without deliveryId");
    return;
  }

  try {
    ws = new WebSocket(
      `wss://flexago-backend.onrender.com/ws/delivery/${deliveryId}`
    );

    ws.addEventListener("open", () => {
      console.log("Job WebSocket connected for delivery:", deliveryId);
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
              loadAvailableJobs();   // Debounced refresh
            }
          }, 300);
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    });

    ws.addEventListener("close", () => {
      console.warn("Job WebSocket closed — reconnecting in 3s");
      setTimeout(() => initJobSocket(deliveryId), 3000);
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
    });
  });
}

/* ============================================================
   ACCOUNT • VERIFICATION • PAYOUTS
   ============================================================ */

/* ACCOUNT STATE */
let accountState = {
  profilePhoto: null,
  firstName: "",
  lastName: "",
  dob: "",
  phone: "",
  email: ""
};

let accountOriginalState = null;

/* ACCOUNT PAGE INIT */
function initAccountPage() {
  safe(initProfilePhotoUpload);
  safe(initAccountFieldTracking);
  safe(initAccountSaveButton);
  safe(loadAccountData);
}

/* PROFILE PHOTO UPLOAD */
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

/* ACCOUNT FIELD TRACKING */
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

/* SAVE BUTTON */
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
      await fakeSaveAccountApi(accountState);
      accountOriginalState = JSON.parse(JSON.stringify(accountState));
      showAccountToast("Your account details have been saved.");
    } catch (err) {
      showAccountToast("Unable to save changes. Please try again.");
      btn.disabled = false;
      btn.classList.remove("disabled");
    } finally {
      btn.textContent = originalText;
    }
  });
}

async function fakeSaveAccountApi(payload) {
  return new Promise(resolve => setTimeout(resolve, 800));
}

function showAccountToast(message) {
  alert(message);
}

/* LOAD EXISTING ACCOUNT DATA */
async function loadAccountData() {
  const data = null;

  if (!data) {
    accountOriginalState = JSON.parse(JSON.stringify(accountState));
    return;
  }

  accountOriginalState = JSON.parse(JSON.stringify(accountState));
}

/* ACCOUNT HELPERS */
function valueOf(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

/* ============================================================
   VERIFICATION
   ============================================================ */

let verificationState = {
  step1: null,
  step2: null,
  step3: null,
  step4: null,
  submitted: false
};

function initVerificationPage() {
  safe(initVerificationUploads);
  safe(updateVerificationProgressBar);
  safe(updateVerificationStatusBadge);
  safe(initVerificationSubmit);
}

/* UPLOAD HANDLER */
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

/* PROGRESS BAR */
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

/* STATUS BADGE */
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

/* SUBMIT VERIFICATION — UPDATED URL */
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
      const res = await fetch(`${BASE_URL}/api/traveler/verification`, {
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
      alert("Unable to submit verification. Please try again.");
      btn.disabled = false;
      btn.textContent = "Submit Verification";
    }
  });
}

/* SUCCESS / FAILURE NAVIGATION */
function showVerificationSuccess() {
  document.getElementById("template-verification").classList.add("hidden");
  document.getElementById("template-verification-failed").classList.add("hidden");
  document.getElementById("template-verification-success").classList.remove("hidden");

  const backBtn = document.getElementById("backToAccount");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      loadPage("account");
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
      loadPage("verification");
    });
  }
}

/* ============================================================
   PAYOUTS — UPDATED URLS
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
        cardFields?.classList.remove("hidden");
        bankFields?.classList.add("hidden");
      } else {
        cardFields?.classList.add("hidden");
        bankFields?.classList.remove("hidden");
      }
    });
  });
}

async function loadPayoutMethod() {
  try {
    const res = await fetch(`${BASE_URL}/api/traveler/payouts`);
    if (!res.ok) return;

    const data = await res.json();
    const display = document.getElementById("payoutMethodDisplay");
    if (!display) return;

    if (data.type === "card") display.textContent = `Card •••• ${data.last4}`;
    if (data.type === "bank") display.textContent = `Bank Account •••• ${data.last4}`;
  } catch (err) {
    console.error("Failed to load payout method:", err);
  }
}

function initPayoutForm() {
  const saveBtn = document.getElementById("savePaymentMethod");
  if (!saveBtn) return;

  saveBtn.addEventListener("click", async () => {
    const type = document.querySelector("input[name='payoutType']:checked")?.value;
    if (!type) return alert("Please select a payout method.");

    const error = type === "card" ? validateCardFields() : validateBankFields();
    if (error) return alert(error);

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
      payload.bank = iban ? { iban } : { routing, account };
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      const res = await fetch(`${BASE_URL}/api/traveler/payouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save payout method");

      alert("Payout method saved.");
      await loadPayoutMethod();
    } catch (err) {
      alert("Unable to save payout method.");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
    }
  });
}
function initJobDetailsModal() {
  const modal = document.getElementById("jobDetailsModal");
  const closeBtn = modal?.querySelector(".modal-close");

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  }
}
// ===============================
// JOB DETAILS MODAL FUNCTIONS
// ===============================
function openJobDetailsModal(job) {
  const modal = document.getElementById("jobDetailsModal");

  // -------------------------------
  // PICKUP / DROPOFF
  // -------------------------------
  modal.querySelector(".pickup").textContent =
    job.pickupAddress ||
    job.pickup?.address ||
    "—";

  modal.querySelector(".dropoff").textContent =
    job.dropoffAddress ||
    job.dropoff?.address ||
    "—";

  // -------------------------------
  // TRAVEL TYPE
  // -------------------------------
  modal.querySelector(".travelType").textContent =
    job.travelType || "Local";

  // -------------------------------
  // MILES
  // -------------------------------
  const miles =
    job.distanceMiles ??
    job.distance ??
    ((job._distance?.pickupStartMiles || 0) +
     (job._distance?.dropoffDestMiles || 0));

  modal.querySelector(".miles").textContent =
    miles ? miles.toFixed(1) + " mi" : "—";

  // -------------------------------
  // PAYOUT
  // -------------------------------
  modal.querySelector(".payout").textContent =
    "$" + (job.payout != null ? Number(job.payout).toFixed(2) : "0.00");

  // -------------------------------
  // SENDER
  // -------------------------------
  modal.querySelector(".senderName").textContent =
    job.sender?.name ||
    job.senderName ||
    "—";

  modal.querySelector(".senderPhone").textContent =
    job.sender?.phone ||
    job.senderPhone ||
    "—";

  // -------------------------------
  // RECEIVER
  // -------------------------------
  modal.querySelector(".receiverName").textContent =
    job.receiver?.name ||
    job.receiverName ||
    "—";

  modal.querySelector(".receiverPhone").textContent =
    job.receiver?.phone ||
    job.receiverPhone ||
    "—";

// -------------------------------
// PACKAGE DETAILS
// -------------------------------
modal.querySelector(".itemDescription").textContent =
  job.package?.description || "—";

modal.querySelector(".itemSize").textContent =
  job.package?.size || "—";

modal.querySelector(".itemWeight").textContent =
  job.package?.weight || "—";

// -------------------------------
// PHOTO
// -------------------------------
const photoEl = modal.querySelector(".itemPhoto");
const photoUrl = job.package?.photoUrl;

if (photoUrl) {
  photoEl.src = photoUrl;
  photoEl.style.display = "block";
} else {
  photoEl.style.display = "none";
}

  // -------------------------------
  // ACCEPT / DECLINE BUTTONS
  // -------------------------------
  modal.querySelector(".modal-accept").onclick = () => acceptJob(job._id);
  modal.querySelector(".modal-decline").onclick = () => declineJob(job._id);

  // -------------------------------
  // SHOW MODAL
  // -------------------------------
  modal.classList.remove("hidden");
}

function closeJobDetailsModal() {
  document.getElementById("jobDetailsModal").classList.add("hidden");
}

/* ============================================================
   SUPPORT PAGE
   ============================================================ */
function initSupportPage() {
  // Placeholder
}

/* ============================================================
   TRAVELER ID LOADING — FINAL VERSION
   ============================================================ */
async function loadTravelerIdentity() {
  try {
    if (!window.userId) {
      console.warn("No userId on window — cannot load traveler");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/traveler/user/${window.userId}`);
    if (!res.ok) {
      console.warn("Failed to load traveler for user:", window.userId);
      return;
    }

    const traveler = await res.json();
    window.travelerId = traveler._id;
    console.log("Traveler ID loaded:", window.travelerId);

    /* ============================================================
       LOAD TRAVELER PROFILE INTO UI (NO FALLBACK "T")
       ============================================================ */

    // Full name
    const fullName = `${traveler.firstName || ""} ${traveler.lastName || ""}`.trim();
    if (fullName.length > 0) {
      document.getElementById("profileFullName").textContent = fullName;
    }

    // Inputs
    document.getElementById("firstNameInput").value = traveler.firstName || "";
    document.getElementById("lastNameInput").value = traveler.lastName || "";
    document.getElementById("emailInput").value = traveler.email || "";
    document.getElementById("phoneInput").value = traveler.phone || "";

    // DOB
    if (traveler.dob) {
      document.getElementById("dobInput").value = traveler.dob.split("T")[0];
    }

    // Photo
    if (traveler.photoUrl) {
      document.getElementById("profilePhotoPreview").src = traveler.photoUrl;
    }

  } catch (err) {
    console.error("Error loading traveler identity:", err);
  }
}
/* ============================================================
   PAGE SWITCHING (FINAL)
   ============================================================ */
function loadPage(view) {
  const main = document.getElementById("mainContentArea");
  const jobsLayout = document.getElementById("jobsLayout");
  if (!main || !jobsLayout) return;

if (view === "jobs") {
  jobsLayout.style.display = "block";
  main.style.display = "none";

  setTimeout(() => {
    safe(initTravelerMap);
    safe(initTravelerAutocomplete);   // ⭐ REQUIRED FIX
    safe(initRoutePlanner);
    safe(initJobsTabs);
  }, 50);

  return;
}

  jobsLayout.style.display = "none";
  main.style.display = "block";

  if (view === "account") {
    main.innerHTML = document.getElementById("template-account").innerHTML;
    setTimeout(() => initAccountPage(), 20);
  } else if (view === "verification") {
    main.innerHTML = document.getElementById("template-verification").innerHTML;
    setTimeout(() => initVerificationPage(), 20);
  } else if (view === "payments") {
    main.innerHTML = document.getElementById("template-payments").innerHTML;
    setTimeout(() => initPayoutsPage(), 20);
  } else if (view === "support") {
    main.innerHTML = "";
    const panel = document.getElementById("supportPanel");
    panel?.classList.remove("hidden");
    setTimeout(() => initSupportPage(), 20);
  }
}

/* ============================================================
   SIDEBAR NAVIGATION (FINAL)
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
   JOB SEARCH HANDLER
   ============================================================ */
function initJobSearch() {
  function attach() {
    const btn = document.getElementById("searchJobsBtn");
    if (!btn) {
      console.warn("Search Jobs button not found — retrying...");
      return setTimeout(attach, 300);
    }

    console.log("✅ Search button ready");

    btn.addEventListener("click", () => {
      if (!currentTravelerStart || !currentTravelerDest) {
        console.warn("Missing start or destination");
        return;
      }

      console.log("🔍 Searching for jobs...");
      updateTravelerRoute();
      loadAvailableJobs();
    });
  }

  attach();   // ⭐ THIS LINE WAS MISSING
}

/* ============================================================
   FINAL DOM READY BOOTSTRAP (FINAL)
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  safe(initTravelerMap);
  safe(initTravelerSidebar);
  safe(initChatWidget);
  safe(initJobSocket);
  safe(loadTravelerIdentity);
  safe(initJobDetailsModal);
  safe(initRoutePlanner);

  loadPage("jobs");     // Load Jobs page first
  safe(initJobSearch);  // THEN attach search handler
});
