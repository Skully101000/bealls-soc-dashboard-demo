#!/usr/bin/env python3
"""Anonymize staff-identifying fields before a public demo build/publish.

Does not print original values. Safe to run repeatedly.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOC_DATA = ROOT / "src" / "app" / "data" / "soc-data.json"


def main() -> None:
    data = json.loads(SOC_DATA.read_text(encoding="utf-8"))
    operators = data.get("operators") or []
    for i, op in enumerate(operators, start=1):
        if not isinstance(op, dict):
            continue
        op["name"] = f"Demo Operator {i:02d}"
        op["extension"] = f"5{i:03d}"
        if "id" in op and isinstance(op["id"], str) and not op["id"].startswith("demo-"):
            op["id"] = f"demo-op-{i:02d}"

    # Drop workbook provenance that could identify an internal share path.
    if isinstance(data.get("sourceFile"), str):
        data["sourceFile"] = "[demo] sample assignments workbook"
    data["publicDemoScrubbed"] = True

    SOC_DATA.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Scrubbed {len(operators)} operators in {SOC_DATA.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
