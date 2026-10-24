#!/usr/bin/env node
/**
 * AYAN OS / ComfyUI read-only status MCP adapter.
 * Uses only predefined GET endpoints and exposes only metadata/counts.
 * Deliberately does NOT expose /prompt, POST endpoints, file writes, queue mutation,
 * model loading, running workflows, or any GPU-intensive actions.
 * Runs inside the isolated OpenHands container; no secrets needed.
 */
import readline from "node:readline";

const API = "http://host.docker.internal:8188";
const TOOLS = [
  {
    name: "comfyui_health",
    description: "Read-only: check the existing local ComfyUI instance and summarize system status. No image/video generation.",
    inputSchema: { type: "object", additionalProperties: false, properties: {} }
  },
  {
    name: "comfyui_queue_counts",
    description: "Read-only: show counts of queued and running ComfyUI jobs, without revealing prompts, output files or task data.",
    inputSchema: { type: "object", additionalProperties: false, properties: {} }
  }
];
async function safeGet(path) {
  const result = await fetch(API + path, { method: "GET", signal: AbortSignal.timeout(8000) });
  if (!result.ok) throw new Error("ComfyUI returned HTTP " + result.status);
  return result.json();
}
async function execute(name) {
  if (name === "comfyui_health") {
    const x = await safeGet("/system_stats");
    return {
      online: true,
      comfyui_version: x.system?.comfyui_version ?? "unknown",
      python_version: x.system?.python_version ?? "unknown",
      device_count: Array.isArray(x.devices) ? x.devices.length : 0,
      devices: (x.devices ?? []).map(d => ({
        name: String(d.name ?? "unnamed").slice(0, 120),
        type: d.type ?? "unknown"
      }))
    };
  }
  if (name === "comfyui_queue_counts") {
    const x = await safeGet("/queue");
    return {
      online: true,
      running_jobs: Array.isArray(x.queue_running) ? x.queue_running.length : 0,
      pending_jobs: Array.isArray(x.queue_pending) ? x.queue_pending.length : 0
    };
  }
  throw new Error("Unknown or disallowed tool");
}
function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}
function fail(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n");
}
async function dispatch(req) {
  if (!req || req.jsonrpc !== "2.0") return;
  if (req.id === undefined) return; // Notification.
  const method = req.method;
  if (method === "initialize") {
    respond(req.id, {
      protocolVersion: req.params?.protocolVersion || "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "ayan-comfyui-readonly", version: "0.1.0" }
    });
  } else if (method === "ping") {
    respond(req.id, {});
  } else if (method === "tools/list") {
    respond(req.id, { tools: TOOLS });
  } else if (method === "tools/call") {
    try {
      const args = req.params?.arguments;
      if (args && Object.keys(args).length) throw new Error("Arguments are not supported");
      const result = await execute(req.params?.name);
      respond(req.id, { isError: false, content: [{ type: "text", text: JSON.stringify(result) }] });
    } catch (e) {
      respond(req.id, { isError: true, content: [{ type: "text", text: String(e.message).slice(0, 240) }] });
    }
  } else {
    fail(req.id, -32601, "Method not found");
  }
}
const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of lines) {
  let req;
  try { req = JSON.parse(line); }
  catch { continue; }
  await dispatch(req);
}
