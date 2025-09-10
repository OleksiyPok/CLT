"use strict";

const EventTypes = Object.freeze({
  APP_INIT: "app:init",
  APP_STATE: "app:state",
  APP_STATE_SET: "app:state:set",
  CONFIG_LOADED: "app:config:loaded",

  SETTINGS_LOAD: "settings:load",
  SETTINGS_SAVE: "settings:save",
  SETTINGS_APPLY: "settings:apply",
  SETTINGS_RESET: "settings:resetToDefaults",

  UI_TEXTS_UPDATE: "ui:texts:update",
  UI_TRANSLATE: "ui:translate",
  UI_SPEAK_SINGLE: "ui:speak:single",
  UI_SPEAK_GROUP: "ui:speak:group",

  SPEECH_START: "speech:start",
  SPEECH_END: "speech:end",

  VOICES_CHANGED: "voices:changed",
  VOICES_LOADED: "voices:loaded",

  PLAYBACK_START: "playback:start",
  PLAYBACK_PAUSE: "playback:pause",
  PLAYBACK_CONTINUE: "playback:continue",
  PLAYBACK_STOP: "playback:stop",
  PLAYBACK_FINISH: "playback:finish",

  SETTINGS_APPLY_TO_UI: "settings:applyToUI",
  SETTINGS_RESET_TO_DEFAULTS: "settings:resetToDefaults",

  UPDATE_CONTROLS: "ui:updateControls",
});

function createEventBus() {
  const map = new Map();
  return {
    on(event, handler) {
      if (!map.has(event)) map.set(event, new Set());
      map.get(event).add(handler);
      return () => map.get(event)?.delete(handler);
    },
    off(event, handler) {
      const s = map.get(event);
      if (!s) return false;
      if (!handler) {
        map.delete(event);
        return true;
      }
      return s.delete(handler);
    },
    once(event, handler) {
      let off;
      off = this.on(event, (payload) => {
        off();
        handler(payload);
      });
      return off;
    },
    emit(event, payload) {
      const subs = Array.from(map.get(event) || []);
      for (const fn of subs) {
        try {
          fn(payload);
        } catch (e) {
          console.warn("EventBus handler error", event, e);
        }
      }
    },
  };
}

function createUtils(timeDictLoader, utils, config) {
  const ALLOWED_LANGS = ["ar", "de", "en", "fr", "nl", "pl", "pt", "ru", "tr", "uk"];
  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

  function getBaseLang(code) {
    return String(code || "").split(/[-_]/)[0];
  }

  function normalizeLangCode(code) {
    if (!code) return "";
    return String(code).trim().toLowerCase().replace("_", "-");
  }

  function deepMerge(a, b) {
    if (!b) return JSON.parse(JSON.stringify(a || {}));
    if (!a) return JSON.parse(JSON.stringify(b || {}));
    const out = Array.isArray(a) ? [] : {};
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    keys.forEach((k) => {
      const va = a[k],
        vb = b[k];
      if (va && typeof va === "object" && !Array.isArray(va) && vb && typeof vb === "object" && !Array.isArray(vb)) {
        out[k] = deepMerge(va, vb);
      } else if (vb !== undefined) {
        out[k] = vb;
      } else {
        out[k] = va;
      }
    });
    return out;
  }

  function parseTimeInput(input) {
    if (!input || typeof input !== "string") return null;
    const m = input.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return { h, mm: min };
  }

  function chooseForm(n, forms) {
    if (!forms || !forms.length) return "";
    n = Math.abs(n);
    if (forms.length === 3) {
      // slavic: "1 минута", "2 минуты", "5 минут"
      if (n % 10 === 1 && n % 100 !== 11) return forms[0];
      if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return forms[1];
      return forms[2];
    }
    if (forms.length === 2) {
      // simple: 1 minute, 2 minutes
      return n === 1 ? forms[0] : forms[1];
    }
    return forms[0];
  }

  function generateRandomTimeString() {
    const h = Math.floor(Math.random() * 24);
    const m = Math.floor(Math.random() * 12) * 5;
    return `${h}:${String(m).padStart(2, "0")}`;
  }

  function getTimePhrase(langCode, { h, mm }, { use24h = false } = {}) {
    const baseLang = getBaseLang(langCode);
    const dict = timeDictLoader.getDict(baseLang) || timeDictLoader.getDict("en");
    if (!dict) return "";

    const hours = dict.hours || {};
    const hoursGenitive = dict.hoursGenitive || {};
    const minutes = dict.minutes || {};
    const minutesGenitive = dict.minutesGenitive || {};
    const words = dict.words || {};
    const lang = getBaseLang(langCode).toLowerCase();

    let algo = "default";
    if (["ru", "uk"].includes(lang)) algo = "slavic";
    if (["de", "nl"].includes(lang)) algo = "germanic";
    if (["fr", "pt", "en"].includes(lang)) algo = "latin";
    if (["ar"].includes(lang)) algo = "arabic";
    if (["tr"].includes(lang)) algo = "turkic";
    if (["pl"].includes(lang)) algo = "slavic";

    let hourWord, nextHourWord, nextHourWordGenitive;
    if (use24h) {
      hourWord = hours[h] || h;
      nextHourWord = hours[(h + 1) % 24] || h + 1;
    } else {
      const idx = h % 12;
      const nextIdx = (h + 1) % 12;
      hourWord = hours[idx] || h;
      nextHourWord = hours[nextIdx] || h + 1;
      nextHourWordGenitive = hoursGenitive[nextIdx] || h + 1;
    }

    utils.log(`algo`, algo);

    switch (algo) {
      case "slavic": // 🇷🇺 🇺🇦 🇵🇱
        if (mm === 0) return `${hourWord} ${words.hour || ""}`;
        if (mm === 15) return `${words.quarter || ""} ${words.of || ""} ${nextHourWordGenitive}`;
        if (mm < 30) return `${minutes[mm]} ${chooseForm(mm, words.minuteForms)} ${words.of || ""} ${nextHourWordGenitive}`;
        if (mm === 30) return `${words.half || ""} ${nextHourWordGenitive}`;
        if (mm === 40) return `${words.without || ""} ${minutesGenitive[60 - mm]} ${chooseForm(mm, words.minuteForms)} ${words.of || ""} ${nextHourWord}`;
        if (mm < 45) return `${minutes[mm]} ${chooseForm(mm, words.minuteForms)} ${nextHourWordGenitive}`;
        if (mm === 45) return `${words.quarterBefore || ""} ${nextHourWord}`;
        if (mm < 50) return `${minutes[mm]} ${chooseForm(60 - mm, words.minuteForms)} ${nextHourWordGenitive}`;
        return `${words.without || ""} ${minutesGenitive[60 - mm]} ${chooseForm(mm, words.minuteForms)} ${nextHourWord}`;

      case "germanic": // 🇩🇪 🇳🇱
        if (mm === 0) return `${hourWord} ${words.hour || ""}`;
        if (mm < 15) return `${minutes[mm]} ${words.over} ${hourWord}`;
        if (mm === 15) return `${words.quarter} ${words.over} ${hourWord}`;
        if (mm < 30) return `${minutes[30 - mm]} ${words.before} ${words.half} ${nextHourWord}`;
        if (mm === 30) return `${words.half} ${nextHourWord}`;
        if (mm < 45) return `${minutes[mm - 30]} ${words.over} ${words.half} ${nextHourWord}`;
        if (mm === 45) return `${words.quarter} ${words.before}${nextHourWord}`;
        return `${minutes[60 - mm]} ${words.before} ${nextHourWord}`;

      case "latin": // 🇬🇧 🇫🇷 🇵🇹
        if (mm === 0) return `${hourWord} ${words.hour || ""}`;
        if (mm === 15) return `${words.quarterOver} ${hourWord}`;
        if (mm === 30) return `${words.half} ${hourWord}`;
        if (mm === 45) return `${words.quarterBefore} ${nextHourWord}`;
        if (mm < 30) return `${minutes[mm]} ${chooseForm(mm, words.minuteForms)} ${words.past} ${hourWord}`;
        return `${minutes[60 - mm]} ${chooseForm(60 - mm, words.minuteForms)} ${words.to} ${nextHourWord}`;

      case "arabic": // 🇸🇦
        if (mm === 0) return `${hourWord} ${words.hour || ""}`;
        if (mm === 15) return `${hourWord} ${words.quarterOver}`;
        if (mm === 30) return `${hourWord} ${words.half}`;
        if (mm === 45) return `${nextHourWord} ${words.quarterBefore}`;
        if (mm < 30) return `${hourWord} و ${minutes[mm]} ${chooseForm(mm, words.minuteForms)}`;
        return `${nextHourWord} ${words.before} ${minutes[60 - mm]} ${chooseForm(60 - mm, words.minuteForms)}`;

      case "turkic": // 🇹🇷
        if (mm === 0) return `${hourWord} ${words.hour || ""}`;
        if (mm === 30) return `${hourWord} ${words.half}`;
        if (mm < 30) return `${hourWord} ${minutes[mm]} ${chooseForm(mm, words.minuteForms)} ${words.past}`;
        return `${nextHourWord} ${minutes[60 - mm]} ${chooseForm(60 - mm, words.minuteForms)} ${words.to}`;

      default: // fallback
        if (mm === 0) return `${hourWord} ${words.hour || ""}`;
        if (mm === 30) return `${words.half} ${nextHourWord}`;
        if (mm < 30) return `${minutes[mm]} ${chooseForm(mm, words.minuteForms)} ${words.over} ${hourWord}`;
        return `${minutes[60 - mm]} ${chooseForm(60 - mm, words.minuteForms)} ${words.before} ${nextHourWord}`;
    }
  }

  function log(...args) {
    const on = typeof config === "boolean" ? config : typeof config === "function" ? !!config() : !!(config && (config.DEVELOPER_MODE === true || config.DEFAULT_CONFIG?.DEVELOPER_MODE === true));
    if (on) console.log(...args);
  }

  return {
    ALLOWED_LANGS,
    deepMerge,
    parseTimeInput,
    generateRandomTimeString,
    getTimePhrase,
    capitalize,
    getBaseLang,
    normalizeLangCode,
    chooseForm,
    log,
  };
}

