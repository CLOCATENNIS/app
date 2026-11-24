-- Module « Réservation des terrains » (demande de Dorian du 24/11/2026) : CONSULTATION SEULE.
-- ADOC / Ten'Up restent l'outil officiel : rien ici ne crée, ne modifie ni n'annule une réservation ADOC.
-- À appliquer APRÈS supabase/acces.sql (utilise prive.a_acces et prive.est_adherent).
-- Tant que ce fichier n'est pas appliqué, l'appli affiche le module en DÉMONSTRATION (données fictives, bandeau violet),
-- et seulement à l'équipe du club.
--
-- Sources de données prévues :
--   adoc   : synchronisation officielle (API FFT) — PAS DISPONIBLE à ce jour, en attente d'autorisation (statut non_configure)
--   import : fichier importé depuis l'espace gestion (si un export exploitable existe)
--   local  : occupations saisies à la main dans la gestion (jamais présentées comme des réservations ADOC confirmées)
-- Règle d'or : un créneau dont on ne connaît pas l'état n'est JAMAIS présenté comme disponible.
-- Vie privée : aucun nom de joueur n'est stocké pour les réservations ADOC ; les familles ne lisent le planning
-- qu'au travers de la fonction terrains_planning(), qui ne renvoie ni les notes internes ni l'auteur.

-- ---------- Terrains ----------
create table if not exists public.terrains (
  id text primary key,
  nom text not null,
  surface text not null check (surface = any (array['couvert', 'terre', 'quick', 'autre'])),
  ordre int not null default 0,
  actif boolean not null default true,
  adoc_court_id text,            -- identifiant du court côté FFT (installations.courts.id), pour relier une future synchronisation
  maj_le timestamptz not null default now()
);
insert into public.terrains (id, nom, surface, ordre) values
  ('couvert-1', 'Couvert 1', 'couvert', 1), ('couvert-2', 'Couvert 2', 'couvert', 2),
  ('terre-3', 'Terre 3', 'terre', 3), ('terre-4', 'Terre 4', 'terre', 4),
  ('quick-5', 'Quick 5', 'quick', 5), ('quick-6', 'Quick 6', 'quick', 6), ('quick-7', 'Quick 7', 'quick', 7)
on conflict (id) do nothing;

-- ---------- Horaires d'ouverture ----------
-- Une règle = des jours (1 = lundi … 7 = dimanche), une heure d'ouverture et de fermeture, éventuellement une période (du / au)
-- et éventuellement un seul terrain. La règle la plus précise l'emporte (terrain précis > tous les terrains, période > toute l'année).
create table if not exists public.terrains_horaires (
  id uuid primary key default gen_random_uuid(),
  terrain_id text references public.terrains(id) on delete cascade,
  jours smallint[] not null default '{1,2,3,4,5,6,7}',
  ouverture time not null,
  fermeture time not null,
  du date,
  au date,
  libelle text,
  maj_le timestamptz not null default now(),
  check (fermeture > ouverture),
  check (au is null or du is null or au >= du)
);
-- Départ : créneaux du club à la demi-heure, 8h30 → 22h30 (paramétrage connu de Dorian, à confirmer dans la gestion)
insert into public.terrains_horaires (jours, ouverture, fermeture, libelle)
select '{1,2,3,4,5,6,7}', '08:30', '22:30', 'Horaires habituels'
where not exists (select 1 from public.terrains_horaires);

