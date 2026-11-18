-- Réponses aux messages du club (messagerie, actus, séances) : choix fait à la création
--   prive : message privé dans l'appli, à l'auteur ou à une personne de l'équipe choisie (par défaut)
--   mail  : réponse par mail à une adresse de réponse
--   aucun : message d'info, pas de réponse
-- Les anciens messages (repondre_mode vide) gardent le comportement d'avant : réponse privée à l'auteur.

alter table public.messages add column if not exists repondre_mode text;
alter table public.messages add column if not exists repondre_user uuid references auth.users(id) on delete set null;
alter table public.messages_programmes add column if not exists repondre_mode text;
alter table public.messages_programmes add column if not exists repondre_user uuid references auth.users(id) on delete set null;
do $$ begin
  alter table public.messages add constraint messages_repondre_mode_chk check (repondre_mode is null or repondre_mode in ('prive', 'mail', 'aucun'));
  alter table public.messages_programmes add constraint messages_programmes_repondre_mode_chk check (repondre_mode is null or repondre_mode in ('prive', 'mail', 'aucun'));
exception when duplicate_object then null; end $$;

-- Personnes qui peuvent recevoir les réponses en privé : l'équipe du club (rôles sans groupe) et les coachs
create or replace function prive.repondant_possible(uid uuid) returns boolean
language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.responsabilites r where r.user_id = uid and r.groupe_id is null)
      or exists (select 1 from public.comptes c where c.user_id = uid and nullif(trim(c.nom_coach), '') is not null);
$$;

create or replace function public.repondants_possibles() returns table(user_id uuid, nom text)
language plpgsql stable security definer set search_path to '' as $$
begin
  if not (prive.a_acces(auth.uid(), 'messages') or prive.a_acces(auth.uid(), 'actus')) then raise exception 'non autorisé'; end if;
  return query
    select x.uid, prive.signature(x.uid) from (
      select r.user_id as uid from public.responsabilites r where r.groupe_id is null
      union select c.user_id from public.comptes c where nullif(trim(c.nom_coach), '') is not null) x
    order by (x.uid = auth.uid()) desc, 2;
end $$;
revoke all on function public.repondants_possibles() from public, anon;
grant execute on function public.repondants_possibles() to authenticated;

drop function if exists public.envoyer_message(text, text, text, uuid[], uuid, uuid, text, text, text, uuid);
create or replace function public.envoyer_message(p_titre text, p_texte text, p_cible text, p_groupes uuid[] default null, p_evt uuid default null,
  p_repondre uuid default null, p_lien text default null, p_source text default 'direct', p_expediteur text default null, p_questionnaire uuid default null,
  p_rep_mode text default null, p_rep_user uuid default null)
returns json language plpgsql security definer set search_path to '' as $function$
declare
  me uuid := auth.uid();
  coach text := prive.mon_nom_coach();
  large boolean; exp text; rep public.adresses_reponse; rep_mail text; rep_lib text; mid uuid; nb int; pids uuid[];
  mode text := coalesce(nullif(trim(p_rep_mode), ''), case when p_repondre is not null then 'mail' else 'prive' end); rep_user uuid;
