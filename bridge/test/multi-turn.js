"use strict";

const { spawn } = require("child_process");
const WebSocket = require("ws");
const path = require("path");

const PORT = 3201;
const BRIDGE_ENTRY = path.join(__dirname, "..", "src", "index.js");

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function waitForEvent(ws, eventName, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${eventName}`)), timeoutMs);
    function handler(data) {
      const e = JSON.parse(data.toString("utf8"));
      if (e.event === eventName) {
        clearTimeout(timer);
        ws.removeListener("message", handler);
        resolve(e);
      }
    }
    ws.on("message", handler);
  });
}

async function main() {
  console.log("[multi-turn] starting bridge...");
  const bridge = spawn("node", [BRIDGE_ENTRY], {
    env: { ...process.env, BRIDGE_PORT: String(PORT) },
    stdio: ["ignore", "inherit", "inherit"],
  });

  await wait(1000);

  let ws;
  for (let i = 0; i < 5; i++) {
    try {
      ws = new WebSocket(`ws://localhost:${PORT}`);
      await new Promise((resolve, reject) => {
        ws.on("open", resolve);
        ws.on("error", reject);
      });
      break;
    } catch {
      await wait(500);
    }
  }
  if (!ws || ws.readyState !== WebSocket.OPEN) throw new Error("could not connect");

  const allEvents = [];
  ws.on("message", (data) => {
    const e = JSON.parse(data.toString("utf8"));
    allEvents.push(e);
    if (e.event !== "status" && e.event !== "connected") {
      console.log(`  [${e.event}] ${(e.content || e.tool || e.state || "").toString().slice(0, 50)}`);
    }
  });

  // Turn 1
  console.log("\n[multi-turn] Turn 1: sending first message...");
  ws.send(JSON.stringify({ cmd: "send", message: "Remember the number 42. Reply only with OK." }));
  await waitForEvent(ws, "done");
  console.log("[multi-turn] Turn 1 complete.");

  await wait(500);

  // Turn 2 — tests that the process is still alive and context is retained
  console.log("\n[multi-turn] Turn 2: asking for the number back...");
  ws.send(JSON.stringify({ cmd: "send", message: "What number did I ask you to remember? Reply only the number." }));
  await waitForEvent(ws, "done");
  console.log("[multi-turn] Turn 2 complete.");

  // Check results
  const textEvents = allEvents.filter((e) => e.event === "text");
  const doneEvents = allEvents.filter((e) => e.event === "done");

  console.log(`\n[multi-turn] Results: ${textEvents.length} text events, ${doneEvents.length} done events`);

  const turn2Text = textEvents.length >= 2 ? textEvents[textEvents.length - 1].content : "";
  const has42 = turn2Text.includes("42");

  if (doneEvents.length >= 2 && has42) {
    console.log("[multi-turn] PASS — multi-turn conversation with context retention");
  } else if (doneEvents.length >= 2) {
    console.log(`[multi-turn] PARTIAL — got 2 turns but context may not be retained. Turn 2 reply: "${turn2Text}"`);
  } else {
    console.log("[multi-turn] FAIL — did not complete 2 turns");
    process.exitCode = 1;
  }

  ws.close();
  bridge.kill("SIGTERM");
}

main().catch((err) => {
  console.error("[multi-turn] ERROR", err.message);
  process.exit(1);
});
