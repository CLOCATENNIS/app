-- Historique des classements CLOC'ARENA Tweener + données des cartes joueurs (21/11/2026)
-- Une photo du classement par journée de résultats : rang général, rang dans son niveau, rang filles/garçons.
-- Les journées passées restent figées ; la dernière journée est recalculée à chaque nouvelle saisie (déclencheurs).
-- Même calcul que arena_classement_v2 : points + 1 par participation ; à égalité victoires, matchs, niveau (le plus bas devant), prénom.

create table if not exists public.arena_tweener_hist (
  jour date not null,
  personne_id uuid not null references public.personnes(id) on delete cascade,
  niveau text,
  sexe text,
  points numeric not null default 0,
  matchs int not null default 0,
  victoires int not null default 0,
  rang_general int not null,
  rang_niveau int,
  rang_sexe int,
  primary key (jour, personne_id)
);
create index if not exists arena_tweener_hist_personne on public.arena_tweener_hist (personne_id, jour);
alter table public.arena_tweener_hist enable row level security;
drop policy if exists arena_tweener_hist_lire on public.arena_tweener_hist;
-- Réservé à l'équipe du club : les adhérents ne voient pas cet historique
create policy arena_tweener_hist_lire on public.arena_tweener_hist for select to authenticated using (prive.est_staff());

-- Classement Tweener tel qu'il était le soir du jour p_jour (heure de Paris)
create or replace function public.arena_tweener_rangs(p_jour date)
returns table (personne_id uuid, niveau text, sexe text, points numeric, matchs int, victoires int, rang_general int, rang_niveau int, rang_sexe int)
language sql stable security definer set search_path to ''
as $$
  with pts as (
    select a.personne_id, sum(a.points) as points from public.arena_points a
    where a.circuit = 'tweener' and (a.date_points at time zone 'Europe/Paris')::date <= p_jour group by a.personne_id),
  par as (
    select a.personne_id, count(*)::int as n from public.arena_participations a
    where a.circuit = 'tweener' and a.date_participation <= p_jour group by a.personne_id),
  mat as (
    select j.personne_id, count(*)::int as n, (count(*) filter (where m.vainqueur = j.equipe))::int as v
    from public.arena_match_joueurs j
    join public.arena_matchs m on m.id = j.match_id and m.statut = 'valide' and m.circuit = 'tweener' and m.date_match <= p_jour
    where not j.invite group by j.personne_id),
  base as (
    select p.id, p.niveau_arena, p.sexe, p.prenom,
           coalesce(pts.points, 0) + coalesce(par.n, 0) as total, coalesce(mat.n, 0) as n, coalesce(mat.v, 0) as v,
           coalesce(array_position(array['Blanc','Violet','Rouge','Orange','Vert','Jaune'], p.niveau_arena), 99) as ordre_niv
    from public.personnes p
    left join pts on pts.personne_id = p.id
    left join par on par.personne_id = p.id
    left join mat on mat.personne_id = p.id
    where p.actif and not p.demo and p.arena_id is not null
      and (coalesce(pts.points, 0) > 0 or coalesce(par.n, 0) > 0))
  select b.id, b.niveau_arena, b.sexe, b.total, b.n, b.v,
    (row_number() over (order by b.total desc, b.v desc, b.n desc, b.ordre_niv, b.prenom))::int,
    case when b.niveau_arena is null then null else (row_number() over (partition by b.niveau_arena order by b.total desc, b.v desc, b.n desc, b.prenom))::int end,
    case when b.sexe is null then null else (row_number() over (partition by b.sexe order by b.total desc, b.v desc, b.n desc, b.ordre_niv, b.prenom))::int end
  from base b;
$$;
revoke all on function public.arena_tweener_rangs(date) from public, anon;

-- Met l'historique à jour : recalcule la dernière journée déjà enregistrée et ajoute les nouvelles journées.
-- p_tout = true : rejoue toute la saison (rattrapage).
create or replace function public.arena_tweener_hist_maj(p_tout boolean default false)
returns int
language plpgsql security definer set search_path to ''
as $$
declare
  depuis date;
  d date;
  nb int := 0;
