-- Messages privés ouverts à tous les adhérents (demande de Dorian du 25/11/2026).
-- À appliquer APRÈS supabase/messages-prives.sql et supabase/acces.sql.
-- Réglage « prive_tous » (Gestion → Rôles et accès) : coché, tout compte de l'appli peut lancer une conversation privée
-- avec n'importe quel adhérent (bouton + dans Messages). Mineurs : mêmes règles qu'avant (parents en copie, sauf désabonnement).
-- Un réglage « Jamais » pour une personne (Par personne) l'emporte toujours.
-- Affichage : « · club » n'est ajouté au nom que si la conversation vient de l'équipe du club.

insert into public.reglages_publics (cle, valeur) values ('prive_tous', 'true'::jsonb)
on conflict (cle) do update set valeur = excluded.valeur, maj_le = now();

create or replace function prive.prive_tous() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select v.valeur = 'true'::jsonb from public.reglages_publics v where v.cle = 'prive_tous'), false);
$$;

-- Équipe du club = accès « prive » par son rôle ou réglage personnel (sans l'ouverture à tous)
create or replace function prive.prive_equipe(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select prive.a_acces(uid, 'prive'); $$;

create or replace function prive.peut_lancer_prive(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select uid is not null and (prive.direction_de(uid) or coalesce(
    (select p.autorise from public.acces_personnes p where p.user_id = uid and p.module = 'prive'),
    prive.a_acces(uid, 'prive') or (prive.prive_tous() and exists (select 1 from public.comptes c where c.user_id = uid))));
$$;

create or replace function public.message_prive_nouveau(p_personne uuid, p_texte text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); p public.personnes; dest uuid[]; did uuid; mid uuid; t text := trim(coalesce(p_texte, ''));
  equipe boolean;
begin
  if me is null then raise exception 'connexion requise'; end if;
  if not prive.peut_lancer_prive(me) then raise exception 'non autorisé'; end if;
  if t = '' then raise exception 'message vide'; end if;
  select * into p from public.personnes where id = p_personne;
  if p.id is null then raise exception 'personne introuvable'; end if;
  dest := array(select u from unnest(prive.destinataires_comptes(p.id)) u where u <> me);
  if coalesce(array_length(dest, 1), 0) = 0 then raise exception 'aucun compte'; end if;
  equipe := prive.prive_equipe(me);
  select d.id into did from public.discussions d
    where d.type = 'prive' and d.source = 'equipe' and d.personne_id = p.id and d.created_by = me and not d.archive limit 1;
  if did is null then
    insert into public.discussions (nom, type, source, ecriture, jeunes, ouvert, categorie, personne_id, created_by, ordre)
      values (left(p.prenom || ' ' || left(p.nom, 1) || '.' || case when equipe then ' · message du club' else '' end, 80),
              'prive', 'equipe', 'tous', true, true, case when equipe then 'Messages du club' else 'Messages privés' end, p.id, me, 50)
      returning id into did;
    insert into public.discussion_membres (discussion_id, user_id, role, origine) values (did, me, 'membre', 'manuel');
  end if;
  insert into public.discussion_membres (discussion_id, user_id, role, origine, created_at)
    select did, u, 'membre', 'manuel', now() - interval '1 second' from unnest(dest) u
    on conflict (discussion_id, user_id) do update set exclu = false;
  update public.discussion_membres set exclu = true where discussion_id = did and user_id <> me and not (user_id = any (dest));
  insert into public.discussion_messages (discussion_id, texte) values (did, t) returning id into mid;
  return jsonb_build_object('discussion_id', did, 'message_id', mid);
end $$;

create or replace function public.mes_discussions()
 returns table(id uuid, nom text, description text, type text, categorie text, ouvert boolean, archive boolean, couleur text, ordre integer, peut_ecrire boolean, admin boolean, muet boolean, lu_le timestamp with time zone, dernier_texte text, dernier_auteur text, dernier_le timestamp with time zone, non_lus integer, membres integer, annonce_id uuid, annonce_num bigint, annonce_titre text, annonce_prix text, signale boolean, expire_le timestamp with time zone, createur text)
 language sql stable security definer set search_path to ''
as $function$
  select d.id,
    case when d.type = 'prive' and d.source = 'equipe' and m.user_id is not null
      then case when d.created_by = (select auth.uid()) then d.nom
                else prive.nom_compte(d.created_by) || case when d.categorie = 'Messages du club' then ' · club' else '' end end
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

revoke all on function prive.prive_tous(), prive.prive_equipe(uuid) from public, anon;
