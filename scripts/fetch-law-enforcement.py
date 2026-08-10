#!/usr/bin/env python3
"""Match Bealls stores to nearest local law enforcement non-emergency numbers (HIFLD)."""
from __future__ import annotations

import json
import math
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STORES_PATH = ROOT / "src" / "app" / "data" / "bealls-locations.json"
CACHE_PATH = ROOT / "src" / "app" / "data" / ".hifld-law-enforcement-cache.json"
OUT_PATH = ROOT / "src" / "app" / "data" / "store-law-enforcement.json"

FEATURE_URL = (
    "https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/"
    "Local_Law_Enforcement_Locations_RAPT/FeatureServer/0/query"
)
FCC_URL = "https://geo.fcc.gov/api/census/block/find?format=json"

TYPE_PRIORITY = {
    "LOCAL POLICE DEPARTMENT": 0,
    "COUNTY SHERIFF'S OFFICE": 1,
    "COUNTY SHERIFF OFFICE": 1,
    "SPECIAL JURISDICTION": 2,
}


def normalize_city(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (value or "").lower())


def normalize_phone(value: str) -> str | None:
    if not value:
        return None
    upper = value.strip().upper()
    if upper in {"NOT AVAILABLE", "N/A", "NA", "UNKNOWN", "NONE", ""}:
        return None
    digits = re.sub(r"\D", "", value)
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    if len(digits) != 10:
        return None
    return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 3958.7613
    p = math.pi / 180
    a = (
        math.sin((lat2 - lat1) * p / 2) ** 2
        + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lon2 - lon1) * p / 2) ** 2
    )
    return 2 * r * math.asin(math.sqrt(a))


def fetch_json(url: str, timeout: int = 60) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "soc-dashboard/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def fetch_county(lat: float, lng: float) -> str | None:
    url = f"{FCC_URL}&latitude={lat}&longitude={lng}"
    try:
        data = fetch_json(url, timeout=20)
        return (data.get("County") or {}).get("name")
    except Exception:
        return None


def download_agencies(states: list[str]) -> list[dict]:
    if CACHE_PATH.exists():
        cached = json.loads(CACHE_PATH.read_text())
        if cached.get("states") == sorted(states) and cached.get("agencies"):
            print(f"Using cached HIFLD agencies ({len(cached['agencies'])})")
            return cached["agencies"]

    quoted = ",".join(f"'{s}'" for s in states)
    where = f"STATE IN ({quoted})"
    agencies: list[dict] = []
    offset = 0
    page_size = 2000

    while True:
        params = {
            "where": where,
            "outFields": "NAME,CITY,STATE,TELEPHONE,TYPE,COUNTY,LATITUDE,LONGITUDE",
            "f": "json",
            "resultOffset": str(offset),
            "resultRecordCount": str(page_size),
        }
        url = f"{FEATURE_URL}?{urllib.parse.urlencode(params)}"
        data = fetch_json(url)
        features = data.get("features") or []
        if not features:
            break

        for feature in features:
            attrs = feature.get("attributes") or {}
            lat = attrs.get("LATITUDE")
            lng = attrs.get("LONGITUDE")
            if lat is None or lng is None:
                continue
            agencies.append(
                {
                    "name": (attrs.get("NAME") or "").strip(),
                    "city": (attrs.get("CITY") or "").strip(),
                    "state": (attrs.get("STATE") or "").strip(),
                    "phone": normalize_phone(attrs.get("TELEPHONE") or ""),
                    "type": (attrs.get("TYPE") or "").strip(),
                    "county": (attrs.get("COUNTY") or "").strip(),
                    "lat": float(lat),
                    "lng": float(lng),
                }
            )

        print(f"Downloaded {len(agencies)} agencies…")
        if len(features) < page_size:
            break
        offset += page_size
        time.sleep(0.1)

    CACHE_PATH.write_text(json.dumps({"states": sorted(states), "agencies": agencies}, indent=2))
    return agencies


def score_agency(agency: dict, store: dict, county: str | None) -> tuple:
    dist = haversine_miles(store["lat"], store["lng"], agency["lat"], agency["lng"])
    type_rank = TYPE_PRIORITY.get(agency["type"].upper(), 9)
    city_match = normalize_city(agency["city"]) == normalize_city(store["city"])
    county_match = bool(
        county
        and agency["county"]
        and normalize_city(county) == normalize_city(agency["county"].replace(" County", ""))
    )
    has_phone = agency["phone"] is not None
    sheriff = "SHERIFF" in agency["name"].upper()
    # Prefer local PD in same city, then county sheriff with phone, then nearest with phone.
    return (
        0 if has_phone else 1,
        0 if city_match and type_rank <= 1 else 1,
        0 if county_match and sheriff else 1,
        type_rank,
        dist,
    )


def pick_agency(store: dict, agencies: list[dict], county: str | None) -> dict | None:
    state_agencies = [a for a in agencies if a["state"] == store["state"]]
    if not state_agencies:
        return None

    ranked = sorted(state_agencies, key=lambda a: score_agency(a, store, county))
    for agency in ranked:
        if agency["phone"]:
            return agency

    # Last resort: nearest agency even without phone, but label clearly.
    return ranked[0] if ranked else None


def title_agency(name: str) -> str:
    if not name:
        return "Local Law Enforcement"
    cleaned = re.sub(r"\s+", " ", name.strip())
    if cleaned.isupper():
        return cleaned.title().replace("'S", "'s")
    return cleaned


def main() -> None:
    stores_blob = json.loads(STORES_PATH.read_text())
    stores = [s for s in stores_blob["stores"].values() if not s.get("closed")]
    states = sorted({s["state"] for s in stores if s.get("state")})
    agencies = download_agencies(states)

    by_store: dict[str, dict] = {}
    missing_phone = 0

    for idx, store in enumerate(stores, start=1):
        county = fetch_county(store["lat"], store["lng"])
        agency = pick_agency(store, agencies, county)
        if not agency:
            continue

        phone = agency["phone"]
        if not phone:
            missing_phone += 1
            phone = "Non-emergency number unavailable — verify locally"

        by_store[store["id"]] = {
            "agencyName": title_agency(agency["name"]),
            "contactInfo": phone,
            "source": "HIFLD Local Law Enforcement Locations (DHS/CISA)",
            "agencyType": agency["type"],
            "county": county or agency.get("county") or "",
            "distanceMiles": round(
                haversine_miles(store["lat"], store["lng"], agency["lat"], agency["lng"]), 1
            ),
        }

        if idx % 25 == 0:
            print(f"Matched {idx}/{len(stores)} stores…")
            time.sleep(0.05)

    out = {
        "source": "scripts/fetch-law-enforcement.py",
        "fetchedAt": time.strftime("%Y-%m-%d"),
        "dataset": "HIFLD Local Law Enforcement Locations RAPT",
        "storeCount": len(by_store),
        "withPhone": len(by_store) - missing_phone,
        "stores": by_store,
    }
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"Saved {len(by_store)} store LE contacts → {OUT_PATH}")
    print(f"Stores with verified phone: {out['withPhone']} / {len(by_store)}")


if __name__ == "__main__":
    main()
