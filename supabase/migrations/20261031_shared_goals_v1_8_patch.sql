-- Forma V1.8 : correctif à exécuter après la migration initiale déjà appliquée.
-- Crée automatiquement le membre propriétaire lors de la création d'un espace.
create or replace function public.forma_add_space_owner()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 insert into public.shared_space_members(space_id,user_id) values (new.id,new.owner_id);
 return new;
end
$$;
revoke all on function public.forma_add_space_owner() from public;
drop trigger if exists forma_space_owner_member on public.shared_spaces;
create trigger forma_space_owner_member after insert on public.shared_spaces
for each row execute function public.forma_add_space_owner();

-- Si un espace a déjà été créé avant ce correctif, répare ses membres.
insert into public.shared_space_members(space_id,user_id)
select id,owner_id from public.shared_spaces on conflict do nothing;

-- Protège les champs immuables des invitations.
create or replace function public.forma_guard_invitation_update()
returns trigger language plpgsql set search_path = ''
as $$
begin
 if current_user <> 'postgres' and (
  new.id is distinct from old.id or new.space_id is distinct from old.space_id
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
