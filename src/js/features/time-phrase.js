// Time phrases: "15:45" -> "Viertel vor vier".
// One rule set per language over the vocabularies in src/vocabs (numerals and basic words).
// Only forms that the vocabularies do not hold (cases, genders, articles) are written in the rules below.
//
// Two ways to say the time (the caller chooses, see getTimePhrase):
//   analog   - "quarter to four", "Viertel vor vier" (12-hour clock). 00:00 is "twelve" in the minutes
//              around it ("пять минут первого"), but exactly 00:00 / 12:00 are midnight / noon (MIDNIGHT_NOON)
//   military - "fifteen forty-five" (24-hour clock). NOT IMPLEMENTED YET: to add it, put a function
//              `military(ctx)` next to `analog(ctx)` in the rules of a language. Until then
//              useMilitary falls back to the analog phrase.
import { Utils } from "../core/utils.js";

const { getBaseLang } = Utils;

const to12 = (h) => h % 12 || 12; // 0 and 12 -> 12, 13 -> 1
const next12 = (h) => (h + 1) % 12 || 12; // the hour after h on the 12-hour clock

// Spoken colloquially without the word "minutes" when the number is a multiple of 5 ("five past three"),
// with it otherwise ("seven minutes past three")
const showUnit = (n) => n % 5 !== 0;

// Plural forms of a noun counted by number n. forms = [one, few, many]
function slavicForm(n, forms) {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return forms[0];
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return forms[1];
  return forms[2];
}
// Polish: only the number 1 itself takes the singular (21 minut, 22 minuty)
function polishForm(n, forms) {
  if (n === 1) return forms[0];
  const a = n % 10;
  const b = n % 100;
  return a >= 2 && a <= 4 && (b < 12 || b > 14) ? forms[1] : forms[2];
}

// Exactly 00:00 and 12:00 have their own spoken words in most languages. Where a language has none
// (nl and tr noon, de noon) the ordinary "twelve" phrase is used. A vocabulary can override a word
// with words.midnight / words.noon.
const MIDNIGHT_NOON = {
  ru: ["полночь", "полдень"],
  uk: ["північ", "полудень"],
  pl: ["północ", "południe"],
  de: ["Mitternacht", ""],
  nl: ["middernacht", ""],
  en: ["midnight", "noon"],
  fr: ["minuit", "midi"],
  pt: ["meia-noite", "meio-dia"],
  ar: ["منتصف الليل", "الظهر"],
  tr: ["gece yarısı", ""],
};

// The word for the next hour in "без десяти минут ...": after 23:xx the next hour is midnight
const midnightWord = (w, lang) => w.midnight || MIDNIGHT_NOON[lang][0];

