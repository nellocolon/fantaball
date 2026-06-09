#!/usr/bin/env python3
"""
import_stats.py — pull World Cup stats from API-Football and write to Supabase.

Populates: player_stats (per player/fixture), group_standings, bracket.
Run as a cron (Railway cron / GitHub Action) every ~30 min during the tournament,
and after each matchday for standings/bracket.

Env required:
  API_FOOTBALL_KEY        your paid API-Football key
  SUPABASE_URL            https://<ref>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY   (writes need service_role, NOT anon)
  WC_LEAGUE_ID            API-Football league id for the World Cup (default 1)
  WC_SEASON               season year (default 2026)

This is intentionally defensive: API-Football response shapes vary by plan and
endpoint, so each section is wrapped and logs instead of crashing the whole run.
"""
import os
import sys
import time
import requests

# Self-contained .env loader (run from anywhere)
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
SUPA_URL = os.environ.get("SUPABASE_URL")
SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
LEAGUE = os.environ.get("WC_LEAGUE_ID", "1")
SEASON = os.environ.get("WC_SEASON", "2026")

API_BASE = "https://v3.football.api-sports.io"
API_HDR = {"x-apisports-key": API_KEY or ""}
SUPA_HDR = {
    "apikey": SUPA_KEY or "",
    "Authorization": f"Bearer {SUPA_KEY or ''}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",  # upsert
}

# Map API-Football country names → our 3-letter codes (extend as needed).
NATION = {
    "Argentina":"ARG","Australia":"AUS","Austria":"AUT","Belgium":"BEL","Brazil":"BRA",
    "Canada":"CAN","Ivory Coast":"CIV","Cameroon":"CMR","Colombia":"COL","Cape Verde":"CPV",
    "Costa Rica":"CRC","Croatia":"CRO","Curacao":"CUW","Denmark":"DEN","Ecuador":"ECU",
    "Egypt":"EGY","England":"ENG","Spain":"ESP","France":"FRA","Germany":"GER","Ghana":"GHA",
    "Haiti":"HAI","Iran":"IRN","Iraq":"IRQ","Jamaica":"JAM","Jordan":"JOR","Japan":"JPN",
    "South-Korea":"KOR","Korea Republic":"KOR","Saudi-Arabia":"KSA","Saudi Arabia":"KSA",
    "Morocco":"MAR","Mexico":"MEX","Netherlands":"NED","Nigeria":"NGA","Norway":"NOR",
    "New-Zealand":"NZL","New Zealand":"NZL","Panama":"PAN","Paraguay":"PAR","Poland":"POL",
    "Portugal":"POR","Qatar":"QAT","South-Africa":"RSA","South Africa":"RSA","Scotland":"SCO",
    "Senegal":"SEN","Switzerland":"SUI","Tunisia":"TUN","Turkey":"TUR","Uruguay":"URU",
    "USA":"USA","United-States":"USA","United States":"USA","Uzbekistan":"UZB",
}
ROUND_ORDER = {
    "Round of 32":1, "Round of 16":2, "Quarter-finals":3, "Quarterfinals":3,
    "Semi-finals":4, "Semifinals":4, "Final":5,
}
ROUND_NAME = {
    "Round of 32":"Round of 32", "Round of 16":"Round of 16",
    "Quarter-finals":"Quarterfinals", "Quarterfinals":"Quarterfinals",
    "Semi-finals":"Semifinals", "Semifinals":"Semifinals", "Final":"Final",
}


def need_env():
    missing = [k for k, v in {
        "API_FOOTBALL_KEY": API_KEY, "SUPABASE_URL": SUPA_URL,
        "SUPABASE_SERVICE_ROLE_KEY": SUPA_KEY,
    }.items() if not v]
    if missing:
        print("Missing env:", ", ".join(missing)); sys.exit(1)


def api_get(path, **params):
    params.update(league=LEAGUE, season=SEASON)
    r = requests.get(f"{API_BASE}/{path}", headers=API_HDR, params=params, timeout=30)
    r.raise_for_status()
    return r.json().get("response", [])


