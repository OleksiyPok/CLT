// UI texts and language names: src/i18n/<lang>.json = { ui: {...}, languages: {...} }.
// English is always loaded and used as the fallback.
export function createLangLoader({ config, utils }) {
  const PATH = config.PATHS.UI_TEXTS_DIR;
  let texts = {};

  const FALLBACK_EN = { ui: {}, languages: {} };

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
      }),
    );
    if (!texts.en) texts.en = FALLBACK_EN;
    return texts;
  }

  // Texts of the language; a text missing in it is taken from English.
  const getTexts = (lang) => ({ ...(texts.en || FALLBACK_EN).ui, ...texts[lang]?.ui });
  const getLanguageNames = (lang) => ({ ...(texts.en || FALLBACK_EN).languages, ...texts[lang]?.languages });

  return { loadLang, loadAll, getTexts, getLanguageNames };
}
