#!/usr/bin/env python3
"""
LAMA Log Analyzer - Analyzes pino JSON logs to identify slow operations
Usage: uv run scripts/analyze-logs.py [logfile]
"""
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "rich",
# ]
# ///

import json
import sys
import re
from collections import defaultdict
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

console = Console()

@dataclass
class LogEntry:
    level: int
    time: int
    pid: int
    elapsed: str
    msg: str
    elapsed_seconds: float

    @classmethod
    def from_json(cls, data: dict) -> Optional['LogEntry']:
        try:
            elapsed_str = data.get('elapsed', '+0s')
            # Parse elapsed time like "+123.456s"
            match = re.match(r'\+?([\d.]+)s', elapsed_str)
            elapsed_seconds = float(match.group(1)) if match else 0.0

            return cls(
                level=data.get('level', 30),
                time=data.get('time', 0),
                pid=data.get('pid', 0),
                elapsed=elapsed_str,
                msg=data.get('msg', ''),
                elapsed_seconds=elapsed_seconds
            )
        except Exception as e:
            return None


def extract_operation(msg: str) -> str:
    """Extract operation name from log message."""
    # Extract [Component] prefix
    match = re.match(r'\[([^\]]+)\]', msg)
    if match:
        component = match.group(1)
        # Get action after component
        rest = msg[match.end():].strip()
        # Truncate long messages
        if len(rest) > 60:
            rest = rest[:57] + "..."
        return f"[{component}] {rest}"
    return msg[:80] if len(msg) > 80 else msg


