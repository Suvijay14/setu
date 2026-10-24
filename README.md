# Setu — Phone-First AI Caregiver for India's Elderly

## What it does

One phone call. No smartphone needed. Setu calls elderly Indian parents daily, checks their medication, handles emergencies, finds nearby hospitals, and alerts family instantly via SMS.

## Demo

Live: https://setu-beige-beta.vercel.app  
Dashboard: https://setu-beige-beta.vercel.app/dashboard  
Setup: https://setu-beige-beta.vercel.app/setup

## Tech Stack

- Voice: Bolna AI (Hindi, inbound + outbound calls)
- Backend: Next.js 14 on Vercel
- Database: Supabase
- SMS: Twilio
- Intelligence: Groq (qwen/qwen3.8-27b) for transcript analysis
- Location: Nominatim (OpenStreetMap)

## How it works

1. Family registers parent at /setup (name, medicines, timing, location)
2. Setu calls parent daily at their set time
3. Parent confirms medicine in Hindi
4. If missed → SMS to family instantly
5. If emergency → urgent SMS with concern
6. Parent can ask about nearby hospitals/pharmacies → SMS with names + distance

## Built for Bolna Buildathon 2026

Solo build. 15 days.
