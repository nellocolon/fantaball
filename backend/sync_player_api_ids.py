#!/usr/bin/env python3
"""
sync_player_api_ids.py — Abbina i giocatori del DB locale con gli id di API-Football
e popola la colonna players.api_id (così la vista player_map diventa utilizzabile da calc_gameweek.py).

Uso:
  python backend/sync_player_api_ids.py [--dry-run]

Richiede: API_FOOTBALL_KEY e credenziali Supabase nel backend/.env (o esportate).
Il loader .env è incluso (come in public_api.py).

Strategia di match:
- Normalizza nomi (accenti rimossi, upper, cognome o "iniziale cognome").
- Chiave (norm_name, team_code) .
- Alta coverage attesa per le rose WC2026.
"""
from __future__ import annotations
import os
import sys
import time
import re
import unicodedata
import json
import requests

# ----------------- .env loader (self-contained) -----------------
def load_backend_dotenv():
    candidates = [
        os.path.join(os.getcwd(), "backend", ".env"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"),
        ".env",
    ]
    for p in candidates:
        if os.path.isfile(p):
            with open(p, encoding="utf-8") as fh:
                for raw in fh:
                    line = raw.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    k, _, v = line.partition("=")
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
            return True
    return False

load_backend_dotenv()

API_KEY = os.environ.get("API_FOOTBALL_KEY")
SUPA_URL = os.environ.get("SUPABASE_URL")
SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

API_BASE = "https://v3.football.api-sports.io"
API_HDR = {"x-apisports-key": API_KEY or ""}
SUPA_HDR = {
    "apikey": SUPA_KEY or "",
    "Authorization": f"Bearer {SUPA_KEY or ''}",
    "Content-Type": "application/json",
}

CACHE_FILE = "wc2026_squads_cache.json"

# Mappa nomi API -> nostri codici 3 lettere (completa, da import_fixtures.py + varianti viste)
NAME_TO_CODE = {
    "Algeria":"ALG","Argentina":"ARG","Australia":"AUS","Austria":"AUT","Belgium":"BEL",
    "Bosnia and Herzegovina":"BIH","Bosnia & Herzegovina":"BIH","Brazil":"BRA",
    "Cape Verde":"CPV","Cabo Verde":"CPV","Canada":"CAN","Colombia":"COL",
    "DR Congo":"COD","Congo DR":"COD","Congo":"COD",
    "Costa Rica":"CRC","Croatia":"CRO","Curacao":"CUW","Curaçao":"CUW","Curaçao":"CUW",
    "Czech Republic":"CZE","Czechia":"CZE","Denmark":"DEN","Ecuador":"ECU","Egypt":"EGY",
    "England":"ENG","France":"FRA","Germany":"GER","Ghana":"GHA","Haiti":"HAI",
    "Iran":"IRN","Iraq":"IRQ","Ivory Coast":"CIV","Cote d'Ivoire":"CIV","Côte d'Ivoire":"CIV",
    "Jamaica":"JAM","Japan":"JPN","Jordan":"JOR","South Korea":"KOR","Korea Republic":"KOR",
    "Saudi Arabia":"KSA","Saudi-Arabia":"KSA","Mexico":"MEX","Morocco":"MAR",
    "Netherlands":"NED","New Zealand":"NZL","Nigeria":"NGA","Norway":"NOR",
    "Panama":"PAN","Paraguay":"PAR","Poland":"POL","Portugal":"POR","Qatar":"QAT",
    "South Africa":"RSA","South-Africa":"RSA","Scotland":"SCO","Senegal":"SEN",
    "Spain":"ESP","Sweden":"SWE","Switzerland":"SUI","Tunisia":"TUN",
    "Turkey":"TUR","Türkiye":"TUR","Uruguay":"URU","USA":"USA","United States":"USA",
    "United-States":"USA","Uzbekistan":"UZB",
}

def code(name: str) -> str | None:
    if not name:
        return None
    n = name.strip()
    if n in NAME_TO_CODE:
        return NAME_TO_CODE[n]
    # try case-insensitive and partial contains for long names
    nu = n.upper()
    for k, v in NAME_TO_CODE.items():
        if k.upper() == nu or k.upper() in nu or nu in k.upper():
            return v
    return None

def norm(s: str) -> str:
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^A-Za-z0-9 ]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip().upper()
    return s

def name_keys(full: str) -> list[str]:
    """Ritorna varianti utili per lookup: cognome, 'iniziale cognome', full norm."""
    n = norm(full)
    if not n:
        return []
    parts = n.split()
    if not parts:
        return []
    surname = parts[-1]
    variants = {surname}
    if len(parts) >= 2:
        variants.add(f"{parts[0]} {surname}")
        variants.add(" ".join(parts))
    return list(variants)

