// EventTypes — list of event names used for decoupled module communication
const EventTypes = Object.freeze({
  APP_INIT: "APP_INIT",
  CONFIG_LOADED: "CONFIG_LOADED",
  SETTINGS_APPLY_TO_UI: "SETTINGS_APPLY_TO_UI",
  SETTINGS_SAVE: "SETTINGS_SAVE",
  SETTINGS_RESET_TO_DEFAULTS: "SETTINGS_RESET_TO_DEFAULTS",
  UI_TRANSLATE: "UI_TRANSLATE",
  UI_RANDOM_FILL_ALL: "UI_RANDOM_FILL_ALL",
  UI_RANDOM_FILL_ONE: "UI_RANDOM_FILL_ONE",
  UI_SPEAK_SINGLE: "UI_SPEAK_SINGLE",
  PLAYBACK_START: "PLAYBACK_START",
  PLAYBACK_TOGGLE: "PLAYBACK_TOGGLE",
  PLAYBACK_CONTINUE: "PLAYBACK_CONTINUE",
  PLAYBACK_STOP: "PLAYBACK_STOP",
  PLAYBACK_STEP_DONE: "PLAYBACK_STEP_DONE",
  PLAYBACK_FINISHED: "PLAYBACK_FINISHED",
  SPEECH_START: "SPEECH_START",
  SPEECH_END: "SPEECH_END",
  SPEECH_STOP_ALL: "SPEECH_STOP_ALL",
});

// EventBus — tiny pub/sub for modules
function createEventBus() {
  const map = new Map();
  return {
    on(ev, fn) {
      if (!map.has(ev)) map.set(ev, new Set());
      map.get(ev).add(fn);
      return () => map.get(ev)?.delete(fn);
    },
    off(ev, fn) {
      map.get(ev)?.delete(fn);
    },
    emit(ev, payload) {
      const subs = [...(map.get(ev) || [])];
      for (const s of subs) {
        try {
          s(payload);
        } catch (e) {}
      }
    },
  };
}

// Utils — helpers: deep merge, time parsing, random generator, Dutch time formatter
const Utils = (function () {
  const ALLOWED_LANGS = [
    "ar",
    "de",
    "en",
    "fr",
    "nl",
    "pl",
    "pt",
    "ru",
    "tr",
    "uk",
  ];
  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
  function deepMerge(a, b) {
    if (!b) return JSON.parse(JSON.stringify(a || {}));
    if (!a) return JSON.parse(JSON.stringify(b || {}));
    const out = Array.isArray(a) ? [] : {};
    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    keys.forEach((k) => {
      const d = a ? a[k] : undefined,
        s = b ? b[k] : undefined;
      if (
        d &&
        typeof d === "object" &&
        !Array.isArray(d) &&
        s &&
        typeof s === "object" &&
        !Array.isArray(s)
      )
        out[k] = deepMerge(d, s);
      else if (s === undefined) out[k] = JSON.parse(JSON.stringify(d));
      else out[k] = s;
    });
    return out;
  }
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
    // const m = Math.floor(Math.random() * 60);
    const m = Math.floor(Math.random() * 12) * 5;
    return `${h}:${String(m).padStart(2, "0")}`;
  }
  function getDutchTimeString(timeStr) {
    if (!timeStr) return "";
    const parts = timeStr.split(":");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return "";
    return getDutchTimeStringFromDigits(h, m);
  }
  function getDutchTimeStringFromDigits(hours, minutes) {
    if (typeof dutchVocab === "undefined")
      return `${hours}:${String(minutes).padStart(2, "0")}`;
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
      return `${minuteNames[minutes] || minutes} over ${
        hourNames[idx] || hours
      }`;
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
  return {
    ALLOWED_LANGS,
    deepMerge,
    parseTimeInput,
    generateRandomTimeString,
    getDutchTimeString,
    capitalize,
  };
})();

