"use strict";

const Permission = {
  panel: document.getElementById("permission-panel"),
  toolEl: document.getElementById("perm-tool"),
  inputEl: document.getElementById("perm-input"),
  pendingTool: null,

  show(data) {
    this.pendingTool = data.tool;
    this.toolEl.textContent = `Tool: ${data.tool}`;
    this.inputEl.textContent = JSON.stringify(data.input, null, 2);
    this.panel.classList.remove("hidden");
  },

  hide() {
    this.panel.classList.add("hidden");
    this.pendingTool = null;
  },
};

document.getElementById("btn-approve").addEventListener("click", () => {
  if (Permission.pendingTool) {
    App.approve(Permission.pendingTool);
    Permission.hide();
  }
});

document.getElementById("btn-deny").addEventListener("click", () => {
  App.deny();
  Permission.hide();
});

App.on("permission_request", (data) => {
  Permission.show(data);
});

App.on("permission_granted", () => {
  Permission.hide();
});
