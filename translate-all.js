import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {TranslationServiceClient} from "@google-cloud/translate";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new TranslationServiceClient({
  keyFilename: path.join(__dirname, "service-account.json"),
});

const projectId = "logistics-marketplace-491214";
const location = "global";

const languages = ["fr", "es", "de"]; // add more
const files = ["common", "email", "error"];

async function translateFile(fileName, targetLang) {
  const sourcePath = path.join(__dirname, `locales/en/${fileName}.json`);
  const raw = fs.readFileSync(sourcePath, "utf8");
  const sourceObj = JSON.parse(raw);

  const translatedObj = {};

  for (const key of Object.keys(sourceObj)) {
    const text = sourceObj[key];

    const request = {
      parent: `projects/${projectId}/locations/${location}`,
      contents: [text],
      mimeType: "text/plain",
      sourceLanguageCode: "en",
      targetLanguageCode: targetLang,
    };

    const [response] = await client.translateText(request);
    translatedObj[key] = response.translations[0].translatedText;
  }

  const outDir = path.join(__dirname, `locales/${targetLang}`);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const outPath = path.join(outDir, `${fileName}.json`);
  fs.writeFileSync(outPath, JSON.stringify(translatedObj, null, 2));
  console.log(`Translated ${fileName} → ${targetLang}`);
}

async function run() {
  for (const lang of languages) {
    for (const file of files) {
      await translateFile(file, lang);
    }
  }
}

run().catch(console.error);
