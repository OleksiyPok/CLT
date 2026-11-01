// The page: fields, buttons, selects, texts and the time rows
import { EventTypes } from "../core/event-types.js";
import { createUiHelp } from "./ui-help.js";
import { createUiMirrors } from "./ui-mirrors.js";
import { createUiSettingsWindow } from "./ui-settings-window.js";
import { createUiTheme } from "./ui-theme.js";

// Number of the rows with the times: "rows" in config/config.json, in these limits
const MIN_ROWS = 1;
const MAX_ROWS = 15;

export function createUI({ bus, store, config, langLoader, utils, timePhrase }) {
  let alertTexts = {};
  let btnStates = {};
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
    // The rows with the times are made by buildRows()
    randomBtnEls: [],
    speakBtnEls: [],
    timeInputEls: [],
    clockContainerEls: [],
    developerBlockEl: document.getElementById("developer"),
  };
  // Elements of the windows (names are used by ui-help.js and ui-settings-window.js)
  const windows = {
    uiLangSelect: els.uiLangSelectEl,
    helpAppBtn: document.getElementById("helpAppBtn"),
    helpAppModal: document.getElementById("helpAppModal"),
    helpAppCloseBtn: document.getElementById("helpAppCloseBtn"),
    helpAppContent: document.getElementById("helpAppContent"),
    settingsAppBtn: document.getElementById("settingsAppBtn"),
    settingsAppModal: document.getElementById("settingsAppModal"),
    settingsAppCloseBtn: document.getElementById("settingsAppCloseBtn"),
  };
  const mirrors = createUiMirrors();
  const help = createUiHelp({ elements: windows, langLoader });
  const settingsWindow = createUiSettingsWindow({ elements: windows, mirrors });

  // Makes the rows (random button, time field, play button) and refreshes the lists of the elements
  function buildRows(count) {
    const container = document.getElementById("clockRows");
    if (!container) return;
    const n = Math.min(MAX_ROWS, Math.max(MIN_ROWS, parseInt(count, 10) || MIN_ROWS));
    container.replaceChildren(
      ...Array.from({ length: n }, (_, i) => {
        const row = document.createElement("div");
        row.className = "clock-container";
        row.innerHTML = `<button type="button" class="random-btn" id="randomBtn_${i + 1}" data-i18n-title="randomBtnTitle">🎲</button>
<input type="text" class="time-input" id="timeInput_${i + 1}" maxlength="5" value="00:00" />
<button type="button" class="speak-btn" id="speakBtn_${i + 1}" data-i18n-title="speakBtnTitle">▶️</button>`;
        return row;
      })
    );
    els.randomBtnEls = container.querySelectorAll(".random-btn");
    els.speakBtnEls = container.querySelectorAll(".speak-btn");
    els.timeInputEls = container.querySelectorAll(".time-input");
    els.clockContainerEls = container.querySelectorAll(".clock-container");
  }
  const theme = createUiTheme({
    elements: {
      themaSelect: document.getElementById("themaSelect"),
      themaModeSelect: document.getElementById("themaModeSelect"),
      themaModeBtn: document.getElementById("themaModeBtn"),
      themaModeIcon: document.getElementById("themaModeIcon"),
      uiLangSelect: els.uiLangSelectEl,
    },
    langLoader,
  });
  theme.renderThemeSelectOptions();
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
  // The play button turns into a stop button (square) while its time is spoken
  function updateButtonIcon(btn, state) {
    if (!btn) return;
    const speaking = state === "speaking";
    btn.textContent = speaking ? STOP_ICON : PLAY_ICON;
    btn.classList.toggle("speaking", speaking);
    const texts = langLoader.getTexts(els.uiLangSelectEl?.value || "en");
    const title = speaking ? texts.btnStop : texts.speakBtnTitle;
    if (title) btn.title = title;
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
    alertTexts = {
      invalidFormat: texts.alertInvalidFormat || "Enter time in HH:MM format",
      invalidPhrase: texts.alertInvalidPhrase || "Invalid time or unable to generate Dutch phrase.",
    };
    btnStates = {
      start: texts.btnStart || "Start",
      stop: texts.btnStop || "Stop",
      cont: texts.btnContinue || "Continue",
    };
    const f = store.playbackFlags();
    if (f.isSequenceMode && !f.isPaused) setBtnText(els.startPauseBtnEl, btnStates.stop || "Stop");
    else if (f.isSequenceMode && f.isPaused) setBtnText(els.startPauseBtnEl, btnStates.cont || "Continue");
    else setBtnText(els.startPauseBtnEl, btnStates.start || "Start");
    theme.updateLabels(texts);
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el && text) el.textContent = text;
    };
    setText("settingsTitle", texts.settingsTitle);
    setText("helpTitle", texts.helpTitle);
    [
      [windows.helpAppBtn, texts.helpTitle],
      [windows.settingsAppBtn, texts.settingsTitle],
      [windows.settingsAppCloseBtn, texts.closeBtn],
      [windows.helpAppCloseBtn, texts.closeBtn],
    ].forEach(([el, text]) => {
      if (!el || !text) return;
      el.title = text;
      el.setAttribute("aria-label", text);
    });
    mirrors.sync();
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
    theme.applyThemeFromSettings({ thema: raw.thema ?? s.thema });
    const effectiveLang = els.uiLangSelectEl?.value || s.uiLang || store.getDefaultActive().uiLang;
    translateUI(effectiveLang);
  }
  function readSettingsFromUI() {
    const base = {
      uiLang: els.uiLangSelectEl?.value,
      speed: els.speedSelectEl?.value,
      delay: els.delaySelectEl?.value,
    };
    const themaFromUI = theme.getThemaFromSelects();
    const current = store.getSettings ? store.getSettings() : {};
    const defaults = store.getDefaultActive ? store.getDefaultActive() : {};
    const allowedOpt = (sel, val) => sel && Array.from(sel.options).some((opt) => String(opt.value) === String(val));

    return {
      uiLang: base.uiLang && config.UI_LANGS.includes(base.uiLang) && allowedOpt(els.uiLangSelectEl, base.uiLang) ? base.uiLang : current.uiLang || defaults.uiLang,

      speed: !isNaN(parseFloat(base.speed)) && allowedOpt(els.speedSelectEl, base.speed) ? base.speed : current.speed || defaults.speed,

      delay: !isNaN(parseInt(base.delay, 10)) && allowedOpt(els.delaySelectEl, base.delay) ? base.delay : current.delay || defaults.delay,

      thema: themaFromUI || current.thema || defaults.thema,
      languageCode: current.languageCode ?? defaults.languageCode,
      voiceName: current.voiceName ?? defaults.voiceName,
    };
  }

  function setDeveloperVisibility(appCfg) {
    const devMode = appCfg?.developerMode;
    if (els.developerBlockEl) els.developerBlockEl.style.display = devMode ? "" : "none";
  }
  function updateStartPauseBtnTo(state) {
    if (state === "start") setBtnText(els.startPauseBtnEl, btnStates.start);
    else if (state === "stop") setBtnText(els.startPauseBtnEl, btnStates.stop);
    else if (state === "cont") setBtnText(els.startPauseBtnEl, btnStates.cont);
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
          if (isSpeaking) {
            // The button of the spoken time is a stop button
            if (store.getCurrentSpeakButton() === speakBtn) bus.emit(EventTypes.UI_SPEAK_CANCEL);
            return;
          }
          const raw = input.value?.trim();
          if (!raw) return;
          const timeStr = utils.parseTimeInput(raw);
          if (!timeStr) {
            alert(alertTexts.invalidFormat);
            return;
          }
          const phrase = timePhrase.getTimePhrase(store.getSettings().languageCode, timeStr);
          if (!phrase) {
            alert(alertTexts.invalidPhrase);
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
    document.getElementById("resetSettingsBtnCopy")?.addEventListener("click", () => {
      bus.emit(EventTypes.SETTINGS_RESET);
      mirrors.sync();
    });
    mirrors.attach();
    windows.helpAppBtn?.addEventListener("click", () => bus.emit(EventTypes.UI_HELP_MODAL_OPEN));
    windows.helpAppCloseBtn?.addEventListener("click", () => bus.emit(EventTypes.UI_HELP_MODAL_CLOSE));
    windows.settingsAppBtn?.addEventListener("click", () => bus.emit(EventTypes.UI_SETTINGS_MODAL_OPEN));
    windows.settingsAppCloseBtn?.addEventListener("click", () => bus.emit(EventTypes.UI_SETTINGS_MODAL_CLOSE));
    windows.helpAppModal?.addEventListener("click", (e) => {
      if (e.target === windows.helpAppModal) bus.emit(EventTypes.UI_HELP_MODAL_CLOSE);
    });
    windows.settingsAppModal?.addEventListener("click", (e) => {
      if (e.target === windows.settingsAppModal) bus.emit(EventTypes.UI_SETTINGS_MODAL_CLOSE);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (help.isAppHelpModalOpen()) bus.emit(EventTypes.UI_HELP_MODAL_CLOSE);
      else if (settingsWindow.isSettingsModalOpen()) bus.emit(EventTypes.UI_SETTINGS_MODAL_CLOSE);
    });
    bus.on(EventTypes.UI_HELP_MODAL_OPEN, () => {
      help.loadHelpContent();
      help.openHelpModal();
    });
    bus.on(EventTypes.UI_HELP_MODAL_CLOSE, help.closeHelpModal);
    bus.on(EventTypes.UI_SETTINGS_MODAL_OPEN, settingsWindow.openSettingsModal);
    bus.on(EventTypes.UI_SETTINGS_MODAL_CLOSE, settingsWindow.closeSettingsModal);
    els.uiLangSelectEl?.addEventListener("change", (e) => {
      bus.emit(EventTypes.UI_TRANSLATE, { lang: e.target.value });
      bus.emit(EventTypes.SETTINGS_APPLY_TO_UI, { saveFromUI: true });
    });
    const onThemaChange = () => {
      theme.applyThemeFromSelects();
      bus.emit(EventTypes.SETTINGS_APPLY_TO_UI, { saveFromUI: true });
    };
    document.getElementById("themaSelect")?.addEventListener("change", onThemaChange);
    document.getElementById("themaModeSelect")?.addEventListener("change", onThemaChange);
    document.getElementById("themaModeBtn")?.addEventListener("click", () => {
      theme.nextThemaMode();
      onThemaChange();
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
    bus.on(EventTypes.SPEECH_START, ({ button } = {}) => {
      updateButtonIcon(button, "speaking");
      store.setPlaybackFlags({ isSpeaking: true });
      bus.emit(EventTypes.UPDATE_CONTROLS);
    });
    bus.on(EventTypes.SPEECH_END, () => {
      els.speakBtnEls.forEach((b) => updateButtonIcon(b));
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
    buildRows,
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