function createConfig(utils, { paths = null } = {}) {
  const PATHS = paths || {
    CONFIG: "./assets/configs/config.json",
    UI_TEXTS_DIR: "./assets/locales",
    TIME_DICTS_DIR: "./assets/vocabs",
  };

  const DEFAULT_CONFIG = Object.freeze({
    DEVELOPER_MODE: false,
    USE_LOCAL_STORAGE: true,
    FILTER_LANGS: false,
    DEFAULT_VOICE: "Google Nederlands",
    DEFAULT_SETTINGS: {
      shared: {
        uiLang: "ru",
        delay: "2000",
        speed: "1.0",
        fullscreen: "0",
        languageCode: "nl-NL",
        voiceName: "Google Nederlands",
      },
      mobile: {},
      desktop: {},
    },
  });

  const FALLBACK = Object.freeze({
    DEVELOPER_MODE: true,
    USE_LOCAL_STORAGE: true,
    FILTER_LANGS: false,
    DEFAULT_VOICE: "Google Nederlands",
    uiLang: "ru",
    delay: "1000",
    speed: "1.0",
    languageCode: "nl-NL",
    voiceName: "Google Nederlands",
  });

  async function loadExternal() {
    try {
      const resp = await fetch(PATHS.CONFIG, { cache: "no-store" });
      if (!resp.ok) return utils.deepMerge(DEFAULT_CONFIG, {});
      const json = await resp.json();
      return utils.deepMerge(DEFAULT_CONFIG, json);
    } catch (e) {
      return utils.deepMerge(DEFAULT_CONFIG, {});
    }
  }

  function selectPlatformDefaults(defs) {
    const isMobile = /Mobi|Android|iPhone|iPad|Windows Phone|IEMobile/i.test(navigator.userAgent || "");
    const platformSettings = isMobile ? defs?.mobile || {} : defs?.desktop || {};
    return utils.deepMerge(DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop, platformSettings);
  }

  return {
    PATHS,
    DEFAULT_CONFIG,
    FALLBACK,
    loadExternal,
    selectPlatformDefaults,
  };
}

