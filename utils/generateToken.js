// utils/generateToken.js
// ------------------------------------------------------
// Flexagoo JWT Token Generator (CommonJS)
// ------------------------------------------------------

const jwt = require("jsonwebtoken");

function generateToken(userId) {
  return jwt.sign({ id: userId }, "FLEXAGO_SECRET_KEY", {
    expiresIn: "30d"
  });
}

module.exports = generateToken;
