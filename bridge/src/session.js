"use strict";

const { spawn } = require("child_process");
const { EventEmitter } = require("events");
const { createLineParser } = require("./parser");

class ClaudeSession extends EventEmitter {
  constructor(options = {}) {
    super();
    this.cwd = options.cwd || process.cwd();
    this.maxTurns = options.maxTurns || 20;
    this.claudeBin = options.claudeBin || "claude";
    this.proc = null;
    this.parser = null;
    this.state = "idle";
    this.sessionId = null;
    this.resumeId = options.resumeId || null;
    this.allowedTools = new Set(options.allowedTools || []);
    this.pendingToolUses = new Map();
    this.lastMessage = null;
  }

  start(message) {
    if (this.proc) {
      this.emit("error", new Error("session already active, use send() for follow-up"));
      return false;
    }

    const args = [
      "--print",
      "--output-format", "stream-json",
      "--input-format", "stream-json",
      "--verbose",
      "--max-turns", String(this.maxTurns),
    ];

    if (this.resumeId) {
      args.push("--resume", this.resumeId);
    }

    if (this.allowedTools.size > 0) {
      args.push("--allowedTools", [...this.allowedTools].join(" "));
    }

    this.proc = spawn(this.claudeBin, args, {
      cwd: this.cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this._setState("running");
    this._attachParser();
    this._attachProcessHandlers();

    if (message) {
      this._writeUserMessage(message);
    }

    return true;
  }

  send(message) {
    if (this.state === "running") {
      this.emit("error", new Error("session is busy"));
      return false;
    }

    this.lastMessage = message;

    // Process exited after last turn — respawn with resume
    if (!this.proc && this.sessionId) {
      this.resumeId = this.sessionId;
    }

    if (!this.proc) {
      return this.start(message);
    }

    this._setState("running");
    this._writeUserMessage(message);
    return true;
  }

  approve(toolName) {
    this.allowedTools.add(toolName);
    if (this.state !== "waiting_permission") return false;
    // Retry the last message with the tool now allowed
    this.stop();
    this.resumeId = this.sessionId;
    return this.start(this.lastMessage);
  }

  deny() {
    // Permission stays denied — Claude already got the denial, session continues
    if (this.state === "waiting_permission") {
      this._setState("running");
    }
    return true;
  }

  abort() {
    if (this.proc) {
      this.proc.kill("SIGINT");
      this._setState("idle");
    }
  }

  stop() {
    if (this.proc) {
      this.proc.stdin.end();
      this.proc.kill("SIGTERM");
      this.proc = null;
      this.parser = null;
      this._setState("idle");
    }
  }

  resume(sessionId) {
    if (this.proc) {
      this.stop();
    }
    this.resumeId = sessionId;
    return this.start(null);
  }

  _writeUserMessage(text) {
    const msg = {
      type: "user",
      message: {
        role: "user",
        content: [{ type: "text", text }],
      },
    };
    this.proc.stdin.write(JSON.stringify(msg) + "\n");
  }

  _attachParser() {
    this.parser = createLineParser((event) => {
      if (event.event === "system" && event.sessionId) {
        this.sessionId = event.sessionId;
      }
      if (event.event === "tool_use") {
        this.pendingToolUses.set(event.id, event);
      }
      if (event.event === "permission_denied") {
        const toolUse = this.pendingToolUses.get(event.toolUseId);
        if (toolUse) {
          this._setState("waiting_permission");
          this.emit("event", {
            event: "permission_request",
            toolUseId: event.toolUseId,
            tool: toolUse.tool,
            input: toolUse.input,
            message: event.message,
          });
          return;
        }
      }
      if (event.event === "done") {
        this.pendingToolUses.clear();
        this._setState("idle");
      }
      this.emit("event", event);
    });

    const parser = this.parser;
    this.proc.stdout.on("data", (chunk) => {
      if (this.parser === parser) parser.feed(chunk);
    });
    this.proc.stderr.on("data", (chunk) => {
      this.emit("stderr", chunk.toString("utf8"));
    });
  }

  _attachProcessHandlers() {
    this.proc.on("close", (code) => {
      if (this.parser) this.parser.flush();
      this.proc = null;
      this.parser = null;
      this._setState("idle");
      this.emit("close", code);
    });

    this.proc.on("error", (err) => {
      this.emit("error", err);
    });
  }

  _setState(state) {
    if (this.state !== state) {
      this.state = state;
      this.emit("status", state);
    }
  }
}

module.exports = { ClaudeSession };
