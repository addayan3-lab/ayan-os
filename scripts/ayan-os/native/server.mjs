#!/usr/bin/env node
/**
 * AYAN OS Windows Native V0.1 — loopback-only, zero-install HTTP host.
 * Reuses the validated Windows Agent Bridge. No Docker, frontend framework,
 * paid API, or GPU required. This is a safe native control plane, not a
 * claim of feature parity with the original Agent Canvas.
 */
import http from "node:http";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Bridge, defaultRoot } from "../bridge/bridge.mjs";
import { AYAN_NATIVE_VERSION, AYAN_NATIVE_CHANNEL } from "./version.mjs";
import { proxyHttp, proxyUpgrade } from "./canvas-compat-proxy.mjs";
import { AuditRunner } from "./audit-runner.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.AYAN_NATIVE_PORT || 18081);
if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) {
  process.stderr.write("Invalid AYAN_NATIVE_PORT\n"); process.exit(2);
}
const origin = "http://127.0.0.1:" + PORT;
const bridge = new Bridge();
const audit = new AuditRunner({bridge});
await audit.init();
const routes = new Map([
  ["/native/", [join(here, "index.html"), "text/html; charset=utf-8"]],
  ["/native/jobs/", [join(here, "jobs.html"), "text/html; charset=utf-8"]],
  ["/native/jobs.js", [join(here, "jobs.js"), "text/javascript; charset=utf-8"]],
  ["/native.js", [join(here, "native.js"), "text/javascript; charset=utf-8"]],
  ["/native.css", [join(here, "native.css"), "text/css; charset=utf-8"]],
  ["/ayan-mark.svg", [resolve(here, "../../../public/ayan-os/ayan-mark.svg"), "image/svg+xml"]],
  ["/ayan-mark-static.webp", [resolve(here, "../../../public/ayan-os/ayan-mark-static.webp"), "image/webp"]],
]);
let busy = false;
let lastStatus = null;
const allowed = new Map([
  ["codex", ["check", "protocol-check"]],
  ["opencode", ["check"]],
  ["deepseek", ["check"]],
  ["zzdh", ["check"]],
  ["comfyui", ["check", "queue-counts"]],
]);
const security = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
  "cross-origin-resource-policy": "same-origin",
  "content-security-policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};
