let senderDirectionsService = null;
let senderDirectionsRenderer = null;
let senderMap = null;

// Custom markers
let pickupMarker = null;
let dropoffMarker = null;

/* ============================================================
   BASE URL + SOCKET
   ============================================================ */
const BASE_URL = "https://flexago-backend.onrender.com";
const WS_URL = "wss://flexago-backend.onrender.com";

const socket = io(WS_URL, {
  path: "/socket.io",
  transports: ["websocket"]
});

/* ============================================================
   SAFE WRAPPER
   ============================================================ */
function safe(fn) {
  try {
    fn();
  } catch (err) {
    console.error(err);
  }
}

/* ============================================================
   SIDEBAR SWITCHING (CLEAN + MODERN)
   ============================================================ */
function initSenderSidebar() {
  const items = document.querySelectorAll(".sidebar-item");

  items.forEach(btn => {
    btn.addEventListener("click", () => {
      // highlight active
      items.forEach(i => i.classList.remove("active"));
      btn.classList.add("active");

      // get view name
      const view = btn.getAttribute("data-view");

      // show the correct section
      showSenderView(view + "View");

      window.scrollTo(0, 0);
    });
  });
}

/* ============================================================
   SHOW VIEW (SECTION-BASED)
   ============================================================ */
function showSenderView(viewId) {
  // hide all views
  const views = document.querySelectorAll("section[id$='View']");
  views.forEach(v => v.classList.add("hidden"));

  // show selected view
  const target = document.getElementById(viewId);
  if (target) target.classList.remove("hidden");

  // re-init icons
  safe(initSenderIcons);

  // re-init map AFTER createView becomes visible
  if (viewId === "createView") {
    setTimeout(() => {
      safe(initSenderMap);
    }, 150);
  }
}

/* ============================================================
   ICON REFRESH
   ============================================================ */
function initSenderIcons() {
  if (window.lucide) {
    lucide.createIcons();
  }
}

/* ============================================================
   OPTIONAL: LOAD SENDER IDENTITY
   ============================================================ */
async function loadSenderIdentity() {
  try {
    if (!window.userId) return;

    const res = await fetch(`${BASE_URL}/api/sender/user/${window.userId}`);
    if (!res.ok) return;

    const sender = await res.json();
    window.senderId = sender._id;
  } catch (err) {
    console.error("Error loading sender identity:", err);
  }
}

/* ============================================================
   CREATE DELIVERY INITIALIZER
   ============================================================ */
function initSenderCreateForm() {
  // Initialize map AFTER view is visible
  safe(initSenderMap);
}

/* ============================================================
   MAP + ROUTE
   ============================================================ */
function initSenderMap() {
  const mapElement = document.getElementById("mapContainer");
  if (!mapElement || !window.google || !google.maps) return;

  // Prevent multiple map instances
  if (!senderMap) {
    senderMap = new google.maps.Map(mapElement, {
      center: { lat: 30.2672, lng: -97.7431 },
      zoom: 8,
      disableDefaultUI: true
    });

    senderDirectionsService = new google.maps.DirectionsService();
    senderDirectionsRenderer = new google.maps.DirectionsRenderer({
      map: senderMap,
      suppressMarkers: false
    });

    initSenderAutocomplete(senderMap);
  }
}

function drawSenderRoute() {
  const pickupLat = parseFloat(document.getElementById("pickup-lat").value);
  const pickupLng = parseFloat(document.getElementById("pickup-lng").value);
  const dropLat = parseFloat(document.getElementById("dropoff-lat").value);
  const dropLng = parseFloat(document.getElementById("dropoff-lng").value);

  if (
    !Number.isFinite(pickupLat) ||
    !Number.isFinite(pickupLng) ||
    !Number.isFinite(dropLat) ||
    !Number.isFinite(dropLng)
  ) return;

  if (!senderDirectionsService || !senderDirectionsRenderer || !window.google || !google.maps) return;

  const request = {
    origin: { lat: pickupLat, lng: pickupLng },
    destination: { lat: dropLat, lng: dropLng },
    travelMode: google.maps.TravelMode.DRIVING
  };

  senderDirectionsService.route(request, (result, status) => {
    if (status === "OK" && result.routes && result.routes[0] && result.routes[0].legs[0]) {
      senderDirectionsRenderer.setDirections(result);

      const distanceMeters = result.routes[0].legs[0].distance.value;
      const distanceMiles = distanceMeters / 1609.34;

      updateEstimateUI(distanceMiles);
    }
  });
}

