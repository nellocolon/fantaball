-- ════════════════════════════════════════════════════════════════════
-- 05_rls.sql — Row Level Security policies
-- Run LAST, after 01–04. Idempotent (safe to re-run).
--
-- Model:
--   • Public game data (teams, players, gameweeks, fixtures, scores,
--     leaderboard, nations) → readable by EVERYONE, writable only by the
--     backend (service_role bypasses RLS automatically).
--   • Private user data (users, rosters, roster_players, lineups, transfers)
--     → each user can read/write ONLY their own rows.
--
-- Assumes Supabase Auth: auth.uid() is the logged-in user's UUID, and the
-- `users` table has its primary key = auth.uid(). Adjust the owner checks
-- if your users.id is not the auth uid.
--
-- NOTE: the backend (FastAPI) must use the SERVICE ROLE key, which bypasses
-- RLS, so it can write scores, fixtures, etc. The ANON key (frontend) is
-- bound by these policies.
-- ════════════════════════════════════════════════════════════════════

-- ── Enable RLS on every table ──
-- ⚠️ IMPORTANT: these owner-checks assume users.id == auth.uid().
-- In 02_schema_game.sql users.id defaults to gen_random_uuid(). When you
-- wire Supabase Auth, either:
--   (a) insert the user row with id = auth.uid() at signup, OR
--   (b) add a column users.auth_id uuid references auth.users, and replace
--       every `auth.uid()` below with a lookup on that column.
-- Until auth is wired, test with the service_role key (bypasses RLS).

alter table teams             enable row level security;
alter table players           enable row level security;
alter table gameweeks         enable row level security;
alter table fixtures          enable row level security;
alter table player_gw_scores  enable row level security;
alter table user_gw_scores    enable row level security;
alter table nations_progress  enable row level security;
alter table users             enable row level security;
alter table rosters           enable row level security;
alter table roster_players    enable row level security;
alter table lineups           enable row level security;
alter table transfers         enable row level security;

-- ════════════════════════════════════════════════════════════════════
-- PUBLIC READ-ONLY DATA
-- Everyone (anon + authenticated) can SELECT. No INSERT/UPDATE/DELETE
-- policies → writes are denied for anon/auth; only service_role writes.
-- ════════════════════════════════════════════════════════════════════
drop policy if exists p_teams_read on teams;
create policy p_teams_read on teams for select using (true);

drop policy if exists p_players_read on players;
create policy p_players_read on players for select using (true);

drop policy if exists p_gameweeks_read on gameweeks;
create policy p_gameweeks_read on gameweeks for select using (true);

drop policy if exists p_fixtures_read on fixtures;
create policy p_fixtures_read on fixtures for select using (true);

drop policy if exists p_pgs_read on player_gw_scores;
create policy p_pgs_read on player_gw_scores for select using (true);

-- leaderboard is public (read-only); writes via service_role only
drop policy if exists p_ugs_read on user_gw_scores;
create policy p_ugs_read on user_gw_scores for select using (true);

drop policy if exists p_nations_read on nations_progress;
create policy p_nations_read on nations_progress for select using (true);

-- ════════════════════════════════════════════════════════════════════
-- PRIVATE USER DATA — owner-only
-- ════════════════════════════════════════════════════════════════════

-- users: a row is owned by the matching auth uid
drop policy if exists p_users_self_read on users;
create policy p_users_self_read on users
  for select using (id = auth.uid());

drop policy if exists p_users_self_upsert on users;
create policy p_users_self_upsert on users
  for insert with check (id = auth.uid());

drop policy if exists p_users_self_update on users;
create policy p_users_self_update on users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- rosters: owned via rosters.user_id = auth.uid()
drop policy if exists p_rosters_owner_read on rosters;
create policy p_rosters_owner_read on rosters
  for select using (user_id = auth.uid());

drop policy if exists p_rosters_owner_ins on rosters;
create policy p_rosters_owner_ins on rosters
  for insert with check (user_id = auth.uid());

drop policy if exists p_rosters_owner_upd on rosters;
create policy p_rosters_owner_upd on rosters
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists p_rosters_owner_del on rosters;
create policy p_rosters_owner_del on rosters
  for delete using (user_id = auth.uid());

-- helper predicate reused below: a roster belongs to the caller
--   exists (select 1 from rosters r where r.id = <fk> and r.user_id = auth.uid())

-- roster_players
drop policy if exists p_rp_owner_read on roster_players;
create policy p_rp_owner_read on roster_players
  for select using (exists (select 1 from rosters r where r.id = roster_id and r.user_id = auth.uid()));

drop policy if exists p_rp_owner_ins on roster_players;
create policy p_rp_owner_ins on roster_players
  for insert with check (exists (select 1 from rosters r where r.id = roster_id and r.user_id = auth.uid()));

drop policy if exists p_rp_owner_upd on roster_players;
create policy p_rp_owner_upd on roster_players
  for update using (exists (select 1 from rosters r where r.id = roster_id and r.user_id = auth.uid()));

drop policy if exists p_rp_owner_del on roster_players;
create policy p_rp_owner_del on roster_players
  for delete using (exists (select 1 from rosters r where r.id = roster_id and r.user_id = auth.uid()));

-- lineups
drop policy if exists p_lineups_owner_read on lineups;
create policy p_lineups_owner_read on lineups
  for select using (exists (select 1 from rosters r where r.id = roster_id and r.user_id = auth.uid()));

drop policy if exists p_lineups_owner_ins on lineups;
create policy p_lineups_owner_ins on lineups
  for insert with check (exists (select 1 from rosters r where r.id = roster_id and r.user_id = auth.uid()));

drop policy if exists p_lineups_owner_upd on lineups;
create policy p_lineups_owner_upd on lineups
  for update using (exists (select 1 from rosters r where r.id = roster_id and r.user_id = auth.uid()));

-- transfers
drop policy if exists p_transfers_owner_read on transfers;
create policy p_transfers_owner_read on transfers
  for select using (exists (select 1 from rosters r where r.id = roster_id and r.user_id = auth.uid()));

drop policy if exists p_transfers_owner_ins on transfers;
create policy p_transfers_owner_ins on transfers
  for insert with check (exists (select 1 from rosters r where r.id = roster_id and r.user_id = auth.uid()));

-- ════════════════════════════════════════════════════════════════════
-- Optional public leaderboard view (handle + points only, no PII)
-- The overlay / public_api can read this without exposing wallets.
-- Rank is computed on the fly from total_points.
-- ════════════════════════════════════════════════════════════════════
create or replace view public_leaderboard as
  select u.x_handle,
         u.display_name,
         s.gameweek_id,
         s.total_points,
         s.captain_points,
         rank() over (partition by s.gameweek_id order by s.total_points desc) as rank
  from user_gw_scores s
  join rosters r on r.id = s.roster_id
  join users u on u.id = r.user_id;

-- ════════════════════════════════════════════════════════════════════
-- Public view: most-owned players (for the live stream overlay top-50).
-- Counts ACTIVE roster_players per player. Readable by all.
-- ════════════════════════════════════════════════════════════════════
create or replace view most_owned as
  select p.id,
         p.name,
         p.team,
         count(rp.*) filter (where rp.active) as owned
  from players p
  left join roster_players rp on rp.player_id = p.id
  group by p.id, p.name, p.team
  order by owned desc;

-- done.