// ---------------------------------------------------------------- rules
const RULES = {
  // 🇷🇺  "пять минут восьмого", "половина восьмого", "без двух минут восемь", "без одной минуты восемь"
  ru: {
    analog({ h, mm, h12, n12, dict, w, hour, min }) {
      const gen = dict.hoursGenitive || {};
      const nextGen = gen[n12] ?? hour(n12); // 23:05 -> "пять минут двенадцатого"
      const nextNom = h === 23 ? midnightWord(w, "ru") : hour(n12); // 23:50 -> "без десяти минут полночь"
      const mf = w.minuteForms; // [минута, минуты, минут]
      if (mm === 0) return h12 === 1 ? hour(1) : `${hour(h12)} ${slavicForm(h12, [w.hour, "часа", "часов"])}`; // час, два часа, пять часов
      if (mm === 15) return `${w.quarter} ${nextGen}`;
      if (mm === 30) return `${w.half} ${nextGen}`;
      if (mm < 30) return `${min(mm)} ${slavicForm(mm, mf)} ${nextGen}`;
      if (mm === 45) return `${w.quarterBefore} ${nextNom}`;
      const n = 60 - mm; // "без" + genitive: без одной минуты, без двух минут, без двадцати одной минуты
      const mg = (dict.minutesGenitive || {})[n] ?? String(n);
      return `${w.without} ${mg} ${n % 10 === 1 && n % 100 !== 11 ? mf[1] : mf[2]} ${nextNom}`;
    },
  },

  // 🇺🇦  "п’ять хвилин на восьму", "пів на восьму", "за п’ять хвилин восьма", "за одну хвилину восьма"
  uk: {
    analog({ h, mm, h12, n12, w, hour, min }) {
      const ACC = ["", "першу", "другу", "третю", "четверту", "п’яту", "шосту", "сьому", "восьму", "дев’яту", "десяту", "одинадцяту", "дванадцяту"];
      const nom = (i) => (i === 12 ? "дванадцята" : hour(i)); // the vocabulary holds the cardinal "дванадцять"
      const nextNom = h === 23 ? midnightWord(w, "uk") : nom(n12); // 23:50 -> "за десять хвилин північ"
      const mf = w.minuteForms; // [хвилина, хвилини, хвилин]
      if (mm === 0) return `${nom(h12)} ${w.hour}`;
      if (mm === 15) return `${w.quarter} на ${ACC[n12]}`;
      if (mm === 30) return `пів на ${ACC[n12]}`;
      if (mm < 30) return `${min(mm)} ${slavicForm(mm, mf)} на ${ACC[n12]}`;
      if (mm === 45) return `${w.quarterBefore} ${nextNom}`;
      const n = 60 - mm; // "за" + accusative: за одну хвилину, за дві хвилини, за п’ять хвилин
      const one = n % 10 === 1 && n % 100 !== 11;
      const num = one ? min(n).replace(/одна$/, "одну") : min(n);
      const unit = one ? mf[0].replace(/а$/, "у") : slavicForm(n, mf);
      return `за ${num} ${unit} ${nextNom}`;
    },
  },

  // 🇵🇱  "pięć po siódmej", "wpół do ósmej", "za dziesięć minut ósma", "za minutę ósma"
  pl: {
    analog({ mm, h12, n12, w, hour, min }) {
      const LOC = ["", "pierwszej", "drugiej", "trzeciej", "czwartej", "piątej", "szóstej", "siódmej", "ósmej", "dziewiątej", "dziesiątej", "jedenastej", "dwunastej"]; // genitive = locative
      const mf = w.minuteForms; // [minuta, minuty, minut]
      const num = (n) => (n === 22 ? "dwadzieścia dwie" : min(n)); // minuta is feminine
      if (mm === 0) return `${w.hour} ${hour(h12)}`;
      if (mm === 15) return `${w.quarter} ${w.over} ${LOC[h12]}`;
      if (mm === 30) return `${w.half} ${LOC[n12]}`;
      if (mm < 30) return `${num(mm)} ${polishForm(mm, mf)} ${w.over} ${LOC[h12]}`;
      if (mm === 45) return `za ${w.quarter} ${hour(n12)}`;
      const n = 60 - mm;
      if (n === 1) return `za ${mf[0].replace(/a$/, "ę")} ${hour(n12)}`;
      return `za ${num(n)} ${polishForm(n, mf)} ${hour(n12)}`;
    },
  },

  // 🇩🇪  "Viertel vor vier", "zehn vor halb vier", "eine Minute nach drei", "ein Uhr"
  de: {
    analog: (ctx) => germanic(ctx, { oneHour: "ein", oneMinute: (mf) => `eine ${mf[0]}` }),
  },

  // 🇳🇱  "kwart voor vier", "tien voor half vier"
  nl: {
    analog: (ctx) => germanic(ctx),
  },

  // 🇬🇧  "five past three", "seven minutes past three", "half past three", "quarter to four"
  en: {
    analog({ mm, h12, n12, w, hour, min }) {
      const mf = w.minuteForms; // [minute, minutes]
      const say = (n) => `${min(n)}${showUnit(n) ? ` ${n === 1 ? mf[0] : mf[1]}` : ""}`;
      if (mm === 0) return `${hour(h12)} ${w.hour}`;
      if (mm === 15) return `${w.quarterOver} ${hour(h12)}`;
      if (mm === 30) return `${w.half} ${w.past} ${hour(h12)}`;
      if (mm === 45) return `${w.quarterBefore} ${hour(n12)}`;
      if (mm < 30) return `${say(mm)} ${w.past} ${hour(h12)}`;
      return `${say(60 - mm)} ${w.to} ${hour(n12)}`;
    },
  },

  // 🇫🇷  "trois heures et quart", "quatre heures moins le quart", "trois heures cinq", "quatre heures moins vingt-cinq"
  fr: {
    analog({ mm, h12, n12, w, hour, min }) {
      const hh = (i) => `${hour(i)} ${i === 1 ? "heure" : w.hour}`; // une heure, deux heures (w.hour is the plural)
      const say = (n) => min(n).replace(/\bun$/, "une"); // minutes are feminine: vingt et une
      if (mm === 0) return hh(h12);
      if (mm === 15) return `${hh(h12)} ${w.quarterOver}`;
      if (mm === 30) return `${hh(h12)} ${w.half}`;
      if (mm === 45) return `${hh(n12)} ${w.quarterBefore}`;
      if (mm < 30) return `${hh(h12)} ${say(mm)}`;
      return `${hh(n12)} ${w.to} ${say(60 - mm)}`;
    },
  },

  // 🇵🇹  "três horas", "três e um quarto", "três e meia", "vinte para as quatro", "sete minutos para a uma"
  pt: {
    analog({ mm, h12, n12, w, hour, min }) {
      const mf = w.minuteForms; // [minuto, minutos]
      const say = (n) => `${min(n)}${showUnit(n) ? ` ${n === 1 ? mf[0] : mf[1]}` : ""}`;
      const art = (i) => (i === 1 ? "a" : "as"); // para a uma, para as duas
      if (mm === 0) return `${hour(h12)} ${h12 === 1 ? w.hour : `${w.hour}s`}`; // uma hora, duas horas
      if (mm === 15) return `${hour(h12)} e ${min(15)}`;
      if (mm === 30) return `${hour(h12)} e ${w.half}`;
      if (mm === 45) return `${w.quarterBefore} ${art(n12)} ${hour(n12)}`;
      if (mm < 30) return `${hour(h12)} e ${say(mm)}`;
      return `${say(60 - mm)} ${w.to} ${art(n12)} ${hour(n12)}`;
    },
  },

  // 🇸🇦  "الساعة الثالثة وخمس دقائق", "الساعة الثالثة والنصف", "الساعة الرابعة إلا ربع", "الساعة الرابعة إلا دقيقتين"
  ar: {
    analog({ mm, h12, n12, w, hour, min }) {
      const al = (x) => `ال${x}`;
      const H = (i) => `${al(w.hour)} ${hour(i)}`; // الساعة الثالثة
      // After "إلا" the number is in the accusative: عشرون -> عشرين, اثنتا عشرة -> اثنتي عشرة
      const acc = (x) => x.replace(/ون(?=\s|$)/g, "ين").replace("اثنتا عشرة", "اثنتي عشرة").replace("اثنتان", "اثنتين");
      const say = (n, accusative) => {
        const [one, many] = w.minuteForms; // [دقيقة, دقائق]
        if (n === 1) return accusative ? one : `${one} واحدة`;
        if (n === 2) return accusative ? "دقيقتين" : "دقيقتان";
        return `${accusative ? acc(min(n)) : min(n)} ${n <= 10 ? many : one}`; // 3-10: plural, 11-59: singular
      };
      if (mm === 0) return H(h12);
      if (mm === 15) return `${H(h12)} و${al(w.quarter)}`;
      if (mm === 30) return `${H(h12)} و${al(w.half)}`;
      if (mm < 30) return `${H(h12)} و${say(mm, false)}`;
      if (mm === 45) return `${H(n12)} ${w.to} ${w.quarter}`;
      return `${H(n12)} ${w.to} ${say(60 - mm, true)}`;
    },
  },

  // 🇹🇷  "saat üç", "üçü beş geçiyor", "üç buçuk", "dörde çeyrek var", "dörde yedi dakika var"
  tr: {
    analog({ mm, h12, n12, w, hour, min }) {
      // "geçiyor" takes the accusative of the hour, "var" the dative
      const ACC = ["", "biri", "ikiyi", "üçü", "dördü", "beşi", "altıyı", "yediyi", "sekizi", "dokuzu", "onu", "on biri", "on ikiyi"];
      const DAT = ["", "bire", "ikiye", "üçe", "dörde", "beşe", "altıya", "yediye", "sekize", "dokuza", "ona", "on bire", "on ikiye"];
      const say = (n) => `${min(n)}${showUnit(n) ? ` ${w.minuteForms[0]}` : ""}`;
      if (mm === 0) return `${w.hour} ${hour(h12)}`;
      if (mm === 30) return `${hour(h12)} ${w.half}`;
      if (mm < 30) return `${ACC[h12]} ${say(mm)} ${w.past}`;
      return `${DAT[n12]} ${say(60 - mm)} ${w.to}`;
    },
  },
};

