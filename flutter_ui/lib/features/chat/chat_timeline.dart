import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../session/session_controller.dart';
import '../diff/diff_card.dart';

class ChatTimeline extends StatefulWidget {
  final List<BridgeEvent> events;
  const ChatTimeline({super.key, required this.events});

  @override
  State<ChatTimeline> createState() => _ChatTimelineState();
}

class _ChatTimelineState extends State<ChatTimeline> {
  final _scrollController = ScrollController();

  @override
  void didUpdateWidget(ChatTimeline old) {
    super.didUpdateWidget(old);
    if (widget.events.length != old.events.length) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut,
          );
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayEvents = widget.events.where((e) =>
      ['user_message', 'text', 'thinking', 'tool_use', 'tool_result', 'done']
          .contains(e.event)).toList();

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: displayEvents.length,
      itemBuilder: (context, index) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _buildEvent(context, displayEvents[index]),
        );
      },
    );
  }

  Widget _buildEvent(BuildContext context, BridgeEvent event) {
    return switch (event.event) {
      'user_message' => _UserBubble(text: event.data['content'] as String? ?? ''),
      'text' => _AssistantCard(text: event.data['content'] as String? ?? ''),
      'thinking' => _ThinkingCard(text: event.data['content'] as String? ?? ''),
      'tool_use' => _buildToolUse(context, event),
      'tool_result' => _ToolResultCard(event: event),
      'done' => _DoneIndicator(event: event),
      _ => const SizedBox.shrink(),
    };
  }

  Widget _buildToolUse(BuildContext context, BridgeEvent event) {
    final tool = event.data['tool'] as String? ?? '';
    if (tool == 'Edit' || tool == 'Write') {
      return DiffCard(tool: tool, input: event.data['input'] as Map<String, dynamic>? ?? {});
    }
    return _ToolUseCard(event: event);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }
}

class _UserBubble extends StatelessWidget {
  final String text;
  const _UserBubble({required this.text});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 320),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: cs.primaryContainer,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(color: cs.shadow.withOpacity(0.08), blurRadius: 8, offset: const Offset(0, 2)),
          ],
        ),
        child: Text(text, style: TextStyle(color: cs.onPrimaryContainer)),
      ),
    );
  }
}

class _AssistantCard extends StatelessWidget {
  final String text;
  const _AssistantCard({required this.text});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 760),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: cs.surfaceContainerLowest,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: cs.outlineVariant.withOpacity(0.5)),
          boxShadow: [
            BoxShadow(color: cs.shadow.withOpacity(0.05), blurRadius: 18, offset: const Offset(0, 4)),
          ],
        ),
        child: MarkdownBody(
          data: text,
          selectable: true,
          styleSheet: MarkdownStyleSheet(
            p: TextStyle(color: cs.onSurface, height: 1.5),
            code: TextStyle(
              fontFamily: 'JetBrains Mono',
              fontSize: 13,
              backgroundColor: cs.surfaceContainerHighest.withOpacity(0.5),
            ),
            codeblockDecoration: BoxDecoration(
              color: cs.surfaceContainerHighest.withOpacity(0.38),
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
      ),
    );
  }
}

class _ThinkingCard extends StatefulWidget {
  final String text;
  const _ThinkingCard({required this.text});

  @override
  State<_ThinkingCard> createState() => _ThinkingCardState();
}

class _ThinkingCardState extends State<_ThinkingCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return GestureDetector(
      onTap: () => setState(() => _expanded = !_expanded),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          border: Border.all(color: cs.outlineVariant, style: BorderStyle.solid),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.psychology_outlined, size: 16, color: cs.onSurfaceVariant),
                const SizedBox(width: 6),
                Text('Thinking...', style: TextStyle(fontSize: 13, color: cs.onSurfaceVariant)),
                const Spacer(),
                Icon(_expanded ? Icons.expand_less : Icons.expand_more, size: 16, color: cs.onSurfaceVariant),
              ],
            ),
            if (_expanded) ...[
              const SizedBox(height: 8),
              Text(
                widget.text,
                style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant, height: 1.4),
                maxLines: 20,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ToolUseCard extends StatelessWidget {
  final BridgeEvent event;
  const _ToolUseCard({required this.event});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tool = event.data['tool'] as String? ?? '';
    final input = event.data['input'] as Map<String, dynamic>? ?? {};

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cs.outlineVariant.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.build_outlined, size: 14, color: cs.primary),
              const SizedBox(width: 6),
              Text(tool, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: cs.primary)),
            ],
          ),
          if (input.isNotEmpty) ...[
            const SizedBox(height: 6),
            Builder(builder: (_) {
              final text = JsonEncoder.withIndent('  ').convert(input);
              return Text(
                text.length > 200 ? text.substring(0, 200) : text,
                style: TextStyle(fontSize: 11, fontFamily: 'monospace', color: cs.onSurfaceVariant),
                maxLines: 5,
                overflow: TextOverflow.ellipsis,
              );
            }),
          ],
        ],
      ),
    );
  }
}

class _ToolResultCard extends StatelessWidget {
  final BridgeEvent event;
  const _ToolResultCard({required this.event});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isError = event.data['status'] == 'error';

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isError ? cs.errorContainer.withOpacity(0.3) : cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(10),
        border: Border(left: BorderSide(width: 3, color: isError ? cs.error : const Color(0xFF22C55E))),
      ),
      child: Text(
        (event.data['content']?.toString() ?? '').substring(0, (event.data['content']?.toString().length ?? 0).clamp(0, 300)),
        style: TextStyle(fontSize: 11, fontFamily: 'monospace', color: cs.onSurfaceVariant),
        maxLines: 6,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}

class _DoneIndicator extends StatelessWidget {
  final BridgeEvent event;
  const _DoneIndicator({required this.event});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final turns = event.data['turns'] ?? 0;
    final cost = (event.data['cost'] as num?)?.toStringAsFixed(4) ?? '0';

    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: cs.outlineVariant),
        ),
        child: Text(
          '✓ $turns turns · \$$cost',
          style: TextStyle(fontSize: 11, color: cs.onSurfaceVariant),
        ),
      ),
    );
  }
}
