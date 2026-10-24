import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

async function exists(path) { try { await access(path); return true; } catch { return false; } }
async function first(paths) { for (const path of paths.filter(Boolean)) if (await exists(path)) return path; }
export const defaultZzdhRoot = () => join(homedir(), "Downloads", "字字动画_9_0_9", "字字动画_9_0_9");

/** Only known install entries; never enumerate or read credential/config databases. */
export async function discover() {
  const user = homedir();
  const local = join(user, "AppData", "Local");
  const roaming = join(user, "AppData", "Roaming");
  const pathEntries = (process.env.PATH || "").split(delimiter);
  const codex = await first([
    process.env.AYAN_CODEX_EXE,
    process.env.CODEX_ELECTRON_RESOURCES_PATH && join(process.env.CODEX_ELECTRON_RESOURCES_PATH, "codex.exe"),
    ...pathEntries.map(x => join(x, "codex.exe")),
    join(roaming, "npm", "node_modules", "@openai", "codex", "vendor", "x86_64-pc-windows-msvc", "codex", "codex.exe"),
  ]);
  const opencode = await first([
    join(roaming, "npm", "node_modules", "@opencode", "cli", "bin", "opencode.exe"),
    join(local, "Programs", "@opencode", "cli", "opencode.exe"),
    ...pathEntries.map(x => join(x, "opencode.exe")),
  ]);
  const dshRoot = join(local, "Programs", "DeepSeek Harness");
  const dshFile = join(dshRoot, "DeepSeek Harness.exe");
  const zzRoot = defaultZzdhRoot();
  const python = await first([join(zzRoot, "_internal", "python-3.12", "python.exe")]);
  return {
    ...(codex && { codex: { file: codex } }),
    ...(opencode && { opencode: { file: opencode } }),
    ...(await exists(join(dshRoot, "resources", "runtime", "cli", "bin", "dsh.cmd")) && await exists(dshFile) && {
      deepseek: { file: dshFile, args: ["--expose-internals", join(dshRoot, "resources", "app.asar", "dsh", "node_modules", "@deepseek-ai", "dsh-desktop-host", "lib", "cli.js")], env: { ELECTRON_RUN_AS_NODE: "1" } },
    }),
    ...(python && { zzdh: { file: python, root: zzRoot } }),
  };
}

