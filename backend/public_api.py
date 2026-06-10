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
import time
import requests
from typing import Optional
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Header, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


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
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
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


# ─── DB WRITE HELPERS ──────────────────────────────────────────────────────

def supa_insert(table: str, data, *, returning: bool = False):
    """INSERT one or more rows via PostgREST. Returns rows only if returning=True."""
    if not SUPA_URL or not SUPA_KEY:
        raise HTTPException(503, "Backend not configured (set SUPABASE_URL / SUPABASE_KEY)")
    prefer = "return=representation" if returning else "return=minimal"
    h = {**HDR, "Content-Type": "application/json", "Prefer": prefer}
    r = requests.post(f"{SUPA_URL}/rest/v1/{table}", headers=h, json=data, timeout=20)
    if r.status_code >= 300:
        raise HTTPException(502, f"DB insert error ({table}): {r.status_code} {r.text[:300]}")
    return r.json() if returning else None


def supa_upsert_row(table: str, data: dict, on_conflict: str):
    """Upsert a single dict; merge-duplicates, no rows returned."""
    if not SUPA_URL or not SUPA_KEY:
        raise HTTPException(503, "Backend not configured (set SUPABASE_URL / SUPABASE_KEY)")
    h = {**HDR, "Content-Type": "application/json",
         "Prefer": "resolution=merge-duplicates,return=minimal"}
    r = requests.post(
        f"{SUPA_URL}/rest/v1/{table}?on_conflict={on_conflict}",
        headers=h, json=data, timeout=20,
    )
    if r.status_code >= 300:
        raise HTTPException(502, f"DB upsert error ({table}): {r.status_code} {r.text[:300]}")


def supa_patch(table: str, query: str, data: dict):
    """PATCH (update) rows matching the PostgREST query string."""
    if not SUPA_URL or not SUPA_KEY:
        raise HTTPException(503, "Backend not configured (set SUPABASE_URL / SUPABASE_KEY)")
    h = {**HDR, "Content-Type": "application/json", "Prefer": "return=minimal"}
    r = requests.patch(f"{SUPA_URL}/rest/v1/{table}?{query}", headers=h, json=data, timeout=20)
    if r.status_code >= 300:
        raise HTTPException(502, f"DB patch error ({table}): {r.status_code} {r.text[:300]}")


def supa_delete(table: str, query: str):
    """DELETE rows matching the PostgREST query string."""
    if not SUPA_URL or not SUPA_KEY:
        raise HTTPException(503, "Backend not configured (set SUPABASE_URL / SUPABASE_KEY)")
    r = requests.delete(f"{SUPA_URL}/rest/v1/{table}?{query}", headers=HDR, timeout=20)
    if r.status_code >= 300:
        raise HTTPException(502, f"DB delete error ({table}): {r.status_code} {r.text[:300]}")


# ─── AUTH (Supabase JWT — ES256 / JWKS) ──────────────────────────────────
#
# Supabase projects with asymmetric signing (ECC P-256) issue ES256 tokens.
# We verify them against the public keys published at:
#   {SUPABASE_URL}/auth/v1/.well-known/jwks.json
# Keys are cached in-process for 1 hour (they rarely rotate).
# No SUPABASE_JWT_SECRET needed.

from jose import jwt as _jose_jwt, JWTError as _JWTError

_jwks_cache: dict = {"keys": [], "fetched_at": 0.0}
_JWKS_TTL = 3600  # seconds


def _jwks_url() -> str:
    if not SUPA_URL:
        raise HTTPException(503, "SUPABASE_URL not configured")
    return f"{SUPA_URL}/auth/v1/.well-known/jwks.json"


def _get_jwks_keys() -> list[dict]:
    now = time.time()
    if _jwks_cache["keys"] and now - _jwks_cache["fetched_at"] < _JWKS_TTL:
        return _jwks_cache["keys"]
    try:
        resp = requests.get(_jwks_url(), timeout=10)
        resp.raise_for_status()
        keys = resp.json().get("keys", [])
    except Exception as exc:
        if _jwks_cache["keys"]:
            return _jwks_cache["keys"]  # serve stale cache on transient error
        raise HTTPException(503, f"Cannot fetch JWKS from Supabase: {exc}")
    _jwks_cache["keys"] = keys
    _jwks_cache["fetched_at"] = now
    return keys


