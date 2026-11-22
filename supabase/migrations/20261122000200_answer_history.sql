-- Keeps every scored question per player, for the end-of-game analytics.
-- history: [{ q, choice, ms, correct, points }] — choice/ms are null when the player didn't answer.
alter table public.buzz_players add column history jsonb not null default '[]'::jsonb;

-- Same as before, plus appending each player's result for this question to history.
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
           (p.answer ->> 'choice')::int as choice,
           least(greatest(coalesce((p.answer ->> 'ms')::numeric, 0), 0), t_ms) as ms
    from public.buzz_players p
    where p.pin = p_pin
  ), pts as (
    select s.id, s.answered, s.choice, s.ms,
           (s.answered and s.choice = correct) as ok,
           -- 1000 for an instant answer down to 500 at the buzzer, x2 on double rounds,
           -- plus +100 per previous answer in the streak (max +500).
           case when s.answered and s.choice = correct
                then (round(1000 * (1 - s.ms / t_ms / 2)) * mult)::int + least(s.streak, 5) * 100 else 0 end as gained,
           case when s.answered and s.choice = correct then least(s.streak, 5) * 100 else 0 end as bonus
    from s
  )
  update public.buzz_players p
     set score     = p.score + pts.gained,
         streak    = case when pts.ok then p.streak + 1 else 0 end,
         last      = jsonb_build_object('correct', pts.ok, 'points', pts.gained, 'bonus', pts.bonus, 'missed', not pts.answered),
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
