"use strict";

const { WebSocketServer } = require("ws");
const { ClaudeSession } = require("./session");
const { Router } = require("./router");
const { handleCommand } = require("./commands");

const PORT = parseInt(process.env.BRIDGE_PORT || "3100", 10);
const CWD = process.env.BRIDGE_CWD || process.cwd();

const wss = new WebSocketServer({ port: PORT });
const router = new Router(wss);
const session = new ClaudeSession({ cwd: CWD });

session.on("event", (e) => router.broadcast(e));
session.on("status", (state) => router.broadcast({ event: "status", state, sessionId: session.sessionId }));
session.on("stderr", (msg) => router.broadcast({ event: "stderr", message: msg }));
session.on("close", (code) => router.broadcast({ event: "close", code }));
session.on("error", (err) => router.broadcast({ event: "error", message: err.message }));

wss.on("connection", (ws) => {
  router.attach(ws);
  ws.send(JSON.stringify({ event: "connected", state: session.state, cwd: CWD }));

  ws.on("message", (data) => {
    let cmd;
    try {
      cmd = JSON.parse(data.toString("utf8"));
    } catch {
      ws.send(JSON.stringify({ event: "error", message: "invalid JSON" }));
      return;
    }
    handleCommand(cmd, session, router);
  });
});

console.log(`[bridge] listening ws://localhost:${PORT} cwd=${CWD}`);
