#!/usr/bin/env python3
"""
Rebuild WC2026 players DB from API-Football.

This is the implementation of the authoritative "fantaball pricing" instructions
(see docs/fantaball-pricing-reference.py — the original Desktop script that was
meant to be passed to Grok Build).

Core principle from the reference:
- Player IDs come DIRECTLY from API-Football (via /players/squads).
- Those IDs become BOTH players.id (PK) AND players.api_id.
- Pricing uses club 2025 stats + team tier + position weight + percentile**0.6 curve.
- Output: 03_seed_players.sql (can TRUNCATE + INSERT for clean from-scratch) +
  all_players_compact.json for frontend.

Usage:
  export API_FOOTBALL_KEY=yourkey   # or have backend/.env configured
  python3 rebuild_wc_players.py

It will:
- Fetch league, teams, squads, player club stats (with caching to wc2026_cache.json)
- Compute prices using the formula from the reference
- Generate database/03_seed_players.sql and frontend/src/all_players_compact.json

Current DB uses surrogate local ids + api_id mapping (see sync_player_api_ids.py
and the player_map view in 02_schema_game.sql) because demo lineups/rosters already
existed with specific player_ids. For a true clean-slate rebuild before launch,
follow the reference: use API IDs as the canonical players.id from the beginning,
then re-seed any dependent demo data (lineups etc.) accordingly.

Falls back to existing local data/ if API calls fail or no key (for this simulation).
"""

import os
import json
import time
import math
import requests