/* ============================================================
   AUTOCOMPLETE
   ============================================================ */
function initSenderAutocomplete(map) {
  const pickupInput = document.getElementById("pickupInput");
  const dropoffInput = document.getElementById("dropoffInput");

  const pickupDropdown = document.getElementById("senderPickupAutocomplete");
  const dropoffDropdown = document.getElementById("senderDropoffAutocomplete");

  if (!pickupInput || !dropoffInput || !pickupDropdown || !dropoffDropdown) return;
  if (!window.google || !google.maps || !google.maps.places) return;

  const service = new google.maps.places.AutocompleteService();
  const geocoder = new google.maps.Geocoder();

  function attachAutocomplete(input, dropdown, latField, lngField, isPickup) {
    input.addEventListener("input", () => {
      const query = input.value.trim();
      if (query.length < 3) {
        dropdown.classList.add("hidden");
        dropdown.innerHTML = "";
        return;
      }

      service.getPlacePredictions(
        { input: query, types: ["address"] },
        (predictions, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
            dropdown.classList.add("hidden");
            dropdown.innerHTML = "";
            return;
          }

          dropdown.innerHTML = "";
          dropdown.classList.remove("hidden");

          predictions.forEach(pred => {
            const item = document.createElement("div");
            item.className = "autocomplete-item";
            item.textContent = pred.description;

            item.addEventListener("click", () => {
              input.value = pred.description;
              dropdown.classList.add("hidden");
              dropdown.innerHTML = "";

              geocoder.geocode({ placeId: pred.place_id }, (results, status) => {
                if (status === "OK" && results[0]) {
                  const loc = results[0].geometry.location;

                  const lat = loc.lat();
                  const lng = loc.lng();

                  document.getElementById(latField).value = lat;
                  document.getElementById(lngField).value = lng;

                  if (isPickup) {
                    window.pickupData = { address: input.value, lat, lng };
                  } else {
                    window.dropoffData = { address: input.value, lat, lng };
                  }

                  map.setCenter(loc);
                  map.setZoom(13);

                  // Custom markers: Pickup = red P, Dropoff = blue D
                  if (isPickup) {
                    if (pickupMarker) pickupMarker.setMap(null);
                    pickupMarker = new google.maps.Marker({
                      position: loc,
                      map,
                      label: {
                        text: "P",
                        color: "white",
                        fontWeight: "bold"
                      },
                      icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: "#ef4444", // red
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: "white"
                      }
                    });
                  } else {
                    if (dropoffMarker) dropoffMarker.setMap(null);
                    dropoffMarker = new google.maps.Marker({
                      position: loc,
                      map,
                      label: {
                        text: "D",
                        color: "white",
                        fontWeight: "bold"
                      },
                      icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: "#3b82f6", // blue
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: "white"
                      }
                    });
                  }

                  drawSenderRoute();
                }
              });
            });

            dropdown.appendChild(item);
          });
        }
      );
    });
  }

  attachAutocomplete(pickupInput, pickupDropdown, "pickup-lat", "pickup-lng", true);
  attachAutocomplete(dropoffInput, dropoffDropdown, "dropoff-lat", "dropoff-lng", false);
}
// ======================== FLEXAGO PRICING ENGINE — FINAL MODEL (NO SIZE) ========================

