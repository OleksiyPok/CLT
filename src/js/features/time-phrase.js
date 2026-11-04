// Time phrases: "15:45" -> "Viertel vor vier" (algorithms by language group over the vocabularies in src/vocabs)
import { Utils } from "../core/utils.js";

const { getBaseLang, chooseForm, log } = Utils;

export function createTimePhrase({ dictLoader }) {
  // Empty dictionary words leave double spaces: collapse them
  function getTimePhrase(...args) {
    return buildTimePhrase(...args)
      .replace(/\s+/g, " ")
      .trim();
  }

  function buildTimePhrase(langCode, { h, mm }, { use24h = false, useMilitary = false } = {}) {
    const baseLang = getBaseLang(langCode);
    const dict = dictLoader.getDict(baseLang) || dictLoader.getDict("en");
    if (!dict) return "";

    const hours = dict.hours || {};
    const hoursGenitive = dict.hoursGenitive || {};
    const minutes = dict.minutes || {};
    const minutesGenitive = dict.minutesGenitive || {};
    const words = dict.words || {};
    const lang = getBaseLang(langCode).toLowerCase();

    let algo = "default";
    if (["ru", "uk"].includes(lang)) algo = "slavic";
    if (["de", "nl"].includes(lang)) algo = "germanic";
    if (["fr", "pt", "en"].includes(lang)) algo = "latin";
    if (["ar"].includes(lang)) algo = "arabic";
    if (["tr"].includes(lang)) algo = "turkic";
    if (["pl"].includes(lang)) algo = "slavic";

    // if (useMilitary) {
    //   const hourWord = hours[h] || String(h);
    //   if (mm === 0) {
    //     return baseLang === "en" ? `${hourWord} hundred` : `${hourWord} ноль ноль`;
    //   }
    //   if (mm < 10) {
    //     const zero = baseLang === "en" ? "oh" : "ноль";
    //     const minWord = minutes[mm] || String(mm);
    //     return `${hourWord} ${zero} ${minWord}`;
    //   }
    //   const minWord = minutes[mm] || String(mm);
    //   return `${hourWord} ${minWord}`;
    // }

    let hourWord, nextHourWord, nextHourWordGenitive;
    if (use24h) {
      hourWord = hours[h] || h;
      nextHourWord = hours[(h + 1) % 24] || h + 1;
    } else {
      const idx = h % 12;
      const nextIdx = (h + 1) % 12;
      hourWord = hours[idx] || h;
      nextHourWord = hours[nextIdx] || h + 1;
      nextHourWordGenitive = hoursGenitive[nextIdx] || h + 1;
    }

    log(`algo`, algo);

    switch (algo) {
      case "slavic": // 🇷🇺 🇺🇦 🇵🇱
        if (mm === 0) return `${hourWord} ${words.hour || ""}`;
        if (mm === 15) return `${words.quarter || ""} ${words.of || ""} ${nextHourWordGenitive}`;
        if (mm < 30) return `${minutes[mm]} ${chooseForm(mm, words.minuteForms)} ${words.of || ""} ${nextHourWordGenitive}`;
        if (mm === 30) return `${words.half || ""} ${nextHourWordGenitive}`;
        if (mm === 40) return `${words.without || ""} ${minutesGenitive[60 - mm]} ${chooseForm(mm, words.minuteForms)} ${words.of || ""} ${nextHourWord}`;
        if (mm < 45) return `${minutes[mm]} ${chooseForm(mm, words.minuteForms)} ${nextHourWordGenitive}`;
        if (mm === 45) return `${words.quarterBefore || ""} ${nextHourWord}`;
        if (mm < 50) return `${minutes[mm]} ${chooseForm(60 - mm, words.minuteForms)} ${nextHourWordGenitive}`;
        return `${words.without || ""} ${minutesGenitive[60 - mm]} ${chooseForm(mm, words.minuteForms)} ${nextHourWord}`;

      case "germanic": // 🇩🇪 🇳🇱
        if (mm === 0) return `${hourWord} ${words.hour || ""}`;
        if (mm < 15) return `${minutes[mm]} ${words.over} ${hourWord}`;
        if (mm === 15) return `${words.quarter} ${words.over} ${hourWord}`;
        if (mm < 30) return `${minutes[30 - mm]} ${words.before} ${words.half} ${nextHourWord}`;
        if (mm === 30) return `${words.half} ${nextHourWord}`;
        if (mm < 45) return `${minutes[mm - 30]} ${words.over} ${words.half} ${nextHourWord}`;
        if (mm === 45) return `${words.quarter} ${words.before} ${nextHourWord}`;
        return `${minutes[60 - mm]} ${words.before} ${nextHourWord}`;

      case "latin": // 🇬🇧 🇫🇷 🇵🇹
        if (mm === 0) return `${hourWord} ${words.hour || ""}`;
        if (mm === 15) return `${words.quarterOver} ${hourWord}`;
        if (mm === 30) return `${words.half} ${nextHourWord}`;
        if (mm === 45) return `${words.quarterBefore} ${nextHourWord}`;
        if (mm < 30) return `${minutes[mm]} ${chooseForm(mm, words.minuteForms)} ${words.past} ${hourWord}`;
        return `${minutes[60 - mm]} ${chooseForm(60 - mm, words.minuteForms)} ${words.to} ${nextHourWord}`;

      case "arabic": // 🇸🇦
        if (mm === 0) return `${hourWord} ${words.hour || ""}`;
        if (mm === 15) return `${hourWord} ${words.quarterOver}`;
        if (mm === 30) return `${hourWord} ${words.half}`;
        if (mm === 45) return `${nextHourWord} ${words.quarterBefore}`;
        if (mm < 30) return `${hourWord} و ${minutes[mm]} ${chooseForm(mm, words.minuteForms)}`;
        return `${nextHourWord} ${words.before} ${minutes[60 - mm]} ${chooseForm(60 - mm, words.minuteForms)}`;

      case "turkic": // 🇹🇷
        if (mm === 0) return `${hourWord} ${words.hour || ""}`;
        if (mm === 30) return `${hourWord} ${words.half}`;
        if (mm < 30) return `${hourWord} ${minutes[mm]} ${chooseForm(mm, words.minuteForms)} ${words.past}`;
        return `${nextHourWord} ${minutes[60 - mm]} ${chooseForm(60 - mm, words.minuteForms)} ${words.to}`;

      default: // fallback
        if (mm === 0) return `${hourWord} ${words.hour || ""}`;
        if (mm === 30) return `${words.half} ${nextHourWord}`;
        if (mm < 30) return `${minutes[mm]} ${chooseForm(mm, words.minuteForms)} ${words.over} ${hourWord}`;
        return `${minutes[60 - mm]} ${chooseForm(60 - mm, words.minuteForms)} ${words.before} ${nextHourWord}`;
    }
  }

  return { getTimePhrase };
}
