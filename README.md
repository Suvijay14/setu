# Setu (सेतु)

AI-powered Hindi voice follow-up for Indian hospitals.

## What it does

- **Outbound:** Calls discharged patients daily in Hindi, checks medication adherence
- **Inbound:** AI receptionist answers clinic calls, books appointments
- **Dashboard:** Risk stratification, escalation alerts, SMS to clinic assistant

## Live demo

https://setu-beige-beta.vercel.app

- Family dashboard: https://setu-beige-beta.vercel.app/dashboard
- Family setup: https://setu-beige-beta.vercel.app/setup
- Hospital org portal: https://setu-beige-beta.vercel.app/org

## Hospital login (org dashboard)

Open the org portal and enter the organization access code:

| Organization   | Access code   |
|----------------|---------------|
| **Demo Clinic** | **`DEMO-2026`** |

Production clinics use their own code from the Supabase `organizations` table.

## Try the inbound agent

Call **+91-8064-262082** and speak in Hindi.

## Stack

Bolna Voice AI · Sarvam Bulbul v3 (TTS) · Sarvam Saaras v3 (STT) · Groq qwen/qwen3.8-27b · Next.js · Supabase · Twilio · Vercel

## Built for Bolna Buildathon 2026
