#!/usr/bin/env node
/**
 * Live, zero-inference acceptance for AYAN Windows Native G02-G04.
 * Only official CLI metadata, login status, app-server initialize and ACP
 * initialize. No session creation, model inference, media generation or GPU.
 */
import { Bridge } from "../bridge/bridge.mjs";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const bridge = new Bridge({ root: await mkdtemp(join(tmpdir(), "ayan-native-live-")) });
const output = [];
let ok = true;
const checks = [
  { adapter: "codex", operation: "check", verify: value => value.auth === "chatgpt-subscription" && value.installed === true },
  { adapter: "codex", operation: "protocol-check", verify: value => value.initialized === true && value.transport === "official-app-server-stdio" },
  { adapter: "opencode", operation: "check", verify: value => value.acp?.initialized === true && value.acp.protocolVersion === 1 },
  { adapter: "deepseek", operation: "check", verify: value => value.acp?.initialized === true && value.acp.protocolVersion === 1 },
  { adapter: "opencode", operation: "check", verify: value => value.acp?.initialized === true },
  { adapter: "deepseek", operation: "check", verify: value => value.acp?.initialized === true },
  { adapter: "comfyui", operation: "check", verify: value => value.online === true },
  { adapter: "comfyui", operation: "queue-counts", verify: value => Number.isInteger(value.runningJobs) && Number.isInteger(value.pendingJobs) },
  { adapter: "zzdh", operation: "check", verify: value => value.selfTest === true && value.pluginHostExecution === "not-verified" },
];
for (const { adapter, operation, verify } of checks) {
  const receipt = await bridge.task({ adapter, operation });
  const passed = receipt.state === "succeeded" && verify(receipt.data || {});
  const retrieved = await bridge.receipt(receipt.id);
  assert.equal(retrieved.id, receipt.id);
  output.push({ adapter, operation, passed, receiptId: receipt.id, error: receipt.error?.code || null });
  console.log((passed ? "PASS" : "FAIL") + " " + adapter + "/" + operation +
    " receipt=" + receipt.id + (receipt.error ? " error=" + receipt.error.code : ""));
  if (!passed) ok = false;
}
const blocked = await bridge.task({ adapter: "comfyui", operation: "generate", secret: "do-not-store" });
const denied = blocked.state === "failed" && blocked.error?.code === "POLICY_DENIED";
if (!denied) ok = false;
console.log((denied ? "PASS" : "FAIL") + " ComfyUI generation denied receipt=" + blocked.id);
const result = { schema: "ayan-native-live-acceptance/v1", versionTarget: "0.2.3",
  at: new Date().toISOString(), passed: ok, checks: output,
  generationDenied: denied, gpuStarted: false, inferenceCalled: false,
  officialZzdhHostValidated: false
};
await writeFile(join(bridge.root, "acceptance.json"), JSON.stringify(result, null, 2), { flag: "wx" });
console.log("FINAL " + JSON.stringify({ passed: ok, checks: output.length, denied, reportDirectory: bridge.root }));
if (!ok) process.exitCode = 1;
