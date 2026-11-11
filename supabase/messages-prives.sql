-- Messages privés lancés par l'équipe du club (bouton + dans Messages), demande de Dorian du 11/11/2026.
-- Qui peut lancer : rôles cochés dans Gestion → Réglages (clé prive_roles), par défaut direction, bureau, enseignant, coach, cordeur, accueil.
-- À qui : n'importe quel adhérent. Adulte : son compte (sinon les comptes adultes de sa famille).
-- Mineur : son compte jeune s'il en a un + les comptes des parents, sauf un parent qui a coché « Je ne veux plus recevoir les messages destinés à mon enfant »
--   (table messages_parent_retrait, un choix par parent et par enfant ; proposé seulement quand l'enfant a son propre compte).
-- Lecture par la direction : seulement si la conversation est signalée (règle existante des conversations privées).

alter table public.discussions add column if not exists personne_id uuid references public.personnes(id) on delete set null;
alter table public.discussions drop constraint if exists discussions_source_check;
alter table public.discussions add constraint discussions_source_check
  check (source = any (array['tous', 'groupe', 'double', 'nextgen', 'manuel', 'annonce', 'equipe']));
create table if not exists public.messages_parent_retrait (
  user_id uuid not null references auth.users(id) on delete cascade,
  personne_id uuid not null references public.personnes(id) on delete cascade,
  cree_le timestamptz not null default now(),
  primary key (user_id, personne_id)
);
alter table public.messages_parent_retrait enable row level security;
drop policy if exists mpr_lire on public.messages_parent_retrait;
create policy mpr_lire on public.messages_parent_retrait for select using (user_id = (select auth.uid()));

-- Rôles autorisés à lancer une conversation privée
create or replace function prive.roles_prive() returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select array(select jsonb_array_elements_text(v.valeur)) from public.reglages_publics v
      where v.cle = 'prive_roles' and jsonb_typeof(v.valeur) = 'array'),
    array['direction', 'bureau', 'enseignant', 'coach', 'cordeur', 'accueil']);
