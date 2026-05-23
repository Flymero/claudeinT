"use strict";

const FileTree = {
  panel: document.getElementById("file-panel"),
  treeEl: document.getElementById("file-tree"),
  viewer: document.getElementById("file-viewer"),
  viewerName: document.getElementById("file-viewer-name"),
  viewerContent: document.getElementById("file-viewer-content"),

  open() {
    this.panel.classList.remove("hidden");
    this.viewer.classList.add("hidden");
    App.ws.send(JSON.stringify({ cmd: "ls" }));
  },

  close() {
    this.panel.classList.add("hidden");
  },

  renderTree(tree, container) {
    container = container || this.treeEl;
    container.innerHTML = "";

    for (const entry of tree) {
      const item = document.createElement("div");
      item.className = "ft-item";

      if (entry.type === "dir") {
        item.innerHTML = `<span class="ft-icon">📁</span><span class="ft-name">${entry.name}</span>`;
        item.classList.add("ft-dir");

        const children = document.createElement("div");
        children.className = "ft-children hidden";

        if (entry.children && entry.children.length > 0) {
          this.renderTree(entry.children, children);
        }

        item.addEventListener("click", (e) => {
          e.stopPropagation();
          children.classList.toggle("hidden");
          item.classList.toggle("ft-open");
        });

        container.appendChild(item);
        container.appendChild(children);
      } else {
        item.innerHTML = `<span class="ft-icon">📄</span><span class="ft-name">${entry.name}</span>`;
        item.classList.add("ft-file");
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          this.openFile(entry.path, entry.name);
        });
        container.appendChild(item);
      }
    }
  },

  openFile(filePath, name) {
    this.viewerName.textContent = name;
    this.viewerContent.textContent = "Loading...";
    this.viewer.classList.remove("hidden");
    this.treeEl.classList.add("hidden");
    App.ws.send(JSON.stringify({ cmd: "read_file", path: filePath }));
  },

  showContent(data) {
    if (data.error) {
      this.viewerContent.textContent = `Error: ${data.error}`;
    } else if (data.truncated) {
      this.viewerContent.textContent = `File too large (${(data.size / 1024).toFixed(1)} KB)`;
    } else {
      this.viewerContent.textContent = data.content;
      if (typeof hljs !== "undefined") {
        hljs.highlightElement(this.viewerContent);
      }
    }
  },

  backToTree() {
    this.viewer.classList.add("hidden");
    this.treeEl.classList.remove("hidden");
  },
};

// Events
document.getElementById("btn-files").addEventListener("click", () => FileTree.open());
document.getElementById("btn-files-close").addEventListener("click", () => FileTree.close());
document.getElementById("btn-file-back").addEventListener("click", () => FileTree.backToTree());

App.on("file_tree", (data) => FileTree.renderTree(data.tree));
App.on("file_content", (data) => FileTree.showContent(data));
