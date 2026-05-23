# ClaudeInT

基于 Termux fork 的可视化 Claude Code Android App。

## 架构

```
┌────────────────────────────────────────┐
│           Flutter UI Layer             │
│  Chat / Diff Review / File Tree / ...  │
├────────────────────────────────────────┤
│           Bridge Layer (Go)            │
│  PTY管理 / stream-json解析 / 事件路由   │
├────────────────────────────────────────┤
│         Termux Runtime Layer           │
│  Linux userspace / Node.js / Claude CLI│
└────────────────────────────────────────┘
```

## 模块

| 目录 | 说明 |
|------|------|
| `app/` | Fork 自 termux-app 的 Android 主工程 |
| `flutter_ui/` | Flutter 可视化 UI |
| `bridge/` | PTY 会话管理 + Claude Code 事件解析 |
| `scripts/` | 开发/构建辅助脚本 |
| `docs/` | 架构与设计文档 |

## 开发

在 Termux 环境中开发，GitHub Actions 构建 APK。

## License

MIT
