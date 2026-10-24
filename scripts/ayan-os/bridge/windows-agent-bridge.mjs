#!/usr/bin/env node
import readline from "node:readline";
import { Bridge } from "./bridge.mjs";
import { stopManagedChildren } from "./process.mjs";

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.once(signal, async () => { await stopManagedChildren(); process.exit(130); });
}

const bridge = new Bridge();
const empty = { type: "object", properties: {}, additionalProperties: false };
const tools = [
  { name: "bridge_status", description: "检查 Windows CLI、ACP、官方 Python 插件和只读 ComfyUI；不调用模型。", inputSchema: empty },
  { name: "bridge_capabilities", description: "列出允许的适配器、操作和限制，不启动进程。", inputSchema: empty },
  { name: "bridge_task", description: "执行白名单检查并保存任务回执，不接受命令、生成请求或付费 API。", inputSchema: {
    type: "object", additionalProperties: false, properties: {
      adapter: { type: "string", enum: ["codex", "opencode", "deepseek", "zzdh", "comfyui"] },
      operation: { type: "string", enum: ["check", "protocol-check", "queue-counts", "handoff-check"] }, handoff: { type: "object" },
    }, required: ["adapter", "operation"],
  } },
  { name: "bridge_receipt", description: "按 UUID 读取本桥接器的任务回执。", inputSchema: {
    type: "object", additionalProperties: false, properties: { id: { type: "string" } }, required: ["id"],
  } },
];

async function call(name, args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) throw Error("INVALID_ARGUMENTS");
  if (name === "bridge_task") return bridge.task(args);
  if (name === "bridge_receipt" && Object.keys(args).length === 1) return bridge.receipt(args.id);
  if (Object.keys(args).length) throw Error("INVALID_ARGUMENTS");
  if (name === "bridge_status") return bridge.status();
  if (name === "bridge_capabilities") return bridge.capabilities();
  throw Error("UNKNOWN_TOOL");
}
const emit = value => process.stdout.write(JSON.stringify(value) + "\n");

async function mcp() {
  for await (const line of readline.createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    let request;
    try { request = JSON.parse(line); } catch { emit({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); continue; }
    if (!request || request.jsonrpc !== "2.0" || Array.isArray(request)) {
      emit({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid request" } }); continue;
    }
    if (request.id === undefined) continue;
    const response = { jsonrpc: "2.0", id: request.id };
    if (line.length > 65536) {
      emit({ ...response, error: { code: -32602, message: "Input too large" } });
    } else if (request.method === "initialize") {
      emit({ ...response, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} },
        serverInfo: { name: "ayan-windows-agent-bridge", version: "0.1.0" } } });
    } else if (request.method === "ping") {
      emit({ ...response, result: {} });
    } else if (request.method === "tools/list") {
      emit({ ...response, result: { tools } });
    } else if (request.method === "tools/call") {
      try {
        const value = await call(request.params?.name, request.params?.arguments ?? {});
        emit({ ...response, result: { isError: value?.state === "failed", content: [{ type: "text", text: JSON.stringify(value) }] } });
      } catch {
        emit({ ...response, result: { isError: true, content: [{ type: "text", text: "Request failed: invalid arguments, unknown tool, or unavailable receipt." }] } });
      }
    } else emit({ ...response, error: { code: -32601, message: "Method not found" } });
  }
}

try {
  const [command, ...args] = process.argv.slice(2);
  if (command === "mcp" && !args.length) await mcp();
  else if (command === "capabilities" && !args.length) emit(bridge.capabilities());
  else if (command === "status" && !args.length) {
    const value = await bridge.status(); emit(value); if (!value.allPassed) process.exitCode = 1;
  } else if (command === "task" && args.length === 1) {
    const value = await bridge.task(JSON.parse(args[0])); emit(value); if (value.state === "failed") process.exitCode = 1;
  } else if (command === "receipt" && args.length === 1) emit(await bridge.receipt(args[0]));
  else {
    process.stderr.write('Usage: node windows-agent-bridge.mjs capabilities | status | task <JSON> | receipt <UUID> | mcp\n');
    process.exitCode = 2;
  }
} catch {
  process.stderr.write("Bridge request failed; use capabilities and inspect structured task receipts.\n");
  process.exitCode = 1;
}

