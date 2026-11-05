// Texts of the page (by the selected interface language) and enabled / disabled controls.
import { EventTypes } from "../core/event-types.js";

const PLAY_ICON = "▶️";
const STOP_ICON = "⏹️";

export function createUiLabels(ctx) {
  const { bus, store, langLoader, elements, view } = ctx;

  function setBtnText(el, text) {
    if (!el) return;
    if (el.textContent !== text) el.textContent = text;
  }

  // The texts of the page; then ctx.onLabelsUpdated(texts) (the theme and the copies of the controls follow)
  function updateUILabels(lang) {
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
    view.alertTexts = {
      invalidFormat: texts.invalidTimeFormat || "Enter time in HH:MM format",
      invalidPhrase: texts.invalidTimePhrase || "Invalid time or unable to generate Dutch phrase.",
    };
    view.btnLabels = {
      start: texts.startBtnLabel || "Start",
      pause: texts.pauseBtnLabel || "Pause",
      cont: texts.continueBtnLabel || "Continue",
    };
    const f = store.playbackFlags();
    if (f.isSequenceMode && !f.isPaused) setBtnText(elements.startPauseBtn, view.btnLabels.pause);
    else if (f.isSequenceMode && f.isPaused) setBtnText(elements.startPauseBtn, view.btnLabels.cont);
    else setBtnText(elements.startPauseBtn, view.btnLabels.start);
    const setText = (el, text) => {
      if (el && text) el.textContent = text;
    };
    setText(elements.settingsTitle, texts.settingsTitle);
    setText(elements.helpTitle, texts.helpBtnTitle);
    [
      [elements.helpAppBtn, texts.helpBtnTitle],
      [elements.settingsAppBtn, texts.settingsTitle],
      [elements.settingsAppCloseBtn, texts.closeBtnTitle],
      [elements.helpAppCloseBtn, texts.closeBtnTitle],
    ].forEach(([el, text]) => {
      if (!el || !text) return;
      el.title = text;
      el.setAttribute("aria-label", text);
    });
    ctx.onLabelsUpdated?.(texts);
    bus.emit(EventTypes.UI_TEXTS_UPDATE, { lang });
  }

  // The play button turns into a stop button (square) while its time is spoken
  function updateButtonIcon(btn, state) {
    if (!btn) return;
    const speaking = state === "speaking";
    btn.textContent = speaking ? STOP_ICON : PLAY_ICON;
    btn.classList.toggle("speaking", speaking);
    const texts = langLoader.getTexts(elements.uiLangSelect?.value || "en");
    const title = speaking ? texts.stopBtnLabel : texts.speakBtnTitle;
    if (title) btn.title = title;
  }

  // The caption of the Start / Pause / Continue button: "start" | "pause" | "cont"
  function updateStartPauseButton(state) {
    if (state === "start") setBtnText(elements.startPauseBtn, view.btnLabels.start);
    else if (state === "pause") setBtnText(elements.startPauseBtn, view.btnLabels.pause);
    else if (state === "cont") setBtnText(elements.startPauseBtn, view.btnLabels.cont);
  }

  function updateControlsState() {
    const flags = store.playbackFlags();
    const activeBtn = store.getCurrentSpeakButton();
    const activeIdx = flags.sequenceIndex;

    elements.speakBtns.forEach((btn) => {
      if (flags.isSequenceMode) btn.disabled = true;
      else if (flags.isSpeaking && activeBtn) btn.disabled = btn !== activeBtn;
      else btn.disabled = flags.isPaused;
    });

    elements.randomBtns.forEach((btn, idx) => {
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

    // Speed and interval are read when the next phrase is spoken, so they can be changed while playing.
    // The number of the rows can not be changed while the sequence is running or paused
    const rowsLocked = flags.isSequenceMode || flags.isSpeaking;
    if (elements.rowsSelect) elements.rowsSelect.disabled = rowsLocked;
    document.querySelector('label[for="rowsSelect"]')?.classList.toggle("disabled", rowsLocked);
    if (elements.languageCodeSelect) elements.languageCodeSelect.disabled = !enableControls;
    if (elements.voiceSelect) elements.voiceSelect.disabled = !enableControls;

    document.querySelectorAll('label[for="languageCodeSelect"],label[for="voiceSelect"]').forEach((l) => l.classList.toggle("disabled", !enableControls));

    if (elements.resetBtn) elements.resetBtn.disabled = !flags.isPaused;
  }

  return { setBtnText, updateUILabels, updateButtonIcon, updateStartPauseButton, updateControlsState };
}
