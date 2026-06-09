async function login(email, password) {
  try {
    const res = await fetch("https://flexago-backend.onrender.com/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const result = await res.json();

    if (!result.success) {
      alert(result.error || "Login failed");
      return;
    }

    const user = result.data;

    // Save userId for Traveler.js
    localStorage.setItem("userId", user._id);

    // Save full user object
    localStorage.setItem("user", JSON.stringify(user));

    // Redirect to Traveler app
    window.location.href = "traveler.html";

  } catch (err) {
    console.error("Login error:", err);
    alert("Unable to connect to server. Please try again.");
  }
}

document.getElementById("login-btn").addEventListener("click", () => {
  const email = document.getElementById("email").value.toLowerCase(); // ⭐ FIXED
  const password = document.getElementById("password").value;
  login(email, password);
});

