// Voices of the browser (speechSynthesis) and the languages they offer
import { EventTypes } from "../core/event-types.js";

export function createVoices({ bus, utils, allowedLangs = [] } = {}) {
  let voices = [];
  let availableLanguages = [];

  function computeAvailableLanguages() {
    const set = new Set();
    for (const v of voices) {
      const base = (utils.getBaseLang(v.lang) || "").toLowerCase();
      if (!base) continue;
      if (!allowedLangs.includes(base)) continue;
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
      voices.map((v) => v.lang),
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
