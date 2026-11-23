-- Se connecter « en tant que » (23/11/2026) : la direction sportive peut ouvrir n'importe quel compte de l'appli
-- pour voir et faire exactement ce que la personne voit et fait sur son téléphone (assistance, tests).
-- La connexion elle-même passe par la fonction Edge « connexion-comme » (vérifie le rôle direction et note chaque entrée au journal).

-- Recherche d'un compte par adresse mail ou par le nom d'un adhérent relié (direction uniquement)
create or replace function public.comptes_chercher(p_q text)
 returns table(user_id uuid, email text, noms text, roles text)
 language sql stable security definer set search_path to ''
as $$
  select c.user_id, c.email,
    coalesce((select string_agg(p.prenom || ' ' || coalesce(p.nom, ''), ', ' order by p.prenom) from public.personnes p
              where p.actif and (p.id = c.personne_id or (c.personne_id is null and p.foyer_id = c.foyer_id))), coalesce((select e.prenom || ' ' || coalesce(e.nom, '') from public.equipe e where e.user_id = c.user_id limit 1), c.prenom_declare || ' ' || c.nom_declare, '')) as noms,
    (select string_agg(distinct r.role, ', ') from public.responsabilites r where r.user_id = c.user_id) as roles
  from public.comptes c
  where prive.est_direction() and c.user_id is not null and c.user_id <> (select auth.uid()) and length(trim(p_q)) >= 2
    and (c.email ilike '%' || trim(p_q) || '%'
      or exists (select 1 from public.personnes p where (p.id = c.personne_id or p.foyer_id = c.foyer_id)
                 and (p.prenom || ' ' || coalesce(p.nom, '')) ilike '%' || trim(p_q) || '%')
      or exists (select 1 from public.equipe e where e.user_id = c.user_id and (coalesce(e.prenom, '') || ' ' || coalesce(e.nom, '') || ' ' || coalesce(e.nom_coach, '')) ilike '%' || trim(p_q) || '%'))
  order by c.email limit 12;
$$;
revoke all on function public.comptes_chercher(text) from public, anon;
grant execute on function public.comptes_chercher(text) to authenticated;
