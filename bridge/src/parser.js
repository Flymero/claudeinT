"use strict";

function parseEvent(obj) {
  const type = obj.type || "unknown";

  switch (type) {
    case "system":
      return {
        event: "system",
        sessionId: obj.session_id,
        tools: (obj.tools || []).map((t) => (typeof t === "string" ? t : t.name)),
        cwd: obj.cwd,
        model: obj.model,
      };

    case "assistant": {
      const content = obj.message?.content || [];
      const events = [];
      for (const block of content) {
        if (block.type === "text") {
          events.push({ event: "text", content: block.text });
        } else if (block.type === "thinking") {
          events.push({ event: "thinking", content: block.thinking || "" });
        } else if (block.type === "tool_use") {
          events.push({
            event: "tool_use",
            id: block.id,
            tool: block.name,
            input: block.input,
          });
        }
      }
      return events;
    }

    case "user": {
      const content = obj.message?.content || [];
      const events = [];
      for (const block of content) {
        if (block.type === "tool_result") {
          const contentStr = typeof block.content === "string"
            ? block.content
            : JSON.stringify(block.content || "");
          const isPermDenial = block.is_error &&
            contentStr.includes("requested permissions") ||
            contentStr.includes("haven't granted");

          if (isPermDenial) {
            events.push({
              event: "permission_denied",
              toolUseId: block.tool_use_id,
              message: contentStr,
            });
          } else {
            events.push({
              event: "tool_result",
              toolUseId: block.tool_use_id,
              status: block.is_error ? "error" : "ok",
              content: block.content,
            });
          }
        }
      }
      return events;
    }

    case "result":
      return {
        event: "done",
        cost: obj.cost_usd || 0,
        durationMs: obj.duration_ms || 0,
        turns: obj.num_turns || 0,
        isError: obj.is_error || false,
        result: obj.result,
      };

    default:
      return { event: "raw", type, payload: obj };
  }
}

function createLineParser(onEvent) {
  let buffer = "";

  function feed(chunk) {
    buffer += chunk.toString("utf8");
    let idx;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;

      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        onEvent({ event: "parse_error", raw: line.slice(0, 200) });
        continue;
      }

      const result = parseEvent(obj);
      if (Array.isArray(result)) {
        for (const e of result) onEvent(e);
      } else {
        onEvent(result);
      }
    }
  }

  function flush() {
    if (buffer.trim()) {
      feed("\n");
    }
  }

  return { feed, flush };
}

module.exports = { parseEvent, createLineParser };
