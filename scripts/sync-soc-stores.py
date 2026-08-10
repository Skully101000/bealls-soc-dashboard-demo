#!/usr/bin/env python3
"""Filter soc-data.json to only current open Bealls store numbers."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOC_PATH = ROOT / "src" / "app" / "data" / "soc-data.json"
BEALLS_PATH = ROOT / "src" / "app" / "data" / "bealls-locations.json"


def pad_id(raw: str | int) -> str:
    return str(int(raw)).zfill(3)


def main() -> None:
    bealls = json.loads(BEALLS_PATH.read_text())
    open_ids = {
        pad_id(sid)
        for sid, store in bealls["stores"].items()
        if not store.get("closed")
    }
    labels = bealls.get("storeLabels", {})
    coords = bealls.get("storeCoords", {})

    soc = json.loads(SOC_PATH.read_text())

    def keep(sid: str | None) -> bool:
        return bool(sid and pad_id(sid) in open_ids)

    for op in soc.get("operators", []):
        op["assignedStores"] = [pad_id(s) for s in op.get("assignedStores", []) if keep(s)]
        op["extraStores"] = [pad_id(s) for s in op.get("extraStores", []) if keep(s)]
        if op.get("topStore") and not keep(op["topStore"]):
            op["topStore"] = op["assignedStores"][0] if op["assignedStores"] else None
        if op.get("hotStore") and not keep(op["hotStore"]):
            op["hotStore"] = None
        if op.get("topStore"):
            op["topLabel"] = labels.get(pad_id(op["topStore"]))

    for block in soc.get("focusBlocks", []):
        block["focusStores"] = [pad_id(s) for s in block.get("focusStores", []) if keep(s)]
        if block.get("hotStore") and not keep(block["hotStore"]):
            block["hotStore"] = None

    soc["priorityStoreIds"] = [pad_id(s) for s in soc.get("priorityStoreIds", []) if keep(s)]
    soc["opportunityStoreIds"] = [pad_id(s) for s in soc.get("opportunityStoreIds", []) if keep(s)]

    watch = []
    for item in soc.get("watchList", []):
        if not keep(item.get("id")):
            continue
        sid = pad_id(item["id"])
        loc = labels.get(sid, "")
        city = loc.split(" - ")[-1].rsplit(" ", 1)[0] if " - " in loc else f"Store {sid}"
        state = loc.rsplit(" ", 1)[-1] if loc else "—"
        item["city"] = city
        item["region"] = state if len(state) == 2 else item.get("region", "—")
        watch.append(item)
    soc["watchList"] = watch

    slots = {}
    for sid, row in soc.get("storeSlots", {}).items():
        if not keep(sid):
            continue
        slots[pad_id(sid)] = {
            k: pad_id(v) if keep(v) else None for k, v in row.items()
        }
    soc["storeSlots"] = slots

    soc["storeLabels"] = {pad_id(k): v for k, v in labels.items() if pad_id(k) in open_ids}
    soc["storeCoords"] = {pad_id(k): v for k, v in coords.items() if pad_id(k) in open_ids}

    dm = []
    for row in soc.get("dataminrAlerts", []):
        if keep(row.get("store")):
            row["store"] = pad_id(row["store"])
            dm.append(row)
    soc["dataminrAlerts"] = dm

    SOC_PATH.write_text(json.dumps(soc, indent=2))
    print(f"Synced soc-data.json — {len(open_ids)} open stores, {len(slots)} slot rows kept")


if __name__ == "__main__":
    main()
