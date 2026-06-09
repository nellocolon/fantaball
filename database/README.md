# Database (PostgreSQL / Supabase)

Run in order in the Supabase SQL editor:

1. `01_schema.sql` — teams + players tables
2. `02_schema_game.sql` — game tables (users, rosters, roster_players, gameweeks, fixtures, lineups, player_gw_scores, user_gw_scores, transfers, nations_progress)
3. `03_seed_players.sql` — seed all 1,248 players (idempotent)
4. `04_seed_gameweeks.sql` — seed 8 gameweeks with real stage dates (UTC)
5. `05_rls.sql` — Row Level Security: public game data readable by all, private user data owner-only. **Run last.**

RLS is now handled by `05_rls.sql`. The backend must use the **service_role** key (bypasses RLS) to write scores/fixtures; the frontend uses the **anon** key (bound by the policies). See the note at the top of `05_rls.sql` about binding `users.id` to `auth.uid()` when wiring Supabase Auth.

Region: eu-central-1. Lineups are stored as per-gameweek snapshots for incontestability.

## Player data origin (IMPORTANT)
The canonical way to (re)build the players table from scratch is documented in
`docs/fantaball-pricing-reference.py` (the original "fantaball pricing.py" from Desktop).

Key rule from the reference:
- Take player **id**s **directly from API-Football** (`/players/squads` for the 48 WC2026 teams).
- Those IDs become `players.id` (the PK) **and** `players.api_id`.
- Pull 2025 club stats per player, compute price with the exact formula (rating, goals, assists, team tier, pos weight, power curve).
- Generate `03_seed_players.sql` (TRUNCATE + INSERT) and the compact JSON for frontend.

See also `rebuild_wc_players.py` (the maintained implementation with caching) and
`backend/sync_player_api_ids.py` (the pragmatic "add api_id mapping on top of existing surrogate ids"
used because demo lineups already referenced specific player_ids).

For a clean pre-launch rebuild: prefer the reference approach (API IDs as the source of truth for player PKs)
and re-create any demo rosters/lineups after the new seed is applied.
