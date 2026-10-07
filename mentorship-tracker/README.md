# Mentorship Tracker

One weekly tracker for both TikTok Mentorship groups, Academy and Accelerator,
plus a private dashboard for Levi.

- `/` is the member side. Access code, then the weekly form, then the board.
- `/admin` is the mentor side. PIN protected, and the only place rows open.

Built with Next.js and Postgres. Runs on the Launch Club Vercel account, never
the Fortson one.

## How it works

**One link, two codes.** Academy and Accelerator get different access codes.
The code decides which program a member is in, so the form never asks and
nobody in Academy sees that Accelerator exists. Each group only sees its own
board.

**Orders on the board, dollars stay private.** The public board ranks people by
orders over the last 28 days, the number on the TikTok Shop Seller Center home
page. GMV, GMV Max spend, samples, videos and lives are still collected, but
only `/admin` ever returns them. The board endpoint never sends a dollar figure.

**Weekly.** A week runs Monday to Sunday and is filed under the Sunday that ends
it. Submitting twice in a week updates that week. One TikTok handle is one
person, with `@` and capitalization stripped.

**Mentor view.** `/admin` shows everyone across both programs with a filter, and
each member opens into their full history with charts for 28 day orders, 28 day
GMV and 7 day GMV. Wrong PIN guesses are rate limited per IP.

**Look.** Black and white frosted glass over a grain gradient, set in Archivo,
matching the Affiliate Board and the Ledger. The font ships with the app in
`public/fonts`, so nothing loads from Google.

## Setup

1. **Database.** In the Vercel project, Storage, create a Neon Postgres database
   and attach it. Vercel sets `DATABASE_URL`. The table builds itself on the
   first request, so there is no SQL to run.
2. **Environment variables.** Project, Settings, Environment Variables:

| Name | What it is |
|---|---|
| `ACCELERATOR_CODE` | Access code for Accelerator. Falls back to `FORM_CODE` if unset. |
| `ACADEMY_CODE` | Access code for Academy. |
| `ADMIN_PASSWORD` | PIN for `/admin`. |
| `AUTH_SECRET` | Any long random string. Signs the admin cookie. |

Redeploy after changing them. Keep the real codes and PIN out of this file,
since the repository is public.

## Preview with fake data

Set `DEMO_DATA=1` to fill the board and dashboard with sample members from both
programs. Remove it before sharing the link.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```
