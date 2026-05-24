#!/usr/bin/env python3
"""
stream_parser.py — Claude Code stream-json 事件解析器原型

用法:
  claude --print --output-format stream-json "your prompt" | python3 scripts/stream_parser.py

输出每个事件的类型和关键字段，作为 bridge 层开发的参考实现。
"""

import sys
import json


def parse_event(obj: dict) -> dict:
    """将原始 stream-json 事件解析为结构化的 UI 事件"""
    event_type = obj.get("type", "unknown")

    if event_type == "system":
        return {
            "kind": "system",
            "session_id": obj.get("session_id"),
            "tools": [t.get("name") for t in obj.get("tools", [])],
        }

    elif event_type == "assistant":
        message = obj.get("message", {})
        content = message.get("content", [])
        texts = []
        tool_uses = []
        for block in content:
            if block.get("type") == "text":
                texts.append(block["text"])
            elif block.get("type") == "tool_use":
                tool_uses.append({
                    "tool": block.get("name"),
                    "id": block.get("id"),
                    "input": block.get("input"),
                })
        return {
            "kind": "assistant",
            "texts": texts,
            "tool_uses": tool_uses,
            "stop_reason": message.get("stop_reason"),
        }

    elif event_type == "user":
        message = obj.get("message", {})
        content = message.get("content", [])
        tool_results = []
        for block in content:
            if block.get("type") == "tool_result":
                tool_results.append({
                    "tool_use_id": block.get("tool_use_id"),
                    "is_error": block.get("is_error", False),
                    "content_preview": str(block.get("content", ""))[:200],
                })
        return {
            "kind": "tool_result",
            "results": tool_results,
        }

    elif event_type == "result":
        return {
            "kind": "result",
            "cost_usd": obj.get("cost_usd"),
            "duration_ms": obj.get("duration_ms"),
            "num_turns": obj.get("num_turns"),
            "is_error": obj.get("is_error", False),
        }

    else:
        return {"kind": event_type, "raw_keys": list(obj.keys())}


def main():
    print("ClaudeInT Stream Parser — waiting for events...\n")

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            print(f"[PARSE_ERROR] {line[:80]}")
            continue

        event = parse_event(obj)
        kind = event.pop("kind")

        # 格式化输出
        if kind == "system":
            tools = event.get("tools", [])
            print(f"[SYSTEM] session={event.get('session_id', '?')}")
            print(f"  Available tools ({len(tools)}): {', '.join(tools[:10])}...")

        elif kind == "assistant":
            for text in event.get("texts", []):
                preview = text[:120].replace("\n", " ")
                print(f"[TEXT] {preview}")
            for tu in event.get("tool_uses", []):
                tool_name = tu["tool"]
                input_preview = json.dumps(tu["input"], ensure_ascii=False)[:100]
                print(f"[TOOL_USE] {tool_name}: {input_preview}")

        elif kind == "tool_result":
            for r in event.get("results", []):
                status = "ERROR" if r["is_error"] else "OK"
                print(f"[TOOL_RESULT] [{status}] {r['content_preview'][:80]}")

        elif kind == "result":
            cost = event.get("cost_usd", 0)
            duration = event.get("duration_ms", 0)
            turns = event.get("num_turns", 0)
            print(f"\n[DONE] cost=${cost:.4f} duration={duration}ms turns={turns}")

        else:
            print(f"[{kind.upper()}] {json.dumps(event, ensure_ascii=False)[:100]}")

        sys.stdout.flush()


if __name__ == "__main__":
    main()
