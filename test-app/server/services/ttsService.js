const { execFile } = require("child_process");
const os = require("os");

class TextToSpeechService {
  constructor(options = {}) {
    this.platform = os.platform();
    this.defaultOptions = {
      voice: this.getDefaultVoice(),
      wpm: 300,
      windowSize: 3,
    };
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Get default voice based on platform
   * @returns {string} Default voice name
   */
  getDefaultVoice() {
    switch (this.platform) {
      case "darwin":
        return "Karen"; // macOS
      case "win32":
        return "David"; // Windows
      case "linux":
        return "en-us"; // Linux
      default:
        return "default";
    }
  }

  /**
   * Get available voices for the current platform
   * @returns {Promise<string[]>} List of available voices
   */
  async getAvailableVoices() {
    return new Promise((resolve, reject) => {
      switch (this.platform) {
        case "darwin":
          this.macOSVoices(resolve, reject);
          break;
        case "win32":
          this.windowsVoices(resolve, reject);
          break;
        case "linux":
          this.linuxVoices(resolve, reject);
          break;
        default:
          reject(new Error("Unsupported platform"));
      }
    });
  }

  /**
   * Retrieve macOS voices
   * @param {Function} resolve - Promise resolve function
   * @param {Function} reject - Promise reject function
   */
  macOSVoices(resolve, reject) {
    execFile("say", ["-v", "?"], (err, stdout) => {
      if (err) return reject(err);
      const voices = stdout
        .trim()
        .split("\n")
        .map((line) => line.split(/\s+/)[0])
        .filter(Boolean);
      resolve(voices);
    });
  }

  /**
   * Retrieve Windows voices
   * @param {Function} resolve - Promise resolve function
   * @param {Function} reject - Promise reject function
   */
  windowsVoices(resolve, reject) {
    const script = `
      Add-Type -AssemblyName System.speech;
      $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer;
      $speak.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
    `;

    execFile("powershell", ["-Command", script], (err, stdout) => {
      if (err) return reject(err);
      const voices = stdout
        .trim()
        .split("\n")
        .map((voice) => voice.trim())
        .filter(Boolean);
      resolve(voices);
    });
  }

  /**
   * Retrieve Linux voices
   * @param {Function} resolve - Promise resolve function
   * @param {Function} reject - Promise reject function
   */
  linuxVoices(resolve, reject) {
    execFile("espeak", ["--voices"], (err, stdout) => {
      if (err) return reject(err);
      const voices = stdout
        .trim()
        .split("\n")
        .slice(1) // Skip header
        .map((line) => line.split(/\s+/)[3])
        .filter(Boolean);
      resolve(voices);
    });
  }

  /**
   * Determine the appropriate TTS command based on the operating system
   * @param {string} text - Text to be spoken
   * @param {Object} [customOptions] - Optional custom speaking options
   * @returns {Object} Command and arguments for TTS
   */
  getTTSCommand(text, customOptions = {}) {
    // Merge default and custom options
    const mergedOptions = {
      ...this.options,
      ...customOptions,
      voice: customOptions.voice || this.options.voice,
    };

    switch (this.platform) {
      case "darwin": // macOS
        return {
          command: "say",
          args: [
            "-v",
            mergedOptions.voice,
            "-r",
            this.calculateMacOSRate(mergedOptions.wpm).toString(),
            text,
          ],
        };
      case "win32": // Windows
        return {
          command: "powershell",
          args: [
            "-Command",
            this.createWindowsSpeechScript(text, mergedOptions),
          ],
        };
      case "linux": // Linux (using espeak)
        return {
          command: "espeak",
          args: [
            "-v",
            mergedOptions.voice,
            "-s",
            this.calculateLinuxRate(mergedOptions.wpm).toString(),
            text,
          ],
        };
      default:
        throw new Error("Unsupported operating system");
    }
  }

  /**
   * Calculate macOS speech rate
   * @param {number} wpm - Words per minute
   * @returns {number} macOS-specific speech rate
   */
  calculateMacOSRate(wpm) {
    // macOS 'say' command uses a different rate scaling
    // Roughly map WPM to macOS rate (default is 175-200 WPM)
    return Math.round(wpm / 50);
  }

  /**
   * Calculate Linux espeak rate
   * @param {number} wpm - Words per minute
   * @returns {number} espeak-specific speech rate
   */
  calculateLinuxRate(wpm) {
    // espeak uses words per minute more directly
    return Math.round(wpm * 0.6);
  }

  /**
   * Create Windows speech script
   * @param {string} text - Text to speak
   * @param {Object} options - Speech options
   * @returns {string} PowerShell script for speech
   */
  createWindowsSpeechScript(text, options) {
    // Escape double quotes in the text
    const escapedText = text.replace(/"/g, '\\"');

    return `
      Add-Type -AssemblyName System.speech;
      $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer;
      $speak.SelectVoice("${options.voice}");
      $speak.Rate = ${Math.floor(options.wpm / 50)};
      $speak.Speak("${escapedText}")
    `;
  }

  /**
   * Speak text using system TTS
   * @param {string} text - Text to speak
   * @param {Object} [customOptions] - Optional custom speaking options
   * @returns {Promise} Promise resolving when speech is complete
   */
  speak(text, customOptions = {}) {
    return new Promise((resolve, reject) => {
      try {
        const { command, args } = this.getTTSCommand(text, customOptions);

        execFile(command, args, (err) => {
          if (err) {
            console.error("TTS Execution Error:", err);
            return reject(err);
          }
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Preprocess text for TTS
   * @param {string} text - Input text
   * @returns {string[]} Processed paragraphs
   */
  preprocessText(text) {
    return text
      .split(/\n\s*\n/)
      .map((para) => para.trim())
      .filter((para) => para.length > 0);
  }

  /**
   * Create a word tracking service for highlighting
   * @param {string} paragraph - Paragraph text
   * @param {Object} [options] - Highlighting options
   * @returns {Object} Word tracking metadata
   */
  createWordTracking(paragraph, options = {}) {
    const mergedOptions = {
      wpm: this.options.wpm,
      windowSize: this.options.windowSize,
      ...options,
    };

    const words = paragraph.split(/\s+/).filter(Boolean);
    const wordsPerSecond = mergedOptions.wpm / 60;
    const msPerWord = 1000 / wordsPerSecond;

    return {
      words,
      totalDuration: words.length * msPerWord,
      getWordHighlight: (currentIndex) => {
        const halfWindow = Math.floor(mergedOptions.windowSize / 2);
        const windowStart = Math.max(0, currentIndex - halfWindow);
        const windowEnd = Math.min(words.length - 1, currentIndex + halfWindow);

        return {
          fullParagraph: words.join(" "),
          currentWordIndex: currentIndex,
          wordWindow: words.slice(windowStart, windowEnd + 1),
          windowStart,
        };
      },
    };
  }
}

module.exports = TextToSpeechService;
