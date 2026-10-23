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
  created_at timestamptz not null default now()
);
