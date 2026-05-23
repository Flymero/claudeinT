import 'package:flutter/material.dart';
import '../session/session_controller.dart';

class FileDrawer extends StatefulWidget {
  final SessionController controller;
  const FileDrawer({super.key, required this.controller});

  @override
  State<FileDrawer> createState() => _FileDrawerState();
}

class _FileDrawerState extends State<FileDrawer> {
  List<dynamic>? _tree;
  String? _viewingFile;
  String? _fileContent;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onEvent);
    widget.controller.requestFileTree();
  }

  void _onEvent() {
    final events = widget.controller.events;
    if (events.isEmpty) return;
    final last = events.last;

    if (last.event == 'file_tree') {
      setState(() => _tree = last.data['tree'] as List<dynamic>?);
    } else if (last.event == 'file_content') {
      setState(() {
        _fileContent = last.data['content'] as String? ?? last.data['error'] as String? ?? '';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Drawer(
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(Icons.folder_outlined, color: cs.primary),
                  const SizedBox(width: 8),
                  Text('Files', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: cs.onSurface)),
                  const Spacer(),
                  if (_viewingFile != null)
                    IconButton(
                      icon: const Icon(Icons.arrow_back, size: 20),
                      onPressed: () => setState(() { _viewingFile = null; _fileContent = null; }),
                    ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: _viewingFile != null ? _buildViewer(cs) : _buildTree(cs),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTree(ColorScheme cs) {
    if (_tree == null) {
      return const Center(child: CircularProgressIndicator());
    }
    return ListView(
      children: _tree!.map((e) => _buildEntry(e as Map<String, dynamic>, 0, cs)).toList(),
    );
  }

  Widget _buildEntry(Map<String, dynamic> entry, int depth, ColorScheme cs) {
    final name = entry['name'] as String;
    final type = entry['type'] as String;
    final children = entry['children'] as List<dynamic>?;

    if (type == 'dir') {
      return ExpansionTile(
        tilePadding: EdgeInsets.only(left: 16.0 + depth * 16),
        leading: Icon(Icons.folder, size: 18, color: cs.primary),
        title: Text(name, style: const TextStyle(fontSize: 14)),
        children: children?.map((c) => _buildEntry(c as Map<String, dynamic>, depth + 1, cs)).toList() ?? [],
      );
    }

    return ListTile(
      contentPadding: EdgeInsets.only(left: 32.0 + depth * 16),
      leading: Icon(Icons.description_outlined, size: 18, color: cs.onSurfaceVariant),
      title: Text(name, style: const TextStyle(fontSize: 14)),
      onTap: () {
        setState(() => _viewingFile = name);
        widget.controller.requestFileContent(entry['path'] as String);
      },
    );
  }

  Widget _buildViewer(ColorScheme cs) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text(
            _viewingFile ?? '',
            style: TextStyle(fontSize: 12, fontFamily: 'monospace', color: cs.primary),
          ),
        ),
        Expanded(
          child: _fileContent == null
              ? const Center(child: CircularProgressIndicator())
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(12),
                  child: SelectableText(
                    _fileContent!,
                    style: TextStyle(fontSize: 12, fontFamily: 'monospace', color: cs.onSurface, height: 1.5),
                  ),
                ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onEvent);
    super.dispose();
  }
}
