"use strict";

const { spawn } = require("child_process");
const WebSocket = require("ws");
const path = require("path");

const PORT = 3199;
const BRIDGE_ENTRY = path.join(__dirname, "..", "src", "index.js");

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const bridge = spawn("node", [BRIDGE_ENTRY], {
    env: { ...process.env, BRIDGE_PORT: String(PORT) },
    stdio: ["ignore", "inherit", "inherit"],
  });

  await wait(500);

  const ws = new WebSocket(`ws://localhost:${PORT}`);
  const events = [];
  let done = false;

  await new Promise((resolve, reject) => {
    ws.on("open", resolve);
    ws.on("error", reject);
  });

  ws.on("message", (data) => {
    const e = JSON.parse(data.toString("utf8"));
    events.push(e);
    console.log("[recv]", e.event, e.state || e.tool || (e.content || "").slice(0, 60));
    if (e.event === "done") done = true;
  });

  ws.send(JSON.stringify({ cmd: "send", message: "say hi in 3 words" }));

  const deadline = Date.now() + 60000;
  while (!done && Date.now() < deadline) {
    await wait(200);
  }

  ws.close();
  bridge.kill("SIGTERM");
  await wait(200);

  const kinds = new Set(events.map((e) => e.event));
  console.log("\n[smoke] event kinds:", [...kinds].join(", "));

  const required = ["connected", "system", "text", "done"];
  const missing = required.filter((k) => !kinds.has(k));
  if (missing.length) {
    console.error("[smoke] FAIL — missing events:", missing.join(", "));
    process.exit(1);
  }
  console.log("[smoke] PASS");
}

main().catch((err) => {
  console.error("[smoke] ERROR", err);
  process.exit(1);
});
