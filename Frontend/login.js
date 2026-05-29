async function login(email, password) {
  const res = await fetch("http://localhost:3000/api/users/login", {
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

  localStorage.setItem("user", JSON.stringify(user));

  window.location.href = "Traveler.html";
}

document.getElementById("login-btn").addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  login(email, password);
});

