// middleware/auth.js
// ------------------------------------------------------
// Flexago Regular User JWT Authentication
// ------------------------------------------------------

const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function auth(
  req,
  res,
  next
) {
  try {
    const authorization =
      req.headers.authorization || "";

    const [scheme, token] =
      authorization.split(" ");

    if (
      scheme !== "Bearer" ||
      !token
    ) {
      return res.status(401).json({
        success: false,
        error: "Authentication required"
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error(
        "JWT_SECRET environment variable is missing"
      );

      return res.status(500).json({
        success: false,
        error:
          "Authentication service is unavailable"
      });
    }

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    const user =
      await User.findById(
        decoded.id
      ).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User account not found"
      });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      user
    };

    return next();
  } catch (error) {
    console.error(
      "User authentication failed:",
      error.message
    );

    return res.status(401).json({
      success: false,
      error:
        "Invalid or expired authentication token"
    });
  }
};