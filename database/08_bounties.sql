-- ════════════════════════════════════════════════════════════════════
-- 08_bounties.sql — pump.fun GO bounties (Quests tab)
-- Activate a bounty WITHOUT a code push: set go_url + active=true here in
-- the Supabase table editor and the site reflects it on next load.
-- Funded by 30% of $FANTABALL creator fees. Public read-only.
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════

create table if not exists bounties (
  id          bigint generated always as identity primary key,
  cat         text not null default 'REACH',     -- 'REACH' | 'LADDER'
  title       text not null,
  descr       text,
  reward_sol  numeric(10,2) not null default 0,  -- amount in SOL
  deliver     text,                              -- how it's verified
  go_url      text,                              -- pump.fun GO link; empty = SOON
  active      boolean not null default false,    -- true + go_url set = ENTER
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

alter table bounties enable row level security;
drop policy if exists "public read bounties" on bounties;
create policy "public read bounties" on bounties for select using (true);

-- Seed the agreed launch bounties in SOON state (no go_url, not active).
-- At launch: paste go_url + set active=true to flip a bounty to ENTER.
insert into bounties (cat,title,descr,reward_sol,deliver,go_url,active,sort_order) values
  ('REACH','Spotlight Stream','Run a sports/trading livestream with the $FANTABALL ticker banner on screen the whole time.',1,'Public VOD ≥30 min · ticker readable throughout · avg viewers ≥ threshold',null,false,1),
  ('REACH','Viral Post','Post about Fantaball on X and pass 20,000 real views.',1,'Post link + analytics screenshot showing ≥20k views + $FANTABALL tag',null,false,2),
  ('REACH','TikTok Drop','Make a TikTok explaining the project with the ticker visible on screen.',1,'TikTok link + view count ≥ threshold + ticker visible',null,false,3),
  ('REACH','Thread of the Week','Write an explainer thread on the project or its mechanics that passes the engagement bar.',0.5,'Thread link + impressions screenshot ≥ threshold',null,false,4),
  ('LADDER','Bracket Oracle · R16','Predict the most correct results of the Round of 16. One winner takes it.',0.5,'Completed bracket before kickoff + correct count',null,false,5),
  ('LADDER','Man of the Matchday','Highest single-matchday score across all managers. Resets every matchday.',0.3,'Score screenshot + public profile link',null,false,6)
on conflict do nothing;
