-- Each player picks an avatar (an index into AVATARS in lib/avatars.ts). One is assigned on join.
alter table public.buzz_players
  add column avatar smallint not null default 0 check (avatar between 0 and 23);
