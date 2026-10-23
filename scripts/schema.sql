-- Run in Supabase SQL editor:
-- alter table call_logs add column if not exists mood text;
-- alter table call_logs add column if not exists summary text;
-- alter table call_logs add column if not exists emergency boolean default false;
-- alter table call_logs add column if not exists sms_sent boolean default false;

-- Setu Supabase schema (documentation)

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  name text,
  medications text,
  reminder_time text,
  family_phone text,
  onboarded boolean not null default false,
  location text,
  created_at timestamptz not null default now()
);

create table if not exists call_logs (
  id uuid primary key default gen_random_uuid(),
  call_id text,
  patient_name text,
  status text,
  medication_taken text,
  action_required text,
  concern text,
  transcript text,
  duration integer,
  mood text,
  summary text,
  emergency boolean default false,
  sms_sent boolean default false,
  created_at timestamptz not null default now()
);
