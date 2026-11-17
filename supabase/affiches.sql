-- Affiches des événements et des fêtes (17/11/2026)
-- 1. Une affiche par événement de l'agenda (page #/evenement/<id>)
alter table public.evenements add column if not exists affiche_url text;

-- 2. Plusieurs affiches par fête : [{ url, titre, place }]
--    place : 'haut' (en haut de la page), 'tombola' (bloc tombola), 'flyer' (invitation partagée), 'autre' (en bas de la page)
--    affiche_url et flyer_url restent remplis (1re affiche « haut » et 1er « flyer ») pour la carte d'accueil et le partage.
alter table public.fetes add column if not exists affiches jsonb not null default '[]'::jsonb;
update public.fetes f set affiches = coalesce((
  select jsonb_agg(x) from (
    select jsonb_build_object('url', f.affiche_url, 'place', 'haut', 'titre', 'Affiche de la fête') x where f.affiche_url is not null
    union all
    select jsonb_build_object('url', f.flyer_url, 'place', 'flyer', 'titre', 'Flyer d''invitation') where f.flyer_url is not null
  ) s), '[]'::jsonb)
where f.affiches = '[]'::jsonb;

-- 3. Dossier public « affiches » (JPG, PNG, WebP, 10 Mo max) : lecture par tous, dépôt par l'équipe du club
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('affiches', 'affiches', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists affiches_fichiers_ajout on storage.objects;
drop policy if exists affiches_fichiers_maj on storage.objects;
drop policy if exists affiches_fichiers_suppr on storage.objects;
create policy affiches_fichiers_ajout on storage.objects for insert to authenticated with check (bucket_id = 'affiches' and prive.est_staff());
create policy affiches_fichiers_maj on storage.objects for update to authenticated using (bucket_id = 'affiches' and prive.est_staff());
create policy affiches_fichiers_suppr on storage.objects for delete to authenticated using (bucket_id = 'affiches' and prive.est_staff());