-- ---------- Occupations (réservations, cours, animations, compétitions, fermetures) ----------
create table if not exists public.terrains_occupations (
  id uuid primary key default gen_random_uuid(),
  terrain_id text references public.terrains(id) on delete cascade,   -- vide = tous les terrains (fermeture du club…)
  debut timestamptz not null,
  fin timestamptz not null,
  categorie text not null check (categorie = any (array['adherents', 'cours', 'animation', 'competition', 'ferme', 'occupe'])),
  source text not null check (source = any (array['adoc', 'import', 'local'])),
  source_ref text,               -- identifiant de la réservation dans la source (idReservation ADOC…), pour éviter les doublons
  libelle text,                  -- texte court visible des adhérents (« Cours collectif », « Tournoi interne »…), jamais un nom
  note text,                     -- note interne, visible de l'équipe seulement
  lien_type text,                -- pour plus tard : versus, double, evenement, interclub, stage…
  lien_id uuid,
  annule boolean not null default false,
  cree_par uuid default auth.uid(),
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  check (fin > debut),
  unique (source, source_ref)
);
create index if not exists terrains_occupations_debut on public.terrains_occupations (debut);
create index if not exists terrains_occupations_terrain on public.terrains_occupations (terrain_id, debut);

-- ---------- État des synchronisations ----------
create table if not exists public.terrains_synchro (
  source text primary key check (source = any (array['adoc', 'import'])),
  actif boolean not null default false,
  statut text not null default 'jamais' check (statut = any (array['jamais', 'ok', 'erreur', 'non_configure', 'en_attente'])),
  message text,
  dernier_essai timestamptz,
  derniere_reussite timestamptz,
  couverture_debut date,         -- jours pour lesquels la source donne l'état COMPLET des terrains
  couverture_fin date,           -- (en dehors : les créneaux libres restent « non connus »)
  nb int
);
insert into public.terrains_synchro (source, actif, statut, message) values
  ('adoc', false, 'non_configure', 'Aucune connexion officielle avec ADOC pour le moment : en attente d''une autorisation de la FFT.'),
  ('import', false, 'jamais', null)
on conflict (source) do nothing;

