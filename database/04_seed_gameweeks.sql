-- =====================================================================
-- WC2026 — Seed GAMEWEEKS (8 giornate fantasy)
-- Date basate sul calendario ufficiale per fase (UTC).
-- locks_at = primo calcio d'inizio della giornata (deadline schieramento unica).
-- I valori locks_at/closes_at andranno rifiniti al minuto con i fixtures reali;
-- qui usiamo l'inizio/fine fase. Orari indicativi in UTC.
-- =====================================================================
begin;

insert into gameweeks (id,label,stage,opens_at,locks_at,closes_at,transfer_open,status) values
 (1,'Gironi — 1ª giornata','group','2026-06-08T00:00:00Z','2026-06-11T19:00:00Z','2026-06-17T23:59:00Z', true ,'scheduled'),
 (2,'Gironi — 2ª giornata','group','2026-06-17T00:00:00Z','2026-06-18T16:00:00Z','2026-06-23T23:59:00Z', false,'scheduled'),
 (3,'Gironi — 3ª giornata','group','2026-06-23T00:00:00Z','2026-06-24T16:00:00Z','2026-06-27T23:59:00Z', false,'scheduled'),
 (4,'Round of 32','r32','2026-06-27T00:00:00Z','2026-06-28T16:00:00Z','2026-07-03T23:59:00Z', true ,'scheduled'),
 (5,'Ottavi di finale','r16','2026-07-03T00:00:00Z','2026-07-04T16:00:00Z','2026-07-07T23:59:00Z', true ,'scheduled'),
 (6,'Quarti di finale','qf','2026-07-07T00:00:00Z','2026-07-09T16:00:00Z','2026-07-11T23:59:00Z', true ,'scheduled'),
 (7,'Semifinali','sf','2026-07-11T00:00:00Z','2026-07-14T16:00:00Z','2026-07-15T23:59:00Z', true ,'scheduled'),
 (8,'Finale','final','2026-07-15T00:00:00Z','2026-07-18T16:00:00Z','2026-07-19T23:59:00Z', true ,'scheduled')
on conflict (id) do update set
  label=excluded.label, stage=excluded.stage, opens_at=excluded.opens_at,
  locks_at=excluded.locks_at, closes_at=excluded.closes_at,
  transfer_open=excluded.transfer_open;

commit;

-- Nota: GW1 e GW4 hanno transfer_open=true come "finestra iniziale" e "post-gironi".
-- In pratica i transfer si gestiscono tra una fase e l'altra; regola di prodotto
-- (numero N di transfer per finestra) da definire lato applicazione.
