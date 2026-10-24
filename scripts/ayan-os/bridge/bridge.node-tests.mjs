import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Bridge } from "./bridge.mjs";
import { runProcess, rpcExchange } from "./process.mjs";

const child = { file: process.execPath, args: [fileURLToPath(new URL("./fixtures/child.mjs", import.meta.url))] };
const temporary = () => mkdtemp(join(tmpdir(), "ayan-bridge-test-"));

test("disallowed generation gets a durable failure receipt without spawning", async () => {
  const root = await temporary();
  const bridge = new Bridge({ root, discover: async () => { throw new Error("must not discover"); } });
  const receipt = await bridge.task({ adapter: "comfyui", operation: "generate", token: "private-value" });
  assert.equal(receipt.state, "failed");
  assert.equal(receipt.error.code, "POLICY_DENIED");
  assert.deepEqual(await bridge.receipt(receipt.id), receipt);
  assert.equal((await readFile(join(root, "errors.jsonl"), "utf8")).includes("private-value"), false);
});

test("missing CLI has a distinct failure result and completed timestamps", async () => {
  const bridge = new Bridge({ root: await temporary(), discover: async () => ({}) });
  const receipt = await bridge.task({ adapter: "codex", operation: "check" });
  assert.equal(receipt.error.code, "NOT_INSTALLED");
  assert.equal(receipt.error.retryable, false);
  assert.ok(receipt.finishedAt >= receipt.startedAt);
});

test("receipt lookup rejects traversal", async () => {
  const root = await temporary();
  const bridge = new Bridge({ root });
  await assert.rejects(bridge.receipt("../outside"), /POLICY_DENIED/);
});

test("task directories reject junction escapes", async t => {
  const root = await temporary();
  const bridge = new Bridge({ root });
  const outside = await temporary();
  try {
    await symlink(outside, join(root, "tasks"), process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (error.code === "EPERM") { t.skip("Windows sandbox denies creating junction fixtures."); return; }
    throw error;
  }
  await assert.rejects(bridge.task({ adapter: "codex", operation: "check" }), /POLICY_DENIED/);
  assert.deepEqual(await readdir(outside), []);
});

test("ACP correlates initialize responses and refuses agent tool requests", async () => {
  const results = await rpcExchange(child, [{ method: "initialize", params: { protocolVersion: 1, clientCapabilities: {} } }], { cwd: await temporary() });
  assert.equal(results[0].protocolVersion, 1);
  assert.equal(results[0].denialObserved, true);
});

test("runner bounds output and kills an unresponsive child", async () => {
  const cwd = await temporary();
  await assert.rejects(runProcess({ ...child, args: [...child.args, "overflow"] }, [], { cwd, maxBytes: 128 }), /OUTPUT_LIMIT/);
  await assert.rejects(runProcess({ ...child, args: [...child.args, "hang"] }, [], { cwd, timeoutMs: 120 }), /TIMEOUT/);
});

test("process failures never persist child stderr", async () => {
  const bridge = new Bridge({ root: await temporary(), discover: async () => ({ codex: { ...child, args: [...child.args, "failure"] } }) });
  const receipt = await bridge.task({ adapter: "codex", operation: "check" });
  assert.equal(receipt.state, "failed");
  assert.equal(JSON.stringify(receipt).includes("sk-secret-canary"), false);
});

test("CLI and MCP share capability discovery without starting agents", async () => {
  const bridge = new Bridge({ root: await temporary() });
  const capabilities = bridge.capabilities();
  assert.deepEqual(capabilities.map(x => x.adapter), ["codex", "opencode", "deepseek", "zzdh", "comfyui"]);
  assert.ok(capabilities.every(x => x.operations.every(y => !/exec|generate|prompt/.test(y))));
  const result = await rpcExchange({ file: process.execPath, args: [fileURLToPath(new URL("./windows-agent-bridge.mjs", import.meta.url)), "mcp"] }, [
    { method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1" } } },
    { method: "tools/list", params: {} },
    { method: "tools/call", params: { name: "bridge_capabilities", arguments: {} } },
    { method: "tools/call", params: { name: "arbitrary_command", arguments: {} } },
  ], { cwd: await temporary() });
  assert.equal(result[0].serverInfo.name, "ayan-windows-agent-bridge");
  assert.ok(result[1].tools.some(x => x.name === "bridge_task"));
  assert.equal(JSON.parse(result[2].content[0].text).length, 5);
  assert.equal(result[3].isError, true);
});


test("OpenCode version prefixes and ACP fields are normalized without forwarding extra data", async () => {
  const bridge = new Bridge({ root: await temporary(), discover: async () => ({
    opencode: { ...child, args: [...child.args, "opencode"] },
  }) });
  const receipt = await bridge.task({ adapter: "opencode", operation: "check" });
  assert.equal(receipt.state, "succeeded");
  assert.equal(receipt.data.version, "2.1.2");
  assert.equal(receipt.data.acp.initialized, true);
  assert.equal(JSON.stringify(receipt).includes("sk-secret-canary"), false);
});


for (const mode of ["windows", "docker"]) {
  test("existing ComfyUI MCP preserves GET-only metadata and counts in " + mode + " mode", async () => {
    const command = {
      file: process.execPath,
      args: ["--import", new URL("./fixtures/comfy-transport.mjs", import.meta.url).href,
        fileURLToPath(new URL("../mcp/comfyui-readonly.mjs", import.meta.url))],
      env: { AYAN_COMFYUI_HOST_MODE: mode },
    };
    const result = await rpcExchange(command, [
      { method: "initialize", params: { protocolVersion: "2024-11-05" } },
      { method: "tools/call", params: { name: "comfyui_health", arguments: {} } },
      { method: "tools/call", params: { name: "comfyui_queue_counts", arguments: {} } },
      { method: "tools/call", params: { name: "comfyui_generate", arguments: {} } },
    ], { cwd: await temporary() });
    assert.equal(JSON.parse(result[1].content[0].text).device_count, 1);
    assert.deepEqual(JSON.parse(result[2].content[0].text), { online: true, running_jobs: 1, pending_jobs: 2 });
    assert.equal(result[3].isError, true);
    assert.equal(JSON.stringify(result).includes("private-prompt"), false);
    assert.equal(JSON.stringify(result).includes("must-not-leak"), false);
  });
}


test("official logged-out Codex becomes AUTH_REQUIRED rather than a generic process error", async () => {
  const bridge = new Bridge({ root: await temporary(), discover: async () => ({
    codex: { ...child, args: [...child.args, "codex-unauth"] },
  }) });
  const receipt = await bridge.task({ adapter: "codex", operation: "check" });
  assert.equal(receipt.error.code, "AUTH_REQUIRED");
});


test("concurrent checks receive independent receipts when the state directory is first created", async () => {
  const root = await temporary();
  const bridge = new Bridge({ root });
  const receipts = await Promise.all(Array.from({ length: 3 }, () =>
    bridge.task({ adapter: "comfyui", operation: "generate" })));
  assert.equal(new Set(receipts.map(x => x.id)).size, 3);
  for (const receipt of receipts) assert.deepEqual(await bridge.receipt(receipt.id), receipt);
});

