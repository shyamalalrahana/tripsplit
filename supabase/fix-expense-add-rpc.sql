create or replace function public.add_trip_expense(expense_input jsonb, split_input jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_expense_id uuid;
  target_trip_id uuid := (expense_input->>'trip_id')::uuid;
  payer_id uuid := (expense_input->>'paid_by_member_id')::uuid;
  current_profile_id uuid;
  split_item jsonb;
begin
  if not exists (select 1 from public.trips where id = target_trip_id) then
    raise exception 'Trip not found';
  end if;

  if not exists (select 1 from public.trip_members where id = payer_id and trip_id = target_trip_id) then
    raise exception 'Payer is not a trip member';
  end if;

  for split_item in select * from jsonb_array_elements(split_input)
  loop
    if not exists (
      select 1
      from public.trip_members
      where id = (split_item->>'member_id')::uuid and trip_id = target_trip_id
    ) then
      raise exception 'Split member is not in this trip';
    end if;
  end loop;

  select id into current_profile_id
  from public.profiles
  where user_id = auth.uid()
  limit 1;

  insert into public.expenses (
    trip_id,
    title,
    amount,
    category,
    paid_by_member_id,
    expense_date,
    notes,
    receipt_url,
    created_by
  )
  values (
    target_trip_id,
    expense_input->>'title',
    (expense_input->>'amount')::numeric,
    coalesce(expense_input->>'category', 'Other'),
    payer_id,
    coalesce(nullif(expense_input->>'expense_date', '')::timestamptz, now()),
    nullif(expense_input->>'notes', ''),
    nullif(expense_input->>'receipt_url', ''),
    current_profile_id
  )
  returning id into new_expense_id;

  for split_item in select * from jsonb_array_elements(split_input)
  loop
    insert into public.expense_splits (
      expense_id,
      member_id,
      split_amount,
      split_percentage,
      split_type
    )
    values (
      new_expense_id,
      (split_item->>'member_id')::uuid,
      (split_item->>'split_amount')::numeric,
      nullif(split_item->>'split_percentage', '')::numeric,
      coalesce(split_item->>'split_type', 'equal')
    );
  end loop;

  delete from public.settlements where trip_id = target_trip_id;

  return new_expense_id;
end;
$$;

grant execute on function public.add_trip_expense(jsonb, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
