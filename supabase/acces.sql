-- Rôles et accès réglables (demande de Dorian du 11/11/2026) : par rôle (bureau, coachs, accueil…) puis personne par personne.
-- À appliquer APRÈS supabase/messages-prives.sql.
-- Règle : la direction a toujours tout. Sinon, un réglage « personne » (toujours / jamais) l'emporte sur le réglage du rôle.
-- Modules = ceux de l'espace gestion + deux fonctions de l'appli :
--   ecrire_groupes : écrire à n'importe quel groupe depuis l'appli (les coachs écrivent toujours à LEURS groupes)
--   prive          : démarrer une conversation privée (bouton + dans Messages)
-- Étape 1 : ces réglages décident de l'affichage de la gestion et de l'envoi des messages (vérifiés par la base).
-- Les données des autres modules restent protégées au niveau « équipe du club » (règles existantes) : à basculer module par module ensuite.

create table if not exists public.acces_roles (
  role text not null check (role = any (array['bureau', 'accueil', 'enseignant', 'coach', 'responsable', 'cordeur'])),
  module text not null,
  primary key (role, module)
);
create table if not exists public.acces_personnes (
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  autorise boolean not null,
  maj_le timestamptz not null default now(),
  primary key (user_id, module)
);
alter table public.acces_roles enable row level security;
alter table public.acces_personnes enable row level security;
drop policy if exists ar_lire on public.acces_roles;
create policy ar_lire on public.acces_roles for select to authenticated using (true);
drop policy if exists ar_gerer on public.acces_roles;
create policy ar_gerer on public.acces_roles for all to authenticated using (prive.est_direction()) with check (prive.est_direction());
drop policy if exists ap_lire on public.acces_personnes;
create policy ap_lire on public.acces_personnes for select to authenticated using (user_id = (select auth.uid()) or prive.est_direction());
drop policy if exists ap_gerer on public.acces_personnes;
create policy ap_gerer on public.acces_personnes for all to authenticated using (prive.est_direction()) with check (prive.est_direction());

-- Réglage de départ = les accès d'aujourd'hui, sauf : messagerie de la gestion pour la direction seule ; bureau retiré des messages privés
insert into public.acces_roles (role, module) values
  ('bureau', 'accueil'),
  ('accueil', 'accueil'),
  ('cordeur', 'accueil'),
  ('bureau', 'actus'),
  ('accueil', 'actus'),
  ('bureau', 'accueilapp'),
  ('accueil', 'accueilapp'),
  ('bureau', 'evenements'),
  ('bureau', 'inscriptions'),
  ('accueil', 'inscriptions'),
  ('bureau', 'fetes'),
  ('accueil', 'fetes'),
  ('bureau', 'adherents'),
  ('accueil', 'adherents'),
  ('bureau', 'adoc'),
  ('bureau', 'groupes'),
  ('bureau', 'annonces'),
  ('accueil', 'annonces'),
  ('accueil', 'cordage'),
  ('cordeur', 'cordage'),
  ('bureau', 'boutique'),
  ('accueil', 'boutique'),
  ('bureau', 'reseaux'),
  ('accueil', 'reseaux'),
  ('bureau', 'presence'),
  ('accueil', 'presence'),
  ('cordeur', 'presence'),
  ('enseignant', 'prive'),
  ('coach', 'prive'),
  ('cordeur', 'prive'),
  ('accueil', 'prive')
on conflict do nothing;

create or replace function prive.direction_de(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.responsabilites r where r.user_id = uid and r.role = 'direction' and r.groupe_id is null);
$$;
create or replace function prive.a_acces(uid uuid, m text) returns boolean
language sql stable security definer set search_path = '' as $$
  select uid is not null and (prive.direction_de(uid) or coalesce(
    (select p.autorise from public.acces_personnes p where p.user_id = uid and p.module = m),
    exists (select 1 from public.acces_roles a join public.responsabilites r on r.role = a.role and r.groupe_id is null
            where r.user_id = uid and a.module = m)));
$$;
-- Pour l'écran : la liste des modules de la personne connectée ('*' = direction, tout)
create or replace function public.mes_acces() returns text[]
language sql stable security definer set search_path = '' as $$
  select case when prive.direction_de(auth.uid()) then array['*'] else coalesce(array(
    select m from (select a.module as m from public.acces_roles a join public.responsabilites r on r.role = a.role and r.groupe_id is null where r.user_id = auth.uid()
                   union select p.module from public.acces_personnes p where p.user_id = auth.uid()) x
    where prive.a_acces(auth.uid(), x.m) order by 1), '{}') end;
