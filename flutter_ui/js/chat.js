"use strict";

const Chat = {
  el: document.getElementById("chat"),

  addMessage(type, content, extra) {
    const div = document.createElement("div");
    div.className = `msg msg-${type}`;

    if (type === "tool") {
      const toolName = document.createElement("div");
      toolName.className = "tool-name";
      toolName.textContent = extra?.tool || "tool";
      div.appendChild(toolName);

      if (extra?.input) {
        const pre = document.createElement("pre");
        pre.textContent = typeof extra.input === "string"
          ? extra.input
          : JSON.stringify(extra.input, null, 2);
        div.appendChild(pre);
      }
    } else if (type === "tool-result") {
      div.className = `msg msg-tool${extra?.status === "error" ? " msg-tool-error" : ""}`;
      const label = document.createElement("div");
      label.className = "tool-name";
      label.textContent = extra?.status === "error" ? "ERROR" : "RESULT";
      div.appendChild(label);

      const pre = document.createElement("pre");
      const text = typeof content === "string" ? content : JSON.stringify(content, null, 2);
      pre.textContent = text.slice(0, 2000);
      div.appendChild(pre);
    } else if (type === "thinking") {
      div.textContent = content.slice(0, 200);
    } else {
      div.innerHTML = this._render(content);
      this._highlight(div);
    }

    this.el.appendChild(div);
    this.el.scrollTop = this.el.scrollHeight;
  },

  _render(text) {
    if (typeof marked !== "undefined") {
      return marked.parse(text || "");
    }
    return (text || "").replace(/\n/g, "<br>");
  },

  _highlight(el) {
    if (typeof hljs !== "undefined") {
      el.querySelectorAll("pre code").forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  },
};

// Wire up events
App.on("user_message", (msg) => {
  Chat.addMessage("user", msg);
});

App.on("text", (data) => {
  Chat.addMessage("assistant", data.content);
});

App.on("tool_use", (data) => {
  if (data.tool === "Edit" || data.tool === "Write") return;
  Chat.addMessage("tool", null, { tool: data.tool, input: data.input });
});

App.on("tool_result", (data) => {
  const content = typeof data.content === "string"
    ? data.content
    : JSON.stringify(data.content);
  Chat.addMessage("tool-result", content, { status: data.status });
});

App.on("done", (data) => {
  const info = document.createElement("div");
  info.className = "msg msg-thinking";
  info.textContent = `Done — ${data.turns || 0} turns, $${(data.cost || 0).toFixed(4)}`;
  Chat.el.appendChild(info);
  Chat.el.scrollTop = Chat.el.scrollHeight;
});