$$;
create or replace function prive.peut_lancer_prive(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select uid is not null and exists (select 1 from public.responsabilites r where r.user_id = uid and r.role = any (prive.roles_prive()));
$$;
create or replace function public.peux_lancer_prive() returns boolean
language sql stable security definer set search_path = '' as $$ select prive.peut_lancer_prive(auth.uid()); $$;

-- Comptes qui reçoivent un message adressé à une personne
create or replace function prive.destinataires_comptes(pid uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  with p as (select id, foyer_id, prive.mineur(date_naissance, annee_naissance, profil) as mi
             from public.personnes where id = pid)
  select coalesce(array_agg(distinct x.u), '{}') from (
    select c.user_id as u from public.comptes c, p where not p.mi and c.personne_id = p.id
    union
    select c.user_id from public.comptes c, p where not p.mi and p.foyer_id is not null and c.foyer_id = p.foyer_id
      and not prive.compte_jeune(c.user_id) and not exists (select 1 from public.comptes c2 where c2.personne_id = p.id)
    union
    select c.user_id from public.comptes c, p where p.mi and p.foyer_id is not null and c.foyer_id = p.foyer_id and not prive.compte_jeune(c.user_id)
      and not (exists (select 1 from public.comptes cj where cj.personne_id = p.id)
               and exists (select 1 from public.messages_parent_retrait r where r.user_id = c.user_id and r.personne_id = p.id))
    union
    select c.user_id from public.comptes c, p where p.mi and c.personne_id = p.id
  ) x where x.u is not null;
$$;

-- Recherche d'un destinataire (réservée aux rôles autorisés)
create or replace function public.destinataires_chercher(p_q text)
returns table (id uuid, prenom text, nom text, mineur boolean, age integer, niveau text, comptes integer, compte_jeune boolean, parents integer)
language plpgsql stable security definer set search_path = '' as $$
declare t text := lower(trim(coalesce(p_q, '')));
begin
  if not prive.peut_lancer_prive(auth.uid()) then raise exception 'non autorisé'; end if;
  if length(t) < 2 then return; end if;
  return query
    select p.id, p.prenom, p.nom, prive.mineur(p.date_naissance, p.annee_naissance, p.profil),
      case when p.date_naissance is not null then extract(year from age(p.date_naissance))::int
           when p.annee_naissance is not null then (extract(year from now())::int - p.annee_naissance) end,
      p.niveau_club,
      coalesce(array_length(array(select u from unnest(prive.destinataires_comptes(p.id)) u where u <> auth.uid()), 1), 0),
      exists (select 1 from public.comptes c where c.personne_id = p.id and prive.compte_jeune(c.user_id)),
      coalesce(array_length(array(select u from unnest(prive.destinataires_comptes(p.id)) u
        where u <> auth.uid() and not exists (select 1 from public.comptes c where c.user_id = u and c.personne_id = p.id)), 1), 0)
    from public.personnes p
    where coalesce(p.actif, true) and (lower(p.prenom || ' ' || p.nom) like '%' || t || '%' or lower(p.nom || ' ' || p.prenom) like '%' || t || '%')
    order by p.nom, p.prenom limit 20;
end $$;

-- Nouveau message (ou suite de la conversation déjà ouverte avec cette personne)
create or replace function public.message_prive_nouveau(p_personne uuid, p_texte text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); p public.personnes; dest uuid[]; did uuid; mid uuid; t text := trim(coalesce(p_texte, ''));
begin
  if me is null then raise exception 'connexion requise'; end if;
  if not prive.peut_lancer_prive(me) then raise exception 'non autorisé'; end if;
  if t = '' then raise exception 'message vide'; end if;
  select * into p from public.personnes where id = p_personne;
  if p.id is null then raise exception 'personne introuvable'; end if;
  dest := array(select u from unnest(prive.destinataires_comptes(p.id)) u where u <> me);
  if coalesce(array_length(dest, 1), 0) = 0 then raise exception 'aucun compte'; end if;
  select d.id into did from public.discussions d
    where d.type = 'prive' and d.source = 'equipe' and d.personne_id = p.id and d.created_by = me and not d.archive limit 1;
  if did is null then
    insert into public.discussions (nom, type, source, ecriture, jeunes, ouvert, categorie, personne_id, created_by, ordre)
      values (left(p.prenom || ' ' || left(p.nom, 1) || '. · message du club', 80), 'prive', 'equipe', 'tous', true, true, 'Messages du club', p.id, me, 50)
      returning id into did;
    insert into public.discussion_membres (discussion_id, user_id, role, origine) values (did, me, 'membre', 'manuel');
  end if;
  -- destinataires à jour : un compte ajouté depuis entre, un parent qui a coché « je ne veux plus recevoir » sort
  -- (créés « une seconde avant » : le premier message compte bien comme non lu pour la famille)
  insert into public.discussion_membres (discussion_id, user_id, role, origine, created_at)
    select did, u, 'membre', 'manuel', now() - interval '1 second' from unnest(dest) u
    on conflict (discussion_id, user_id) do update set exclu = false;
  update public.discussion_membres set exclu = true where discussion_id = did and user_id <> me and not (user_id = any (dest));
  insert into public.discussion_messages (discussion_id, texte) values (did, t) returning id into mid;
  return jsonb_build_object('discussion_id', did, 'message_id', mid);
end $$;

-- Parents : enfants mineurs qui ont leur propre compte, et choix « je reçois les messages du club qui lui sont destinés »
create or replace function public.mes_jeunes_comptes() returns table (personne_id uuid, je_recois boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, not exists (select 1 from public.messages_parent_retrait r where r.user_id = auth.uid() and r.personne_id = p.id)
  from public.comptes moi
    join public.personnes p on p.foyer_id = moi.foyer_id
  where moi.user_id = auth.uid() and not prive.compte_jeune(auth.uid())
    and prive.mineur(p.date_naissance, p.annee_naissance, p.profil)
    and exists (select 1 from public.comptes cj where cj.personne_id = p.id);
$$;
create or replace function public.parent_messages_regler(p_personne uuid, p_recevoir boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.mes_jeunes_comptes() j where j.personne_id = p_personne) then raise exception 'non autorisé'; end if;
  if coalesce(p_recevoir, true) then
    delete from public.messages_parent_retrait where user_id = auth.uid() and personne_id = p_personne;
  else
    insert into public.messages_parent_retrait (user_id, personne_id) values (auth.uid(), p_personne) on conflict do nothing;
  end if;
  -- conversations déjà ouvertes au sujet de cet enfant : le parent en sort (ou y revient)
  update public.discussion_membres m set exclu = not coalesce(p_recevoir, true)
    from public.discussions d
    where d.id = m.discussion_id and d.source = 'equipe' and d.personne_id = p_personne and m.user_id = auth.uid() and d.created_by <> auth.uid();
end $$;

-- Nom affiché d'une conversation : celui qui a lancé voit « Prénom N. · message du club », la famille voit qui lui écrit
create or replace function public.mes_discussions()
 returns table(id uuid, nom text, description text, type text, categorie text, ouvert boolean, archive boolean, couleur text, ordre integer, peut_ecrire boolean, admin boolean, muet boolean, lu_le timestamp with time zone, dernier_texte text, dernier_auteur text, dernier_le timestamp with time zone, non_lus integer, membres integer, annonce_id uuid, annonce_num bigint, annonce_titre text, annonce_prix text, signale boolean)
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
    d.annonce_id, a.num, coalesce(a.titre, case when a.type = 'partenaire' then 'Partenaire : ' || a.prenom end), a.prix, d.signale_le is not null
  from public.discussions d
  left join public.discussion_membres m on m.discussion_id = d.id and m.user_id = (select auth.uid())
  left join public.annonces a on a.id = d.annonce_id
  left join lateral (select x.texte, x.auteur, x.created_at from public.discussion_messages x
                     where x.discussion_id = d.id and x.supprime_le is null order by x.created_at desc limit 1) der on true
  where prive.disc_membre(d.id) and (m.user_id is not null or prive.est_direction()) and coalesce(m.exclu, false) = false
  order by d.ordre, d.nom;
$function$;

revoke all on function public.peux_lancer_prive(), public.destinataires_chercher(text), public.message_prive_nouveau(uuid, text),
  public.mes_jeunes_comptes(), public.parent_messages_regler(uuid, boolean) from public, anon;
grant execute on function public.peux_lancer_prive(), public.destinataires_chercher(text), public.message_prive_nouveau(uuid, text),
  public.mes_jeunes_comptes(), public.parent_messages_regler(uuid, boolean) to authenticated;
revoke all on function prive.roles_prive(), prive.peut_lancer_prive(uuid), prive.destinataires_comptes(uuid) from public, anon;