$$;
-- Pour l'écran « Rôles et accès » : l'équipe du club et ses rôles
create or replace function public.equipe_acces() returns table (user_id uuid, nom text, roles text[], perso jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not prive.est_direction() then raise exception 'réservé à la direction'; end if;
  return query
    select r.user_id, prive.nom_compte(r.user_id), array_agg(distinct r.role order by r.role),
      coalesce((select jsonb_object_agg(p.module, p.autorise) from public.acces_personnes p where p.user_id = r.user_id), '{}'::jsonb)
    from public.responsabilites r where r.groupe_id is null
    group by r.user_id order by 2;
end $$;

-- Messages privés : le droit vient maintenant de « Rôles et accès » (module prive) ; l'ancien réglage prive_roles n'est plus utilisé
create or replace function prive.peut_lancer_prive(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select prive.a_acces(uid, 'prive'); $$;

-- Envoi des messages : droit vérifié selon la porte d'entrée, signature = la vraie personne, réponses vers l'auteur
create or replace function prive.signature(uid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select prive.nom_compte(uid) || ' · ' || coalesce(
    (select case r.role when 'direction' then 'Direction sportive' when 'enseignant' then 'Coach' when 'coach' then 'Coach'
             when 'bureau' then 'Bureau' when 'accueil' then 'Accueil' when 'cordeur' then 'Cordeur' else 'Club' end
     from public.responsabilites r where r.user_id = uid and r.groupe_id is null
     order by array_position(array['direction', 'enseignant', 'coach', 'bureau', 'accueil', 'cordeur', 'responsable'], r.role) limit 1),
    case when prive.mon_nom_coach() is not null then 'Coach' else 'Club' end);
$$;

create or replace function public.envoyer_message(p_titre text, p_texte text, p_cible text, p_groupes uuid[] default null, p_evt uuid default null,
  p_repondre uuid default null, p_lien text default null, p_source text default 'direct', p_expediteur text default null, p_questionnaire uuid default null)
returns json language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  coach text := prive.mon_nom_coach();
  large boolean; exp text; rep public.adresses_reponse; rep_mail text; rep_lib text; mid uuid; nb int; pids uuid[];
begin
  if me is null then raise exception 'non connecté'; end if;
  if p_cible not in ('tous','coachs','groupes','evenement','nextgen','questionnaire') then raise exception 'cible invalide'; end if;
  if p_cible = 'groupes' and coalesce(array_length(p_groupes, 1), 0) = 0 then raise exception 'aucun groupe'; end if;
  if p_cible = 'evenement' and p_evt is null then raise exception 'aucun événement'; end if;
  if p_cible = 'questionnaire' and p_questionnaire is null then raise exception 'aucun questionnaire'; end if;
  -- droit « large » selon d'où vient l'envoi
  large := case
    when p_cible = 'questionnaire' then prive.a_acces(me, 'questionnaires')
    when p_source = 'actu' then prive.a_acces(me, 'actus')
    when p_source = 'seance' then prive.a_acces(me, 'evenements') or prive.a_acces(me, 'messages')
    else prive.a_acces(me, 'messages') or (p_cible = 'groupes' and prive.a_acces(me, 'ecrire_groupes')) end;
  if not large then
    if coach is null then raise exception 'non autorisé'; end if;
    if p_cible = 'groupes' and exists (select 1 from unnest(p_groupes) g where g not in (select prive.groupes_encadres())) then
      raise exception 'tu ne peux écrire qu''à tes groupes'; end if;
    if p_cible = 'evenement' and not (prive.gere_evenement(p_evt)
        or exists (select 1 from prive.evt_groupes(p_evt) g where g in (select prive.groupes_encadres()))
        or exists (select 1 from public.evenements e where e.id = p_evt and lower(coalesce(e.encadrant, '')) like '%' || lower(coach) || '%')) then
      raise exception 'tu n''encadres pas cette séance'; end if;
    if p_cible in ('tous', 'coachs', 'nextgen', 'questionnaire') then raise exception 'non autorisé'; end if;
  end if;
  -- signature : un nom d'équipe choisi dans la messagerie de la gestion (direction), sinon la vraie personne et son rôle
  exp := case when prive.a_acces(me, 'messages') and nullif(trim(p_expediteur), '') is not null then trim(p_expediteur) else prive.signature(me) end;
  -- réponses : l'adresse choisie dans la messagerie de la gestion, sinon l'auteur lui-même
  select * into rep from public.adresses_reponse a where a.actif and a.id = p_repondre and prive.a_acces(me, 'messages');
  if rep.id is not null then rep_mail := rep.email; rep_lib := rep.libelle;
  else select c.email into rep_mail from public.comptes c where c.user_id = me; rep_lib := prive.nom_compte(me); end if;

  insert into public.messages (expediteur, titre, texte, lien, repondre_a, repondre_libelle, cible, groupes, evenement_id, source)
  values (left(exp, 80), left(trim(p_titre), 120), left(trim(p_texte), 4000), nullif(p_lien, ''), rep_mail, rep_lib, p_cible, p_groupes, p_evt,
          case when p_source in ('actu', 'seance') then p_source else 'direct' end)
  returning id into mid;

  select array(
    select gm.personne_id from public.groupe_membres gm where p_cible = 'groupes' and gm.groupe_id = any(p_groupes)
    union select gm.personne_id from public.groupe_membres gm where p_cible = 'evenement' and gm.groupe_id in (select prive.evt_groupes(p_evt))
      and not coalesce((select inscription_ouverte from public.evenements where id = p_evt), false)
    union select i.personne_id from public.inscriptions i where p_cible = 'evenement' and i.evenement_id = p_evt and i.statut = 'inscrit'
    union select n.personne_id from public.nextgen n where p_cible = 'nextgen' and (n.au is null or n.au >= current_date)
    union select x from prive.questionnaire_personnes(p_questionnaire) x where p_cible = 'questionnaire'
      and x not in (select r.personne_id from public.questionnaire_reponses r where r.questionnaire_id = p_questionnaire)
  ) into pids;

  insert into public.message_destinataires (message_id, user_id, pour)
  select mid, d.user_id, d.pour from (
    select c.user_id, null::text as pour from public.comptes c where p_cible = 'tous'
    union select c.user_id, null from public.comptes c where p_cible = 'coachs' and nullif(trim(c.nom_coach), '') is not null
    union select v.user_id, v.pour from prive.comptes_voyant(pids) v where p_cible in ('groupes', 'evenement', 'nextgen', 'questionnaire')
  ) d;
  get diagnostics nb = row_count;
  update public.messages set nb_dest = nb where id = mid;
  return json_build_object('id', mid, 'destinataires', nb);
end $$;

-- Répondre à un message du club dans l'appli : conversation privée avec son auteur
alter table public.discussions drop constraint if exists discussions_source_check;
alter table public.discussions add constraint discussions_source_check
  check (source = any (array['tous', 'groupe', 'double', 'nextgen', 'manuel', 'annonce', 'equipe', 'reponse']));
alter table public.discussions add column if not exists message_id uuid references public.messages(id) on delete set null;
create or replace function public.message_repondre(p_message uuid, p_texte text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.messages; did uuid; mid uuid; t text := trim(coalesce(p_texte, ''));
begin
  if me is null then raise exception 'connexion requise'; end if;
  if t = '' then raise exception 'message vide'; end if;
  select * into m from public.messages where id = p_message;
  if m.id is null or not exists (select 1 from public.message_destinataires d where d.message_id = m.id and d.user_id = me) then raise exception 'message introuvable'; end if;
  if m.auteur is null or m.auteur = me then raise exception 'pas de réponse possible'; end if;
  -- une seule conversation par auteur et par famille : on la reprend si elle existe
  select d.id into did from public.discussions d
    where d.type = 'prive' and d.source = 'reponse' and not d.archive
      and exists (select 1 from public.discussion_membres x where x.discussion_id = d.id and x.user_id = me)
      and exists (select 1 from public.discussion_membres x where x.discussion_id = d.id and x.user_id = m.auteur)
    limit 1;
  if did is null then
    insert into public.discussions (nom, type, source, ecriture, jeunes, ouvert, categorie, message_id, created_by, ordre)
      values (left('Réponse · ' || m.titre, 80), 'prive', 'reponse', 'tous', true, true, 'Messages du club', m.id, me, 50) returning id into did;
    insert into public.discussion_membres (discussion_id, user_id, role, origine, created_at)
      values (did, me, 'membre', 'manuel', now()), (did, m.auteur, 'membre', 'manuel', now() - interval '1 second');
  end if;
  insert into public.discussion_messages (discussion_id, texte)
    values (did, left('↩ « ' || m.titre || ' »' || E'\n' || t, 4000)) returning id into mid;
  return jsonb_build_object('discussion_id', did, 'message_id', mid);
end $$;

revoke all on function public.mes_acces(), public.equipe_acces(), public.message_repondre(uuid, text) from public, anon;
grant execute on function public.mes_acces(), public.equipe_acces(), public.message_repondre(uuid, text) to authenticated;
revoke all on function prive.direction_de(uuid), prive.a_acces(uuid, text), prive.signature(uuid) from public, anon;