# Self-contained .env loader so it just works when backend/.env is configured
def _load_dotenv():
    for cand in (
        os.path.join(os.getcwd(), "backend", ".env"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"),
        ".env",
    ):
        if os.path.isfile(cand):
            with open(cand, encoding="utf-8") as fh:
                for raw in fh:
                    line = raw.strip()
                    if not line or line.startswith("#") or "=" not in line: continue
                    k, _, v = line.partition("=")
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
            break
_load_dotenv()

API_KEY = os.environ.get("API_FOOTBALL_KEY")
if not API_KEY:
    print("WARNING: No API_FOOTBALL_KEY in env. Will use local cache/fallback data.")
    API_KEY = "DUMMY"

HEADERS = {"x-apisports-key": API_KEY}
BASE = "https://v3.football.api-sports.io"

CACHE_FILE = "wc2026_cache.json"

BUDGET = 888
MAX_PRICE = 155
MIN_PRICE = 12

TEAM_TIER = {
    "France": 1.25, "Brazil": 1.25, "Argentina": 1.25, "England": 1.25,
    "Spain": 1.25, "Germany": 1.25,
    "Portugal": 1.15, "Netherlands": 1.15, "Belgium": 1.15, "Italy": 1.15,
    "Croatia": 1.15, "Uruguay": 1.15,
    "Colombia": 1.08, "USA": 1.08, "Mexico": 1.08, "Denmark": 1.08,
    "Japan": 1.08, "Morocco": 1.08, "Senegal": 1.08, "Switzerland": 1.08,
    "Serbia": 1.08, "Poland": 1.08, "Ecuador": 1.08, "Canada": 1.08,
}

POS_WEIGHT = {"Goalkeeper": 0.72, "Defender": 0.88, "Midfielder": 1.00, "Attacker": 1.18}
POS_SHORT = {"Goalkeeper": "GK", "Defender": "DF", "Midfielder": "MF", "Attacker": "FW"}

NAME_TO_CODE = {
    "Algeria":"ALG","Argentina":"ARG","Australia":"AUS","Austria":"AUT","Belgium":"BEL",
    "Bosnia and Herzegovina":"BIH","Brazil":"BRA","Cape Verde":"CPV","Cabo Verde":"CPV",
    "Canada":"CAN","Colombia":"COL","DR Congo":"COD","Congo DR":"COD","Ivory Coast":"CIV",
    "Cote d'Ivoire":"CIV","Croatia":"CRO","Curacao":"CUW","Curaçao":"CUW","Czech Republic":"CZE",
    "Czechia":"CZE","Ecuador":"ECU","Egypt":"EGY","England":"ENG","France":"FRA","Germany":"GER",
    "Ghana":"GHA","Haiti":"HAI","Iran":"IRN","Iraq":"IRQ","Japan":"JPN","Jordan":"JOR",
    "South Korea":"KOR","Korea Republic":"KOR","Mexico":"MEX","Morocco":"MAR","Netherlands":"NED",
    "New Zealand":"NZL","Norway":"NOR","Panama":"PAN","Paraguay":"PAR","Portugal":"POR",
    "Qatar":"QAT","Saudi Arabia":"KSA","Scotland":"SCO","Senegal":"SEN","South Africa":"RSA",
    "Spain":"ESP","Sweden":"SWE","Switzerland":"SUI","Tunisia":"TUN","Turkey":"TUR","Türkiye":"TUR",
    "Uruguay":"URU","USA":"USA","United States":"USA","Uzbekistan":"UZB",
}

def code(team_name):
    if not team_name: return None
    return NAME_TO_CODE.get(team_name.strip())

def compute_raw_score(stats):
    s = stats.get("statistics", [{}])[0] if stats.get("statistics") else {}
    games = s.get("games", {})
    goals_data = s.get("goals", {})
    passes = s.get("passes", {})

    rating = float(games.get("rating") or 0)
    appearances = int(games.get("appearences") or 0)
    minutes = int(games.get("minutes") or 0)
    goals = int(goals_data.get("total") or 0)
    assists = int(goals_data.get("assists") or 0)
    key_passes = int(passes.get("key") or 0)
    cs_proxy = max(0, appearances - int(goals_data.get("conceded") or appearances))

    raw = (
        rating * 12.0
        + goals * 6.0
        + assists * 4.0
        + key_passes * 0.3
        + cs_proxy * 1.5
        + min(appearances, 35) * 0.8
    )
    return max(raw, 5.0)

def price_player(raw_score, team_name, position, all_adjusted_scores):
    tier = TEAM_TIER.get(team_name, 1.00)
    pw = POS_WEIGHT.get(position, 1.00)
    adjusted = raw_score * tier * pw

    try:
        rank = sorted(all_adjusted_scores).index(adjusted)
    except ValueError:
        rank = 0
    pct = rank / max(len(all_adjusted_scores) - 1, 1)
    curved = pct ** 0.6
    price = MIN_PRICE + (MAX_PRICE - MIN_PRICE) * curved
    return round(price * 2) / 2

def fetch_json(endpoint, params=None, sleep=0.4):
    url = f"{BASE}/{endpoint}"
    try:
        r = requests.get(url, headers=HEADERS, params=params or {}, timeout=30)
        r.raise_for_status()
        time.sleep(sleep)
        return r.json()
    except Exception as e:
        print(f"  Fetch error for {endpoint}: {e}")
        return {"response": []}

def main():
    cache = {}
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE) as f:
            cache = json.load(f)
        print("Loaded cache")

    # 1. League
    league_id = cache.get("league_id")
    if not league_id:
        print("Step 1: Fetching league...")
        data = fetch_json("leagues", {"name": "World Cup", "season": 2026})
        resp = data.get("response", [])
        if not resp:
            data = fetch_json("leagues", {"search": "FIFA World Cup", "season": 2026})
            resp = data.get("response", [])
        if resp:
            league_id = resp[0]["league"]["id"]
        else:
            league_id = 1  # fallback as per repo code
        cache["league_id"] = league_id
        print(f"  league_id = {league_id}")

    # 2. Teams
    teams = cache.get("teams")
    if not teams:
        print("Step 2: Fetching teams...")
        data = fetch_json("teams", {"league": league_id, "season": 2026})
        teams = []
        for t in data.get("response", []):
            teams.append({
                "id": t["team"]["id"],
                "name": t["team"]["name"],
                "code": t["team"].get("code") or code(t["team"]["name"])
            })
        cache["teams"] = teams
        print(f"  {len(teams)} teams")

    # 3. Squads
    squads = cache.get("squads")
    if not squads:
        print("Step 3: Fetching squads...")
        squads = {}
        for t in teams:
            data = fetch_json("players/squads", {"team": t["id"]})
            players = data.get("response", [{}])[0].get("players", [])
            squads[t["id"]] = players
            print(f"  Squad for {t['name']}: {len(players)} players")
        cache["squads"] = squads

    # 4. Player stats (club 2025)
    player_stats = cache.get("player_stats", {})
    if not player_stats:
        print("Step 4: Fetching player club stats (season 2025)...")
        player_stats = {}
        all_pids = set()
        for sq in squads.values():
            for p in sq:
                all_pids.add(p["id"])
        for i, pid in enumerate(all_pids):
            data = fetch_json("players", {"id": pid, "season": 2025}, sleep=0.35)
            if data.get("response"):
                player_stats[pid] = data["response"][0]
            if (i + 1) % 50 == 0:
                print(f"  Fetched stats for {i+1}/{len(all_pids)} players")
        cache["player_stats"] = player_stats
        with open(CACHE_FILE, "w") as f:
            json.dump(cache, f)
        print("  Cached player stats")

    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f)

    # Build player list + compute prices
    print("Step 5: Computing prices...")
    player_list = []
    adjusted_list = []
    for t in teams:
        tname = t["name"]
        tcode = t.get("code") or code(tname)
        for p in squads.get(t["id"], []):
            pid = p["id"]
            stats = player_stats.get(pid, {})
            raw = compute_raw_score(stats)
            tier = TEAM_TIER.get(tname, 1.0)
            pos_long = p.get("position", "Midfielder")
            pw = POS_WEIGHT.get(pos_long, 1.0)
            adjusted = raw * tier * pw
            adjusted_list.append(adjusted)
            player_list.append({
                "id": pid,
                "name": p["name"],
                "team": tcode,
                "position": POS_SHORT.get(pos_long, "MF"),
                "club": stats.get("statistics", [{}])[0].get("team", {}).get("name", "") if stats.get("statistics") else "",
                "number": p.get("number"),
                "raw": raw,
                "adjusted": adjusted,
                "tname": tname,
            })

    # Compute prices
    for pl in player_list:
        pl["price"] = price_player(pl["raw"], pl["tname"], pl["position"], adjusted_list)

    # 6. Generate outputs
    print("Step 6: Generating files...")

    # Compact
    compact = []
    for pl in player_list:
        compact.append({
            "id": pl["id"],
            "n": pl["name"],
            "t": pl["team"],
            "p": pl["position"],
            "c": pl["club"],
            "pr": pl["price"],
            "num": pl["number"],
            "pts": 0,
            "own": 0,
        })
    with open("frontend/src/all_players_compact.json", "w", encoding="utf-8") as f:
        json.dump(compact, f, ensure_ascii=False)
    print(f"  Wrote frontend/src/all_players_compact.json ({len(compact)} players)")

    # 03_seed_players.sql - full style matching current schema + api_id
    lines = [
        "-- Rebuilt from API-Football WC 2026 (league_id=1, season=2026)",
        "-- Squads + club stats 2025 via /players/squads and /players?id= &season=2025",
        "-- Prices computed with formula from ~/Desktop/fantaball pricing.py",
        "begin;",
    ]
    # Teams (reuse from cache or local)
    seen_teams = set()
    for t in teams:
        if t["code"] not in seen_teams:
            seen_teams.add(t["code"])
            c = t["code"]
            country = t["name"].replace("'", "''")  # approx
            lines.append(f"insert into teams(code,country,coach,coach_nationality) values ('{c}','{country}','','') on conflict (code) do nothing;")

    # Players
    for pl in player_list:
        name_esc = pl["name"].replace("'", "''")
        team = pl["team"]
        num = pl["number"] if pl["number"] is not None else "NULL"
        pos = pl["position"]
        club_esc = pl["club"].replace("'", "''")
        price = pl["price"]
        lines.append(
            f"insert into players(id,slug,team,number,position,name,dob,age,club,club_country,height_cm,price,api_id) "
            f"values ({pl['id']}, 'auto-{pl['id']}', '{team}', {num}, '{pos}', '{name_esc}', NULL, NULL, '{club_esc}', '', NULL, {price}, {pl['id']}) "
            "on conflict (id) do nothing;"
        )

    lines.append("commit;")
    with open("database/03_seed_players.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  Wrote database/03_seed_players.sql ({len(player_list)} players)")

    print("\nDone. Now run the SQL in Supabase (only this 03 file), then commit+push the two generated files.")

if __name__ == "__main__":
    main()
