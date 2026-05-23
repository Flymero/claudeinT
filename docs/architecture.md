# Architecture

## 设计原则

- **本地优先**：所有计算在设备端完成，Claude API 调用由 Claude Code CLI 处理
- **最小侵入**：尽量复用 Termux 已有能力，UI 层通过 Bridge 与终端解耦
- **渐进增强**：先保证终端可用，再逐步叠加可视化功能

## 层次架构

### 1. Termux Runtime Layer

Fork 自 [termux-app](https://github.com/termux/termux-app)，提供：
- Linux userspace (proot)
- APT 包管理 (Node.js, Git, build tools)
- PTY (伪终端) 基础设施
- 文件系统访问

Claude Code CLI 以 `--output-format stream-json` 模式运行在此层。

### 2. Bridge Layer

职责：
- 管理 Claude Code 进程生命周期 (spawn, signal, restart)
- 解析 stream-json 输出流，提取结构化事件：
  - `assistant` — 文本回复
  - `tool_use` — 工具调用 (Edit, Write, Bash, etc.)
  - `permission_request` — 权限审批请求
  - `result` — 工具执行结果
- 将用户 UI 操作转为 stdin 输入 (审批、中断、追加消息)
- 通过 platform channel / FFI 与 Flutter UI 通信

技术选型：Go (参考 MobileVC) 或 Kotlin (Android 原生)

### 3. Flutter UI Layer

触控优先的可视化界面：
- **Chat View** — 对话流，支持 markdown 渲染
- **Terminal View** — 原始终端输出 (fallback)
- **Diff Review** — 文件变更可视化，支持 accept/revert
- **File Tree** — 项目文件浏览
- **Permission Panel** — 一键审批/拒绝工具调用
- **Task Progress** — 任务执行状态追踪

## 数据流

```
User Touch → Flutter UI → Platform Channel → Bridge
    → stdin write → Claude Code CLI
    → stdout stream-json → Bridge 解析
    → 结构化事件 → Flutter UI 渲染
```

## 关键依赖

- Claude Code CLI: `--output-format stream-json`
- Termux: PTY, pkg, filesystem
- Flutter: Android embedding, platform channels
