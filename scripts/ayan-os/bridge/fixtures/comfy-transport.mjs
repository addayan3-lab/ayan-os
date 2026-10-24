// Deterministic transport substitute for the existing MCP server; no network.
globalThis.fetch = async (url, options) => {
  if (options?.method !== "GET" || options?.redirect !== "error") throw Error("unexpected transport policy");
  const parsed = new URL(url);
  const host = process.env.AYAN_COMFYUI_HOST_MODE === "windows" ? "127.0.0.1" : "host.docker.internal";
  if (parsed.hostname !== host || parsed.port !== "8188") throw Error("unexpected host");
  if (parsed.pathname === "/system_stats") return {
    ok: true, json: async () => ({ system: { comfyui_version: "0.3.71", python_version: "3.12" }, devices: [{ name: "test-device", type: "cpu" }], token: "must-not-leak" }),
  };
  if (parsed.pathname === "/queue") return {
    ok: true, json: async () => ({ queue_running: [[1, "private-prompt"]], queue_pending: [[2], [3]], secret: "must-not-leak" }),
  };
  throw Error("unexpected endpoint");
};