// Config — load external config.json and select platform defaults
function createConfig() {
  const PATHS = {
    CONFIG: "./assets/configs/config.json",
    UI_TEXTS_DIR: "./assets/locales",
  };
  const DEFAULT_CONFIG = Object.freeze({
    DEVELOPER_MODE: false,
    USE_LOCAL_STORAGE: true,
    DEFAULT_VOICE: "Google Nederlands",
    DEFAULT_SETTINGS: {
      shared: {
        uiLang: "en",
        delay: "2000",
        speed: "1.0",
        fullscreen: "0",
        languageCode: "nl-NL",
        voiceName: "Google Nederlands",
      },
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
  });
  const FALLBACK = Object.freeze({
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
  async function loadExternal() {
    try {
      const resp = await fetch(PATHS.CONFIG, { cache: "no-store" });
      if (!resp.ok) return Utils.deepMerge(DEFAULT_CONFIG, {});
      const j = await resp.json();
      return Utils.deepMerge(DEFAULT_CONFIG, j);
    } catch (e) {
      return Utils.deepMerge(DEFAULT_CONFIG, {});
    }
  }
  function selectPlatformDefaults(defs) {
    const isMobile = /Mobi|Android|iPhone|iPad|Windows Phone|IEMobile/i.test(
      navigator.userAgent
    );
    const platform = isMobile
      ? (defs && defs.mobile) || {}
      : (defs && defs.desktop) || {};
    return Utils.deepMerge(
      DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop || {},
      platform
    );
  }
  return {
    PATHS,
    DEFAULT_CONFIG,
    FALLBACK,
    loadExternal,
    selectPlatformDefaults,
  };
}

// Language loader
//loadLang(code) => Promise<object|null>
//loadAll() => Promise<texts>
//getTexts(lang) => object
function createLangLoader({ config }) {
  const PATH = config.PATHS.UI_TEXTS_DIR || "./assets/locales";
  let texts = {};
  const FALLBACK_EN = {
    uiLangLabel: "Interface",
    startPauseBtn: "Start",
    resetBtn: "Reset",
    fillRandomBtn: "🎲 Rnd",
    labelSpeed: "Speed",
    labelDelay: "Delay (ms)",
    resetSettingsTitle: "Reset to default",
    uiLangSelectTitle: "Select language",
    startPauseBtnTitle: "Start / Continue / Pause",
    resetBtnTitle: "Reset sequence",
    randomBtnTitle: "Random time",
    fillRandomBtnTitle: "Random fill all",
    speakBtnTitle: "Speak",
    alertInvalidFormat: "Enter time in HH:MM format",
    alertInvalidPhrase: "Invalid time or unable to generate Dutch phrase.",
    btnStart: "Start",
    btnStop: "Stop",
    btnContinue: "Continue",
  };
  async function loadLang(code) {
    try {
      const res = await fetch(`${PATH}/${code}.json`, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json || typeof json !== "object") throw new Error("Bad JSON");
      return json;
    } catch (e) {
      console.warn(`UI texts load failed for ${code}:`, e);
      return null;
    }
  }
  async function loadAll() {
    texts = {};
    const langs = config.ALLOWED_LANGS || [
      "de",
      "en",
      "fr",
      "nl",
      "pl",
      "pt",
      "ru",
      "tr",
      "uk",
    ];
    await Promise.all(
      langs.map(async (code) => {
        const data = await loadLang(code);
        if (data) texts[code] = data;
      })
    );
    if (!texts.en) {
      texts.en = FALLBACK_EN;
      console.warn("EN fallback injected.");
    }
    return texts;
  }
  const getTexts = (lang) => texts[lang] || texts.en || FALLBACK_EN;
  return { loadLang, loadAll, getTexts };
}

// Store — persistent settings + runtime playback flags
function createStore({ bus, config }) {
  const SETTINGS_KEY = "CLT_settings";
  let appConfig = {},
    defaultActive = {},
    currentSettings = {};
  let isSpeaking = false,
    isSequenceMode = false,
    isPaused = false,
    sequenceIndex = 0,
    sequenceTimeoutId = null,
    currentSpeakButton = null,
    utterance = null;
  function setAppConfig(c) {
    appConfig = c;
  }
  function setDefaultActive(d) {
    defaultActive = d;
  }
  function getDefaultActive() {
    return defaultActive;
  }
  function setSettings(s) {
    currentSettings = s;
  }
  function getSettings() {
    return currentSettings;
  }
  function getAppConfig() {
    return appConfig;
  }
  function allowed(selectEl, value) {
    if (!selectEl || !selectEl.options) return false;
    const v = value == null ? "" : String(value);
    for (let i = 0; i < selectEl.options.length; i++) {
      if (String(selectEl.options[i].value) === v) return true;
    }
    return false;
  }
  function validateDefaults(defs, els) {
    const { uiLangSelectEl, delaySelectEl, speedSelectEl } = els;
    const out = {};
    if (
      defs &&
      typeof defs.uiLang === "string" &&
      Utils.ALLOWED_LANGS.includes(defs.uiLang) &&
      allowed(uiLangSelectEl, defs.uiLang)
    )
      out.uiLang = defs.uiLang;
    else if (
      config.DEFAULT_CONFIG?.DEFAULT_SETTINGS?.desktop?.uiLang &&
      Utils.ALLOWED_LANGS.includes(
        config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.uiLang
      ) &&
      allowed(
        uiLangSelectEl,
        config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.uiLang
      )
    )
      out.uiLang = config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.uiLang;
    else out.uiLang = config.FALLBACK.uiLang;
    const tryDelay = (() => {
      if (!defs) return null;
      const v = defs.delay;
      const n = parseInt(v, 10);
      if (
        !isNaN(n) &&
        n >= 100 &&
        n <= 60000 &&
        allowed(delaySelectEl, String(n))
      )
        return String(n);
      return null;
    })();
    if (tryDelay) out.delay = tryDelay;
    else if (
      allowed(
        delaySelectEl,
        String(config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.delay)
      )
    )
      out.delay = String(config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.delay);
    else out.delay = config.FALLBACK.delay;
    const trySpeed = (() => {
      if (!defs) return null;
      const v = defs.speed;
      const n = parseFloat(v);
      if (
        !isNaN(n) &&
        n >= 0.5 &&
        n <= 3.0 &&
        allowed(speedSelectEl, String(v))
      )
        return String(v);
      return null;
    })();
    if (trySpeed) out.speed = trySpeed;
    else if (
      allowed(
        speedSelectEl,
        String(config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.speed)
      )
    )
      out.speed = String(config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.speed);
    else out.speed = config.FALLBACK.speed;
    if (
      defs &&
      (defs.fullscreen === "0" ||
        defs.fullscreen === "1" ||
        defs.fullscreen === 0 ||
        defs.fullscreen === 1)
    )
      out.fullscreen = String(defs.fullscreen);
    else if (
      config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.fullscreen !== undefined
    )
      out.fullscreen = String(
        config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.fullscreen
      );
    else out.fullscreen = config.FALLBACK.fullscreen;
    out.languageCode =
      defs && defs.languageCode
        ? String(defs.languageCode)
        : config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.languageCode
        ? String(config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.languageCode)
        : config.FALLBACK.languageCode;
    out.voiceName =
      defs && defs.voiceName
        ? String(defs.voiceName)
        : config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.voiceName
        ? String(config.DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop.voiceName)
        : config.FALLBACK.voiceName;
    return out;
  }
  function mergeWithDefaults(stored, defaults, els) {
    const { uiLangSelectEl, delaySelectEl, speedSelectEl } = els;
    const out = {};
    out.uiLang =
      stored &&
      typeof stored.uiLang === "string" &&
      Utils.ALLOWED_LANGS.includes(stored.uiLang) &&
      allowed(uiLangSelectEl, stored.uiLang)
        ? stored.uiLang
        : (defaults && defaults.uiLang) || config.FALLBACK.uiLang;
    out.delay = (() => {
      const v = stored && stored.delay !== undefined ? stored.delay : undefined;
      const n = parseInt(v, 10);
      if (!isNaN(n) && allowed(delaySelectEl, String(n))) return String(n);
      if (defaults && defaults.delay) return String(defaults.delay);
      return config.FALLBACK.delay;
    })();
    out.speed = (() => {
      const v = stored && stored.speed !== undefined ? stored.speed : undefined;
      const n = parseFloat(v);
      if (!isNaN(n) && allowed(speedSelectEl, String(v))) return String(v);
      if (defaults && defaults.speed) return String(defaults.speed);
      return config.FALLBACK.speed;
    })();
    out.fullscreen =
      stored &&
      (stored.fullscreen === "0" ||
        stored.fullscreen === "1" ||
        stored.fullscreen === 0 ||
        stored.fullscreen === 1)
        ? String(stored.fullscreen)
        : (defaults && defaults.fullscreen) || config.FALLBACK.fullscreen;
    out.languageCode =
      stored && stored.languageCode
        ? String(stored.languageCode)
        : (defaults && defaults.languageCode) || config.FALLBACK.languageCode;
    out.voiceName =
      stored && stored.voiceName
        ? String(stored.voiceName)
        : (defaults && defaults.voiceName) || config.FALLBACK.voiceName;
    return out;
  }
  function saveSettings(s, els) {
    const toSave = mergeWithDefaults(s || {}, defaultActive || {}, els);
    currentSettings = toSave;
    const useLocal =
      appConfig && appConfig.USE_LOCAL_STORAGE !== undefined
        ? appConfig.USE_LOCAL_STORAGE
        : config.DEFAULT_CONFIG.USE_LOCAL_STORAGE;
    if (useLocal && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));
      } catch (e) {}
    }
    bus.emit(EventTypes.SETTINGS_SAVE, toSave);
  }
  function loadSettingsFromLocal(els) {
    const useLocal =
      appConfig && appConfig.USE_LOCAL_STORAGE !== undefined
        ? appConfig.USE_LOCAL_STORAGE
        : config.DEFAULT_CONFIG.USE_LOCAL_STORAGE;
    if (useLocal && typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const merged = mergeWithDefaults(
            parsed || {},
            defaultActive || {},
            els
          );
          return { raw: parsed || {}, merged };
        }
      } catch (e) {}
    }
    return { raw: {}, merged: mergeWithDefaults({}, defaultActive || {}, els) };
  }
  function playbackFlags() {
    return { isSpeaking, isSequenceMode, isPaused, sequenceIndex };
  }
  function setSpeaking(v) {
    isSpeaking = v;
  }
  function setSequenceMode(v) {
    isSequenceMode = v;
  }
  function setPaused(v) {
    isPaused = v;
  }
  function setSequenceIndex(i) {
    sequenceIndex = i;
  }
  function getSequenceTimeout() {
    return sequenceTimeoutId;
  }
  function setSequenceTimeout(id) {
    sequenceTimeoutId = id;
  }
  function clearSequenceTimeout() {
    if (sequenceTimeoutId) {
      clearTimeout(sequenceTimeoutId);
      sequenceTimeoutId = null;
    }
  }
  function getCurrentSpeakButton() {
    return currentSpeakButton;
  }
  function setCurrentSpeakButton(b) {
    currentSpeakButton = b;
  }
  function getUtterance() {
    return utterance;
  }
  function setUtterance(u) {
    utterance = u;
  }
  function setAppConfig(c) {
    appConfig = c;
  }
  return {
    setAppConfig,
    setDefaultActive,
    getDefaultActive,
    setSettings,
    getSettings,
    getAppConfig,
    validateDefaults,
    saveSettings,
    loadSettingsFromLocal,
    playbackFlags,
    setSpeaking,
    setSequenceMode,
    setPaused,
    setSequenceIndex,
    getSequenceTimeout,
    setSequenceTimeout,
    clearSequenceTimeout,
    getCurrentSpeakButton,
    setCurrentSpeakButton,
    getUtterance,
    setUtterance,
  };
}

