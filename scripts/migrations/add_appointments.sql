-- Run once in Supabase SQL editor.

create table if not exists appointments (
  id uuid default gen_random_uuid() primary key,
  patient_name text not null,
  phone text not null,
  doctor text default 'Dr. Sharma',
  symptoms text,
  preferred_time text,
  source text default 'inbound',
  status text default 'pending',
  clinic_name text default 'Apollo Clinic, Delhi',
  created_at timestamptz default now()
);