def supa_upsert(table, rows, on_conflict):
    if not rows:
        return
    r = requests.post(
        f"{SUPA_URL}/rest/v1/{table}?on_conflict={on_conflict}",
        headers=SUPA_HDR, json=rows, timeout=30,
    )
    if r.status_code >= 300:
        print(f"  ! upsert {table} failed {r.status_code}: {r.text[:200]}")
    else:
        print(f"  ✓ upserted {len(rows)} → {table}")


def code(name):
    return NATION.get(name, (name or "")[:3].upper())


def sync_standings():
    print("standings…")
    try:
        resp = api_get("standings")
    except Exception as e:
        print("  ! standings fetch failed:", e); return
    rows = []
    for league in resp:
        for group in league.get("league", {}).get("standings", []):
            for t in group:
                g = (t.get("group") or "").replace("Group ", "").strip() or "?"
                alls = t.get("all", {})
                goals = alls.get("goals", {})
                rows.append({
                    "group_name": g, "team": code(t.get("team", {}).get("name")),
                    "played": alls.get("played", 0), "won": alls.get("win", 0),
                    "drawn": alls.get("draw", 0), "lost": alls.get("lose", 0),
                    "gf": goals.get("for", 0), "ga": goals.get("against", 0),
                    "points": t.get("points", 0),
                })
    supa_upsert("group_standings", rows, "group_name,team")


def sync_bracket():
    print("bracket…")
    try:
        fixtures = api_get("fixtures")
    except Exception as e:
        print("  ! fixtures fetch failed:", e); return
    rows, slot_by_round = [], {}
    for f in fixtures:
        rnd_raw = (f.get("league", {}) or {}).get("round", "")
        rnd = next((ROUND_NAME[k] for k in ROUND_NAME if k in rnd_raw), None)
        if not rnd:
            continue
        slot = slot_by_round.get(rnd, 0); slot_by_round[rnd] = slot + 1
        teams = f.get("teams", {}); goals = f.get("goals", {})
        status = (f.get("fixture", {}).get("status", {}) or {}).get("short", "")
        done = status in ("FT", "AET", "PEN")
        rows.append({
            "round": rnd, "round_order": ROUND_ORDER.get(rnd, 9), "slot": slot,
            "home": code(teams.get("home", {}).get("name")),
            "away": code(teams.get("away", {}).get("name")),
            "home_score": goals.get("home"), "away_score": goals.get("away"),
            "pens": None, "done": done,
        })
    supa_upsert("bracket", rows, "round,slot")


def sync_player_stats():
    print("player stats…")
    try:
        fixtures = api_get("fixtures")
    except Exception as e:
        print("  ! fixtures fetch failed:", e); return
    finished = [f for f in fixtures
                if (f.get("fixture", {}).get("status", {}) or {}).get("short", "") in ("FT", "AET", "PEN")]
    print(f"  {len(finished)} finished fixtures")
    batch = []
    for f in finished:
        fid = f.get("fixture", {}).get("id")
        try:
            stats = api_get("fixtures/players", fixture=fid)
        except Exception as e:
            print(f"  ! players for fixture {fid} failed:", e); continue
        for team_block in stats:
            tname = code(team_block.get("team", {}).get("name"))
            for pl in team_block.get("players", []):
                pid = str(pl.get("player", {}).get("id"))
                s = (pl.get("statistics") or [{}])[0]
                goals = (s.get("goals") or {})
                cards = (s.get("cards") or {})
                games = (s.get("games") or {})
                batch.append({
                    "player_id": pid, "fixture_id": fid,
                    "team": tname,
                    "goals": goals.get("total") or 0,
                    "assists": goals.get("assists") or 0,
                    "yellow": cards.get("yellow") or 0,
                    "red": cards.get("red") or 0,
                    "minutes": games.get("minutes") or 0,
                    "rating": float(games["rating"]) if games.get("rating") else None,
                })
        time.sleep(0.2)  # be gentle on rate limit
    supa_upsert("player_stats", batch, "player_id,fixture_id")


if __name__ == "__main__":
    need_env()
    print(f"Fantaball stats import · league={LEAGUE} season={SEASON}")
    sync_standings()
    sync_bracket()
    sync_player_stats()
    print("done.")
