-- Appointments booked via inbound voice or escalation flows.
-- Apply manually in Supabase SQL Editor unless you use Supabase CLI migrations.

CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  doctor TEXT DEFAULT 'Dr. Sharma',
  symptoms TEXT,
  preferred_time TEXT,
  source TEXT DEFAULT 'inbound', -- 'inbound' | 'escalation'
  status TEXT DEFAULT 'pending', -- 'pending' | 'confirmed' | 'cancelled'
  clinic_name TEXT DEFAULT 'Apollo Clinic, Delhi',
  created_at TIMESTAMPTZ DEFAULT now()
);
