-- Top-owned players view for the live stream overlay (/public/stream/state → owns).
-- roster_players.active = true means the player is currently in a squad.
drop view if exists most_owned;

create view most_owned as
  select p.name, count(*)::int as owned
  from roster_players rp
  join players p on p.id = rp.player_id
  where rp.active = true
  group by p.name
  order by owned desc;
