async function signup() {
  const firstName = document.getElementById("firstName").value;
  const lastName = document.getElementById("lastName").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const phone = document.getElementById("phone").value;
  const role = document.getElementById("role").value;

  const res = await fetch("http://localhost:3000/api/users", {
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

  // Save user + token
  localStorage.setItem("user", JSON.stringify(result.data));
  localStorage.setItem("token", result.token);

  // Redirect based on role
  if (role === "traveler") {
    window.location.href = "Traveler.html";
  } else {
    window.location.href = "Sender.html";
  }
}

document.getElementById("signup-btn").addEventListener("click", signup);
