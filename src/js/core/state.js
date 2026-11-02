// Settings: current values, defaults and saving to localStorage
import { STORAGE_KEY } from "./config.js";
import { THEME_VALUES, resolveThemaKey } from "./theme-registry.js";
import { EventTypes } from "./event-types.js";

export function createState({ bus, config, utils }) {
  const KEY = STORAGE_KEY;
  const canUseLocal = true;
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
  // Defaults come from config/config.json (store.setDefaultActive)
  let defaultsActive = {};
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
    const { uiLangSelectEl, intervalSelectEl, speedSelectEl, rowsSelectEl } = els || {};
    const out = {};
    out.uiLang = stored?.uiLang && config.UI_LANGS.includes(stored.uiLang) && allowed(uiLangSelectEl, stored.uiLang) ? stored.uiLang : defaults?.uiLang;
    out.thema = THEME_VALUES.includes(resolveThemaKey(stored?.thema)) ? resolveThemaKey(stored.thema) : defaults?.thema;
    out.intervalMs = (() => {
      // "delay" is the old name of this setting (saved by the earlier versions)
      const v = stored?.intervalMs ?? stored?.delay;
      const n = parseInt(v, 10);
      if (!isNaN(n) && allowed(intervalSelectEl, String(n))) return String(n);
      return defaults?.intervalMs;
    })();
    out.speed = (() => {
      const v = stored?.speed;
      const n = parseFloat(v);
      if (!isNaN(n) && allowed(speedSelectEl, String(v))) return String(v);
      return defaults?.speed;
    })();
    out.rows = (() => {
      const n = parseInt(stored?.rows, 10);
      if (!isNaN(n) && allowed(rowsSelectEl, String(n))) return n;
      return defaults?.rows;
    })();
    out.languageCode = stored?.languageCode ?? defaults?.languageCode;
    out.voiceName = stored?.voiceName ?? defaults?.voiceName;
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
