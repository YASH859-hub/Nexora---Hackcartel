-- Schema for injected dashboard data used by the web app.
-- Apply this in Supabase SQL editor before running the seed script.

create extension if not exists pgcrypto;

create table if not exists public.injected_priority_items (
  id uuid primary key default gen_random_uuid(),
  seed_key text not null unique,
  title text not null,
  summary text not null default '',
  category text not null check (category in ('financial', 'work', 'other')),
  priority text not null check (priority in ('high', 'medium', 'low')),
  next_action text not null default '',
  due_at timestamptz,
  source_type text not null check (source_type in ('email', 'calendar', 'manual')),
  source_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.manual_financial_commitments (
  id uuid primary key default gen_random_uuid(),
  seed_key text not null unique,
  name text not null,
  amount numeric(12, 2) not null,
  due_date date not null,
  priority text not null check (priority in ('high', 'medium', 'low')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.injected_priority_items enable row level security;
alter table public.manual_financial_commitments enable row level security;

drop policy if exists "Public can read injected priority items" on public.injected_priority_items;
create policy "Public can read injected priority items"
  on public.injected_priority_items
  for select
  using (true);

drop policy if exists "Public can read manual financial commitments" on public.manual_financial_commitments;
create policy "Public can read manual financial commitments"
  on public.manual_financial_commitments
  for select
  using (true);

create index if not exists idx_injected_priority_items_created_at
  on public.injected_priority_items(created_at desc);

create index if not exists idx_injected_priority_items_due_at
  on public.injected_priority_items(due_at asc nulls last);

create index if not exists idx_manual_financial_commitments_due_date
  on public.manual_financial_commitments(due_date asc);
