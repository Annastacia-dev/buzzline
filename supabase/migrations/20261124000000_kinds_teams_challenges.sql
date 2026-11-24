-- Question types, team mode and self-paced challenge links.
--
-- Question kinds (quiz.questions[i].kind, default 'choice'):
--   choice  pick one of 2–4 answers (as before)
--   poll    pick one, no right answer: nobody scores and streaks are left alone
--   type    type the answer; the server checks the text and sends choice 0 (right) or 1 (wrong)
--   order   put 2–4 items in order; the server checks the order and sends choice 0 (right) or 1 (wrong)
-- For type and order the stored `correct` is 0. Only the Next.js server can say a typed answer or an
-- order was right (p_kind), so a raw "choice 0" can't score them.

-- Team mode: 0 = everyone for themselves, 2–4 = that many teams. Players get the smallest team when they join.
alter table public.buzz_games add column teams smallint not null default 0 check (teams = 0 or teams between 2 and 4);
alter table public.buzz_players add column team smallint;

drop function if exists public.buzz_answer(text, text, text, int, timestamptz);

-- p_q: the question the answer was checked against (type/order), so a late answer can't land on the next one.
create or replace function public.buzz_answer(
  p_pin text, p_id text, p_token text, p_choice int, p_arrived timestamptz,
  p_q int default null, p_kind text default 'choice')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  g       public.buzz_games;
  q       jsonb;
  kind    text;
  t_ms    numeric;
  ms      numeric;
  n       int;
begin
  select * into g from public.buzz_games where pin = p_pin for update;
  if not found then return 'no_game'; end if;
  if g.state <> 'question' then return 'too_late'; end if;
  if p_q is not null and p_q <> g.q_index then return 'too_late'; end if;

  q    := g.quiz -> 'questions' -> g.q_index;
  kind := coalesce(q ->> 'kind', 'choice');
  t_ms := (q ->> 'time')::numeric * 1000;
  ms   := extract(epoch from (p_arrived - g.q_start)) * 1000;
  if ms < 0 then return 'not_open'; end if;
  if ms > t_ms + 300 then
    perform public.buzz_end_question(p_pin, g.q_index); -- the buzzer has gone: close it now
    return 'too_late';
  end if;
  if kind in ('type', 'order') then
    if p_kind is distinct from kind or p_choice is null or p_choice not in (0, 1) then return 'bad_choice'; end if;
  else
    if p_kind <> 'choice' or p_choice is null or p_choice < 0 or p_choice >= jsonb_array_length(q -> 'answers') then return 'bad_choice'; end if;
  end if;

  update public.buzz_players
     set answer = jsonb_build_object('q', g.q_index, 'choice', p_choice, 'ms', round(least(ms, t_ms)))
   where id::text = p_id and token = p_token and pin = p_pin
     and (answer is null or (answer ->> 'q')::int <> g.q_index);
  get diagnostics n = row_count;
  if n = 0 then
    if exists (select 1 from public.buzz_players where id::text = p_id and token = p_token and pin = p_pin) then
      return 'already';
    end if;
    return 'not_in_game';
  end if;

  if not exists (select 1 from public.buzz_players
                  where pin = p_pin and (answer is null or (answer ->> 'q')::int <> g.q_index)) then
    perform public.buzz_end_question(p_pin, g.q_index);
    return 'ended';
  end if;
  return 'ok';
end;
$$;

revoke all on function public.buzz_answer(text, text, text, int, timestamptz, int, text) from public, anon, authenticated;
grant execute on function public.buzz_answer(text, text, text, int, timestamptz, int, text) to service_role;

-- Same as before, except polls: nobody scores and streaks carry on.
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
  poll     boolean;
