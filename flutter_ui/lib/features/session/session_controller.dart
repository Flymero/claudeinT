import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

enum SessionState { idle, running, waitingPermission, disconnected }

class BridgeEvent {
  final String event;
  final Map<String, dynamic> data;
  BridgeEvent(this.event, this.data);
}

class SessionController extends ChangeNotifier {
  WebSocketChannel? _channel;
  SessionState _state = SessionState.disconnected;
  String? _sessionId;
  final List<BridgeEvent> _events = [];
  StreamSubscription? _subscription;

  SessionState get state => _state;
  String? get sessionId => _sessionId;
  List<BridgeEvent> get events => List.unmodifiable(_events);

  String _wsUrl = 'ws://localhost:3100';

  void connect({String? url}) {
    _wsUrl = url ?? _wsUrl;
    _disconnect();
    try {
      _channel = WebSocketChannel.connect(Uri.parse(_wsUrl));
      _subscription = _channel!.stream.listen(
        _onMessage,
        onDone: _onDisconnected,
        onError: (_) => _onDisconnected(),
      );
    } catch (_) {
      _onDisconnected();
    }
  }

  void send(String message) {
    _sendCmd({'cmd': 'send', 'message': message});
    _events.add(BridgeEvent('user_message', {'content': message}));
    notifyListeners();
  }

  void abort() => _sendCmd({'cmd': 'abort'});

  void approve(String tool) => _sendCmd({'cmd': 'approve', 'tool': tool});

  void deny() => _sendCmd({'cmd': 'deny'});

  void requestFileTree() => _sendCmd({'cmd': 'ls'});

  void requestFileContent(String path) =>
      _sendCmd({'cmd': 'read_file', 'path': path});

  void _sendCmd(Map<String, dynamic> cmd) {
    _channel?.sink.add(jsonEncode(cmd));
  }

  void _onMessage(dynamic raw) {
    final data = jsonDecode(raw as String) as Map<String, dynamic>;
    final event = data['event'] as String? ?? 'unknown';

    if (event == 'status' || event == 'connected') {
      final s = data['state'] as String? ?? 'idle';
      _state = switch (s) {
        'running' => SessionState.running,
        'waiting_permission' => SessionState.waitingPermission,
        _ => SessionState.idle,
      };
    }

    if (event == 'system') {
      _sessionId = data['sessionId'] as String?;
      _state = SessionState.idle;
    }

    _events.add(BridgeEvent(event, data));
    notifyListeners();
  }

  void _onDisconnected() {
    _state = SessionState.disconnected;
    notifyListeners();
    Future.delayed(const Duration(seconds: 2), () {
      if (_state == SessionState.disconnected) connect();
    });
  }

  void _disconnect() {
    _subscription?.cancel();
    _channel?.sink.close();
    _channel = null;
  }

  @override
  void dispose() {
    _disconnect();
    super.dispose();
  }
}
