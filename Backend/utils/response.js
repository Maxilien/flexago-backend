// backend/utils/response.js

module.exports = {
  success(res, data = {}, message = "OK") {
    return res.json({
      success: true,
      message,
      data
    });
  },

  error(res, message = "Error", status = 400) {
    return res.status(status).json({
      success: false,
      message
    });
  }
};