function json(res, code, value) {
  res.writeHead(code, { ...security, "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
}
function deny(res, code, message) { json(res, code, { ok: false, error: message }); }
async function recentReceipts() {
  const dir = join(defaultRoot, "tasks");
  let names = [];
  try { names = (await readdir(dir)).filter(n => /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(n)); }
  catch { return []; }
  const values = [];
  // At most 200 entries parsed per view; browser shows latest 12.
  for (const id of names.slice(-200)) {
    try {
      const receipt = await bridge.receipt(id);
      values.push({
        id: receipt.id, adapter: receipt.adapter, operation: receipt.operation,
        state: receipt.state, startedAt: receipt.startedAt, finishedAt: receipt.finishedAt,
        error: receipt.error ? { code: receipt.error.code, retryable: receipt.error.retryable } : null
      });
    } catch { /* old/incomplete records never break the native host */ }
  }
  return values.sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || "")).slice(0, 12);
}
async function getBody(req) {
  const buffers = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8192) { const err = new Error("Payload too large"); err.status = 413; throw err; }
    buffers.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(buffers).toString("utf8")); }
  catch { const err = new Error("Invalid JSON"); err.status = 400; throw err; }
}
function authorize(req, res) {
  const allowedHost = "127.0.0.1:" + PORT;
  if (req.headers.host !== allowedHost) { deny(res, 403, "仅允许本机访问"); return false; }
  if (req.headers.origin && req.headers.origin !== origin) { deny(res, 403, "跨站请求已拒绝"); return false; }
  if (req.headers["x-ayan-local"] !== "1" || !String(req.headers["content-type"] || "").startsWith("application/json")) {
    deny(res, 403, "本机控制请求缺少验证标记"); return false;
  }
  return true;
}
async function handler(req, res) {
  const url = new URL(req.url || "/", origin);
  // Preserve the full original Canvas UI as the primary entry during migration.
  if (url.pathname === "/" && (req.method === "GET" || req.method === "HEAD")) {
    res.writeHead(302, { ...security, location: "/canvas/" });
    res.end();
    return;
  }
  if (req.method === "GET" || req.method === "HEAD") {
    if (url.pathname === "/api/ayan/jobs") return json(res,200,{jobs:audit.list(),active:audit.active});
    if (url.pathname.startsWith("/api/ayan/jobs/")) {
      const suffix=url.pathname.slice("/api/ayan/jobs/".length);
      const match=/^([0-9a-f-]{36})(\/report)?$/.exec(suffix);
      if(!match) return deny(res,400,"任务编号无效");
      const id=match[1];
      if(match[2]) {
        const report=await audit.report(id);
        if(report===null)return deny(res,404,"报告不存在");
        res.writeHead(200,{...security,"content-type":"text/markdown; charset=utf-8"});
        res.end(req.method==="HEAD"?undefined:report);return;
      }
      const receipt=audit.get(id);
      return receipt?json(res,200,receipt):deny(res,404,"任务不存在");
    }
    if (url.pathname === "/api/health") return json(res, 200, {
      status: "ready", name: "阿岩 OS", mode: "windows-native", port: PORT,
      version: AYAN_NATIVE_VERSION, channel: AYAN_NATIVE_CHANNEL,
      dockerRequired: false, bridge: "Windows Agent Bridge V0.1", inferenceEnabled: false,
      canvasCompatibility: { originalInterface: true, originalBackendRequiresDocker: true, upstreamPort: 18080 },
    });
    if (url.pathname === "/api/capabilities") return json(res, 200, {
      mode: "windows-native", capabilities: bridge.capabilities(),
    });
    if (url.pathname === "/api/overview") return json(res, 200, {
      mode: "windows-native", checked: lastStatus?.checkedAt || null,
      status: lastStatus, receipts: await recentReceipts(),
    });
    if (url.pathname.startsWith("/api/receipt/")) {
      const id = url.pathname.slice("/api/receipt/".length);
      if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) return deny(res, 400, "无效回执编号");
      try { return json(res, 200, await bridge.receipt(id)); }
      catch { return deny(res, 404, "未找到该任务回执"); }
    }
    const route = routes.get(url.pathname);
    if (!route) return proxyHttp(req, res);
    if (url.search || url.pathname.includes("..")) return deny(res, 404, "未找到页面");
    try {
      const [file, type] = route;
      const data = await readFile(file);
      res.writeHead(200, { ...security, "content-type": type }); res.end(req.method === "HEAD" ? undefined : data);
    } catch { deny(res, 503, "原生界面资源尚未准备好"); }
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/ayan/jobs") {
    if(!authorize(req,res))return;
    let payload;
    try{payload=await getBody(req)}catch(error){return deny(res,error.status||400,error.message)}
    if(!payload||Array.isArray(payload)||Object.keys(payload).length!==1||payload.kind!=="h3-readonly-audit")
      return deny(res,403,"仅允许 H3 只读工作流体检");
    const outcome=await audit.submit(payload.kind);
    return json(res,outcome.deduplicated?200:202,outcome);
  }
  if (req.method !== "POST" || (url.pathname !== "/api/probe" && url.pathname !== "/api/status")) {
    return proxyHttp(req, res);
  }
  if (!authorize(req, res)) return;
  if (busy) return deny(res, 429, "已有状态检查正在执行，请稍后再试");
  let body;
  try { body = await getBody(req); } catch (error) { return deny(res, error.status || 400, error.message); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return deny(res, 400, "无效请求");
  if (url.pathname === "/api/status" && Object.keys(body).length) return deny(res, 400, "状态检查不接受其他参数");
  if (url.pathname === "/api/probe") {
    if (Object.keys(body).sort().join(",") !== "adapter,operation" ||
        !allowed.get(body.adapter)?.includes(body.operation)) return deny(res, 403, "当前版本仅允许已列出的无生成能力检查");
  }
  busy = true;
  try {
    const value = url.pathname === "/api/status" ? await bridge.status() : await bridge.task(body);
    if (url.pathname === "/api/status") lastStatus = value;
    return json(res, 200, { ok: true, value });
  } catch { return deny(res, 503, "检查异常，请查看 Bridge 回执或本地错误分类"); }
  finally { busy = false; }
}
const server = http.createServer((req, res) => {
  Promise.resolve(handler(req, res)).catch(() => {
    if (!res.headersSent) deny(res, 500, "服务处理失败"); else res.end();
  });
});
server.on("upgrade", (req, socket, head) => proxyUpgrade(req, socket, head));
server.requestTimeout = 65000;
server.headersTimeout = 10000;
server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write("AYAN_WINDOWS_NATIVE_READY " + origin + "\n");
});
server.on("error", error => {
  process.stderr.write("AYAN_WINDOWS_NATIVE_ERROR " + (error.code || "UNKNOWN") + "\n");
  process.exitCode = 1;
});