begin
  select * into g from public.buzz_games where pin = p_pin for update;
  if not found or g.state <> 'question' or g.q_index <> p_q then
    return false;
  end if;

  q       := g.quiz -> 'questions' -> p_q;
  t_ms    := (q ->> 'time')::numeric * 1000;
  correct := (q ->> 'correct')::int;
  mult    := case when coalesce((q ->> 'double')::boolean, false) then 2 else 1 end;
  poll    := coalesce(q ->> 'kind', 'choice') = 'poll';

  with s as (
    select p.id, p.streak,
           (p.answer is not null and (p.answer ->> 'q')::int = p_q) as answered,
           (p.answer ->> 'choice')::int as choice,
           least(greatest(coalesce((p.answer ->> 'ms')::numeric, 0), 0), t_ms) as ms
    from public.buzz_players p
    where p.pin = p_pin
  ), pts as (
    select s.id, s.answered, s.choice, s.ms,
           (not poll and s.answered and s.choice = correct) as ok,
           -- 1000 for an instant answer down to 500 at the buzzer, x2 on double rounds,
           -- plus +100 per previous answer in the streak (max +500).
           case when not poll and s.answered and s.choice = correct
                then (round(1000 * (1 - s.ms / t_ms / 2)) * mult)::int + least(s.streak, 5) * 100 else 0 end as gained,
           case when not poll and s.answered and s.choice = correct then least(s.streak, 5) * 100 else 0 end as bonus
    from s
  )
  update public.buzz_players p
     set score     = p.score + pts.gained,
         streak    = case when poll then p.streak when pts.ok then p.streak + 1 else 0 end,
         last      = jsonb_build_object('correct', pts.ok, 'points', pts.gained, 'bonus', pts.bonus, 'missed', not pts.answered, 'poll', poll),
         prev_rank = p.rank,
         history   = p.history || jsonb_build_array(jsonb_build_object(
                       'q', p_q,
                       'choice', case when pts.answered then pts.choice end,
                       'ms', case when pts.answered then round(pts.ms) end,
                       'correct', pts.ok,
                       'points', pts.gained))
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

revoke all on function public.buzz_end_question(text, int) from public, anon, authenticated;
grant execute on function public.buzz_end_question(text, int) to service_role;

-- Challenge links (/c/<id>): a quiz anyone can play alone, any time, against a shared leaderboard.
-- Server only, like the other buzz_ tables: RLS on, no policies.
create table public.buzz_challenges (
  id          text primary key check (id ~ '^[A-Za-z0-9]{10}$'),
  quiz        jsonb not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 days'
);

-- One run per player. q_start is when answers open for q_index; answered_q is the last question answered.
create table public.buzz_challenge_runs (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  text not null references public.buzz_challenges (id) on delete cascade,
  token         text not null,
  name          text not null check (char_length(name) between 1 and 16),
  avatar        int not null default 0,
  score         int not null default 0,
  streak        int not null default 0,
  q_index       int not null default 0,
  q_start       timestamptz not null,
  answered_q    int not null default -1,
  last          jsonb,
  history       jsonb not null default '[]'::jsonb,
  finished_at   timestamptz,
  created_at    timestamptz not null default now()
);
create unique index buzz_challenge_runs_name_key on public.buzz_challenge_runs (challenge_id, lower(name));
create index buzz_challenge_runs_board_idx on public.buzz_challenge_runs (challenge_id, score desc);
create index buzz_challenges_expires_idx on public.buzz_challenges (expires_at);

alter table public.buzz_challenges enable row level security;
alter table public.buzz_challenge_runs enable row level security;

-- Sync links: a browser's quiz library, kept on the server so the same private link opens it on any device.
-- The row key is a SHA-256 of the secret in the link, so the table alone can't be used to open anyone's quizzes.
create table public.buzz_sync_libraries (
  key         text primary key check (key ~ '^[0-9a-f]{64}$'),
  quizzes     jsonb not null default '[]'::jsonb,   -- [{ ...quiz, id, updated }]
  deleted     jsonb not null default '[]'::jsonb,   -- [{ id, at }] so a delete on one device reaches the others
  updated_at  timestamptz not null default now()
);
alter table public.buzz_sync_libraries enable row level security;
