-- Usage events for the admin dashboard (/admin).
--
-- One row per thing worth counting: a page visit, a quiz made in the studio, a game hosted / started / finished,
-- a player joining, a challenge link made / played / finished, an AI quiz generated.
--
-- Privacy: no IP addresses, no cookies, no names. `visitor` is a hash of (server secret, day, IP, user agent),
-- so it counts unique visitors within a day but can't follow anyone from one day to the next or be reversed.
-- Server-only: RLS is on with no policies, and only the secret key (used by the API routes) can read or write.

create table public.buzz_events (
  id bigserial primary key,
  at timestamptz not null default now(),
  kind text not null,
  visitor text,
  path text,
  ref text,
  meta jsonb not null default '{}'::jsonb
);
create index buzz_events_kind_at on public.buzz_events (kind, at);
create index buzz_events_at on public.buzz_events (at);
alter table public.buzz_events enable row level security;

-- Everything the dashboard shows for a period, in one round trip. p_tz buckets the days in the admin's time zone.
create or replace function public.buzz_admin_stats(p_from timestamptz, p_to timestamptz, p_tz text default 'UTC')
returns jsonb
language sql
stable
set search_path = public
as $$
  with e as (
    select * from buzz_events where at >= p_from and at < p_to
  ),
  days as (
    select d::date as day
    from generate_series((p_from at time zone p_tz)::date, ((p_to - interval '1 second') at time zone p_tz)::date, interval '1 day') d
  ),
  daily as (
    select (at at time zone p_tz)::date as day,
      count(*) filter (where kind = 'visit') as visits,
      count(distinct visitor) filter (where kind = 'visit') as visitors,
      count(*) filter (where kind = 'quiz_created') as quizzes,
      count(distinct visitor) filter (where kind = 'quiz_created') as creators,
      count(*) filter (where kind = 'game_started') as games,
      count(*) filter (where kind = 'player_joined') as players,
      count(*) filter (where kind = 'challenge_run') as runs
    from e group by 1
  ),
  -- Unique people are counted per day (the hash changes daily), then summed over the period.
  uniq as (
    select kind, count(*) as n from (select distinct kind, (at at time zone p_tz)::date, visitor from e where visitor is not null) x group by kind
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'visits', (select count(*) from e where kind = 'visit'),
      'visitors', coalesce((select n from uniq where kind = 'visit'), 0),
      'quizzes', (select count(*) from e where kind = 'quiz_created'),
      'creators', coalesce((select n from uniq where kind = 'quiz_created'), 0),
      'hosted', (select count(*) from e where kind = 'game_hosted'),
      'hosts', coalesce((select n from uniq where kind = 'game_hosted'), 0),
      'games', (select count(*) from e where kind = 'game_started'),
      'finished', (select count(*) from e where kind = 'game_finished'),
      'players', (select count(*) from e where kind = 'player_joined'),
      'playersInGames', coalesce((select sum((meta->>'players')::int) from e where kind = 'game_started'), 0),
      'challenges', (select count(*) from e where kind = 'challenge_created'),
      'runs', (select count(*) from e where kind = 'challenge_run'),
      'runsFinished', (select count(*) from e where kind = 'challenge_finished'),
      'ai', (select count(*) from e where kind = 'ai_quiz')
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', days.day, 'visits', coalesce(visits, 0), 'visitors', coalesce(visitors, 0), 'quizzes', coalesce(quizzes, 0),
        'creators', coalesce(creators, 0), 'games', coalesce(games, 0), 'players', coalesce(players, 0), 'runs', coalesce(runs, 0)
      ) order by days.day), '[]'::jsonb)
      from days left join daily using (day)
    ),
    'sources', (
      select coalesce(jsonb_object_agg(s, n), '{}'::jsonb)
      from (select coalesce(meta->>'source', 'other') s, count(*) n from e where kind = 'quiz_created' group by 1) x
    ),
    'pages', (
      select coalesce(jsonb_agg(jsonb_build_object('path', path, 'visits', n, 'visitors', u) order by n desc), '[]'::jsonb)
      from (select path, count(*) n, count(distinct visitor) u from e where kind = 'visit' group by path order by n desc limit 12) x
    ),
    'referrers', (
      select coalesce(jsonb_agg(jsonb_build_object('ref', ref, 'visits', n) order by n desc), '[]'::jsonb)
      from (select ref, count(*) n from e where kind = 'visit' and ref is not null group by ref order by n desc limit 10) x
    )
  );
$$;
revoke all on function public.buzz_admin_stats(timestamptz, timestamptz, text) from public, anon, authenticated;
