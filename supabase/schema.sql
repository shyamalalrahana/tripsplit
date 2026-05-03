create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  upi_id text,
  avatar_color text default '#2563eb',
  created_at timestamptz default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  destination text,
  currency text not null default 'INR',
  start_date date,
  end_date date,
  trip_image_url text,
  created_by uuid references public.profiles(id) on delete set null,
  invite_code text unique not null default encode(gen_random_bytes(8), 'hex'),
  created_at timestamptz default now()
);

create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  phone text,
  upi_id text,
  avatar_color text default '#2563eb',
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'guest')),
  joined_at timestamptz default now(),
  unique(trip_id, profile_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null check (amount > 0),
  category text not null default 'Other',
  paid_by_member_id uuid not null references public.trip_members(id) on delete restrict,
  expense_date timestamptz not null default now(),
  notes text,
  receipt_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  member_id uuid not null references public.trip_members(id) on delete cascade,
  split_amount numeric(12,2) not null default 0,
  split_percentage numeric(7,4),
  split_type text not null default 'equal' check (split_type in ('equal', 'custom', 'percentage')),
  unique(expense_id, member_id)
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  from_member_id uuid not null references public.trip_members(id) on delete cascade,
  to_member_id uuid not null references public.trip_members(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'paid_by_sender', 'confirmed_by_receiver', 'settled')),
  payment_note text,
  paid_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz default now(),
  unique(trip_id, from_member_id, to_member_id, amount)
);

create index if not exists trips_invite_code_idx on public.trips(invite_code);
create index if not exists trip_members_trip_id_idx on public.trip_members(trip_id);
create index if not exists expenses_trip_id_idx on public.expenses(trip_id);
create index if not exists expense_splits_expense_id_idx on public.expense_splits(expense_id);
create index if not exists settlements_trip_id_idx on public.settlements(trip_id);

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;

create or replace function public.is_trip_member(target_trip uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members tm
    join public.profiles p on p.id = tm.profile_id
    where tm.trip_id = target_trip and p.user_id = auth.uid()
  );
$$;

create or replace function public.is_trip_admin(target_trip uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members tm
    join public.profiles p on p.id = tm.profile_id
    where tm.trip_id = target_trip and p.user_id = auth.uid() and tm.role in ('owner', 'admin')
  );
$$;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles
  for select using (user_id = auth.uid());

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert with check (user_id = auth.uid());

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "trips select members or invite" on public.trips;
create policy "trips select members or invite" on public.trips
  for select using (public.is_trip_member(id) or invite_code is not null);

drop policy if exists "trips insert authenticated" on public.trips;
create policy "trips insert authenticated" on public.trips
  for insert to authenticated with check (true);

drop policy if exists "trips update admin" on public.trips;
create policy "trips update admin" on public.trips
  for update using (public.is_trip_admin(id)) with check (public.is_trip_admin(id));

drop policy if exists "members select trip members or invite" on public.trip_members;
create policy "members select trip members or invite" on public.trip_members
  for select using (public.is_trip_member(trip_id) or true);

drop policy if exists "members insert invite join" on public.trip_members;
create policy "members insert invite join" on public.trip_members
  for insert with check (true);

drop policy if exists "members update own or admin" on public.trip_members;
create policy "members update own or admin" on public.trip_members
  for update using (
    public.is_trip_admin(trip_id)
    or exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

drop policy if exists "expenses select trip members" on public.expenses;
create policy "expenses select trip members" on public.expenses
  for select using (public.is_trip_member(trip_id));

drop policy if exists "expenses insert trip members" on public.expenses;
create policy "expenses insert trip members" on public.expenses
  for insert with check (public.is_trip_member(trip_id));

drop policy if exists "expenses update creator or admin" on public.expenses;
create policy "expenses update creator or admin" on public.expenses
  for update using (
    public.is_trip_admin(trip_id)
    or exists (select 1 from public.profiles p where p.id = created_by and p.user_id = auth.uid())
  );

drop policy if exists "expenses delete admin" on public.expenses;
create policy "expenses delete admin" on public.expenses
  for delete using (public.is_trip_admin(trip_id));

drop policy if exists "splits select trip members" on public.expense_splits;
create policy "splits select trip members" on public.expense_splits
  for select using (exists (select 1 from public.expenses e where e.id = expense_id and public.is_trip_member(e.trip_id)));

drop policy if exists "splits insert trip members" on public.expense_splits;
create policy "splits insert trip members" on public.expense_splits
  for insert with check (exists (select 1 from public.expenses e where e.id = expense_id and public.is_trip_member(e.trip_id)));

drop policy if exists "settlements select trip members" on public.settlements;
create policy "settlements select trip members" on public.settlements
  for select using (public.is_trip_member(trip_id));

drop policy if exists "settlements insert trip members" on public.settlements;
create policy "settlements insert trip members" on public.settlements
  for insert with check (public.is_trip_member(trip_id));

drop policy if exists "settlements update trip members" on public.settlements;
create policy "settlements update trip members" on public.settlements
  for update using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
