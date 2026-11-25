-- Parents : voir tous les messages privés de leur enfant mineur qui a son propre compte (demande de Dorian du 25/11/2026).
-- À appliquer APRÈS supabase/messages-prives-tous.sql.
-- Par défaut, chaque compte parent du foyer est ajouté en copie (origine 'parent', lecture seule) à toute conversation privée
-- où se trouve le compte du jeune : celles qu'il lance lui-même, celles qu'on lui envoie.
-- Désactivable par chaque parent, enfant par enfant, dans Profil (même réglage que « messages destinés à mon enfant » :
-- table messages_parent_retrait). Les fils de groupe (CLOC'ARENA, Next Gen…) ne changent pas : les familles y sont déjà.

alter table public.discussion_membres drop constraint if exists discussion_membres_origine_check;
alter table public.discussion_membres add constraint discussion_membres_origine_check
  check (origine = any (array['auto', 'manuel', 'parent']));

-- Comptes parents qui suivent le compte jeune uid (vide si uid n'est pas un compte jeune)
create or replace function prive.parents_suivant(uid uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct c.user_id), '{}')
  from public.comptes cj
    join public.personnes p on p.id = cj.personne_id
    join public.comptes c on c.foyer_id = p.foyer_id and c.user_id <> uid
  where cj.user_id = uid and p.foyer_id is not null
    and prive.mineur(p.date_naissance, p.annee_naissance, p.profil)
    and not prive.compte_jeune(c.user_id)
    and not exists (select 1 from public.messages_parent_retrait r where r.user_id = c.user_id and r.personne_id = p.id);
$$;

create or replace function prive.dm_copie_parents() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.origine = 'parent' or new.exclu then return null; end if;
  if not exists (select 1 from public.discussions d where d.id = new.discussion_id and d.type = 'prive') then return null; end if;
  insert into public.discussion_membres (discussion_id, user_id, role, origine, created_at)
    select new.discussion_id, u, 'membre', 'parent', new.created_at from unnest(prive.parents_suivant(new.user_id)) u
    on conflict (discussion_id, user_id) do nothing;
  return null;
end $$;
drop trigger if exists dm_copie_parents on public.discussion_membres;
create trigger dm_copie_parents after insert on public.discussion_membres
  for each row execute function prive.dm_copie_parents();

-- Conversations déjà ouvertes
insert into public.discussion_membres (discussion_id, user_id, role, origine, created_at)
  select m.discussion_id, u, 'membre', 'parent', m.created_at
  from public.discussion_membres m join public.discussions d on d.id = m.discussion_id and d.type = 'prive'
    cross join lateral unnest(prive.parents_suivant(m.user_id)) u
  where m.origine <> 'parent' and not m.exclu
  on conflict (discussion_id, user_id) do nothing;

-- Copie parent = lecture seule
create or replace function prive.disc_peut_ecrire(did uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.discussions d where d.id = did and not d.archive)
     and not exists (select 1 from public.discussion_membres m where m.discussion_id = did and m.user_id = (select auth.uid()) and m.origine = 'parent')
     and (prive.disc_admin(did) or (prive.disc_membre(did) and exists (select 1 from public.discussions d where d.id = did and d.ecriture = 'tous')));
$$;

-- Réglage du parent : un seul interrupteur « je vois tous les messages de mon enfant »
create or replace function public.parent_messages_regler(p_personne uuid, p_recevoir boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare voir boolean := coalesce(p_recevoir, true); me uuid := auth.uid();
begin
  if not exists (select 1 from public.mes_jeunes_comptes() j where j.personne_id = p_personne) then raise exception 'non autorisé'; end if;
  if voir then
    delete from public.messages_parent_retrait where user_id = me and personne_id = p_personne;
  else
    insert into public.messages_parent_retrait (user_id, personne_id) values (me, p_personne) on conflict do nothing;
  end if;
  -- messages du club adressés à l'enfant
  update public.discussion_membres m set exclu = not voir
    from public.discussions d
    where d.id = m.discussion_id and d.source = 'equipe' and d.personne_id = p_personne and m.user_id = me and d.created_by <> me;
  -- copies parent des conversations de l'enfant
  update public.discussion_membres m set exclu = not voir
    where m.user_id = me and m.origine = 'parent'
      and exists (select 1 from public.discussion_membres y join public.comptes c on c.user_id = y.user_id
                  where y.discussion_id = m.discussion_id and c.personne_id = p_personne and y.origine <> 'parent');
  if voir then
    insert into public.discussion_membres (discussion_id, user_id, role, origine, created_at)
      select y.discussion_id, me, 'membre', 'parent', y.created_at
      from public.discussion_membres y join public.comptes c on c.user_id = y.user_id and c.personne_id = p_personne
        join public.discussions d on d.id = y.discussion_id and d.type = 'prive'
      where y.origine <> 'parent' and not y.exclu
      on conflict (discussion_id, user_id) do nothing;
  end if;
end $$;

-- Nom affiché : le parent en copie voit « Enfant ↔ Autre » ; les autres ne prennent jamais un parent en copie pour nom
create or replace function public.mes_discussions()
 returns table(id uuid, nom text, description text, type text, categorie text, ouvert boolean, archive boolean, couleur text, ordre integer, peut_ecrire boolean, admin boolean, muet boolean, lu_le timestamp with time zone, dernier_texte text, dernier_auteur text, dernier_le timestamp with time zone, non_lus integer, membres integer, annonce_id uuid, annonce_num bigint, annonce_titre text, annonce_prix text, signale boolean, expire_le timestamp with time zone, createur text)
 language sql stable security definer set search_path to ''
as $function$
  select d.id,
    case when d.type = 'prive' and m.origine = 'parent'
      then coalesce((select string_agg(prive.nom_compte(y.user_id), ' ↔ ' order by y.created_at) from public.discussion_membres y
                     where y.discussion_id = d.id and y.origine <> 'parent' and not y.exclu), d.nom)
    when d.type = 'prive' and d.source = 'equipe' and m.user_id is not null
      then case when d.created_by = (select auth.uid()) then d.nom
                else prive.nom_compte(d.created_by) || case when d.categorie = 'Messages du club' then ' · club' else '' end end
    when d.type = 'prive' and m.user_id is not null
      then coalesce((select prive.nom_compte(y.user_id) from public.discussion_membres y where y.discussion_id = d.id and y.user_id <> (select auth.uid()) and y.origine <> 'parent' limit 1), d.nom)
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

revoke all on function prive.parents_suivant(uuid), prive.dm_copie_parents() from public, anon;
