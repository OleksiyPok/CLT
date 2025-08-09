// ==================== CONSTANTS ====================
const DEFAULT_SETTINGS = { speed: "1.0", delay: "1000", lang: "en" };
const SETTINGS_KEY = "CLT_settings";
const PLAY_ICON = "▶️";
const STOP_ICON = "⏹️";

// ==================== STATE ====================
let sequenceIndex = 0;
let isSequenceMode = false;
let isPaused = false;
let isSpeaking = false;
let currentSpeakButton = null;
let utterance = null;
let sequenceTimeoutId = null;

// ==================== DOM ====================
const delaySelectEl = document.getElementById("delaySelect");
const speedSelectEl = document.getElementById("speedSelect");
const startPauseBtnEl = document.getElementById("startPauseBtn");
const resetBtnEl = document.getElementById("resetBtn");
const resetSettingsBtnEl = document.getElementById("resetSettingsBtn");
const fillRandomBtnEl = document.getElementById("fillRandomBtn");
const uiLangSelectEl = document.getElementById("uiLangSelect");

// UPDATED: selector matches new markup
const blockExercisesInputEls = document.querySelectorAll(
  ".section-block-exercises .time-input"
);

const randomBtnEls = document.querySelectorAll(".random-btn");
const speakBtnEls = document.querySelectorAll(".speak-btn");
const timeInputEls = document.querySelectorAll(".time-input");
const clockContainerEls = document.querySelectorAll(".clock-container");

// ==================== UTILS ====================
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
const parseTimeInput = (input) => {
  if (!input || typeof input !== "string") return null;
  const m = input.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = String(parseInt(m[1], 10));
  const min = m[2].padStart(2, "0");
  return `${h}:${min}`;
};
const generateRandomTimeString = () => {
  const h = Math.floor(Math.random() * 24);
  const m = Math.floor(Math.random() * 60);
  return `${h}:${String(m).padStart(2, "0")}`;
};

// ==================== TIME -> DUTCH ====================
function getDutchTimeString(timeStr) {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  return getDutchTimeStringFromDigits(h, m);
}
function getDutchTimeStringFromDigits(hours, minutes) {
  if (typeof dutchVocab === "undefined") {
    return `${hours}:${String(minutes).padStart(2, "0")}`;
  }
  const hourNames = dutchVocab.hourNames || [];
  const minuteNames = dutchVocab.minuteNames || [];
  const nextHour = (hours + 1) % 24;
  const idx = hours % 12;
  const nextIdx = nextHour % 12;

  if (minutes === 0)
    return `${capitalize(hourNames[idx] || String(hours))} uur`;
  if (minutes === 15) return `Kwart over ${hourNames[idx] || hours}`;
  if (minutes === 30) return `Half ${hourNames[nextIdx] || nextHour}`;
  if (minutes === 45) return `Kwart voor ${hourNames[nextIdx] || nextHour}`;
  if (minutes < 15)
    return `${minuteNames[minutes] || minutes} over ${hourNames[idx] || hours}`;
  if (minutes < 30)
    return `${minuteNames[30 - minutes] || 30 - minutes} voor half ${
      hourNames[nextIdx] || nextHour
    }`;
  if (minutes < 45)
    return `${minuteNames[minutes - 30] || minutes - 30} over half ${
      hourNames[nextIdx] || nextHour
    }`;
  return `${minuteNames[60 - minutes] || 60 - minutes} voor ${
    hourNames[nextIdx] || nextHour
  }`;
}