-- Réglages du module (lisibles par l'appli) : actif pour les adhérents, lien Ten'Up, fréquence, délai avant « plus à jour »
insert into public.reglages_publics (cle, valeur)
values ('terrains_module', '{"actif": false, "tenup_url": "https://tenup.fft.fr/club/57780019/reservations", "frequence_min": 30, "seuil_min": 120}'::jsonb)
on conflict (cle) do nothing;

-- Accès dans la gestion : module « terrains » (direction par défaut ; à ouvrir à d'autres rôles dans Rôles et accès)

-- ---------- Droits ----------
alter table public.terrains enable row level security;
alter table public.terrains_horaires enable row level security;
alter table public.terrains_occupations enable row level security;
alter table public.terrains_synchro enable row level security;

drop policy if exists t_lire on public.terrains;
create policy t_lire on public.terrains for select to authenticated using (prive.est_adherent());
drop policy if exists t_gerer on public.terrains;
create policy t_gerer on public.terrains for all to authenticated using (prive.a_acces(auth.uid(), 'terrains')) with check (prive.a_acces(auth.uid(), 'terrains'));

drop policy if exists th_lire on public.terrains_horaires;
create policy th_lire on public.terrains_horaires for select to authenticated using (prive.est_adherent());
drop policy if exists th_gerer on public.terrains_horaires;
create policy th_gerer on public.terrains_horaires for all to authenticated using (prive.a_acces(auth.uid(), 'terrains')) with check (prive.a_acces(auth.uid(), 'terrains'));

-- La table complète (avec les notes internes) n'est lisible que par l'équipe qui gère les terrains.
-- L'équipe ne saisit que des occupations « local » ou « import » : les lignes « adoc » ne viennent que de la synchronisation (clé serveur).
drop policy if exists to_lire on public.terrains_occupations;
create policy to_lire on public.terrains_occupations for select to authenticated using (prive.a_acces(auth.uid(), 'terrains'));
drop policy if exists to_ajout on public.terrains_occupations;
create policy to_ajout on public.terrains_occupations for insert to authenticated with check (prive.a_acces(auth.uid(), 'terrains') and source <> 'adoc');
drop policy if exists to_modif on public.terrains_occupations;
create policy to_modif on public.terrains_occupations for update to authenticated using (prive.a_acces(auth.uid(), 'terrains') and source <> 'adoc') with check (source <> 'adoc');
drop policy if exists to_suppr on public.terrains_occupations;
create policy to_suppr on public.terrains_occupations for delete to authenticated using (prive.a_acces(auth.uid(), 'terrains') and source <> 'adoc');

drop policy if exists ts_lire on public.terrains_synchro;
create policy ts_lire on public.terrains_synchro for select to authenticated using (prive.est_adherent());
drop policy if exists ts_gerer on public.terrains_synchro;
create policy ts_gerer on public.terrains_synchro for update to authenticated using (prive.a_acces(auth.uid(), 'terrains') and source = 'import') with check (source = 'import');

grant select, insert, update, delete on public.terrains, public.terrains_horaires, public.terrains_occupations to authenticated;
grant select, update on public.terrains_synchro to authenticated;

-- ---------- Lecture du planning par les adhérents ----------
-- Renvoie tout ce qu'il faut pour dessiner le planning de p_du à p_au (14 jours au plus), sans note interne ni auteur.
create or replace function public.terrains_planning(p_du date, p_au date default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare au date := coalesce(p_au, p_du); equipe boolean := prive.a_acces(auth.uid(), 'terrains'); cfg jsonb;
begin
  if auth.uid() is null or not prive.est_adherent() then raise exception 'réservé aux adhérents'; end if;
  if au < p_du or au - p_du > 14 then raise exception 'période invalide'; end if;
  select r.valeur into cfg from public.reglages_publics r where r.cle = 'terrains_module';
  if not coalesce((cfg ->> 'actif')::boolean, false) and not equipe and not prive.est_staff() then
    return jsonb_build_object('module', coalesce(cfg, '{}'::jsonb), 'ferme', true);
  end if;
  return jsonb_build_object(
    'module', coalesce(cfg, '{}'::jsonb),
    'terrains', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'nom', t.nom, 'surface', t.surface, 'ordre', t.ordre) order by t.ordre, t.nom)
                          from public.terrains t where t.actif), '[]'::jsonb),
    'horaires', coalesce((select jsonb_agg(jsonb_build_object('terrain_id', h.terrain_id, 'jours', h.jours, 'ouverture', to_char(h.ouverture, 'HH24:MI'),
                          'fermeture', to_char(h.fermeture, 'HH24:MI'), 'du', h.du, 'au', h.au)) from public.terrains_horaires h), '[]'::jsonb),
    'occupations', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'terrain_id', o.terrain_id, 'debut', o.debut, 'fin', o.fin,
                          'categorie', o.categorie, 'source', o.source,
                          'libelle', case when o.source = 'adoc' and o.categorie in ('adherents', 'occupe') then null else o.libelle end) order by o.debut)
                          from public.terrains_occupations o
                          where not o.annule and o.fin > (p_du::timestamp at time zone 'Europe/Paris')
                            and o.debut < ((au + 1)::timestamp at time zone 'Europe/Paris')), '[]'::jsonb)
      -- Demandes de terrain du double interne faites dans l'appli (créneau de 2 h) : « Double interne » une fois confirmées,
      -- « Demande en cours » avant. Évite que deux équipes demandent le même terrain à la même heure. Jamais de nom.
      || coalesce((select jsonb_agg(jsonb_build_object('id', 'dbl-' || r.id, 'terrain_id', t.id,
                          'debut', (r.jour + r.heure) at time zone 'Europe/Paris', 'fin', (r.jour + r.heure + interval '2 hours') at time zone 'Europe/Paris',
                          'categorie', case when r.statut = 'confirmee' then 'competition' else 'occupe' end, 'source', 'app',
                          'libelle', case when r.statut = 'confirmee' then 'Double interne' else 'Demande en cours' end))
                          from public.double_reservations r
                          join public.terrains t on lower(replace(t.nom, ' ', '')) = lower(replace(r.terrain, ' ', ''))
                          where r.statut in ('demande', 'confirmee') and r.jour between p_du and au), '[]'::jsonb),
    'synchro', coalesce((select jsonb_agg(jsonb_build_object('source', s.source, 'actif', s.actif, 'statut', s.statut, 'message', s.message,
                          'dernier_essai', s.dernier_essai, 'derniere_reussite', s.derniere_reussite,
                          'couverture_debut', s.couverture_debut, 'couverture_fin', s.couverture_fin)) from public.terrains_synchro s), '[]'::jsonb),
    'maintenant', now()
  );
