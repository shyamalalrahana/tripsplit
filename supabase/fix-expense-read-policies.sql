drop policy if exists "expenses select trip members" on public.expenses;
create policy "expenses select trip members" on public.expenses
  for select using (
    public.is_trip_member(trip_id)
    or exists (select 1 from public.trips t where t.id = trip_id and t.invite_code is not null)
  );

drop policy if exists "splits select trip members" on public.expense_splits;
create policy "splits select trip members" on public.expense_splits
  for select using (
    exists (
      select 1
      from public.expenses e
      join public.trips t on t.id = e.trip_id
      where e.id = expense_id
        and (public.is_trip_member(e.trip_id) or t.invite_code is not null)
    )
  );

drop policy if exists "settlements delete trip members" on public.settlements;
create policy "settlements delete trip members" on public.settlements
  for delete using (
    public.is_trip_member(trip_id)
    or exists (select 1 from public.trips t where t.id = trip_id and t.invite_code is not null)
  );

notify pgrst, 'reload schema';
