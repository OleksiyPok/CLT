// The page: connects the ui-*.js modules, the controls of the settings and the events of the bus.
import { EventTypes } from "../core/event-types.js";
import { createHelp } from "./help.js";
import { closeLiveLists } from "./live-select.js";
import { createUiMirrors } from "./ui-mirrors.js";
import { createUiLabels } from "./ui-labels.js";
import { createUiRows } from "./ui-rows.js";
import { cacheElements, createUiContext } from "./ui-elements.js";
import { createUiSelects } from "./ui-selects.js";
import { createModalHistory, createModals } from "./modals.js";
import { createTheme } from "./theme.js";

export function createUI({ bus, store, config, langLoader, utils, timePhrase }) {
  const ctx = createUiContext({ bus, store, config, utils, langLoader, timePhrase });
  cacheElements(ctx);
  // The texts changed: the theme and the copies of the controls follow
  ctx.onLabelsUpdated = (texts) => {
    theme.updateLabels(texts);
    mirrors.sync();
  };
  const { elements, view } = ctx;

  const mirrors = createUiMirrors();
  const theme = createTheme(ctx);
  const help = createHelp(ctx);
  const labels = createUiLabels(ctx);
  const rows = createUiRows(ctx, labels);
  const selects = createUiSelects(ctx);
  const settingsWindow = createModals({ elements, mirrors });
  theme.renderThemeSelectOptions();

  const modalHistory = createModalHistory({
    isAnyOpen: () => help.isAppHelpModalOpen() || settingsWindow.isSettingsModalOpen(),
    closeAll: () => {
      help.closeHelpModal();
      closeLiveLists();
      settingsWindow.closeSettingsModal();
    },
  });
  const { updateUILabels, updateStartPauseButton, updateControlsState } = labels;
  const { buildRows, setRows, setActiveInput, fillRandom, bindRowHandlers } = rows;
  const { setSelectsFromSettings, populateLanguageSelect, populateVoiceSelect, renderLangVoiceUI } = selects;

  // The settings go to the page (when the app starts, and after "Reset defaults")
  function applySettingsToUI(s, { preferBlankForInvalid = true, raw = {} } = {}) {
    setSelectsFromSettings(s, { preferBlankForInvalid, raw });
    setRows(elements.rowsSelect?.value || s.rows);
    theme.applyThemeFromSettings({ thema: raw.thema ?? s.thema });
    updateUILabels(elements.uiLangSelect?.value || s.uiLang || store.getDefaultActive().uiLang);
  }

  // The settings from the page (a value that is not in the list is replaced by the saved one or the default)
  function readSettingsFromUI() {
    const base = {
      uiLang: elements.uiLangSelect?.value,
      speed: elements.speedSelect?.value,
      intervalMs: elements.intervalSelect?.value,
      rows: elements.rowsSelect?.value,
    };
    const themaFromUI = theme.getThemaFromSelects();
    const current = store.getSettings ? store.getSettings() : {};
    const defaults = store.getDefaultActive ? store.getDefaultActive() : {};
    const allowedOpt = (sel, val) => sel && Array.from(sel.options).some((opt) => String(opt.value) === String(val));

    return {
      uiLang: base.uiLang && config.UI_LANGS.includes(base.uiLang) && allowedOpt(elements.uiLangSelect, base.uiLang) ? base.uiLang : current.uiLang || defaults.uiLang,

      speed: !isNaN(parseFloat(base.speed)) && allowedOpt(elements.speedSelect, base.speed) ? base.speed : current.speed || defaults.speed,

      intervalMs: !isNaN(parseInt(base.intervalMs, 10)) && allowedOpt(elements.intervalSelect, base.intervalMs) ? base.intervalMs : current.intervalMs || defaults.intervalMs,

      rows: !isNaN(parseInt(base.rows, 10)) && allowedOpt(elements.rowsSelect, base.rows) ? parseInt(base.rows, 10) : current.rows || defaults.rows,

      thema: themaFromUI || current.thema || defaults.thema,
      languageCode: current.languageCode ?? defaults.languageCode,
      voiceName: current.voiceName ?? defaults.voiceName,
    };
  }

  function setDeveloperVisibility(appCfg) {
    const devMode = appCfg?.developerMode;
    if (elements.developerPanel) elements.developerPanel.style.display = devMode ? "" : "none";
  }

  function bindHandlers() {
    const E = elements;
    bindRowHandlers();
    view.rowsBound = true;
    E.fillRandomBtn?.addEventListener("click", fillRandom);
    E.resetSettingsBtn?.addEventListener("click", () => bus.emit(EventTypes.SETTINGS_RESET));
    mirrors.attach();
    E.helpAppBtn?.addEventListener("click", () => bus.emit(EventTypes.UI_HELP_MODAL_OPEN));
    E.helpAppCloseBtn?.addEventListener("click", () => bus.emit(EventTypes.UI_HELP_MODAL_CLOSE));
    E.settingsAppBtn?.addEventListener("click", () => bus.emit(EventTypes.UI_SETTINGS_MODAL_OPEN));
    E.settingsAppCloseBtn?.addEventListener("click", () => bus.emit(EventTypes.UI_SETTINGS_MODAL_CLOSE));
    E.helpAppModal?.addEventListener("click", (e) => {
      if (e.target === E.helpAppModal) bus.emit(EventTypes.UI_HELP_MODAL_CLOSE);
    });
    E.settingsAppModal?.addEventListener("click", (e) => {
      if (e.target === E.settingsAppModal) bus.emit(EventTypes.UI_SETTINGS_MODAL_CLOSE);
    });
    bus.on(EventTypes.UI_HELP_MODAL_OPEN, () => {
      help.loadHelpContent();
      help.openHelpModal();
      modalHistory.opened();
    });
    bus.on(EventTypes.UI_HELP_MODAL_CLOSE, () => {
      help.closeHelpModal();
      modalHistory.closed();
    });
    bus.on(EventTypes.UI_SETTINGS_MODAL_OPEN, () => {
      settingsWindow.openSettingsModal();
      modalHistory.opened();
    });
    bus.on(EventTypes.UI_SETTINGS_MODAL_CLOSE, () => {
      closeLiveLists();
      settingsWindow.closeSettingsModal();
      modalHistory.closed();
    });
    E.uiLangSelect?.addEventListener("change", (e) => {
      bus.emit(EventTypes.UI_TRANSLATE, { lang: e.target.value });
      bus.emit(EventTypes.SETTINGS_APPLY_TO_UI, { saveFromUI: true });
    });
    const onThemaChange = () => {
      theme.applyThemeFromSelects();
      bus.emit(EventTypes.SETTINGS_APPLY_TO_UI, { saveFromUI: true });
    };
    E.themaSelect?.addEventListener("change", onThemaChange);
    E.themaModeSelect?.addEventListener("change", onThemaChange);
    E.themaModeBtn?.addEventListener("click", () => {
      theme.nextThemaMode();
      onThemaChange();
    });
    E.speedSelect?.addEventListener("change", () => bus.emit(EventTypes.SETTINGS_APPLY_TO_UI, { saveFromUI: true }));
    E.intervalSelect?.addEventListener("change", () => bus.emit(EventTypes.SETTINGS_APPLY_TO_UI, { saveFromUI: true }));
    E.rowsSelect?.addEventListener("change", () => {
      setRows(E.rowsSelect.value);
      bus.emit(EventTypes.SETTINGS_APPLY_TO_UI, { saveFromUI: true });
    });
    E.languageCodeSelect?.addEventListener("change", (e) => {
      populateVoiceSelect(e.target.value);
      bus.emit(EventTypes.UPDATE_CONTROLS);
    });
    E.voiceSelect?.addEventListener("change", (e) => {
      const s = store.getSettings();
      const v = view.voices.find((x) => x.name === e.target.value);
      if (v) {
        s.voiceName = v.name;
        s.languageCode = utils.normalizeLangCode(v.lang);
        store.setSettings(s);
        store.saveSettings(s, elements);
      }
      bus.emit(EventTypes.UPDATE_CONTROLS);
    });
    E.startPauseBtn?.addEventListener("click", () => {
      const f = store.playbackFlags();
      if (!f.isSequenceMode) {
        updateStartPauseButton("pause");
        bus.emit(EventTypes.PLAYBACK_START, { index: f.sequenceIndex || 0 });
      } else if (f.isPaused) {
        bus.emit(EventTypes.PLAYBACK_CONTINUE);
        updateStartPauseButton("pause");
      } else {
        bus.emit(EventTypes.PLAYBACK_PAUSE);
      }
    });
    E.resetBtn?.addEventListener("click", () => {
      bus.emit(EventTypes.PLAYBACK_STOP);
      updateStartPauseButton("start");
    });
  }

  function bindEventSubscriptions() {
    bus.on(EventTypes.UPDATE_CONTROLS, updateControlsState);
    bus.on(EventTypes.SPEECH_START, ({ button } = {}) => {
      labels.updateButtonIcon(button, "speaking");
      store.setPlaybackFlags({ isSpeaking: true });
      bus.emit(EventTypes.UPDATE_CONTROLS);
    });
    bus.on(EventTypes.SPEECH_END, () => {
      elements.speakBtns.forEach((b) => labels.updateButtonIcon(b));
      store.setPlaybackFlags({ isSpeaking: false });
      bus.emit(EventTypes.UPDATE_CONTROLS);
    });
    const onVoices = (p) => {
      view.voices = (p && p.voices) || [];
      view.availableLanguages = (p && p.availableLanguages) || [];
      renderLangVoiceUI();
      updateControlsState();
    };
    bus.on(EventTypes.VOICES_CHANGED, onVoices);
    bus.on(EventTypes.VOICES_LOADED, onVoices);
    bus.on(EventTypes.SETTINGS_RESET, () => {
      const s = store.getDefaultActive ? store.getDefaultActive() : store.getSettings();
      populateLanguageSelect();
      const base = (utils.getBaseLang(s.languageCode) || "").toUpperCase();
      if (base && elements.languageCodeSelect && view.availableLanguages.includes(base)) elements.languageCodeSelect.value = base;
      populateVoiceSelect(elements.languageCodeSelect?.value || "ALL");
      bus.emit(EventTypes.UPDATE_CONTROLS);
    });
  }

  function init() {
    bindHandlers();
    bindEventSubscriptions();
    elements.fillRandomBtn?.click();
    bus.emit(EventTypes.UPDATE_CONTROLS);
  }

  return {
    elements,
    buildRows,
    setActiveInput,
    updateButtonIcon: labels.updateButtonIcon,
    updateUILabels,
    updateStartPauseButton,
    updateControlsState,
    applySettingsToUI,
    readSettingsFromUI,
    setDeveloperVisibility,
    isAppHelpModalOpen: help.isAppHelpModalOpen,
    isSettingsModalOpen: settingsWindow.isSettingsModalOpen,
    init,
  };
}
