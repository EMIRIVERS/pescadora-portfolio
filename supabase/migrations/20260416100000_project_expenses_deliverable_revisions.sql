-- ============================================================
-- project_expenses: tracking de gastos por proyecto
-- ============================================================
create table if not exists public.project_expenses (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  created_at  timestamptz not null default now(),
  label       text not null,
  amount      numeric(12,2) not null check (amount >= 0),
  category    text,
  notes       text,
  date        date
);

alter table public.project_expenses enable row level security;

create policy "admin_all_expenses" on public.project_expenses
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin_team = true
    )
  );

-- ============================================================
-- deliverable_revisions: historial de versiones por entregable
-- ============================================================
create table if not exists public.deliverable_revisions (
  id              uuid primary key default gen_random_uuid(),
  deliverable_id  uuid not null references public.project_deliverables(id) on delete cascade,
  revision_number integer not null,
  url             text,
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists deliverable_revisions_deliverable_id_idx
  on public.deliverable_revisions (deliverable_id, revision_number);

alter table public.deliverable_revisions enable row level security;

-- Admin: acceso total
create policy "admin_all_revisions" on public.deliverable_revisions
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin_team = true
    )
  );

-- Cliente: solo lectura de revisiones de sus proyectos
create policy "client_read_revisions" on public.deliverable_revisions
  for select using (
    exists (
      select 1
      from public.project_deliverables pd
      join public.projects p on p.id = pd.project_id
      join public.clients c on c.id = p.client_id
      where pd.id = deliverable_revisions.deliverable_id
        and c.profile_id = auth.uid()
    )
  );
