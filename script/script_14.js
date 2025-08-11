// ==================== CONFIG ====================
const Config = {
  PATHS: { CONFIG: "script/config.json" },
  DEFAULT_CONFIG: Object.freeze({
    DEVELOPER_MODE: true,
    USE_LOCAL_STORAGE: true,
    DEFAULT_VOICE: "Google Nederlands",
    DEFAULT_SETTINGS: {
      mobile: {
        uiLang: "en",
        delay: "1000",
        speed: "1.0",
        fullscreen: "0",
        languageCode: "nl-NL",
        voiceName: "Google Nederlands",
      },
      desktop: {
        uiLang: "en",
        delay: "1000",
        speed: "1.0",
        fullscreen: "0",
        languageCode: "nl-NL",
        voiceName: "Google Nederlands",
      },
    },
  }),
};

// ==================== CONSTANTS ====================
const SETTINGS_KEY = "CLT_settings";
const PLAY_ICON = "▶️";
const STOP_ICON = "⏹️";

// ==================== APP STATE ====================
let APP_CONFIG = {};
let DEFAULT_SETTINGS_ACTIVE = {};
let currentSettings = {};
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
const blockExercisesInputEls = document.querySelectorAll(
  ".section-block-exercises .time-input"
);
const randomBtnEls = document.querySelectorAll(".random-btn");
const speakBtnEls = document.querySelectorAll(".speak-btn");
const timeInputEls = document.querySelectorAll(".time-input");
const clockContainerEls = document.querySelectorAll(".clock-container");
const developerBlockEl = document.getElementById("developer");

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
function deepMerge(defaultObj, srcObj) {
  if (!srcObj) return JSON.parse(JSON.stringify(defaultObj));
  const out = Array.isArray(defaultObj) ? [] : {};
  const keys = new Set([
    ...Object.keys(defaultObj || {}),
    ...Object.keys(srcObj || {}),
  ]);
  keys.forEach((k) => {
    const d = defaultObj ? defaultObj[k] : undefined;
    const s = srcObj ? srcObj[k] : undefined;
    if (
      d &&
      typeof d === "object" &&
      !Array.isArray(d) &&
      s &&
      typeof s === "object" &&
      !Array.isArray(s)
    ) {
      out[k] = deepMerge(d, s);
    } else if (s === undefined) {
      out[k] = JSON.parse(JSON.stringify(d));
    } else {
      out[k] = s;
    }
  });
  return out;
}
async function loadExternalConfig() {
  try {
    const resp = await fetch(Config.PATHS.CONFIG, { cache: "no-store" });
    if (!resp.ok) return deepMerge(Config.DEFAULT_CONFIG, {});
    const j = await resp.json();
    return deepMerge(Config.DEFAULT_CONFIG, j);
  } catch (e) {
    return deepMerge(Config.DEFAULT_CONFIG, {});
  }
}
function selectPlatformDefaults(defs) {
  const isMobile = /Mobi|Android|iPhone|iPad|Windows Phone|IEMobile/i.test(
    navigator.userAgent
  );
  return deepMerge(defs.desktop || {}, defs[isMobile ? "mobile" : "desktop"]);
}
function mergeSettingsWithDefaults(stored, defaults) {
  const out = {};
  out.uiLang = stored?.uiLang ?? defaults.uiLang;
  out.delay = stored?.delay ?? defaults.delay;
  out.speed = stored?.speed ?? defaults.speed;
  out.fullscreen = stored?.fullscreen ?? defaults.fullscreen;
  out.languageCode = stored?.languageCode ?? defaults.languageCode;
  out.voiceName = stored?.voiceName ?? defaults.voiceName;
  return out;
}
function saveSettings(s) {
  currentSettings = mergeSettingsWithDefaults(s || {}, DEFAULT_SETTINGS_ACTIVE);
  if (APP_CONFIG.USE_LOCAL_STORAGE && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
    } catch (e) {}
  }
}
function loadSettingsFromLocal() {
  if (APP_CONFIG.USE_LOCAL_STORAGE && typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return mergeSettingsWithDefaults(parsed, DEFAULT_SETTINGS_ACTIVE);
      }
    } catch (e) {}
  }
  return mergeSettingsWithDefaults({}, DEFAULT_SETTINGS_ACTIVE);
}
function readSettingsFromUI() {
  const base = { ...(currentSettings || {}) };
  if (uiLangSelectEl) base.uiLang = uiLangSelectEl.value;
  if (speedSelectEl) base.speed = speedSelectEl.value;
  if (delaySelectEl) base.delay = delaySelectEl.value;
  return mergeSettingsWithDefaults(base, DEFAULT_SETTINGS_ACTIVE);
}

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
  setBtnText(startPauseBtnEl, window.btnStates?.start || "Start");
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
  const rate = parseFloat(
    speedSelectEl?.value || DEFAULT_SETTINGS_ACTIVE.speed
  );
  const delayMs =
    parseInt(delaySelectEl?.value || DEFAULT_SETTINGS_ACTIVE.delay, 10) || 1000;
  if (index === 0) disableSpeakButtons(true);
  if (index >= inputs.length) {
    isSpeaking = false;
    isSequenceMode = false;
    isPaused = false;
    setActiveInput(-1);
    disableSpeakButtons(false);
    toggleControls(true);
    if (resetBtnEl) resetBtnEl.disabled = false;
    setBtnText(startPauseBtnEl, window.btnStates?.start || "Start");
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

// ==================== UI TEXTS ====================
function translateUI(lang) {
  const texts = window.embeddedUITexts?.[lang];
  if (!texts) return;
  const textMap = {
    uiLangLabel: "uiLangLabel",
    startPauseBtn: "startPauseBtn",
    resetBtn: "resetBtn",
    fillRandomBtn: "fillRandomBtn",
    labelSpeed: "labelSpeed",
    labelDelay: "labelDelay",
  };
  Object.entries(textMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el && texts[key]) el.textContent = texts[key];
  });
  const titleMap = {
    resetSettingsBtn: "resetSettingsTitle",
    uiLangSelect: "uiLangSelectTitle",
  };
  Object.entries(titleMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el && texts[key]) el.title = texts[key];
  });
  window.alertTexts = {
    invalidFormat: texts.alertInvalidFormat || "Enter time in HH:MM format",
    invalidPhrase:
      texts.alertInvalidPhrase ||
      "Invalid time or unable to generate Dutch phrase.",
  };
  window.btnStates = {
    start: texts.btnStart || "Start",
    stop: texts.btnStop || "Stop",
    cont: texts.btnContinue || "Continue",
  };
  setBtnText(startPauseBtnEl, window.btnStates.start || "Start");
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
          alert(window.alertTexts?.invalidFormat);
          return;
        }
        const phrase = getDutchTimeString(timeStr);
        if (!phrase) {
          alert(window.alertTexts?.invalidPhrase);
          return;
        }
        const rate = parseFloat(
          speedSelectEl?.value || DEFAULT_SETTINGS_ACTIVE.speed
        );
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
      setBtnText(startPauseBtnEl, window.btnStates?.cont || "Continue");
      toggleControls(true);
      if (resetBtnEl) resetBtnEl.disabled = false;
      return;
    }
    if (isSequenceMode && isPaused) {
      isPaused = false;
      speakAllTimesSequentially(sequenceIndex || 0);
      setBtnText(startPauseBtnEl, window.btnStates?.stop || "Stop");
      toggleControls(false);
      if (resetBtnEl) resetBtnEl.disabled = true;
      return;
    }
    sequenceIndex = 0;
    speakAllTimesSequentially(0);
    setBtnText(startPauseBtnEl, window.btnStates?.stop || "Stop");
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
if (uiLangSelectEl)
  uiLangSelectEl.addEventListener("change", (e) => {
    translateUI(e.target.value);
    saveSettings(readSettingsFromUI());
  });
