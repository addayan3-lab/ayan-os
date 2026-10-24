// Idempotent installer for AYAN OS UI catalog translations; no credential reads.
"use strict";
const fs = require("node:fs");
const html = "/opt/agent-canvas/frontend/index.html";
const backup = html + ".ayan-before-catalog-intros";
const assets = [
 "/opt/agent-canvas/frontend/ayan-os/catalog-intros.zh-CN.js",
 "/opt/agent-canvas/frontend/ayan-os/catalog-intros.zh-CN.json"
];
const tag = '<script defer src="/canvas/ayan-os/catalog-intros.zh-CN.js"></script>';
if (!fs.existsSync(html) || assets.some(f => !fs.existsSync(f))) {
 console.error("MISSING_HTML_OR_TRANSLATION_ASSET"); process.exit(2);
}
let original=fs.readFileSync(html,"utf8");
if (original.includes(tag)) { console.log("AYAN_CATALOG_INTROS_ALREADY_INSTALLED");process.exit(0); }
if (!original.includes("</body>")) { console.error("UNEXPECTED_HTML_LAYOUT");process.exit(3); }
if (!fs.existsSync(backup)) fs.copyFileSync(html,backup);
original=original.replace("</body>",tag+"\n</body>");
fs.writeFileSync(html,original,"utf8");
console.log("AYAN_CATALOG_INTROS_INSTALLED");
