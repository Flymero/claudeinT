"use strict";

const Chat = {
  el: document.getElementById("chat"),
  _streamEl: null,

  addMessage(type, content, extra) {
    this._clearStream();
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
      div.className = "msg msg-thinking";
      const toggle = document.createElement("div");
      toggle.className = "thinking-toggle";
      toggle.textContent = "💭 Thinking...";
      const body = document.createElement("div");
      body.className = "thinking-body hidden";
      body.textContent = content;
      toggle.addEventListener("click", () => {
        body.classList.toggle("hidden");
        toggle.textContent = body.classList.contains("hidden")
          ? "💭 Thinking..."
          : "💭 Thinking ▾";
      });
      div.appendChild(toggle);
      div.appendChild(body);
    } else {
      div.innerHTML = this._render(content);
      this._highlight(div);
    }

    this.el.appendChild(div);
    this._scroll();
  },

  showLoading() {
    this._clearStream();
    const div = document.createElement("div");
    div.className = "msg msg-assistant msg-loading";
    div.id = "loading-indicator";
    div.innerHTML = '<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>';
    this.el.appendChild(div);
    this._scroll();
  },

  hideLoading() {
    const el = document.getElementById("loading-indicator");
    if (el) el.remove();
  },

  streamText(content) {
    this.hideLoading();
    if (!this._streamEl) {
      this._streamEl = document.createElement("div");
      this._streamEl.className = "msg msg-assistant";
      this.el.appendChild(this._streamEl);
    }
    this._streamEl.innerHTML = this._render(content);
    this._highlight(this._streamEl);
    this._scroll();
  },

  _clearStream() {
    this._streamEl = null;
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

  _scroll() {
    this.el.scrollTop = this.el.scrollHeight;
  },
};

// Wire up events
App.on("user_message", (msg) => {
  Chat.addMessage("user", msg);
  Chat.showLoading();
});

App.on("text", (data) => {
  Chat.hideLoading();
  Chat.streamText(data.content);
});

App.on("thinking", (data) => {
  Chat.hideLoading();
  if (data.content) {
    Chat.addMessage("thinking", data.content);
  }
});

App.on("tool_use", (data) => {
  Chat.hideLoading();
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
  Chat.hideLoading();
  Chat._clearStream();
  const info = document.createElement("div");
  info.className = "msg msg-done";
  info.textContent = `✓ ${data.turns || 0} turns · $${(data.cost || 0).toFixed(4)}`;
  Chat.el.appendChild(info);
  Chat._scroll();
});