// ==================== UI HELPERS ====================
function clearSequenceTimeout() {
  if (sequenceTimeoutId) {
    clearTimeout(sequenceTimeoutId);
    sequenceTimeoutId = null;
  }
}
function disableSpeakButtons(disable) {
  speakBtnEls.forEach((b) => {
    if (b) b.disabled = disable;
  });
}
function toggleControls(enabled) {
  if (speedSelectEl) speedSelectEl.disabled = !enabled;
  if (delaySelectEl) delaySelectEl.disabled = !enabled;
  document
    .querySelectorAll('label[for="speedSelect"],label[for="delaySelect"]')
    .forEach((l) => l.classList.toggle("disabled", !enabled));
}
function setActiveInput(index) {
  timeInputEls.forEach((inp) => {
    if (inp) inp.classList.remove("highlight");
  });
  randomBtnEls.forEach((btn) => {
    if (btn) btn.disabled = false;
  });

  if (index >= 0 && index < timeInputEls.length) {
    const inp = timeInputEls[index];
    if (!inp) return;
    inp.classList.add("highlight");
    const rnd = inp.parentElement
      ? inp.parentElement.querySelector(".random-btn")
      : null;
    if (rnd) rnd.disabled = true;
  }
}
function updateButtonIcon(activeButton = null) {
  speakBtnEls.forEach((b) => {
    if (b) b.textContent = PLAY_ICON;
  });
  if (isSpeaking && activeButton) activeButton.textContent = STOP_ICON;
}
function setBtnText(btn, text) {
  if (btn) btn.textContent = text;
}
function resetSequenceState() {
  stopAll();
  isSequenceMode = false;
  isPaused = false;
  sequenceIndex = 0;
  currentSpeakButton = null;
  utterance = null;
  isSpeaking = false;
  updateButtonIcon();
  setActiveInput(-1);
  setBtnText(startPauseBtnEl, "Start");
  disableSpeakButtons(false);
  toggleControls(true);
}

// ==================== SPEECH ====================
function speakText(text, onEnd = null, rate = 1.0, button = null) {
  if (!text) return;
  if (!("speechSynthesis" in window)) {
    console.warn("speechSynthesis not supported");
    onEnd && onEnd();
    return;
  }
  if (isSpeaking) speechSynthesis.cancel();
  clearSequenceTimeout();

  utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "nl-NL";
  utterance.rate = rate;

  toggleControls(false);

  utterance.onend = () => {
    isSpeaking = false;
    updateButtonIcon(button);
    if (!isSequenceMode) {
      disableSpeakButtons(false);
      if (button) button.disabled = false;
      toggleControls(true);
    }
    if (typeof onEnd === "function") onEnd();
  };
  utterance.oncancel = () => {
    isSpeaking = false;
    updateButtonIcon(button);
  };
  utterance.onerror = (e) => {
    console.error("TTS error", e);
    isSpeaking = false;
    updateButtonIcon(button);
    if (!isSequenceMode) toggleControls(true);
  };

  isSpeaking = true;
  currentSpeakButton = button;
  updateButtonIcon(button);

  try {
    speechSynthesis.speak(utterance);
  } catch (e) {
    console.error("speak failed", e);
    isSpeaking = false;
    onEnd && onEnd();
  }
}

function stopAll() {
  if ("speechSynthesis" in window && speechSynthesis.speaking)
    speechSynthesis.cancel();
  isSpeaking = false;
  clearSequenceTimeout();
  updateButtonIcon(currentSpeakButton);
}

function speakAllTimesSequentially(index = 0) {
  clearSequenceTimeout();
  const inputs = Array.from(blockExercisesInputEls || []);
  const rate = parseFloat(speedSelectEl?.value || DEFAULT_SETTINGS.speed);
  const delayMs =
    parseInt(delaySelectEl?.value || DEFAULT_SETTINGS.delay, 10) || 1000;

  if (index === 0) disableSpeakButtons(true);
  if (index >= inputs.length) {
    isSpeaking = false;
    isSequenceMode = false;
    isPaused = false;
    setActiveInput(-1);
    disableSpeakButtons(false);
    toggleControls(true);
    if (resetBtnEl) resetBtnEl.disabled = false;
    setBtnText(startPauseBtnEl, "Start");
    return;
  }

  sequenceIndex = index;
  const input = inputs[index];
  const raw = input?.value?.trim() || "";
  if (!raw) {
    return speakAllTimesSequentially(index + 1);
  }

  setActiveInput(index);
  const timeStr = parseTimeInput(raw);
  const phrase = timeStr ? getDutchTimeString(timeStr) : raw;

  isSpeaking = true;
  isSequenceMode = true;
  isPaused = false;
  toggleControls(false);

  speakText(
    phrase,
    () => {
      if (isPaused) return;
      sequenceTimeoutId = setTimeout(() => {
        sequenceTimeoutId = null;
        speakAllTimesSequentially(index + 1);
      }, delayMs);
    },
    rate,
    null
  );
}

