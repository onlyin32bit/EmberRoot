#!/usr/bin/env python3
"""Generate a deterministic, *synthetic* EmberRoot field telemetry dataset.

The output follows the extended Colab/PINN schema exactly. It models normal
diurnal/seasonal behaviour, wet and dry water-table cycles, and labelled dry
period smouldering events. It is useful for exercising data pipelines and
experiments, but must never be represented as field observations.
"""

from __future__ import annotations

import argparse
import csv
import math
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path


HEADER = [
    "timestamp",
    "node_id",
    "x_m",
    "y_m",
    "z_m",
    "time_s",
    "temperature_c",
    "oxygen_fraction",
    "co_ppm",
    "co2_ppm",
    "ch4_ppm",
    "moisture_pct",
    "water_table_m",
]
DEPTHS_M = (0.05, 0.15, 0.30, 0.45)
SAMPLE_SECONDS = 300
NODES_ACROSS = 8
NODES_DOWN = 4


@dataclass(frozen=True)
class Node:
    index: int
    node_id: str
    x_m: float
    y_m: float
    baseline_bias_c: float
    moisture_bias_pct: float


@dataclass(frozen=True)
class Event:
    node_index: int
    start_s: int
    peak_s: int
    end_s: int
    peak_temp_c: float


def make_nodes() -> list[Node]:
    """Create a 32-node, 75 m-spaced peatland monitoring grid."""
    nodes: list[Node] = []
    for row in range(NODES_DOWN):
        for column in range(NODES_ACROSS):
            index = row * NODES_ACROSS + column
            nodes.append(
                Node(
                    index=index,
                    node_id=f"field_{index + 1:02d}",
                    x_m=column * 75.0,
                    y_m=row * 75.0,
                    baseline_bias_c=((index * 17) % 13 - 6) * 0.09,
                    moisture_bias_pct=((index * 11) % 9 - 4) * 0.7,
                )
            )
    return nodes


def make_events() -> list[Event]:
    """Schedule varied events in dry-season-like parts of a repeating year."""
    events: list[Event] = []
    for node_index in range(0, NODES_ACROSS * NODES_DOWN, 3):
        for event_number, day in enumerate((105 + (node_index % 6) * 5, 245 + (node_index % 5) * 6)):
            start_s = day * 86_400 + (node_index % 8) * 3_600
            peak_s = start_s + (7 + (node_index + event_number) % 7) * 3_600
            end_s = peak_s + (18 + (node_index * 3 + event_number) % 18) * 3_600
            events.append(
                Event(
                    node_index=node_index,
                    start_s=start_s,
                    peak_s=peak_s,
                    end_s=end_s,
                    peak_temp_c=78.0 + (node_index % 7) * 9.0,
                )
            )
    return events


def event_strength(time_s: int, event: Event) -> float:
    """Smooth ignition, self-sustained smouldering, and cooling progression."""
    if time_s < event.start_s or time_s > event.end_s:
        return 0.0
    if time_s <= event.peak_s:
        progress = (time_s - event.start_s) / (event.peak_s - event.start_s)
        return progress * progress * (3.0 - 2.0 * progress)
    cooling_progress = (time_s - event.peak_s) / (event.end_s - event.peak_s)
    return max(0.0, 1.0 - cooling_progress) ** 1.35


def synthetic_noise(time_index: int, node_index: int, depth_index: int, scale: float) -> float:
    """Fast deterministic pseudo-noise; reproducible without random global state."""
    phase = time_index * 0.173 + node_index * 2.719 + depth_index * 4.123
    return scale * (0.68 * math.sin(phase) + 0.32 * math.sin(phase * 0.371 + 1.7))


def build_event_index(events: list[Event]) -> dict[int, list[Event]]:
    by_node: dict[int, list[Event]] = {}
    for event in events:
        by_node.setdefault(event.node_index, []).append(event)
    return by_node


def write_event_labels(events: list[Event], output_path: Path, start: datetime) -> None:
    """Write DesignDoc-style event timing metadata outside the requested telemetry schema."""
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["node_id", "event_id", "pre_ignition_start", "smouldering_peak", "surface_proxy", "event_end"])
        for event_id, event in enumerate(events, start=1):
            writer.writerow(
                [
                    f"field_{event.node_index + 1:02d}",
                    f"synthetic_event_{event_id:03d}",
                    (start + timedelta(seconds=event.start_s)).isoformat().replace("+00:00", "Z"),
                    (start + timedelta(seconds=event.peak_s)).isoformat().replace("+00:00", "Z"),
                    (start + timedelta(seconds=event.peak_s + 3 * 3_600)).isoformat().replace("+00:00", "Z"),
                    (start + timedelta(seconds=event.end_s)).isoformat().replace("+00:00", "Z"),
                ]
            )


