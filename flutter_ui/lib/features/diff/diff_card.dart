import 'package:flutter/material.dart';

class DiffCard extends StatelessWidget {
  final String tool;
  final Map<String, dynamic> input;

  const DiffCard({super.key, required this.tool, required this.input});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final filePath = input['file_path'] as String? ?? '';
    final fileName = filePath.split('/').last;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cs.outlineVariant.withOpacity(0.5)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            color: cs.surfaceContainerHighest,
            child: Row(
              children: [
                Icon(
                  tool == 'Edit' ? Icons.edit_outlined : Icons.note_add_outlined,
                  size: 14,
                  color: cs.primary,
                ),
                const SizedBox(width: 6),
                Text(tool, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: cs.primary)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    fileName,
                    style: TextStyle(fontSize: 11, fontFamily: 'monospace', color: cs.onSurfaceVariant),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          // Diff body
          Container(
            width: double.infinity,
            constraints: const BoxConstraints(maxHeight: 300),
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: tool == 'Edit' ? _buildEdit(cs) : _buildWrite(cs),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEdit(ColorScheme cs) {
    final oldStr = input['old_string'] as String? ?? '';
    final newStr = input['new_string'] as String? ?? '';
    final oldLines = oldStr.split('\n');
    final newLines = newStr.split('\n');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ...oldLines.map((l) => _DiffLine(text: '- $l', isRemoved: true)),
        ...newLines.map((l) => _DiffLine(text: '+ $l', isAdded: true)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Text(
            '-${oldLines.length} +${newLines.length} lines',
            style: TextStyle(fontSize: 10, color: cs.onSurfaceVariant),
          ),
        ),
      ],
    );
  }

  Widget _buildWrite(ColorScheme cs) {
    final content = input['content'] as String? ?? '';
    final lines = content.split('\n');
    final show = lines.take(30).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ...show.map((l) => _DiffLine(text: '+ $l', isAdded: true)),
        if (lines.length > 30)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Text(
              '... +${lines.length - 30} more lines',
              style: TextStyle(fontSize: 10, fontStyle: FontStyle.italic, color: cs.onSurfaceVariant),
            ),
          ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Text(
            'new file, ${lines.length} lines',
            style: TextStyle(fontSize: 10, color: cs.onSurfaceVariant),
          ),
        ),
      ],
    );
  }
}

class _DiffLine extends StatelessWidget {
  final String text;
  final bool isAdded;
  final bool isRemoved;

  const _DiffLine({required this.text, this.isAdded = false, this.isRemoved = false});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    if (isRemoved) {
      bg = const Color(0xFFEF5350).withOpacity(0.12);
      fg = const Color(0xFFF48771);
    } else if (isAdded) {
      bg = const Color(0xFF66BB6A).withOpacity(0.12);
      fg = const Color(0xFF89D185);
    } else {
      bg = Colors.transparent;
      fg = Theme.of(context).colorScheme.onSurface;
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      color: bg,
      child: Text(
        text,
        style: TextStyle(fontSize: 11, fontFamily: 'monospace', color: fg, height: 1.6),
      ),
    );
  }
}
