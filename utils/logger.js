// backend/utils/logger.js

const chalk = require("chalk");

function timestamp() {
  return new Date().toISOString();
}

module.exports = {
  info(message, data = null) {
    console.log(
      chalk.blue(`[INFO] ${timestamp()} — ${message}`),
      data ? chalk.gray(JSON.stringify(data)) : ""
    );
  },

  success(message, data = null) {
    console.log(
      chalk.green(`[SUCCESS] ${timestamp()} — ${message}`),
      data ? chalk.gray(JSON.stringify(data)) : ""
    );
  },

  warn(message, data = null) {
    console.warn(
      chalk.yellow(`[WARN] ${timestamp()} — ${message}`),
      data ? chalk.gray(JSON.stringify(data)) : ""
    );
  },

  error(message, error = null) {
    console.error(
      chalk.red(`[ERROR] ${timestamp()} — ${message}`),
      error ? chalk.gray(error.stack || error) : ""
    );
  }
};
