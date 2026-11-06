// Prints the time phrases of every language (all 60 minutes of one hour) to read them by eye.
// Run in the project root:  node tools/check-time-phrases.mjs [lang] [hour]
//   node tools/check-time-phrases.mjs            all languages, hour 3
//   node tools/check-time-phrases.mjs ru 11      Russian, hour 11 (the next hour is 12)
// Exit code 1 when a phrase is empty or contains "undefined" / "NaN".
import { readFileSync, readdirSync } from "node:fs";
import { createTimePhrase } from "../src/js/features/time-phrase.js";

const dir = new URL("../src/vocabs/", import.meta.url);
const dicts = {};
for (const f of readdirSync(dir).filter((n) => n.endsWith(".json"))) {
  dicts[f.slice(0, -5)] = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
}
const { getTimePhrase } = createTimePhrase({ dictLoader: { getDict: (l) => dicts[l] } });

const [langArg, hourArg] = process.argv.slice(2);
const langs = langArg ? [langArg] : Object.keys(dicts).sort();
const hour = hourArg === undefined ? 3 : Number(hourArg);
let bad = 0;

for (const lang of langs) {
  console.log(`\n=== ${lang} ===`);
  const rows = [
    [0, 0],
    [12, 0],
    ...Array.from({ length: 60 }, (_, mm) => [hour, mm]),
  ];
  for (const [h, mm] of rows) {
    const phrase = getTimePhrase(lang, { h, mm });
    if (!phrase || /undefined|NaN/.test(phrase)) bad++;
    console.log(`${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}  ${phrase}`);
  }
}
if (bad) console.log(`\nBAD PHRASES: ${bad}`);
process.exit(bad ? 1 : 0);
