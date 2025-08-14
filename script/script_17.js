// ==================== CONFIG ====================
const Config = {
  PATHS: { CONFIG: "script/config.json" },
  DEFAULT_CONFIG: Object.freeze({
    DEVELOPER_MODE: false,
    USE_LOCAL_STORAGE: true,
    DEFAULT_VOICE: "Google Nederlands",
    DEFAULT_SETTINGS: {
      mobile: {
        uiLang: "en",
        delay: "2000",
        speed: "1.0",
        fullscreen: "0",
        languageCode: "nl-NL",
        voiceName: "Google Nederlands",
      },
      desktop: {
        uiLang: "en",
        delay: "2000",
        speed: "1.0",
        fullscreen: "0",
        languageCode: "nl-NL",
        voiceName: "Google Nederlands",
      },
    },
  }),
};

const HARDCODED_FALLBACK = Object.freeze({
  DEVELOPER_MODE: true,
  USE_LOCAL_STORAGE: true,
  DEFAULT_VOICE: "Google Nederlands",
  uiLang: "en",
  delay: "1000",
  speed: "1.0",
  fullscreen: "0",
  languageCode: "nl-NL",
  voiceName: "Google Nederlands",
});

const ALLOWED_LANGS = ["de", "en", "fr", "nl", "pl", "pt", "ru", "tr", "uk"];

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
function parseTimeInput(input) {
  if (!input || typeof input !== "string") return null;
  const m = input.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = String(parseInt(m[1], 10));
  const min = m[2].padStart(2, "0");
  return `${h}:${min}`;
}
function generateRandomTimeString() {
  const h = Math.floor(Math.random() * 24);
  const m = Math.floor(Math.random() * 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}
function deepMerge(defaultObj, srcObj) {
  if (!srcObj) return JSON.parse(JSON.stringify(defaultObj || {}));
  if (!defaultObj) return JSON.parse(JSON.stringify(srcObj || {}));
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
  const platform = isMobile
    ? (defs && defs.mobile) || {}
    : (defs && defs.desktop) || {};
  return deepMerge(
    Config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop || {},
    platform
  );
}
function hasSelectOption(selectEl, value) {
  if (!selectEl || !selectEl.options) return false;
  const v = value === undefined || value === null ? "" : String(value);
  for (let i = 0; i < selectEl.options.length; i++) {
    if (String(selectEl.options[i].value) === v) return true;
  }
  return false;
}
function validateDefaultSettings(defs) {
  const out = {};

  // uiLang
  if (
    defs &&
    typeof defs.uiLang === "string" &&
    ALLOWED_LANGS.includes(defs.uiLang) &&
    hasSelectOption(uiLangSelectEl, defs.uiLang)
  ) {
    out.uiLang = defs.uiLang;
  } else if (
    Config.DEFAULT_CONFIG &&
    Config.DEFAULT_CONFIG.DEFAULT_SETTINGS &&
    Config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop &&
    ALLOWED_LANGS.includes(
      Config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.uiLang
    ) &&
    hasSelectOption(
      uiLangSelectEl,
      Config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.uiLang
    )
  ) {
    out.uiLang = Config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.uiLang;
  } else {
    out.uiLang = HARDCODED_FALLBACK.uiLang;
  }

  // delay
  const tryDelay = (() => {
    if (!defs) return null;
    const v = defs.delay;
    const n = parseInt(v, 10);
    if (
      !isNaN(n) &&
      n >= 100 &&
      n <= 60000 &&
      hasSelectOption(delaySelectEl, String(n))
    )
      return String(n);
    return null;
  })();
  if (tryDelay) out.delay = tryDelay;
  else if (
    hasSelectOption(
      delaySelectEl,
      String(Config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.delay)
    )
  )
    out.delay = String(Config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.delay);
  else out.delay = HARDCODED_FALLBACK.delay;

  // speed
  const trySpeed = (() => {
    if (!defs) return null;
    const v = defs.speed;
    const n = parseFloat(v);
    if (
      !isNaN(n) &&
      n >= 0.5 &&
      n <= 3.0 &&
      hasSelectOption(speedSelectEl, String(v))
    )
      return String(v);
    return null;
  })();
  if (trySpeed) out.speed = trySpeed;
  else if (
    hasSelectOption(
      speedSelectEl,
      String(Config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.speed)
    )
  )
    out.speed = String(Config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.speed);
  else out.speed = HARDCODED_FALLBACK.speed;

  // fullscreen
  if (
    defs &&
    (defs.fullscreen === "0" ||
      defs.fullscreen === "1" ||
      defs.fullscreen === 0 ||
      defs.fullscreen === 1)
  ) {
    out.fullscreen = String(defs.fullscreen);
  } else if (
    Config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.fullscreen !== undefined
  ) {
    out.fullscreen = String(
      Config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.fullscreen
    );
  } else {
    out.fullscreen = HARDCODED_FALLBACK.fullscreen;
  }

  // languageCode
  if (defs && defs.languageCode) out.languageCode = String(defs.languageCode);
  else if (Config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.languageCode)
    out.languageCode = String(
      Config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.languageCode
    );
  else out.languageCode = HARDCODED_FALLBACK.languageCode;

  // voiceName
  if (defs && defs.voiceName) out.voiceName = String(defs.voiceName);
  else if (Config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.voiceName)
    out.voiceName = String(
      Config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.voiceName
    );
  else out.voiceName = HARDCODED_FALLBACK.voiceName;

  return out;
}
function mergeSettingsWithDefaults(stored, defaults) {
  const out = {};

  out.uiLang =
    stored &&
    typeof stored.uiLang === "string" &&
    ALLOWED_LANGS.includes(stored.uiLang) &&
    hasSelectOption(uiLangSelectEl, stored.uiLang)
      ? stored.uiLang
      : (defaults && defaults.uiLang) || HARDCODED_FALLBACK.uiLang;

  out.delay = (() => {
    const v = stored && stored.delay !== undefined ? stored.delay : undefined;
    const n = parseInt(v, 10);
    if (!isNaN(n) && hasSelectOption(delaySelectEl, String(n)))
      return String(n);
    if (defaults && defaults.delay) return String(defaults.delay);
    return HARDCODED_FALLBACK.delay;
  })();

  out.speed = (() => {
    const v = stored && stored.speed !== undefined ? stored.speed : undefined;
    const n = parseFloat(v);
    if (!isNaN(n) && hasSelectOption(speedSelectEl, String(v)))
      return String(v);
    if (defaults && defaults.speed) return String(defaults.speed);
    return HARDCODED_FALLBACK.speed;
  })();

  out.fullscreen =
    stored &&
    (stored.fullscreen === "0" ||
      stored.fullscreen === "1" ||
      stored.fullscreen === 0 ||
      stored.fullscreen === 1)
      ? String(stored.fullscreen)
      : (defaults && defaults.fullscreen) || HARDCODED_FALLBACK.fullscreen;

  out.languageCode =
    stored && stored.languageCode
      ? String(stored.languageCode)
      : (defaults && defaults.languageCode) || HARDCODED_FALLBACK.languageCode;

  out.voiceName =
    stored && stored.voiceName
      ? String(stored.voiceName)
      : (defaults && defaults.voiceName) || HARDCODED_FALLBACK.voiceName;

  return out;
}
function saveSettings(s) {
  const toSave = mergeSettingsWithDefaults(
    s || {},
    DEFAULT_SETTINGS_ACTIVE || {}
  );
  currentSettings = toSave;
  const useLocal =
    APP_CONFIG && APP_CONFIG.USE_LOCAL_STORAGE !== undefined
      ? APP_CONFIG.USE_LOCAL_STORAGE
      : Config.DEFAULT_CONFIG.USE_LOCAL_STORAGE;
  if (useLocal && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));
    } catch (e) {
      // ignore
    }
  }
}
function loadSettingsFromLocal() {
  const useLocal =
    APP_CONFIG && APP_CONFIG.USE_LOCAL_STORAGE !== undefined
      ? APP_CONFIG.USE_LOCAL_STORAGE
      : Config.DEFAULT_CONFIG.USE_LOCAL_STORAGE;
  if (useLocal && typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const merged = mergeSettingsWithDefaults(
          parsed || {},
          DEFAULT_SETTINGS_ACTIVE || {}
        );
        return { raw: parsed || {}, merged };
      }
    } catch (e) {
      // ignore
    }
  }
  return {
    raw: {},
    merged: mergeSettingsWithDefaults({}, DEFAULT_SETTINGS_ACTIVE || {}),
  };
}
function readSettingsFromUI() {
  const base = {};
  if (uiLangSelectEl) base.uiLang = uiLangSelectEl.value;
  if (speedSelectEl) base.speed = speedSelectEl.value;
  if (delaySelectEl) base.delay = delaySelectEl.value;
  return mergeSettingsWithDefaults(base, DEFAULT_SETTINGS_ACTIVE || {});
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
  setBtnText(
    startPauseBtnEl,
    window.btnStates && window.btnStates.start
      ? window.btnStates.start
      : "Start"
  );
  disableSpeakButtons(false);
  toggleControls(true);
}