begin
  if p_tout then
    delete from public.arena_tweener_hist where true;
    depuis := '-infinity'::date;
  else
    select max(jour) into depuis from public.arena_tweener_hist;
    depuis := coalesce(depuis, '-infinity'::date);
  end if;
  for d in
    select distinct x.jour from (
      select (date_points at time zone 'Europe/Paris')::date as jour from public.arena_points where circuit = 'tweener'
      union select date_participation from public.arena_participations where circuit = 'tweener'
      union select date_match from public.arena_matchs where circuit = 'tweener' and statut = 'valide'
    ) x
    where x.jour is not null and x.jour >= depuis and x.jour <= (now() at time zone 'Europe/Paris')::date
    order by 1
  loop
    delete from public.arena_tweener_hist where jour = d;
    insert into public.arena_tweener_hist (jour, personne_id, niveau, sexe, points, matchs, victoires, rang_general, rang_niveau, rang_sexe)
      select d, r.personne_id, r.niveau, r.sexe, r.points, r.matchs, r.victoires, r.rang_general, r.rang_niveau, r.rang_sexe
      from public.arena_tweener_rangs(d) r;
    nb := nb + 1;
  end loop;
  return nb;
end;
$$;
revoke all on function public.arena_tweener_hist_maj(boolean) from public, anon, authenticated;

-- Déclencheurs : chaque saisie Tweener met l'historique à jour
create or replace function prive.arena_tweener_hist_declencheur()
returns trigger
language plpgsql security definer set search_path to ''
as $$
begin
  perform public.arena_tweener_hist_maj(false);
  return null;
end;
$$;

drop trigger if exists arena_points_hist on public.arena_points;
create trigger arena_points_hist after insert or update or delete on public.arena_points
  for each statement execute function prive.arena_tweener_hist_declencheur();
drop trigger if exists arena_participations_hist on public.arena_participations;
create trigger arena_participations_hist after insert or update or delete on public.arena_participations
  for each statement execute function prive.arena_tweener_hist_declencheur();
drop trigger if exists arena_matchs_hist on public.arena_matchs;
create trigger arena_matchs_hist after insert or update or delete on public.arena_matchs
  for each statement execute function prive.arena_tweener_hist_declencheur();

-- Données d'une carte joueur (direction et coachs) : stats et rangs du jour + meilleurs rangs avec leur 1re date
create or replace function public.arena_tweener_carte(p uuid)
returns jsonb
language plpgsql stable security definer set search_path to ''
as $$
declare
  aujourdhui date := (now() at time zone 'Europe/Paris')::date;
  r record;
  res jsonb;
begin
  if not prive.est_staff() then raise exception 'acces refuse'; end if;
  select * into r from public.arena_tweener_rangs(aujourdhui) x where x.personne_id = p;
  res := jsonb_build_object(
    'jour', aujourdhui,
    'points', coalesce(r.points, 0), 'matchs', coalesce(r.matchs, 0), 'victoires', coalesce(r.victoires, 0),
    'rang_general', r.rang_general, 'rang_niveau', r.rang_niveau, 'rang_sexe', r.rang_sexe,
    'niveau', r.niveau, 'sexe', r.sexe,
    'meilleur_general', (select jsonb_build_object('rang', h.rang_general, 'jour', h.jour) from public.arena_tweener_hist h
                          where h.personne_id = p order by h.rang_general, h.jour limit 1),
    'meilleur_niveau', (select jsonb_build_object('rang', h.rang_niveau, 'jour', h.jour, 'niveau', h.niveau) from public.arena_tweener_hist h
                          where h.personne_id = p and h.rang_niveau is not null order by h.rang_niveau, h.jour limit 1),
    'meilleur_sexe', (select jsonb_build_object('rang', h.rang_sexe, 'jour', h.jour) from public.arena_tweener_hist h
                          where h.personne_id = p and h.rang_sexe is not null order by h.rang_sexe, h.jour limit 1)
  );
  return res;
end;
$$;
revoke all on function public.arena_tweener_carte(uuid) from public, anon;
grant execute on function public.arena_tweener_carte(uuid) to authenticated;

-- Rattrapage : rejoue toutes les journées depuis le début de la saison
select public.arena_tweener_hist_maj(true);
