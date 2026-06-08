-- ════════════════════════════════════════════════════════════════════
-- 07_stats.sql  —  World Cup statistics layer
-- Tables populated by backend/import_stats.py (API-Football → Supabase).
-- Public read access via the public_api.py /public/stats|standings|bracket.
-- Idempotent: safe to run multiple times.
-- ════════════════════════════════════════════════════════════════════

-- Per-player, per-gameweek raw stats from each match
create table if not exists player_stats (
  id           bigint generated always as identity primary key,
  player_id    text not null,
  fixture_id   bigint,
  gw           int,
  team         text,                 -- 3-letter nation code (matches FLAG keys)
  goals        int  not null default 0,
  assists      int  not null default 0,
  yellow       int  not null default 0,
  red          int  not null default 0,
  minutes      int  not null default 0,
  rating       numeric(4,2),
  updated_at   timestamptz not null default now(),
  unique (player_id, fixture_id)
);
create index if not exists idx_player_stats_pid on player_stats(player_id);
create index if not exists idx_player_stats_gw  on player_stats(gw);

-- Aggregated view the API reads (sums across all matches, plus club/name)
create or replace view player_stats_agg as
select
  ps.player_id,
  coalesce(p.name, ps.player_id)  as name,
  coalesce(p.team, ps.team)       as team,
  p.club                          as club,
  sum(ps.goals)::int    as goals,
  sum(ps.assists)::int  as assists,
  sum(ps.yellow)::int   as yellow,
  sum(ps.red)::int      as red,
  sum(ps.minutes)::int  as minutes,
  null::int             as gw    -- placeholder col so ?gw= filter parses; per-gw query hits player_stats directly
from player_stats ps
left join players p on p.id = ps.player_id
group by ps.player_id, p.name, ps.team, p.team, p.club;

-- Group standings (one row per team per group)
create table if not exists group_standings (
  group_name  text not null,
  team        text not null,        -- 3-letter nation code
  played      int  not null default 0,
  won         int  not null default 0,
  drawn       int  not null default 0,
  lost        int  not null default 0,
  gf          int  not null default 0,
  ga          int  not null default 0,
  points      int  not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (group_name, team)
);

-- Knockout bracket (one row per match)
create table if not exists bracket (
  id           bigint generated always as identity primary key,
  round        text not null,        -- 'Round of 32' | 'Round of 16' | 'Quarterfinals' | 'Semifinals' | 'Final'
  round_order  int  not null,        -- 1..5 for display order
  slot         int  not null,        -- position within the round (0-based)
  home         text,                 -- nation code or placeholder ('3 B/E/F', 'W41', '—')
  away         text,
  home_score   int,
  away_score   int,
  pens         text,                 -- '4-3' if decided on penalties, else null
  done         boolean not null default false,
  updated_at   timestamptz not null default now(),
  unique (round, slot)
);

-- Public read-only access (anon can SELECT; writes happen via service_role in import_stats.py)
alter table player_stats     enable row level security;
alter table group_standings  enable row level security;
alter table bracket          enable row level security;

drop policy if exists "public read player_stats"    on player_stats;
drop policy if exists "public read group_standings" on group_standings;
drop policy if exists "public read bracket"         on bracket;

create policy "public read player_stats"    on player_stats    for select using (true);
create policy "public read group_standings" on group_standings for select using (true);
create policy "public read bracket"         on bracket         for select using (true);
