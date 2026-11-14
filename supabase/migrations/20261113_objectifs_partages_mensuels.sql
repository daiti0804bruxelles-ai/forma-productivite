-- Objectifs à deux : option « chaque mois » (remise à zéro au 1er) et unité facultative.
alter table public.shared_goals add column if not exists monthly boolean not null default false;
alter table public.shared_goals alter column unit drop not null;
