-- Jeux d'animation (novembre 2026) : One Point Slam, roi du terrain, montante-descendante, défis à points.
-- Un jeu = une soirée ou une animation, avec ses joueurs (adhérents ou invités tapés sur place) et ses manches.
-- La gestion pilote (accès « Événements »), l'écran du club affiche en direct grâce à une clé secrète, sans compte.

create table if not exists public.jeux (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  jour date,
  format text not null default 'ops',
  joueurs jsonb not null default '[]'::jsonb,   -- [{ k, nom, pid }] ; pid = fiche adhérent, vide pour un invité
  manches jsonb not null default '[]'::jsonb,   -- [{ fmt, lot, etat }] ; etat = état calculé par jeux-moteur.js
  config jsonb not null default '{}'::jsonb,    -- { malus: [...], terrains, defis: [...] }
  actuelle int not null default 0,
  cle text not null unique default replace(gen_random_uuid()::text, '-', ''),
  archive boolean not null default false,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  cree_par uuid default auth.uid()
);
do $$ begin
  alter table public.jeux add constraint jeux_format_chk check (format in ('ops', 'roi', 'montante', 'defis'));
exception when duplicate_object then null; end $$;

alter table public.jeux enable row level security;
drop policy if exists jeux_gerer on public.jeux;
create policy jeux_gerer on public.jeux for all to authenticated
  using (prive.a_acces((select auth.uid()), 'fetes')) with check (prive.a_acces((select auth.uid()), 'fetes'));

create or replace function prive.jeux_maj() returns trigger language plpgsql set search_path = '' as $$
begin new.maj_le := now(); return new; end $$;
drop trigger if exists jeux_maj on public.jeux;
create trigger jeux_maj before update on public.jeux for each row execute function prive.jeux_maj();

-- Écran du club : lecture seule par la clé, sans compte. Seuls les noms affichés sortent (pas les fiches).
create or replace function public.jeu_ecran(p_cle text)
 returns jsonb language sql stable security definer set search_path to ''
as $$
  select jsonb_build_object('titre', j.titre, 'jour', j.jour, 'actuelle', j.actuelle, 'config', j.config, 'maj_le', j.maj_le,
    'joueurs', coalesce((select jsonb_agg(jsonb_build_object('k', x->>'k', 'nom', x->>'nom')) from jsonb_array_elements(j.joueurs) x), '[]'::jsonb),
    'manches', coalesce((select jsonb_agg(case when jsonb_typeof(y->'etat') = 'object' then jsonb_set(y, '{etat}', (y->'etat') - 'hist') else y end order by n)
                         from jsonb_array_elements(j.manches) with ordinality as t(y, n)), '[]'::jsonb))
  from public.jeux j where j.cle = p_cle and length(p_cle) >= 16 and not j.archive;
$$;
revoke all on function public.jeu_ecran(text) from public;
grant execute on function public.jeu_ecran(text) to anon, authenticated;
