#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Bridge, defaultRoot } from "./bridge.mjs";

const bridge = new Bridge();
const status = await bridge.status();
const protocol = status.protocolChecks[0];
const queue = await bridge.task({ adapter: "comfyui", operation: "queue-counts" });
const denied = await bridge.task({ adapter: "comfyui", operation: "generate" });
const invalidHandoff = await bridge.task({ adapter: "zzdh", operation: "handoff-check", handoff: {
  schemaVersion: 1, taskId: "invalid-synthetic-sample", shots: [{ id: "01", duration: -1, prompt: "test" }],
} });
assert.equal(denied.error.code, "POLICY_DENIED");
assert.equal(invalidHandoff.error.code, "VALIDATION_FAILED");
for (const receipt of [...status.receipts, protocol, queue, denied, invalidHandoff]) {
  assert.deepEqual(await bridge.receipt(receipt.id), receipt);
}
const result = {
  schemaVersion: 1, checkedAt: new Date().toISOString(), mode: "isolated-no-inference",
  liveChecks: status.receipts, codexProtocol: protocol, comfyQueue: queue,
  policyChecks: { deniedGeneration: denied.state === "failed", invalidHandoffRejected: invalidHandoff.state === "failed", receiptRoundTrips: 9 },
  allLiveChecksPassed: status.allPassed && protocol.state === "succeeded" && queue.state === "succeeded",
};
await mkdir(defaultRoot, { recursive: true });
await writeFile(join(defaultRoot, "acceptance.json"), JSON.stringify(result, null, 2) + "\n");
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
if (!result.allLiveChecksPassed) process.exitCode = 1;

