alter table public.profiles add column if not exists avatar_url text;
alter table public.trip_members add column if not exists avatar_url text;

notify pgrst, 'reload schema';
