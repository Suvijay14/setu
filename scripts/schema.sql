-- Run in Supabase SQL editor:
-- create table if not exists organizations (
--   id uuid primary key default gen_random_uuid(),
--   name text not null,
--   type text not null,
--   access_code text not null unique,
--   created_at timestamptz not null default now()
-- );
-- alter table organizations add column if not exists pharmacy_phone text;
-- alter table organizations add column if not exists admin_phone text;
-- alter table call_logs add column if not exists escalation_flag boolean default false;
-- alter table call_logs add column if not exists refill_needed boolean default false;
-- alter table call_logs add column if not exists refill_medicine text;
-- alter table patients add column if not exists org_id uuid references organizations(id);
-- alter table call_logs add column if not exists org_id uuid references organizations(id);
-- alter table patients add column if not exists protocol text;
-- alter table patients add column if not exists is_active boolean default true;
-- alter table patients add column if not exists child_summary_frequency text default 'daily';
-- alter table patients add column if not exists child_summary_time text default '20:00';
-- alter table patients add column if not exists last_summary_sent_at timestamptz;
-- alter table patients add column if not exists family_message text;
-- alter table patients add column if not exists family_message_sent boolean default false;
-- alter table patients add column if not exists last_call_notes text;
-- alter table patients add column if not exists call_streak integer default 0;
-- alter table call_logs add column if not exists mood text;
-- alter table call_logs add column if not exists summary text;
-- alter table call_logs add column if not exists emergency boolean default false;
-- alter table call_logs add column if not exists sms_sent boolean default false;
-- alter table call_logs add column if not exists agent_type text;
-- alter table call_logs add column if not exists protocol text;
-- create table if not exists training_logs (
--   id uuid default gen_random_uuid() primary key,
--   analysis_date timestamptz default now(),
--   calls_analyzed integer,
--   findings jsonb,
--   applied_to_b2b boolean default false,
--   created_at timestamptz default now()
-- );

-- Setu Supabase schema (documentation)

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  access_code text not null unique,
  pharmacy_phone text,
  admin_phone text,
  created_at timestamptz not null default now()
);

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  name text,
  medications text,
  reminder_time text,
  family_phone text,
  onboarded boolean not null default false,
  location text,
  last_call_notes text,
  call_streak integer not null default 0,
  family_message text,
  family_message_sent boolean not null default false,
  child_summary_frequency text not null default 'daily',
  child_summary_time text not null default '20:00',
  last_summary_sent_at timestamptz,
  org_id uuid references organizations(id),
  protocol text,
  is_active boolean not null default true,
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
  escalation_flag boolean not null default false,
  sms_sent boolean default false,
  org_id uuid references organizations(id),
  refill_needed boolean not null default false,
  refill_medicine text,
  agent_type text,
  protocol text,
  created_at timestamptz not null default now()
);

create table if not exists training_logs (
  id uuid default gen_random_uuid() primary key,
  analysis_date timestamptz default now(),
  calls_analyzed integer,
  findings jsonb,
  applied_to_b2b boolean default false,
  created_at timestamptz default now()
);

-- Org dashboard Realtime (run once in Supabase SQL editor):
-- alter publication supabase_realtime add table call_logs;
-- alter table call_logs enable row level security;
-- create policy "call_logs_anon_select_org" on call_logs
--   for select to anon
--   using (org_id is not null);
-- (Pilot policy: tighten with Supabase Auth + org-scoped JWT for production.)
