# Database (PostgreSQL / Supabase)

Run in order in the Supabase SQL editor:

1. `01_schema.sql` — teams + players tables
2. `02_schema_game.sql` — game tables (users, rosters, roster_players, gameweeks, fixtures, lineups, player_gw_scores, user_gw_scores, transfers, nations_progress)
3. `03_seed_players.sql` — seed all 1,248 players (idempotent)
4. `04_seed_gameweeks.sql` — seed 8 gameweeks with real stage dates (UTC)
5. `05_rls.sql` — Row Level Security: public game data readable by all, private user data owner-only. **Run last.**

RLS is now handled by `05_rls.sql`. The backend must use the **service_role** key (bypasses RLS) to write scores/fixtures; the frontend uses the **anon** key (bound by the policies). See the note at the top of `05_rls.sql` about binding `users.id` to `auth.uid()` when wiring Supabase Auth.

Region: eu-central-1. Lineups are stored as per-gameweek snapshots for incontestability.
