# FANTABALL — Player pricing from API-Football
# This is the authoritative reference (original "fantaball pricing.py" from Desktop).
# It was explicitly intended to be passed to Grok Build with a working API_FOOTBALL_KEY.
#
# Core rule: build the database FROM SCRATCH by taking player IDs DIRECTLY from
# API-Football (/players/squads). Those IDs become players.id (PK) and api_id.
#
# Produces: new 03_seed_players.sql (TRUNCATE + INSERT) + all_players_compact.json
#
# See also in this repo:
#   - rebuild_wc_players.py (maintained, cached implementation)
#   - backend/sync_player_api_ids.py (mapping approach used for existing demo data)
#   - database/README.md (player data origin section)
#
# Original top comment preserved below.

import os, json, time, math

API_KEY = os.environ.get("API_FOOTBALL_KEY", "YOUR_KEY_HERE")
API_HOST = "v3.api-football.com"  # direct endpoint (x-apisports-key header)
# If using RapidAPI instead: API_HOST = "api-football-v1.p.rapidapi.com", header = "X-RapidAPI-Key"

HEADERS = {"x-apisports-key": API_KEY}
BASE = f"https://{API_HOST}"

BUDGET = 700        # per-squad budget
SQUAD_SIZE = 15
MAX_PRICE = 155     # superstar ceiling
MIN_PRICE = 12      # minimum (unknown backup)

# ─── TEAM STRENGTH TIERS (FIFA ranking + hype) ───────────────────────
# Multiplier applied to raw score. Top nations' players cost more.
TEAM_TIER = {
    # Tier 1 — favorites (×1.25)
    "France": 1.25, "Brazil": 1.25, "Argentina": 1.25, "England": 1.25,
    "Spain": 1.25, "Germany": 1.25,
    # Tier 2 — strong contenders (×1.15)
    "Portugal": 1.15, "Netherlands": 1.15, "Belgium": 1.15, "Italy": 1.15,
    "Croatia": 1.15, "Uruguay": 1.15,
    # Tier 3 — dark horses (×1.08)
    "Colombia": 1.08, "USA": 1.08, "Mexico": 1.08, "Denmark": 1.08,
    "Japan": 1.08, "Morocco": 1.08, "Senegal": 1.08, "Switzerland": 1.08,
    "Serbia": 1.08, "Poland": 1.08, "Ecuador": 1.08, "Canada": 1.08,
    # Tier 4 — everyone else (×1.00) — default
}

# ─── POSITION WEIGHT ─────────────────────────────────────────────────
# Forwards score more fantasy points → worth more. GKs cheapest.
POS_WEIGHT = {"Goalkeeper": 0.72, "Defender": 0.88, "Midfielder": 1.00, "Attacker": 1.18}
POS_SHORT  = {"Goalkeeper": "GK", "Defender": "DF", "Midfielder": "MF", "Attacker": "FW"}

# ─── PRICING FORMULA ─────────────────────────────────────────────────
def compute_raw_score(stats):
    """
    stats = dict from API-Football /v3/players?id=X&season=2025
    stats.statistics[0] has the primary league stats.
    """
    s = stats.get("statistics", [{}])[0] if stats.get("statistics") else {}
    games = s.get("games", {})
    goals_data = s.get("goals", {})
    passes = s.get("passes", {})

    rating = float(games.get("rating") or 0)           # 0-10 scale
    appearances = int(games.get("appearences") or 0)    # note: API typo "appearences"
    minutes = int(games.get("minutes") or 0)
    goals = int(goals_data.get("total") or 0)
    assists = int(goals_data.get("assists") or 0)
    clean_sheets = int(s.get("goals", {}).get("conceded") or 0)  # inverse for def
    key_passes = int(passes.get("key") or 0)

    # Clean sheets: for GK/DEF, use (appearances - goals_conceded/appearances) as proxy
    # Actually API has clean sheets somewhere; approximate:
    cs_proxy = max(0, appearances - int(goals_data.get("conceded") or appearances))

    raw = (
        rating * 12.0          # dominant factor: season rating (0-10 → 0-120 range)
        + goals * 6.0          # goals heavily weighted
        + assists * 4.0        # assists
        + key_passes * 0.3     # creativity
        + cs_proxy * 1.5       # clean sheet proxy (GK/DEF benefit)
        + min(appearances, 35) * 0.8   # reward regularity (cap at 35 to not over-reward)
    )

    # Minimum floor for players with no/little stats (young, bench)
    return max(raw, 5.0)


