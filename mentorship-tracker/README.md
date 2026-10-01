# Mentorship Tracker

Weekly numbers from Launch Academy mentees, plus a private dashboard for Levi.

- `/` is the mentee side. Access code, then the weekly form, then the leaderboard.
- `/admin` is the mentor side. Password protected, and the only place tiles are
  clickable.

Built with Next.js and Postgres. Runs free on Vercel.

---

## What it does

**Mentees** open the link, type the access code once, then fill in their week.
Name, TikTok handle, GMV for the last 7 days, GMV for the last 28 days, samples
sent, total GMV Max spend, videos they published themselves, and how many TikTok
lives they went on.

Submitting opens the board. Each tile carries only two things: the 28 day GMV
and the week over week change. Everything else lives on the profile page, which
only Levi can open. They see everyone ranked, their own row marked, and their
rank in the header.
The board is read only for them: the tiles do not open. Until they submit for
the current week they only see the form, so the numbers are something you earn
your way into rather than just browse.

Submitting twice in the same week updates that week instead of creating a
duplicate. One person is one profile, keyed on their TikTok handle with the `@`
and the capitalization stripped, so `@GoodVibesGear` and `goodvibesgear` are the
same person.

**Levi** opens `/admin`, enters the PIN **8054**, and sees the same board, except
every tile is clickable and opens that member's full history with GMV trend
charts for 7 day and 28 day. Wrong PINs are counted per IP: eight misses and
that address is locked out for fifteen minutes.

Tiles are liquid glass on a grey to white ground. Hovering one lifts it, sweeps a
specular highlight across the surface, and blooms violet through the panel. That
hover runs on both sides, mentee and mentor. The leader keeps a slow shimmer of
its own and carries a violet bar across the top.

The standings endpoint returns a little more than the tile draws, so the 7 day
GMV and sample count for everyone are visible to anyone who opens devtools. That
is deliberate. Nothing on the board is treated as secret between members.

---

## Deploy it

Everything below is free. Do it on the **Launch Club** Vercel account, not the
Fortson one.

### 1. Put the code on GitHub

Create a new **private** repo on GitHub, then from this folder:

```bash
git init
git add .
git commit -m "Mentorship Tracker"
git branch -M main
git remote add origin https://github.com/<your-user>/launch-tracker.git
git push -u origin main
```

### 2. Import it into Vercel

1. Go to vercel.com and make sure the account switcher in the top left says
   **Launch Club**. If it says Fortson, switch it before doing anything else.
2. Add New, then Project, then import the repo.
3. Leave every build setting on its default. Do not deploy yet, or if it deploys
   and fails, that is fine, step 4 fixes it.

### 3. Add the database

1. In the project, open the **Storage** tab.
2. Create a **Neon** Postgres database and attach it to this project. The free
   tier is plenty.
3. Vercel sets `DATABASE_URL` for you automatically.
4. Open the database, find the SQL editor, and paste in everything from
   `scripts/schema.sql`. Run it once.

### 4. Add the environment variables

Project, then Settings, then Environment Variables. Add these three:

| Name | Value |
|---|---|
| `FORM_CODE` | `levi` |
| `ADMIN_PASSWORD` | `8054` (optional, this is already the built in default) |
| `AUTH_SECRET` | any long random string, it just signs your login cookie |

Then redeploy so they take effect.

### 5. Point the domain at it

1. Project, then Settings, then Domains.
2. Add `track.launchclub.shop`.
3. Vercel shows you one CNAME record. Add it wherever launchclub.shop's DNS
   lives. It usually goes live within a few minutes.

---

## Day to day

- Send mentees **track.launchclub.shop** and the code **levi**.
- You go to **track.launchclub.shop/admin** and enter the PIN **8054**.
- Everyone on the board can see everyone else's GMV. That is the point, but tell
  people that up front so nobody is surprised.
- A week runs Monday to Sunday, and a submission is filed under the Sunday that
  ends that week.

## If you already ran the old schema

Three columns were added after the first version. Run these once against the
database and nothing else changes:

```sql
alter table submissions add column if not exists gmv_max_spend numeric(12,2);
alter table submissions add column if not exists videos_posted integer;
alter table submissions add column if not exists lives_count   integer;
```

## Previewing before real data exists

Set `DEMO_DATA=1` in the environment variables and the dashboard fills with three
fake members so you can see how it looks. **Remove that variable before you send
the link to anyone**, or the dashboard shows the fake data instead of real
submissions.

## Running it on your own machine

```bash
npm install
cp .env.example .env
# fill in .env
npm run dev
```
