#!/usr/bin/env python3
"""Fetch all Bealls retail store locations from the public Yext store locator API."""
from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "app" / "data" / "bealls-locations.json"

# Public client-side key from stores.bealls.com (not a secret server credential)
API_KEY = "6e7ebdc4d4e57c3e0d97e27960051f97"
BASE = "https://cdn.yextapis.com/v2/accounts/me/entities"

NON_RETAIL = re.compile(
    r"corporate\s+office|headquarters|\bhq\b|fulfill|warehouse|distribution\s+center|\bdc\b",
    re.I,
)

US_BOUNDS = {"lat_min": 24.0, "lat_max": 50.0, "lng_min": -125.0, "lng_max": -65.0}


def pad_id(raw: str) -> str | None:
    digits = re.sub(r"\D", "", raw)
    if not digits or len(digits) > 4:
        return None
    n = int(digits)
    if n > 9999:
        return None
    return str(n).zfill(3)


def normalize_address(line1: str, city: str, state: str) -> str:
    line = re.sub(r"[^a-z0-9]+", " ", (line1 or "").lower()).strip()
    return f"{line}|{(city or '').lower()}|{(state or '').upper()}"


def pick_coordinates(entity: dict) -> tuple[float, float, str] | None:
    for source, key in (
        ("geocoded", "geocodedCoordinate"),
        ("display", "yextDisplayCoordinate"),
        ("city", "cityCoordinate"),
    ):
        geo = entity.get(key)
        if geo and "latitude" in geo and "longitude" in geo:
            lat = round(float(geo["latitude"]), 6)
            lng = round(float(geo["longitude"]), 6)
            if (
                US_BOUNDS["lat_min"] <= lat <= US_BOUNDS["lat_max"]
                and US_BOUNDS["lng_min"] <= lng <= US_BOUNDS["lng_max"]
            ):
                return lat, lng, source
    return None


def is_retail_location(entity: dict, sid: str) -> bool:
    name = entity.get("name") or ""
    label = f"{sid} - Bealls"
    blob = f"{name} {entity.get('geomodifier') or ''}"
    if NON_RETAIL.search(blob):
        return False
    if not entity.get("slug") and NON_RETAIL.search(name):
        return False
    return True


def store_quality(entry: dict) -> tuple[int, int, int]:
    """Higher = preferred when deduping same-address entries."""
    slug_score = 1 if entry.get("slug") else 0
    phone_score = 1 if entry.get("phone") else 0
    coord_score = {"geocoded": 3, "display": 2, "city": 1}.get(entry.get("coordSource", ""), 0)
    return (coord_score, slug_score, phone_score)


def fetch_page(page_token: str | None = None) -> dict:
    params = {
        "api_key": API_KEY,
        "v": "20220927",
        "entityTypes": "location",
        "limit": "50",
    }
    if page_token:
        params["pageToken"] = page_token
    url = f"{BASE}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=60) as resp:
        return json.loads(resp.read().decode())


def parse_entity(entity: dict) -> dict | None:
    meta = entity.get("meta") or {}
    store_id = meta.get("id")
    if not store_id:
        return None

    sid = pad_id(str(store_id))
    if not sid:
        return None

    if not is_retail_location(entity, sid):
        return None

    coords = pick_coordinates(entity)
    if not coords:
        return None

    lat, lng, coord_source = coords
    if coord_source == "city":
        # City-center geocodes are not accurate enough for store pins.
        return None

    addr = entity.get("address") or {}
    city = addr.get("city") or ""
    region = addr.get("region") or ""
    line1 = addr.get("line1") or ""
    postal = addr.get("postalCode") or ""
    phone = entity.get("mainPhone") or entity.get("phone") or ""

    geomod = entity.get("geomodifier") or ""
    label_parts = [sid, " - Bealls"]
    if geomod:
        label_parts.append(f" {geomod}")
    if city:
        label_parts.append(f" {city}")
    if region:
        label_parts.append(f" {region}")

    return {
        "id": sid,
        "name": entity.get("name") or "Bealls",
        "geomodifier": geomod,
        "label": "".join(label_parts).strip(),
        "address": line1,
        "city": city,
        "state": region,
        "zip": postal,
        "phone": phone,
        "lat": lat,
        "lng": lng,
        "coordSource": coord_source,
        "closed": bool(entity.get("closed")),
        "slug": entity.get("slug") or "",
        "addressKey": normalize_address(line1, city, region),
    }


def dedupe_by_address(stores: dict[str, dict]) -> dict[str, dict]:
    by_address: dict[str, list[dict]] = {}
    for entry in stores.values():
        by_address.setdefault(entry["addressKey"], []).append(entry)

    kept: dict[str, dict] = {}
    for group in by_address.values():
        if len(group) == 1:
            entry = group[0]
            entry.pop("addressKey", None)
            kept[entry["id"]] = entry
            continue

        best = max(group, key=lambda e: (store_quality(e), -int(e["id"])))
        best.pop("addressKey", None)
        kept[best["id"]] = best

    return kept


def main() -> None:
    stores: dict[str, dict] = {}
    page_token: str | None = None
    total_reported = 0
    pages = 0
    skipped_non_retail = 0
    skipped_city_coords = 0

    while True:
        data = fetch_page(page_token)
        response = data.get("response") or {}
        total_reported = response.get("count") or total_reported
        entities = response.get("entities") or []
        pages += 1

        for entity in entities:
            if entity.get("closed"):
                continue
            name = entity.get("name") or ""
            if NON_RETAIL.search(name):
                skipped_non_retail += 1
                continue
            coords = pick_coordinates(entity)
            if coords and coords[2] == "city":
                skipped_city_coords += 1
                continue

            parsed = parse_entity(entity)
            if parsed:
                stores[parsed["id"]] = parsed

        page_token = response.get("pageToken")
        print(f"Page {pages}: +{len(entities)} entities, {len(stores)} retail stores so far")
        if not page_token:
            break
        time.sleep(0.15)

    stores = dedupe_by_address(stores)
    coords = {sid: [s["lat"], s["lng"]] for sid, s in stores.items()}
    labels = {sid: s["label"] for sid, s in stores.items()}

    geocoded = sum(1 for s in stores.values() if s.get("coordSource") == "geocoded")
    display = sum(1 for s in stores.values() if s.get("coordSource") == "display")

    out = {
        "source": "stores.bealls.com (Yext public locator)",
        "fetchedAt": time.strftime("%Y-%m-%d"),
        "totalReported": total_reported,
        "openStoreCount": len(stores),
        "coordQuality": {"geocoded": geocoded, "display": display},
        "stores": stores,
        "storeCoords": coords,
        "storeLabels": labels,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(
        f"Saved {len(stores)} retail stores → {OUT}\n"
        f"  skipped non-retail: {skipped_non_retail}, skipped city-only coords: {skipped_city_coords}\n"
        f"  geocoded: {geocoded}, display: {display}"
    )


if __name__ == "__main__":
    main()
