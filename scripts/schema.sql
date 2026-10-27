-- Run in Supabase SQL editor:
-- create table if not exists organizations (
--   id uuid primary key default gen_random_uuid(),
--   name text not null,
--   type text not null,
--   access_code text not null unique,
--   created_at timestamptz not null default now()
-- );
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

-- Setu Supabase schema (documentation)

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  access_code text not null unique,
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
  sms_sent boolean default false,
  org_id uuid references organizations(id),
  created_at timestamptz not null default now()
);
