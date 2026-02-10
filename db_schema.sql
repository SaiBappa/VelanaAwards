
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

-- Enable RLS for Guests
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

-- 4. Create Email Settings Table
-- We enforce a single row with id=1 to act as a global configuration
create table if not exists public.email_settings (
  id int primary key default 1,
  subject text not null,
  banner_url text,
  message_body text not null,
  updated_at timestamp with time zone default now(),
  constraint single_row_config check (id = 1)
);

-- Enable RLS for Email Settings
alter table public.email_settings enable row level security;

create policy "Enable all access for email_settings"
  on public.email_settings for all
  using (true)
  with check (true);

-- Seed Default Email Template
insert into public.email_settings (id, subject, banner_url, message_body)
values (
  1, 
  'You are invited: Velana Awards 2026', 
  'https://images.unsplash.com/photo-1540206351-d6465b3ac5c1?q=80&w=2832', 
  '<p>Dear {name},</p><p>We are honored to invite you to the Velana Awards 2026. Join us for a night of celebration at Crossroads Maldives.</p><p>Please confirm your attendance by clicking the button below.</p>'
)
on conflict (id) do nothing;