end $$;
revoke all on function public.terrains_planning(date, date) from public, anon;
grant execute on function public.terrains_planning(date, date) to authenticated;

-- ---------- Import d'un fichier (gestion) ----------
-- p_lignes : [{terrain_id, debut, fin, categorie, libelle, ref}] ; p_complet = le fichier donne l'état complet de ces jours
-- (les créneaux absents du fichier deviennent alors « libres » jusqu'au délai « plus à jour »).
-- Les lignes d'un import précédent sur ces jours sont remplacées : pas de doublons.
create or replace function public.terrains_importer(p_lignes jsonb, p_du date, p_au date, p_complet boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not prive.a_acces(auth.uid(), 'terrains') then raise exception 'non autorisé'; end if;
  if p_au < p_du or p_au - p_du > 62 then raise exception 'période invalide (2 mois au plus)'; end if;
  delete from public.terrains_occupations o where o.source = 'import'
    and o.debut >= (p_du::timestamp at time zone 'Europe/Paris') and o.debut < ((p_au + 1)::timestamp at time zone 'Europe/Paris');
  insert into public.terrains_occupations (terrain_id, debut, fin, categorie, source, source_ref, libelle)
  select l ->> 'terrain_id', (l ->> 'debut')::timestamptz, (l ->> 'fin')::timestamptz,
         coalesce(nullif(l ->> 'categorie', ''), 'occupe'), 'import', nullif(l ->> 'ref', ''), left(nullif(trim(l ->> 'libelle'), ''), 60)
  from jsonb_array_elements(p_lignes) l
  where exists (select 1 from public.terrains t where t.id = l ->> 'terrain_id')
  on conflict (source, source_ref) do update set debut = excluded.debut, fin = excluded.fin, categorie = excluded.categorie,
    libelle = excluded.libelle, terrain_id = excluded.terrain_id, annule = false, maj_le = now();
  get diagnostics n = row_count;
  update public.terrains_synchro set actif = true, statut = 'ok', dernier_essai = now(), derniere_reussite = now(), nb = n,
    message = 'Import de ' || n || ' occupation' || case when n > 1 then 's' else '' end || ' (' || to_char(p_du, 'DD/MM') || ' → ' || to_char(p_au, 'DD/MM') || ')',
    couverture_debut = case when p_complet then p_du end, couverture_fin = case when p_complet then p_au end
  where source = 'import';
  return jsonb_build_object('importees', n);
end $$;
revoke all on function public.terrains_importer(jsonb, date, date, boolean) from public, anon;
grant execute on function public.terrains_importer(jsonb, date, date, boolean) to authenticated;

-- Pour la fonction serveur terrains-synchro : la personne qui appelle gère-t-elle les terrains ?
create or replace function public.terrains_peut_gerer(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select prive.a_acces(uid, 'terrains'); $$;
revoke all on function public.terrains_peut_gerer(uuid) from public, anon, authenticated;
grant execute on function public.terrains_peut_gerer(uuid) to service_role;

-- Historique de la gestion
drop trigger if exists zz_journal on public.terrains_occupations;
create trigger zz_journal after insert or update or delete on public.terrains_occupations for each row execute function prive.journaliser();
drop trigger if exists zz_journal on public.terrains_horaires;
create trigger zz_journal after insert or update or delete on public.terrains_horaires for each row execute function prive.journaliser();
drop trigger if exists zz_journal on public.terrains;
create trigger zz_journal after insert or update or delete on public.terrains for each row execute function prive.journaliser();
