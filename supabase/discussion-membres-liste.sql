-- Infos du fil : liste des membres visible par les membres d'un fil de groupe (pas les conversations privées)
create or replace function public.discussion_membres_liste(p_disc uuid)
 returns table(user_id uuid, nom text, personne_id uuid, admin boolean, club boolean, moi boolean)
 language sql stable security definer set search_path to ''
as $function$
  select m.user_id, prive.nom_compte(m.user_id), c.personne_id, m.role = 'admin',
    exists (select 1 from public.equipe e where e.user_id = m.user_id and e.actif) or exists (select 1 from public.responsabilites r where r.user_id = m.user_id),
    m.user_id = (select auth.uid())
  from public.discussion_membres m
  join public.discussions d on d.id = m.discussion_id
  left join public.comptes c on c.user_id = m.user_id
  where m.discussion_id = p_disc and not m.exclu and d.type <> 'prive' and prive.disc_membre(p_disc)
  order by (m.role = 'admin') desc, 2;
$function$;
revoke all on function public.discussion_membres_liste(uuid) from public, anon;
grant execute on function public.discussion_membres_liste(uuid) to authenticated;
