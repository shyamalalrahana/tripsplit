# TripSplits

TripSplits is a mobile-first trip money manager built with Next.js, Supabase, and Vercel. Users can log in, create trip groups, invite friends, add shared expenses, calculate balances, and settle with UPI QR payment links.

## Stack

- Next.js
- Supabase Auth
- Supabase PostgreSQL
- Vercel
- UPI payment links and QR codes

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Add:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=https://tripsplits.in
```

5. Install dependencies:

```bash
npm install
```

6. Run locally:

```bash
npm run dev
```

## Vercel Deployment

Add the same environment variables in Vercel Project Settings, then deploy from GitHub.

## MVP Payment Note

UPI QR codes help users pay with Google Pay, PhonePe, Paytm, BHIM, or any UPI app. TripSplits does not automatically verify bank/payment completion yet. Sender and receiver confirmation are manual for this MVP.
