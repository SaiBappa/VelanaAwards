
-- 1. Create Guests Table
create table if not exists public.guests (
  id text primary key,
  name text not null,
  email text,
  country_code text,
  mobile text,
  organization text,
  designation text,
  award_category text default 'Not an Award Recipient',
  rsvp_date timestamp with time zone default now(),
  checked_in boolean default false,
  check_in_time timestamp with time zone,
  invitation_sent boolean default false,
  invitation_sent_at timestamp with time zone,
  rsvp_confirmed boolean default false
);

-- Enable RLS for Guests (Adjust policies as needed for your auth model)
alter table public.guests enable row level security;

create policy "Enable all access for guests table"
  on public.guests for all
  using (true)
  with check (true);


-- 2. Create Guest Categories Table
create table if not exists public.guest_categories (
  name text primary key
);

-- Enable RLS for Categories
alter table public.guest_categories enable row level security;

create policy "Enable all access for guest_categories"
  on public.guest_categories for all
  using (true)
  with check (true);

-- 3. Seed Default Categories
insert into public.guest_categories (name) values
  ('Not an Award Recipient'),
  ('Nominee / Partner'),
  ('VIP'),
  ('Media'),
  ('Organizing Team'),
  ('Government Official'),
  ('Sponsor')
on conflict (name) do nothing;