// ==================== SPEECH ====================
function speakText(text, onEnd = null, rate = 1.0, button = null) {
  if (!text) return;
  if (!("speechSynthesis" in window)) {
    console.warn("speechSynthesis not supported");
    if (typeof onEnd === "function") onEnd();
    return;
  }
  if (isSpeaking) window.speechSynthesis.cancel();
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
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error("speak failed", e);
    isSpeaking = false;
    if (typeof onEnd === "function") onEnd();
  }
}
function stopAll() {
  if ("speechSynthesis" in window && window.speechSynthesis.speaking)
    window.speechSynthesis.cancel();
  isSpeaking = false;
  clearSequenceTimeout();
  updateButtonIcon(currentSpeakButton);
}
function speakAllTimesSequentially(index = 0) {
  clearSequenceTimeout();
  const inputs = Array.from(blockExercisesInputEls || []);
  const rate = parseFloat(
    speedSelectEl && speedSelectEl.value
      ? speedSelectEl.value
      : (DEFAULT_SETTINGS_ACTIVE && DEFAULT_SETTINGS_ACTIVE.speed) ||
          HARDCODED_FALLBACK.speed
  );
  const delayMs =
    parseInt(
      delaySelectEl && delaySelectEl.value
        ? delaySelectEl.value
        : (DEFAULT_SETTINGS_ACTIVE && DEFAULT_SETTINGS_ACTIVE.delay) ||
            HARDCODED_FALLBACK.delay,
      10
    ) || 1000;
  if (index === 0) disableSpeakButtons(true);
  if (index >= inputs.length) {
    isSpeaking = false;
    isSequenceMode = false;
    isPaused = false;
    setActiveInput(-1);
    disableSpeakButtons(false);
    toggleControls(true);
    if (resetBtnEl) resetBtnEl.disabled = false;
    setBtnText(
      startPauseBtnEl,
      window.btnStates && window.btnStates.start
        ? window.btnStates.start
        : "Start"
    );
    return;
  }
  sequenceIndex = index;
  const input = inputs[index];
  const raw = input && input.value ? input.value.trim() : "";
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
  const texts = window.embeddedUITexts && window.embeddedUITexts[lang];
  console.log("texts", texts.fillRandomBtnTitle);
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
    startPauseBtn: "startPauseBtnTitle",
    resetBtn: "resetBtnTitle",
    randomBtn: "randomBtnTitle",
    fillRandomBtn: "fillRandomBtnTitle",
  };
  document.querySelectorAll(".speak-btn").forEach((btn) => {
    btn.title = texts.speakBtnTitle || "";
  });
  document.querySelectorAll(".random-btn").forEach((btn) => {
    btn.title = texts.randomBtnTitle || "";
  });

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

