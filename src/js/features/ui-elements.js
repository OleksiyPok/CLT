// Elements of the page (found once by selector) and the state shared by the ui-*.js modules.
export const SELECTORS = {
  helpAppBtn: "#helpAppBtn",
  helpAppModal: "#helpAppModal",
  helpAppCloseBtn: "#helpAppCloseBtn",
  helpAppContent: "#helpAppContent",
  helpTitle: "#helpTitle",
  settingsAppBtn: "#settingsAppBtn",
  settingsAppModal: "#settingsAppModal",
  settingsAppCloseBtn: "#settingsAppCloseBtn",
  settingsTitle: "#settingsTitle",
  uiLangSelect: "#uiLangSelect",
  speedSelect: "#speedSelect",
  intervalSelect: "#intervalSelect",
  rowsSelect: "#rowsSelect",
  languageCodeSelect: "#languageCodeSelect",
  voiceSelect: "#voiceSelect",
  clockRows: "#clockRows",
  fillRandomBtn: "#fillRandomBtn",
  resetSettingsBtn: "#resetSettingsBtn",
  startPauseBtn: "#startPauseBtn",
  resetBtn: "#resetBtn",
  themaModeSelect: "#themaModeSelect",
  themaModeBtn: "#themaModeBtn",
  themaModeIcon: "#themaModeIcon",
  themaSelect: "#themaSelect",
  developerPanel: "#developer",
};

// ctx = { bus, store, config, utils, langLoader, timePhrase, elements, view } is passed to every ui-*.js module
export function createUiContext({ bus, store, config, utils, langLoader, timePhrase }) {
  return {
    bus,
    store,
    config,
    utils,
    langLoader,
    timePhrase,
    elements: {
      // The rows with the times are made by buildRows() (ui-rows.js)
      randomBtns: [],
      speakBtns: [],
      timeInputs: [],
      clockContainers: [],
    },
    // What the page shows now (kept here, not read back from the DOM)
    view: {
      voices: [], // [{ name, lang }]
      availableLanguages: [],
      alertTexts: {},
      btnLabels: {},
      rowsBound: false, // the handlers of the rows are bound (they are bound again when the rows are rebuilt)
    },
  };
}

export function cacheElements({ elements }) {
  for (const key in SELECTORS) elements[key] = document.querySelector(SELECTORS[key]) || null;
}