function createTimeDictLoader({ config, utils }) {
  const PATH = config.PATHS.TIME_DICTS_DIR;
  let dicts = {};

  async function loadDict(code) {
    // const baseCode = code.split(/[-_]/)[0];
    const baseCode = utils.getBaseLang(code).toLowerCase();
    try {
      const res = await fetch(`${PATH}/${baseCode}.json`, {
        cache: "no-cache",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json || typeof json !== "object") throw new Error("Bad JSON");
      return json;
    } catch {
      return null;
    }
  }

  async function loadAll(allowed) {
    dicts = {};
    await Promise.all(
      allowed.map(async (code) => {
        const d = await loadDict(code);
        if (d) dicts[code.toLowerCase()] = d;
      })
    );
    return dicts;
  }

  function getDict(lang) {
    const key = String(lang || "").toLowerCase();
    return dicts[key] || dicts["en"];
  }

  return { loadDict, loadAll, getDict };
}

function createLangLoader({ config, utils }) {
  const PATH = config.PATHS.UI_TEXTS_DIR;
  let texts = {};

  const FALLBACK_EN = {
    btnStart: "Start",
    btnStop: "Stop",
    btnContinue: "Continue",
    fillRandom: "Fill random",
    alertInvalidFormat: "Enter time in HH:MM format",
    alertInvalidPhrase: "Invalid time or unable to generate Dutch phrase.",
    speakBtnTitle: "Speak",
    randomBtnTitle: "Random",
  };

  async function loadLang(code) {
    try {
      const res = await fetch(`${PATH}/${code}.json`, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json || typeof json !== "object") throw new Error("Bad JSON");
      return json;
    } catch (e) {
      return null;
    }
  }

  async function loadAll(allowed) {
    texts = {};
    const langs = Array.isArray(allowed) ? allowed : config.DEFAULT_CONFIG ? Object.keys(config.DEFAULT_CONFIG.DEFAULT_SETTINGS) : ["en"];
    await Promise.all(
      langs.map(async (code) => {
        const d = await loadLang(code);
        if (d) texts[code] = d;
      })
    );
    if (!texts.en) texts.en = FALLBACK_EN;
    return texts;
  }

  const getTexts = (lang) => texts[lang] || texts.en || FALLBACK_EN;

  return { loadLang, loadAll, getTexts };
}

function createStore({ bus, config, utils }) {
  const KEY = "CLT-settings";
  const LEGACY_KEY = "CLT_settings";
  const canUseLocal = Boolean(config.DEFAULT_CONFIG?.USE_LOCAL_STORAGE || config.FALLBACK?.USE_LOCAL_STORAGE);
  const Storage = {
    save(s) {
      if (!canUseLocal) return;
      try {
        localStorage.setItem(KEY, JSON.stringify(s));
      } catch (e) {}
    },
    load() {
      if (!canUseLocal) return null;
      try {
        const v = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY);
        return v ? JSON.parse(v) : null;
      } catch (e) {
        return null;
      }
    },
    remove() {
      try {
        localStorage.removeItem(KEY);
        localStorage.removeItem(LEGACY_KEY);
      } catch (e) {}
    },
  };
  let defaultsActive = {
    uiLang: "en",
    delay: "2000",
    speed: "1.0",
    fullscreen: "0",
    languageCode: "nl-NL",
    voiceName: "Google Nederlands",
  };
  let current = { ...defaultsActive };
  let playbackFlags = {
    isSequenceMode: false,
    isPaused: false,
    isSpeaking: false,
    sequenceIndex: 0,
  };
  let currentSpeakButton = null;
  function setDefaultActive(defs) {
    defaultsActive = { ...defaultsActive, ...(defs || {}) };
  }
  function allowed(selectEl, value) {
    if (!selectEl || !selectEl.options) return false;
    const v = value == null ? "" : String(value);
    for (let i = 0; i < selectEl.options.length; i++) {
      if (String(selectEl.options[i].value) === v) return true;
    }
    return false;
  }
  function mergeWithDefaults(stored, defaults, els) {
    const { uiLangSelectEl, delaySelectEl, speedSelectEl } = els || {};
    const out = {};
    out.uiLang = stored?.uiLang && utils.ALLOWED_LANGS.includes(stored.uiLang) && allowed(uiLangSelectEl, stored.uiLang) ? stored.uiLang : defaults?.uiLang ?? config.FALLBACK?.uiLang;
    out.delay = (() => {
      const v = stored?.delay;
      const n = parseInt(v, 10);
      if (!isNaN(n) && allowed(delaySelectEl, String(n))) return String(n);
      return defaults?.delay ?? config.FALLBACK?.delay;
    })();
    out.speed = (() => {
      const v = stored?.speed;
      const n = parseFloat(v);
      if (!isNaN(n) && allowed(speedSelectEl, String(v))) return String(v);
      return defaults?.speed ?? config.FALLBACK?.speed;
    })();
    out.fullscreen = stored?.fullscreen ?? defaults?.fullscreen ?? config.FALLBACK?.fullscreen;
    out.languageCode = stored?.languageCode ?? defaults?.languageCode ?? config.FALLBACK?.languageCode;
    out.voiceName = stored?.voiceName ?? defaults?.voiceName ?? config.FALLBACK?.voiceName;
    return out;
  }
  function setSettings(s) {
    current = { ...current, ...(s || {}) };
    bus.emit(EventTypes.CONFIG_LOADED, current);
  }
  function getSettings() {
    return { ...current };
  }
  function saveSettings(s, els) {
    const toSave = mergeWithDefaults(s || {}, defaultsActive, els);
    current = toSave;
    if (canUseLocal) {
      try {
        localStorage.setItem(KEY, JSON.stringify(toSave));
      } catch (e) {}
    }
    bus.emit(EventTypes.SETTINGS_SAVE, toSave);
  }
  function loadSettingsFromLocal(els) {
    if (!canUseLocal) return { raw: {}, merged: mergeWithDefaults({}, defaultsActive, els) };
    try {
      const raw = Storage.load() || {};
      const merged = mergeWithDefaults(raw, defaultsActive, els);
      return { raw, merged };
    } catch (e) {
      return { raw: {}, merged: mergeWithDefaults({}, defaultsActive, els) };
    }
  }
  function setPlaybackFlags(f) {
    playbackFlags = { ...playbackFlags, ...f };
  }
  function playbackFlagsGet() {
    return { ...playbackFlags };
  }
  function setCurrentSpeakButton(b) {
    currentSpeakButton = b;
  }
  function getCurrentSpeakButton() {
    return currentSpeakButton;
  }
  function getDefaultActive() {
    return { ...defaultsActive };
  }
  return {
    setDefaultActive,
    setSettings,
    getSettings,
    saveSettings,
    loadSettingsFromLocal,
    setPlaybackFlags,
    playbackFlags: playbackFlagsGet,
    setCurrentSpeakButton,
    getCurrentSpeakButton,
    getDefaultActive,
  };
}

