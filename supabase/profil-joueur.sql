-- Fiche joueur (demande de Dorian du 10/11/2026)
-- À appliquer seulement après validation des captures par Dorian.
-- 1. Colonnes : niveau club (barème du club), classement FFT actuel et meilleur ; joueur concerné par une annonce
-- 2. Demandes de changement de niveau (famille → équipe)
-- 3. Fonctions : profil_joueur, annonces_joueurs, niveau_demander, niveau_traiter

-- ---------- 1. Colonnes ----------
alter table public.personnes add column if not exists niveau_club text,
  add column if not exists classement_fft text,
  add column if not exists meilleur_classement_fft text;
alter table public.personnes drop constraint if exists personnes_niveau_club_chk;
alter table public.personnes add constraint personnes_niveau_club_chk check (niveau_club is null or niveau_club in (
  'Galaxie Blanc', 'Galaxie Violet', 'Galaxie Rouge', 'Galaxie Orange', 'Galaxie Vert', 'Ados balle jaune', 'Ados compétition',
  'Adultes 1', 'Adultes 2', 'Adultes 3', 'Adultes 4', 'Adultes 5', 'Adultes 6', 'Adultes 7', 'Adultes 8', 'Adultes 9', 'Adultes 10'));

-- Point de départ proposé : les jeunes CLOC'ARENA reprennent leur couleur (Jaune → Ados balle jaune). Les adultes restent « à définir ».
update public.personnes set niveau_club = case when niveau_arena = 'Jaune' then 'Ados balle jaune' else 'Galaxie ' || niveau_arena end
where niveau_club is null and niveau_arena is not null;

alter table public.annonces add column if not exists personne_id uuid references public.personnes(id) on delete set null;

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
-- Lecture : la famille voit les demandes de ses membres, la direction voit tout. Écriture : uniquement par les fonctions ci-dessous.
drop policy if exists niveau_demandes_lire on public.niveau_demandes;
create policy niveau_demandes_lire on public.niveau_demandes for select to authenticated
  using (prive.est_direction() or personne_id in (select prive.mes_personnes()));

-- ---------- 3. Fonctions ----------
-- Fiche joueur : visible par tout adhérent connecté (compte rattaché) et par l'équipe. Jamais par un visiteur.
create or replace function public.profil_joueur(p uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; fam boolean;
begin
  if auth.uid() is null or not (prive.est_equipe() or exists (select 1 from public.comptes c where c.user_id = auth.uid() and (c.foyer_id is not null or c.personne_id is not null))) then
    raise exception 'acces refuse';
  end if;
  fam := p in (select prive.mes_personnes());
  select jsonb_build_object(
    'id', pe.id, 'prenom', pe.prenom, 'initiale', left(pe.nom, 1), 'sexe', pe.sexe,
    'age', case when pe.date_naissance is not null then date_part('year', age(pe.date_naissance))::int
                when pe.annee_naissance is not null then extract(year from now())::int - pe.annee_naissance end,
    'niveau_club', pe.niveau_club, 'niveau_arena', pe.niveau_arena,
    'classement_fft', pe.classement_fft, 'meilleur_classement_fft', pe.meilleur_classement_fft,
    'famille', fam,
    'demande', case when fam then (select jsonb_build_object('niveau_demande', d.niveau_demande, 'statut', d.statut, 'reponse', d.reponse, 'created_at', d.created_at)
                                   from public.niveau_demandes d where d.personne_id = p order by d.created_at desc limit 1) end,
    -- Circuits CLOC'ARENA : aujourd'hui seul Tweener a des données ; Masters et Versus s'ajouteront ici quand leurs matchs seront saisis
    'circuits', case when pe.arena_id is not null and exists (select 1 from public.arena_classement() c where c.personne_id = p) then
      jsonb_build_array((public.arena_fiche(p) - 'prenom' - 'nom' - 'id' - 'sexe') || jsonb_build_object('code', 'tweener', 'libelle', 'CLOC''ARENA Tweener'))
      else '[]'::jsonb end
  ) into r from public.personnes pe where pe.id = p and pe.actif and not pe.demo;
  if r is null then raise exception 'introuvable'; end if;
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
  where a.type = 'partenaire' and a.statut in ('publiee', 'attente')
    and auth.uid() is not null
    and (prive.est_equipe() or exists (select 1 from public.comptes c where c.user_id = auth.uid()));
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

-- La famille demande un changement de niveau (une seule demande en attente par joueur)
create or replace function public.niveau_demander(p uuid, niveau text, message text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare nid uuid; actuel text; qui text;
begin
  if p not in (select prive.mes_personnes()) then raise exception 'acces refuse'; end if;
  select niveau_club, prenom || ' ' || nom into actuel, qui from public.personnes where id = p;
  if niveau is not distinct from actuel then raise exception 'meme niveau'; end if;
  insert into public.niveau_demandes(personne_id, niveau_actuel, niveau_demande, message)
  values (p, actuel, niveau, nullif(trim(message), '')) returning id into nid;
  perform public.notif_ajouter(array(select r.user_id from public.responsabilites r where r.role = 'direction' and r.groupe_id is null),
    'Demande de niveau', qui || ' : ' || coalesce(actuel, 'à définir') || ' → ' || niveau, '/app/gestion/#/niveaux', 'niveau-demandes');
  return nid;
end $$;
revoke all on function public.niveau_demander(uuid, text, text) from public, anon;
grant execute on function public.niveau_demander(uuid, text, text) to authenticated;

-- La direction accepte (le niveau club change) ou refuse ; la famille est prévenue
create or replace function public.niveau_traiter(d uuid, accepter boolean, reponse text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare dem public.niveau_demandes;
begin
  if not prive.est_direction() then raise exception 'acces refuse'; end if;
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
