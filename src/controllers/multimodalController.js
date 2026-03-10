const LanguagePreference = require("../models/LanguagePreference");

// STORE / UPDATE LANGUAGE
exports.setLanguagePreference = async (req, res) => {
  const { userId, language } = req.body;

  let pref = await LanguagePreference.findOne({ userId });

  if (pref) {
    pref.language = language;
    await pref.save();
  } else {
    pref = await LanguagePreference.create({ userId, language });
  }

  res.json({
    message: "Language preference saved",
    data: pref
  });
};

// UNIFIED API FOR APP / VOICE / SMS / IVR
exports.handleUnifiedInput = async (req, res) => {
  const { userId, mode, message } = req.body;
  // mode = app | voice | sms | ivr

  const pref = await LanguagePreference.findOne({ userId });
  const language = pref ? pref.language : "en";

  let responseText;

  if (language === "ta") {
    responseText = "உங்கள் கோரிக்கை பெறப்பட்டது";
  } else if (language === "hi") {
    responseText = "आपका अनुरोध प्राप्त हुआ";
  } else {
    responseText = "Your request has been received";
  }

  res.json({
    receivedFrom: mode,
    languageUsed: language,
    reply: responseText
  });
};