function createWakeLock({ bus } = {}) {
  let wakeLock = null;

  async function request() {
    try {
      if ("wakeLock" in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock?.addEventListener?.("release", () => {});
      }
      return !!wakeLock;
    } catch (e) {
      console.warn("WakeLock request failed", e);
      wakeLock = null;
      return false;
    }
  }

  async function release() {
    try {
      if (wakeLock) {
        await (wakeLock.release?.() || Promise.resolve());
        wakeLock = null;
      }
    } catch (e) {
      wakeLock = null;
    }
  }

  function init() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        bus.emit(EventTypes.APP_STATE, "resume-visibility");
      } else {
        release();
      }
    });
    bus.on(EventTypes.APP_STATE, (s) => {
      if (s === "playing") request();
      else release();
    });
  }

  return { request, release, init };
}

function createVoices({ bus, utils, filterLangs = false } = {}) {
  let voices = [];
  let availableLanguages = [];

  function computeAvailableLanguages() {
    const set = new Set();
    for (const v of voices) {
      const base = (utils.getBaseLang(v.lang) || "").toLowerCase();
      if (!base) continue;
      if (filterLangs && !utils.ALLOWED_LANGS.includes(base)) continue;
      set.add(base.toUpperCase());
    }
    availableLanguages = Array.from(set).sort();
    if (!availableLanguages.includes("ALL")) availableLanguages.push("ALL");
  }

  function publish(evt) {
    const payload = {
      voices: (voices || []).map((v) => ({ name: v.name, lang: v.lang })),
      availableLanguages: availableLanguages.slice(),
    };
    bus.emit(evt, payload);
  }

  function collect() {
    try {
      voices = (typeof speechSynthesis !== "undefined" && speechSynthesis.getVoices && speechSynthesis.getVoices()) || [];
    } catch (e) {
      voices = [];
    }
    utils.log(
      "Available Langs: ",
      voices.map((v) => v.lang)
    );
    computeAvailableLanguages();
    utils.log("Filtered Langs: ", availableLanguages);
    publish(EventTypes.VOICES_CHANGED);
  }

  async function load() {
    collect();
    if (!voices.length && typeof speechSynthesis !== "undefined") {
      try {
        speechSynthesis.speak(new SpeechSynthesisUtterance(""));
        await new Promise((r) => setTimeout(r, 300));
        collect();
      } catch (e) {}
    }
    publish(EventTypes.VOICES_LOADED);
  }

  if (typeof speechSynthesis !== "undefined" && "onvoiceschanged" in speechSynthesis) {
    speechSynthesis.onvoiceschanged = () => {
      collect();
    };
  }

  return {
    collect,
    load,
    getVoices: () => voices.slice(),
    getAvailableLanguages: () => availableLanguages.slice(),
  };
}

