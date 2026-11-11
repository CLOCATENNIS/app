-- Discussions éphémères (novembre 2026)
-- C'est la discussion entière qui est éphémère, pas les messages : à la date de fin choisie par la direction,
-- le fil est soit archivé (il disparaît de l'appli des joueurs, la direction le garde dans la gestion),
-- soit supprimé avec tous ses messages. Les participants peuvent quitter un fil éphémère eux-mêmes.

alter table public.discussions
  add column if not exists expire_le timestamptz,
  add column if not exists fin_action text not null default 'archiver';
do $$ begin
  alter table public.discussions add constraint discussions_fin_action_chk check (fin_action in ('archiver', 'supprimer'));
exception when duplicate_object then null; end $$;

alter table public.discussion_membres add column if not exists quitte_le timestamptz;

-- Liste des fils de l'utilisateur : + date de fin et nom du créateur (pour la bulle « Discussion éphémère créée par… »)
drop function if exists public.mes_discussions();
create function public.mes_discussions()
 returns table(id uuid, nom text, description text, type text, categorie text, ouvert boolean, archive boolean, couleur text, ordre integer, peut_ecrire boolean, admin boolean, muet boolean, lu_le timestamptz, dernier_texte text, dernier_auteur text, dernier_le timestamptz, non_lus integer, membres integer, annonce_id uuid, annonce_num bigint, annonce_titre text, annonce_prix text, signale boolean, expire_le timestamptz, createur text)
 language sql stable security definer set search_path to ''
as $function$
  select d.id,
    case when d.type = 'prive' and d.source = 'equipe' and m.user_id is not null
      then case when d.created_by = (select auth.uid()) then d.nom else prive.nom_compte(d.created_by) || ' · club' end
    when d.type = 'prive' and m.user_id is not null
      then coalesce((select prive.nom_compte(y.user_id) from public.discussion_membres y where y.discussion_id = d.id and y.user_id <> (select auth.uid()) limit 1), d.nom)
      else d.nom end,
    d.description, d.type, d.categorie, d.ouvert, d.archive, d.couleur, d.ordre,
    prive.disc_peut_ecrire(d.id), prive.disc_admin(d.id), coalesce(m.muet, false), m.lu_le,
    der.texte, der.auteur, der.created_at,
    (select count(*)::int from public.discussion_messages x where x.discussion_id = d.id and x.supprime_le is null
       and x.user_id <> (select auth.uid()) and x.created_at > coalesce(m.lu_le, m.created_at, '-infinity')),
    (select count(*)::int from public.discussion_membres y where y.discussion_id = d.id and not y.exclu),
    d.annonce_id, a.num, coalesce(a.titre, case when a.type = 'partenaire' then 'Partenaire : ' || a.prenom end), a.prix, d.signale_le is not null,
    d.expire_le, case when d.expire_le is not null and d.created_by is not null then split_part(prive.nom_compte(d.created_by), ' ', 1) end
  from public.discussions d
  left join public.discussion_membres m on m.discussion_id = d.id and m.user_id = (select auth.uid())
  left join public.annonces a on a.id = d.annonce_id
  left join lateral (select x.texte, x.auteur, x.created_at from public.discussion_messages x
                     where x.discussion_id = d.id and x.supprime_le is null order by x.created_at desc limit 1) der on true
  where prive.disc_membre(d.id) and (m.user_id is not null or prive.est_direction()) and coalesce(m.exclu, false) = false
  order by d.ordre, d.nom;
$function$;
revoke all on function public.mes_discussions() from public, anon;
grant execute on function public.mes_discussions() to authenticated;

-- Quitter un fil éphémère (uniquement les fils éphémères ; la direction peut réintégrer depuis la gestion)
create or replace function public.discussion_quitter(p_disc uuid)
 returns void language plpgsql security definer set search_path to ''
as $function$
begin
  if not exists (select 1 from public.discussions where id = p_disc and expire_le is not null) then
    raise exception 'seules les discussions éphémères peuvent être quittées';
  end if;
  update public.discussion_membres set exclu = true, origine = 'manuel', quitte_le = now()
    where discussion_id = p_disc and user_id = (select auth.uid());
end $function$;
revoke all on function public.discussion_quitter(uuid) from public, anon;
grant execute on function public.discussion_quitter(uuid) to authenticated;

-- Fermeture automatique des fils arrivés à leur date de fin (toutes les 10 minutes)
create or replace function prive.discussions_expirer()
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare n integer := 0; k integer;
begin
  delete from public.discussions where expire_le is not null and expire_le <= now() and fin_action = 'supprimer';
  get diagnostics k = row_count; n := n + k;
  update public.discussions set archive = true where expire_le is not null and expire_le <= now() and fin_action = 'archiver' and not archive;
  get diagnostics k = row_count; n := n + k;
  return n;
end $function$;
revoke all on function prive.discussions_expirer() from public, anon, authenticated;

select cron.unschedule('discussions-ephemeres') where exists (select 1 from cron.job where jobname = 'discussions-ephemeres');
select cron.schedule('discussions-ephemeres', '*/10 * * * *', 'select prive.discussions_expirer()');
