# Brightpath · LVAEP tutor workspace

A mobile-friendly tutor workspace for recording tutoring sessions, keeping student achievement goals, and preparing a student attendance and achievement report for each month.

## Start locally

```sh
npm install
npm run dev
```

The app opens in demo mode with sample students and sessions. Demo data is saved in the browser's local storage. Clear `lvaep-students-v1` and `lvaep-sessions-v1` in local storage to restore the sample data.

## Supabase setup

The chosen production stack is React, TypeScript, Vite, Tailwind, Supabase/PostgreSQL, and Vercel. Copy `.env.example` to `.env.local`, add the Supabase project URL and anon key, and run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL editor. The schema uses Supabase Auth user IDs to scope student and session rows with row-level security.

When both Supabase environment values are present, tutor sign-in/sign-up and row persistence are enabled. New accounts can only access rows owned by their Auth user ID through row-level security. Without those credentials, the app stays in local demo mode. Never put a Supabase service-role key in the browser.

## Features

- Overview of monthly hours, session count, active students, and recent activity
- Student profiles with monthly session history and edit/delete support
- Quick session logging with date, hours, and optional notes
- Student achievement goal checklist based on the LVAEP form categories
- End tutoring with reason, days, and times; reactivate a student from their profile
- Report preview organized by the selected month, with a print-to-PDF action

The report preview reproduces the form's fields and sections. It is a generated report layout, not an overlay on the attached original PDF template.
