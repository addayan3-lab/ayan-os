#!/usr/bin/env node
// AYAN OS translation correctness checks: read-only. No network or secrets.
const fs = require("node:fs");
const path = require("node:path");
const base = "C:\\AI\\ayan-os";
const backups = "C:\\AI\\ayan-os-runtime\\i18n-validation";
const sourcePath = path.join(base, "src", "i18n", "translation.json");
const sourceBack = path.join(backups, "translation-original.json");
const mapPath = path.join(__dirname, "zh-CN-overrides.json");
const livePath = path.join(backups, "openhands.zh-CN-patched.json");
const read = p => JSON.parse(fs.readFileSync(p, "utf8"));
const before = read(sourceBack);
const after = read(sourcePath);
const map = read(mapPath);
const live = read(livePath);
const keys = Object.keys(before);
if (keys.length !== Object.keys(after).length || keys.length !== Object.keys(live).length) {
  throw Error("TRANSLATION_KEY_COUNT_CHANGED");
}
let changed = 0;
for (const key of keys) {
  if (!(key in after) || !(key in live)) throw Error("MISSING_KEY_" + key);
  const originalLanguages = before[key];
  const revisedLanguages = after[key];
  for (const lang of Object.keys(originalLanguages)) {
    if (lang !== "zh-CN" && originalLanguages[lang] !== revisedLanguages[lang]) {
      throw Error("OTHER_LANGUAGE_CHANGED_" + key + "_" + lang);
    }
  }
  if (originalLanguages["zh-CN"] !== revisedLanguages["zh-CN"]) {
    if (!(key in map) || revisedLanguages["zh-CN"] !== map[key]) {
      throw Error("UNAPPROVED_TRANSLATION_CHANGE_" + key);
    }
    changed += 1;
  }
  if (live[key] !== revisedLanguages["zh-CN"]) {
    throw Error("LIVE_LOCALE_DIFFERS_FROM_SOURCE_" + key);
  }
}
if (changed < 70) throw Error("TOO_FEW_TRANSLATIONS_CHANGED");
if (after["SIDEBAR$SKILLS"]["zh-CN"] !== "Skills") throw Error("SKILLS_LABEL_CHANGED");
if (after["NAV$EXTENSIONS"]["zh-CN"] !== "Apps") throw Error("APPS_LABEL_CHANGED");
console.log("AYAN_ZH_TRANSLATION_VERIFIED sourceKeys=" + keys.length +
  " modified=" + changed + " reviewed=" + Object.keys(map).length +
  " unchangedLanguages=PASS glossary=PASS runtime=PASS");
