-- Rencontres par équipes, format Coupe Davis (novembre 2026), dans l'espace coach.
-- 4 équipes, 5 tours : 3 tours de poule, demi-finales (1er–4e, 2e–3e), finale et match pour la 3e place.
-- Une rencontre = Double 1, Double 2 et Simple en même temps. Capitaine différent à chaque tour :
-- s'il gagne son match, toute son équipe gagne 5 points de bonus CLOC'ARENA (reportés à la main dans la gestion).
-- Tout le détail (compositions, scores, point décisif) est rangé dans « tours » et calculé par l'appli.

create table if not exists public.coupes_equipes (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  jour date,
  duree int not null default 10,                 -- minutes par tour
  equipes jsonb not null default '[]'::jsonb,    -- [{ nom, joueurs: ['Prénom', …] }]
  tours jsonb not null default '[]'::jsonb,      -- [{ rencontres: [{ a, b, compo: { a: {cap, d1, d2, s}, b }, sc: { d1: {a, b, pd}, d2, s } }] }]
  archive boolean not null default false,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  cree_par uuid default auth.uid()
);
alter table public.coupes_equipes enable row level security;

-- Qui peut gérer : la direction sportive et les coachs (prénom de coach renseigné, ou coach d'un groupe)
create or replace function prive.coupes_peut() returns boolean
language sql stable security definer set search_path = '' as $$
  select prive.est_direction() or prive.mon_nom_coach() is not null
    or exists (select 1 from public.responsabilites r where r.user_id = (select auth.uid()) and r.groupe_id is not null);
$$;
revoke all on function prive.coupes_peut() from public, anon;
grant execute on function prive.coupes_peut() to authenticated;

drop policy if exists coupes_gerer on public.coupes_equipes;
create policy coupes_gerer on public.coupes_equipes for all to authenticated
  using (prive.coupes_peut()) with check (prive.coupes_peut());
grant select, insert, update, delete on public.coupes_equipes to authenticated;

create or replace function prive.coupes_maj() returns trigger language plpgsql set search_path = '' as $$
begin new.maj_le := now(); return new; end $$;
drop trigger if exists coupes_maj on public.coupes_equipes;
create trigger coupes_maj before update on public.coupes_equipes for each row execute function prive.coupes_maj();
