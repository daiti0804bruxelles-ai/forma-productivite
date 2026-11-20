-- Tâches à deux : une tâche visible par les membres de l'espace « À deux ».
-- Faite dès qu'un membre la coche (done_at / done_by). XP, or et pénalités sont calculés par chaque app, dans le compte de chacun.
create table if not exists public.shared_tasks (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.shared_spaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  due_date date not null,
  difficulty text not null default 'moyen' check (difficulty in ('facile','moyen','difficile','epique')),
  skill_ids text[] not null default '{}' check (cardinality(skill_ids) <= 3),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  done_by uuid references auth.users(id) on delete set null
);
create index if not exists shared_tasks_space_idx on public.shared_tasks(space_id);
alter table public.shared_tasks enable row level security;
revoke all on public.shared_tasks from anon;
grant select, insert, update, delete on public.shared_tasks to authenticated;
create policy "shared tasks visible to members" on public.shared_tasks
  for select to authenticated using (public.forma_is_shared_member(space_id));
create policy "members create shared tasks" on public.shared_tasks
  for insert to authenticated with check (public.forma_is_shared_member(space_id) and created_by = (select auth.uid()));
create policy "members edit shared tasks" on public.shared_tasks
  for update to authenticated using (public.forma_is_shared_member(space_id)) with check (public.forma_is_shared_member(space_id));
create policy "members delete shared tasks" on public.shared_tasks
  for delete to authenticated using (public.forma_is_shared_member(space_id));
