# Data

- `players.json` — 1,248 players, full schema: id, slug, name, team, number, position, dob, age, club, club_country, height_cm, price.
- `teams.json` — 48 World Cup nations.
- `all_players_compact.json` — compact array `{id,n,t,p,c,pr,num}` consumed by the UI.
- `demo_players.json` — emptied (no longer used; all player data comes from all_players_compact.json or live backend).

Prices are computed from club tier × position × age × shirt number × star bonus,
with a deterministic per-player jitter for variety (175 distinct values across 1,248 players).
