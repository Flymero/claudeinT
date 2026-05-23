"use strict";

class Router {
  constructor(wss) {
    this.wss = wss;
    this.clients = new Set();
  }

  attach(ws) {
    this.clients.add(ws);
    ws.on("close", () => this.clients.delete(ws));
  }

  broadcast(event) {
    const payload = JSON.stringify(event);
    for (const ws of this.clients) {
      if (ws.readyState === ws.OPEN) {
        ws.send(payload);
      }
    }
  }
}

module.exports = { Router };