def supa_update_player_api_id(player_id: int, api_id: int):
    url = f"{SUPA_URL}/rest/v1/players?id=eq.{player_id}"
    for attempt in range(3):
        try:
            r = requests.patch(url, headers=SUPA_HDR, json={"api_id": api_id}, timeout=20)
            if r.status_code == 409 or "duplicate key" in (r.text or ""):
                # already assigned to a different local row (collision) or race; skip
                return False
            if r.status_code >= 300:
                print(f"  ! update player {player_id} -> {api_id} failed: {r.status_code} {r.text[:120]}")
                time.sleep(0.5 * (attempt + 1))
                continue
            return True
        except requests.RequestException as e:
            print(f"  ! network error (attempt {attempt+1}) for player {player_id}: {e}")
            time.sleep(1.0 * (attempt + 1))
    return False

def fetch_squads():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE) as f:
            cached = json.load(f)
            if cached.get("squads"):
                print(f"Loaded squads from cache ({CACHE_FILE})")
                return cached["squads"]

    print("Fetching WC2026 teams (league=1, season=2026)...")
    r = requests.get(f"{API_BASE}/teams", headers=API_HDR, params={"league": 1, "season": 2026}, timeout=30)
    r.raise_for_status()
    teams = r.json().get("response", [])
    print(f"  {len(teams)} teams")

    squads = {}
    for i, t in enumerate(teams):
        tid = t["team"]["id"]
        tname = t["team"]["name"]
        c = code(tname) or (t["team"].get("code") or "")[:3].upper()
        try:
            rs = requests.get(f"{API_BASE}/players/squads", headers=API_HDR, params={"team": tid}, timeout=25)
            rs.raise_for_status()
            pls = rs.json().get("response", [{}])[0].get("players", [])
            squads[c] = [{"id": p["id"], "name": p["name"], "pos": p.get("position")} for p in pls]
            print(f"  [{i+1}/{len(teams)}] {tname} ({c}): {len(pls)}")
        except Exception as e:
            print(f"  ! squad {tname}: {e}")
        time.sleep(0.25)
    with open(CACHE_FILE, "w") as f:
        json.dump({"squads": squads}, f)
    print(f"Cached squads to {CACHE_FILE}")
    return squads

def main(dry_run: bool = False):
    if not (API_KEY and SUPA_URL and SUPA_KEY):
        sys.exit("Mancano API_FOOTBALL_KEY / SUPABASE_URL / SUPABASE_*_KEY in env o backend/.env")

    squads = fetch_squads()

    # Build lookup: (norm_key, team_code) -> api_id
    lookup = {}
    for tcode, plist in squads.items():
        for p in plist:
            for k in name_keys(p["name"]):
                lookup[(k, tcode)] = p["id"]

    print(f"Lookup size: {len(lookup)} keys")

    # Fetch our players without api_id (or all; we'll update only if found)
    print("Fetching players from Supabase...")
    # We can't easily filter count, fetch in pages
    players = []
    for offset in range(0, 2000, 200):
        q = f"select=id,name,team,position,api_id&offset={offset}&limit=200"
        r = requests.get(f"{SUPA_URL}/rest/v1/players?{q}", headers=SUPA_HDR, timeout=30)
        if r.status_code >= 300:
            print("  ! players fetch failed", r.status_code); break
        batch = r.json()
        if not batch: break
        players.extend(batch)
    print(f"  {len(players)} players total")

    to_update = []
    matched = 0
    for pl in players:
        if pl.get("api_id"):
            continue  # already mapped
        tcode = pl.get("team")
        if not tcode:
            continue
        variants = name_keys(pl.get("name", ""))
        found = None
        for v in variants:
            found = lookup.get((v, tcode))
            if found:
                break
        if found:
            to_update.append((pl["id"], found, pl["name"], tcode))
            matched += 1

    print(f"\nMatched {matched} / {len([p for p in players if not p.get('api_id')])} players without api_id")
    if not to_update:
        print("Nothing to do.")
        return

    print("Sample matches:")
    for pid, aid, nm, tc in to_update[:6]:
        print(f"  local {pid} ({nm}/{tc}) -> api {aid}")

    if dry_run:
        print("\n--dry-run: no updates performed.")
        return

    print("\nApplying updates to Supabase...")
    ok = 0
    skipped = 0
    for pid, aid, nm, tc in to_update:
        try:
            if supa_update_player_api_id(pid, aid):
                ok += 1
            else:
                skipped += 1
        except Exception as e:
            print(f"  ! exception updating {pid}: {e}")
            skipped += 1
        time.sleep(0.02)
        if (ok + skipped) % 150 == 0:
            print(f"  ... {ok} updated, {skipped} skipped")
    print(f"Done. Updated {ok} players with api_id (skipped {skipped}).")

    # Quick verification
    r = requests.get(f"{SUPA_URL}/rest/v1/player_map?select=count()&limit=1", headers=SUPA_HDR, timeout=15)
    # can't count easily, just sample
    pm = requests.get(f"{SUPA_URL}/rest/v1/player_map?select=*&limit=3", headers=SUPA_HDR, timeout=15).json()
    print(f"player_map view sample after sync: {pm}")

if __name__ == "__main__":
    dry = "--dry-run" in sys.argv or "-n" in sys.argv
    main(dry_run=dry)