def price_player(raw_score, team_name, position, all_raw_scores):
    """
    Converts raw_score → a price in [MIN_PRICE, MAX_PRICE] using:
    - percentile rank among all players
    - team tier multiplier
    - position weight
    - power curve (top-heavy: stars cost disproportionately more)
    """
    tier = TEAM_TIER.get(team_name, 1.00)
    pw = POS_WEIGHT.get(position, 1.00)

    adjusted = raw_score * tier * pw

    # Rank among all adjusted scores → percentile [0, 1]
    rank = sorted(all_raw_scores).index(adjusted) if adjusted in all_raw_scores else 0
    pct = rank / max(len(all_raw_scores) - 1, 1)

    # Power curve: pct^0.6 → top players get disproportionately higher prices
    curved = pct ** 0.6

    price = MIN_PRICE + (MAX_PRICE - MIN_PRICE) * curved

    # Round to nearest 0.5
    return round(price * 2) / 2


# ─── API-FOOTBALL CALLS (Grok fills in HTTP client) ──────────────────
# 
# STEP 1: Get WC 2026 teams
#   GET {BASE}/leagues?name=World Cup&season=2026
#   → find league_id (historically 1 for World Cup)
#   Then: GET {BASE}/teams?league={league_id}&season=2026
#   → list of 48 {team.id, team.name, team.country}
#
# STEP 2: Get squads for each national team
#   GET {BASE}/players/squads?team={team_id}
#   → list of {id, name, number, position, photo}
#   Rate limit: ~10 req/min on some plans; add time.sleep(0.5) between calls.
#   Total: 48 calls.
#
# STEP 3: Get club-season stats for each player
#   GET {BASE}/players?id={player_id}&season=2025
#   → season stats (rating, goals, assists, minutes, appearances...)
#   Total: ~1200 calls (within 7500/day). Add time.sleep(0.3).
#
# STEP 4: Compute prices
#   For each player: compute_raw_score(stats) → raw
#   Collect all adjusted scores, then price_player() for each.
#
# STEP 5: Generate outputs (see below)


# ─── OUTPUT GENERATORS ───────────────────────────────────────────────

def generate_seed_sql(players, filename="03_seed_players.sql"):
    """
    players = list of {id, name, team, position, club, price, number, api_id}
    where api_id == id (API-Football is the source of truth now).
    """
    lines = ["-- Auto-generated from API-Football WC 2026 squads + stats-based pricing",
             "-- Budget: 700 / 16 players. Prices reflect club-season performance + team tier + hype.",
             "TRUNCATE players CASCADE;", ""]
    for p in players:
        name_esc = p["name"].replace("'", "''")
        team_esc = p["team"].replace("'", "''")
        club_esc = (p.get("club") or "").replace("'", "''")
        lines.append(
            f"INSERT INTO players (id, name, team, position, club, price, number, api_id) "
            f"VALUES ({p['id']}, '{name_esc}', '{team_esc}', '{p['position']}', "
            f"'{club_esc}', {p['price']}, {p.get('number') or 'NULL'}, {p['id']});"
        )
    with open(filename, "w") as f:
        f.write("\n".join(lines))
    print(f"Written {len(players)} players to {filename}")


