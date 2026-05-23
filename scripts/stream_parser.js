#!/usr/bin/env node
/**
 * stream_parser.js — Claude Code stream-json 事件解析器原型
 *
 * 用法:
 *   claude --print --output-format stream-json "prompt" | node scripts/stream_parser.js
 */

const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin });

console.log("ClaudeInT Stream Parser — waiting for events...\n");

rl.on("line", (line) => {
  line = line.trim();
  if (!line) return;

  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    console.log(`[PARSE_ERROR] ${line.slice(0, 80)}`);
    return;
  }

  const type = obj.type || "unknown";

  switch (type) {
    case "system": {
      const tools = (obj.tools || []).map((t) => (typeof t === "string" ? t : t.name));
      console.log(`[SYSTEM] session=${obj.session_id || "?"}`);
      console.log(`  Tools (${tools.length}): ${tools.slice(0, 10).join(", ")}...`);
      break;
    }

    case "assistant": {
      const content = obj.message?.content || [];
      for (const block of content) {
        if (block.type === "text") {
          const preview = block.text.slice(0, 120).replace(/\n/g, " ");
          console.log(`[TEXT] ${preview}`);
        } else if (block.type === "tool_use") {
          const input = JSON.stringify(block.input || {}).slice(0, 100);
          console.log(`[TOOL_USE] ${block.name}: ${input}`);
        }
      }
      if (obj.message?.stop_reason) {
        console.log(`  stop_reason: ${obj.message.stop_reason}`);
      }
      break;
    }

    case "user": {
      const content = obj.message?.content || [];
      for (const block of content) {
        if (block.type === "tool_result") {
          const status = block.is_error ? "ERROR" : "OK";
          const preview = JSON.stringify(block.content || "").slice(0, 80);
          console.log(`[TOOL_RESULT] [${status}] ${preview}`);
        }
      }
      break;
    }

    case "result": {
      const cost = (obj.cost_usd || 0).toFixed(4);
      const duration = obj.duration_ms || 0;
      const turns = obj.num_turns || 0;
      console.log(`\n[DONE] cost=$${cost} duration=${duration}ms turns=${turns}`);
      break;
    }

    default:
      console.log(`[${type.toUpperCase()}] ${JSON.stringify(obj).slice(0, 100)}`);
  }
});

rl.on("close", () => {
  console.log("\n--- stream ended ---");
});
