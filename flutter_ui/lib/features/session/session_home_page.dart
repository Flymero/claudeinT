import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'session_controller.dart';
import 'connection_settings.dart';
import '../chat/chat_timeline.dart';
import '../files/file_drawer.dart';
import '../permissions/permission_sheet.dart';

class SessionHomePage extends StatefulWidget {
  final SessionController controller;
  final VoidCallback onToggleTheme;

  const SessionHomePage({
    super.key,
    required this.controller,
    required this.onToggleTheme,
  });

  @override
  State<SessionHomePage> createState() => _SessionHomePageState();
}

class _SessionHomePageState extends State<SessionHomePage> {
  final _inputController = TextEditingController();
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  SessionController get ctrl => widget.controller;

  @override
  void initState() {
    super.initState();
    _loadAndConnect();
    ctrl.addListener(_onStateChange);
  }

  Future<void> _loadAndConnect() async {
    final prefs = await SharedPreferences.getInstance();
    final url = prefs.getString('bridge_url') ?? 'ws://localhost:3100';
    ctrl.connect(url: url);
  }

  void _showConnectionSettings() {
    showModalBottomSheet(
      context: context,
      useSafeArea: true,
      showDragHandle: true,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (_) => ConnectionSettings(
        currentUrl: ctrl.wsUrl,
        onConnect: (url) => ctrl.connect(url: url),
      ),
    );
  }

  void _onStateChange() {
    setState(() {});
    if (ctrl.state == SessionState.waitingPermission) {
      _showPermissionSheet();
    }
  }

  void _send() {
    final text = _inputController.text.trim();
    if (text.isEmpty) return;
    ctrl.send(text);
    _inputController.clear();
  }

  void _showPermissionSheet() {
    final lastPerm = ctrl.events.lastWhere(
      (e) => e.event == 'permission_request',
      orElse: () => BridgeEvent('none', {}),
    );
    if (lastPerm.event == 'none') return;

    showModalBottomSheet(
      context: context,
      useSafeArea: true,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (_) => PermissionSheet(
        tool: lastPerm.data['tool'] as String? ?? '',
        input: lastPerm.data['input'] as Map<String, dynamic>? ?? {},
        onApprove: (tool) {
          ctrl.approve(tool);
          Navigator.pop(context);
        },
        onDeny: () {
          ctrl.deny();
          Navigator.pop(context);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isConnected = ctrl.state != SessionState.disconnected;
    final isRunning = ctrl.state == SessionState.running;

    return Scaffold(
      key: _scaffoldKey,
      drawer: FileDrawer(controller: ctrl),
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.folder_outlined),
          onPressed: () => _scaffoldKey.currentState?.openDrawer(),
        ),
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isConnected
                    ? const Color(0xFF22C55E)
                    : cs.error,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              ctrl.state.name,
              style: TextStyle(fontSize: 13, color: cs.onSurfaceVariant),
            ),
          ],
        ),
        actions: [
          if (isRunning)
            IconButton(
              icon: Icon(Icons.stop_circle_outlined, color: cs.error),
              onPressed: ctrl.abort,
            ),
          IconButton(
            icon: const Icon(Icons.settings_ethernet_outlined),
            onPressed: _showConnectionSettings,
          ),
          IconButton(
            icon: const Icon(Icons.brightness_6_outlined),
            onPressed: widget.onToggleTheme,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ChatTimeline(events: ctrl.events),
          ),
          _buildInputBar(cs),
        ],
      ),
    );
  }

  Widget _buildInputBar(ColorScheme cs) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 8, 16),
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        border: Border(top: BorderSide(color: cs.outlineVariant)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                controller: _inputController,
                maxLines: 4,
                minLines: 1,
                decoration: InputDecoration(
                  hintText: 'Send a message...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide.none,
                  ),
                  filled: true,
                  fillColor: cs.surfaceContainerHighest,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 12,
                  ),
                ),
                onSubmitted: (_) => _send(),
              ),
            ),
            const SizedBox(width: 8),
            FloatingActionButton.small(
              onPressed: _send,
              child: const Icon(Icons.send),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    ctrl.removeListener(_onStateChange);
    _inputController.dispose();
    super.dispose();
  }
}
