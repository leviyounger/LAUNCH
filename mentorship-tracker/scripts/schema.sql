-- Mentorship Tracker schema, for reference only.
-- The app creates and upgrades this table itself on the first request (lib/db.ts).

create table if not exists submissions (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  week_ending   date        not null,
  handle        text        not null,   -- lowercase, no leading @
  display_name  text        not null,
  program       text,                   -- 'academy' or 'accelerator', set by the access code
  orders_28     integer,                -- shown on the public board
  gmv_7         numeric(12,2),          -- private from here down
  gmv_28        numeric(12,2),
  samples_sent  integer,
  gmv_max_spend numeric(12,2),
  videos_posted integer,
  lives_count   integer
);

create index if not exists submissions_handle_idx on submissions (handle);
create index if not exists submissions_week_idx   on submissions (week_ending desc);
create unique index if not exists submissions_handle_week_uniq on submissions (handle, week_ending);
