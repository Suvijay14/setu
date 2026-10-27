-- Run once in Supabase SQL editor (existing projects).
-- CREATE TABLE IF NOT EXISTS does not add columns to call_logs that already exists.

alter table patients add column if not exists is_active boolean default true;

alter table call_logs add column if not exists agent_type text default 'b2c';
alter table call_logs add column if not exists protocol text;
alter table call_logs add column if not exists conversation_clarity text;
alter table call_logs add column if not exists medication_names_used jsonb;
alter table call_logs add column if not exists confusion_detected boolean default false;

create table if not exists training_logs (
  id uuid default gen_random_uuid() primary key,
  analysis_date timestamptz default now(),
  calls_analyzed integer,
  findings jsonb,
  applied_to_b2b boolean default false,
  created_at timestamptz default now()
);
