// AYAN OS internal Docker patcher. Runs inside the preverified isolated container.
// Patch only a static frontend HTML reference; does not read credentials.
// Reset safely by copying index.html.ayan-before-skill-intros back to index.html.
"use strict";
const fs = require("node:fs");
const htmlFile = "/opt/agent-canvas/frontend/index.html";
const backupFile = htmlFile + ".ayan-before-skill-intros";
const jsFile = "/opt/agent-canvas/frontend/ayan-os/skill-intros.zh-CN.js";
const tag = '<script defer src="/canvas/ayan-os/skill-intros.zh-CN.js"></script>';
if (!fs.existsSync(htmlFile) || !fs.existsSync(jsFile)) {
  console.error("MISSING_FRONTEND_OR_TRANSLATION");
  process.exit(2);
}
const original = fs.readFileSync(htmlFile, "utf8");
if (original.includes(tag)) {
  console.log("AYAN_SKILLS_ZH_ALREADY_INSTALLED");
  process.exit(0);
}
if (!original.includes("</body>")) {
  console.error("UNEXPECTED_HTML_LAYOUT_NO_BODY_END");
  process.exit(3);
}
if (!fs.existsSync(backupFile)) {
  fs.copyFileSync(htmlFile, backupFile);
}
fs.writeFileSync(htmlFile, original.replace("</body>", tag + "\n</body>"));
const modified = fs.readFileSync(htmlFile, "utf8");
if (!modified.includes(tag)) {
  console.error("PATCH_VERIFICATION_FAILED");
  process.exit(4);
}
console.log("AYAN_SKILLS_ZH_INSTALLED");
