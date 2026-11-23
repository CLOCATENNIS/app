-- Groupes entièrement modifiables (23/11/2026)
-- Avant : les niveaux CLOC'ARENA, les profils Jeunes/Adultes et les formules ADOC étaient retrouvés par leur NOM.
-- Les renommer cassait les niveaux CLOC'ARENA ou la mise à jour ADOC (qui recréait la formule).
-- Maintenant : une clé fixe (cle) sert aux liens, le nom affiché se modifie librement.
-- + une sous-catégorie libre pour ranger les listes (Interclub, Yvelinoises, Galaxie…).

alter table public.groupes add column if not exists cle text;
alter table public.groupes add column if not exists sous_categorie text;
create unique index if not exists groupes_cle_key on public.groupes (cle);

update public.groupes set cle = 'arena:' || replace(nom, 'CLOC''ARENA ', '')
 where type = 'niveau' and cle is null and replace(nom, 'CLOC''ARENA ', '') in ('Blanc', 'Violet', 'Rouge', 'Orange', 'Vert', 'Jaune');
update public.groupes set cle = 'profil:' || lower(nom) where type = 'profil' and cle is null and nom in ('Jeunes', 'Adultes', 'Coachs');
update public.groupes set cle = 'adoc:' || nom where type = 'cours' and cle is null;

update public.groupes set sous_categorie = 'Interclub' where sous_categorie is null and nom like 'Interclub%';
update public.groupes set sous_categorie = 'Yvelinoises' where sous_categorie is null and nom like 'Yvelinoises%';
update public.groupes set sous_categorie = 'Galaxie' where sous_categorie is null and type = 'cours' and nom like 'Galaxie%';

-- Le niveau CLOC'ARENA d'un joueur place automatiquement le joueur dans le bon groupe : par la clé, plus par le nom
create or replace function prive.niveau_arena_apres()
 returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.niveau_arena is not distinct from old.niveau_arena then return new; end if;
  delete from public.groupe_membres gm using public.groupes g
   where gm.groupe_id = g.id and gm.personne_id = new.id and g.type = 'niveau';
  if new.niveau_arena is not null then
    insert into public.groupe_membres (groupe_id, personne_id)
    select g.id, new.id from public.groupes g where g.cle = 'arena:' || new.niveau_arena
    on conflict do nothing;
  end if;
  return new;
end $function$;

create or replace function prive.niveau_arena_avant()
 returns trigger language plpgsql security definer set search_path to '' as $function$
declare g_ancien uuid;
begin
  if new.niveau_arena is not null and new.arena_id is null then
    new.arena_id := 'J' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
  end if;
  if tg_op = 'INSERT' or new.niveau_arena is not distinct from old.niveau_arena then return new; end if;
  select id into g_ancien from public.groupes where cle = 'arena:' || old.niveau_arena;
  if auth.uid() is not null and not prive.est_direction() and not (g_ancien is not null and prive.gere_groupe(g_ancien)) then
    raise exception 'Seule la direction sportive ou le coach du groupe peut changer le niveau CLOC''ARENA';
  end if;
  return new;
end $function$;

create or replace function public.changer_niveau(p uuid, niveau text)
 returns void language plpgsql security definer set search_path to '' as $function$
declare actuel text; g uuid;
begin
  if niveau is not null and niveau not in ('Blanc','Violet','Rouge','Orange','Vert','Jaune') then raise exception 'niveau inconnu'; end if;
  select niveau_arena into actuel from public.personnes where id = p;
  select id into g from public.groupes where cle = 'arena:' || actuel;
  if not prive.est_direction() and not (g is not null and prive.gere_groupe(g)) then
    raise exception 'Seule la direction sportive ou le coach du groupe peut changer le niveau';
  end if;
  update public.personnes set niveau_arena = niveau where id = p;
end $function$;
