// Small helpers without dependencies on other modules

let debug = false;

// Switch the debug output on or off (developerMode in config/config.json)
function setDebug(on) {
  debug = Boolean(on);
}

function getBaseLang(code) {
  return String(code || "").split(/[-_]/)[0];
}

function normalizeLangCode(code) {
  if (!code) return "";
  return String(code).trim().toLowerCase().replace("_", "-");
}


function parseTimeInput(input) {
  if (!input || typeof input !== "string") return null;
  const m = input.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, mm: min };
}

function chooseForm(n, forms) {
  if (!forms || !forms.length) return "";
  n = Math.abs(n);
  if (forms.length === 3) {
    // slavic: "1 минута", "2 минуты", "5 минут", ",59 минут (без одной минуты)"
    if (n % 10 === 1 && n % 100 !== 11) return forms[0];
    if (n === 59) return forms[1];
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return forms[1];
    return forms[2];
  }
  if (forms.length === 2) {
    // simple: 1 minute, 2 minutes
    return n === 1 ? forms[0] : forms[1];
  }
  return forms[0];
}

function generateRandomTimeString() {
  const h = Math.floor(Math.random() * 24);
  // Random minutes go in steps of 5 (the dictionaries hold every minute)
  const m = Math.floor(Math.random() * 12) * 5;
  return `${h}:${String(m).padStart(2, "0")}`;
}

function log(...args) {
  if (debug) console.log(...args);
}

export const Utils = {
  setDebug,
  getBaseLang,
  normalizeLangCode,
  parseTimeInput,
  chooseForm,
  generateRandomTimeString,
  log,
};
