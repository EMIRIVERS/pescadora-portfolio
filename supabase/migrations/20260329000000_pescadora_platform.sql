-- ============================================================
-- Pescadora Platform — Migration v1
-- Run in Supabase SQL Editor or via: npx supabase db push
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Types ────────────────────────────────────────────────────
CREATE TYPE IF NOT EXISTS user_role          AS ENUM ('admin_staff', 'client');
CREATE TYPE IF NOT EXISTS project_status     AS ENUM ('pre_production', 'production', 'post_production', 'delivered');
CREATE TYPE IF NOT EXISTS deliverable_type   AS ENUM ('wip', 'final');
CREATE TYPE IF NOT EXISTS deliverable_status AS ENUM ('pending', 'review', 'approved');
CREATE TYPE IF NOT EXISTS task_priority      AS ENUM ('low', 'medium', 'high');

-- ── profiles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id             uuid          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name      text,
    email          text,
    avatar_url     text,
    role           user_role     NOT NULL DEFAULT 'client',
    is_admin_team  boolean       NOT NULL DEFAULT false,
    created_at     timestamptz   NOT NULL DEFAULT now(),
    updated_at     timestamptz   NOT NULL DEFAULT now()
);

-- ── clients ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
    id             uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           text          NOT NULL,
    email          text,
    company        text,
    avatar_url     text,
    profile_id     uuid          REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at     timestamptz   NOT NULL DEFAULT now()
);

-- ── projects ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
    id             uuid            PRIMARY KEY DEFAULT uuid_generate_v4(),
    title          text            NOT NULL,
    description    text,
    client_id      uuid            REFERENCES public.clients(id) ON DELETE SET NULL,
    status         project_status  NOT NULL DEFAULT 'pre_production',
    start_date     date,
    end_date       date,
    cover_url      text,
    created_by     uuid            REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at     timestamptz     NOT NULL DEFAULT now(),
    updated_at     timestamptz     NOT NULL DEFAULT now()
);

-- ── project_deliverables ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_deliverables (
    id          uuid                PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  uuid                NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title       text                NOT NULL,
    description text,
    url         text,
    type        deliverable_type    NOT NULL DEFAULT 'wip',
    status      deliverable_status  NOT NULL DEFAULT 'pending',
    sort_order  integer             NOT NULL DEFAULT 0,
    created_at  timestamptz         NOT NULL DEFAULT now(),
    updated_at  timestamptz         NOT NULL DEFAULT now()
);

-- ── task_boards ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_boards (
    id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       text        NOT NULL,
    project_id  uuid        REFERENCES public.projects(id) ON DELETE SET NULL,
    position    integer     NOT NULL DEFAULT 0,
    color       text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── tasks ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
    id          uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id    uuid          NOT NULL REFERENCES public.task_boards(id) ON DELETE CASCADE,
    title       text          NOT NULL,
    description text,
    assignee_id uuid          REFERENCES public.profiles(id) ON DELETE SET NULL,
    priority    task_priority NOT NULL DEFAULT 'medium',
    position    integer       NOT NULL DEFAULT 0,
    due_date    date,
    created_at  timestamptz   NOT NULL DEFAULT now(),
    updated_at  timestamptz   NOT NULL DEFAULT now()
);

-- ── task_activity_log ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_activity_log (
    id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id    uuid        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    action     text        NOT NULL,
    old_value  text,
    new_value  text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_profile_id       ON public.clients(profile_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id       ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status          ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_deliverables_project_id  ON public.project_deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_task_boards_project_id   ON public.task_boards(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_board_id           ON public.tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id        ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_activity_task_id         ON public.task_activity_log(task_id);

-- ── Triggers ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at     BEFORE UPDATE ON public.profiles             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER projects_updated_at     BEFORE UPDATE ON public.projects             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER deliverables_updated_at BEFORE UPDATE ON public.project_deliverables FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tasks_updated_at        BEFORE UPDATE ON public.tasks                FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.log_task_board_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF OLD.board_id IS DISTINCT FROM NEW.board_id THEN
        INSERT INTO public.task_activity_log (task_id, user_id, action, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'board_changed', OLD.board_id::text, NEW.board_id::text);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_log_board_change
    AFTER UPDATE OF board_id ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.log_task_board_change();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_boards          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity_log    ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles: own read"         ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles: own update"       ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles: staff full"       ON public.profiles FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin_team = true));

-- clients
CREATE POLICY "clients: staff full"        ON public.clients FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin_team = true));
CREATE POLICY "clients: own read"          ON public.clients FOR SELECT USING (profile_id = auth.uid());

-- projects
CREATE POLICY "projects: staff full"       ON public.projects FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin_team = true));
CREATE POLICY "projects: client read own"  ON public.projects FOR SELECT USING (client_id IN (SELECT c.id FROM public.clients c WHERE c.profile_id = auth.uid()));

-- project_deliverables
CREATE POLICY "deliverables: staff full"   ON public.project_deliverables FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin_team = true));
CREATE POLICY "deliverables: client read"  ON public.project_deliverables FOR SELECT USING (project_id IN (SELECT pr.id FROM public.projects pr JOIN public.clients c ON c.id = pr.client_id WHERE c.profile_id = auth.uid()));

-- task_boards, tasks, activity_log — staff only
CREATE POLICY "task_boards: staff full"    ON public.task_boards        FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin_team = true));
CREATE POLICY "tasks: staff full"          ON public.tasks               FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin_team = true));
CREATE POLICY "activity: staff full"       ON public.task_activity_log   FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin_team = true));

-- ── Seed: default Kanban boards ──────────────────────────────
INSERT INTO public.task_boards (title, position) VALUES
    ('Por hacer',    0),
    ('En progreso',  1),
    ('Revision',     2),
    ('Entregado',    3)
ON CONFLICT DO NOTHING;