def require_user(authorization: str = Header(None)) -> dict:
    """
    FastAPI dependency — validates the Supabase JWT (ES256) from the
    Authorization header.  Returns the decoded payload.
    payload['sub'] == auth.uid() == users.id (UUID string).
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authorization header missing or malformed")
    token = authorization[7:]

    try:
        header = _jose_jwt.get_unverified_header(token)
    except Exception as exc:
        raise HTTPException(401, f"Malformed token header: {exc}")

    kid = header.get("kid")
    alg = header.get("alg", "ES256")

    keys = _get_jwks_keys()
    # Prefer the key matching 'kid'; fall back to trying all keys.
    candidates = [k for k in keys if not kid or k.get("kid") == kid] or keys
    if not candidates:
        raise HTTPException(503, "No JWKS keys available for verification")

    last_exc: Exception = Exception("no keys tried")
    for key_dict in candidates:
        try:
            payload = _jose_jwt.decode(
                token,
                key_dict,
                algorithms=[alg],
                audience="authenticated",
            )
            return payload
        except _JWTError as exc:
            last_exc = exc

    raise HTTPException(401, f"Token verification failed: {last_exc}")


def _ensure_user(user_id: str, jwt_payload: dict):
    """
    Defensive upsert of the users row before any roster write.
    - Normal case (row exists): merge-duplicates → no-op.
    - Fallback case (row missing, auth.js failed): inserts a minimal row
      so the FK rosters.user_id → users.id never breaks.
    Uses service_role key → bypasses RLS.
    """
    meta = jwt_payload.get("user_metadata") or {}
    row: dict = {"id": user_id}
    dn = meta.get("full_name") or meta.get("name")
    xh = meta.get("preferred_username") or meta.get("user_name")
    if dn:
        row["display_name"] = str(dn)
    if xh:
        row["x_handle"] = str(xh).lstrip("@")
    supa_upsert_row("users", row, on_conflict="id")


# ─── /me ROUTER ───────────────────────────────────────────────────────────

_REQUIRED = {"GK": 2, "DF": 5, "MF": 6, "FW": 3}
_BUDGET_CAP = 700.0

me_router = APIRouter(prefix="/me", tags=["user"])


class RosterBody(BaseModel):
    players: list[int]          # exactly 16 player IDs
    name: Optional[str] = None  # optional team name


@me_router.post("/roster", status_code=201)
def create_roster(body: RosterBody, jwt_payload: dict = Depends(require_user)):
    """
    Create or replace the user's 16-player squad.

    Validates:
      - Exactly 16 distinct player IDs
      - Composition: 2 GK / 5 DF / 6 MF / 3 FW
      - sum(price) <= 700

    Idempotent: re-submitting before GW1 lock replaces the existing squad.
    Transfers/market windows are handled separately (deferred to post-launch).
    """
    user_id: str = jwt_payload["sub"]

    # ── 1. Basic list validation ──────────────────────────────────────────
    if len(body.players) != 16:
        raise HTTPException(
            422,
            f"Rosa deve contenere esattamente 16 giocatori ({len(body.players)} ricevuti)",
        )
    if len(set(body.players)) != 16:
        raise HTTPException(422, "La rosa contiene giocatori duplicati")

    # ── 2. Reject if GW1 is already locked (rosa immutabile dopo il kickoff) ──
    gw1_rows = supa_get("gameweeks", "id=eq.1&select=locks_at")
    if gw1_rows:
        locks_at_str = gw1_rows[0].get("locks_at")
        if locks_at_str:
            lock_dt = datetime.fromisoformat(locks_at_str.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) >= lock_dt:
                raise HTTPException(
                    409,
                    "Il torneo è iniziato: la rosa non è più modificabile "
                    "(GW1 bloccata). I trasferimenti sono gestiti nelle finestre di mercato.",
                )

    # ── 3. Ensure users row exists (defensive) ────────────────────────────
    _ensure_user(user_id, jwt_payload)

    # ── 4. Fetch players from DB ──────────────────────────────────────────
    ids_qs = ",".join(str(pid) for pid in body.players)
    db_players = supa_get("players", f"id=in.({ids_qs})&select=id,position,price")
    found = {r["id"]: r for r in db_players}

    missing = [pid for pid in body.players if pid not in found]
    if missing:
        raise HTTPException(422, f"Giocatori non trovati nel database: {missing}")

    # ── 5. Composition check ──────────────────────────────────────────────
    counts: dict[str, int] = {"GK": 0, "DF": 0, "MF": 0, "FW": 0}
    for pid in body.players:
        counts[found[pid]["position"]] += 1

    if counts != _REQUIRED:
        detail = ", ".join(
            f"{pos}: {counts.get(pos, 0)} (richiesti {req})"
            for pos, req in _REQUIRED.items()
        )
        raise HTTPException(422, f"Composizione non valida — {detail}")

    # ── 6. Budget check ───────────────────────────────────────────────────
    total_price = round(sum(float(found[pid]["price"]) for pid in body.players), 1)
    if total_price > _BUDGET_CAP:
        raise HTTPException(422, f"Budget superato: {total_price} > {_BUDGET_CAP}")

    # ── 7. Create or replace the roster row ──────────────────────────────
    existing = supa_get("rosters", f"user_id=eq.{user_id}&select=id")

    if existing:
        roster_id: str = existing[0]["id"]
        supa_delete("roster_players", f"roster_id=eq.{roster_id}&active=eq.true")
        supa_patch("rosters", f"id=eq.{roster_id}", {
            "name": body.name or "La mia rosa",
            "budget_spent": total_price,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
    else:
        rows = supa_insert(
            "rosters",
            {
                "user_id": user_id,
                "name": body.name or "La mia rosa",
                "budget_cap": _BUDGET_CAP,
                "budget_spent": total_price,
            },
            returning=True,
        )
        roster_id = rows[0]["id"]

    # ── 8. Upsert the 16 roster_players ─────────────────────────────────
    # Upsert on (roster_id, player_id, active) so that concurrent calls
    # (useEffect + SAVE button) don't crash with a duplicate-key 502.
    player_rows = [
        {
            "roster_id": roster_id,
            "player_id": pid,
            "price_paid": float(found[pid]["price"]),
            "acquired_gw": 1,
            "active": True,
        }
        for pid in body.players
    ]
    h_ups = {**HDR, "Content-Type": "application/json",
             "Prefer": "resolution=merge-duplicates,return=minimal"}
    r_ups = requests.post(
        f"{SUPA_URL}/rest/v1/roster_players?on_conflict=roster_id,player_id,active",
        headers=h_ups, json=player_rows, timeout=30,
    )
    if r_ups.status_code >= 300:
        raise HTTPException(
            409 if r_ups.status_code == 409 else 502,
            f"Failed to save players ({r_ups.status_code}): {r_ups.text[:200]}",
        )

    return {
        "roster_id": roster_id,
        "budget_spent": total_price,
        "budget_remaining": round(_BUDGET_CAP - total_price, 1),
        "players": [
            {
                "player_id": pid,
                "position": found[pid]["position"],
                "price_paid": float(found[pid]["price"]),
            }
            for pid in body.players
        ],
    }


class StarterItem(BaseModel):
    player_id: int
    is_captain: bool = False
    is_vice: bool = False


class SubItem(BaseModel):
    player_id: int
    bench_order: int  # 1, 2 o 3 — ordine di subentro


class LineupBody(BaseModel):
    starters: list[StarterItem]  # esattamente 11
    subs: list[SubItem]          # esattamente 3, bench_order in {1,2,3}
    # I 2 "non convocati" vengono inferiti dal server (roster − starters − subs)


_STARTER_MIN = {"GK": 1, "DF": 3, "MF": 2, "FW": 1}
_STARTER_MAX = {"GK": 1, "DF": 5, "MF": 5, "FW": 3}


@me_router.post("/lineup/{gw}", status_code=201)
def submit_lineup(gw: int, body: LineupBody, jwt_payload: dict = Depends(require_user)):
    """
    Save the user's lineup for a gameweek.

    Starters : exactly 11, one is_captain, one is_vice.
               Formation: 1 GK, 3-5 DF, 2-5 MF, 1-3 FW.
    Subs     : exactly 3, bench_order must be exactly {1, 2, 3}.
    Unselected: the remaining 2 roster players — inferred by the server.

    All 14 explicit players must be in the user's active roster.
    Rejected if the GW is already locked.
    Idempotent: re-submitting replaces the previous lineup.
    """
    user_id: str = jwt_payload["sub"]

    # ── 1. Fetch GW — check lock ──────────────────────────────────────────
    gws = supa_get("gameweeks", f"id=eq.{gw}&select=id,locks_at")
    if not gws:
        raise HTTPException(404, f"Gameweek {gw} non trovata")
    locks_at = gws[0].get("locks_at")
    if locks_at:
        lock_dt = datetime.fromisoformat(locks_at.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) >= lock_dt:
            raise HTTPException(
                409,
                f"GW{gw} è bloccata (locks_at: {locks_at}). Formazione non modificabile.",
            )

    # ── 2. Fetch user's roster ────────────────────────────────────────────
    rosters = supa_get("rosters", f"user_id=eq.{user_id}&select=id")
    if not rosters:
        raise HTTPException(404, "Devi prima creare la rosa (POST /me/roster)")
    roster_id: str = rosters[0]["id"]

    # ── 3. Basic counts & uniqueness ─────────────────────────────────────
    if len(body.starters) != 11:
        raise HTTPException(
            422, f"Servono esattamente 11 titolari ({len(body.starters)} ricevuti)"
        )
    if len(body.subs) != 3:
        raise HTTPException(
            422, f"Servono esattamente 3 sostituti ({len(body.subs)} ricevuti)"
        )

    explicit_ids = [s.player_id for s in body.starters] + [b.player_id for b in body.subs]
    if len(set(explicit_ids)) != len(explicit_ids):
        raise HTTPException(422, "La formazione contiene giocatori duplicati")

    # ── 4. Capitano / vice ────────────────────────────────────────────────
    captains = [s for s in body.starters if s.is_captain]
    vices    = [s for s in body.starters if s.is_vice]
    if len(captains) != 1:
        raise HTTPException(
            422, f"Serve esattamente 1 capitano tra i titolari ({len(captains)} trovati)"
        )
    if len(vices) != 1:
        raise HTTPException(
            422, f"Serve esattamente 1 vice-capitano tra i titolari ({len(vices)} trovati)"
        )
    if captains[0].player_id == vices[0].player_id:
        raise HTTPException(422, "Capitano e vice-capitano devono essere giocatori diversi")

    # ── 5. bench_order must be exactly {1, 2, 3} ─────────────────────────
    bench_orders = sorted(b.bench_order for b in body.subs)
    if bench_orders != [1, 2, 3]:
        raise HTTPException(
            422,
            f"I bench_order dei 3 sostituti devono essere esattamente 1, 2 e 3 "
            f"(ricevuti: {bench_orders})"
        )

    # ── 6. Fetch all 16 active roster players + positions ─────────────────
    rp_rows = supa_get(
        "roster_players",
        f"roster_id=eq.{roster_id}&active=eq.true&select=player_id,players(position)",
    )
    roster_map: dict[int, str] = {}
    for rp in rp_rows:
        pid = rp["player_id"]
        emb = rp.get("players")
        pos = (emb.get("position") if isinstance(emb, dict) else None) or ""
        roster_map[pid] = pos

    if len(roster_map) != 16:
        raise HTTPException(
            409,
            f"La rosa attiva ha {len(roster_map)} giocatori (attesi 16). "
            "Completa prima la rosa (POST /me/roster).",
        )

    not_in_roster = [pid for pid in explicit_ids if pid not in roster_map]
    if not_in_roster:
        raise HTTPException(422, f"Giocatori non nella rosa attiva: {not_in_roster}")

    # ── 7. Formation check on starters ───────────────────────────────────
    counts: dict[str, int] = {"GK": 0, "DF": 0, "MF": 0, "FW": 0}
    for s in body.starters:
        counts[roster_map[s.player_id]] += 1

    errors = []
    for pos in ("GK", "DF", "MF", "FW"):
        c = counts.get(pos, 0)
        if c < _STARTER_MIN[pos]:
            errors.append(f"{pos}: {c} (min {_STARTER_MIN[pos]})")
        if c > _STARTER_MAX[pos]:
            errors.append(f"{pos}: {c} (max {_STARTER_MAX[pos]})")
    if errors:
        raise HTTPException(422, f"Formazione non valida — {', '.join(errors)}")

    # ── 8. Infer the 2 unselected players ────────────────────────────────
    explicit_set = set(explicit_ids)
    unselected_ids = [pid for pid in roster_map if pid not in explicit_set]
    # Sanity check (guaranteed by roster_map size == 16 and explicit == 14)
    if len(unselected_ids) != 2:
        raise HTTPException(500, "Errore interno: calcolo non-convocati fallito")

    # ── 9. Replace lineup for this roster+GW ─────────────────────────────
    supa_delete("lineups", f"roster_id=eq.{roster_id}&gameweek_id=eq.{gw}")

    lineup_rows: list[dict] = []
    for s in body.starters:
        lineup_rows.append({
            "roster_id": roster_id,
            "gameweek_id": gw,
            "player_id": s.player_id,
            "slot": "starter",
            "bench_order": None,
            "is_captain": s.is_captain,
            "is_vice": s.is_vice,
        })
    for b in body.subs:
        lineup_rows.append({
            "roster_id": roster_id,
            "gameweek_id": gw,
            "player_id": b.player_id,
            "slot": "sub",
            "bench_order": b.bench_order,
            "is_captain": False,
            "is_vice": False,
        })
    for pid in unselected_ids:
        lineup_rows.append({
            "roster_id": roster_id,
            "gameweek_id": gw,
            "player_id": pid,
            "slot": "unselected",
            "bench_order": None,
            "is_captain": False,
            "is_vice": False,
        })
    supa_insert("lineups", lineup_rows)

    return {
        "roster_id": roster_id,
        "gameweek": gw,
        "starters": 11,
        "subs": 3,
        "unselected": unselected_ids,
        "captain_id": captains[0].player_id,
        "vice_id": vices[0].player_id,
        "formation": f"1-{counts['DF']}-{counts['MF']}-{counts['FW']}",
    }


app.include_router(me_router)
