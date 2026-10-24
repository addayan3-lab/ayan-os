#!/usr/bin/env node
/**
 * AYAN OS - update only approved Chinese interface translations.
 * Modes: source <path-to-translation.json>
 *        runtime <path-to-flat-zh-CN-openhands.json>
 * Preserves all other language translations. No network or secrets.
 */
const fs = require("node:fs");
const path = require("node:path");
const [mode, file] = process.argv.slice(2);
const overrides = JSON.parse(fs.readFileSync(path.join(__dirname, "zh-CN-overrides.json"), "utf8"));
if (!["source", "runtime"].includes(mode) || !file || !fs.existsSync(file)) {
  console.error("USAGE: node apply-zh-cn.cjs source|runtime <existing-json-file>");
  process.exit(2);
}
const before = fs.readFileSync(file, "utf8");
const json = JSON.parse(before);
let after = before;
const placeholderSet = str => [...String(str).matchAll(/\{\{[^{}]+\}\}/g)].map(x => x[0]).sort().join("|");
if (mode === "source") {
  // Surgical textual replacement: avoid reformatting the 2.5 MB upstream translation file.
  for (const [key, zh] of Object.entries(overrides)) {
    if (!(key in json) || !json[key].en || typeof json[key]["zh-CN"] !== "string") {
      throw Error("MISSING_SOURCE_KEY " + key);
    }
    if (placeholderSet(json[key].en) !== placeholderSet(zh)) {
      throw Error("PLACEHOLDER_MISMATCH " + key);
    }
    const prefix = "  " + JSON.stringify(key) + ": {";
    const start = after.indexOf(prefix);
    if (start < 0) throw Error("KEY_FORMAT_NOT_FOUND " + key);
    const end = after.indexOf("\n  }", start);
    if (end < 0) throw Error("NO_ENTRY_END " + key);
    const segment = after.slice(start, end);
    const regex = /("zh-CN":\s*)"(?:[^"\\]|\\.)*"/g;
    const hits = [...segment.matchAll(regex)];
    if (hits.length !== 1) throw Error("ZH_ENTRY_NOT_UNIQUE " + key + " hits=" + hits.length);
    const updated = segment.replace(regex, (_whole, label) => label + JSON.stringify(zh));
    after = after.slice(0, start) + updated + after.slice(end);
  }
} else {
  for (const [key, zh] of Object.entries(overrides)) {
    if (!(key in json)) throw Error("RUNTIME_KEY_MISSING " + key);
    json[key] = zh;
  }
  after = JSON.stringify(json, null, 2) + "\n";
}
const parsed = JSON.parse(after);
for (const [key, zh] of Object.entries(overrides)) {
  const translated = mode === "source" ? parsed[key]["zh-CN"] : parsed[key];
  if (translated !== zh) throw Error("VERIFY_FAILED " + key);
}
if (after !== before) fs.writeFileSync(file, after, "utf8");
console.log("AYAN_ZH_PATCH_OK mode=" + mode + " count=" + Object.keys(overrides).length + " changed=" + (before !== after));
