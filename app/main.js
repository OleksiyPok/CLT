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

function createUtils(timeDictLoader) {
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
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    keys.forEach((k) => {
      const va = a[k],
        vb = b[k];
      if (
        va &&
        typeof va === "object" &&
        !Array.isArray(va) &&
        vb &&
        typeof vb === "object" &&
        !Array.isArray(vb)
      ) {
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

  function generateRandomTimeString() {
    const h = Math.floor(Math.random() * 24);
    const m = Math.floor(Math.random() * 12) * 5;
    return `${h}:${String(m).padStart(2, "0")}`;
  }

  function getTimePhrase(langCode, { h, mm }, { use24h = false } = {}) {
    const dict =
      timeDictLoader.getDict(langCode) || timeDictLoader.getDict("en");
    if (!dict) return "";

    const hours = dict.hours || {};
    const minutes = dict.minutes || {};
    const words = dict.words || {};
    const lang = langCode.toLowerCase();

    let algo = "default";
    if (["ru", "uk"].includes(lang)) algo = "slavic";
    if (["de", "nl"].includes(lang)) algo = "germanic";
    if (["fr", "pt", "en"].includes(lang)) algo = "latin";
    if (["ar"].includes(lang)) algo = "arabic";
    if (["tr"].includes(lang)) algo = "turkic";
    if (["pl"].includes(lang)) algo = "slavic";

    let hourWord, nextHourWord;
    if (use24h) {
      hourWord = hours[h] || h;
      nextHourWord = hours[(h + 1) % 24] || h + 1;
    } else {
      const idx = h % 12;
      const nextIdx = (h + 1) % 12;
      hourWord = hours[idx] || h;
      nextHourWord = hours[nextIdx] || h + 1;
    }

    switch (algo) {
      case "slavic": // 🇷🇺 🇺🇦 🇵🇱
        if (mm === 0) return `${hourWord} ${words.hour || ""}`;
        if (mm === 15) return `${words.quarterOver || ""} ${hourWord}`;
        if (mm === 30) return `${words.half || ""} ${nextHourWord}`;
        if (mm === 45) return `${words.quarterBefore || ""} ${nextHourWord}`;
        if (mm < 30)
          return `${minutes[mm] || mm} ${words.over || ""} ${hourWord}`;
        return `${minutes[60 - mm] || 60 - mm} ${
          words.before || ""
        } ${nextHourWord}`;

      case "germanic": // 🇩🇪 🇳🇱
        if (mm === 0) return `${hourWord} ${words.hour || ""}`;
        if (mm === 15) return `${words.quarterOver || ""} ${hourWord}`;
        if (mm === 30) return `${words.half || ""} ${nextHourWord}`;
        if (mm === 45) return `${words.quarterBefore || ""} ${nextHourWord}`;
        if (mm < 30)
          return `${minutes[mm] || mm} ${words.over || ""} ${hourWord}`;
        return `${minutes[60 - mm] || 60 - mm} ${
          words.before || ""
        } ${nextHourWord}`;

      case "latin": // 🇫🇷 🇵🇹 🇬🇧
        if (mm === 0) return `${hourWord} ${words.hour || ""}`;
        if (mm === 15) return `${hourWord} ${words.quarterOver || ""}`;
        if (mm === 30) return `${hourWord} ${words.half || ""}`;
        if (mm === 45) return `${hourWord} ${words.quarterBefore || ""}`;
        if (mm < 30) return `${hourWord} ${minutes[mm] || mm}`;
        return `${hourWord} ${words.before || ""} ${
          minutes[60 - mm] || 60 - mm
        }`;

      case "arabic": // 🇦🇪
        if (mm === 0) return `${hourWord} ${words.hour || ""}`;
        if (mm === 15) return `${hourWord} ${words.quarterOver || ""}`;
        if (mm === 30) return `${hourWord} ${words.half || ""}`;
        if (mm === 45) return `${nextHourWord} ${words.quarterBefore || ""}`;
        if (mm < 30) return `${hourWord} و${minutes[mm] || mm}`;
        return `${nextHourWord} ${words.before || ""} ${
          minutes[60 - mm] || 60 - mm
        }`;

      case "turkic": // 🇹🇷
        if (mm === 0) return `${hourWord} ${words.hour || ""}`;
        if (mm === 15) return `${hourWord} ${words.quarterOver || ""}`;
        if (mm === 30) return `${hourWord} ${words.half || ""}`;
        if (mm === 45) return `${hourWord} ${words.quarterBefore || ""}`;
        if (mm < 30)
          return `${hourWord} ${minutes[mm] || mm} ${words.over || ""}`;
        return `${hourWord} ${minutes[60 - mm] || 60 - mm} ${
          words.before || ""
        }`;

      default: // fallback
        if (mm === 0) return `${hourWord} ${words.hour || ""}`;
        if (mm === 30) return `${words.half || ""} ${nextHourWord}`;
        if (mm < 30)
          return `${minutes[mm] || mm} ${words.over || ""} ${hourWord}`;
        return `${minutes[60 - mm] || 60 - mm} ${
          words.before || ""
        } ${nextHourWord}`;
    }
  }

  return {
    ALLOWED_LANGS,
    deepMerge,
    parseTimeInput,
    generateRandomTimeString,
    getTimePhrase,
    capitalize,
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
      mobile: {},
      desktop: {},
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
      if (!resp.ok) return utils.deepMerge(DEFAULT_CONFIG, {});
      const json = await resp.json();
      return utils.deepMerge(DEFAULT_CONFIG, json);
    } catch (e) {
      return utils.deepMerge(DEFAULT_CONFIG, {});
    }
  }

  function selectPlatformDefaults(defs) {
    const isMobile = /Mobi|Android|iPhone|iPad|Windows Phone|IEMobile/i.test(
      navigator.userAgent || ""
    );
    const platformSettings = isMobile
      ? defs?.mobile || {}
      : defs?.desktop || {};
    return utils.deepMerge(
      DEFAULT_CONFIG.DEFAULT_SETTINGS.desktop,
      platformSettings
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

function createTimeDictLoader({ config }) {
  const PATH = config.PATHS.TIME_DICTS_DIR;
  let dicts = {};

  async function loadDict(code) {
    try {
      const res = await fetch(`${PATH}/${code}_vocab.json`, {
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
    const langs = Array.isArray(allowed)
      ? allowed
      : config.DEFAULT_CONFIG
      ? Object.keys(config.DEFAULT_CONFIG.DEFAULT_SETTINGS)
      : ["en"];
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
  const canUseLocal = Boolean(
    config.DEFAULT_CONFIG?.USE_LOCAL_STORAGE ||
      config.FALLBACK?.USE_LOCAL_STORAGE
  );

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
        const v = localStorage.getItem(KEY);
        return v ? JSON.parse(v) : null;
      } catch (e) {
        return null;
      }
    },
    remove() {
      try {
        localStorage.removeItem(KEY);
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
    defaultsActive = { ...defaultsActive, ...defs };
  }

  function setSettings(s) {
    current = { ...current, ...s };
    bus.emit(EventTypes.CONFIG_LOADED, current);
  }

  function getSettings() {
    return { ...current };
  }

  function saveSettings(s) {
    Storage.save(s);
  }

  function loadSettingsFromLocal() {
    const raw = {};
    const merged = { ...defaultsActive };
    try {
      const saved = Storage.load();
      if (saved) Object.assign(merged, saved);
      return { raw, merged };
    } catch (e) {
      return { raw, merged };
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
    return defaultsActive;
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

function createVoices({ bus }) {
  let voices = [];
  let availableLanguages = [];

  function computeAvailableLanguages() {
    availableLanguages = Array.from(
      new Set(
        (voices || []).map((v) =>
          ((v.lang || "").split(/[-_]/)[0] || "").toUpperCase()
        )
      )
    ).sort();
    if (!availableLanguages.includes("ALL")) availableLanguages.unshift("ALL");
  }

  function publish(evt) {
    const lightweight = (voices || []).map((v) => ({
      name: v.name,
      lang: v.lang,
    }));
    bus.emit(evt, {
      voices: lightweight,
      availableLanguages: availableLanguages.slice(),
    });
  }

  function collect() {
    voices = speechSynthesis.getVoices() || [];
    computeAvailableLanguages();
    publish(EventTypes.VOICES_CHANGED);
  }

  async function load() {
    collect();
    if (!voices.length) {
      try {
        speechSynthesis.speak(new SpeechSynthesisUtterance(""));
        await new Promise((r) => setTimeout(r, 250));
        collect();
      } catch (e) {}
    }
    publish(EventTypes.VOICES_LOADED);
  }

  if ("onvoiceschanged" in speechSynthesis) {
    speechSynthesis.onvoiceschanged = () => collect();
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
  let getVoices = () =>
    typeof voicesProvider === "function" ? voicesProvider() : [];
  let getSettings = () =>
    typeof settingsProvider === "function" ? settingsProvider() : {};

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
      const byFull = all.find(
        (v) => (v.lang || "").toLowerCase() === desiredLang
      );
      if (byFull) return byFull;
      const base = desiredLang.split(/[-_]/)[0];
      if (base) {
        const byBase = all.find(
          (v) => ((v.lang || "").split(/[-_]/)[0] || "").toLowerCase() === base
        );
        if (byBase) return byBase;
      }
    }
    const navBase = (navigator.language || "").split(/[-_]/)[0];
    if (navBase) {
      const nav = all.find((v) =>
        (v.lang || "").toLowerCase().startsWith(navBase)
      );
      if (nav) return nav;
    }
    return all[0] || null;
  }

  async function speakAsync(text, opts = {}) {
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
      utter.rate =
        Number(settings.rate ?? settings.speed) > 0
          ? Number(settings.rate ?? settings.speed)
          : 1.0;
      utter.pitch = Number(settings.pitch) > 0 ? Number(settings.pitch) : 1.0;
      utter.volume =
        Number(settings.volume) >= 0 && Number(settings.volume) <= 1
          ? Number(settings.volume)
          : 1.0;
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
    if (typeof obj === "string")
      return speakAsync(obj).catch((e) => console.warn("speak failed", e));
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
      if (
        "speechSynthesis" in window &&
        (speechSynthesis.speaking || speechSynthesis.pending)
      )
        speechSynthesis.cancel();
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
    randomBtnEls: document.querySelectorAll(".random-btn"),
    speakBtnEls: document.querySelectorAll(".speak-btn"),
    timeInputEls: document.querySelectorAll(".time-input"),
    clockContainerEls: document.querySelectorAll(".clock-container"),
    developerBlockEl: document.getElementById("developer"),
  };

  function disableSpeakButtons(disable) {
    els.speakBtnEls.forEach((b) => b && (b.disabled = disable));
  }

  function toggleControls(enabled) {
    if (els.speedSelectEl) els.speedSelectEl.disabled = !enabled;
    if (els.delaySelectEl) els.delaySelectEl.disabled = !enabled;
    document
      .querySelectorAll('label[for="speedSelect"],label[for="delaySelect"]')
      .forEach((l) => l.classList.toggle("disabled", !enabled));
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
    document
      .querySelectorAll(".speak-btn")
      .forEach((b) => (b.title = texts.speakBtnTitle || ""));
    document
      .querySelectorAll(".random-btn")
      .forEach((b) => (b.title = texts.randomBtnTitle || ""));
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
    const setOrBlank = (sel, cand, fallback) => {
      if (!sel) return;
      const hasOpt = (val) =>
        Array.from(sel.options).some((o) => String(o.value) === String(val));
      if (cand !== undefined && hasOpt(cand)) sel.value = String(cand);
      else if (preferBlankForInvalid) sel.value = "";
      else if (fallback !== undefined && hasOpt(fallback))
        sel.value = String(fallback);
    };
    setOrBlank(els.uiLangSelectEl, raw.uiLang ?? s.uiLang, s.uiLang);
    setOrBlank(els.speedSelectEl, raw.speed ?? s.speed, s.speed);
    setOrBlank(els.delaySelectEl, raw.delay ?? s.delay, s.delay);
    const effectiveLang =
      els.uiLangSelectEl?.value ||
      s.uiLang ||
      store.getDefaultActive().uiLang ||
      config.FALLBACK?.uiLang;
    translateUI(effectiveLang);
  }

  function readSettingsFromUI() {
    const base = {
      uiLang: els.uiLangSelectEl?.value,
      speed: els.speedSelectEl?.value,
      delay: els.delaySelectEl?.value,
    };
    const defaults = store.getDefaultActive ? store.getDefaultActive() : {};
    const allowedOpt = (sel, val) =>
      sel &&
      Array.from(sel.options).some((opt) => String(opt.value) === String(val));
    return {
      uiLang:
        base.uiLang &&
        utils.ALLOWED_LANGS.includes(base.uiLang) &&
        allowedOpt(els.uiLangSelectEl, base.uiLang)
          ? base.uiLang
          : defaults.uiLang,
      speed:
        !isNaN(parseFloat(base.speed)) &&
        allowedOpt(els.speedSelectEl, base.speed)
          ? base.speed
          : defaults.speed,
      delay:
        !isNaN(parseInt(base.delay, 10)) &&
        allowedOpt(els.delaySelectEl, base.delay)
          ? base.delay
          : defaults.delay,
      fullscreen: defaults.fullscreen,
      languageCode: defaults.languageCode,
      voiceName: defaults.voiceName,
    };
  }

  function setDeveloperVisibility(appCfg) {
    const devMode =
      appCfg?.DEVELOPER_MODE ??
      config.DEFAULT_CONFIG.DEVELOPER_MODE ??
      config.FALLBACK?.DEVELOPER_MODE;
    if (els.developerBlockEl)
      els.developerBlockEl.style.display = devMode ? "" : "none";
  }

  function updateStartPauseBtnTo(state) {
    if (state === "start")
      setBtnText(els.startPauseBtnEl, window.btnStates.start);
    else if (state === "stop")
      setBtnText(els.startPauseBtnEl, window.btnStates.stop);
    else if (state === "cont")
      setBtnText(els.startPauseBtnEl, window.btnStates.cont);
  }

  function updateControlsAvailability() {
    const flags = store.playbackFlags();
    const activeBtn = store.getCurrentSpeakButton();
    const activeIdx = flags.sequenceIndex;
    els.speakBtnEls.forEach((btn, idx) => {
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
    toggleControls(!(flags.isSequenceMode && !flags.isPaused));
    if (els.resetBtnEl) els.resetBtnEl.disabled = !flags.isPaused;
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
          const phrase = utils.getTimePhrase(
            store.getSettings().languageCode,
            timeStr
          );
          if (!phrase) {
            alert(window.alertTexts.invalidPhrase);
            return;
          }
          bus.emit(EventTypes.UI_SPEAK_SINGLE, {
            phrase,
            rate: parseFloat(
              els.speedSelectEl?.value || store.getDefaultActive().speed
            ),
            button: speakBtn,
          });
        });
    });
    els.fillRandomBtnEl?.addEventListener("click", () => {
      els.timeInputEls.forEach((inp, idx) => {
        const flags = store.playbackFlags();
        if (
          (flags.isSequenceMode || flags.isPaused) &&
          idx === flags.sequenceIndex
        )
          return;
        inp.value = utils.generateRandomTimeString();
      });
      bus.emit(EventTypes.UPDATE_CONTROLS);
    });
    els.resetSettingsBtnEl?.addEventListener("click", () =>
      bus.emit(EventTypes.SETTINGS_RESET_TO_DEFAULTS)
    );
    els.uiLangSelectEl?.addEventListener("change", (e) => {
      bus.emit(EventTypes.UI_TRANSLATE, { lang: e.target.value });
      bus.emit(EventTypes.SETTINGS_APPLY_TO_UI, { saveFromUI: true });
    });
    els.speedSelectEl?.addEventListener("change", () =>
      bus.emit(EventTypes.SETTINGS_APPLY_TO_UI, { saveFromUI: true })
    );
    els.delaySelectEl?.addEventListener("change", () =>
      bus.emit(EventTypes.SETTINGS_APPLY_TO_UI, { saveFromUI: true })
    );
    els.resetBtnEl?.addEventListener("click", () =>
      bus.emit(EventTypes.PLAYBACK_STOP)
    );
    els.startPauseBtnEl?.addEventListener("click", () => {
      const flags = store.playbackFlags();
      if (flags.isSequenceMode && !flags.isPaused) {
        bus.emit(EventTypes.PLAYBACK_PAUSE);
      } else if (flags.isSequenceMode && flags.isPaused) {
        bus.emit(EventTypes.PLAYBACK_CONTINUE);
      } else bus.emit(EventTypes.PLAYBACK_START, { index: 0 });
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
    bus.on(EventTypes.VOICES_CHANGED, () => updateControlsAvailability);
    bus.on(EventTypes.VOICES_LOADED, () => updateControlsAvailability);
  }

  function init() {
    bindHandlers();
    const allEmpty = Array.from(els.timeInputEls || []).every(
      (inp) => !(inp.value && inp.value.trim())
    );
    if (allEmpty) els.fillRandomBtnEl?.click();
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
    const rate = parseFloat(
      ui.els.speedSelectEl?.value || store.getDefaultActive().speed
    );
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
    ui.els.speakBtnEls.forEach((b, idx) => {
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
    const phrase = utils.getTimePhrase(
      store.getSettings().languageCode,
      timeStr
    );
    if (!phrase) return next(index);
    const speakBtn = inp?.parentElement?.querySelector(".speak-btn") || null;
    speakPhrase(phrase, speakBtn, () => scheduleNext(index));
  }

  function scheduleNext(index) {
    if (store.playbackFlags().isPaused) return;
    const delayMs = parseInt(
      ui.els.delaySelectEl?.value || store.getDefaultActive().delay,
      10
    );
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
    speaker
      .speakAsync(String(phrase), {
        rate,
        languageCode: store.getSettings().languageCode,
        voiceName: store.getSettings().voiceName,
        button,
        interrupt,
      })
      .catch((e) => console.warn("single speak failed", e));
  }

  bus.on(EventTypes.PLAYBACK_START, ({ index = 0 } = {}) => {
    playAt(index);
  });
  bus.on(EventTypes.PLAYBACK_PAUSE, () => {
    pause();
  });
  bus.on(EventTypes.PLAYBACK_CONTINUE, () => {
    resume();
  });
  bus.on(EventTypes.PLAYBACK_STOP, () => {
    stop();
  });
  bus.on(EventTypes.UI_SPEAK_SINGLE, (payload) => handleSinglePlay(payload));

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

  const timeDictLoader = createTimeDictLoader({ config });
  await timeDictLoader.loadAll(utilsStub.ALLOWED_LANGS);

  const utils = createUtils(timeDictLoader);

  const langLoader = createLangLoader({ config, utils });
  const store = createStore({ bus, config, utils });
  const wakeLock = createWakeLock({ bus });
  const voices = createVoices({ bus });
  const speaker = createSpeaker({
    bus,
    voicesProvider: () => voices.getVoices(),
    settingsProvider: () => store.getSettings(),
  });
  const ui = createUI({ bus, store, config, langLoader, utils });
  const playback = createPlayback({ bus, store, ui, speaker, utils, wakeLock });

  window.app = {
    bus,
    utils,
    config,
    langLoader,
    store,
    wakeLock,
    voices,
    speaker,
    ui,
    playback,
  };

  bus.emit(EventTypes.APP_INIT);
})();
