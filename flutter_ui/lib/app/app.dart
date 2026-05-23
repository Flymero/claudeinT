import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../features/session/session_home_page.dart';
import '../features/session/session_controller.dart';

class ClaudeInTApp extends StatefulWidget {
  const ClaudeInTApp({super.key});

  @override
  State<ClaudeInTApp> createState() => _ClaudeInTAppState();
}

class _ClaudeInTAppState extends State<ClaudeInTApp> {
  ThemeMode _themeMode = ThemeMode.dark;
  late SessionController _controller;

  @override
  void initState() {
    super.initState();
    _controller = SessionController();
    _loadThemeMode();
  }

  Future<void> _loadThemeMode() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _themeMode = prefs.getBool('darkMode') ?? true
          ? ThemeMode.dark
          : ThemeMode.light;
    });
  }

  void _toggleThemeMode() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _themeMode = _themeMode == ThemeMode.dark
          ? ThemeMode.light
          : ThemeMode.dark;
      prefs.setBool('darkMode', _themeMode == ThemeMode.dark);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ClaudeInT',
      debugShowCheckedModeBanner: false,
      themeMode: _themeMode,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4FC3F7),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4FC3F7),
          brightness: Brightness.dark,
          surface: const Color(0xFF1A1A2E),
          onSurface: const Color(0xFFE0E0E0),
        ),
        scaffoldBackgroundColor: const Color(0xFF1A1A2E),
        useMaterial3: true,
      ),
      home: SessionHomePage(
        controller: _controller,
        onToggleTheme: _toggleThemeMode,
      ),
    );
  }
}
