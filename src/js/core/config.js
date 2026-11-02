// Constants and the default settings (config/config.json).

// Shown on the main screen (change it with every change of the app)
export const APP_VERSION = "1.4.13";

// Key of the saved settings in localStorage
export const STORAGE_KEY = "CLT-settings";

// Folder of the help pages
export const HELP_DIR = "docs/help/";

// Languages of the help pages (docs/help/help.<lang>.html); a missing page is replaced by the English one
export const HELP_LANGS = ["ar", "cs", "de", "en", "es", "fr", "it", "nl", "pl", "pt", "ru", "tr", "uk"];

// Language chosen in the help window
export const HELP_LANGUAGE_KEY = "CLT-help-language";

// Default settings come only from config/config.json.
// config.json: common values; the "mobile" block overrides them on phones and tablets.
export function createConfig() {
  const PATHS = {
    CONFIG: "config/config.json",
    UI_TEXTS_DIR: "src/i18n",
    TIME_DICTS_DIR: "src/vocabs",
  };
  // Languages of the interface (src/i18n)
  const UI_LANGS = Object.freeze(["ar", "cs", "de", "en", "es", "fr", "it", "nl", "pl", "pt", "ru", "tr", "uk"]);
  // Languages that have a vocabulary of the time words (src/vocabs); only for them the app can say the time
  const TIME_LANGS = Object.freeze(["ar", "de", "en", "fr", "nl", "pl", "pt", "ru", "tr", "uk"]);

  async function load() {
    const res = await fetch(PATHS.CONFIG, { cache: "no-store" });
    if (!res.ok) throw new Error(`${PATHS.CONFIG}: ${res.status}`);
    const { mobile, ...common } = await res.json();
    const isMobile = /Mobi|Android|iPhone|iPad|Windows Phone|IEMobile/i.test(navigator.userAgent || "");
    return { ...common, ...(isMobile ? mobile || {} : {}) };
  }

  return { PATHS, UI_LANGS, TIME_LANGS, load };
}
