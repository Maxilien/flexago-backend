// auto-translate.js
// ------------------------------------------------------
// Flexago Localization Auto-Translator using Gemini API
// ------------------------------------------------------

const fs = require("fs");
const path = require("path");
const axios = require("axios");

// ⭐ Force dotenv to load .env from the same folder
require("dotenv").config({ path: path.join(__dirname, ".env") });

// ⭐ Debug print — MUST show your key
console.log("Loaded GEMINI_API_KEY:", process.env.GEMINI_API_KEY);

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

const languages = {
  es: "Spanish",
  fr: "French",
  pt: "Portuguese",
  de: "German",
  zh: "Chinese",
  ar: "Arabic",
};

const EN_DIR = path.join(__dirname, "Locales", "en");
const OUTPUT_DIR = path.join(__dirname, "Locales");

const englishFiles = fs.readdirSync(EN_DIR).filter((file) => file.endsWith(".json"));

/* ============================================================
   ⭐ Gemini Translation Request (Correct API Version + Model)
   ============================================================ */
async function translateText(text, targetLang) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;

  try {
    const response = await axios.post(url, {
      contents: [
        {
          parts: [
            {
              text: `Translate the following text into ${targetLang}:\n\n${text}`
            }
          ]
        }
      ]
    });

    return response.data.candidates[0].content.parts[0].text.trim();

  } catch (err) {
    console.error("❌ Gemini API Error:", err.response?.data || err.message);
    throw new Error("Gemini translation failed");
  }
}

/* ============================================================
   ⭐ Recursive Object Translation
   ============================================================ */
async function translateObject(obj, targetLang) {
  const translated = {};

  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "string") {
      translated[key] = await translateText(obj[key], targetLang);
    } else if (typeof obj[key] === "object") {
      translated[key] = await translateObject(obj[key], targetLang);
    }
  }

  return translated;
}

/* ============================================================
   ⭐ Main Translation Runner
   ============================================================ */
async function generateTranslations() {
  console.log("🚀 Starting Gemini translation…");

  for (const [langCode, langName] of Object.entries(languages)) {
    const langDir = path.join(OUTPUT_DIR, langCode);

    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir);
    }

    console.log(`\n🌍 Generating ${langName} (${langCode})…`);

    for (const file of englishFiles) {
      const englishPath = path.join(EN_DIR, file);
      const outputPath = path.join(langDir, file);

      const englishJSON = JSON.parse(fs.readFileSync(englishPath, "utf8"));

      try {
        const translatedJSON = await translateObject(englishJSON, langCode);

        fs.writeFileSync(outputPath, JSON.stringify(translatedJSON, null, 2));

        console.log(`   ✔ ${file} → ${langCode}/${file}`);
      } catch (err) {
        console.error(`   ❌ Failed translating ${file}:`, err.message);
      }
    }
  }

  console.log("\n🎉 All translations generated successfully!");
}

/* ============================================================
   ⭐ Execute
   ============================================================ */
generateTranslations().catch((err) => {
  console.error("❌ Translation failed:", err.message);
});
