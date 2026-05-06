create or replace function public.update_trip_member_profile(member_id_input uuid, profile_input jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_trip_id uuid;
begin
  select trip_id into target_trip_id
  from public.trip_members
  where id = member_id_input;

  if target_trip_id is null then
    raise exception 'Member not found';
  end if;

  if not exists (
    select 1
    from public.trips t
    join public.profiles p on p.id = t.created_by
    where t.id = target_trip_id and p.user_id = auth.uid()
  ) then
    raise exception 'Only the trip creator can edit members';
  end if;

  update public.trip_members
  set
    name = coalesce(nullif(profile_input->>'name', ''), name),
    phone = nullif(profile_input->>'phone', ''),
    avatar_color = coalesce(nullif(profile_input->>'avatar_color', ''), avatar_color),
    avatar_url = case
      when profile_input ? 'avatar_url' then nullif(profile_input->>'avatar_url', '')
      else avatar_url
    end
  where id = member_id_input;
end;
$$;

grant execute on function public.update_trip_member_profile(uuid, jsonb) to authenticated;

create or replace function public.delete_trip_member_as_creator(member_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_trip_id uuid;
  target_role text;
begin
  select trip_id, role into target_trip_id, target_role
  from public.trip_members
  where id = member_id_input;

  if target_trip_id is null then
    raise exception 'Member not found';
  end if;

  if target_role = 'owner' then
    raise exception 'Trip owner cannot be removed';
  end if;

  if not exists (
    select 1
    from public.trips t
    join public.profiles p on p.id = t.created_by
    where t.id = target_trip_id and p.user_id = auth.uid()
  ) then
    raise exception 'Only the trip creator can delete members';
  end if;

  if exists (select 1 from public.expenses where paid_by_member_id = member_id_input) then
    raise exception 'Member is already used in expenses';
  end if;

  if exists (select 1 from public.expense_splits where member_id = member_id_input) then
    raise exception 'Member is already used in expense splits';
  end if;

  delete from public.trip_members where id = member_id_input;
end;
$$;

grant execute on function public.delete_trip_member_as_creator(uuid) to authenticated;

notify pgrst, 'reload schema';
