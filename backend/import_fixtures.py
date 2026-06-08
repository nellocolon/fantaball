#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
import_fixtures.py — importa le 104 partite del Mondiale 2026 da API-Football
e le inserisce/aggiorna nella tabella `fixtures` di Supabase.

Mappa ogni partita alla gameweek fantasy corretta in base a round/data.
Idempotente: si puo' rilanciare per aggiornare risultati e accoppiamenti
(gli slot a eliminazione si riempiono man mano che le squadre si qualificano).

Prerequisiti:
    pip install requests
Variabili d'ambiente:
    API_FOOTBALL_KEY   -> chiave API-Football (api-sports.io)
    SUPABASE_URL       -> https://<project>.supabase.co
    SUPABASE_KEY       -> service_role key (lato server, NON esporre al client)

API-Football: World Cup = league 1, season 2026.
Endpoint usato: GET /fixtures?league=1&season=2026
Doc: https://www.api-football.com/documentation-v3#operation/get-fixtures
"""
import os, sys, requests

API_KEY   = os.environ.get("API_FOOTBALL_KEY")
SUPA_URL  = os.environ.get("SUPABASE_URL")
SUPA_KEY  = os.environ.get("SUPABASE_KEY")
LEAGUE_ID = 1        # FIFA World Cup
SEASON    = 2026

# Mappa il "round" testuale di API-Football alla gameweek fantasy (1..8).
# I round dei gironi sono "Group Stage - 1/2/3"; le fasi a elim. hanno nomi propri.
def round_to_gw(round_name: str):
    r = round_name.lower()
    if "group" in r:
        if "- 1" in r or "1st" in r: return 1
        if "- 2" in r or "2nd" in r: return 2
        if "- 3" in r or "3rd" in r: return 3
        return 1
    if "32" in r:            return 4
    if "16" in r:            return 5
    if "quarter" in r:       return 6
    if "semi" in r:          return 7
    if "final" in r and "3rd" not in r and "third" not in r: return 8
    if "3rd place" in r or "third place" in r: return 8  # finale 3o posto -> GW8
    return None

# Mappa il nome nazionale dell'API al nostro codice a 3 lettere (teams.code).
# Da completare/verificare coi nomi esatti restituiti dall'API.
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

def fetch_fixtures():
    if not API_KEY:
        sys.exit("Manca API_FOOTBALL_KEY")
    url = "https://v3.football.api-sports.io/fixtures"
    headers = {"x-apisports-key": API_KEY}
    params  = {"league": LEAGUE_ID, "season": SEASON}
    r = requests.get(url, headers=headers, params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
    return data.get("response", [])

def upsert_fixture(row):
    """Upsert su Supabase via REST (PostgREST), conflitto su api_fixture_id."""
    if not (SUPA_URL and SUPA_KEY):
        sys.exit("Mancano SUPABASE_URL / SUPABASE_KEY")
    url = f"{SUPA_URL}/rest/v1/fixtures?on_conflict=api_fixture_id"
    headers = {
        "apikey": SUPA_KEY,
        "Authorization": f"Bearer {SUPA_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    r = requests.post(url, headers=headers, json=row, timeout=30)
    if r.status_code >= 300:
        print("  ! errore upsert:", r.status_code, r.text[:200])

def main():
    fixtures = fetch_fixtures()
    print(f"Ricevute {len(fixtures)} partite dall'API.")
    ok = 0
    for fx in fixtures:
        f   = fx["fixture"]
        lg  = fx["league"]
        tm  = fx["teams"]
        gl  = fx.get("goals", {})
        gw  = round_to_gw(lg.get("round",""))
        if gw is None:
            print("  ? round non mappato:", lg.get("round"))
            continue
        st  = f.get("status",{}).get("short","NS")
        status = ("finished" if st in ("FT","AET","PEN")
                  else "live" if st in ("1H","2H","HT","ET","P","LIVE")
                  else "scheduled")
        row = {
            "api_fixture_id": f["id"],
            "gameweek_id":    gw,
            "kickoff_at":     f.get("date"),
            "venue":          (f.get("venue") or {}).get("name"),
            "city":           (f.get("venue") or {}).get("city"),
            "home_team":      code(tm["home"]["name"]),
            "away_team":      code(tm["away"]["name"]),
            "home_goals":     gl.get("home"),
            "away_goals":     gl.get("away"),
            "status":         status,
        }
        upsert_fixture(row)
        ok += 1
    print(f"Upsert completati: {ok}")

if __name__ == "__main__":
    main()
