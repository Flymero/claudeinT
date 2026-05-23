# flutter_ui/

Flutter 可视化 UI 模块，以 Android module 形式嵌入主工程。

## 核心页面

- ChatView: 对话界面，markdown 渲染
- DiffView: 代码变更审查
- FileTree: 项目文件浏览
- PermissionPanel: 工具调用审批
- TerminalView: 原始终端 (fallback)

## 与 Bridge 通信

通过 Flutter Platform Channel 与 Bridge 层交互，接收结构化事件并发送用户操作。
