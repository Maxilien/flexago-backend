/* ============================================================
   config/i18n.js
============================================================ */
const i18next = require("i18next");
const i18nextFsBackend = require("i18next-fs-backend");
const i18nextHttpMiddleware = require("i18next-http-middleware");
const path = require("path");

i18next
  .use(i18nextFsBackend)           // loads JSON files from disk
  .use(i18nextHttpMiddleware.LanguageDetector) // detects lang from request
  .init({
    backend: {
      loadPath: path.join(__dirname, "../locales/{{lng}}/{{ns}}.json"),
    },
    detection: {
      // Order of language detection — mirrors how Uber does it
      order: [
        "querystring",   // ?lng=es
        "header",        // Accept-Language header
        "cookie",        // lng cookie
      ],
      lookupQuerystring: "lng",
      lookupCookie: "lng",
      cacheUserLanguage: true,
    },
    fallbackLng: "en",             // default to English if lang not found
    preload: ["en", "es", "fr", "pt", "de", "zh", "ar"],
    ns: ["common", "errors", "emails"],
    defaultNS: "common",
    saveMissing: true,             // logs missing keys so you can catch them
    saveMissingTo: "all",
    interpolation: {
      escapeValue: false,          // safe for HTML emails
    },
  });

module.exports = { i18next, i18nextHttpMiddleware };
