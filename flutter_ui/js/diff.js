"use strict";

const Diff = {
  isEditTool(tool) {
    return tool === "Edit" || tool === "Write";
  },

  render(tool, input) {
    const container = document.createElement("div");
    container.className = "diff-view";

    // File path header
    const header = document.createElement("div");
    header.className = "diff-header";
    header.textContent = input.file_path || "unknown file";
    container.appendChild(header);

    if (tool === "Edit") {
      container.appendChild(this._renderEdit(input));
    } else if (tool === "Write") {
      container.appendChild(this._renderWrite(input));
    }

    return container;
  },

  _renderEdit(input) {
    const body = document.createElement("div");
    body.className = "diff-body";

    const oldLines = (input.old_string || "").split("\n");
    const newLines = (input.new_string || "").split("\n");

    // Removed lines
    for (const line of oldLines) {
      const row = document.createElement("div");
      row.className = "diff-line diff-removed";
      row.textContent = "- " + line;
      body.appendChild(row);
    }

    // Added lines
    for (const line of newLines) {
      const row = document.createElement("div");
      row.className = "diff-line diff-added";
      row.textContent = "+ " + line;
      body.appendChild(row);
    }

    // Stats
    const stats = document.createElement("div");
    stats.className = "diff-stats";
    stats.textContent = `-${oldLines.length} +${newLines.length} lines`;
    body.appendChild(stats);

    return body;
  },

  _renderWrite(input) {
    const body = document.createElement("div");
    body.className = "diff-body";

    const lines = (input.content || "").split("\n");
    const maxShow = 30;
    const show = lines.slice(0, maxShow);

    for (const line of show) {
      const row = document.createElement("div");
      row.className = "diff-line diff-added";
      row.textContent = "+ " + line;
      body.appendChild(row);
    }

    if (lines.length > maxShow) {
      const more = document.createElement("div");
      more.className = "diff-more";
      more.textContent = `... +${lines.length - maxShow} more lines`;
      body.appendChild(more);
    }

    const stats = document.createElement("div");
    stats.className = "diff-stats";
    stats.textContent = `new file, ${lines.length} lines`;
    body.appendChild(stats);

    return body;
  },
};

// Override tool_use rendering for Edit/Write
App.on("tool_use", (data) => {
  if (Diff.isEditTool(data.tool)) {
    const div = document.createElement("div");
    div.className = "msg msg-diff";

    const label = document.createElement("div");
    label.className = "tool-name";
    label.textContent = data.tool;
    div.appendChild(label);

    div.appendChild(Diff.render(data.tool, data.input));
    Chat.el.appendChild(div);
    Chat.el.scrollTop = Chat.el.scrollHeight;
  }
});
