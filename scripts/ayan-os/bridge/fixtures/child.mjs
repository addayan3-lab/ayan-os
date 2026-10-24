import readline from "node:readline";
const mode = process.argv[2];
if (mode === "codex-unauth") {
  if (process.argv[3] === "--version") process.stdout.write("codex-cli 0.163.0\n");
  else { process.stderr.write("Not logged in\n"); process.exitCode = 1; }
} else if (mode === "opencode" && process.argv[3] === "--version") {
  process.stdout.write("opencode v2.1.2\n");
} else if (mode === "overflow") {
  process.stdout.write("x".repeat(1024));
} else if (mode === "failure") {
  process.stderr.write("Authorization: Bearer sk-secret-canary");
  process.exitCode = 1;
} else if (mode === "hang") {
  setInterval(() => {}, 1000);
} else {
  const lines = readline.createInterface({ input: process.stdin });
  let initializeId;
  for await (const line of lines) {
    const message = JSON.parse(line);
    if (message.method === "initialize") {
      initializeId = message.id;
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: "agent-permission", method: "session/request_permission", params: {} }) + "\n");
    } else if (message.id === "agent-permission" && message.error?.code === -32601) {
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: initializeId, result: { protocolVersion: 1, denialObserved: true, agentCapabilities: { loadSession: true }, unexpectedToken: "sk-secret-canary" } }) + "\n");
    }
  }
}

