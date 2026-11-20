-- Rencontres par équipes, format Coupe Davis (novembre 2026), dans l'espace coach.
-- 4 équipes, 5 tours : 3 tours de poule, demi-finales (1er–4e, 2e–3e), finale et match pour la 3e place.
-- Une rencontre = Double 1, Double 2 et Simple en même temps. Capitaine différent à chaque tour :
-- s'il gagne son match, toute son équipe gagne 5 points de bonus CLOC'ARENA (reportés à la main dans la gestion).
-- Tout le détail (compositions, scores, point décisif) est rangé dans « tours » et calculé par l'appli.

create table if not exists public.coupes_equipes (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  jour date,
  duree int not null default 10,                 -- minutes par tour
  equipes jsonb not null default '[]'::jsonb,    -- [{ nom, joueurs: ['Prénom', …] }]
  tours jsonb not null default '[]'::jsonb,      -- [{ rencontres: [{ a, b, compo: { a: {cap, d1, d2, s}, b }, sc: { d1: {a, b, pd}, d2, s } }] }]
  archive boolean not null default false,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  cree_par uuid default auth.uid()
);
alter table public.coupes_equipes enable row level security;

-- Qui peut gérer : la direction sportive et les coachs (prénom de coach renseigné, ou coach d'un groupe)
create or replace function prive.coupes_peut() returns boolean
language sql stable security definer set search_path = '' as $$
  select prive.est_direction() or prive.mon_nom_coach() is not null
    or exists (select 1 from public.responsabilites r where r.user_id = (select auth.uid()) and r.groupe_id is not null);
$$;
revoke all on function prive.coupes_peut() from public, anon;
grant execute on function prive.coupes_peut() to authenticated;

drop policy if exists coupes_gerer on public.coupes_equipes;
create policy coupes_gerer on public.coupes_equipes for all to authenticated
  using (prive.coupes_peut()) with check (prive.coupes_peut());
grant select, insert, update, delete on public.coupes_equipes to authenticated;

create or replace function prive.coupes_maj() returns trigger language plpgsql set search_path = '' as $$
begin new.maj_le := now(); return new; end $$;
drop trigger if exists coupes_maj on public.coupes_equipes;
create trigger coupes_maj before update on public.coupes_equipes for each row execute function prive.coupes_maj();

-- Minuterie du coach (20/11/2026) : à la fin du chrono, une notification fait sonner et vibrer le téléphone,
-- même verrouillé ou appli fermée. L'appli enregistre l'heure de fin ; la base vérifie toutes les 5 secondes
-- et demande à la fonction « minuterie-notifier » d'envoyer la notification.
create table if not exists public.minuteries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  fin_le timestamptz not null,
  titre text not null default 'Coup de sifflet !',
  texte text not null default '',
  url text not null default '/app/',
  cle text,                                      -- ex. « coupe:<id> » : relancer remplace la minuterie précédente
  statut text not null default 'attente',
  cree_le timestamptz not null default now(),
  envoye_le timestamptz
);
do $$ begin
  alter table public.minuteries add constraint minuteries_statut_chk check (statut in ('attente', 'envoye', 'annule'));
exception when duplicate_object then null; end $$;
create index if not exists minuteries_a_envoyer on public.minuteries (fin_le) where statut = 'attente';
alter table public.minuteries enable row level security;
drop policy if exists minuteries_miennes on public.minuteries;
create policy minuteries_miennes on public.minuteries for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and fin_le <= now() + interval '3 hours' and url like '/app/%');
grant select, insert, update on public.minuteries to authenticated;

create or replace function prive.minuteries_envoyer() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0; secret text := (select valeur from prive.reglages where cle = 'cron_secret');
begin
  for r in select id from public.minuteries where statut = 'attente' and fin_le <= now() + interval '2 seconds'
           order by fin_le for update skip locked
  loop
    perform net.http_post(
      url := 'https://ccvfdsriogqerdcopuuv.supabase.co/functions/v1/minuterie-notifier',
      body := jsonb_build_object('id', r.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
      timeout_milliseconds := 10000);
    update public.minuteries set statut = 'envoye', envoye_le = now() where id = r.id;
    n := n + 1;
  end loop;
  delete from public.minuteries where cree_le < now() - interval '2 days';
  return n;
end $$;
revoke all on function prive.minuteries_envoyer() from public, anon, authenticated;
select cron.schedule('minuteries', '5 seconds', 'select prive.minuteries_envoyer()');
