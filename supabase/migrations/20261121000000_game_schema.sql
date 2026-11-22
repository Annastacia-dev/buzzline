-- Buzzline tables live in the timetracker project's public schema, prefixed buzz_ to keep them apart.
-- Buzzline game state. Only the Next.js server touches these tables (with the secret key);
-- browsers never query them directly. RLS is on with no policies, so the public API key gets nothing.

create table public.buzz_games (
  pin         text primary key check (pin ~ '^\d{6}$'),
  host_token  text not null,
  quiz        jsonb not null,
  state       text not null default 'lobby'
              check (state in ('lobby', 'question', 'reveal', 'leaderboard', 'end')),
  q_index     int not null default -1,
  q_start     timestamptz,          -- when answers open for the current question
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.buzz_players (
  id         uuid primary key default gen_random_uuid(),
  pin        text not null references public.buzz_games (pin) on delete cascade,
  token      text not null,
  name       text not null check (char_length(name) between 1 and 16),
  score      int not null default 0,
  streak     int not null default 0,
  rank       int not null default 0,
  prev_rank  int not null default 0,
  answer     jsonb,                 -- { q, choice, ms } for the latest answered question
  last       jsonb,                 -- result of the last revealed question
  joined_at  timestamptz not null default now()
);

create unique index buzz_players_pin_name_key on public.buzz_players (pin, lower(name));
create index buzz_players_pin_idx on public.buzz_players (pin);
create index buzz_games_updated_at_idx on public.buzz_games (updated_at);

alter table public.buzz_games enable row level security;
alter table public.buzz_players enable row level security;

-- Scores a question atomically. Locks the game row so two simultaneous callers
-- (timer expiry + last answer) can't both score it. Returns false if already scored.
create or replace function public.buzz_end_question(p_pin text, p_q int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  g        public.buzz_games;
  q        jsonb;
  t_ms     numeric;
  correct  int;
  mult     int;
begin
  select * into g from public.buzz_games where pin = p_pin for update;
  if not found or g.state <> 'question' or g.q_index <> p_q then
    return false;
  end if;

  q       := g.quiz -> 'questions' -> p_q;
  t_ms    := (q ->> 'time')::numeric * 1000;
  correct := (q ->> 'correct')::int;
  mult    := case when coalesce((q ->> 'double')::boolean, false) then 2 else 1 end;

  with s as (
    select p.id, p.streak,
           (p.answer is not null and (p.answer ->> 'q')::int = p_q) as answered,
           (p.answer is not null and (p.answer ->> 'q')::int = p_q
              and (p.answer ->> 'choice')::int = correct) as ok,
           least(greatest(coalesce((p.answer ->> 'ms')::numeric, 0), 0), t_ms) as ms
    from public.buzz_players p
    where p.pin = p_pin
  ), pts as (
    select s.id, s.ok, s.answered,
           -- 1000 for an instant answer down to 500 at the buzzer, x2 on double rounds,
           -- plus +100 per previous answer in the streak (max +500).
           case when s.ok then (round(1000 * (1 - s.ms / t_ms / 2)) * mult)::int + least(s.streak, 5) * 100 else 0 end as gained,
           case when s.ok then least(s.streak, 5) * 100 else 0 end as bonus
    from s
  )
  update public.buzz_players p
     set score     = p.score + pts.gained,
         streak    = case when pts.ok then p.streak + 1 else 0 end,
         last      = jsonb_build_object('correct', pts.ok, 'points', pts.gained, 'bonus', pts.bonus, 'missed', not pts.answered),
         prev_rank = p.rank
    from pts
   where p.id = pts.id;

  with r as (
    select id, row_number() over (order by score desc, joined_at asc) as rn
    from public.buzz_players where pin = p_pin
  )
  update public.buzz_players p set rank = r.rn from r where p.id = r.id;

  update public.buzz_games set state = 'reveal', updated_at = now() where pin = p_pin;
  return true;
end;
$$;

-- Only the server (service role) may call it.
revoke all on function public.buzz_end_question(text, int) from public, anon, authenticated;
grant execute on function public.buzz_end_question(text, int) to service_role;
