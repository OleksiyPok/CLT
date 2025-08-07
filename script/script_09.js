// === Constants and Globals ===

const DEFAULT_SETTINGS = {
  speed: "1.0",
  delay: "1000",
  lang: "en",
};

const SETTINGS_KEY = "CLT_settings";

const PLAY_ICON = "▶️";
const STOP_ICON = "⏹️";

let sequenceInputs = [];
let sequenceIndex = 0;
let isSequenceMode = false;
let isPaused = false;
let currentSpeakButton = null;

let isSpeaking = false;
let utterance = null;

// === Utility Functions ===

// Capitalize first letter of a word
function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Parse time input string "HH:MM" or return null
function parseTimeInput(input) {
  const match = input.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  let [_, hours, minutes] = match;
  hours = String(parseInt(hours));
  minutes = String(minutes).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Generate Dutch time string from "HH:MM"
function getDutchTimeString(timeStr) {
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return getDutchTimeStringFromDigits(h, m);
}

// Dutch time string logic by digits
function getDutchTimeStringFromDigits(hours, minutes) {
  const hourNames = dutchVocab.hourNames;
  const minuteNames = dutchVocab.minuteNames;

  const nextHour = (hours + 1) % 24;
  if (minutes === 0) return `${capitalize(hourNames[hours % 12])} uur`;
  if (minutes === 15) return `Kwart over ${hourNames[hours % 12]}`;
  if (minutes === 30) return `Half ${hourNames[nextHour % 12]}`;
  if (minutes === 45) return `Kwart voor ${hourNames[nextHour % 12]}`;
  if (minutes < 15)
    return `${minuteNames[minutes]} over ${hourNames[hours % 12]}`;
  if (minutes < 30)
    return `${minuteNames[30 - minutes]} voor half ${hourNames[nextHour % 12]}`;
  if (minutes < 45)
    return `${minuteNames[minutes - 30]} over half ${hourNames[nextHour % 12]}`;
  return `${minuteNames[60 - minutes]} voor ${hourNames[nextHour % 12]}`;
}

// Get current time string "H:MM"
function getCurrentTimeString() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Generate random time string "H:MM"
function generateRandomTimeString() {
  const hour = Math.floor(Math.random() * 24);
  const minute = Math.floor(Math.random() * 60);
  return `${hour}:${String(minute).padStart(2, "0")}`;
}

// === UI State Management ===

// Disable or enable all speak buttons
function disableSpeakButtons(disable) {
  document.querySelectorAll(".speak-btn").forEach((btn) => {
    btn.disabled = disable;
  });
}

// Enable or disable controls (speed and delay selects)
function setControlsEnabled(enabled) {
  // Speed control
  const speedSelect = document.getElementById("speedSelect");
  speedSelect.disabled = !enabled;
  const speedLabel = document.querySelector('label[for="speedSelect"]');
  if (speedLabel) speedLabel.classList.toggle("disabled", !enabled);

  // Delay control
  const delaySelect = document.getElementById("delaySelect");
  delaySelect.disabled = !enabled;
  const delayLabel = document.querySelector('label[for="delaySelect"]');
  if (delayLabel) delayLabel.classList.toggle("disabled", !enabled);
}

// Highlight active input in sequence mode
function setActiveInput(index) {
  const inputs = Array.from(document.querySelectorAll(".time-input"));
  const randomButtons = Array.from(document.querySelectorAll(".random-btn"));

  inputs.forEach((input) => input.classList.remove("highlight"));
  randomButtons.forEach((btn) => (btn.disabled = false));

  if (index >= 0 && index < inputs.length) {
    inputs[index].classList.add("highlight");
    const rndBtn = inputs[index].parentElement.querySelector(".random-btn");
    if (rndBtn) rndBtn.disabled = true;
  }
}

// Update icons on speak buttons
function updateButtonIcon(activeButton = null) {
  document.querySelectorAll(".speak-btn").forEach((btn) => {
    btn.textContent = PLAY_ICON;
  });

  if (isSpeaking && activeButton) {
    activeButton.textContent = STOP_ICON;
  }
}

// === Speech Functions ===

// Speak given text, with optional callback on end, rate and associated button
function speakText(text, onEndCallback = null, rate = 1.0, button = null) {
  if (isSpeaking) {
    speechSynthesis.cancel();
  }

  utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "nl-NL";
  utterance.rate = rate;

  setControlsEnabled(false);

  utterance.onend = () => {
    isSpeaking = false;
    updateButtonIcon(button);

    if (!isSequenceMode) {
      disableSpeakButtons(false);
      if (button) button.disabled = false;
      setControlsEnabled(true);
    }

    if (typeof onEndCallback === "function") onEndCallback();
  };

  isSpeaking = true;
  currentSpeakButton = button;
  updateButtonIcon(button);

  speechSynthesis.speak(utterance);
}

// Stop current speech
function stopSpeaking() {
  if (isSpeaking) {
    speechSynthesis.cancel();
    isSpeaking = false;
    updateButtonIcon(currentSpeakButton);
  }
}

// Speak all input times sequentially
function speakAllTimesSequentially(index = 0) {
  const inputs = Array.from(
    document.querySelectorAll(".block-exercises input")
  );
  const rate = parseFloat(document.getElementById("speedSelect").value);
  const delayMs = parseInt(document.getElementById("delaySelect").value, 10);

  // Отключаем кнопки при старте последовательности
  if (index === 0) {
    disableSpeakButtons(true);
  }

  if (index >= inputs.length) {
    isSpeaking = false;
    isSequenceMode = false;
    isPaused = false;
    setActiveInput(-1);
    disableSpeakButtons(false); // Разблокируем кнопки по окончании
    setControlsEnabled(true);
    document.getElementById("resetBtn").disabled = false;
    document.getElementById("startPauseBtn").textContent = "Start";
    return;
  }

  sequenceIndex = index;
  const input = inputs[index];

  if (!input || !input.value.trim()) {
    speakAllTimesSequentially(index + 1);
    return;
  }

  setActiveInput(index);

  const rawInput = input.value.trim();
  const timeStr = parseTimeInput(rawInput);
  const phraseToSpeak = timeStr ? getDutchTimeString(timeStr) : rawInput;

  isSpeaking = true;
  isSequenceMode = true;
  isPaused = false;

  setControlsEnabled(false);

  speakText(
    phraseToSpeak,
    () => {
      if (isPaused) return;

      setTimeout(() => {
        speakAllTimesSequentially(index + 1);
      }, delayMs);
    },
    rate
  );
}

// === Settings Persistence ===

// Save settings to localStorage
function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Load settings from localStorage or return defaults
function loadSettings() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (!saved) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(saved);
    return {
      speed: parsed.speed || DEFAULT_SETTINGS.speed,
      delay: parsed.delay || DEFAULT_SETTINGS.delay,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

// Apply settings to UI controls
function applySettingsToUI(settings) {
  document.getElementById("speedSelect").value = settings.speed;
  document.getElementById("delaySelect").value = settings.delay;
}

// Read current settings from UI controls
function readSettingsFromUI() {
  return {
    speed: document.getElementById("speedSelect").value,
    delay: document.getElementById("delaySelect").value,
  };
}

// === UI Translation Functions ===

function translateUI(lang) {
  const texts = window.embeddedUITexts[lang];
  if (!texts) return;

  const idToKey = {
    uiLangLabel: "uiLangLabel",
    startPauseBtn: "startPauseBtn",
    resetBtn: "resetBtn",
    labelSpeed: "labelSpeed",
    labelDelay: "labelDelay",
  };

  for (const [id, key] of Object.entries(idToKey)) {
    const elem = document.getElementById(id);
    if (elem && texts[key]) {
      elem.textContent = texts[key];
    }
  }
}

// === Event Listeners ===

// Setup random and speak buttons for each clock container
document.querySelectorAll(".clock-container").forEach((group) => {
  const rndBtn = group.querySelector(".random-btn");
  const input = group.querySelector(".time-input");
  rndBtn.addEventListener("click", () => {
    input.value = generateRandomTimeString();
  });

  const speakBtn = group.querySelector(".speak-btn");
  speakBtn.addEventListener("click", () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    const rawInput = input.value;
    const timeStr = parseTimeInput(rawInput);
    if (!timeStr) {
      alert("Enter time in HH:MM format");
      return;
    }
    const phraseToSpeak = getDutchTimeString(timeStr);
    if (!phraseToSpeak) {
      alert("Invalid time or unable to generate Dutch phrase.");
      return;
    }
    const speed = parseFloat(document.getElementById("speedSelect").value);
    speakText(phraseToSpeak, null, speed, speakBtn);
  });
});

// Fill all inputs with random times
document.getElementById("fillRandomBtn").addEventListener("click", () => {
  document.querySelectorAll(".random-btn").forEach((btn) => btn.click());
});

// Start/pause/continue sequence speaking
document.getElementById("startPauseBtn").addEventListener("click", () => {
  const btn = document.getElementById("startPauseBtn");

  if (isSpeaking) {
    isPaused = true;
    stopSpeaking();
    setControlsEnabled(true);
    document.getElementById("resetBtn").disabled = false;
    btn.textContent = "Continue";
  } else if (isSequenceMode && isPaused) {
    speakAllTimesSequentially(sequenceIndex);
    setControlsEnabled(false);
    document.getElementById("resetBtn").disabled = true;
    btn.textContent = "Stop";
  } else if (!isSequenceMode) {
    sequenceIndex = 0;
    speakAllTimesSequentially(sequenceIndex);
    setControlsEnabled(false);
    document.getElementById("resetBtn").disabled = true;
    btn.textContent = "Stop";
  } else {
    sequenceIndex = 0;
    setActiveInput(-1);
    isSequenceMode = false;
    isPaused = false;
    setControlsEnabled(true);
    document.getElementById("resetBtn").disabled = false;
    btn.textContent = "Start";
    disableSpeakButtons(false);
  }
});

// Reset everything to initial state
document.getElementById("resetBtn").addEventListener("click", () => {
  stopSpeaking();
  isSequenceMode = false;
  isPaused = false;
  sequenceIndex = 0;
  currentSpeakButton = null;
  utterance = null;
  isSpeaking = false;
  updateButtonIcon();
  setActiveInput(-1);
  document.getElementById("startPauseBtn").textContent = "Start";

  disableSpeakButtons(false);
  setControlsEnabled(true);
});

// Save settings on speed change
document.getElementById("speedSelect").addEventListener("change", () => {
  saveSettings(readSettingsFromUI());
});

// Save settings on delay change
document.getElementById("delaySelect").addEventListener("change", () => {
  saveSettings(readSettingsFromUI());
});

// Reset settings to defaults
document.getElementById("resetSettingsBtn").addEventListener("click", () => {
  applySettingsToUI(DEFAULT_SETTINGS);
  saveSettings(DEFAULT_SETTINGS);
});

// On page load, apply saved settings and fill inputs randomly
document.addEventListener("DOMContentLoaded", () => {
  applySettingsToUI(loadSettings());

  const langSelect = document.getElementById("uiLangSelect");
  if (langSelect) {
    translateUI(langSelect.value);
    langSelect.addEventListener("change", (e) => {
      translateUI(e.target.value);
    });
  }

  const fillRandomBtn = document.getElementById("fillRandomBtn");
  if (fillRandomBtn) {
    fillRandomBtn.addEventListener("click", () => {
      document.querySelectorAll(".random-btn").forEach((btn) => btn.click());
    });
    fillRandomBtn.click();
  }
});