// ==================== SETTINGS ====================
function saveSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s || {}));
  } catch (e) {
    console.warn("saveSettings failed", e);
  }
}
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}
function applySettingsToUI(s) {
  if (speedSelectEl && s.speed) speedSelectEl.value = s.speed;
  if (delaySelectEl && s.delay) delaySelectEl.value = s.delay;
}
function readSettingsFromUI() {
  return {
    speed: speedSelectEl?.value || DEFAULT_SETTINGS.speed,
    delay: delaySelectEl?.value || DEFAULT_SETTINGS.delay,
  };
}

// ==================== UI TEXTS ====================
function translateUI(lang) {
  const texts = window.embeddedUITexts?.[lang];
  if (!texts) return;
  const map = {
    uiLangLabel: "uiLangLabel",
    startPauseBtn: "startPauseBtn",
    resetBtn: "resetBtn",
    labelSpeed: "labelSpeed",
    labelDelay: "labelDelay",
  };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el && texts[key]) el.textContent = texts[key];
  });
}

// ==================== EVENTS ====================
clockContainerEls.forEach((group) => {
  const rndBtn = group.querySelector(".random-btn");
  const input = group.querySelector(".time-input");
  const speakBtn = group.querySelector(".speak-btn");

  if (rndBtn && input) {
    rndBtn.addEventListener("click", () => {
      input.value = generateRandomTimeString();
    });
  }

  if (speakBtn) {
    speakBtn.addEventListener("click", () => {
      try {
        if (isSpeaking) {
          stopAll();
          return;
        }
        const raw = input?.value?.trim() || "";
        const timeStr = parseTimeInput(raw);
        if (!timeStr) {
          alert("Enter time in HH:MM format");
          return;
        }
        const phrase = getDutchTimeString(timeStr);
        if (!phrase) {
          alert("Invalid time or unable to generate Dutch phrase.");
          return;
        }
        const rate = parseFloat(speedSelectEl?.value || DEFAULT_SETTINGS.speed);
        speakText(phrase, null, rate, speakBtn);
      } catch (e) {
        console.error("speak handler error", e);
        alert("An error occurred");
      }
    });
  }
});

if (fillRandomBtnEl)
  fillRandomBtnEl.addEventListener("click", () =>
    randomBtnEls.forEach((b) => b.click())
  );

if (startPauseBtnEl) {
  startPauseBtnEl.addEventListener("click", () => {
    if (isSequenceMode && !isPaused) {
      stopAll();
      isPaused = true;
      setBtnText(startPauseBtnEl, "Continue");
      toggleControls(true);
      if (resetBtnEl) resetBtnEl.disabled = false;
      return;
    }
    if (isSequenceMode && isPaused) {
      isPaused = false;
      speakAllTimesSequentially(sequenceIndex || 0);
      setBtnText(startPauseBtnEl, "Stop");
      toggleControls(false);
      if (resetBtnEl) resetBtnEl.disabled = true;
      return;
    }
    sequenceIndex = 0;
    speakAllTimesSequentially(0);
    setBtnText(startPauseBtnEl, "Stop");
    toggleControls(false);
    if (resetBtnEl) resetBtnEl.disabled = true;
  });
}

if (resetBtnEl) resetBtnEl.addEventListener("click", resetSequenceState);
if (speedSelectEl)
  speedSelectEl.addEventListener("change", () =>
    saveSettings(readSettingsFromUI())
  );
if (delaySelectEl)
  delaySelectEl.addEventListener("change", () =>
    saveSettings(readSettingsFromUI())
  );
if (resetSettingsBtnEl)
  resetSettingsBtnEl.addEventListener("click", () => {
    applySettingsToUI(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  });

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", () => {
  try {
    applySettingsToUI(loadSettings());
    if (uiLangSelectEl) {
      translateUI(uiLangSelectEl.value);
      uiLangSelectEl.addEventListener("change", (e) =>
        translateUI(e.target.value)
      );
    }
    if (fillRandomBtnEl) fillRandomBtnEl.click();
  } catch (e) {
    console.error("init error", e);
  }
});