// Speaker — wrapper over Web Speech API, emits events via bus
function createSpeaker({ bus, store }) {
  let synth = window.speechSynthesis;
  let currentUtterance = null;

  function speak({ text, rate, lang, button }) {
    stopAll();
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate || 1;
    utterance.lang = lang || "nl-NL";

    store.setUtterance(utterance);
    store.setCurrentSpeakButton(button || null);

    bus.emit(EventTypes.SPEECH_START, { button });

    utterance.onend = () => {
      bus.emit(EventTypes.SPEECH_END, { button });
      store.setUtterance(null);
      store.setCurrentSpeakButton(null);
    };

    currentUtterance = utterance;
    synth.speak(utterance);
  }

  function stopAll() {
    if (synth.speaking || synth.pending) synth.cancel();
    if (currentUtterance) {
      bus.emit(EventTypes.SPEECH_END, {
        button: store.getCurrentSpeakButton(),
      });
    }
    currentUtterance = null;
    store.setUtterance(null);
    store.setCurrentSpeakButton(null);
  }

  return { speak, stopAll };
}

// UI — DOM adapter, encapsulates selectors and exposes methods for other modules
function createUI({ bus, store, config, langLoader }) {
  const PLAY_ICON = "▶️",
    STOP_ICON = "⏹️";
  const els = {
    delaySelectEl: document.getElementById("delaySelect"),
    speedSelectEl: document.getElementById("speedSelect"),
    startPauseBtnEl: document.getElementById("startPauseBtn"),
    resetBtnEl: document.getElementById("resetBtn"),
    resetSettingsBtnEl: document.getElementById("resetSettingsBtn"),
    fillRandomBtnEl: document.getElementById("fillRandomBtn"),
    uiLangSelectEl: document.getElementById("uiLangSelect"),
    blockExercisesInputEls: document.querySelectorAll(
      ".section-block-exercises .time-input"
    ),
    randomBtnEls: document.querySelectorAll(".random-btn"),
    speakBtnEls: document.querySelectorAll(".speak-btn"),
    timeInputEls: document.querySelectorAll(".time-input"),
    clockContainerEls: document.querySelectorAll(".clock-container"),
    developerBlockEl: document.getElementById("developer"),
  };
  function disableSpeakButtons(disable) {
    els.speakBtnEls.forEach((b) => {
      if (b) b.disabled = disable;
    });
  }
  function toggleControls(enabled) {
    if (els.speedSelectEl) els.speedSelectEl.disabled = !enabled;
    if (els.delaySelectEl) els.delaySelectEl.disabled = !enabled;
    document
      .querySelectorAll('label[for="speedSelect"],label[for="delaySelect"]')
      .forEach((l) => l.classList.toggle("disabled", !enabled));
  }
  function setActiveInput(index) {
    els.timeInputEls.forEach((inp) => {
      if (inp) inp.classList.remove("highlight");
    });
    els.randomBtnEls.forEach((btn) => {
      if (btn) btn.disabled = false;
    });
    if (index >= 0 && index < els.timeInputEls.length) {
      const inp = els.timeInputEls[index];
      if (!inp) return;
      inp.classList.add("highlight");
      const rnd = inp.parentElement
        ? inp.parentElement.querySelector(".random-btn")
        : null;
      if (rnd) rnd.disabled = true;
    }
  }
  function updateButtonIcon(activeButton = null) {
    const flags = store.playbackFlags();
    els.speakBtnEls.forEach((b) => {
      if (b) b.textContent = PLAY_ICON;
    });
    if (flags.isSpeaking && activeButton) activeButton.textContent = STOP_ICON;
  }
  function setBtnText(btn, text) {
    if (btn) btn.textContent = text;
  }
  function translateUI(lang) {
    const texts =
      typeof langLoader !== "undefined" && langLoader.getTexts
        ? langLoader.getTexts(lang)
        : null;
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
    setBtnText(els.startPauseBtnEl, window.btnStates.start || "Start");
  }
  function applySettingsToUI(
    s,
    { preferBlankForInvalid = true, raw = {} } = {}
  ) {
    const { uiLangSelectEl, speedSelectEl, delaySelectEl } = els;
    const hasOpt = (sel, val) => {
      if (!sel || !sel.options) return false;
      const v = val == null ? "" : String(val);
      for (let i = 0; i < sel.options.length; i++) {
        if (String(sel.options[i].value) === v) return true;
      }
      return false;
    };
    const setOrBlank = (sel, candidate, fallback) => {
      if (
        candidate !== undefined &&
        candidate !== null &&
        hasOpt(sel, candidate)
      )
        sel.value = String(candidate);
      else if (candidate !== undefined && preferBlankForInvalid) {
        try {
          sel.value = "";
        } catch (e) {}
        sel.selectedIndex = -1;
      } else if (fallback !== undefined && hasOpt(sel, fallback))
        sel.value = String(fallback);
      else {
        try {
          sel.value = "";
        } catch (e) {}
        sel.selectedIndex = -1;
      }
    };
    setOrBlank(
      uiLangSelectEl,
      raw.uiLang !== undefined ? raw.uiLang : s.uiLang,
      s.uiLang
    );
    setOrBlank(
      speedSelectEl,
      raw.speed !== undefined ? raw.speed : s.speed,
      s.speed
    );
    setOrBlank(
      delaySelectEl,
      raw.delay !== undefined ? raw.delay : s.delay,
      s.delay
    );
    const effectiveLang =
      (uiLangSelectEl && uiLangSelectEl.value) ||
      s.uiLang ||
      store.getDefaultActive().uiLang ||
      config.FALLBACK.uiLang;
    translateUI(effectiveLang);
  }
  function readSettingsFromUI() {
    const base = {};
    if (els.uiLangSelectEl) base.uiLang = els.uiLangSelectEl.value;
    if (els.speedSelectEl) base.speed = els.speedSelectEl.value;
    if (els.delaySelectEl) base.delay = els.delaySelectEl.value;
    const merged = (function () {
      const allowed = (sel, val) => {
        if (!sel || !sel.options) return false;
        const v = val == null ? "" : String(val);
        for (let i = 0; i < sel.options.length; i++) {
          if (String(sel.options[i].value) === v) return true;
        }
        return false;
      };
      const d = store.getDefaultActive() || {};
      const out = {};
      out.uiLang =
        base.uiLang &&
        Utils.ALLOWED_LANGS.includes(base.uiLang) &&
        allowed(els.uiLangSelectEl, base.uiLang)
          ? base.uiLang
          : d.uiLang || config.FALLBACK.uiLang;
      out.speed =
        base.speed &&
        !isNaN(parseFloat(base.speed)) &&
        allowed(els.speedSelectEl, base.speed)
          ? base.speed
          : d.speed || config.FALLBACK.speed;
      out.delay =
        base.delay &&
        !isNaN(parseInt(base.delay, 10)) &&
        allowed(els.delaySelectEl, base.delay)
          ? base.delay
          : d.delay || config.FALLBACK.delay;
      out.fullscreen = d.fullscreen || config.FALLBACK.fullscreen;
      out.languageCode = d.languageCode || config.FALLBACK.languageCode;
      out.voiceName = d.voiceName || config.FALLBACK.voiceName;
      return out;
    })();
    return merged;
  }
  function setDeveloperVisibility(appCfg) {
    const devMode =
      typeof appCfg.DEVELOPER_MODE === "boolean"
        ? appCfg.DEVELOPER_MODE
        : typeof config.DEFAULT_CONFIG.DEVELOPER_MODE === "boolean"
        ? config.DEFAULT_CONFIG.DEVELOPER_MODE
        : config.FALLBACK.DEVELOPER_MODE;
    if (els.developerBlockEl)
      els.developerBlockEl.style.display = devMode ? "" : "none";
  }
  function updateStartPauseBtnTo(state) {
    if (state === "start")
      setBtnText(
        els.startPauseBtnEl,
        (window.btnStates && window.btnStates.start) || "Start"
      );
    else if (state === "stop")
      setBtnText(
        els.startPauseBtnEl,
        (window.btnStates && window.btnStates.stop) || "Stop"
      );
    else if (state === "cont")
      setBtnText(
        els.startPauseBtnEl,
        (window.btnStates && window.btnStates.cont) || "Continue"
      );
  }
  function bindHandlers() {
    els.clockContainerEls.forEach((group) => {
      const rndBtn = group.querySelector(".random-btn");
      const input = group.querySelector(".time-input");
      const speakBtn = group.querySelector(".speak-btn");
      if (rndBtn && input) {
        rndBtn.addEventListener("click", () => {
          input.value = Utils.generateRandomTimeString();
        });
      }
      if (speakBtn) {
        speakBtn.addEventListener("click", () => {
          const flags = store.playbackFlags();
          if (flags.isSpeaking) {
            bus.emit(EventTypes.SPEECH_STOP_ALL, {});
            return;
          }
          const raw = input && input.value ? input.value.trim() : "";
          const timeStr = Utils.parseTimeInput(raw);
          if (!timeStr) {
            alert(
              (window.alertTexts && window.alertTexts.invalidFormat) ||
                "Enter time in HH:MM format"
            );
            return;
          }
          const phrase = Utils.getDutchTimeString(timeStr);
          if (!phrase) {
            alert(
              (window.alertTexts && window.alertTexts.invalidPhrase) ||
                "Invalid time or unable to generate Dutch phrase."
            );
            return;
          }
          const rate = parseFloat(
            els.speedSelectEl && els.speedSelectEl.value
              ? els.speedSelectEl.value
              : store.getDefaultActive().speed || config.FALLBACK.speed
          );
          bus.emit(EventTypes.UI_SPEAK_SINGLE, {
            phrase,
            rate,
            button: speakBtn,
          });
        });
      }
    });
    if (els.fillRandomBtnEl) {
      els.fillRandomBtnEl.addEventListener("click", () => {
        const flags = store.playbackFlags();
        els.timeInputEls.forEach((inp, idx) => {
          if (flags.isPaused && idx === flags.sequenceIndex) return;
          if (inp) inp.value = Utils.generateRandomTimeString();
        });
      });
    }
    if (els.startPauseBtnEl) {
      els.startPauseBtnEl.addEventListener("click", () => {
        const flags = store.playbackFlags();
        if (flags.isSequenceMode && !flags.isPaused) {
          bus.emit(EventTypes.PLAYBACK_STOP);
          store.setPaused(true);
          updateStartPauseBtnTo("cont");
          toggleControls(true);
          if (els.resetBtnEl) els.resetBtnEl.disabled = false;
          return;
        }
        if (flags.isSequenceMode && flags.isPaused) {
          store.setPaused(false);
          bus.emit(EventTypes.PLAYBACK_CONTINUE, {
            index: store.playbackFlags().sequenceIndex || 0,
          });
          updateStartPauseBtnTo("stop");
          toggleControls(false);
          if (els.resetBtnEl) els.resetBtnEl.disabled = true;
          return;
        }
        store.setSequenceIndex(0);
        bus.emit(EventTypes.PLAYBACK_START, { index: 0 });
        updateStartPauseBtnTo("stop");
        toggleControls(false);
        if (els.resetBtnEl) els.resetBtnEl.disabled = true;
      });
    }
    if (els.resetBtnEl) {
      els.resetBtnEl.addEventListener("click", () => {
        bus.emit(EventTypes.PLAYBACK_RESET, {});
      });
    }
    if (els.speedSelectEl)
      els.speedSelectEl.addEventListener("change", () =>
        bus.emit(EventTypes.SETTINGS_APPLY_TO_UI, { saveFromUI: true })
      );
    if (els.delaySelectEl)
      els.delaySelectEl.addEventListener("change", () =>
        bus.emit(EventTypes.SETTINGS_APPLY_TO_UI, { saveFromUI: true })
      );
    if (els.uiLangSelectEl)
      els.uiLangSelectEl.addEventListener("change", (e) => {
        bus.emit(EventTypes.UI_TRANSLATE, { lang: e.target.value });
        bus.emit(EventTypes.SETTINGS_APPLY_TO_UI, { saveFromUI: true });
      });
    if (els.resetSettingsBtnEl)
      els.resetSettingsBtnEl.addEventListener("click", () =>
        bus.emit(EventTypes.SETTINGS_RESET_TO_DEFAULTS)
      );
    if (els.fillRandomBtnEl) els.fillRandomBtnEl.click();
  }

  return {
    els,
    disableSpeakButtons,
    toggleControls,
    setActiveInput,
    updateButtonIcon,
    setBtnText,
    translateUI,
    applySettingsToUI,
    readSettingsFromUI,
    setDeveloperVisibility,
    updateStartPauseBtnTo,
    bindHandlers,
  };
}