def generate(output_path: Path, target_bytes: int) -> tuple[int, int]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    partial_path = output_path.with_suffix(output_path.suffix + ".partial")
    if partial_path.exists():
        partial_path.unlink()

    start = datetime(2025, 1, 1, tzinfo=timezone.utc)
    nodes = make_nodes()
    events = make_events()
    events_by_node = build_event_index(events)

    rows = 0
    time_index = 0
    with partial_path.open("w", encoding="utf-8", newline="", buffering=4 * 1024 * 1024) as handle:
        handle.write(",".join(HEADER) + "\n")
        while handle.tell() < target_bytes:
            time_s = time_index * SAMPLE_SECONDS
            timestamp = (start + timedelta(seconds=time_s)).isoformat().replace("+00:00", "Z")
            year_phase = 2.0 * math.pi * ((time_s / 86_400.0) % 365.25) / 365.25
            day_phase = 2.0 * math.pi * ((time_s % 86_400) / 86_400.0)
            event_time_s = int(time_s % (365.25 * 86_400))

            # Rainy season: wet peat and a shallow water table. Dry season: lower water table.
            water_depth_m = 0.43 + 0.33 * math.sin(year_phase - 1.05) + 0.025 * math.sin(day_phase * 0.25)
            water_depth_m = min(0.95, max(0.04, water_depth_m))
            seasonal_moisture = 50.0 - 21.0 * math.sin(year_phase - 1.05)
            ambient_c = 28.0 + 2.7 * math.sin(year_phase - 0.25) + 3.4 * math.sin(day_phase - 1.4)

            lines: list[str] = []
            lines_byte_count = 0
            for node in nodes:
                local_moisture = min(
                    84.0,
                    max(
                        14.0,
                        seasonal_moisture
                        + node.moisture_bias_pct
                        + synthetic_noise(time_index, node.index, 0, 1.4),
                    ),
                )
                strengths = [event_strength(event_time_s, event) for event in events_by_node.get(node.index, [])]
                fire = max(strengths, default=0.0)
                # Fire is only sustained where peat is dry enough and the water table is low enough.
                dryness = max(0.0, min(1.0, (water_depth_m - 0.20) / 0.35)) * max(
                    0.0, min(1.0, (43.0 - local_moisture) / 18.0)
                )
                fire *= 0.35 + 0.65 * dryness
                peak_temp_c = max((event.peak_temp_c for event in events_by_node.get(node.index, [])), default=82.0)

                for depth_index, z_m in enumerate(DEPTHS_M):
                    depth_ambient = ambient_c - 1.9 * depth_index - 0.55 * math.sin(day_phase - depth_index)
                    # Heat first concentrates around 15 cm, then diffuses to other probe depths.
                    depth_response = (0.72, 1.00, 0.68, 0.34)[depth_index]
                    temperature_c = depth_ambient + node.baseline_bias_c + fire * peak_temp_c * depth_response
                    temperature_c += synthetic_noise(time_index, node.index, depth_index, 0.28)
                    temperature_c = min(380.0, max(12.0, temperature_c))

                    oxygen_fraction = 0.207 - 0.007 * depth_index - fire * (0.145 * depth_response)
                    oxygen_fraction += synthetic_noise(time_index, node.index, depth_index, 0.0012)
                    oxygen_fraction = min(0.209, max(0.025, oxygen_fraction))

                    co_ppm = 0.45 + 0.018 * max(0.0, temperature_c - 30.0) + fire * (170.0 * depth_response)
                    co_ppm += synthetic_noise(time_index, node.index, depth_index, 0.12)
                    co_ppm = max(0.05, co_ppm)

                    # CO2 rises more slowly than CO during active smouldering so their ratio approaches low values.
                    co2_ppm = 430.0 + 18.0 * math.sin(day_phase) + fire * (520.0 * depth_response)
                    co2_ppm += synthetic_noise(time_index, node.index, depth_index, 3.2)
                    co2_ppm = max(360.0, co2_ppm)

                    ch4_ppm = 1.9 + 0.015 * local_moisture + fire * (7.5 * (1.0 - z_m))
                    ch4_ppm += synthetic_noise(time_index, node.index, depth_index, 0.06)
                    ch4_ppm = max(0.4, ch4_ppm)

                    line = (
                        f"{timestamp},{node.node_id},{node.x_m:.1f},{node.y_m:.1f},{z_m:.2f},{time_s},"
                        f"{temperature_c:.2f},{oxygen_fraction:.4f},{co_ppm:.2f},{co2_ppm:.2f},"
                        f"{ch4_ppm:.2f},{local_moisture:.2f},{-water_depth_m:.3f}\n"
                    )
                    encoded_length = len(line.encode("utf-8"))
                    if handle.tell() + lines_byte_count + encoded_length > target_bytes:
                        handle.write("".join(lines))
                        handle.flush()
                        os.fsync(handle.fileno())
                        os.replace(partial_path, output_path)
                        write_event_labels(events, output_path.with_name(output_path.stem + "_events.csv"), start)
                        return rows, output_path.stat().st_size
                    lines.append(line)
                    lines_byte_count += encoded_length
                    rows += 1

            handle.write("".join(lines))
            if time_index % 1_000 == 0:
                handle.flush()
                print(f"{handle.tell() / 1024**3:.2f} GiB written; {rows:,} rows", flush=True)
            time_index += 1

    os.replace(partial_path, output_path)
    write_event_labels(events, output_path.with_name(output_path.stem + "_events.csv"), start)
    return rows, output_path.stat().st_size


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("ai/data/processed/synthetic_telemetry_2gib.csv"),
        help="output telemetry CSV path",
    )
    parser.add_argument(
        "--target-gib",
        type=float,
        default=2.0,
        help="target file size in GiB (default: 2)",
    )
    args = parser.parse_args()
    if args.target_gib <= 0:
        raise ValueError("--target-gib must be positive")

    target_bytes = int(args.target_gib * 1024**3)
    rows, byte_count = generate(args.output, target_bytes)
    print(f"Completed: {args.output} ({byte_count:,} bytes; {byte_count / 1024**3:.3f} GiB; {rows:,} rows)")
    print("This file is synthetic data for development and must not be treated as field measurements.")


if __name__ == "__main__":
    main()
