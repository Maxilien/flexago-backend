// middleware/adminAuth.js
const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Allow both admin and superadmin
    if (!["admin", "superadmin"].includes(decoded.role)) {
      throw new Error();
    }

    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
};
