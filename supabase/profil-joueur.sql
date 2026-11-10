-- Fiche joueur (demandes de Dorian du 10/11/2026)
-- À appliquer seulement après validation des captures par Dorian.
-- 0. Qui est adhérent (fiches, classement et résultats CLOC'ARENA réservés aux adhérents)
-- 1. Colonnes : niveau club (barème du club), classement FFT actuel et meilleur, photo ; joueur concerné par une annonce ; circuit CLOC'ARENA
-- 2. Demandes de changement de niveau (famille → direction ou coach)
-- 3. Fonctions : profil_joueur, annonces_joueurs, niveau_demander, niveau_traiter, niveau_fixer
-- 4. Photo de profil

-- ---------- 0. Adhérent ----------
-- Compte rattaché à un adhérent (famille ou fiche) ou équipe du club. Les fonctions serveur (service_role) passent.
create or replace function prive.est_adherent()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(auth.role() = 'service_role', false) or prive.est_equipe()
    or exists (select 1 from public.comptes c where c.user_id = auth.uid() and (c.foyer_id is not null or c.personne_id is not null));
$$;

-- Classement, résultats et ancienne fiche CLOC'ARENA : plus accessibles aux visiteurs ni aux comptes non rattachés
revoke execute on function public.arena_classement() from public, anon;
revoke execute on function public.arena_resultats(integer) from public, anon;
revoke execute on function public.arena_fiche(uuid) from public, anon;
grant execute on function public.arena_classement() to authenticated;
grant execute on function public.arena_resultats(integer) to authenticated;
grant execute on function public.arena_fiche(uuid) to authenticated;

-- ---------- 1. Colonnes ----------
alter table public.personnes add column if not exists niveau_club text,
  add column if not exists classement_fft text,
  add column if not exists meilleur_classement_fft text,
  add column if not exists photo_path text;
alter table public.personnes drop constraint if exists personnes_niveau_club_chk;
alter table public.personnes add constraint personnes_niveau_club_chk check (niveau_club is null or niveau_club in (
  'Galaxie Blanc', 'Galaxie Violet', 'Galaxie Rouge', 'Galaxie Orange', 'Galaxie Vert', 'Ados balle jaune', 'Ados compétition',
  'Adultes 1', 'Adultes 2', 'Adultes 3', 'Adultes 4', 'Adultes 5', 'Adultes 6', 'Adultes 7', 'Adultes 8', 'Adultes 9', 'Adultes 10'));

-- Point de départ validé par Dorian : les jeunes CLOC'ARENA reprennent leur couleur (Violet → Galaxie Violet ; Jaune → Ados balle jaune).
-- Les adultes restent « à définir ».
update public.personnes set niveau_club = case when niveau_arena = 'Jaune' then 'Ados balle jaune' else 'Galaxie ' || niveau_arena end
where niveau_club is null and niveau_arena is not null;

alter table public.annonces add column if not exists personne_id uuid references public.personnes(id) on delete set null;

-- Circuit CLOC'ARENA de chaque match, point et présence (tout l'existant est Tweener)
alter table public.arena_matchs add column if not exists circuit text not null default 'tweener' check (circuit in ('tweener', 'masters', 'versus'));
alter table public.arena_points add column if not exists circuit text not null default 'tweener' check (circuit in ('tweener', 'masters', 'versus'));
alter table public.arena_participations add column if not exists circuit text not null default 'tweener' check (circuit in ('tweener', 'masters', 'versus'));
-- Circuits ouverts (Masters et Versus s'ajoutent ici le jour de leur lancement : ["tweener","masters","versus"])
insert into public.reglages_publics (cle, valeur) values ('arena_circuits_ouverts', '["tweener"]'::jsonb) on conflict (cle) do nothing;

-- Classement et résultats Tweener : réservés aux adhérents, limités au circuit Tweener
create or replace function public.arena_classement()
 returns table(personne_id uuid, joueur text, sexe text, niveau text, points numeric, participations integer, matchs integer)
 language sql stable security definer set search_path to '' as $function$
  with pts as (select personne_id, sum(points) as points from public.arena_points where circuit = 'tweener' group by personne_id),
       par as (select personne_id, count(*)::int as n from public.arena_participations where circuit = 'tweener' group by personne_id),
       mat as (select j.personne_id, count(*)::int as n from public.arena_match_joueurs j
               join public.arena_matchs m on m.id = j.match_id and m.statut = 'valide' and m.circuit = 'tweener' where not j.invite group by j.personne_id)
  select p.id, p.prenom || ' ' || left(p.nom, 1) || '.', p.sexe, p.niveau_arena,
         coalesce(pts.points, 0), coalesce(par.n, 0), coalesce(mat.n, 0)
  from public.personnes p
  left join pts on pts.personne_id = p.id
  left join par on par.personne_id = p.id
  left join mat on mat.personne_id = p.id
  where prive.est_adherent() and p.actif and not p.demo and p.arena_id is not null and (coalesce(pts.points, 0) > 0 or coalesce(par.n, 0) > 0)
  order by coalesce(pts.points, 0) desc, coalesce(par.n, 0) desc, p.prenom;
$function$;

create or replace function public.arena_resultats(nb integer default 30)
 returns table(match_id uuid, date_match date, format text, score text, vainqueur smallint, equipe1 text, equipe2 text)
 language sql stable security definer set search_path to '' as $function$
  select m.id, m.date_match, m.format, m.score, m.vainqueur,
    (select string_agg(case when j.invite then 'Invité' else p.prenom || ' ' || left(p.nom, 1) || '.' end, ' / ' order by p.prenom) from public.arena_match_joueurs j join public.personnes p on p.id = j.personne_id where j.match_id = m.id and j.equipe = 1),
    (select string_agg(case when j.invite then 'Invité' else p.prenom || ' ' || left(p.nom, 1) || '.' end, ' / ' order by p.prenom) from public.arena_match_joueurs j join public.personnes p on p.id = j.personne_id where j.match_id = m.id and j.equipe = 2)
  from public.arena_matchs m where m.statut = 'valide' and m.circuit = 'tweener' and prive.est_adherent()
  order by m.date_match desc, m.created_at desc limit least(greatest(nb, 1), 200);
$function$;

-- ---------- 2. Demandes de changement de niveau ----------
create table if not exists public.niveau_demandes (
  id uuid primary key default gen_random_uuid(),
  personne_id uuid not null references public.personnes(id) on delete cascade,
  niveau_actuel text,
  niveau_demande text not null,
  message text check (message is null or length(message) <= 400),
  demande_par uuid not null default auth.uid(),
  statut text not null default 'attente' check (statut in ('attente', 'acceptee', 'refusee')),
  reponse text,
  traite_par uuid,
  traite_le timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists niveau_demandes_une_en_attente on public.niveau_demandes(personne_id) where statut = 'attente';
alter table public.niveau_demandes enable row level security;
-- Qui fixe et valide les niveaux : la direction sportive et les coachs (décision de Dorian du 10/11)
create or replace function prive.fixe_niveaux()
returns boolean language sql stable security definer set search_path = '' as $$
  select prive.est_direction() or prive.a_role(array['enseignant']);
$$;
-- Lecture : la famille voit les demandes de ses membres, la direction et les coachs voient tout. Écriture : par les fonctions ci-dessous.
drop policy if exists niveau_demandes_lire on public.niveau_demandes;
create policy niveau_demandes_lire on public.niveau_demandes for select to authenticated
  using (prive.fixe_niveaux() or personne_id in (select prive.mes_personnes()));

-- ---------- 3. Fonctions ----------
-- Stats d'un joueur dans un circuit CLOC'ARENA
create or replace function prive.arena_stats(p uuid, c text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'points', coalesce((select sum(points) from public.arena_points where personne_id = p and circuit = c), 0),
    'participations', (select count(*) from public.arena_participations where personne_id = p and circuit = c),
    'rang', (select x.rang from (select personne_id, row_number() over (order by sum(points) desc) as rang from public.arena_points where circuit = c group by personne_id) x where x.personne_id = p),
    'rang_niveau', case when c = 'tweener' then (select x.rang from (select cl.personne_id, row_number() over () as rang from public.arena_classement() cl
                      where cl.niveau = (select niveau_arena from public.personnes where id = p)) x where x.personne_id = p) end,
    'matchs', coalesce((select jsonb_agg(m order by m->>'date' desc) from (
        select jsonb_build_object(
          'date', am.date_match, 'format', am.format, 'score', am.score,
          'gagne', (am.vainqueur = mj.equipe), 'equipe', mj.equipe, 'invite', mj.invite,
          'partenaires', (select string_agg(o.prenom || ' ' || left(o.nom,1) || '.', ' / ') from public.arena_match_joueurs j2 join public.personnes o on o.id = j2.personne_id where j2.match_id = am.id and j2.equipe = mj.equipe and j2.personne_id <> p),
          'adversaires', (select string_agg(o.prenom || ' ' || left(o.nom,1) || '.', ' / ') from public.arena_match_joueurs j2 join public.personnes o on o.id = j2.personne_id where j2.match_id = am.id and j2.equipe <> mj.equipe)
        ) as m
        from public.arena_match_joueurs mj join public.arena_matchs am on am.id = mj.match_id
        where mj.personne_id = p and am.statut = 'valide' and am.circuit = c) s), '[]'::jsonb),
    'progression', coalesce((select jsonb_agg(jsonb_build_object('date', d, 'cumul', cumul) order by d) from (
        select d, sum(pts) over (order by d) as cumul from (
          select (date_points at time zone 'Europe/Paris')::date as d, sum(points) as pts from public.arena_points where personne_id = p and circuit = c group by 1) t) u), '[]'::jsonb)
  );
$$;

-- Fiche joueur : visible par tout adhérent connecté (compte rattaché) et par l'équipe. Jamais par un visiteur.
-- Circuits : Tweener pour les jeunes CLOC'ARENA ; Masters pour les adultes et Ados compétition ; Versus pour les jeunes de la balle orange à Ados compétition.
-- À l'ouverture de Masters/Versus : choisir le circuit à la saisie du match et faire suivre le circuit dans les points (fonction points_du_match).
-- Un circuit pas encore ouvert est renvoyé avec ouvert = false (l'appli affiche un sablier).
create or replace function public.profil_joueur(p uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; fam boolean; pe public.personnes; ag int; ouverts text[]; circ jsonb := '[]'::jsonb; c text; lib text; concerne boolean;
begin
  if auth.uid() is null or not prive.est_adherent() then raise exception 'acces refuse'; end if;
  select * into pe from public.personnes where id = p and actif and not demo;
  if pe.id is null then raise exception 'introuvable'; end if;
  fam := p in (select prive.mes_personnes());
  ag := case when pe.date_naissance is not null then date_part('year', age(pe.date_naissance))::int
             when pe.annee_naissance is not null then extract(year from now())::int - pe.annee_naissance end;
  ouverts := coalesce((select array(select jsonb_array_elements_text(valeur)) from public.reglages_publics where cle = 'arena_circuits_ouverts'), array['tweener']);
  foreach c in array array['tweener', 'masters', 'versus'] loop
    concerne := exists (select 1 from public.arena_points where personne_id = p and circuit = c)
      or exists (select 1 from public.arena_participations where personne_id = p and circuit = c)
      or case c
        when 'tweener' then pe.niveau_arena is not null
        when 'masters' then coalesce(ag > 17, pe.profil = 'adulte') or pe.niveau_club = 'Ados compétition' or pe.niveau_club like 'Adultes%'
        else pe.niveau_club in ('Galaxie Orange', 'Galaxie Vert', 'Ados balle jaune', 'Ados compétition') end;
    if concerne then
      lib := 'CLOC''ARENA ' || initcap(c);
      circ := circ || jsonb_build_array(case when c = any(ouverts)
        then prive.arena_stats(p, c) || jsonb_build_object('code', c, 'libelle', lib, 'niveau', case when c = 'tweener' then pe.niveau_arena end, 'ouvert', true)
        else jsonb_build_object('code', c, 'libelle', lib, 'ouvert', false) end);
    end if;
  end loop;
  r := jsonb_build_object(
    'id', pe.id, 'prenom', pe.prenom, 'initiale', left(pe.nom, 1), 'sexe', pe.sexe, 'age', ag,
    'niveau_club', pe.niveau_club, 'niveau_arena', pe.niveau_arena,
    'classement_fft', pe.classement_fft, 'meilleur_classement_fft', pe.meilleur_classement_fft,
    'photo_path', pe.photo_path, 'famille', fam,
    'demande', case when fam then (select jsonb_build_object('niveau_demande', d.niveau_demande, 'statut', d.statut, 'reponse', d.reponse, 'created_at', d.created_at)
                                   from public.niveau_demandes d where d.personne_id = p order by d.created_at desc limit 1) end,
    'circuits', circ);
  return r;
end $$;
revoke all on function public.profil_joueur(uuid) from public, anon;
grant execute on function public.profil_joueur(uuid) to authenticated;

-- Mini fiche du joueur lié à chaque annonce de partenaire en ligne (adhérents connectés)
create or replace function public.annonces_joueurs()
returns table(annonce_id uuid, prenom text, initiale text, age int, niveau_club text, classement_fft text)
language sql stable security definer set search_path = '' as $$
  select a.id, pe.prenom, left(pe.nom, 1),
         case when pe.date_naissance is not null then date_part('year', age(pe.date_naissance))::int end,
         pe.niveau_club, pe.classement_fft
  from public.annonces a join public.personnes pe on pe.id = a.personne_id
  where a.type = 'partenaire' and a.statut in ('publiee', 'attente') and auth.uid() is not null and prive.est_adherent();
$$;
revoke all on function public.annonces_joueurs() from public, anon;
grant execute on function public.annonces_joueurs() to authenticated;

-- Une annonce ne peut être liée qu'à un membre de sa propre famille
create or replace function prive.annonce_personne_ok() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.personne_id is not null and not prive.est_staff() and new.personne_id not in (select prive.mes_personnes()) then
    raise exception 'personne non autorisee';
  end if;
  return new;
end $$;
drop trigger if exists annonce_personne_ok on public.annonces;
create trigger annonce_personne_ok before insert or update of personne_id on public.annonces for each row execute function prive.annonce_personne_ok();

-- La famille demande un changement de niveau (une seule demande en attente par joueur) ; direction et coachs prévenus
create or replace function public.niveau_demander(p uuid, niveau text, message text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare nid uuid; actuel text; qui text;
begin
  if p not in (select prive.mes_personnes()) then raise exception 'acces refuse'; end if;
  select niveau_club, prenom || ' ' || nom into actuel, qui from public.personnes where id = p;
  if niveau is not distinct from actuel then raise exception 'meme niveau'; end if;
  insert into public.niveau_demandes(personne_id, niveau_actuel, niveau_demande, message)
  values (p, actuel, niveau, nullif(trim(message), '')) returning id into nid;
  perform public.notif_ajouter(array(select distinct r.user_id from public.responsabilites r where r.role in ('direction', 'enseignant') and r.groupe_id is null),
    'Demande de niveau', qui || ' : ' || coalesce(actuel, 'à définir') || ' → ' || niveau, '/app/gestion/#/niveaux', 'niveau-demandes');
  return nid;
end $$;
revoke all on function public.niveau_demander(uuid, text, text) from public, anon;
grant execute on function public.niveau_demander(uuid, text, text) to authenticated;

-- La direction ou un coach accepte (le niveau club change) ou refuse ; la famille est prévenue
create or replace function public.niveau_traiter(d uuid, accepter boolean, reponse text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare dem public.niveau_demandes;
begin
  if not prive.fixe_niveaux() then raise exception 'acces refuse'; end if;
  update public.niveau_demandes set statut = case when accepter then 'acceptee' else 'refusee' end,
    reponse = nullif(trim(niveau_traiter.reponse), ''), traite_par = auth.uid(), traite_le = now()
  where id = d and statut = 'attente' returning * into dem;
  if dem.id is null then raise exception 'demande introuvable'; end if;
  if accepter then update public.personnes set niveau_club = dem.niveau_demande where id = dem.personne_id; end if;
  perform public.notif_ajouter(array(select prive.comptes_voyant(array[dem.personne_id])),
    case when accepter then 'Niveau mis à jour' else 'Demande de niveau' end,
    (select prenom from public.personnes where id = dem.personne_id) || case when accepter then ' passe en ' || dem.niveau_demande else ' : demande non retenue' end
      || coalesce(' — ' || dem.reponse, ''),
    '/app/#/joueur/' || dem.personne_id);
end $$;
revoke all on function public.niveau_traiter(uuid, boolean, text) from public, anon;
grant execute on function public.niveau_traiter(uuid, boolean, text) to authenticated;

-- La direction ou un coach fixe directement le niveau club et le classement FFT (gestion → Niveaux des joueurs)
create or replace function public.niveau_fixer(p uuid, niveau text, fft text default null, meilleur text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not prive.fixe_niveaux() then raise exception 'acces refuse'; end if;
  update public.personnes set niveau_club = nullif(niveau, ''), classement_fft = nullif(trim(fft), ''), meilleur_classement_fft = nullif(trim(meilleur), '') where id = p;
end $$;
revoke all on function public.niveau_fixer(uuid, text, text, text) from public, anon;
grant execute on function public.niveau_fixer(uuid, text, text, text) to authenticated;

-- ---------- 4. Photo de profil ----------
-- Espace privé « photos » : un dossier par personne (<personne_id>/<horodatage>.jpg).
-- Lecture : adhérents connectés (lien temporaire) ; dépôt : la famille de la personne ou la direction.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists photos_lire on storage.objects;
create policy photos_lire on storage.objects for select to authenticated
  using (bucket_id = 'photos' and prive.est_adherent());
drop policy if exists photos_deposer on storage.objects;
create policy photos_deposer on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (prive.est_direction() or (storage.foldername(name))[1] in (select x::text from prive.mes_personnes() x)));
drop policy if exists photos_effacer on storage.objects;
create policy photos_effacer on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (prive.est_direction() or (storage.foldername(name))[1] in (select x::text from prive.mes_personnes() x)));

-- Enregistre (ou retire, chemin null) la photo d'une personne : sa famille ou la direction
create or replace function public.photo_definir(p uuid, chemin text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (prive.est_direction() or p in (select prive.mes_personnes())) then raise exception 'acces refuse'; end if;
  if chemin is not null and split_part(chemin, '/', 1) <> p::text then raise exception 'chemin invalide'; end if;
  update public.personnes set photo_path = chemin where id = p;
end $$;
revoke all on function public.photo_definir(uuid, text) from public, anon;
grant execute on function public.photo_definir(uuid, text) to authenticated;

-- ---------- 5. Droits de colonne (annonces : seules certaines colonnes sont ouvertes) ----------
grant select (personne_id) on public.annonces to anon, authenticated;
grant insert (personne_id) on public.annonces to authenticated;
