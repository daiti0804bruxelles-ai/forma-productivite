-- Forma · Sécurité : fonctions des objectifs partagés réservées aux comptes connectés.
-- Les 4 fonctions vérifiaient déjà auth.uid() (un visiteur non connecté ne pouvait rien faire),
-- mais elles restaient appelables sans connexion. On retire cet accès inutile.
revoke execute on function public.forma_accept_shared_invitation(uuid) from public, anon;
revoke execute on function public.forma_is_shared_member(uuid) from public, anon;
revoke execute on function public.forma_is_shared_owner(uuid) from public, anon;
-- Fonction de déclencheur (création d'un espace) : jamais appelée directement, le déclencheur continue de fonctionner.
revoke execute on function public.forma_add_space_owner() from public, anon, authenticated;
-- Restent ouvertes aux comptes connectés : forma_accept_shared_invitation (bouton « Accepter »)
-- et forma_is_shared_member / forma_is_shared_owner (utilisées par les règles d'accès des tables partagées).
