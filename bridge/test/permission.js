"use strict";

const { spawn } = require("child_process");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");

const PORT = 3202;
const BRIDGE_ENTRY = path.join(__dirname, "..", "src", "index.js");
const TEST_FILE = path.join(__dirname, "..", "test_perm_output.txt");

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  // Clean up from previous runs
  try { fs.unlinkSync(TEST_FILE); } catch {}

  console.log("[perm-test] starting bridge...");
  const bridge = spawn("node", [BRIDGE_ENTRY], {
    env: { ...process.env, BRIDGE_PORT: String(PORT) },
    stdio: ["ignore", "inherit", "inherit"],
  });

  await wait(1500);

  let ws;
  for (let i = 0; i < 5; i++) {
    try {
      ws = new WebSocket(`ws://localhost:${PORT}`);
      await new Promise((resolve, reject) => {
        ws.on("open", resolve);
        ws.on("error", reject);
      });
      break;
    } catch { await wait(500); }
  }
  if (!ws || ws.readyState !== WebSocket.OPEN) throw new Error("could not connect");

  const events = [];
  let gotPermRequest = false;
  let permTool = null;

  ws.on("message", (data) => {
    const e = JSON.parse(data.toString("utf8"));
    events.push(e);

    if (e.event === "permission_request") {
      gotPermRequest = true;
      permTool = e.tool;
      console.log(`[perm-test] PERMISSION REQUEST: tool=${e.tool}`);
      console.log(`  input: ${JSON.stringify(e.input).slice(0, 100)}`);

      // Approve the permission
      console.log(`[perm-test] Approving ${e.tool}...`);
      ws.send(JSON.stringify({ cmd: "approve", tool: e.tool }));
    } else if (e.event !== "status" && e.event !== "connected") {
      console.log(`  [${e.event}] ${(e.content || e.tool || e.state || "").toString().slice(0, 60)}`);
    }
  });

  // Ask Claude to write a file — this should trigger a permission request
  console.log("[perm-test] Sending write request...");
  ws.send(JSON.stringify({
    cmd: "send",
    message: `Create a file at ${TEST_FILE} with content "permission_test_ok". Use the Write tool.`
  }));

  // Wait for completion
  const deadline = Date.now() + 90000;
  let done = false;
  while (!done && Date.now() < deadline) {
    await wait(300);
    done = events.some((e) => e.event === "done");
  }

  // Check results
  console.log("\n[perm-test] Results:");
  console.log(`  Permission request detected: ${gotPermRequest}`);
  console.log(`  Tool requested: ${permTool}`);

  const fileExists = fs.existsSync(TEST_FILE);
  console.log(`  File created after approval: ${fileExists}`);

  if (gotPermRequest && fileExists) {
    console.log("[perm-test] PASS — permission flow works end-to-end");
  } else if (gotPermRequest && !fileExists) {
    console.log("[perm-test] PARTIAL — permission detected but file not created (retry may need more turns)");
  } else {
    console.log("[perm-test] INFO — no permission denial detected (tool may already be allowed)");
    const kinds = [...new Set(events.map((e) => e.event))];
    console.log(`  Events: ${kinds.join(", ")}`);
  }

  // Cleanup
  try { fs.unlinkSync(TEST_FILE); } catch {}
  ws.close();
  bridge.kill("SIGTERM");
}

main().catch((err) => {
  console.error("[perm-test] ERROR", err.message);
  process.exit(1);
});
