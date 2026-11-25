# Database

## Status

No hosted backend is configured. The local adapter (`src/persistence/adapter.ts`) is authoritative for this build and validates every record read from storage. The SQL below is the production schema, kept ready for a Supabase project.

## Schema

```sql
-- Anonymous identities are created by Supabase anonymous auth; no email or profile.
create table public.echoes (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references auth.users(id) on delete cascade,
  anchor_id text not null check (anchor_id in ('bench','grove','overlook','lighthouse','cottage','bottleBeach')),
  created_at timestamptz not null default now(),
  palette_index smallint not null check (palette_index between 0 and 7),
  gesture text not null check (gesture in ('look','wave','shiver','breathe')),
  duration_ms integer not null check (duration_ms between 4000 and 60000),
  message text check (char_length(message) <= 140),
  authored boolean not null default false,
  visibility text not null default 'public' check (visibility in ('public','hidden','archived')),
  moderation text not null default 'pending' check (moderation in ('pending','approved','rejected')),
  reports integer not null default 0 check (reports >= 0)
);

create table public.bottles (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  released_at timestamptz not null default now(),
  text text not null check (char_length(text) between 2 and 180),
  found_at timestamptz,
  found_by uuid references auth.users(id) on delete set null,
  reports integer not null default 0 check (reports >= 0),
  visibility text not null default 'public' check (visibility in ('public','hidden','archived')),
  moderation text not null default 'pending' check (moderation in ('pending','approved','rejected'))
);

create table public.flowers (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 0 and 23),
  color integer not null,
  created_at timestamptz not null default now(),
  unique (slot)
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  target_table text not null,
  target_id uuid not null,
  action text not null check (action in ('approve','hide','delete','report')),
  reason text,
  created_at timestamptz not null default now(),
  actor uuid references auth.users(id) on delete set null
);

alter table public.echoes enable row level security;
alter table public.bottles enable row level security;
alter table public.flowers enable row level security;

create policy "read approved echoes" on public.echoes for select
  using (visibility = 'public' and moderation = 'approved');
create policy "insert own echo" on public.echoes for insert
  with check (auth.uid() = contributor_id and authored = false);
create policy "delete own echo" on public.echoes for delete
  using (auth.uid() = contributor_id);

create policy "read approved bottles" on public.bottles for select
  using (visibility = 'public' and moderation = 'approved');
create policy "insert own bottle" on public.bottles for insert
  with check (auth.uid() = contributor_id);
create policy "delete own bottle" on public.bottles for delete
  using (auth.uid() = contributor_id);

create policy "read flowers" on public.flowers for select using (true);
create policy "insert own flower" on public.flowers for insert
  with check (auth.uid() = contributor_id);
```

## Delivery rules

- Bottles become eligible for discovery 20 minutes after release, at most once per visitor, never to the author, and never after two reports or moderation rejection.
- Echo retrieval is one eligible record per anchor, newest first, excluding the current contributor.
- Writes are rate-limited (echo: 1 per anchor per visitor per 10 minutes; bottle: 3 per visitor per day; flower: 3 per visitor lifetime).
- Deletion is immediate for the contributor; moderation hides content without destroying audit records.

## Local adapter parity

`loadWorld()` validates stored records and drops malformed entries. It never trusts stored timestamps for ordering beyond display. Limits mirror the production rules where practical (40 Echoes, 20 bottles, 24 flowers per device).
