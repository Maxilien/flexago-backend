app.post("/translate", async (req, res) => {
  try {
    const {text, targetLanguage, sourceLanguage} = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({error: "text and targetLanguage are required"});
    }

    const request = {
      parent: `projects/${projectId}/locations/${location}`,
      contents: [text],
      mimeType: "text/plain",
      targetLanguageCode: targetLanguage,
    };

    if (sourceLanguage) {
      request.sourceLanguageCode = sourceLanguage;
    }

    const [response] = await client.translateText(request);
    res.json({translatedText: response.translations[0].translatedText});
  } catch (err) {
    res.status(500).json({error: "Translation failed"});
  }
});
