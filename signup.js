async function signup() {
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const phone = document.getElementById("phone").value.trim();
  const role = document.getElementById("role").value;

  // 1️⃣ Create the user
  const res = await fetch("https://flexago-backend.onrender.com/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName,
      lastName,
      email,
      password,
      phone,
      role
    })
  });

  const result = await res.json();

  if (!result.success) {
    alert(result.error || "Signup failed");
    return;
  }

  // ⭐ Backend returns: { success, data: { user, traveler } }
  const user = result.data.user;

  // Save userId + user
  localStorage.setItem("userId", user._id);
  localStorage.setItem("user", JSON.stringify(user));

  // 2️⃣ Traveler is already auto‑created by backend — no second POST needed

  // 3️⃣ Redirect
  if (role === "traveler") {
    window.location.href = "Traveler.html";
  } else {
    window.location.href = "Sender.html";
  }
}

document.getElementById("signup-btn").addEventListener("click", signup);