// Playback — sequence engine that speaks inputs sequentially, handles pause/continue/finish
function createPlayback({ bus, store, ui, speaker, config }) {
  function resetSequenceState({ full = true } = {}) {
    speaker.stopAll();
    store.setSpeaking(false);
    store.clearSequenceTimeout();
    store.setCurrentSpeakButton(null);
    store.setUtterance(null);
    ui.updateButtonIcon();
    ui.setActiveInput(-1);
    ui.updateStartPauseBtnTo("start");
    if (full) {
      store.setSequenceMode(false);
      store.setPaused(false);
      store.setSequenceIndex(0);
      ui.disableSpeakButtons(false);
      ui.toggleControls(true);
      if (ui.els.resetBtnEl) ui.els.resetBtnEl.disabled = false;
      if (ui.els.fillRandomBtnEl) ui.els.fillRandomBtnEl.disabled = false;
    }
  }

  function speakSingle({ phrase, rate, button }) {
    ui.disableSpeakButtons(true);
    speaker.speak({
      text: phrase,
      rate,
      lang: store.getSettings().languageCode || "nl-NL",
      button,
    });
  }

  function speakAll(index = 0) {
    store.clearSequenceTimeout();
    const inputs = Array.from(ui.els.blockExercisesInputEls || []);
    const rate = parseFloat(
      (ui.els.speedSelectEl && ui.els.speedSelectEl.value) ||
        store.getDefaultActive().speed ||
        config.FALLBACK.speed
    );
    const delayMs =
      parseInt(
        (ui.els.delaySelectEl && ui.els.delaySelectEl.value) ||
          store.getDefaultActive().delay ||
          config.FALLBACK.delay,
        10
      ) || 1000;

    if (index === 0) {
      ui.disableSpeakButtons(true);
      ui.toggleControls(false);
      if (ui.els.resetBtnEl) ui.els.resetBtnEl.disabled = true;
      if (ui.els.fillRandomBtnEl) ui.els.fillRandomBtnEl.disabled = true;
    }

    if (index >= inputs.length) {
      store.setSpeaking(false);
      store.setSequenceMode(false);
      store.setPaused(false);
      ui.setActiveInput(-1);
      ui.disableSpeakButtons(false);
      ui.toggleControls(true);
      if (ui.els.resetBtnEl) ui.els.resetBtnEl.disabled = false;
      if (ui.els.fillRandomBtnEl) ui.els.fillRandomBtnEl.disabled = false;
      ui.updateStartPauseBtnTo("start");
      bus.emit(EventTypes.PLAYBACK_FINISHED, {});
      return;
    }

    store.setSequenceIndex(index);
    const input = inputs[index];
    const raw = input && input.value ? input.value.trim() : "";
    if (!raw) {
      speakAll(index + 1);
      return;
    }

    ui.setActiveInput(index);
    const timeStr = Utils.parseTimeInput(raw);
    const phrase = timeStr ? Utils.getDutchTimeString(timeStr) : raw;

    store.setSpeaking(true);
    store.setSequenceMode(true);
    store.setPaused(false);

    speaker.speak({
      text: phrase,
      rate,
      lang: store.getSettings().languageCode || "nl-NL",
      button: null,
    });

    const onEnded = () => {
      if (store.playbackFlags().isPaused) return;
      const id = setTimeout(() => {
        store.setSequenceTimeout(null);
        speakAll(index + 1);
      }, delayMs);
      store.setSequenceTimeout(id);
    };
    const off = bus.on(EventTypes.SPEECH_END, () => {
      off();
      onEnded();
    });
  }

  function bind() {
    bus.on(EventTypes.UI_SPEAK_SINGLE, (p) => speakSingle(p));
    bus.on(EventTypes.PLAYBACK_START, ({ index }) => speakAll(index || 0));
    bus.on(EventTypes.PLAYBACK_CONTINUE, ({ index }) => {
      if (ui.els.fillRandomBtnEl) ui.els.fillRandomBtnEl.disabled = true;
      speakAll(index || 0);
    });
    bus.on(EventTypes.PLAYBACK_STOP, () => {
      store.setPaused(true);
      store.setSpeaking(false);
      speaker.stopAll();
      ui.updateStartPauseBtnTo("cont");
      if (ui.els.resetBtnEl) ui.els.resetBtnEl.disabled = false;
      if (ui.els.fillRandomBtnEl) ui.els.fillRandomBtnEl.disabled = false;
    });
    bus.on(EventTypes.PLAYBACK_RESET, () => resetSequenceState({ full: true }));
    bus.on(EventTypes.SPEECH_STOP_ALL, () => speaker.stopAll());

    bus.on(EventTypes.SPEECH_START, ({ button }) => {
      ui.updateButtonIcon(button || store.getCurrentSpeakButton());
    });

    bus.on(EventTypes.SPEECH_END, ({ button }) => {
      const flags = store.playbackFlags();
      ui.updateButtonIcon(button || store.getCurrentSpeakButton());
      if (!flags.isSequenceMode) {
        ui.disableSpeakButtons(false);
        if (button) button.disabled = false;
      }
    });
  }

  bind();
  return { resetSequenceState };
}

