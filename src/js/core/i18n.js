// Loads the texts of the interface (src/i18n/<lang>.json)
export function createLangLoader({ config, utils }) {
  const PATH = config.PATHS.UI_TEXTS_DIR;
  let texts = {};

  const FALLBACK_EN = {
    btnStart: "Start",
    btnStop: "Stop",
    btnContinue: "Continue",
    fillRandom: "Fill random",
    alertInvalidFormat: "Enter time in HH:MM format",
    alertInvalidPhrase: "Invalid time or unable to generate Dutch phrase.",
    speakBtnTitle: "Speak",
    randomBtnTitle: "Random",
  };

  async function loadLang(code) {
    try {
      const res = await fetch(`${PATH}/${code}.json`, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json || typeof json !== "object") throw new Error("Bad JSON");
      return json;
    } catch (e) {
      return null;
    }
  }

  async function loadAll(allowed) {
    texts = {};
    const langs = Array.isArray(allowed) ? allowed : ["en"];
    await Promise.all(
      langs.map(async (code) => {
        const d = await loadLang(code);
        if (d) texts[code] = d;
      })
    );
    if (!texts.en) texts.en = FALLBACK_EN;
    return texts;
  }

  const getTexts = (lang) => texts[lang] || texts.en || FALLBACK_EN;

  return { loadLang, loadAll, getTexts };
}
