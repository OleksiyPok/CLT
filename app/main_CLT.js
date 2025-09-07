"use strict";

const EventTypes = Object.freeze({
  APP_INIT: "app:init",
  CONFIG_LOADED: "app:config:loaded",
  SETTINGS_APPLY_TO_UI: "settings:applyToUI",
  SETTINGS_SAVE: "settings:save",
  SETTINGS_RESET_TO_DEFAULTS: "settings:resetToDefaults",
  UI_TRANSLATE: "ui:translate",
  UI_RANDOM_FILL_ALL: "ui:random:fillAll",
  UI_SPEAK_SINGLE: "ui:speak:single",
  SPEAK_SINGLE_START: "ui:speak:single:start",
  SPEAK_SINGLE_STOP: "ui:speak:single:stop",
  PLAYBACK_START: "playback:start",
  PLAYBACK_PAUSE: "playback:pause",
  PLAYBACK_CONTINUE: "playback:continue",
  PLAYBACK_STOP: "playback:stop",
  PLAYBACK_FINISH: "playback:finish",
  UPDATE_CONTROLS: "ui:updateControls",
  SPEECH_START: "speech:start",
  SPEECH_END: "speech:end",
  VOICES_CHANGED: "voices:changed",
  VOICES_LOADED: "voices:loaded",
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
      const subs = [...(map.get(event) || [])];
      for (const fn of subs) {
        if (typeof fn !== "function") continue;
        try {
          fn(payload);
        } catch (e) {
          console.warn("EventBus handler error", event, e);
        }
      }
    },
  };
}

