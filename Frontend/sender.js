/* ============================================================
   SIDEBAR VIEW SWITCHING
   ============================================================ */

document.querySelectorAll(".sidebar-item").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sidebar-item").forEach(i =>
      i.classList.remove("active")
    );

    btn.classList.add("active");

    document.querySelectorAll("section[id$='View']").forEach(view => {
      view.classList.add("hidden");
    });

    const target = btn.getAttribute("data-view");
    const viewId = `${target}View`;
    const viewEl = document.getElementById(viewId);

    if (viewEl) {
      viewEl.classList.remove("hidden");
      window.scrollTo(0, 0);
    }
  });
});


/* ============================================================
   SIZE PILL LOGIC
   ============================================================ */

const sizePills = document.querySelectorAll("#sizePills .pill");

sizePills.forEach(pill => {
  pill.addEventListener("click", () => {
    sizePills.forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
  });
});


/* ============================================================
   PHOTO UPLOAD PREVIEW
   ============================================================ */

const photoInput = document.getElementById("photoInput");
const photoUploadBtn = document.getElementById("photoUploadBtn");
const photoPreview = document.getElementById("photoPreview");

if (photoUploadBtn) {
  photoUploadBtn.addEventListener("click", () => photoInput.click());
}

if (photoInput) {
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


/* ============================================================
   SENDER PROFILE PHOTO UPLOAD
   ============================================================ */

const senderPhotoInput = document.getElementById("senderProfilePhotoInput");
const senderPhotoBtn = document.getElementById("senderProfilePhotoUploadBtn");
const senderPhotoPreview = document.getElementById("senderProfilePhotoPreview");

if (senderPhotoBtn) {
  senderPhotoBtn.addEventListener("click", () => senderPhotoInput.click());
}

if (senderPhotoInput) {
  senderPhotoInput.addEventListener("change", () => {
    const file = senderPhotoInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        senderPhotoPreview.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
}




/* ============================================================
   DRAW ROUTE BETWEEN PICKUP & DROPOFF (CREATE DELIVERY)
   ============================================================ */

let senderDirectionsService;
let senderDirectionsRenderer;

function initSenderMap() {
  const mapElement = document.getElementById("mapContainer");
  if (!mapElement) return;

  const map = new google.maps.Map(mapElement, {
    center: { lat: 30.2672, lng: -97.7431 }, // Austin default
    zoom: 8,
    disableDefaultUI: true
  });

  senderDirectionsService = new google.maps.DirectionsService();
  senderDirectionsRenderer = new google.maps.DirectionsRenderer({
    map,
    suppressMarkers: false
  });

  initSenderAutocomplete(map);
}


function drawSenderRoute() {
  const pickupLat = parseFloat(document.getElementById("pickup-lat").value);
  const pickupLng = parseFloat(document.getElementById("pickup-lng").value);
  const dropLat = parseFloat(document.getElementById("dropoff-lat").value);
  const dropLng = parseFloat(document.getElementById("dropoff-lng").value);

  // FIX: Proper numeric validation
  if (
    !Number.isFinite(pickupLat) ||
    !Number.isFinite(pickupLng) ||
    !Number.isFinite(dropLat) ||
    !Number.isFinite(dropLng)
  ) {
    return;
  }

  const request = {
    origin: { lat: pickupLat, lng: pickupLng },
    destination: { lat: dropLat, lng: dropLng },
    travelMode: google.maps.TravelMode.DRIVING
  };

  senderDirectionsService.route(request, (result, status) => {
    if (status === "OK") {
      senderDirectionsRenderer.setDirections(result);

      const distanceMeters = result.routes[0].legs[0].distance.value;
      const distanceMiles = distanceMeters / 1609.34;

      updateEstimateUI(distanceMiles);
    }
  });
}


/* ============================================================
   SAFE COST ENGINE (PURE + MAP-PROOF)
   ============================================================ */

function calculateEstimatedCost({ deliveryType, distanceMiles, weight, insurance }) {
  let cost = 0;

  let insuranceFee = 0;
  if (insurance === "basic") insuranceFee = 15;
  if (insurance === "full") insuranceFee = 25;

  if (deliveryType === "local") {
    if (typeof distanceMiles === "number" && !isNaN(distanceMiles)) {
      cost = distanceMiles * 0.75;
    }
  }

  if (deliveryType === "nationwide") {
    cost = 50 + (weight * 0.40);
  }

  if (deliveryType === "international") {
    cost = 200;
  }

  cost += insuranceFee;

  return cost;
}


/* ============================================================
   SAFE UI UPDATE WRAPPER
   ============================================================ */

function updateEstimateUI(distanceMiles = null) {
  const deliveryType = document.getElementById("deliveryType").value;
  const insurance = document.getElementById("insuranceType").value;
  const weight = parseFloat(document.getElementById("weightInput").value) || 0;

  const cost = calculateEstimatedCost({
    deliveryType,
    distanceMiles,
    weight,
    insurance
  });

  document.getElementById("estimateValue").textContent = `$${cost.toFixed(2)}`;
}


/* ============================================================
   GENERATE DELIVERY (GEOJSON + SAFE COORDS)
   ============================================================ */

document.getElementById("generate-matches-btn").addEventListener("click", async () => {
  console.log("Generate button clicked");

  // 1. Source of truth: hidden fields
  const pickupLat = Number(document.getElementById("pickup-lat").value);
  const pickupLng = Number(document.getElementById("pickup-lng").value);
  const dropLat = Number(document.getElementById("dropoff-lat").value);
  const dropLng = Number(document.getElementById("dropoff-lng").value);

  // Rebuild globals if missing
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

  // 2. Validate coordinates
  if (
    !Number.isFinite(pickup.lat) ||
    !Number.isFinite(pickup.lng) ||
    !Number.isFinite(dropoff.lat) ||
    !Number.isFinite(dropoff.lng)
  ) {
    alert("Pickup and dropoff must have valid coordinates.");
    return;
  }

  // 3. Collect form fields
  const weight = document.getElementById("weightInput").value;
  const insurance = document.getElementById("insuranceType").value;
  const deliveryType = document.getElementById("deliveryType").value;
  const packageType = document.getElementById("packageType").value;

  const senderName = document.getElementById("senderName").value;
  const senderPhone = document.getElementById("senderPhone").value;
  const senderEmail = document.getElementById("senderEmail").value;

  const receiverName = document.getElementById("receiverName").value;
  const receiverPhone = document.getElementById("receiverPhone").value;
  const receiverEmail = document.getElementById("receiverEmail").value;
  const receiverAddress = document.getElementById("receiverAddress").value;
  const receiverInstructions = document.getElementById("receiverInstructions").value;

  const notes = document.getElementById("notesInput").value;

  // 4. Validate required fields
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

  // 5. Build delivery payload (GeoJSON)
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
      insurance,
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

  console.log("Sending delivery:", deliveryData);

  // 6. Send to backend
  try {
    const response = await fetch("http://127.0.0.1:3000/api/deliveries", {
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

    document.getElementById("create-delivery-section").style.display = "none";
    document.getElementById("waiting-section").style.display = "block";

    window.activeDeliveryId = result.data._id;
    if (typeof subscribeToDeliveryUpdates === "function") {
      subscribeToDeliveryUpdates(result.data._id);
    }
  } catch (err) {
    console.error("Error generating delivery:", err);
    alert("Failed to create delivery.");
  }
});

/* ============================================================
   AUTOCOMPLETE FOR PICKUP & DROPOFF (LEGACY API)
   ============================================================ */

function initSenderAutocomplete(map) {
  const pickupInput = document.getElementById("pickupInput");
  const dropoffInput = document.getElementById("dropoffInput");

  const pickupDropdown = document.getElementById("senderPickupAutocomplete");
  const dropoffDropdown = document.getElementById("senderDropoffAutocomplete");

  const service = new google.maps.places.AutocompleteService();
  const geocoder = new google.maps.Geocoder();

  function attachAutocomplete(input, dropdown, latField, lngField) {
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

                  // Store pickup or dropoff globally for Generate logic
                  if (latField === "pickup-lat") {
                    window.pickupData = {
                      address: input.value,
                      lat,
                      lng
                    };
                  } else {
                    window.dropoffData = {
                      address: input.value,
                      lat,
                      lng
                    };
                  }

                  map.setCenter(loc);
                  map.setZoom(13);

                  new google.maps.Marker({
                    position: loc,
                    map: map
                  });

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

  attachAutocomplete(pickupInput, pickupDropdown, "pickup-lat", "pickup-lng");
  attachAutocomplete(dropoffInput, dropoffDropdown, "dropoff-lat", "dropoff-lng");
}



/* ============================================================
   GOOGLE MAPS GLOBAL CALLBACK
   ============================================================ */

window.initMap = function () {
  if (typeof initSenderMap === "function") {
    initSenderMap();
  }
};