// de, nl: "<minutes> nach/vor <hour>", around the half hour "vor/nach halb <next hour>"
function germanic({ mm, h12, n12, w, hour, min }, { oneHour, oneMinute } = {}) {
  const mf = w.minuteForms;
  const say = (n) => (n === 1 && oneMinute ? oneMinute(mf) : min(n));
  const cur = h12 === 1 && oneHour && mm === 0 ? oneHour : hour(h12);
  if (mm === 0) return `${cur} ${w.hour}`;
  if (mm < 15) return `${say(mm)} ${w.over} ${cur}`;
  if (mm === 15) return `${w.quarter} ${w.over} ${cur}`;
  if (mm < 30) return `${say(30 - mm)} ${w.before} ${w.half} ${hour(n12)}`;
  if (mm === 30) return `${w.half} ${hour(n12)}`;
  if (mm < 45) return `${say(mm - 30)} ${w.over} ${w.half} ${hour(n12)}`;
  if (mm === 45) return `${w.quarter} ${w.before} ${hour(n12)}`;
  return `${say(60 - mm)} ${w.before} ${hour(n12)}`;
}

// ---------------------------------------------------------------- API
export function createTimePhrase({ dictLoader }) {
  // Phrase of the time { h: 0..23, mm: 0..59 } in the language (code like "de" or "de-DE").
  // Returns "" when the language has no vocabulary or no rules.
  // options.useMilitary: reserved for the 24-hour phrase (see the top of the file), not implemented yet.
  function getTimePhrase(langCode, { h, mm }, { useMilitary = false } = {}) {
    const lang = getBaseLang(langCode).toLowerCase();
    const rule = RULES[lang];
    const dict = dictLoader.getDict(lang);
    if (!rule || !dict || !Number.isInteger(h) || !Number.isInteger(mm) || h < 0 || h > 23 || mm < 0 || mm > 59) return "";

    const hours = dict.hours || {};
    const minutes = dict.minutes || {};
    const ctx = {
      h,
      mm,
      h12: to12(h),
      n12: next12(h),
      dict,
      w: dict.words || {},
      hour: (i) => hours[i] ?? String(i),
      min: (n) => minutes[n] ?? String(n),
    };

    let phrase;
    if (useMilitary && rule.military) {
      phrase = rule.military(ctx);
    } else if (mm === 0 && (h === 0 || h === 12)) {
      // 00:00 and 12:00 on the analog clock: midnight / noon where the language has a word for it
      const special = ctx.w[h === 0 ? "midnight" : "noon"] || MIDNIGHT_NOON[lang]?.[h === 0 ? 0 : 1];
      phrase = special || rule.analog(ctx);
    } else {
      phrase = rule.analog(ctx);
    }
    // Empty dictionary words leave double spaces: collapse them
    return phrase.replace(/\s+/g, " ").trim();
  }

  return { getTimePhrase };
}
