-- Liste de courses du club (demande de Dorian du 27/11/2026)
-- Gestion › Services du club › Liste de courses. Accès : module « courses » de Rôles et accès
-- (direction toujours, bureau par défaut, puis réglable personne par personne).
-- Une liste = un besoin (ex. Fête de Noël), avec une date « avant le », des articles à cocher, des factures (PDF ou photo).
-- Les listes terminées s'archivent et se dupliquent l'année suivante.

create table if not exists public.courses_listes (
  id uuid primary key default gen_random_uuid(),
  titre text not null check (length(trim(titre)) between 1 and 120),
  avant_le date,
  note text,
  archivee boolean not null default false,
  cree_par uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  maj_le timestamptz not null default now()
);

create table if not exists public.courses_articles (
  id uuid primary key default gen_random_uuid(),
  liste_id uuid not null references public.courses_listes(id) on delete cascade,
  nom text not null check (length(trim(nom)) between 1 and 160),
  quantite text,
  rayon text,
  note text,
  avant_le date,
  pris_par uuid references auth.users(id) on delete set null,
  pris_par_nom text,
  achete boolean not null default false,
  achete_par uuid references auth.users(id) on delete set null,
  achete_par_nom text,
  achete_le timestamptz,
  ordre int not null default 0,
  cree_par uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists courses_articles_liste on public.courses_articles (liste_id, ordre);

create table if not exists public.courses_factures (
  id uuid primary key default gen_random_uuid(),
  liste_id uuid not null references public.courses_listes(id) on delete cascade,
  chemin text not null,
  nom_fichier text,
  libelle text,
  ajoute_par uuid default auth.uid() references auth.users(id) on delete set null,
  ajoute_par_nom text,
  created_at timestamptz not null default now()
);
create index if not exists courses_factures_liste on public.courses_factures (liste_id);

-- Qui a pris / acheté / ajouté : rempli par la base, pas par l'écran
create or replace function prive.courses_qui() returns trigger
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if tg_table_name = 'courses_articles' then
    if new.achete and (tg_op = 'INSERT' or not old.achete) then
      new.achete_par := me; new.achete_par_nom := prive.nom_compte(me); new.achete_le := now();
    elsif not new.achete then
      new.achete_par := null; new.achete_par_nom := null; new.achete_le := null;
    end if;
    if new.pris_par is null then new.pris_par_nom := null;
    elsif tg_op = 'INSERT' or new.pris_par is distinct from old.pris_par then new.pris_par_nom := prive.nom_compte(new.pris_par); end if;
  elsif tg_table_name = 'courses_factures' and tg_op = 'INSERT' then
    new.ajoute_par := me; new.ajoute_par_nom := prive.nom_compte(me);
  elsif tg_table_name = 'courses_listes' and tg_op = 'UPDATE' then
    new.maj_le := now();
  end if;
  return new;
end $$;
drop trigger if exists courses_qui on public.courses_articles;
create trigger courses_qui before insert or update on public.courses_articles for each row execute function prive.courses_qui();
drop trigger if exists courses_qui on public.courses_factures;
create trigger courses_qui before insert on public.courses_factures for each row execute function prive.courses_qui();
drop trigger if exists courses_qui on public.courses_listes;
create trigger courses_qui before update on public.courses_listes for each row execute function prive.courses_qui();

-- Historique de la gestion
drop trigger if exists zz_journal on public.courses_listes;
create trigger zz_journal after insert or update or delete on public.courses_listes for each row execute function prive.journaliser();
drop trigger if exists zz_journal on public.courses_articles;
create trigger zz_journal after insert or update or delete on public.courses_articles for each row execute function prive.journaliser();
drop trigger if exists zz_journal on public.courses_factures;
create trigger zz_journal after insert or update or delete on public.courses_factures for each row execute function prive.journaliser();

-- Droits : uniquement les personnes qui ont le module « courses »
alter table public.courses_listes enable row level security;
alter table public.courses_articles enable row level security;
alter table public.courses_factures enable row level security;
drop policy if exists cl_tout on public.courses_listes;
create policy cl_tout on public.courses_listes for all to authenticated
  using (prive.a_acces((select auth.uid()), 'courses')) with check (prive.a_acces((select auth.uid()), 'courses'));
drop policy if exists ca_tout on public.courses_articles;
create policy ca_tout on public.courses_articles for all to authenticated
  using (prive.a_acces((select auth.uid()), 'courses')) with check (prive.a_acces((select auth.uid()), 'courses'));
drop policy if exists cf_tout on public.courses_factures;
create policy cf_tout on public.courses_factures for all to authenticated
  using (prive.a_acces((select auth.uid()), 'courses')) with check (prive.a_acces((select auth.uid()), 'courses'));

-- Factures : stockage privé (PDF ou photo, 10 Mo max), lien de téléchargement temporaire
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('courses', 'courses', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;
drop policy if exists courses_lire on storage.objects;
create policy courses_lire on storage.objects for select to authenticated using (bucket_id = 'courses' and prive.a_acces((select auth.uid()), 'courses'));
drop policy if exists courses_deposer on storage.objects;
create policy courses_deposer on storage.objects for insert to authenticated with check (bucket_id = 'courses' and prive.a_acces((select auth.uid()), 'courses'));
drop policy if exists courses_effacer on storage.objects;
create policy courses_effacer on storage.objects for delete to authenticated using (bucket_id = 'courses' and prive.a_acces((select auth.uid()), 'courses'));

-- Réglage de départ : le bureau (la direction a toujours tout)
insert into public.acces_roles (role, module) values ('bureau', 'courses') on conflict do nothing;
