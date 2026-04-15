-- Leads / outbound pipeline
create table leads (
  id                     uuid primary key default gen_random_uuid(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  name                   text not null,
  email                  text,
  phone                  text,
  company                text,
  status                 text not null default 'new'
                           check (status in ('new','contacted','qualified','proposal','won','lost')),
  source                 text not null default 'manual'
                           check (source in ('manual','referral','instagram','web','whatsapp','other')),
  notes                  text,
  budget_range           text,
  project_type           text,
  assigned_to            uuid references profiles(id) on delete set null,
  last_contacted_at      timestamptz,
  expected_close_date    date,
  converted_to_client_id uuid references clients(id) on delete set null
);

create table lead_activities (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  user_id     uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  type        text not null
                check (type in ('note','email','call','whatsapp','meeting','status_change')),
  content     text,
  old_status  text,
  new_status  text
);

-- Updated_at trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger leads_updated_at
  before update on leads
  for each row execute function set_updated_at();

-- RLS
alter table leads          enable row level security;
alter table lead_activities enable row level security;

create policy "admin_all_leads"
  on leads for all
  using  (exists (select 1 from profiles where id = auth.uid() and is_admin_team = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin_team = true));

create policy "admin_all_lead_activities"
  on lead_activities for all
  using  (exists (select 1 from profiles where id = auth.uid() and is_admin_team = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin_team = true));