def analyze_logs(log_file: Path) -> dict:
    """Analyze log file and return statistics."""
    entries = []
    errors = []
    warnings = []

    console.print(f"[blue]Reading log file: {log_file}[/blue]")

    with open(log_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                entry = LogEntry.from_json(data)
                if entry:
                    entries.append(entry)
                    if entry.level >= 50:  # Error
                        errors.append(entry)
                    elif entry.level >= 40:  # Warn
                        warnings.append(entry)
            except json.JSONDecodeError:
                pass  # Skip non-JSON lines

    console.print(f"[green]Parsed {len(entries)} log entries[/green]")

    # Calculate time gaps between entries
    gaps = []
    for i in range(1, len(entries)):
        prev = entries[i-1]
        curr = entries[i]
        gap = curr.elapsed_seconds - prev.elapsed_seconds
        if gap > 0.1:  # Only track gaps > 100ms
            gaps.append({
                'start': prev.elapsed_seconds,
                'end': curr.elapsed_seconds,
                'gap': gap,
                'before': extract_operation(prev.msg),
                'after': extract_operation(curr.msg)
            })

    # Sort gaps by duration
    gaps.sort(key=lambda x: x['gap'], reverse=True)

    # Group by operation type
    operation_times = defaultdict(list)
    operation_counts = defaultdict(int)

    for i in range(1, len(entries)):
        prev = entries[i-1]
        curr = entries[i]
        gap = curr.elapsed_seconds - prev.elapsed_seconds
        op = extract_operation(curr.msg)
        operation_times[op].append(gap)
        operation_counts[op] += 1

    # Calculate total time per operation type
    operation_totals = {}
    for op, times in operation_times.items():
        operation_totals[op] = {
            'total': sum(times),
            'count': len(times),
            'avg': sum(times) / len(times) if times else 0,
            'max': max(times) if times else 0
        }

    # Sort by total time
    sorted_ops = sorted(operation_totals.items(), key=lambda x: x[1]['total'], reverse=True)

    return {
        'entries': entries,
        'errors': errors,
        'warnings': warnings,
        'gaps': gaps[:30],  # Top 30 gaps
        'operations': sorted_ops[:50],  # Top 50 operations
        'total_time': entries[-1].elapsed_seconds if entries else 0,
        'first_time': entries[0].elapsed_seconds if entries else 0,
    }


def print_summary(stats: dict):
    """Print analysis summary."""
    console.print()
    console.print(Panel.fit(
        f"[bold]Total Duration:[/bold] {stats['total_time']:.2f}s\n"
        f"[bold]Log Entries:[/bold] {len(stats['entries'])}\n"
        f"[bold]Errors:[/bold] {len(stats['errors'])}\n"
        f"[bold]Warnings:[/bold] {len(stats['warnings'])}",
        title="Log Analysis Summary"
    ))

    # Print errors
    if stats['errors']:
        console.print()
        console.print("[bold red]ERRORS:[/bold red]")
        for err in stats['errors'][:10]:
            console.print(f"  [{err.elapsed}] {err.msg[:200]}")

    # Print top time gaps (slowest operations)
    console.print()
    table = Table(title="Top 30 Slowest Operations (Time Gaps)")
    table.add_column("Start", style="cyan", width=10)
    table.add_column("Gap", style="yellow", width=10)
    table.add_column("Before", style="dim", width=40)
    table.add_column("After", style="green", width=40)

    for gap in stats['gaps']:
        table.add_row(
            f"{gap['start']:.2f}s",
            f"{gap['gap']:.3f}s",
            gap['before'][:40],
            gap['after'][:40]
        )

    console.print(table)

    # Print operation totals
    console.print()
    table2 = Table(title="Operations by Total Time")
    table2.add_column("Operation", style="cyan", width=60)
    table2.add_column("Total", style="yellow", width=10)
    table2.add_column("Count", style="blue", width=8)
    table2.add_column("Avg", style="green", width=10)
    table2.add_column("Max", style="red", width=10)

    for op, times in stats['operations'][:30]:
        table2.add_row(
            op[:60],
            f"{times['total']:.2f}s",
            str(times['count']),
            f"{times['avg']*1000:.1f}ms",
            f"{times['max']*1000:.1f}ms"
        )

    console.print(table2)


def print_flame_chart(stats: dict):
    """Print ASCII flame chart showing time distribution."""
    console.print()
    console.print(Panel.fit("[bold]Timeline (ASCII Flame Chart)[/bold]"))

    entries = stats['entries']
    if not entries:
        return

    total_time = stats['total_time']
    width = 100  # Chart width in characters

    # Group entries into time buckets
    bucket_size = total_time / width
    buckets = defaultdict(lambda: defaultdict(int))

    for entry in entries:
        bucket = int(entry.elapsed_seconds / bucket_size) if bucket_size > 0 else 0
        bucket = min(bucket, width - 1)

        # Extract component name
        match = re.match(r'\[([^\]]+)\]', entry.msg)
        component = match.group(1) if match else "Other"
        buckets[bucket][component] += 1

    # Get top components by frequency
    component_counts = defaultdict(int)
    for bucket_data in buckets.values():
        for comp, count in bucket_data.items():
            component_counts[comp] += count

    top_components = sorted(component_counts.items(), key=lambda x: x[1], reverse=True)[:8]
    component_chars = {comp: chr(ord('A') + i) for i, (comp, _) in enumerate(top_components)}
    component_chars['Other'] = '.'

    # Print legend
    console.print("Legend:")
    for comp, char in component_chars.items():
        if comp in dict(top_components):
            console.print(f"  {char} = {comp}")
    console.print()

    # Print timeline header
    console.print(f"0s{' ' * (width - 10)}{total_time:.0f}s")
    console.print("├" + "─" * (width - 2) + "┤")

    # Print activity bar
    bar = ""
    for i in range(width):
        if i in buckets:
            # Find dominant component in this bucket
            bucket_data = buckets[i]
            if bucket_data:
                dominant = max(bucket_data.items(), key=lambda x: x[1])[0]
                bar += component_chars.get(dominant, '.')
            else:
                bar += " "
        else:
            bar += " "

    console.print(f"|{bar}|")
    console.print("└" + "─" * (width - 2) + "┘")

    # Print time markers
    markers = ""
    for i in range(0, width, 10):
        time_at_pos = (i / width) * total_time
        marker = f"{time_at_pos:.0f}s"
        markers += marker + " " * (10 - len(marker))
    console.print(markers[:width])


def find_reload_events(stats: dict):
    """Find potential page reload events."""
    console.print()
    console.print(Panel.fit("[bold]Potential Reload/Restart Events[/bold]"))

    entries = stats['entries']
    reload_indicators = [
        "Starting application",
        "Window created",
        "Initializing",
        "App starting",
        "Logger.*initialized",
        "ready for provisioning",
    ]

    for entry in entries:
        for indicator in reload_indicators:
            if re.search(indicator, entry.msg, re.IGNORECASE):
                console.print(f"  [{entry.elapsed}] {entry.msg[:100]}")
                break


def main():
    # Find log file
    if len(sys.argv) > 1:
        log_file = Path(sys.argv[1])
    else:
        # Default locations
        locations = [
            Path.home() / ".config/LAMA/logs",
            Path("./logs"),
        ]
        for loc in locations:
            if loc.exists():
                logs = list(loc.glob("lama-*.log"))
                if logs:
                    log_file = max(logs, key=lambda p: p.stat().st_mtime)
                    break
        else:
            console.print("[red]No log file found. Specify path as argument.[/red]")
            sys.exit(1)

    if not log_file.exists():
        console.print(f"[red]Log file not found: {log_file}[/red]")
        sys.exit(1)

    stats = analyze_logs(log_file)
    print_summary(stats)
    print_flame_chart(stats)
    find_reload_events(stats)


if __name__ == "__main__":
    main()
