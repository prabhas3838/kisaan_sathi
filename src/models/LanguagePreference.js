const mongoose = require("mongoose");

const languagePreferenceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  language: {
    type: String,
    enum: ["en", "ta", "hi"],
    default: "en"
  }
});

module.exports = mongoose.model(
  "LanguagePreference",
  languagePreferenceSchema
);