function createSpeaker({ bus, voicesProvider, settingsProvider } = {}) {
  let currentUtter = null;
  let getVoices = () => (typeof voicesProvider === "function" ? voicesProvider() : []);
  let getSettings = () => (typeof settingsProvider === "function" ? settingsProvider() : {});

  function _selectVoice(settings) {
    const all = getVoices() || [];
    if (!all.length) return null;
    const desiredName = String(settings.voiceName || "").trim();
    const desiredLang = String(settings.languageCode || "")
      .trim()
      .toLowerCase();
    if (desiredName) {
      const exact = all.find((v) => v.name === desiredName);
      if (exact) return exact;
      const norm = (n) =>
        String(n || "")
          .trim()
          .toLowerCase();
      const partial = all.find((v) => norm(v.name).includes(norm(desiredName)));
      if (partial) return partial;
    }
    if (desiredLang) {
      const byFull = all.find((v) => (v.lang || "").toLowerCase() === desiredLang);
      if (byFull) return byFull;
      const base = desiredLang.split(/[-_]/)[0];
      if (base) {
        const byBase = all.find((v) => ((v.lang || "").split(/[-_]/)[0] || "").toLowerCase() === base);
        if (byBase) return byBase;
      }
    }
    const navBase = (navigator.language || "").split(/[-_]/)[0];
    if (navBase) {
      const nav = all.find((v) => (v.lang || "").toLowerCase().startsWith(navBase));
      if (nav) return nav;
    }
    return all[0] || null;
  }

  async function speakAsync(text, opts = {}) {
    utils.log(text, opts);
    if (!text) return;
    const settings = { ...(getSettings() || {}), ...opts };
    if (opts.interrupt !== false && "speechSynthesis" in window) {
      try {
        speechSynthesis.cancel();
      } catch (e) {}
    }
    if ("speechSynthesis" in window) {
      const utter = new SpeechSynthesisUtterance(String(text));
      const chosen = _selectVoice(settings);
      if (chosen) {
        try {
          utter.voice = chosen;
          utter.lang = chosen.lang || settings.languageCode || utter.lang;
        } catch (e) {
          if (settings.languageCode) utter.lang = settings.languageCode;
        }
      } else if (settings.languageCode) {
        utter.lang = settings.languageCode;
      }
      utter.rate = Number(settings.rate ?? settings.speed) > 0 ? Number(settings.rate ?? settings.speed) : 1.0;
      utter.pitch = Number(settings.pitch) > 0 ? Number(settings.pitch) : 1.0;
      utter.volume = Number(settings.volume) >= 0 && Number(settings.volume) <= 1 ? Number(settings.volume) : 1.0;
      return new Promise((resolve) => {
        const done = () => {
          currentUtter = null;
          bus.emit(EventTypes.SPEECH_END, { button: opts.button || null });
          resolve(true);
        };
        utter.onend = done;
        utter.onerror = done;
        currentUtter = utter;
        bus.emit(EventTypes.SPEECH_START, { button: opts.button || null });
        speechSynthesis.speak(utter);
      });
    }
    if (window.fetch) {
      try {
        const res = await fetch("/speak", {
          method: "POST",
          body: JSON.stringify({ text, opts }),
          headers: { "Content-Type": "application/json" },
        });
        return res.ok;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  function speak(obj) {
    if (!obj) return;
    if (typeof obj === "string") return speakAsync(obj).catch((e) => console.warn("speak failed", e));
    const { text, rate = 1, lang, button, voiceName, pitch, volume } = obj;
    return speakAsync(text, {
      rate,
      languageCode: lang,
      speed: rate,
      voiceName,
      pitch,
      volume,
      button,
    }).catch((e) => console.warn("speak failed", e));
  }

  function cancel() {
    try {
      if ("speechSynthesis" in window && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel();
    } catch (e) {}
    if (currentUtter) {
      bus.emit(EventTypes.SPEECH_END, { button: null });
      currentUtter = null;
    }
  }

  const pause = () => {
    try {
      speechSynthesis.pause();
    } catch (e) {}
  };
  const resume = () => {
    try {
      speechSynthesis.resume();
    } catch (e) {}
  };
  const isSpeaking = () => {
    try {
      return speechSynthesis.speaking;
    } catch (e) {
      return false;
    }
  };
  const isPaused = () => {
    try {
      return speechSynthesis.paused;
    } catch (e) {
      return false;
    }
  };

  return {
    speak,
    speakAsync,
    cancel,
    pause,
    resume,
    isSpeaking,
    isPaused,
    _selectVoice,
  };
}

function createUI({ bus, store, config, langLoader, utils }) {
  const PLAY_ICON = "▶️";
  const STOP_ICON = "⏹️";
  const els = {
    delaySelectEl: document.getElementById("delaySelect"),
    speedSelectEl: document.getElementById("speedSelect"),
    startPauseBtnEl: document.getElementById("startPauseBtn"),
    resetBtnEl: document.getElementById("resetBtn"),
    resetSettingsBtnEl: document.getElementById("resetSettingsBtn"),
    fillRandomBtnEl: document.getElementById("fillRandomBtn"),
    uiLangSelectEl: document.getElementById("uiLangSelect"),
    languageCodeSelectEl: document.getElementById("languageCodeSelect"),
    voiceSelectEl: document.getElementById("voiceSelect"),
    randomBtnEls: document.querySelectorAll(".random-btn"),
    speakBtnEls: document.querySelectorAll(".speak-btn"),
    timeInputEls: document.querySelectorAll(".time-input"),
    clockContainerEls: document.querySelectorAll(".clock-container"),
    developerBlockEl: document.getElementById("developer"),
  };
  let cachedVoices = [];
  let cachedLanguages = [];

  function disableSpeakButtons(disable) {
    els.speakBtnEls.forEach((b) => b && (b.disabled = disable));
  }
  function toggleControls(enabled) {
    if (els.speedSelectEl) els.speedSelectEl.disabled = !enabled;
    if (els.delaySelectEl) els.delaySelectEl.disabled = !enabled;
    document.querySelectorAll('label[for="speedSelect"],label[for="delaySelect"]').forEach((l) => l.classList.toggle("disabled", !enabled));
  }
  function setActiveInput(index) {
    els.timeInputEls.forEach((inp) => inp?.classList.remove("highlight"));
    els.randomBtnEls.forEach((btn) => btn && (btn.disabled = false));
    if (index >= 0 && index < els.timeInputEls.length) {
      const inp = els.timeInputEls[index];
      inp?.classList.add("highlight");
      const rnd = inp?.parentElement?.querySelector(".random-btn");
      if (rnd) rnd.disabled = true;
    }
  }
  function updateButtonIcon(btn, state) {
    if (!btn) return;
    if (state === "speaking") btn.textContent = STOP_ICON;
    else btn.textContent = PLAY_ICON;
  }
  function setBtnText(el, text) {
    if (!el) return;
    if (el.textContent !== text) el.textContent = text;
  }
  function translateUI(lang) {
    const texts = langLoader.getTexts(lang);
    if (!texts) return;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key && texts[key]) el.textContent = texts[key];
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      if (key && texts[key]) el.title = texts[key];
    });
    window.alertTexts = {
      invalidFormat: texts.alertInvalidFormat || "Enter time in HH:MM format",
      invalidPhrase: texts.alertInvalidPhrase || "Invalid time or unable to generate Dutch phrase.",
    };
    window.btnStates = {
      start: texts.btnStart || "Start",
      stop: texts.btnStop || "Stop",
      cont: texts.btnContinue || "Continue",
    };
    const f = store.playbackFlags();
    if (f.isSequenceMode && !f.isPaused) setBtnText(els.startPauseBtnEl, window.btnStates.stop || "Stop");
    else if (f.isSequenceMode && f.isPaused) setBtnText(els.startPauseBtnEl, window.btnStates.cont || "Continue");
    else setBtnText(els.startPauseBtnEl, window.btnStates.start || "Start");
    bus.emit(EventTypes.UI_TEXTS_UPDATE, { lang });
  }
  function applySettingsToUI(s, { preferBlankForInvalid = true, raw = {} } = {}) {
    const setOrBlank = (sel, cand, fallback) => {
      if (!sel) return;
      const hasOpt = (val) => Array.from(sel.options).some((o) => String(o.value) === String(val));
      if (cand !== undefined && hasOpt(cand)) sel.value = String(cand);
      else if (preferBlankForInvalid) sel.value = "";
      else if (fallback !== undefined && hasOpt(fallback)) sel.value = String(fallback);
    };
    setOrBlank(els.uiLangSelectEl, raw.uiLang ?? s.uiLang, s.uiLang);
    setOrBlank(els.speedSelectEl, raw.speed ?? s.speed, s.speed);
    setOrBlank(els.delaySelectEl, raw.delay ?? s.delay, s.delay);
    const effectiveLang = els.uiLangSelectEl?.value || s.uiLang || store.getDefaultActive().uiLang || config.FALLBACK?.uiLang;
    translateUI(effectiveLang);
  }
  function readSettingsFromUI() {
    const base = {
      uiLang: els.uiLangSelectEl?.value,
      speed: els.speedSelectEl?.value,
      delay: els.delaySelectEl?.value,
    };
    const current = store.getSettings ? store.getSettings() : {};
    const defaults = store.getDefaultActive ? store.getDefaultActive() : {};
    const allowedOpt = (sel, val) => sel && Array.from(sel.options).some((opt) => String(opt.value) === String(val));

    return {
      uiLang: base.uiLang && utils.ALLOWED_LANGS.includes(base.uiLang) && allowedOpt(els.uiLangSelectEl, base.uiLang) ? base.uiLang : current.uiLang || defaults.uiLang,

      speed: !isNaN(parseFloat(base.speed)) && allowedOpt(els.speedSelectEl, base.speed) ? base.speed : current.speed || defaults.speed,

      delay: !isNaN(parseInt(base.delay, 10)) && allowedOpt(els.delaySelectEl, base.delay) ? base.delay : current.delay || defaults.delay,

      fullscreen: current.fullscreen ?? defaults.fullscreen,
      languageCode: current.languageCode ?? defaults.languageCode,
      voiceName: current.voiceName ?? defaults.voiceName,
    };
  }

  function setDeveloperVisibility(appCfg) {
    const devMode = appCfg?.DEVELOPER_MODE ?? config.DEFAULT_CONFIG.DEVELOPER_MODE ?? config.FALLBACK?.DEVELOPER_MODE;
    if (els.developerBlockEl) els.developerBlockEl.style.display = devMode ? "" : "none";
  }
  function updateStartPauseBtnTo(state) {
    if (state === "start") setBtnText(els.startPauseBtnEl, window.btnStates.start);
    else if (state === "stop") setBtnText(els.startPauseBtnEl, window.btnStates.stop);
    else if (state === "cont") setBtnText(els.startPauseBtnEl, window.btnStates.cont);
  }
  function updateControlsAvailability() {
    const flags = store.playbackFlags();
    const activeBtn = store.getCurrentSpeakButton();
    const activeIdx = flags.sequenceIndex;

    els.speakBtnEls.forEach((btn) => {
      if (flags.isSequenceMode) btn.disabled = true;
      else if (flags.isSpeaking && activeBtn) btn.disabled = btn !== activeBtn;
      else btn.disabled = flags.isPaused;
    });

    els.randomBtnEls.forEach((btn, idx) => {
      if (flags.isSequenceMode && idx === activeIdx) btn.disabled = true;
      else if (activeBtn) {
        const speakBtn = btn?.parentElement?.querySelector(".speak-btn");
        btn.disabled = speakBtn && speakBtn === activeBtn;
      } else btn.disabled = false;
    });

    let enableControls = !(flags.isSequenceMode && !flags.isPaused);

    if (!flags.isSequenceMode && flags.isSpeaking) {
      enableControls = false;
    }

    if (els.speedSelectEl) els.speedSelectEl.disabled = !enableControls;
    if (els.delaySelectEl) els.delaySelectEl.disabled = !enableControls;
    if (els.languageCodeSelectEl) els.languageCodeSelectEl.disabled = !enableControls;
    if (els.voiceSelectEl) els.voiceSelectEl.disabled = !enableControls;

    document.querySelectorAll('label[for="speedSelect"],label[for="delaySelect"],label[for="languageCodeSelect"],label[for="voiceSelect"]').forEach((l) => l.classList.toggle("disabled", !enableControls));

    if (els.resetBtnEl) els.resetBtnEl.disabled = !flags.isPaused;
  }

  function labelForLang(code) {
    return code;
  }
  function populateLanguageSelectFromAvailableLanguages(list) {
    if (!els.languageCodeSelectEl) return;
    const s = store.getSettings();
    const base = utils.getBaseLang(s.languageCode || "");
    const preferred = base ? base.toUpperCase() : "";
    els.languageCodeSelectEl.innerHTML = "";
    (list || []).forEach((lc) => {
      const opt = document.createElement("option");
      opt.value = lc;
      opt.textContent = labelForLang(lc);
      els.languageCodeSelectEl.appendChild(opt);
    });
    const toSet = (list || []).includes(preferred) ? preferred : (list || [])[0] || "";
    if (toSet) els.languageCodeSelectEl.value = toSet;
  }
  function populateVoiceSelectForLanguage(list, langCodeOrAll) {
    if (!els.voiceSelectEl) return;
    const s = store.getSettings();
    let filtered = [];
    if (langCodeOrAll === "ALL") {
      filtered = list || [];
    } else {
      const base = (utils.getBaseLang(langCodeOrAll) || "").toUpperCase();
      filtered = (list || []).filter((v) => (utils.getBaseLang(v.lang) || "").toUpperCase() === base);
    }
    els.voiceSelectEl.innerHTML = "";
    filtered.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang})`;
      els.voiceSelectEl.appendChild(opt);
    });
    const target = filtered.find((v) => v.name === s.voiceName) || filtered.find((v) => utils.normalizeLangCode(v.lang) === utils.normalizeLangCode(s.languageCode)) || filtered[0];
    if (target) {
      els.voiceSelectEl.value = target.name;
      s.voiceName = target.name;
      s.languageCode = utils.normalizeLangCode(target.lang);
      store.setSettings(s);
      store.saveSettings(s, els);
    }
  }
  function renderLangVoiceUI() {
    if (!cachedVoices.length || !cachedLanguages.length) return;
    populateLanguageSelectFromAvailableLanguages(cachedLanguages);
    const selectedLang = els.languageCodeSelectEl?.value || "";
    populateVoiceSelectForLanguage(cachedVoices, selectedLang);
  }

  function bindHandlers() {
    els.clockContainerEls.forEach((group) => {
      const rnd = group.querySelector(".random-btn");
      const input = group.querySelector(".time-input");
      const speakBtn = group.querySelector(".speak-btn");
      if (rnd && input)
        rnd.addEventListener("click", () => {
          input.value = utils.generateRandomTimeString();
          bus.emit(EventTypes.UPDATE_CONTROLS);
        });
      if (speakBtn && input)
        speakBtn.addEventListener("click", () => {
          const { isSpeaking } = store.playbackFlags();
          if (isSpeaking) return;
          const raw = input.value?.trim();
          if (!raw) return;
          const timeStr = utils.parseTimeInput(raw);
          if (!timeStr) {
            alert(window.alertTexts.invalidFormat);
            return;
          }
          const phrase = utils.getTimePhrase(store.getSettings().languageCode, timeStr);
          if (!phrase) {
            alert(window.alertTexts.invalidPhrase);
            return;
          }
          bus.emit(EventTypes.UI_SPEAK_SINGLE, {
            phrase,
            rate: parseFloat(els.speedSelectEl?.value || store.getDefaultActive().speed),
            button: speakBtn,
          });
        });
    });
    els.fillRandomBtnEl?.addEventListener("click", () => {
      els.timeInputEls.forEach((inp, idx) => {
        const flags = store.playbackFlags();
        if ((flags.isSequenceMode || flags.isPaused) && idx === flags.sequenceIndex) return;
        inp.value = utils.generateRandomTimeString();
      });
      bus.emit(EventTypes.UPDATE_CONTROLS);
    });
    els.resetSettingsBtnEl?.addEventListener("click", () => bus.emit(EventTypes.SETTINGS_RESET));
    els.uiLangSelectEl?.addEventListener("change", (e) => {
      bus.emit(EventTypes.UI_TRANSLATE, { lang: e.target.value });
      bus.emit(EventTypes.SETTINGS_APPLY_TO_UI, { saveFromUI: true });
    });
    els.speedSelectEl?.addEventListener("change", () => bus.emit(EventTypes.SETTINGS_APPLY_TO_UI, { saveFromUI: true }));
    els.delaySelectEl?.addEventListener("change", () => bus.emit(EventTypes.SETTINGS_APPLY_TO_UI, { saveFromUI: true }));
    els.languageCodeSelectEl?.addEventListener("change", (e) => {
      const newLang = e.target.value;
      populateVoiceSelectForLanguage(cachedVoices, newLang);
      bus.emit(EventTypes.UPDATE_CONTROLS);
    });
    els.voiceSelectEl?.addEventListener("change", (e) => {
      const s = store.getSettings();
      const selectedName = e.target.value;
      const v = (cachedVoices || []).find((x) => x.name === selectedName);
      if (v) {
        s.voiceName = v.name;
        s.languageCode = utils.normalizeLangCode(v.lang);
        store.setSettings(s);
        store.saveSettings(s, els);
      }
      bus.emit(EventTypes.UPDATE_CONTROLS);
    });
    els.startPauseBtnEl?.addEventListener("click", () => {
      const f = store.playbackFlags();
      if (!f.isSequenceMode) {
        updateStartPauseBtnTo("stop");
        bus.emit(EventTypes.PLAYBACK_START, { index: f.sequenceIndex || 0 });
      } else if (f.isPaused) {
        bus.emit(EventTypes.PLAYBACK_CONTINUE);
        updateStartPauseBtnTo("stop");
      } else {
        bus.emit(EventTypes.PLAYBACK_PAUSE);
      }
    });
    els.resetBtnEl?.addEventListener("click", () => {
      bus.emit(EventTypes.PLAYBACK_STOP);
      updateStartPauseBtnTo("start");
    });
    bus.on(EventTypes.UPDATE_CONTROLS, updateControlsAvailability);
    bus.on(EventTypes.SPEECH_START, () => {
      store.setPlaybackFlags({ isSpeaking: true });
      bus.emit(EventTypes.UPDATE_CONTROLS);
    });
    bus.on(EventTypes.SPEECH_END, () => {
      store.setPlaybackFlags({ isSpeaking: false });
      bus.emit(EventTypes.UPDATE_CONTROLS);
    });
    bus.on(EventTypes.VOICES_CHANGED, (p) => {
      cachedVoices = (p && p.voices) || [];
      cachedLanguages = (p && p.availableLanguages) || [];
      renderLangVoiceUI();
      updateControlsAvailability();
    });
    bus.on(EventTypes.VOICES_LOADED, (p) => {
      cachedVoices = (p && p.voices) || [];
      cachedLanguages = (p && p.availableLanguages) || [];
      renderLangVoiceUI();
      updateControlsAvailability();
    });
    bus.on(EventTypes.SETTINGS_RESET, () => {
      const s = store.getDefaultActive ? store.getDefaultActive() : store.getSettings();
      populateLanguageSelectFromAvailableLanguages(cachedLanguages);
      const base = (utils.getBaseLang(s.languageCode) || "").toUpperCase();
      if (base && els.languageCodeSelectEl && cachedLanguages.includes(base)) els.languageCodeSelectEl.value = base;
      populateVoiceSelectForLanguage(cachedVoices, els.languageCodeSelectEl?.value || "ALL");
      bus.emit(EventTypes.UPDATE_CONTROLS);
    });
  }

  function init() {
    bindHandlers();
    els.fillRandomBtnEl?.click();
    bus.emit(EventTypes.UPDATE_CONTROLS);
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
    updateControlsAvailability,
    init,
  };
}

function createPlayback({ bus, store, ui, speaker, utils, wakeLock } = {}) {
  let currentTimeout = null;
  function clearTimer() {
    if (currentTimeout) {
      clearTimeout(currentTimeout);
      currentTimeout = null;
    }
  }
  function speakPhrase(phrase, btn, after) {
    store.setPlaybackFlags({ isSpeaking: true });
    bus.emit(EventTypes.UPDATE_CONTROLS);
    ui.updateButtonIcon(btn, "speaking");
    const rate = parseFloat(ui.els.speedSelectEl?.value || store.getDefaultActive().speed);
    store.setCurrentSpeakButton(btn);
    speaker.speak({
      text: phrase,
      rate,
      lang: store.getSettings().languageCode,
      button: btn,
    });
    const off = bus.on(EventTypes.SPEECH_END, () => {
      off();
      store.setPlaybackFlags({ isSpeaking: false });
      bus.emit(EventTypes.UPDATE_CONTROLS);
      ui.updateButtonIcon(btn);
      const f = store.playbackFlags();
      if (f.isSequenceMode && !f.isPaused) after && after();
      if (store.getCurrentSpeakButton() === btn) store.setCurrentSpeakButton(null);
    });
  }
  function playAt(index = 0) {
    const inputs = ui.els.timeInputEls;
    if (!inputs || index >= inputs.length) return finish();
    store.setPlaybackFlags({
      sequenceIndex: index,
      isSequenceMode: true,
      isPaused: false,
    });
    bus.emit(EventTypes.UPDATE_CONTROLS);
    ui.setActiveInput(index);
    ui.els.speakBtnEls.forEach((b) => {
      if (b) b.disabled = true;
    });
    ui.els.randomBtnEls.forEach((b, idx) => {
      if (b) b.disabled = idx === index;
    });
    const inp = inputs[index];
    const raw = inp?.value?.trim();
    if (!raw) return next(index);
    const timeStr = utils.parseTimeInput(raw);
    if (!timeStr) return next(index);
    const phrase = utils.getTimePhrase(store.getSettings().languageCode, timeStr);
    if (!phrase) return next(index);
    const speakBtn = inp?.parentElement?.querySelector(".speak-btn") || null;
    speakPhrase(phrase, speakBtn, () => scheduleNext(index));
  }
  function scheduleNext(index) {
    if (store.playbackFlags().isPaused) return;
    const delayMs = parseInt(ui.els.delaySelectEl?.value || store.getDefaultActive().delay, 10);
    currentTimeout = setTimeout(() => next(index), delayMs);
  }
  function next(index) {
    const nextIndex = index + 1;
    if (nextIndex >= ui.els.timeInputEls.length) return finish();
    playAt(nextIndex);
  }
  function finish() {
    clearTimer();
    store.setPlaybackFlags({
      isSequenceMode: false,
      isPaused: false,
      isSpeaking: false,
      sequenceIndex: 0,
    });
    bus.emit(EventTypes.UPDATE_CONTROLS);
    ui.updateStartPauseBtnTo("start");
    ui.toggleControls(true);
    ui.setActiveInput(-1);
    ui.updateButtonIcon();
    ui.els.speakBtnEls.forEach((b) => (b.disabled = false));
    ui.els.randomBtnEls.forEach((b) => (b.disabled = false));
    bus.emit(EventTypes.PLAYBACK_FINISH);
  }
  function stop() {
    clearTimer();
    store.setPlaybackFlags({
      isSequenceMode: false,
      isPaused: false,
      isSpeaking: false,
      sequenceIndex: 0,
    });
    bus.emit(EventTypes.UPDATE_CONTROLS);
    if (speaker && typeof speaker.cancel === "function") {
      speaker.cancel();
    } else {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
      bus.emit(EventTypes.SPEECH_END, {
        button: store.getCurrentSpeakButton(),
      });
    }
    finish();
  }
  function pause() {
    clearTimer();
    store.setPlaybackFlags({ isPaused: true, isSpeaking: false });
    bus.emit(EventTypes.UPDATE_CONTROLS);
    if (speaker && typeof speaker.cancel === "function") speaker.cancel();
    ui.updateStartPauseBtnTo("cont");
    ui.toggleControls(true);
  }
  function resume() {
    store.setPlaybackFlags({ isPaused: false });
    bus.emit(EventTypes.UPDATE_CONTROLS);
    ui.updateStartPauseBtnTo("stop");
    const idx = store.playbackFlags().sequenceIndex;
    if (typeof idx === "number") playAt(idx);
  }
  function handleSinglePlay({ phrase, rate, button, interrupt = true } = {}) {
    if (!phrase) return;
    const flags = store.playbackFlags();
    if (flags.isSequenceMode && !flags.isPaused) return;
    store.setCurrentSpeakButton(button);
    speaker
      .speakAsync(String(phrase), {
        rate,
        languageCode: store.getSettings().languageCode,
        voiceName: store.getSettings().voiceName,
        button,
        interrupt,
      })
      .catch((e) => console.warn("single speak failed", e))
      .finally(() => {
        if (store.getCurrentSpeakButton() === button) store.setCurrentSpeakButton(null);
        bus.emit(EventTypes.UPDATE_CONTROLS);
      });
  }
  bus.on(EventTypes.PLAYBACK_START, ({ index = 0 } = {}) => playAt(index));
  bus.on(EventTypes.PLAYBACK_PAUSE, () => pause());
  bus.on(EventTypes.PLAYBACK_CONTINUE, () => resume());
  bus.on(EventTypes.PLAYBACK_STOP, () => stop());
  bus.on(EventTypes.UI_SPEAK_SINGLE, (payload) => handleSinglePlay(payload));
  bus.on(EventTypes.SPEECH_END, (p) => {
    const cur = store.getCurrentSpeakButton();
    if (cur && p?.button === cur) {
      store.setCurrentSpeakButton(null);
      bus.emit(EventTypes.UPDATE_CONTROLS);
    }
  });
  return { playAt, stop, pause, resume, finish };
}

(async function bootstrap() {
  const bus = createEventBus();

  const utilsStub = createUtils({ getDict: () => null });
  const config = createConfig(utilsStub, {
    paths: {
      CONFIG: "./assets/configs/config.json",
      UI_TEXTS_DIR: "./assets/locales",
      TIME_DICTS_DIR: "./assets/vocabs",
    },
  });

  const utils = createUtils({ getDict: () => null });

  const timeDictLoader = createTimeDictLoader({ config, utils });
  await timeDictLoader.loadAll(utils.ALLOWED_LANGS);

  const appCfg = await config.loadExternal();

  const fullUtils = createUtils(timeDictLoader, utils, Boolean(appCfg?.DEVELOPER_MODE));
  window.utils = fullUtils;

  const langLoader = createLangLoader({ config, utils: fullUtils });
  const store = createStore({ bus, config, utils: fullUtils });
  const wakeLock = createWakeLock({ bus });

  const voices = createVoices({
    bus,
    utils: fullUtils,
    filterLangs: Boolean(appCfg?.FILTER_LANGS),
  });

  const speaker = createSpeaker({
    bus,
    voicesProvider: () => voices.getVoices(),
    settingsProvider: () => store.getSettings(),
  });

  const ui = createUI({ bus, store, config, langLoader, utils: fullUtils });

  const playback = createPlayback({
    bus,
    store,
    ui,
    speaker,
    utils: fullUtils,
    wakeLock,
  });

  store.setDefaultActive(config.selectPlatformDefaults(appCfg.DEFAULT_SETTINGS));
  ui.setDeveloperVisibility(appCfg);

  await langLoader.loadAll(fullUtils.ALLOWED_LANGS);
  const { raw, merged } = store.loadSettingsFromLocal(ui.els);
  store.setSettings(merged);
  ui.applySettingsToUI(merged, { raw });
  store.saveSettings(merged, ui.els);

  await voices.load();

  bus.on(EventTypes.VOICES_LOADED, () => {
    const currentSettings = store.getSettings();
    if (!currentSettings.voiceName && voices.getVoices) {
      const all = voices.getVoices();
      if (all && all.length) {
        currentSettings.voiceName = all[0].name;
        store.setSettings(currentSettings);
      }
    }
  });

  bus.on(EventTypes.APP_INIT, async () => {
    ui.init();
    wakeLock.init();
    await voices.load();
  });

  bus.on(EventTypes.SETTINGS_APPLY_TO_UI, ({ saveFromUI }) => {
    const s = ui.readSettingsFromUI();
    store.setSettings(s);
    if (saveFromUI) store.saveSettings(s, ui.els);
  });

  bus.on(EventTypes.UI_TRANSLATE, ({ lang }) => {
    ui.translateUI(lang);
  });

  bus.on(EventTypes.SETTINGS_RESET, () => {
    const defaults = store.getDefaultActive();
    store.setSettings(defaults);
    store.saveSettings(defaults, ui.els);
    ui.applySettingsToUI(defaults, { raw: defaults });
  });

  window.app = {
    bus,
    utils: fullUtils,
    config,
    langLoader,
    store,
    wakeLock,
    voices,
    speaker,
    ui,
    playback,
    appCfg,
  };

  bus.emit(EventTypes.APP_INIT);
})();
