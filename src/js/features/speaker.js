// Speaks a text with the chosen voice, speed and language
import { EventTypes } from "../core/event-types.js";
import { Utils } from "../core/utils.js";

export function createSpeaker({ bus, voicesProvider, settingsProvider } = {}) {
  let currentUtter = null;
  let getVoices = () => (typeof voicesProvider === "function" ? voicesProvider() : []);
  let getSettings = () => (typeof settingsProvider === "function" ? settingsProvider() : {});

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
      const byFull = all.find((v) => (v.lang || "").toLowerCase() === desiredLang);
      if (byFull) return byFull;
      const base = desiredLang.split(/[-_]/)[0];
      if (base) {
        const byBase = all.find((v) => ((v.lang || "").split(/[-_]/)[0] || "").toLowerCase() === base);
        if (byBase) return byBase;
      }
    }
    const navBase = (navigator.language || "").split(/[-_]/)[0];
    if (navBase) {
      const nav = all.find((v) => (v.lang || "").toLowerCase().startsWith(navBase));
      if (nav) return nav;
    }
    return all[0] || null;
  }

  async function speakAsync(text, opts = {}) {
    Utils.log(text, opts);
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
      utter.rate = Number(settings.rate ?? settings.speed) > 0 ? Number(settings.rate ?? settings.speed) : 1.0;
      utter.pitch = Number(settings.pitch) > 0 ? Number(settings.pitch) : 1.0;
      utter.volume = Number(settings.volume) >= 0 && Number(settings.volume) <= 1 ? Number(settings.volume) : 1.0;
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
    if (typeof obj === "string") return speakAsync(obj).catch((e) => console.warn("speak failed", e));
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
      if ("speechSynthesis" in window && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel();
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
