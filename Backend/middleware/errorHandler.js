// backend/middleware/errorHandler.js

const errorHandler = (err, req, res, next) => {
  console.error("🔥 ERROR:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
};

module.exports = errorHandler;
