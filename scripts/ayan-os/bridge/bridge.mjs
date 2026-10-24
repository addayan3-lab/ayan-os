import { randomUUID, createHash } from "node:crypto";
import { appendFile, mkdir, lstat, readFile, writeFile } from "node:fs/promises";
import { dirname, join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { discover } from "./discovery.mjs";
import { BridgeError, runProcess, rpcExchange } from "./process.mjs";

const here = dirname(fileURLToPath(import.meta.url));
export const defaultRoot = resolve(here, "../../../.tmp/windows-agent-bridge");
const catalog = [
  { adapter: "codex", transport: "official-windows-cli", operations: ["check", "protocol-check"], inference: false },
  { adapter: "opencode", transport: "official-cli-acp", operations: ["check"], inference: false },
  { adapter: "deepseek", transport: "official-dsh-acp", operations: ["check"], inference: false },
  { adapter: "zzdh", transport: "official-python-tool-plugin", operations: ["check", "handoff-check"], inference: false },
  { adapter: "comfyui", transport: "existing-readonly-mcp", operations: ["check", "queue-counts"], inference: false },
];
const errors = {
  STATE_RUNTIME_UNAVAILABLE: [false, "The official Codex state runtime could not be initialized in the current filesystem permissions."],
  NETWORK_DENIED: [false, "The execution environment denied the read-only local socket connection."],
  VALIDATION_FAILED: [false, "The handoff did not pass deterministic schema validation."],
  POLICY_DENIED: [false, "Operation or arguments are outside the V0.1 validation allowlist."],
  NOT_INSTALLED: [false, "Official executable or required public documentation was not found."],
  AUTH_REQUIRED: [false, "Use the official application login UI; the bridge does not migrate credentials."],
  TIMEOUT: [true, "The adapter exceeded its bounded deadline; its process tree was stopped."],
  OUTPUT_LIMIT: [false, "The adapter exceeded its bounded output limit."],
  PROCESS_FAILED: [true, "The official process failed; raw stdout/stderr are not persisted."],
  PROTOCOL_ERROR: [false, "The adapter did not return the expected protocol response."],
  TOOL_FAILED: [true, "The read-only MCP tool reported a failure."],
};
const versionOf = text => {
  const match = text.match(/\d+\.\d+\.\d+(?:[-+.][a-zA-Z0-9.-]+)?\b/);
  if (!match) throw new BridgeError("PROTOCOL_ERROR");
  return match[0];
};
const object = value => value && typeof value === "object" && !Array.isArray(value);
const onlyKeys = (value, allowed) => object(value) && Object.keys(value).every(x => allowed.includes(x));

async function safePath(path, directory = false) {
  const absolute = resolve(path);
  const parts = absolute.slice(parse(absolute).root.length).split(/[\\/]/).filter(Boolean);
  let current = parse(absolute).root;
  for (let i = 0; i < parts.length; i++) {
    current = join(current, parts[i]);
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink() || (i < parts.length - 1 && !info.isDirectory())) throw new BridgeError("POLICY_DENIED");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      if (!directory && i < parts.length - 1) throw error;
      if (directory) {
        try { await mkdir(current); } catch (createdByPeer) {
          if (createdByPeer.code !== "EEXIST") throw createdByPeer;
          const info = await lstat(current);
          if (info.isSymbolicLink() || !info.isDirectory()) throw new BridgeError("POLICY_DENIED");
        }
      }
    }
  }
  return absolute;
}

