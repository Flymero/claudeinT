"use strict";

const fs = require("fs");
const path = require("path");

const IGNORE = new Set([
  "node_modules", ".git", ".gradle", "build", ".dart_tool",
  ".idea", "__pycache__", ".cache", ".pids",
]);

function listDir(dirPath, maxDepth = 3, depth = 0) {
  const entries = [];
  let items;
  try {
    items = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return entries;
  }

  items.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const item of items) {
    if (IGNORE.has(item.name)) continue;
    if (item.name.startsWith(".") && item.name !== ".github") continue;

    const fullPath = path.join(dirPath, item.name);
    const entry = {
      name: item.name,
      path: fullPath,
      type: item.isDirectory() ? "dir" : "file",
    };

    if (item.isDirectory() && depth < maxDepth) {
      entry.children = listDir(fullPath, maxDepth, depth + 1);
    }

    entries.push(entry);
  }

  return entries;
}

function readFile(filePath, maxSize = 50000) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > maxSize) {
      return { error: null, content: null, truncated: true, size: stat.size };
    }
    const content = fs.readFileSync(filePath, "utf8");
    return { error: null, content, truncated: false, size: stat.size };
  } catch (err) {
    return { error: err.message, content: null, truncated: false, size: 0 };
  }
}

module.exports = { listDir, readFile };
