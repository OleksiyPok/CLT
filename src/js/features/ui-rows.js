// The rows with the times (random button, time field, play button).
import { EventTypes } from "../core/event-types.js";

// Number of the rows: "rows" in config/config.json, in these limits
const MIN_ROWS = 1;
const MAX_ROWS = 15;

const clampRows = (count) => Math.min(MAX_ROWS, Math.max(MIN_ROWS, parseInt(count, 10) || MIN_ROWS));

export function createUiRows(ctx, labels) {
  const { bus, store, utils, timePhrase, elements, view } = ctx;

  // Makes the rows and refreshes the lists of the elements
  function buildRows(count) {
    const container = elements.clockRows;
    if (!container) return;
    const n = clampRows(count);
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
    elements.randomBtns = container.querySelectorAll(".random-btn");
    elements.speakBtns = container.querySelectorAll(".speak-btn");
    elements.timeInputs = container.querySelectorAll(".time-input");
    elements.clockContainers = container.querySelectorAll(".clock-container");
  }

  // The number of the rows: the select of the settings window (1..15). The values of the rows stay, new rows get random times.
  function setRows(count) {
    const n = clampRows(count);
    if (elements.timeInputs.length === n) return;
    const old = Array.from(elements.timeInputs, (inp) => inp.value);
    buildRows(n);
    elements.timeInputs.forEach((inp, i) => (inp.value = old[i] ?? utils.generateRandomTimeString()));
    if (view.rowsBound) bindRowHandlers();
    labels.updateUILabels(elements.uiLangSelect?.value || "en");
    bus.emit(EventTypes.UPDATE_CONTROLS);
  }

  function disableSpeakButtons(disable) {
    elements.speakBtns.forEach((b) => b && (b.disabled = disable));
  }

  function setActiveInput(index) {
    elements.timeInputs.forEach((inp) => inp?.classList.remove("highlight"));
    elements.randomBtns.forEach((btn) => btn && (btn.disabled = false));
    if (index >= 0 && index < elements.timeInputs.length) {
      const inp = elements.timeInputs[index];
      inp?.classList.add("highlight");
      const rnd = inp?.parentElement?.querySelector(".random-btn");
      if (rnd) rnd.disabled = true;
    }
  }

  // Random times in all fields (the field that is played now stays)
  function fillRandom() {
    elements.timeInputs.forEach((inp, idx) => {
      const flags = store.playbackFlags();
      if ((flags.isSequenceMode || flags.isPaused) && idx === flags.sequenceIndex) return;
      inp.value = utils.generateRandomTimeString();
    });
    bus.emit(EventTypes.UPDATE_CONTROLS);
  }

  // The handlers of the rows (they are bound again when the number of the rows changes)
  function bindRowHandlers() {
    elements.clockContainers.forEach((group) => {
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
            alert(view.alertTexts.invalidFormat);
            return;
          }
          const phrase = timePhrase.getTimePhrase(store.getSettings().languageCode, timeStr);
          if (!phrase) {
            alert(view.alertTexts.invalidPhrase);
            return;
          }
          bus.emit(EventTypes.UI_SPEAK_SINGLE, {
            phrase,
            rate: parseFloat(elements.speedSelect?.value || store.getDefaultActive().speed),
            button: speakBtn,
          });
        });
    });
  }

  return { buildRows, setRows, disableSpeakButtons, setActiveInput, fillRandom, bindRowHandlers };
}
