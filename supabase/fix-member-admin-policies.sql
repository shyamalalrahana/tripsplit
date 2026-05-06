drop policy if exists "members update own or admin" on public.trip_members;
drop policy if exists "members update creator only" on public.trip_members;
create policy "members update creator only" on public.trip_members
  for update using (
    exists (
      select 1
      from public.trips t
      join public.profiles p on p.id = t.created_by
      where t.id = trip_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.trips t
      join public.profiles p on p.id = t.created_by
      where t.id = trip_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "members delete admin or invite" on public.trip_members;
drop policy if exists "members delete creator only" on public.trip_members;
create policy "members delete creator only" on public.trip_members
  for delete using (
    role <> 'owner'
    and exists (
      select 1
      from public.trips t
      join public.profiles p on p.id = t.created_by
      where t.id = trip_id and p.user_id = auth.uid()
    )
  );
