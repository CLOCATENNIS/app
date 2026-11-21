-- CLOC'ARENA MAG (affiche couverture de magazine) : parcours d'un joueur Tweener sur la saison (21/11/2026)
-- Courbe des rangs (historique arena_tweener_hist), plus longue série de victoires, meilleure journée.
-- Réservé à l'équipe du club, comme les cartes joueurs.
create or replace function public.arena_tweener_parcours(p uuid)
returns jsonb
language plpgsql stable security definer set search_path to ''
as $$
declare
  serie jsonb; meilleure_serie int; journee jsonb;
begin
  if not prive.est_staff() then raise exception 'acces refuse'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('jour', h.jour, 'rang_niveau', h.rang_niveau, 'rang_general', h.rang_general, 'niveau', h.niveau, 'points', h.points) order by h.jour), '[]'::jsonb)
    into serie from public.arena_tweener_hist h where h.personne_id = p;
  with m as (
    select mt.date_match, mt.created_at, (mt.vainqueur = j.equipe) as gagne
    from public.arena_match_joueurs j
    join public.arena_matchs mt on mt.id = j.match_id and mt.statut = 'valide' and mt.circuit = 'tweener'
    where j.personne_id = p and not j.invite),
  g as (select gagne, sum(case when gagne then 0 else 1 end) over (order by date_match, created_at) as grp from m)
  select coalesce(max(n), 0) into meilleure_serie from (select grp, count(*) as n from g where gagne group by grp) x;
  select jsonb_build_object('jour', jour, 'points', pts) into journee from (
    select jour, sum(pts) as pts from (
      select (a.date_points at time zone 'Europe/Paris')::date as jour, a.points as pts from public.arena_points a where a.personne_id = p and a.circuit = 'tweener'
      union all
      select a.date_participation, 1 from public.arena_participations a where a.personne_id = p and a.circuit = 'tweener'
    ) x group by jour order by 2 desc, 1 limit 1) y;
  return jsonb_build_object('serie', serie, 'meilleure_serie', meilleure_serie, 'meilleure_journee', journee);
end;
$$;
revoke all on function public.arena_tweener_parcours(uuid) from public, anon;
grant execute on function public.arena_tweener_parcours(uuid) to authenticated;
