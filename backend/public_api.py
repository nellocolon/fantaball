"""
public_api.py — public, read-only API for Fantaball.

Powers two things, with NO auth required:
  1. GO bounty verification (a user's gameweek score + leaderboard rank), so
     pump.fun reviewers can confirm a submission against a public link.
  2. The live stream overlay (stream/overlay.html) via /public/stream/state.

Connects to Supabase over its REST (PostgREST) API using the same env vars as
calc_gameweek.py:  SUPABASE_URL, SUPABASE_KEY  (use the anon key — these are
public reads bound by RLS; the public_leaderboard view exposes no PII).

Run locally:   uvicorn public_api:app --reload --port 8000
Deploy:        see backend/README.md (Railway / any ASGI host)
"""

import os
import requests
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


def load_dotenv(path=None):
    if path is None:
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))


load_dotenv()

SUPA_URL = os.environ.get("SUPABASE_URL")
SUPA_KEY = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
HDR = {
    "apikey": SUPA_KEY or "",
    "Authorization": f"Bearer {SUPA_KEY or ''}",
}

app = FastAPI(title="Fantaball Public API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # public reads, open in a browser
    allow_methods=["GET"],
    allow_headers=["*"],
)


def supa_get(table, query):
    """GET a PostgREST table/view. Returns a list of rows (possibly empty)."""
    if not SUPA_URL or not SUPA_KEY:
        raise HTTPException(503, "Backend not configured (set SUPABASE_URL / SUPABASE_KEY)")
    r = requests.get(f"{SUPA_URL}/rest/v1/{table}?{query}", headers=HDR, timeout=20)
    if r.status_code >= 300:
        raise HTTPException(502, f"DB error: {r.status_code}")
    return r.json()


@app.get("/health")
def health():
    return {"ok": True, "configured": bool(SUPA_URL and SUPA_KEY)}


@app.get("/public/user/{handle}/gameweek/{gw}")
def matchday_score(handle: str, gw: int):
    """A user's score for a gameweek. Verifies 'Man of the Matchday' & co.

    public_leaderboard exposes x_handle, gameweek_id, total_points,
    captain_points, rank (computed). We read the row for this handle + gw.
    """
    rows = supa_get(
        "public_leaderboard",
        f"x_handle=eq.{handle}&gameweek_id=eq.{gw}"
        f"&select=x_handle,display_name,gameweek_id,total_points,captain_points,rank",
    )
    if not rows:
        raise HTTPException(404, "No score for that handle/gameweek")
    row = rows[0]
    return {
        "handle": row["x_handle"],
        "display_name": row.get("display_name"),
        "gameweek": row["gameweek_id"],
        "total_points": row["total_points"],
        "captain_points": row["captain_points"],
        "rank": row["rank"],
    }


@app.get("/public/user/{handle}/rank")
def leaderboard_position(handle: str, threshold: int = 100):
    """A user's current (latest-gameweek) leaderboard position."""
    rows = supa_get(
        "public_leaderboard",
        f"x_handle=eq.{handle}"
        f"&select=x_handle,gameweek_id,total_points,rank"
        f"&order=gameweek_id.desc&limit=1",
    )
    if not rows:
        raise HTTPException(404, "Handle not on the leaderboard")
    row = rows[0]
    return {
        "handle": row["x_handle"],
        "position": row["rank"],
        "total_points": row["total_points"],
        "gameweek": row["gameweek_id"],
        "below_threshold": (row["rank"] is not None and row["rank"] > threshold),
    }


@app.get("/public/matchday/{gw}/top")
def matchday_leaders(gw: int, limit: int = 10):
    """Top scorers of a gameweek — anyone can confirm the matchday winner."""
    rows = supa_get(
        "public_leaderboard",
        f"gameweek_id=eq.{gw}"
        f"&select=x_handle,display_name,total_points,rank"
        f"&order=rank.asc&limit={max(1, min(limit, 100))}",
    )
    return {"gameweek": gw, "limit": limit, "leaders": rows}


@app.get("/public/leaderboard")
def full_leaderboard(gw: Optional[int] = None, limit: int = 100):
    """Top-N leaderboard. If gw omitted, uses the latest gameweek present."""
    if gw is None:
        latest = supa_get("public_leaderboard",
                          "select=gameweek_id&order=gameweek_id.desc&limit=1")
        if not latest:
            return {"gameweek": None, "rows": []}
        gw = latest[0]["gameweek_id"]
    rows = supa_get(
        "public_leaderboard",
        f"gameweek_id=eq.{gw}"
        f"&select=x_handle,display_name,total_points,captain_points,rank"
        f"&order=rank.asc&limit={max(1, min(limit, 200))}",
    )
    return {"gameweek": gw, "rows": rows}


@app.get("/public/fixtures")
def list_fixtures():
    """All fixtures from the fixtures table, ordered by kickoff_time.

    Public endpoint for schedule, results, and overlays. No auth required.
    """
    rows = supa_get(
        "fixtures",
        "select=id,gameweek_id,home_team,away_team,kickoff_at,venue,status,home_goals,away_goals"
        "&order=kickoff_at.asc",
    )
    return [
        {
            "id": r["id"],
            "gameweek_id": r["gameweek_id"],
            "home_team": r.get("home_team"),
            "away_team": r.get("away_team"),
            "kickoff_time": r.get("kickoff_at"),
            "status": r.get("status"),
            "home_score": r.get("home_goals"),
            "away_score": r.get("away_goals"),
            "venue": r.get("venue"),
        }
        for r in rows
    ]