function createUtils() {
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
    const h = String(parseInt(m[1], 10));
    const min = m[2].padStart(2, "0");
    return `${h}:${min}`;
  }
  function generateRandomTimeString() {
    const h = Math.floor(Math.random() * 24);
    const m = Math.floor(Math.random() * 12) * 5;
    return `${h}:${String(m).padStart(2, "0")}`;
  }
  function getDutchTimeString(timeStr) {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return "";
    if (typeof dutchVocab === "undefined")
      return `${h}:${String(m).padStart(2, "0")}`;
    const hourNames = dutchVocab.hourNames || [];
    const minuteNames = dutchVocab.minuteNames || [];
    const nextHour = (h + 1) % 24;
    const idx = h % 12;
    const nextIdx = nextHour % 12;
    if (m === 0) return `${capitalize(hourNames[idx] || h)} uur`;
    if (m === 15) return `Kwart over ${hourNames[idx] || h}`;
    if (m === 30) return `Half ${hourNames[nextIdx] || nextHour}`;
    if (m === 45) return `Kwart voor ${hourNames[nextIdx] || nextHour}`;
    if (m < 15) return `${minuteNames[m] || m} over ${hourNames[idx] || h}`;
    if (m < 30)
      return `${minuteNames[30 - m] || 30 - m} voor half ${
        hourNames[nextIdx] || nextHour
      }`;
    if (m < 45)
      return `${minuteNames[m - 30] || m - 30} over half ${
        hourNames[nextIdx] || nextHour
      }`;
    return `${minuteNames[60 - m] || 60 - m} voor ${
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
}

function createConfig(utils) {
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
      if (!resp.ok) return utils.deepMerge(DEFAULT_CONFIG, {});
      const json = await resp.json();
      return utils.deepMerge(DEFAULT_CONFIG, json);
    } catch (err) {
      return utils.deepMerge(DEFAULT_CONFIG, {});
    }
  }
  function selectPlatformDefaults(defs) {
    const isMobile = /Mobi|Android|iPhone|iPad|Windows Phone|IEMobile/i.test(
      navigator.userAgent
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

function createLangLoader({ config }) {
  const PATH = config?.PATHS?.UI_TEXTS_DIR || "./assets/locales";
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
      if (!json || typeof json !== "object") throw new Error("Invalid JSON");
      return json;
    } catch (err) {
      return null;
    }
  }
  async function loadAll(langs) {
    texts = {};
    await Promise.all(
      langs.map(async (code) => {
        const data = await loadLang(code);
        if (data) texts[code] = data;
      })
    );
    if (!texts.en) texts.en = FALLBACK_EN;
    return texts;
  }
  const getTexts = (lang) => texts[lang] || texts.en || FALLBACK_EN;
  return { loadAll, getTexts };
}

function createStore({ bus, config, utils }) {
  const SETTINGS_KEY = "CLT_settings";
  let appConfig = {};
  let defaultActive = {};
  let currentSettings = {};
  let flags = {
    isSpeaking: false,
    isSequenceMode: false,
    isPaused: false,
    sequenceIndex: 0,
  };
  let sequenceTimeoutId = null;
  let currentSpeakButton = null;
  let utterance = null;
  const setAppConfig = (cfg) => (appConfig = cfg || {});
  const getAppConfig = () => appConfig;
  const setDefaultActive = (d) => (defaultActive = d || {});
  const getDefaultActive = () => defaultActive;
  const setSettings = (s) => (currentSettings = s || {});
  const getSettings = () => currentSettings;
  const playbackFlags = () => ({ ...flags });
  const setPlaybackFlags = (patch) => (flags = { ...flags, ...patch });
  const getSequenceTimeout = () => sequenceTimeoutId;
  const setSequenceTimeout = (id) => (sequenceTimeoutId = id);
  const clearSequenceTimeout = () => {
    if (sequenceTimeoutId) {
      clearTimeout(sequenceTimeoutId);
      sequenceTimeoutId = null;
    }
  };
  const getCurrentSpeakButton = () => currentSpeakButton;
  const setCurrentSpeakButton = (b) => (currentSpeakButton = b);
  const getUtterance = () => utterance;
  const setUtterance = (u) => (utterance = u);
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
    out.uiLang =
      stored?.uiLang &&
      utils.ALLOWED_LANGS.includes(stored.uiLang) &&
      allowed(uiLangSelectEl, stored.uiLang)
        ? stored.uiLang
        : defaults?.uiLang ?? config.FALLBACK.uiLang;
    out.delay = (() => {
      const v = stored?.delay;
      const n = parseInt(v, 10);
      if (!isNaN(n) && allowed(delaySelectEl, String(n))) return String(n);
      return defaults?.delay ?? config.FALLBACK.delay;
    })();
    out.speed = (() => {
      const v = stored?.speed;
      const n = parseFloat(v);
      if (!isNaN(n) && allowed(speedSelectEl, String(v))) return String(v);
      return defaults?.speed ?? config.FALLBACK.speed;
    })();
    out.fullscreen =
      stored?.fullscreen ?? defaults?.fullscreen ?? config.FALLBACK.fullscreen;
    out.languageCode =
      stored?.languageCode ??
      defaults?.languageCode ??
      config.FALLBACK.languageCode;
    out.voiceName =
      stored?.voiceName ?? defaults?.voiceName ?? config.FALLBACK.voiceName;
    return out;
  }
  function saveSettings(s, els) {
    const toSave = mergeWithDefaults(s || {}, defaultActive || {}, els);
    currentSettings = toSave;
    const useLocal =
      appConfig?.USE_LOCAL_STORAGE ?? config.DEFAULT_CONFIG.USE_LOCAL_STORAGE;
    if (useLocal && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));
      } catch (_) {}
    }
    bus.emit(EventTypes.SETTINGS_SAVE, toSave);
  }
  function loadSettingsFromLocal(els) {
    const useLocal =
      appConfig?.USE_LOCAL_STORAGE ?? config.DEFAULT_CONFIG.USE_LOCAL_STORAGE;
    if (useLocal && typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const merged = mergeWithDefaults(parsed, defaultActive || {}, els);
          return { raw: parsed, merged };
        }
      } catch (_) {}
    }
    return { raw: {}, merged: mergeWithDefaults({}, defaultActive || {}, els) };
  }
  return {
    setAppConfig,
    getAppConfig,
    setDefaultActive,
    getDefaultActive,
    setSettings,
    getSettings,
    playbackFlags,
    setPlaybackFlags,
    getSequenceTimeout,
    setSequenceTimeout,
    clearSequenceTimeout,
    getCurrentSpeakButton,
    setCurrentSpeakButton,
    getUtterance,
    setUtterance,
    saveSettings,
    loadSettingsFromLocal,
  };
}

function createVoices({ bus }) {
  let voices = [];
  let availableLanguages = [];
  function computeAvailableLanguages() {
    availableLanguages = Array.from(
      new Set(
        voices
          .map((v) => (v.lang || "").split("-")[0].toUpperCase())
          .filter(Boolean)
      )
    ).sort();
    if (!availableLanguages.includes("ALL")) availableLanguages.push("ALL");
  }
  function collectVoices() {
    voices = speechSynthesis.getVoices() || [];
    computeAvailableLanguages();
    bus.emit(EventTypes.VOICES_CHANGED, {
      voices: voices.slice(),
      availableLanguages: availableLanguages.slice(),
    });
  }
  async function loadVoices() {
    collectVoices();
    if (!voices.length) {
      speechSynthesis.speak(new SpeechSynthesisUtterance(""));
      await new Promise((r) => setTimeout(r, 250));
      collectVoices();
    }
    bus.emit(EventTypes.VOICES_LOADED, {
      voices: voices.slice(),
      availableLanguages: availableLanguages.slice(),
    });
  }
  if ("onvoiceschanged" in speechSynthesis)
    speechSynthesis.onvoiceschanged = collectVoices;
  return { loadVoices, getVoices: () => voices.slice() };
}

function createSpeaker({ bus, voicesProvider, settingsProvider }) {
  let currentUtterance = null;
  function selectVoice(allVoices, settings) {
    if (!allVoices || !allVoices.length) return null;
    const desiredName = String(settings.voiceName || "").trim();
    const desiredLang = String(settings.languageCode || "")
      .trim()
      .toLowerCase();
    if (desiredName) {
      let exact = allVoices.find((v) => v.name === desiredName);
      if (exact) return exact;
      const norm = (n) =>
        String(n || "")
          .trim()
          .toLowerCase();
      let partial = allVoices.find((v) =>
        norm(v.name).includes(norm(desiredName))
      );
      if (partial) return partial;
    }
    if (desiredLang) {
      const langFull = desiredLang;
      let byFull = allVoices.find(
        (v) => (v.lang || "").toLowerCase() === langFull
      );
      if (byFull) return byFull;
      const base = langFull.split(/[-_]/)[0];
      if (base) {
        let byBase = allVoices.find((v) =>
          (v.lang || "").toLowerCase().startsWith(base)
        );
        if (byBase) return byBase;
      }
    }
    const navigatorBase = (navigator.language || "").split(/[-_]/)[0];
    if (navigatorBase) {
      const navMatch = allVoices.find((v) =>
        (v.lang || "").toLowerCase().startsWith(navigatorBase)
      );
      if (navMatch) return navMatch;
    }
    return allVoices[0] || null;
  }
  async function speakAsync(text, options = {}) {
    if (!text) return;
    const allVoices =
      (typeof voicesProvider === "function" ? voicesProvider() : []) || [];
    const settings =
      (typeof settingsProvider === "function" ? settingsProvider() : {}) || {};
    const s = { ...settings, ...options };
    if (options.interrupt !== false) speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(String(text));
    const chosen = selectVoice(allVoices, s);
    if (chosen) {
      try {
        utter.voice = chosen;
        utter.lang = chosen.lang || s.languageCode || utter.lang || "";
      } catch (e) {
        if (s.languageCode) utter.lang = s.languageCode;
      }
    } else {
      if (s.languageCode) utter.lang = s.languageCode;
    }
    const rate =
      Number.isFinite(Number(s.rate ?? s.speed)) &&
      Number(s.rate ?? s.speed) > 0
        ? Number(s.rate ?? s.speed)
        : 1.0;
    const pitch =
      Number.isFinite(Number(s.pitch)) && Number(s.pitch) > 0
        ? Number(s.pitch)
        : 1.0;
    const volume =
      Number.isFinite(Number(s.volume)) &&
      Number(s.volume) >= 0 &&
      Number(s.volume) <= 1
        ? Number(s.volume)
        : 1.0;
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = volume;
    return new Promise((resolve) => {
      const done = () => {
        currentUtterance = null;
        bus.emit(EventTypes.SPEECH_END, { button: options.button || null });
        resolve();
      };
      utter.onend = done;
      utter.onerror = done;
      currentUtterance = utter;
      bus.emit(EventTypes.SPEECH_START, { button: options.button || null });
      speechSynthesis.speak(utter);
    });
  }
  function speak(obj) {
    if (!obj || typeof obj !== "object") return;
    const { text, rate = 1, lang = "nl-NL", button = null } = obj;
    speakAsync(text, {
      rate,
      languageCode: lang,
      speed: rate,
      voiceName: obj.voiceName,
      pitch: obj.pitch,
      volume: obj.volume,
      button,
    }).catch((e) => console.warn("speak failed", e));
  }
  function cancel() {
    if (speechSynthesis.speaking || speechSynthesis.pending)
      speechSynthesis.cancel();
    if (currentUtterance) {
      bus.emit(EventTypes.SPEECH_END, { button: null });
      currentUtterance = null;
    }
  }
  function pause() {
    try {
      speechSynthesis.pause();
    } catch (_) {}
  }
  function resume() {
    try {
      speechSynthesis.resume();
    } catch (_) {}
  }
  function isSpeaking() {
    return speechSynthesis.speaking;
  }
  function isPaused() {
    return speechSynthesis.paused;
  }
  return { speak, speakAsync, cancel, pause, resume, isSpeaking, isPaused };
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
  function updateButtonIcon(activeButton = null) {
    const flags = store.playbackFlags();
    els.speakBtnEls.forEach((b) => b && (b.textContent = PLAY_ICON));
    if (flags.isSpeaking && activeButton) activeButton.textContent = STOP_ICON;
  }
  const setBtnText = (btn, text) => btn && (btn.textContent = text);
  function translateUI(lang) {
    const texts = langLoader?.getTexts?.(lang);
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
    document
      .querySelectorAll(".speak-btn")
      .forEach((btn) => (btn.title = texts.speakBtnTitle || ""));
    document
      .querySelectorAll(".random-btn")
      .forEach((btn) => (btn.title = texts.randomBtnTitle || ""));
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
    const setOrBlank = (sel, candidate, fallback) => {
      if (!sel) return;
      const hasOpt = (val) =>
        Array.from(sel.options).some((o) => String(o.value) === String(val));
      if (candidate !== undefined && hasOpt(candidate))
        sel.value = String(candidate);
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
      config.FALLBACK.uiLang;
    translateUI(effectiveLang);
  }
  function readSettingsFromUI() {
    const base = {
      uiLang: els.uiLangSelectEl?.value,
      speed: els.speedSelectEl?.value,
      delay: els.delaySelectEl?.value,
    };
    const defaults = store.getDefaultActive() || {};
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
      config.FALLBACK.DEVELOPER_MODE;
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
  els.fillRandomBtnEl?.addEventListener("click", () => {
    const { isPaused, sequenceIndex } = store.playbackFlags();
    els.timeInputEls.forEach((inp, idx) => {
      if (
        (store.playbackFlags().isSequenceMode || isPaused) &&
        idx === sequenceIndex
      )
        return;
      inp.value = utils.generateRandomTimeString();
    });
    bus.emit(EventTypes.UPDATE_CONTROLS);
  });
  bus.on(EventTypes.UPDATE_CONTROLS, updateControlsAvailability);
  function bindHandlers() {
    els.clockContainerEls.forEach((group) => {
      const rndBtn = group.querySelector(".random-btn");
      const input = group.querySelector(".time-input");
      const speakBtn = group.querySelector(".speak-btn");
      if (rndBtn && input) {
        rndBtn.addEventListener("click", () => {
          input.value = utils.generateRandomTimeString();
          bus.emit(EventTypes.UPDATE_CONTROLS);
        });
      }
      if (speakBtn && input) {
        speakBtn.addEventListener("click", () => {
          const { isSpeaking } = store.playbackFlags();
          if (isSpeaking) return bus.emit(EventTypes.PLAYBACK_STOP);
          const raw = input.value?.trim() || "";
          const timeStr = utils.parseTimeInput(raw);
          if (!timeStr) return alert(window.alertTexts.invalidFormat);
          const phrase = utils.getDutchTimeString(timeStr);
          if (!phrase) return alert(window.alertTexts.invalidPhrase);
          els.timeInputEls.forEach((inp) => inp?.classList.remove("highlight"));
          input.classList.add("highlight");
          const rate = parseFloat(
            els.speedSelectEl?.value || store.getDefaultActive().speed
          );
          bus.emit(EventTypes.UI_SPEAK_SINGLE, {
            phrase,
            rate,
            button: speakBtn,
          });
        });
      }
    });
    els.startPauseBtnEl?.addEventListener("click", () => {
      const f = store.playbackFlags();
      if (!f.isSequenceMode) {
        setPlaybackStartForSequence();
        return;
      }
      if (f.isSequenceMode && !f.isPaused) {
        setPlaybackPauseForSequence();
        return;
      }
      if (f.isSequenceMode && f.isPaused) {
        setPlaybackContinueForSequence();
        return;
      }
    });
    function setPlaybackStartForSequence() {
      store.setPlaybackFlags({
        isSequenceMode: true,
        isPaused: false,
        sequenceIndex: 0,
      });
      bus.emit(EventTypes.UPDATE_CONTROLS);
      bus.emit(EventTypes.PLAYBACK_START, { index: 0 });
      updateStartPauseBtnTo("stop");
      toggleControls(false);
    }
    function setPlaybackPauseForSequence() {
      store.setPlaybackFlags({ isPaused: true });
      bus.emit(EventTypes.UPDATE_CONTROLS);
      bus.emit(EventTypes.PLAYBACK_PAUSE);
      updateStartPauseBtnTo("cont");
      toggleControls(true);
    }
    function setPlaybackContinueForSequence() {
      const f = store.playbackFlags();
      store.setPlaybackFlags({ isPaused: false });
      bus.emit(EventTypes.UPDATE_CONTROLS);
      bus.emit(EventTypes.PLAYBACK_CONTINUE, { index: f.sequenceIndex || 0 });
      updateStartPauseBtnTo("stop");
      toggleControls(false);
    }
    els.resetBtnEl?.addEventListener("click", () =>
      bus.emit(EventTypes.PLAYBACK_STOP)
    );
    els.speedSelectEl?.addEventListener("change", () =>
      bus.emit(EventTypes.SETTINGS_APPLY_TO_UI, { saveFromUI: true })
    );
    els.delaySelectEl?.addEventListener("change", () =>
      bus.emit(EventTypes.SETTINGS_APPLY_TO_UI, { saveFromUI: true })
    );
    els.uiLangSelectEl?.addEventListener("change", (e) => {
      bus.emit(EventTypes.UI_TRANSLATE, { lang: e.target.value });
      bus.emit(EventTypes.SETTINGS_APPLY_TO_UI, { saveFromUI: true });
    });
    els.resetSettingsBtnEl?.addEventListener("click", () =>
      bus.emit(EventTypes.SETTINGS_RESET_TO_DEFAULTS)
    );
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
  };
}

function createPlayback({ bus, store, ui, speaker }) {
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
    ui.updateButtonIcon(btn);
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
    const timeStr = window.utils.parseTimeInput(raw);
    if (!timeStr) return next(index);
    const phrase = window.utils.getDutchTimeString(timeStr);
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
      window.speechSynthesis.cancel();
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
  function cont() {
    const i = store.playbackFlags().sequenceIndex || 0;
    store.setPlaybackFlags({ isPaused: false });
    bus.emit(EventTypes.UPDATE_CONTROLS);
    playAt(i);
    ui.updateStartPauseBtnTo("stop");
    ui.toggleControls(false);
  }
  bus.on(EventTypes.PLAYBACK_START, ({ index }) => playAt(index || 0));
  bus.on(EventTypes.PLAYBACK_STOP, stop);
  bus.on(EventTypes.PLAYBACK_PAUSE, pause);
  bus.on(EventTypes.PLAYBACK_CONTINUE, cont);
  return { playAt, stop, pause, cont };
}

(async function bootstrap() {
  const bus = createEventBus();
  const utils = createUtils();
  const config = createConfig(utils);
  const langLoader = createLangLoader({ config });
  const store = createStore({ bus, config, utils });
  const voices = createVoices({ bus });
  const ui = createUI({ bus, store, config, langLoader, utils });
  const speaker = createSpeaker({
    bus,
    voicesProvider: () => (voices.getVoices ? voices.getVoices() : []),
    settingsProvider: () => (store.getSettings ? store.getSettings() : {}),
  });
  window.utils = utils;
  const appCfg = await config.loadExternal();
  store.setAppConfig(appCfg);
  const platformDefaults = config.selectPlatformDefaults(
    appCfg.DEFAULT_SETTINGS
  );
  store.setDefaultActive(platformDefaults);
  await langLoader.loadAll(utils.ALLOWED_LANGS);
  ui.setDeveloperVisibility(appCfg);
  const { raw, merged } = store.loadSettingsFromLocal(ui.els);
  store.setSettings(merged);
  ui.applySettingsToUI(merged, { raw });
  await voices.loadVoices();
  ui.bindHandlers();
  const playback = createPlayback({ bus, store, ui, speaker });
  [
    EventTypes.SPEECH_START,
    EventTypes.SPEECH_END,
    EventTypes.PLAYBACK_START,
    EventTypes.PLAYBACK_PAUSE,
    EventTypes.PLAYBACK_CONTINUE,
    EventTypes.PLAYBACK_STOP,
  ].forEach((ev) => bus.on(ev, () => ui.updateControlsAvailability()));
  ui.els.fillRandomBtnEl?.click();
  bus.on(EventTypes.UI_TRANSLATE, ({ lang }) => ui.translateUI(lang));
  bus.on(EventTypes.SETTINGS_APPLY_TO_UI, ({ saveFromUI }) => {
    const s = ui.readSettingsFromUI();
    store.setSettings(s);
    if (saveFromUI) store.saveSettings(s, ui.els);
  });
  bus.on(EventTypes.SETTINGS_RESET_TO_DEFAULTS, () => {
    const defs = store.getDefaultActive();
    store.setSettings(defs);
    ui.applySettingsToUI(defs);
    store.saveSettings(defs, ui.els);
  });
  bus.on(EventTypes.UI_SPEAK_SINGLE, ({ phrase, rate, button }) => {
    speaker.speak({
      text: phrase,
      rate,
      lang: store.getSettings().languageCode,
      button,
    });
  });
  bus.on(EventTypes.SPEECH_START, ({ button }) => {
    store.setPlaybackFlags({ isSpeaking: true });
    store.setCurrentSpeakButton(button);
    ui.updateControlsAvailability();
    ui.updateButtonIcon(button);
  });
  bus.on(EventTypes.SPEECH_END, () => {
    store.setPlaybackFlags({ isSpeaking: false });
    store.setCurrentSpeakButton(null);
    ui.updateControlsAvailability();
    ui.updateButtonIcon();
    if (!store.playbackFlags().isSequenceMode) {
      ui.els.timeInputEls.forEach((inp) => inp?.classList.remove("highlight"));
    }
  });
  console.log("Main CLT initialized with unified speaker");
})();
