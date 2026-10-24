#!/usr/bin/env node
// AYAN OS baseline check: no network, no installation, no LLM calls.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const failed = [];
const check = (label, ok) => {
  console.log((ok ? "PASS " : "FAIL ") + label);
  if (!ok) failed.push(label);
};
const git = (...args) => execFileSync("git", ["-C", dir, ...args], {
  encoding: "utf8",
  windowsHide: true,
}).trim();

check("MIT license retained", fs.existsSync(path.join(dir, "LICENSE")));
check("package.json present", fs.existsSync(path.join(dir, "package.json")));
check("README.windows.md present", fs.existsSync(path.join(dir, "README.windows.md")));
check("frontend src present", fs.existsSync(path.join(dir, "src")));
check("AYAN baseline document present", fs.existsSync(path.join(dir, "docs/ayan-os/BASELINE.md")));

check("AYAN validation branch", git("branch", "--show-current") === "ayan-os/base-validation");
check("upstream points to OpenHands", /^https:\/\/github\.com\/OpenHands\/OpenHands(?:\.git)?$/.test(git("remote", "get-url", "upstream")));
check("initial source commit exists", git("cat-file", "-t", "11eba891cb2455f87253888d9d3bf3f6b0f12bc1") === "commit");

const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
check("actual OpenHands Agent Canvas package", pkg.name === "@openhands/agent-canvas");
const remotes = git("remote").split(/\r?\n/);
console.log(remotes.includes("origin") ? "INFO online fork remote configured" : "INFO online fork remote pending");
console.log(failed.length ? "AYAN_BASELINE_FAILED" : "AYAN_BASELINE_OK");
process.exitCode = failed.length ? 1 : 0;
