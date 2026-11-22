-- Records an answer in one round trip: checks timing, saves it, and scores the question if it was the last one.
-- Locks the game row so simultaneous answers queue up and the last one always sees everyone else's.
-- p_arrived is when the answer reached the server, so network time to the database doesn't cost points.
-- Returns: ok | ended | not_open | too_late | bad_choice | already | not_in_game | no_game
create or replace function public.buzz_answer(p_pin text, p_id text, p_token text, p_choice int, p_arrived timestamptz)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  g       public.buzz_games;
  q       jsonb;
  t_ms    numeric;
  ms      numeric;
  n       int;
begin
  select * into g from public.buzz_games where pin = p_pin for update;
  if not found then return 'no_game'; end if;
  if g.state <> 'question' then return 'too_late'; end if;

  q    := g.quiz -> 'questions' -> g.q_index;
  t_ms := (q ->> 'time')::numeric * 1000;
  ms   := extract(epoch from (p_arrived - g.q_start)) * 1000;
  if ms < 0 then return 'not_open'; end if;
  if ms > t_ms + 300 then
    perform public.buzz_end_question(p_pin, g.q_index); -- the buzzer has gone: close it now
    return 'too_late';
  end if;
  if p_choice is null or p_choice < 0 or p_choice >= jsonb_array_length(q -> 'answers') then return 'bad_choice'; end if;

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

revoke all on function public.buzz_answer(text, text, text, int, timestamptz) from public, anon, authenticated;
grant execute on function public.buzz_answer(text, text, text, int, timestamptz) to service_role;