export class Bridge {
  constructor(options = {}) {
    this.root = resolve(options.root || defaultRoot);
    this.discover = options.discover || discover;
  }
  capabilities() { return structuredClone(catalog); }
  async receipt(id) {
    if (typeof id !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(id)) throw new BridgeError("POLICY_DENIED");
    try {
      return JSON.parse(await readFile(await safePath(join(this.root, "tasks", id, "receipt.json")), "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
      return JSON.parse(await readFile(await safePath(join(this.root, "tasks", id, "started.json")), "utf8"));
    }
  }
  async task(request) {
    const id = randomUUID();
    const cwd = await safePath(join(this.root, "tasks", id), true);
    const receiptFile = join(cwd, "receipt.json");
    const valid = onlyKeys(request, ["adapter", "operation", "handoff"]) &&
      catalog.some(x => x.adapter === request.adapter && x.operations.includes(request.operation)) &&
      (request.operation === "handoff-check" || !Object.hasOwn(request, "handoff"));
    const receipt = {
      schemaVersion: 1, bridgeVersion: "0.1.0", id,
      adapter: valid ? request.adapter : "rejected", operation: valid ? request.operation : "rejected",
      state: "running", startedAt: new Date().toISOString(), finishedAt: null,
      policy: { inference: false, paidApi: false, gpu: false, productionAssetWrites: false },
    };
    await writeFile(join(cwd, "started.json"), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
    try {
      if (!valid) throw new BridgeError("POLICY_DENIED");
      receipt.data = await this.execute(request, cwd);
      receipt.state = "succeeded";
    } catch (error) {
      const code = Object.hasOwn(errors, error.code) ? error.code : "PROCESS_FAILED";
      receipt.state = "failed";
      receipt.error = { code, retryable: errors[code][0], message: errors[code][1] };
    }
    receipt.finishedAt = new Date().toISOString();
    await safePath(receiptFile);
    await writeFile(receiptFile, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
    if (receipt.error) {
      await appendFile(await safePath(join(this.root, "errors.jsonl")), JSON.stringify({
        id, adapter: receipt.adapter, operation: receipt.operation, at: receipt.finishedAt, ...receipt.error,
      }) + "\n");
    }
    return receipt;
  }
  async status() {
    const receipts = [];
    for (const { adapter } of catalog) receipts.push(await this.task({ adapter, operation: "check" }));
    const protocolChecks = [await this.task({ adapter: "codex", operation: "protocol-check" })];
    return { bridgeVersion: "0.1.0", checkedAt: new Date().toISOString(),
      allPassed: [...receipts, ...protocolChecks].every(x => x.state === "succeeded"), receipts, protocolChecks };
  }
  async execute(request, cwd) {
    const { adapter, operation } = request;
    if (adapter === "comfyui") {
      const [initialized, listing, result] = await rpcExchange({
        file: process.execPath, args: [resolve(here, "../mcp/comfyui-readonly.mjs")],
        env: { AYAN_COMFYUI_HOST_MODE: "windows" },
      }, [
        { method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "ayan-bridge", version: "0.1.0" } } },
        { method: "tools/list", params: {} },
        { method: "tools/call", params: { name: operation === "queue-counts" ? "comfyui_queue_counts" : "comfyui_health", arguments: {} } },
      ], { cwd });
      if (result?.isError && result.content?.some(x => x.text === "NETWORK_DENIED")) throw new BridgeError("NETWORK_DENIED");
      if (initialized?.serverInfo?.name !== "ayan-comfyui-readonly" ||
        listing?.tools?.length !== 2 || result?.isError) throw new BridgeError("TOOL_FAILED");
      const value = JSON.parse(result.content[0].text);
      // Project only documented metadata/counts, never prompts, file paths, or raw tool output.
      if (operation === "queue-counts") {
        if (!Number.isInteger(value.running_jobs) || !Number.isInteger(value.pending_jobs)) throw new BridgeError("PROTOCOL_ERROR");
        return { online: value.online === true, runningJobs: value.running_jobs, pendingJobs: value.pending_jobs };
      }
      return { online: value.online === true, version: versionOf(value.comfyui_version), deviceCount: value.device_count };
    }
    const installed = await this.discover();
    const command = installed[adapter];
    if (!command) throw new BridgeError("NOT_INSTALLED");
    if (adapter === "codex") {
      const version = versionOf((await runProcess(command, ["--version"], { cwd })).stdout);
      const login = await runProcess(command, ["login", "status"], { cwd, acceptExitCodes: [1] });
      if (!/Logged in using ChatGPT/i.test(login.stdout + login.stderr)) throw new BridgeError("AUTH_REQUIRED");
      if (operation === "protocol-check") {
        const [result] = await rpcExchange({ ...command, args: [...(command.args || []), "app-server", "--stdio"] }, [
          { method: "initialize", params: { clientInfo: { name: "ayan_bridge", title: "AYAN Windows Agent Bridge", version: "0.1.0" }, capabilities: { experimentalApi: false } } },
        ], { cwd });
        if (typeof result?.userAgent !== "string") throw new BridgeError("PROTOCOL_ERROR");
        return { version, transport: "official-app-server-stdio", initialized: true, inferenceVerified: false };
      }
      return { version, installed: true, auth: "chatgpt-subscription", authSource: "official-login-status", inferenceVerified: false };
    }
    if (adapter === "opencode" || adapter === "deepseek") {
      const version = versionOf((await runProcess(command, ["--version"], { cwd })).stdout);
      const args = adapter === "deepseek" ? ["--profile", "acp"] : ["acp"];
      const [initialization] = await rpcExchange({ ...command, args: [...(command.args || []), ...args] }, [
        { method: "initialize", params: { protocolVersion: 1, clientInfo: { name: "ayan-bridge", version: "0.1.0" }, clientCapabilities: {} } },
      ], { cwd, timeoutMs: 30000 });
      if (initialization?.protocolVersion !== 1 || !object(initialization.agentCapabilities)) throw new BridgeError("PROTOCOL_ERROR");
      return { version, installed: true, acp: { initialized: true, protocolVersion: 1,
        canLoadSession: initialization.agentCapabilities.loadSession === true },
        auth: "not-checked", inferenceVerified: false };
    }
    if (adapter === "zzdh") {
      const docs = join(command.root, "_internal", "插件开放包");
      const hashes = {};
      for (const name of ["AI_CODING_GUIDE.md", "TOOL_PLUGIN_DEV_GUIDE.md", "GENERATION_PLUGIN_DEV_GUIDE.md"]) {
        let content;
        try { content = await readFile(join(docs, name)); } catch { throw new BridgeError("NOT_INSTALLED"); }
        hashes[name] = createHash("sha256").update(content).digest("hex");
      }
      const inputFile = join(cwd, "handoff.json");
      const handoff = operation === "handoff-check" ? request.handoff : {
        schemaVersion: 1, taskId: "isolated-one-minute-smoke",
        shots: [{ id: "shot-01", duration: 30, prompt: "Synthetic opening" }, { id: "shot-02", duration: 30, prompt: "Synthetic closing" }],
      };
      if (Buffer.byteLength(JSON.stringify(handoff) || "") > 65536) throw new BridgeError("POLICY_DENIED");
      await writeFile(inputFile, JSON.stringify(handoff ?? null), { flag: "wx" });
      const output = await runProcess(command, ["-B", join(here, "plugin-smoke.py"), inputFile], { cwd });
      let value;
      try { value = JSON.parse(output.stdout); } catch { throw new BridgeError("PROTOCOL_ERROR"); }
      if (value.selfTest !== true || !object(value.handoff)) throw new BridgeError("PROTOCOL_ERROR");
      if (value.handoff.ok !== true) throw new BridgeError("VALIDATION_FAILED");
      return { officialDocsSha256: hashes, selfTest: true, handoff: value.handoff,
        pluginHostExecution: "not-verified", standaloneCliMcp: "not-documented-in-inspected-public-docs" };
    }
    throw new BridgeError("POLICY_DENIED");
  }
}

