-- WC2026 Fantasy schema (Postgres / Supabase)
create table if not exists teams (
  code            text primary key,
  country         text not null,
  coach           text,
  coach_nationality text
);

create table if not exists players (
  id            integer primary key,
  slug          text unique not null,
  team          text not null references teams(code),
  number        integer,
  position      text not null check (position in ('GK','DF','MF','FW')),
  name          text not null,
  dob           date,
  age           integer,
  club          text,
  club_country  text,
  height_cm     integer,
  price         numeric(5,1) not null
);
create index if not exists idx_players_team on players(team);
create index if not exists idx_players_pos  on players(position);
create index if not exists idx_players_price on players(price);