if (resetSettingsBtnEl)
  resetSettingsBtnEl.addEventListener("click", () => {
    const defaults = mergeSettingsWithDefaults({}, DEFAULT_SETTINGS_ACTIVE);
    applySettingsToUI(defaults);
    saveSettings(defaults);
  });

// ==================== INIT ====================
function applySettingsToUI(s) {
  if (speedSelectEl && s.speed) speedSelectEl.value = s.speed;
  if (delaySelectEl && s.delay) delaySelectEl.value = s.delay;
  if (uiLangSelectEl && s.uiLang) uiLangSelectEl.value = s.uiLang;
  translateUI(s.uiLang || DEFAULT_SETTINGS_ACTIVE.uiLang);
}
document.addEventListener("DOMContentLoaded", async () => {
  try {
    APP_CONFIG = await loadExternalConfig();
    DEFAULT_SETTINGS_ACTIVE = selectPlatformDefaults(
      APP_CONFIG.DEFAULT_SETTINGS || Config.DEFAULT_CONFIG.DEFAULT_SETTINGS
    );
    currentSettings = loadSettingsFromLocal();
    applySettingsToUI(currentSettings);
    if (developerBlockEl)
      developerBlockEl.style.display = APP_CONFIG.DEVELOPER_MODE ? "" : "none";
    if (fillRandomBtnEl) fillRandomBtnEl.click();
  } catch (e) {
    console.error("init error", e);
  }
});