function calculateEstimatedCost({ deliveryType, distanceMiles, weight, insuranceType }) {
  let cost = 0;

  // Insurance fees (UI uses "basic" / "premium" / "waive")
  let insuranceFee = 0;
  if (insuranceType === "basic") insuranceFee = 15;
  if (insuranceType === "premium") insuranceFee = 25;

  // Local
  if (deliveryType === "local") {
    if (typeof distanceMiles === "number" && !isNaN(distanceMiles)) {
      cost = distanceMiles * 0.75;
    }
  }

  // Nationwide
  if (deliveryType === "nationwide") {
    cost = 50 + (weight * 0.40);
  }

  // International
  if (deliveryType === "international") {
    cost = 200;
  }

  // Add insurance fee
  cost += insuranceFee;

  return cost;
}

function updateEstimateUI(distanceMiles = null) {
  const deliveryTypeEl = document.getElementById("deliveryType");
  const insuranceEl = document.getElementById("insuranceType");
  const weightEl = document.getElementById("weightInput");
  const estimateEl = document.getElementById("estimateValue");

  if (!deliveryTypeEl || !insuranceEl || !weightEl || !estimateEl) return;

  const deliveryType = deliveryTypeEl.value;
  const insuranceType = insuranceEl.value;
  const weight = parseFloat(weightEl.value) || 0;

  const cost = calculateEstimatedCost({
    deliveryType,
    distanceMiles,
    weight,
    insuranceType
  });

  estimateEl.textContent = `$${cost.toFixed(2)}`;
  window.currentPrice = cost;
}

// Convert insurance string → Boolean for backend
function getInsuranceBoolean() {
  const insuranceValue = document.getElementById("insuranceType").value;

  return (insuranceValue === "basic" || insuranceValue === "premium");
}

// Force updates when inputs change
["deliveryType", "insuranceType", "weightInput"].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("change", () => updateEstimateUI(window.currentDistanceMiles || 0));
    el.addEventListener("input", () => updateEstimateUI(window.currentDistanceMiles || 0));
  }
});

<!-- ======================== SIZE SELECTOR — UI ONLY ======================== -->

let selectedSize = "small";

document.querySelectorAll(".size-pill").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".size-pill").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedSize = btn.dataset.size;
  });
});

window.getSelectedSize = () => selectedSize;


/* ============================================================
   PHOTO UPLOAD
   ============================================================ */
function initSenderPhotoUpload() {
  const photoInput = document.getElementById("photoInput");
  const photoUploadBtn = document.getElementById("photoUploadBtn");
  const photoPreview = document.getElementById("photoPreview");

  if (!photoInput || !photoUploadBtn || !photoPreview) return;

  photoUploadBtn.addEventListener("click", () => photoInput.click());

  photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        photoPreview.src = e.target.result;
        photoPreview.style.display = "block";
      };
      reader.readAsDataURL(file);
    }
  });
}