begin
  if me is null then raise exception 'non connecté'; end if;
  if p_cible not in ('tous','coachs','groupes','evenement','nextgen','questionnaire') then raise exception 'cible invalide'; end if;
  if p_cible = 'groupes' and coalesce(array_length(p_groupes, 1), 0) = 0 then raise exception 'aucun groupe'; end if;
  if p_cible = 'evenement' and p_evt is null then raise exception 'aucun événement'; end if;
  if p_cible = 'questionnaire' and p_questionnaire is null then raise exception 'aucun questionnaire'; end if;
  if mode not in ('prive', 'mail', 'aucun') then raise exception 'mode de réponse invalide'; end if;
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
  exp := case when prive.a_acces(me, 'messages') and nullif(trim(p_expediteur), '') is not null then trim(p_expediteur) else prive.signature(me) end;
  if mode = 'prive' then
    -- Réponses en privé dans l'appli : à soi-même, ou à une personne de l'équipe (choix réservé à ceux qui gèrent messages ou actus)
    rep_user := case when p_rep_user is not null and (prive.a_acces(me, 'messages') or prive.a_acces(me, 'actus')) then p_rep_user else me end;
    if rep_user <> me and not prive.repondant_possible(rep_user) then raise exception 'cette personne ne peut pas recevoir les réponses'; end if;
    rep_lib := split_part(prive.nom_compte(rep_user), ' ', 1);
  elsif mode = 'mail' then
    select * into rep from public.adresses_reponse a where a.actif and a.id = p_repondre and prive.a_acces(me, 'messages');
    if rep.id is not null then rep_mail := rep.email; rep_lib := rep.libelle;
    else select c.email into rep_mail from public.comptes c where c.user_id = me; rep_lib := prive.nom_compte(me); end if;
  end if;
  insert into public.messages (expediteur, titre, texte, lien, repondre_a, repondre_libelle, repondre_mode, repondre_user, cible, groupes, evenement_id, source)
  values (left(exp, 80), left(trim(p_titre), 120), left(trim(p_texte), 4000), nullif(p_lien, ''), rep_mail, rep_lib, mode, rep_user, p_cible, p_groupes, p_evt,
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
end $function$;
revoke all on function public.envoyer_message(text, text, text, uuid[], uuid, uuid, text, text, text, uuid, text, uuid) from public, anon;
grant execute on function public.envoyer_message(text, text, text, uuid[], uuid, uuid, text, text, text, uuid, text, uuid) to authenticated;

-- Messages programmés : le choix de réponse suit
create or replace function prive.envoyer_programmes() returns integer
language plpgsql security definer set search_path to '' as $function$
declare
  r public.messages_programmes; res json; n int := 0;
  secret text := (select valeur from prive.reglages where cle = 'cron_secret');
begin
  for r in select * from public.messages_programmes
           where statut = 'attente' and envoyer_le <= now()
           order by envoyer_le for update skip locked
  loop
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', r.auteur, 'role', 'authenticated')::text, true);
      perform set_config('request.jwt.claim.sub', r.auteur::text, true);
      res := public.envoyer_message(r.titre, r.texte, r.cible, r.groupes, r.evenement_id, r.repondre, r.lien, 'direct', r.expediteur, null,
        r.repondre_mode, r.repondre_user);
      update public.messages_programmes set statut = 'envoye', envoye_le = now(), message_id = (res->>'id')::uuid, erreur = null where id = r.id;
      perform net.http_post(
        url := 'https://ccvfdsriogqerdcopuuv.supabase.co/functions/v1/notifier',
        body := jsonb_build_object('mode', 'programme', 'message_id', res->>'id'),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
        timeout_milliseconds := 20000);
      n := n + 1;
    exception when others then
      update public.messages_programmes set statut = 'erreur', erreur = left(sqlerrm, 300) where id = r.id;
    end;
  end loop;
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  return n;
end $function$;

-- Trouver ou créer la conversation privée entre l'adhérent et la personne qui reçoit les réponses
create or replace function prive.reponse_discussion(m public.messages, me uuid) returns uuid
language plpgsql security definer set search_path to '' as $$
declare did uuid; cible uuid := coalesce(m.repondre_user, m.auteur);
begin
  if m.id is null or not exists (select 1 from public.message_destinataires d where d.message_id = m.id and d.user_id = me) then raise exception 'message introuvable'; end if;
  if coalesce(m.repondre_mode, 'prive') <> 'prive' or cible is null or cible = me then raise exception 'pas de réponse possible'; end if;
  select d.id into did from public.discussions d
    where d.type = 'prive' and d.source = 'reponse' and not d.archive
      and exists (select 1 from public.discussion_membres x where x.discussion_id = d.id and x.user_id = me)
      and exists (select 1 from public.discussion_membres x where x.discussion_id = d.id and x.user_id = cible)
    limit 1;
  if did is null then
    insert into public.discussions (nom, type, source, ecriture, jeunes, ouvert, categorie, message_id, created_by, ordre)
      values (left('Réponse · ' || m.titre, 80), 'prive', 'reponse', 'tous', true, true, 'Messages du club', m.id, me, 50) returning id into did;
    insert into public.discussion_membres (discussion_id, user_id, role, origine, created_at)
      values (did, me, 'membre', 'manuel', now()), (did, cible, 'membre', 'manuel', now() - interval '1 second');
  end if;
  return did;
end $$;

create or replace function public.message_repondre(p_message uuid, p_texte text) returns jsonb
language plpgsql security definer set search_path to '' as $function$
declare me uuid := auth.uid(); m public.messages; did uuid; mid uuid; t text := trim(coalesce(p_texte, ''));
begin
  if me is null then raise exception 'connexion requise'; end if;
  if t = '' then raise exception 'message vide'; end if;
  select * into m from public.messages where id = p_message;
  did := prive.reponse_discussion(m, me);
  insert into public.discussion_messages (discussion_id, texte)
    values (did, left('↩ « ' || m.titre || ' »' || E'\n' || t, 4000)) returning id into mid;
  return jsonb_build_object('discussion_id', did, 'message_id', mid);
end $function$;

-- Bouton « Écrire à … » : ouvre directement la conversation privée (le premier message rappelle à quoi on répond)
create or replace function public.message_ouvrir_reponse(p_message uuid) returns uuid
language plpgsql security definer set search_path to '' as $$
declare me uuid := auth.uid(); m public.messages;
begin
  if me is null then raise exception 'connexion requise'; end if;
  select * into m from public.messages where id = p_message;
  return prive.reponse_discussion(m, me);
end $$;
revoke all on function public.message_repondre(uuid, text), public.message_ouvrir_reponse(uuid) from public, anon;
grant execute on function public.message_repondre(uuid, text), public.message_ouvrir_reponse(uuid) to authenticated;
revoke all on function prive.reponse_discussion(public.messages, uuid), prive.repondant_possible(uuid) from public, anon, authenticated;
