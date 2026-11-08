-- Forma · Fiabilité : sécurité de user_data + sauvegardes automatiques
-- Appliqué le 8 novembre 2026. Peut être réexécuté sans risque (idempotent).
-- Sans risque pour les données existantes : rien n'est supprimé ni réécrit dans user_data.
-- L'app fonctionne aussi tant que ce script n'a pas été exécuté (sauvegardes automatiques simplement inactives).

-- 1. Table principale (documentée ici ; ne fait rien si elle existe déjà).
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- 2. Chaque compte ne peut lire et modifier QUE ses propres données.
-- Règle déjà en place dans la base (vérifiée le 8 novembre 2026) ; recréée seulement si elle manque.
alter table public.user_data enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_data') then
    create policy "Users manage their own data" on public.user_data for all to authenticated
      using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
end $$;

-- 3. Sauvegardes automatiques (8 dernières copies par compte, gérées par l'app).
create table if not exists public.user_data_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  reason text not null default 'hebdomadaire' check (reason in ('hebdomadaire', 'avant restauration')),
  created_at timestamptz not null default now()
);
create index if not exists user_data_backups_user_created on public.user_data_backups (user_id, created_at desc);
alter table public.user_data_backups enable row level security;
drop policy if exists "user_data_backups_select_own" on public.user_data_backups;
drop policy if exists "user_data_backups_insert_own" on public.user_data_backups;
drop policy if exists "user_data_backups_delete_own" on public.user_data_backups;
create policy "user_data_backups_select_own" on public.user_data_backups for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_data_backups_insert_own" on public.user_data_backups for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_data_backups_delete_own" on public.user_data_backups for delete to authenticated using ((select auth.uid()) = user_id);
-- Pas de policy update : une sauvegarde ne peut pas être modifiée après coup.

-- 4. Vérification (à lire après exécution) : chaque ligne doit montrer « auth.uid() = user_id ».
-- Si une AUTRE règle apparaît pour user_data (créée à la main auparavant), elle peut ouvrir l'accès : supprime-la.
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('user_data', 'user_data_backups')
order by tablename, policyname;