def generate_compact_json(players, filename="all_players_compact.json"):
    """
    Compact format for the frontend demo fallback:
    [{id, n, t, p, c, pr, num, pts:0, own:0}, ...]
    """
    compact = []
    for p in players:
        compact.append({
            "id": p["id"],
            "n": p["name"],
            "t": p["team"],
            "p": p["position"],   # GK/DF/MF/FW
            "c": p.get("club", ""),
            "pr": p["price"],
            "num": p.get("number"),
            "pts": 0,  # no tournament points yet
            "own": 0,  # no ownership yet
        })
    with open(filename, "w") as f:
        json.dump(compact, f, ensure_ascii=False)
    print(f"Written {len(compact)} players to {filename}")


# ─── BUDGET VALIDATION ───────────────────────────────────────────────
def validate_budget(players):
    """
    Check that the pricing allows building a valid 16-player squad within 700.
    Simulates: cheapest possible squad and most expensive possible squad.
    """
    by_pos = {"GK": [], "DF": [], "MF": [], "FW": []}
    for p in players:
        by_pos[p["position"]].append(p["price"])
    for pos in by_pos:
        by_pos[pos].sort()

    # Cheapest valid squad: 2 GK + 5 DF + 5 MF + 3 FW (cheapest each)
    cheapest = sum(by_pos["GK"][:2]) + sum(by_pos["DF"][:5]) + sum(by_pos["MF"][:5]) + sum(by_pos["FW"][:3])
    # Most expensive possible
    most_exp = sum(by_pos["GK"][-2:]) + sum(by_pos["DF"][-5:]) + sum(by_pos["MF"][-5:]) + sum(by_pos["FW"][-3:])
    # Average 15-player squad (median-priced)
    all_prices = sorted([p["price"] for p in players])
    median_15 = sum(all_prices[len(all_prices)//2 - 7 : len(all_prices)//2 + 8])

    print(f"Budget: {BUDGET}")
    print(f"Cheapest possible squad: {cheapest:.1f} {'OK' if cheapest < BUDGET else 'TOO EXPENSIVE'}")
    print(f"Most expensive squad:    {most_exp:.1f} {'OVER (good — forces tradeoffs)' if most_exp > BUDGET else 'UNDER (prices too low)'}")
    print(f"Median-15 squad:         {median_15:.1f} {'OK' if median_15 < BUDGET * 1.1 else 'check distribution'}")


# ─── EXPECTED PRICE DISTRIBUTION ─────────────────────────────────────
# After running, you should see roughly:
#   Top 30 players:  120-155 (Mbappé, Haaland, Vinicius, Bellingham, Salah...)
#   Next 100:         75-120 (elite starters)
#   Mid 400:          40-75  (solid starters)
#   Lower 400:        20-40  (squad rotation)
#   Bottom 300:       12-20  (backups, young/unknown)
#
# Total players: ~1200-1300 (48 teams × 26 per squad)
# Budget 700 / avg ~44 per player → a balanced squad uses 2 stars + solid mid + budget picks.
# An all-star XI costs ~1200+ → impossible within 700 → forces real squad-building decisions.


# ─── NOTES FOR GROK ──────────────────────────────────────────────────
# 1. Run STEP 1-3 first (API calls). Cache results to a JSON so you don't re-call.
# 2. Run STEP 4 (pricing). Inspect the distribution (print top 30, bottom 30).
# 3. If prices look wrong, tune the weights in compute_raw_score or the power curve exponent (0.6).
# 4. Run STEP 5 (generate SQL + JSON).
# 5. Copy 03_seed_players.sql → database/03_seed_players.sql (replaces the old one).
# 6. Copy all_players_compact.json → frontend/src/all_players_compact.json.
# 7. Re-run the SQL in Supabase (just 03, not 01-02-04-05 unless schema changed).
# 8. Commit + push → Netlify rebuilds with new player data.
#
# FALLBACK if WC 2026 squads aren't in API-Football yet:
# Use the FIFA PDF names you already have. For each, search:
#   GET {BASE}/players?search={last_name}&league={domestic_league_id}&season=2025
# and fuzzy-match by name + nationality. Store the matched API-Football ID as api_id.
# Then pull stats for the matched ID and price as above.
