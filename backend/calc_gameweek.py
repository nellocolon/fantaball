#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
calc_gameweek.py — Orchestratore del calcolo punti per una giornata.

Pipeline:
  1) Per ogni partita della giornata: leggi statistiche giocatori da API-Football
     (fixtures/players) + eventi (fixtures/events per autogol, che a volte
     non e' nel players stats).
  2) Normalizza nel formato di scoring.score_player(), calcola clean sheet.
  3) Scrivi player_gw_scores (livello giocatore reale).
  4) Per ogni utente con lineup in questa GW: calcola punti con
     scoring.score_user_gameweek() e scrivi user_gw_scores (cumulativo).

Modalita':
  --live   : aggiorna i punti durante le partite (is_final=false)
  --final  : congela a giornata chiusa (is_final=true) e blocca la classifica

Env: API_FOOTBALL_KEY, SUPABASE_URL, SUPABASE_KEY
Dipende da: scoring.py (stesso folder)
"""
from __future__ import annotations
import os, sys, argparse, requests
from scoring import score_player, score_user_gameweek

API_KEY  = os.environ.get("API_FOOTBALL_KEY")
SUPA_URL = os.environ.get("SUPABASE_URL")
SUPA_KEY = os.environ.get("SUPABASE_KEY")

API_BASE = "https://v3.football.api-sports.io"
HDR_API  = {"x-apisports-key": API_KEY or ""}
HDR_SUPA = {
    "apikey": SUPA_KEY or "", "Authorization": f"Bearer {SUPA_KEY or ''}",
    "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates",
}

# ----------------------------------------------------------------------
# Supabase helpers (REST / PostgREST)
# ----------------------------------------------------------------------
def supa_get(table, query):
    r = requests.get(f"{SUPA_URL}/rest/v1/{table}?{query}", headers=HDR_SUPA, timeout=30)
    r.raise_for_status(); return r.json()

def supa_upsert(table, rows, on_conflict):
    if not rows: return
    url = f"{SUPA_URL}/rest/v1/{table}?on_conflict={on_conflict}"
    r = requests.post(url, headers=HDR_SUPA, json=rows, timeout=60)
    if r.status_code >= 300:
        print("  ! upsert", table, r.status_code, r.text[:200])

# ----------------------------------------------------------------------
# 1-2) API-Football -> formato scoring
# ----------------------------------------------------------------------
def fetch_player_stats(api_fixture_id):
    r = requests.get(f"{API_BASE}/fixtures/players",
                     headers=HDR_API, params={"fixture": api_fixture_id}, timeout=30)
    r.raise_for_status(); return r.json().get("response", [])

def fetch_events(api_fixture_id):
    r = requests.get(f"{API_BASE}/fixtures/events",
                     headers=HDR_API, params={"fixture": api_fixture_id}, timeout=30)
    r.raise_for_status(); return r.json().get("response", [])

def normalize(api_player_block, own_goal_ids):
    """Converte il blocco statistiche di un giocatore API-Football nel dict scoring."""
    st = api_player_block["statistics"][0]
    pid_api = api_player_block["player"]["id"]
    games = st.get("games", {}) or {}
    goals = st.get("goals", {}) or {}
    cards = st.get("cards", {}) or {}
    pen   = st.get("penalty", {}) or {}
    minutes = games.get("minutes") or 0
    conceded = goals.get("conceded") or 0
    return pid_api, {
        "started":    bool(games.get("substitute") is False and games.get("minutes")),
        "minutes":    minutes,
        "goals":      goals.get("total") or 0,
        "assists":    goals.get("assists") or 0,
        "conceded":   conceded,
        "clean_sheet": (conceded == 0 and minutes >= 60),
        "saves":      goals.get("saves") or 0,
        "pen_saved":  pen.get("saved") or 0,
        "pen_missed": pen.get("missed") or 0,
        "yellow":     1 if (cards.get("yellow") or 0) else 0,
        "red":        1 if (cards.get("red") or 0) else 0,
        "own_goals":  own_goal_ids.get(pid_api, 0),
    }, (games.get("position") or "").upper()[:2]

# Mappa posizione API ("G","D","M","F") -> nostro codice ruolo.
APIPOS = {"G":"GK","D":"DF","M":"MF","F":"FW"}

def map_pos(api_pos, fallback):
    p = (api_pos or "")[:1].upper()
    return APIPOS.get(p, fallback or "MF")

# ----------------------------------------------------------------------
# Pipeline principale
# ----------------------------------------------------------------------
def run(gw_id: int, finalize: bool):
    if not (API_KEY and SUPA_URL and SUPA_KEY):
        sys.exit("Mancano API_FOOTBALL_KEY / SUPABASE_URL / SUPABASE_KEY")

    # mappa api_player_id -> nostro players.id (serve una colonna api_id su players,
    # oppure una tabella di mapping; qui assumo player_map gia' disponibile)
    pmap = {row["api_id"]: row["id"]
            for row in supa_get("player_map", "select=id,api_id")}

    fixtures = supa_get("fixtures",
        f"select=api_fixture_id&gameweek_id=eq.{gw_id}&status=in.(live,finished)")

    player_rows = []
    for fx in fixtures:
        afid = fx["api_fixture_id"]
        # autogol dagli eventi
        own = {}
        for ev in fetch_events(afid):
            if ev.get("type") == "Goal" and ev.get("detail") == "Own Goal":
                own[ev["player"]["id"]] = own.get(ev["player"]["id"], 0) + 1
        # statistiche per giocatore
        for team_block in fetch_player_stats(afid):
            for pb in team_block.get("players", []):
                api_pid, stats, api_pos = normalize(pb, own)
                our_pid = pmap.get(api_pid)
                if our_pid is None:
                    continue  # giocatore non in DB (raro: stesso roster ufficiale)
                pos = map_pos(api_pos, None)
                sc = score_player(stats, pos)
                player_rows.append({
                    "player_id": our_pid, "gameweek_id": gw_id,
                    "minutes": stats["minutes"], "started": stats["started"],
                    "points": sc.points, "breakdown": sc.breakdown,
                    "is_final": finalize,
                })
    supa_upsert("player_gw_scores", player_rows, "player_id,gameweek_id")
    print(f"player_gw_scores: {len(player_rows)} righe ({'FINAL' if finalize else 'live'})")

    # --- livello utente ---
    pscore = {r["player_id"]: r["points"]  for r in player_rows}
    pmin   = {r["player_id"]: r["minutes"] for r in player_rows}

    # cumulativo precedente (GW-1)
    prev = {}
    if gw_id > 1:
        for r in supa_get("user_gw_scores",
                f"select=roster_id,total_points&gameweek_id=eq.{gw_id-1}"):
            prev[r["roster_id"]] = float(r["total_points"])

    user_rows = []
    # lineups has no position column; pull it from the related players row.
    # PostgREST embed: players(position) -> l["players"]["position"]
    lineups = supa_get("lineups",
        f"select=roster_id,player_id,slot,bench_order,is_captain,is_vice,players(position)"
        f"&gameweek_id=eq.{gw_id}")
    # flatten the embedded position onto each lineup row
    for l in lineups:
        emb = l.pop("players", None)
        l["position"] = (emb or {}).get("position") if isinstance(emb, dict) else None
    # raggruppa per roster
    by_roster = {}
    for l in lineups:
        by_roster.setdefault(l["roster_id"], []).append(l)

    for roster_id, lin in by_roster.items():
        gw_pts, cap_pts, _ = score_user_gameweek(lin, pscore, pmin)
        total = round(prev.get(roster_id, 0.0) + gw_pts, 1)
        user_rows.append({
            "roster_id": roster_id, "gameweek_id": gw_id,
            "gw_points": gw_pts, "total_points": total,
            "captain_points": cap_pts, "is_final": finalize,
        })
    supa_upsert("user_gw_scores", user_rows, "roster_id,gameweek_id")
    print(f"user_gw_scores: {len(user_rows)} righe ({'FINAL' if finalize else 'live'})")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("gameweek", type=int)
    ap.add_argument("--final", action="store_true", help="congela i punti (giornata chiusa)")
    args = ap.parse_args()
    run(args.gameweek, finalize=args.final)