function initSenderAccountView() {
  const uploadBtn = document.getElementById("senderProfilePhotoUploadBtn");
  const fileInput = document.getElementById("senderProfilePhotoInput");
  const preview = document.getElementById("senderProfilePhotoPreview");

  if (!uploadBtn || !fileInput || !preview) {
    console.warn("AccountView elements missing");
    return;
  }

  uploadBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ============================================================
   GENERATE DELIVERY
   ============================================================ */
function initSenderGenerateDelivery() {
  const btn = document.getElementById("generate-matches-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    console.log("Generate button clicked");

    const pickupLat = Number(document.getElementById("pickup-lat").value);
    const pickupLng = Number(document.getElementById("pickup-lng").value);
    const dropLat = Number(document.getElementById("dropoff-lat").value);
    const dropLng = Number(document.getElementById("dropoff-lng").value);

    if (!window.pickupData) {
      window.pickupData = {
        address: document.getElementById("pickupInput").value,
        lat: pickupLat,
        lng: pickupLng
      };
    }

    if (!window.dropoffData) {
      window.dropoffData = {
        address: document.getElementById("dropoffInput").value,
        lat: dropLat,
        lng: dropLng
      };
    }

    const pickup = window.pickupData;
    const dropoff = window.dropoffData;

    if (
      !Number.isFinite(pickup.lat) ||
      !Number.isFinite(pickup.lng) ||
      !Number.isFinite(dropoff.lat) ||
      !Number.isFinite(dropoff.lng)
    ) {
      alert("Pickup and dropoff must have valid coordinates.");
      return;
    }

    const weight = document.getElementById("weightInput").value;
    const deliveryType = document.getElementById("deliveryType").value;
    const packageType = document.getElementById("packageType").value;

    // ⭐ FIXED — convert insurance string → Boolean
    const insurance = getInsuranceBoolean();

    const senderName = document.getElementById("senderName").value;
    const senderPhone = document.getElementById("senderPhone").value;
    const senderEmail = document.getElementById("senderEmail").value;

    const receiverName = document.getElementById("receiverName").value;
    const receiverPhone = document.getElementById("receiverPhone").value;
    const receiverEmail = document.getElementById("receiverEmail").value;
    const receiverAddress = document.getElementById("receiverAddress").value;
    const receiverInstructions = document.getElementById("receiverInstructions").value;

    const notes = document.getElementById("notesInput").value;

    if (!senderName || !senderPhone || !senderEmail) {
      alert("Please complete all sender fields.");
      return;
    }

    if (!receiverName || !receiverPhone || !receiverEmail || !receiverAddress) {
      alert("Please complete all receiver fields.");
      return;
    }

    if (!weight) {
      alert("Please enter package weight.");
      return;
    }

    const deliveryData = {
      sender: {
        name: senderName,
        phone: senderPhone,
        email: senderEmail
      },

      pickup: {
        address: pickup.address,
        location: {
          type: "Point",
          coordinates: [Number(pickup.lng), Number(pickup.lat)]
        }
      },

      dropoff: {
        address: dropoff.address,
        location: {
          type: "Point",
          coordinates: [Number(dropoff.lng), Number(dropoff.lat)]
        },
        instructions: receiverInstructions
      },

      package: {
        type: packageType,
        weight: Number(weight),

        // ⭐ FIXED — backend now receives Boolean
        insurance: insurance,

        deliveryType
      },

      receiver: {
        name: receiverName,
        phone: receiverPhone,
        email: receiverEmail,
        address: receiverAddress,
        instructions: receiverInstructions
      },

      notes
    };

    console.log("FINAL DELIVERY PAYLOAD:", deliveryData);

    try {
      const response = await fetch(`${BASE_URL}/api/deliveries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deliveryData)
      });

      const result = await response.json();
      console.log("Delivery created:", result);

      if (!result.success) {
        alert("Error creating delivery: " + (result.error || "Unknown error"));
        return;
      }

      const createView = document.getElementById("createView");
      const waitingSection = document.getElementById("waiting-section");

      if (createView) createView.classList.add("hidden");
      if (waitingSection) waitingSection.style.display = "block";

      window.activeDeliveryId = result.data._id;
      if (typeof subscribeToDeliveryUpdates === "function") {
        subscribeToDeliveryUpdates(result.data._id);
      }
    } catch (err) {
      console.error("Error generating delivery:", err);
      alert("Failed to create delivery.");
    }
  });
}

/* ============================================================
   FINAL DOM READY BOOTSTRAP — ACCOUNT DEFAULT
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  safe(initSenderIcons);
  safe(loadSenderIdentity);
  safe(initSenderSidebar);
  safe(initSenderCreateForm);
  safe(initSenderPhotoUpload);
  safe(initSenderGenerateDelivery);
  safe(initSenderAccountView);

  // Default view = Account & Identity
  const defaultView = document.getElementById("accountView");
  if (defaultView) defaultView.classList.remove("hidden");

  // Ensure sidebar highlights Account
  const accountBtn = document.querySelector('.sidebar-item[data-view="account"]');
  if (accountBtn) accountBtn.classList.add("active");
});