@app.get("/public/stream/state")
def stream_state():
    """Aggregated snapshot for the live stream overlay.

    Counts come from simple aggregates; on-chain fields (mcap/vol/holders/
    price) and the SOL pool are filled by the on-chain reader job when wired.
    `owns` = top-50 most-owned players, descending.
    """
    out = {
        "coaches": None, "squads": None, "pool": None,
        "mcap": None, "vol": None, "holders": None, "price": None,
        "locked": None,  # SOL locked in the pool wallet for the Final
        "owns": [], "caps": [], "recent_shares": [], "locks": [],
    }
    if not (SUPA_URL and SUPA_KEY):
        out["note"] = "backend not configured"
        return out

    # coaches = users count, squads = rosters count (HEAD + Content-Range)
    def count(table):
        r = requests.get(
            f"{SUPA_URL}/rest/v1/{table}?select=id",
            headers={**HDR, "Prefer": "count=exact", "Range": "0-0"},
            timeout=20,
        )
        cr = r.headers.get("content-range", "")
        return int(cr.split("/")[-1]) if "/" in cr else None

    try:
        out["coaches"] = count("users")
        out["squads"] = count("rosters")
    except Exception:
        pass

    # top-50 most-owned: count active roster_players per player.
    # Prefer a SQL view `most_owned` if present; otherwise leave empty for the
    # overlay's demo engine. (Creating the view is a small migration.)
    try:
        owns = supa_get("most_owned", "select=name,owned&order=owned.desc&limit=50")
        out["owns"] = [{"n": r["name"], "c": r["owned"]} for r in owns]
    except HTTPException:
        pass

    return out


# ─── STATS (World Cup) ──────────────────────────────────────────────────────
# These read aggregated views populated by import_stats.py:
#   player_stats_agg(player_id, name, team, club, goals, assists, yellow, red, gw)
#   group_standings(group_name, team, played, won, drawn, lost, gf, ga, points)
#   bracket(round, slot, home, away, home_score, away_score, pens, done)

def _stat_rows(metric, gw, nation, limit):
    q = f"select=player_id,name,team,club,{metric}&{metric}=gt.0&order={metric}.desc&limit={limit}"
    if gw:
        q += f"&gw=eq.{gw}"
    if nation:
        q += f"&team=eq.{nation}"
    try:
        return supa_get("player_stats_agg", q)
    except HTTPException:
        return []


@app.get("/public/stats/scorers")
def stats_scorers(gw: Optional[int] = None, nation: Optional[str] = None, limit: int = 50):
    rows = _stat_rows("goals", gw, nation, limit)
    return [{"player_id": r["player_id"], "name": r["name"], "team": r["team"],
             "club": r.get("club"), "value": r["goals"]} for r in rows]


@app.get("/public/stats/assists")
def stats_assists(gw: Optional[int] = None, nation: Optional[str] = None, limit: int = 50):
    rows = _stat_rows("assists", gw, nation, limit)
    return [{"player_id": r["player_id"], "name": r["name"], "team": r["team"],
             "club": r.get("club"), "value": r["assists"]} for r in rows]


@app.get("/public/stats/cards")
def stats_cards(gw: Optional[int] = None, nation: Optional[str] = None,
                type: Optional[str] = None, limit: int = 50):
    metric = "red" if type == "red" else "yellow"
    q = f"select=player_id,name,team,club,yellow,red&{metric}=gt.0&order={metric}.desc&limit={limit}"
    if gw:
        q += f"&gw=eq.{gw}"
    if nation:
        q += f"&team=eq.{nation}"
    try:
        rows = supa_get("player_stats_agg", q)
    except HTTPException:
        rows = []
    return [{"player_id": r["player_id"], "name": r["name"], "team": r["team"],
             "club": r.get("club"), "yellow": r.get("yellow", 0), "red": r.get("red", 0)} for r in rows]


@app.get("/public/standings")
def standings():
    """Group standings keyed by group letter, each a sorted list of teams."""
    try:
        rows = supa_get("group_standings",
                        "select=group_name,team,played,won,drawn,lost,gf,ga,points"
                        "&order=group_name.asc,points.desc,gf.desc")
    except HTTPException:
        return {}
    out = {}
    for r in rows:
        out.setdefault(r["group_name"], []).append({
            "team": r["team"], "played": r["played"], "won": r["won"],
            "drawn": r["drawn"], "lost": r["lost"], "gf": r["gf"], "ga": r["ga"],
            "points": r["points"],
        })
    return out


@app.get("/public/bracket")
def bracket():
    """Knockout bracket keyed by round name, in slot order."""
    try:
        rows = supa_get("bracket",
                        "select=round,slot,home,away,home_score,away_score,pens,done"
                        "&order=round_order.asc,slot.asc")
    except HTTPException:
        return {}
    out = {}
    for r in rows:
        out.setdefault(r["round"], []).append({
            "home": r["home"], "away": r["away"],
            "home_score": r["home_score"], "away_score": r["away_score"],
            "pens": r.get("pens"), "done": r.get("done", False),
        })
    return out


@app.get("/public/bounties")
def bounties():
    """pump.fun GO bounties for the Quests tab. go_url empty => SOON; active+go_url => ENTER."""
    try:
        rows = supa_get("bounties",
                        "select=id,cat,title,descr,reward_sol,deliver,go_url,active,sort_order"
                        "&order=sort_order.asc")
    except HTTPException:
        return []
    return [{
        "id": r["id"], "cat": r["cat"], "title": r["title"], "descr": r.get("descr"),
        "reward_sol": float(r["reward_sol"]) if r.get("reward_sol") is not None else 0,
        "deliver": r.get("deliver"), "go_url": r.get("go_url"),
        "active": bool(r.get("active")) and bool(r.get("go_url")),
    } for r in rows]