// App — orchestrates boot, loads config, applies defaults, restores settings, initializes UI and modules
(function App() {
  const bus = createEventBus();
  const config = createConfig();
  const store = createStore({ bus, config });
  const langLoader = createLangLoader({ config });
  const ui = createUI({ bus, store, config, langLoader });
  const speaker = createSpeaker({ bus, store });
  const playback = createPlayback({ bus, store, ui, speaker, config });

  function applySettings({ raw, merged, preferBlankForInvalid }) {
    ui.applySettingsToUI(merged, { raw, preferBlankForInvalid });
    store.setSettings(merged);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    bus.emit(EventTypes.APP_INIT, {});
    const appCfg = await config.loadExternal();
    store.setAppConfig(appCfg);
    const platformDefaults = config.selectPlatformDefaults(
      appCfg && appCfg.DEFAULT_SETTINGS
        ? appCfg.DEFAULT_SETTINGS
        : config.DEFAULT_CONFIG.DEFAULT_SETTINGS
    );
    const validated = store.validateDefaults(platformDefaults, ui.els);
    store.setDefaultActive(validated);
    const stored = store.loadSettingsFromLocal(ui.els);
    store.setSettings(stored.merged);
    applySettings({
      raw: stored.raw,
      merged: stored.merged,
      preferBlankForInvalid: true,
    });
    const useLocal =
      typeof appCfg.USE_LOCAL_STORAGE === "boolean"
        ? appCfg.USE_LOCAL_STORAGE
        : typeof config.DEFAULT_CONFIG.USE_LOCAL_STORAGE === "boolean"
        ? config.DEFAULT_CONFIG.USE_LOCAL_STORAGE
        : config.FALLBACK.USE_LOCAL_STORAGE;
    if (useLocal && typeof localStorage !== "undefined") {
      if (!localStorage.getItem("CLT_settings"))
        store.saveSettings(store.getSettings(), ui.els);
    }
    ui.setDeveloperVisibility(appCfg);
    await langLoader.loadAll();
    const lang = store.getSettings().uiLang || config.FALLBACK.uiLang || "en";
    ui.translateUI(lang);
    ui.bindHandlers && ui.bindHandlers();
    if (ui.els.fillRandomBtnEl) ui.els.fillRandomBtnEl.click();
  });

  bus.on(EventTypes.SETTINGS_APPLY_TO_UI, ({ saveFromUI }) => {
    if (saveFromUI) {
      const merged = ui.readSettingsFromUI();
      store.saveSettings(merged, ui.els);
      applySettings({
        raw: {},
        merged: store.getSettings(),
        preferBlankForInvalid: false,
      });
    } else
      applySettings({
        raw: {},
        merged: store.getSettings(),
        preferBlankForInvalid: false,
      });
  });

  bus.on(EventTypes.UI_TRANSLATE, ({ lang }) => {
    ui.translateUI(lang);
  });

  bus.on(EventTypes.SETTINGS_RESET_TO_DEFAULTS, async () => {
    try {
      const ext = await config.loadExternal();
      const extDefs = config.selectPlatformDefaults(
        ext && ext.DEFAULT_SETTINGS
          ? ext.DEFAULT_SETTINGS
          : config.DEFAULT_CONFIG.DEFAULT_SETTINGS
      );
      const validated = store.validateDefaults(extDefs, ui.els);
      store.setDefaultActive(validated);
      ui.applySettingsToUI(validated, { preferBlankForInvalid: false });
      store.saveSettings(validated, ui.els);
    } catch (e) {
      const fallback = store.validateDefaults(
        config.DEFAULT_CONFIG.DEFAULT_SETTINGS?.desktop || {},
        ui.els
      );
      store.setDefaultActive(fallback);
      ui.applySettingsToUI(fallback, { preferBlankForInvalid: false });
      store.saveSettings(fallback, ui.els);
    }
  });
})();
