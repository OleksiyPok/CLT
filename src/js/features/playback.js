// Playing of one time or of the whole list
import { EventTypes } from "../core/event-types.js";

export function createPlayback({ bus, store, ui, speaker, utils, wakeLock, timePhrase } = {}) {
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
    const phrase = timePhrase.getTimePhrase(store.getSettings().languageCode, timeStr);
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
  bus.on(EventTypes.UI_SPEAK_CANCEL, () => speaker.cancel());
  bus.on(EventTypes.UI_SPEAK_SINGLE, (payload) => handleSinglePlay(payload));
  bus.on(EventTypes.SPEECH_END, (p) => {
    const cur = store.getCurrentSpeakButton();
    if (cur && p?.button === cur) {
      store.setCurrentSpeakButton(null);
      bus.emit(EventTypes.UPDATE_CONTROLS);
    }
  });
  bus.on(EventTypes.APP_CLOSED, () => {
    stop();
  });
  return { playAt, stop, pause, resume, finish };
}
