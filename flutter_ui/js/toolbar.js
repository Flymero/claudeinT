"use strict";

const Toolbar = {
  dot: document.getElementById("conn-dot"),
  connText: document.getElementById("conn-text"),
  stateEl: document.getElementById("session-state"),
  abortBtn: document.getElementById("btn-abort"),
  sendBtn: document.getElementById("btn-send"),
  input: document.getElementById("msg-input"),

  setConnected(connected) {
    this.dot.className = `dot ${connected ? "connected" : "disconnected"}`;
    this.connText.textContent = connected ? "Connected" : "Disconnected";
    this.sendBtn.disabled = !connected;
  },

  setState(state) {
    this.stateEl.textContent = state;
    this.abortBtn.disabled = state !== "running";
    this.sendBtn.disabled = state === "running";
  },
};

// Events
App.on("connected", () => Toolbar.setConnected(true));
App.on("disconnected", () => Toolbar.setConnected(false));
App.on("state", (state) => Toolbar.setState(state));

// Abort
Toolbar.abortBtn.addEventListener("click", () => App.abort());

// Send
function doSend() {
  const text = Toolbar.input.value.trim();
  if (!text) return;
  App.send(text);
  Toolbar.input.value = "";
  Toolbar.input.style.height = "auto";
}

Toolbar.sendBtn.addEventListener("click", doSend);

Toolbar.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    doSend();
  }
});

// Auto-resize textarea
Toolbar.input.addEventListener("input", () => {
  Toolbar.input.style.height = "auto";
  Toolbar.input.style.height = Math.min(Toolbar.input.scrollHeight, 120) + "px";
});
