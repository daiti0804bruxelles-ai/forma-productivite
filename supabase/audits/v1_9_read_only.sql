-- Audit strictement en lecture seule. Aucun ALTER, GRANT, UPDATE ni migration.
-- À exécuter si nécessaire dans une session SQL autorisée, puis conserver les résultats hors Git
-- s'ils contiennent des informations privées. N'affiche aucune donnée utilisateur.
begin read only;
select c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'user_data';
select policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'user_data';
select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'user_data'
order by grantee, privilege_type;
select column_name, data_type, is_nullable
from information_schema.columns where table_schema = 'public' and table_name = 'user_data';
select indexdef from pg_indexes where schemaname = 'public' and tablename = 'user_data';
select trigger_name, action_statement from information_schema.triggers
where event_object_schema = 'public' and event_object_table = 'user_data';
commit;
