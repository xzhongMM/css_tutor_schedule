-- Run in the Supabase SQL editor. Tutor ownership is enforced by RLS.
create extension if not exists pgcrypto;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  tutoring_site text not null default '',
  status text not null default 'active' check (status in ('active', 'stopped')),
  goals text[] not null default '{}',
  other_goal text not null default '',
  stopped_reason text not null default '',
  stopped_days text not null default '',
  stopped_times text not null default '',
  created_at timestamptz not null default now(),
  unique (id, tutor_id)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  session_date date not null,
  hours numeric(5,2) not null check (hours > 0 and hours <= 12),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_student_owner foreign key (student_id, tutor_id)
    references public.students(id, tutor_id) on delete cascade
);

create index if not exists sessions_tutor_date_idx on public.sessions(tutor_id, session_date desc);
create index if not exists sessions_student_date_idx on public.sessions(student_id, session_date desc);

alter table public.students enable row level security;
alter table public.sessions enable row level security;

create policy "Tutors can read their students" on public.students for select using (auth.uid() = tutor_id);
create policy "Tutors can create their students" on public.students for insert with check (auth.uid() = tutor_id);
create policy "Tutors can update their students" on public.students for update using (auth.uid() = tutor_id) with check (auth.uid() = tutor_id);
create policy "Tutors can delete their students" on public.students for delete using (auth.uid() = tutor_id);
create policy "Tutors can read their sessions" on public.sessions for select using (auth.uid() = tutor_id);
create policy "Tutors can create their sessions" on public.sessions for insert with check (auth.uid() = tutor_id);
create policy "Tutors can update their sessions" on public.sessions for update using (auth.uid() = tutor_id) with check (auth.uid() = tutor_id);
create policy "Tutors can delete their sessions" on public.sessions for delete using (auth.uid() = tutor_id);
