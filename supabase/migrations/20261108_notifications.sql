-- Forma · Notifications push (rappels avant activité, soir, matin).
-- Crée les tables, active pg_cron + pg_net et planifie l'appel de la fonction « notifications » toutes les 5 minutes.

-- Abonnements : un par appareil (téléphone, ordinateur). Chaque compte ne voit que les siens.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device text,
  time_zone text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions_own" on public.push_subscriptions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Rappels déjà envoyés (anti-doublon) et configuration serveur : aucune règle = lisibles seulement par le serveur.
create table if not exists public.push_sent (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.push_sent enable row level security;
create table if not exists public.push_config (key text primary key, value text not null);
alter table public.push_config enable row level security;
revoke all on public.push_sent, public.push_config from anon, authenticated;
insert into public.push_config (key, value) values ('cron_secret', encode(extensions.gen_random_bytes(24), 'hex')) on conflict (key) do nothing;

-- Planificateur : toutes les 5 minutes.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('forma-notifications') where exists (select 1 from cron.job where jobname = 'forma-notifications');
select cron.schedule('forma-notifications', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://nmlhmnfppulkvprnwhtn.supabase.co/functions/v1/notifications',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select value from public.push_config where key = 'cron_secret')),
    body := '{"action":"tick"}'::jsonb
  );
$$);
