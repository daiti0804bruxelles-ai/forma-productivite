-- Forma V1.8 · Étape 1 : tables privées pour objectifs partagés
-- À exécuter UNE SEULE FOIS dans Supabase SQL Editor, après validation.
-- Ne modifie ni public.user_data ni les objectifs personnels.
create table if not exists public.shared_spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Notre espace' check (char_length(name) between 1 and 100),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.shared_space_members (
  space_id uuid not null references public.shared_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (space_id,user_id)
);

create table if not exists public.shared_invitations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.shared_spaces(id) on delete cascade,
  invited_email text not null check (char_length(invited_email) between 3 and 254),
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '7 days'),
  accepted_at timestamptz,
  unique (space_id,invited_email)
);

create table if not exists public.shared_goals (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.shared_spaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  unit text not null check (char_length(unit) between 1 and 40),
  target numeric(15,2) not null check (target>0),
  tracking text not null default 'shared' check (tracking in ('shared','individual')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.shared_goal_entries (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.shared_goals(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  amount numeric(15,2) not null check (amount<>0),
  note text check (note is null or char_length(note)<=200),
  created_at timestamptz not null default now()
);

create index if not exists shared_goals_space_idx on public.shared_goals(space_id);
create index if not exists shared_entries_goal_idx on public.shared_goal_entries(goal_id);
create index if not exists shared_invitations_email_idx on public.shared_invitations(lower(invited_email));

-- SECURITY DEFINER : évite la récursion des politiques RLS des membres.
create or replace function public.forma_is_shared_member(p_space uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shared_space_members m
    where m.space_id=p_space and m.user_id=(select auth.uid())
  )
$$;
revoke all on function public.forma_is_shared_member(uuid) from public;
grant execute on function public.forma_is_shared_member(uuid) to authenticated;

create or replace function public.forma_is_shared_owner(p_space uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shared_spaces s
    where s.id=p_space and s.owner_id=(select auth.uid())
  )
$$;
revoke all on function public.forma_is_shared_owner(uuid) from public;
grant execute on function public.forma_is_shared_owner(uuid) to authenticated;

alter table public.shared_spaces enable row level security;
alter table public.shared_space_members enable row level security;
alter table public.shared_invitations enable row level security;
alter table public.shared_goals enable row level security;
alter table public.shared_goal_entries enable row level security;

-- Aucun accès anonyme aux nouvelles tables.
revoke all on public.shared_spaces,public.shared_space_members,public.shared_invitations,public.shared_goals,public.shared_goal_entries from anon;
grant select,insert,update,delete on public.shared_spaces,public.shared_space_members,public.shared_invitations,public.shared_goals,public.shared_goal_entries to authenticated;

create policy "spaces visible to members" on public.shared_spaces
for select to authenticated using (public.forma_is_shared_member(id) or owner_id=(select auth.uid()));
create policy "owners create spaces" on public.shared_spaces
for insert to authenticated with check (owner_id=(select auth.uid()));
create policy "owners edit spaces" on public.shared_spaces
for update to authenticated using (owner_id=(select auth.uid()))
with check (owner_id=(select auth.uid()));
create policy "owners delete spaces" on public.shared_spaces
for delete to authenticated using (owner_id=(select auth.uid()));

create policy "members visible to their space" on public.shared_space_members
for select to authenticated using (public.forma_is_shared_member(space_id) or public.forma_is_shared_owner(space_id));
-- L'ajout d'un membre passe exclusivement par la fonction d'acceptation.
-- Aucun INSERT / UPDATE / DELETE RLS direct pour les membres.

create policy "invitations visible to owner or recipient" on public.shared_invitations
for select to authenticated using (
 public.forma_is_shared_owner(space_id)
 or (lower(invited_email)=lower((select auth.jwt()->>'email')))
);
create policy "owner creates invitation" on public.shared_invitations
for insert to authenticated with check (
 public.forma_is_shared_owner(space_id)
 and invited_by=(select auth.uid())
 and status='pending'
 and expires_at>now()
 and expires_at<=now()+interval '8 days'
);
create policy "owner revokes invitation" on public.shared_invitations
for update to authenticated using (public.forma_is_shared_owner(space_id))
with check (public.forma_is_shared_owner(space_id) and status='revoked');
-- Une invitation ne peut pas être acceptée par une modification directe côté navigateur.

create policy "goals visible to members" on public.shared_goals
for select to authenticated using (public.forma_is_shared_member(space_id));
create policy "members create goals" on public.shared_goals
for insert to authenticated with check (
 public.forma_is_shared_member(space_id) and created_by=(select auth.uid())
);
create policy "members edit goals" on public.shared_goals
for update to authenticated using (public.forma_is_shared_member(space_id))
with check (public.forma_is_shared_member(space_id));
create policy "members delete goals" on public.shared_goals
for delete to authenticated using (public.forma_is_shared_member(space_id));

create policy "entries visible to members" on public.shared_goal_entries
for select to authenticated using (
 exists (select 1 from public.shared_goals g
 where g.id=goal_id and public.forma_is_shared_member(g.space_id))
);
create policy "members add their own entries" on public.shared_goal_entries
for insert to authenticated with check (
 actor_id=(select auth.uid())
 and exists (select 1 from public.shared_goals g
 where g.id=goal_id and public.forma_is_shared_member(g.space_id))
);
create policy "members delete own entries" on public.shared_goal_entries
for delete to authenticated using (
 actor_id=(select auth.uid())
 and exists (select 1 from public.shared_goals g
 where g.id=goal_id and public.forma_is_shared_member(g.space_id))
);

-- Invitation acceptée uniquement par un compte dont l'e-mail a été confirmé.
-- Vérification serveur dans auth.users : pas de confiance aveugle dans un champ envoyé par le client.
create or replace function public.forma_accept_shared_invitation(p_invitation uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_email text;
  v_space uuid;
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Connexion requise'; end if;
  select lower(email) into v_email from auth.users
    where id=v_user and email_confirmed_at is not null;
  if v_email is null then raise exception 'Adresse e-mail non confirmée'; end if;
  select i.space_id into v_space
    from public.shared_invitations i
    where i.id=p_invitation and lower(i.invited_email)=v_email
      and i.status='pending' and i.expires_at>now()
    for update;
  if v_space is null then raise exception 'Invitation invalide ou expirée'; end if;
  insert into public.shared_space_members(space_id,user_id)
    values (v_space,v_user) on conflict do nothing;
  update public.shared_invitations
    set status='accepted',accepted_at=now()
    where id=p_invitation;
  return v_space;
end
$$;
revoke all on function public.forma_accept_shared_invitation(uuid) from public;
grant execute on function public.forma_accept_shared_invitation(uuid) to authenticated;

-- IMPORTANT : l'envoi d'e-mail n'est PAS activé par cette migration.
-- Il sera fait via une Edge Function authentifiée (clé du fournisseur côté serveur).

-- Correction nécessaire : le créateur d'un espace devient membre automatiquement.
-- Sans ce trigger, les politiques RLS empêcheraient le propriétaire de créer des objectifs.
create or replace function public.forma_add_space_owner()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.shared_space_members(space_id,user_id)
  values (new.id,new.owner_id);
  return new;
end
$$;
revoke all on function public.forma_add_space_owner() from public;
drop trigger if exists forma_space_owner_member on public.shared_spaces;
create trigger forma_space_owner_member
after insert on public.shared_spaces
for each row execute function public.forma_add_space_owner();

-- Évite de laisser l'API modifier les colonnes d'identité de l'invitation.
-- Les changements de statut acceptés sont limités à la révocation.
create or replace function public.forma_guard_invitation_update()
returns trigger language plpgsql set search_path = ''
as $$
begin
 if current_user <> 'postgres' and (
  new.id is distinct from old.id
  or new.space_id is distinct from old.space_id
  or new.invited_email is distinct from old.invited_email
  or new.invited_by is distinct from old.invited_by
  or new.created_at is distinct from old.created_at
  or new.expires_at is distinct from old.expires_at
  or new.accepted_at is distinct from old.accepted_at
 ) then raise exception 'Modification d’invitation interdite'; end if;
 return new;
end
$$;
drop trigger if exists forma_guard_invitation on public.shared_invitations;
create trigger forma_guard_invitation before update on public.shared_invitations
for each row execute function public.forma_guard_invitation_update();
