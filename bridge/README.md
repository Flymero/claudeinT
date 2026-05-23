# bridge/

Bridge 层：连接 Flutter UI 与 Claude Code CLI。

## 职责

- 管理 Claude Code 进程 (PTY spawn/kill/signal)
- 解析 `--output-format stream-json` 输出
- 将结构化事件推送给 Flutter UI
- 将用户操作 (审批、输入) 写入 stdin

## 技术选型

Go (cgo → .so) 或 Kotlin (直接 Android 原生)，待验证性能后决定。
