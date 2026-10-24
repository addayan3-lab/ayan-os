import { spawn } from "node:child_process";
import { join } from "node:path";

export class BridgeError extends Error {
  constructor(code) { super(code); this.code = code; }
}

const activeChildren = new Set();

export async function stopManagedChildren() {
  await Promise.allSettled([...activeChildren].map(stopTree));
}

function stopTree(child) {
  return new Promise(resolve => {
    if (!child.pid || child.exitCode !== null || child.signalCode !== null) return resolve();
    if (process.platform === "win32") {
      const killer = spawn(join(process.env.SystemRoot || "C:\\Windows", "System32", "taskkill.exe"),
        ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore", shell: false });
      killer.on("error", () => { child.kill(); resolve(); });
      killer.on("close", code => { if (code !== 0) child.kill("SIGKILL"); resolve(); });
    } else {
      try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
      resolve();
    }
  });
}

/** No shell, bounded buffers/deadline, private process group, no inherited API keys. */
export function isolatedEnv(cwd, overrides = {}) {
  const env = {};
  for (const key of ["SystemRoot", "SYSTEMROOT", "WINDIR", "ComSpec", "COMSPEC", "PATHEXT", "PATH", "Path", "USERPROFILE", "APPDATA", "LOCALAPPDATA"]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return { ...env, TEMP: cwd, TMP: cwd, NO_COLOR: "1", PYTHONDONTWRITEBYTECODE: "1",
    XDG_DATA_HOME: join(cwd, "data"), XDG_CONFIG_HOME: join(cwd, "config"),
    XDG_CACHE_HOME: join(cwd, "cache"), XDG_STATE_HOME: join(cwd, "state"),
    DSH_HOME: join(cwd, "dsh"), ...overrides };
}

function start(command, extra, options, onData) {
  return new Promise((resolve, reject) => {
    let bytes = 0, stdout = "", stderr = "", failure, settling = false;
    const child = spawn(command.file, [...(command.args || []), ...extra], {
      cwd: options.cwd, env: isolatedEnv(options.cwd, command.env),
      windowsHide: true, shell: false, detached: process.platform !== "win32", stdio: ["pipe", "pipe", "pipe"],
    });
    activeChildren.add(child);
    child.once("close", () => activeChildren.delete(child));
    const settle = async error => {
      if (settling) return;
      settling = true;
      clearTimeout(timer);
      await stopTree(child);
      // close, rather than exit, ensures stdio handles have been released.
      if (child.exitCode === null && child.signalCode === null && child.pid) {
        await new Promise(done => { child.once("close", done); setTimeout(done, 2000).unref(); });
      }
      if (error) reject(error);
      else resolve({ stdout, stderr });
    };
    const abort = code => { failure = new BridgeError(code); void settle(failure); };
    const timer = setTimeout(() => abort("TIMEOUT"), options.timeoutMs ?? 20000);
    child.stdin.on("error", () => {}); // Early child exits are handled below.
    const consume = (chunk, isError) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > (options.maxBytes ?? 1024 * 1024)) return abort("OUTPUT_LIMIT");
      if (isError) stderr += chunk.toString("utf8");
      else {
        stdout += chunk.toString("utf8");
        if (onData) {
          try { onData(chunk.toString("utf8"), child, () => void settle()); }
          catch { abort("PROTOCOL_ERROR"); }
        }
      }
    };
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => consume(chunk, false));
    child.stderr.on("data", chunk => consume(chunk, true));
    child.on("error", error => abort(error.code === "ENOENT" ? "NOT_INSTALLED" : "PROCESS_FAILED"));
    child.on("close", code => {
      if (!settling) void settle(failure || ((code === 0 || options.acceptExitCodes?.includes(code)) && !onData ? undefined : new BridgeError(/failed to initialize (?:sqlite )?state runtime/i.test(stderr) ? "STATE_RUNTIME_UNAVAILABLE" : (onData ? "PROTOCOL_ERROR" : "PROCESS_FAILED"))));
    });
    if (options.onStart) options.onStart(child);
    if (!onData) child.stdin.end();
  });
}

export function runProcess(command, args = [], options = {}) {
  return start(command, args, options);
}

/** JSONL stdio transport: no session creation, prompts, auth, or permission grants. */
export async function rpcExchange(command, requests, options = {}) {
  let buffer = "", current = 0;
  const results = [];
  const send = child => child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: current + 1, ...requests[current] }) + "\n");
  await start(command, [], { ...options, onStart: send }, (chunk, child, done) => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (!line.trim()) continue;
      const message = JSON.parse(line);
      if (message.method) {
        if (message.id !== undefined) child.stdin.write(JSON.stringify({
          jsonrpc: "2.0", id: message.id, error: { code: -32601, message: "Client operations disabled by AYAN validation policy" },
        }) + "\n");
        continue;
      }
      if (message.id !== current + 1) continue;
      if (message.error || !Object.hasOwn(message, "result")) throw new BridgeError("PROTOCOL_ERROR");
      results.push(message.result);
      if (requests[current].method === "initialize" && message.result?.serverInfo) {
        child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
      }
      current++;
      if (current === requests.length) { done(); return; }
      send(child);
    }
  });
  return results;
}

