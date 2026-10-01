-- Launch Tracker schema
-- Run this once against your database before the first submission.

create table if not exists submissions (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  week_ending   date        not null,
  handle        text        not null,   -- normalized: lowercase, no leading @
  display_name  text        not null,
  gmv_7         numeric(12,2),
  gmv_28        numeric(12,2),
  samples_sent  integer,
  gmv_max_spend numeric(12,2),   -- total GMV Max spend for the week
  videos_posted integer,         -- videos the member published themselves
  lives_count   integer          -- TikTok lives they went on
);

-- If the table already exists from an earlier version, add the new columns:
--   alter table submissions add column if not exists gmv_max_spend numeric(12,2);
--   alter table submissions add column if not exists videos_posted integer;
--   alter table submissions add column if not exists lives_count   integer;

create index if not exists submissions_handle_idx on submissions (handle);
create index if not exists submissions_week_idx   on submissions (week_ending desc);

-- One row per person per week. A second submission for the same week
-- replaces the first, so nobody can double up by mistake.
create unique index if not exists submissions_handle_week_uniq
  on submissions (handle, week_ending);
