"use strict";

const BRIDGE_URL = `ws://${location.hostname}:3100`;

const App = {
  ws: null,
  state: "idle",
  listeners: [],

  on(event, fn) {
    this.listeners.push({ event, fn });
  },

  emit(event, data) {
    for (const l of this.listeners) {
      if (l.event === event) l.fn(data);
    }
  },

  connect() {
    this.ws = new WebSocket(BRIDGE_URL);

    this.ws.onopen = () => {
      this.emit("connected");
    };

    this.ws.onclose = () => {
      this.emit("disconnected");
      setTimeout(() => this.connect(), 2000);
    };

    this.ws.onerror = () => {};

    this.ws.onmessage = (evt) => {
      let data;
      try { data = JSON.parse(evt.data); } catch { return; }
      this._handleEvent(data);
    };
  },

  _handleEvent(data) {
    const event = data.event;

    if (event === "status") {
      this.state = data.state;
      this.emit("state", data.state);
    } else if (event === "connected") {
      this.state = data.state;
      this.emit("state", data.state);
    } else {
      this.emit(event, data);
    }
  },

  send(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ cmd: "send", message }));
    this.emit("user_message", message);
  },

  abort() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ cmd: "abort" }));
  },

  approve(tool) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ cmd: "approve", tool }));
  },

  deny() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ cmd: "deny" }));
  },
};

App.connect();
