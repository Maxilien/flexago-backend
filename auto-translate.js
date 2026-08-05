// auto-translate.js
// ------------------------------------------------------
// Flexago Localization Auto-Translator using Gemini API
// ------------------------------------------------------
import {TranslationServiceClient} from '@google-cloud/translate';

const client = new TranslationServiceClient({
  keyFilename: "./service-account.json"
});

async function autoTranslate(text, targetLanguage) {
  const request = {
    parent: `projects/logistics-marketplace-491214/locations/global`,
    contents: [text],
    mimeType: "text/plain",
    targetLanguageCode: targetLanguage,
  };

  const [response] = await client.translateText(request);
  console.log(`Translated (${targetLanguage}):`, response.translations[0].translatedText);
}

autoTranslate("Hello world", "fr");
