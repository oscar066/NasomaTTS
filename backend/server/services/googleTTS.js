// googleTTS.js
const textToSpeech = require("@google-cloud/text-to-speech");
const fs = require("fs");
const util = require("util");

// Create a client
const client = new textToSpeech.TextToSpeechClient();

/**
 * Synthesizes speech using Google Cloud TTS.
 *
 * @param {string} text - The text to synthesize.
 * @param {string} selectedVoice - The voice to use (for example, 'en-US-Wavenet-D').
 * @param {number} speakingRate - The speaking rate (default is 1.0).
 * @returns {Promise<Buffer>} - Resolves with a Buffer containing the MP3 audio content.
 */

async function synthesizeSpeech(
  text,
  selectedVoice = "en-US-Wavenet-D",
  speakingRate = 1.5
) {
  const request = {
    input: { text },
    // Specify languageCode and name per your available voices.
    voice: { languageCode: "en-US", name: selectedVoice },
    audioConfig: { audioEncoding: "MP3", speakingRate: speakingRate },
  };

  // Performs the text-to-speech request.
  const [response] = await client.synthesizeSpeech(request);

  // The response.audioContent is a binary string.
  return Buffer.from(response.audioContent, "binary");
}

module.exports = { synthesizeSpeech };
