-- =====================================================================
-- WC2026 Fantasy — Schema TABELLE DI GIOCO (Postgres / Supabase)
-- Da eseguire DOPO schema.sql (che crea teams e players).
-- Approccio: snapshot per giornata + punteggi ibridi (live -> congelati).
-- =====================================================================

-- ---------------------------------------------------------------------
-- UTENTI
-- Auth doppia: wallet Solana (per i premi in SOL) + handle X (identita').
-- ---------------------------------------------------------------------
create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  wallet          text unique,                   -- indirizzo Solana (collegato dopo il login X), usato per i premi
  x_handle        text unique,                   -- @handle X/Twitter (anti-bot, marketing)
  x_id            text unique,                   -- id numerico X (stabile se cambia handle)
  display_name    text,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ROSTERS — una rosa per utente (1:1)
-- budget_cap fisso a 888; budget_spent ricalcolato a ogni modifica rosa.
-- ---------------------------------------------------------------------
create table if not exists rosters (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique not null references users(id) on delete cascade,
  name            text,                          -- nome squadra scelto dall'utente
  budget_cap      numeric(6,1) not null default 888.0,
  budget_spent    numeric(6,1) not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ROSTER_PLAYERS — i 15 giocatori della rosa
-- price_paid: prezzo FISSO pagato all'acquisto (serve per il rimborso 50%).
-- active = false quando il giocatore e' uscito dalla rosa (storico transfer).
-- ---------------------------------------------------------------------
create table if not exists roster_players (
  id              bigint generated always as identity primary key,
  roster_id       uuid not null references rosters(id) on delete cascade,
  player_id       integer not null references players(id),
  price_paid      numeric(5,1) not null,
  acquired_gw     integer,                       -- in quale giornata e' entrato
  released_gw     integer,                       -- in quale giornata e' uscito (null = ancora in rosa)
  active          boolean not null default true,
  unique (roster_id, player_id, active)          -- evita doppioni attivi
);
create index if not exists idx_rp_roster on roster_players(roster_id) where active;

-- ---------------------------------------------------------------------
-- GAMEWEEKS — le "giornate" fantasy mappate sui turni del Mondiale 2026
-- WC2026: 12 gironi, poi Round of 32 -> R16 -> Quarti -> Semi -> Finale.
-- 8 giornate fantasy totali (3 gironi + 5 a eliminazione).
-- transfer_open: se in questa finestra si possono fare transfer.
-- status: scheduled -> live -> closed (per la logica punteggi ibrida).
-- ---------------------------------------------------------------------
create table if not exists gameweeks (
  id              integer primary key,           -- 1..8
  label           text not null,                 -- "Gironi G1", "Round of 32", ...
  stage           text not null check (stage in ('group','r32','r16','qf','sf','final')),
  opens_at        timestamptz,                   -- apertura modifiche/schieramento
  locks_at        timestamptz,                   -- deadline schieramento (primo match della GW)
  closes_at       timestamptz,                   -- chiusura giornata (congelamento punti)
  transfer_open   boolean not null default false,
  status          text not null default 'scheduled' check (status in ('scheduled','live','closed'))
);

-- ---------------------------------------------------------------------
-- FIXTURES — le 104 partite reali del Mondiale (72 gironi + 32 a elim.)
-- api_fixture_id: id della partita nell'API (chiave per import/aggiornamento).
-- home_team/away_team: null per gli slot a eliminazione finche' non sono noti.
-- Serve a: tabellone, deadline di giornata (min(kickoff) per GW),
--          rilevare "ha giocato", e ricavare risultati.
-- ---------------------------------------------------------------------
create table if not exists fixtures (
  id              bigint generated always as identity primary key,
  api_fixture_id  bigint unique,                 -- id partita nell'API esterna
  gameweek_id     integer not null references gameweeks(id),
  match_no        integer,                       -- 1..104 numero ufficiale FIFA
  kickoff_at      timestamptz,                   -- data/ora calcio d'inizio (UTC)
  venue           text,
  city            text,
  home_team       text references teams(code),   -- null = TBD (slot a eliminazione)
  away_team       text references teams(code),   -- null = TBD
  home_goals      integer,
  away_goals      integer,
  status          text not null default 'scheduled'
                    check (status in ('scheduled','live','finished')),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_fixtures_gw on fixtures(gameweek_id);
create index if not exists idx_fixtures_kick on fixtures(kickoff_at);

-- ---------------------------------------------------------------------
-- MAPPING API: l'API (es. API-Football) usa id-giocatore propri, diversi
-- dai nostri players.id. Aggiungiamo una colonna per agganciarli.
-- Va popolata una tantum (match per nome+nazione, poi verifica manuale).
-- Lo script di scoring legge questa corrispondenza.
-- ---------------------------------------------------------------------
alter table players add column if not exists api_id bigint unique;
create index if not exists idx_players_api on players(api_id);

-- Vista comoda usata dallo scoring (player_map): solo chi ha api_id.
create or replace view player_map as
  select id, api_id from players where api_id is not null;

-- ---------------------------------------------------------------------
-- LINEUPS — SNAPSHOT per giornata: 11 titolari + 4 panchina + ruoli C/VC
-- Una riga per (roster, gameweek, player). 15 righe per utente per giornata.
-- E' la prova incontestabile di cosa era schierato.
-- ---------------------------------------------------------------------
create table if not exists lineups (
  id              bigint generated always as identity primary key,
  roster_id       uuid not null references rosters(id) on delete cascade,
  gameweek_id     integer not null references gameweeks(id),
  player_id       integer not null references players(id),
  slot            text not null check (slot in ('starter','bench')),
  bench_order     smallint,                      -- 1..4 ordine subentro per auto-sostituzione
  is_captain      boolean not null default false,
  is_vice         boolean not null default false,
  locked_at       timestamptz not null default now(),
  unique (roster_id, gameweek_id, player_id)
);
create index if not exists idx_lineups_rg on lineups(roster_id, gameweek_id);
-- Al massimo un capitano e un vice per (roster, gameweek):
create unique index if not exists idx_one_captain
  on lineups(roster_id, gameweek_id) where is_captain;
create unique index if not exists idx_one_vice
  on lineups(roster_id, gameweek_id) where is_vice;

-- ---------------------------------------------------------------------
-- PLAYER_GW_SCORES — punti del GIOCATORE REALE per giornata (da API)
-- Condiviso tra tutti gli utenti: una riga per (player, gameweek).
-- breakdown: dettaglio evento-per-evento (JSON) per la verifica/trasparenza.
-- ---------------------------------------------------------------------
create table if not exists player_gw_scores (
  player_id       integer not null references players(id),
  gameweek_id     integer not null references gameweeks(id),
  minutes         integer not null default 0,
  started         boolean not null default false,
  points          numeric(5,1) not null default 0,   -- punteggio "grezzo" del ruolo (senza capitano)
  breakdown       jsonb,                              -- es: {"goal":1,"assist":0,"clean_sheet":true,...}
  is_final        boolean not null default false,     -- false = live, true = congelato a giornata chiusa
  updated_at      timestamptz not null default now(),
  primary key (player_id, gameweek_id)
);

-- ---------------------------------------------------------------------
-- USER_GW_SCORES — punti dell'UTENTE per giornata (derivati)
-- gw_points: somma degli schierati con moltiplicatore capitano/vice applicato.
-- total_points: cumulativo fino a questa giornata (base della classifica).
-- ---------------------------------------------------------------------
create table if not exists user_gw_scores (
  roster_id       uuid not null references rosters(id) on delete cascade,
  gameweek_id     integer not null references gameweeks(id),
  gw_points       numeric(6,1) not null default 0,
  total_points    numeric(7,1) not null default 0,
  captain_points  numeric(6,1) not null default 0,    -- per il tie-breaker #1
  is_final        boolean not null default false,
  updated_at      timestamptz not null default now(),
  primary key (roster_id, gameweek_id)
);
create index if not exists idx_ugs_gw_total on user_gw_scores(gameweek_id, total_points desc);

-- ---------------------------------------------------------------------
-- TRANSFERS — log dei cambi nelle finestre transfer
-- refund: 50% del price_paid se out_player era di nazionale eliminata.
-- ---------------------------------------------------------------------
create table if not exists transfers (
  id              bigint generated always as identity primary key,
  roster_id       uuid not null references rosters(id) on delete cascade,
  gameweek_id     integer not null references gameweeks(id),
  out_player_id   integer not null references players(id),
  in_player_id    integer not null references players(id),
  out_price       numeric(5,1) not null,
  in_price        numeric(5,1) not null,
  refund          numeric(5,1) not null default 0,   -- 50% se eliminato, altrimenti 0
  was_eliminated  boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists idx_transfers_roster on transfers(roster_id);

-- ---------------------------------------------------------------------
-- NATIONS_PROGRESS — stato di avanzamento di ogni nazionale nel torneo
-- Serve a: rilevare eliminazioni (per il rimborso 50%) e alimentare
-- le classifiche speciali "Nation Picker" / "Team Spirit".
-- ---------------------------------------------------------------------
create table if not exists nations_progress (
  team_code       text primary key references teams(code),
  reached_stage   text not null default 'group'
                    check (reached_stage in ('group','r32','r16','qf','sf','final','winner')),
  eliminated      boolean not null default false,
  eliminated_gw   integer references gameweeks(id),
  updated_at      timestamptz not null default now()
);

-- =====================================================================
-- LA CLASSIFICA NON E' UNA TABELLA: e' una query sull'ultima giornata.
-- Esempio (classifica generale corrente):
--
--   select r.id, u.display_name, u.x_handle, s.total_points
--   from user_gw_scores s
--   join rosters r on r.id = s.roster_id
--   join users   u on u.id = r.user_id
--   where s.gameweek_id = (select max(id) from gameweeks where status='closed')
--   order by s.total_points desc, s.captain_points desc;
--
-- Cosi' la classifica e' sempre coerente, senza tabelle da sincronizzare.
-- =====================================================================
