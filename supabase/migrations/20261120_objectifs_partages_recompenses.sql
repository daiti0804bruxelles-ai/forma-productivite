-- Objectifs à deux : difficulté (récompense) et compétences qui reçoivent l'XP.
alter table public.shared_goals add column if not exists difficulty text not null default 'moderate' check (difficulty in ('moderate','ambitious','exceptional'));
alter table public.shared_goals add column if not exists skill_ids text[] not null default '{}' check (cardinality(skill_ids) <= 3);
