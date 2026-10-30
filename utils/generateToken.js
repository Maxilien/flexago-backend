// utils/generateToken.js
// ------------------------------------------------------
// Flexago Regular User JWT Token Generator
// ------------------------------------------------------

const jwt = require("jsonwebtoken");

function generateToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET environment variable is required"
    );
  }

  if (!user?._id) {
    throw new Error(
      "A valid user is required to generate a token"
    );
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d"
    }
  );
}

module.exports = generateToken;