// ==================== APPLY SETTINGS TO UI ====================
function applySettingsToUI(s, opts = {}) {
  const preferBlankForInvalid = opts.preferBlankForInvalid !== false;
  const raw = opts.raw || {};

  // uiLang
  const uiLangCandidate = raw.uiLang !== undefined ? raw.uiLang : s.uiLang;
  if (
    uiLangCandidate !== undefined &&
    uiLangCandidate !== null &&
    hasSelectOption(uiLangSelectEl, uiLangCandidate)
  ) {
    uiLangSelectEl.value = String(uiLangCandidate);
  } else if (uiLangCandidate !== undefined && preferBlankForInvalid) {
    if (uiLangSelectEl) {
      try {
        uiLangSelectEl.value = "";
      } catch (e) {}
      uiLangSelectEl.selectedIndex = -1;
    }
  } else if (s && s.uiLang && hasSelectOption(uiLangSelectEl, s.uiLang)) {
    uiLangSelectEl.value = String(s.uiLang);
  } else {
    if (uiLangSelectEl) {
      try {
        uiLangSelectEl.value = "";
      } catch (e) {}
      uiLangSelectEl.selectedIndex = -1;
    }
  }

  // speed
  const speedCandidate = raw.speed !== undefined ? raw.speed : s.speed;
  if (
    speedCandidate !== undefined &&
    speedCandidate !== null &&
    hasSelectOption(speedSelectEl, speedCandidate)
  ) {
    speedSelectEl.value = String(speedCandidate);
  } else if (speedCandidate !== undefined && preferBlankForInvalid) {
    if (speedSelectEl) {
      try {
        speedSelectEl.value = "";
      } catch (e) {}
      speedSelectEl.selectedIndex = -1;
    }
  } else if (s && s.speed && hasSelectOption(speedSelectEl, s.speed)) {
    speedSelectEl.value = String(s.speed);
  } else {
    if (speedSelectEl) {
      try {
        speedSelectEl.value = "";
      } catch (e) {}
      speedSelectEl.selectedIndex = -1;
    }
  }

  // delay
  const delayCandidate = raw.delay !== undefined ? raw.delay : s.delay;
  if (
    delayCandidate !== undefined &&
    delayCandidate !== null &&
    hasSelectOption(delaySelectEl, delayCandidate)
  ) {
    delaySelectEl.value = String(delayCandidate);
  } else if (delayCandidate !== undefined && preferBlankForInvalid) {
    if (delaySelectEl) {
      try {
        delaySelectEl.value = "";
      } catch (e) {}
      delaySelectEl.selectedIndex = -1;
    }
  } else if (s && s.delay && hasSelectOption(delaySelectEl, s.delay)) {
    delaySelectEl.value = String(s.delay);
  } else {
    if (delaySelectEl) {
      try {
        delaySelectEl.value = "";
      } catch (e) {}
      delaySelectEl.selectedIndex = -1;
    }
  }

  // translate UI using the best available language
  const effectiveLang =
    (uiLangSelectEl && uiLangSelectEl.value) ||
    (s && s.uiLang) ||
    (DEFAULT_SETTINGS_ACTIVE && DEFAULT_SETTINGS_ACTIVE.uiLang) ||
    HARDCODED_FALLBACK.uiLang;
  translateUI(effectiveLang);
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
        const raw = input && input.value ? input.value.trim() : "";
        const timeStr = parseTimeInput(raw);
        if (!timeStr) {
          alert(
            window.alertTexts && window.alertTexts.invalidFormat
              ? window.alertTexts.invalidFormat
              : "Enter time in HH:MM format"
          );
          return;
        }
        const phrase = getDutchTimeString(timeStr);
        if (!phrase) {
          alert(
            window.alertTexts && window.alertTexts.invalidPhrase
              ? window.alertTexts.invalidPhrase
              : "Invalid time or unable to generate Dutch phrase."
          );
          return;
        }
        const rate = parseFloat(
          speedSelectEl && speedSelectEl.value
            ? speedSelectEl.value
            : (DEFAULT_SETTINGS_ACTIVE && DEFAULT_SETTINGS_ACTIVE.speed) ||
                HARDCODED_FALLBACK.speed
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
      setBtnText(
        startPauseBtnEl,
        window.btnStates && window.btnStates.cont
          ? window.btnStates.cont
          : "Continue"
      );
      toggleControls(true);
      if (resetBtnEl) resetBtnEl.disabled = false;
      return;
    }
    if (isSequenceMode && isPaused) {
      isPaused = false;
      speakAllTimesSequentially(sequenceIndex || 0);
      setBtnText(
        startPauseBtnEl,
        window.btnStates && window.btnStates.stop
          ? window.btnStates.stop
          : "Stop"
      );
      toggleControls(false);
      if (resetBtnEl) resetBtnEl.disabled = true;
      return;
    }
    sequenceIndex = 0;
    speakAllTimesSequentially(0);
    setBtnText(
      startPauseBtnEl,
      window.btnStates && window.btnStates.stop ? window.btnStates.stop : "Stop"
    );
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
  resetSettingsBtnEl.addEventListener("click", async () => {
    try {
      const extConfig = await loadExternalConfig();
      const extDefs = selectPlatformDefaults(
        extConfig && extConfig.DEFAULT_SETTINGS
          ? extConfig.DEFAULT_SETTINGS
          : Config.DEFAULT_CONFIG.DEFAULT_SETTINGS
      );
      const validated = validateDefaultSettings(extDefs);
      DEFAULT_SETTINGS_ACTIVE = validated;
      applySettingsToUI(validated, { preferBlankForInvalid: false });
      saveSettings(validated);
    } catch (e) {
      const fallback = validateDefaultSettings(
        Config.DEFAULT_CONFIG.DEFAULT_SETTINGS &&
          Config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop
          ? Config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop
          : {}
      );
      DEFAULT_SETTINGS_ACTIVE = fallback;
      applySettingsToUI(fallback, { preferBlankForInvalid: false });
      saveSettings(fallback);
    }
  });

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", async () => {
  try {
    APP_CONFIG = await loadExternalConfig();

    const platformDefaults = selectPlatformDefaults(
      APP_CONFIG && APP_CONFIG.DEFAULT_SETTINGS
        ? APP_CONFIG.DEFAULT_SETTINGS
        : Config.DEFAULT_CONFIG.DEFAULT_SETTINGS
    );
    const validatedDefaults = validateDefaultSettings(platformDefaults);
    DEFAULT_SETTINGS_ACTIVE = validatedDefaults;

    const stored = loadSettingsFromLocal();
    currentSettings = stored.merged;

    applySettingsToUI(stored.merged, {
      raw: stored.raw,
      preferBlankForInvalid: true,
    });

    // Сохраняем в localStorage, если там пусто
    const useLocal =
      typeof APP_CONFIG.USE_LOCAL_STORAGE === "boolean"
        ? APP_CONFIG.USE_LOCAL_STORAGE
        : typeof Config.DEFAULT_CONFIG.USE_LOCAL_STORAGE === "boolean"
        ? Config.DEFAULT_CONFIG.USE_LOCAL_STORAGE
        : HARDCODED_FALLBACK.USE_LOCAL_STORAGE;

    if (useLocal && typeof localStorage !== "undefined") {
      if (!localStorage.getItem(SETTINGS_KEY)) {
        saveSettings(currentSettings);
      }
    }

    if (developerBlockEl) {
      const devMode =
        typeof APP_CONFIG.DEVELOPER_MODE === "boolean"
          ? APP_CONFIG.DEVELOPER_MODE
          : typeof Config.DEFAULT_CONFIG.DEVELOPER_MODE === "boolean"
          ? Config.DEFAULT_CONFIG.DEVELOPER_MODE
          : HARDCODED_FALLBACK.DEVELOPER_MODE;
      developerBlockEl.style.display = devMode ? "" : "none";
    }

    if (fillRandomBtnEl) fillRandomBtnEl.click();
  } catch (e) {
    console.error("init error", e);
  }
});
