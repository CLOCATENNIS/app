-- Jeux d'animation (novembre 2026) : One Point Slam, roi du terrain, montante-descendante, défis à points.
-- Un jeu = une soirée ou une animation, avec ses joueurs (adhérents ou invités tapés sur place) et ses manches.
-- La gestion pilote (accès « Événements »), l'écran du club affiche en direct grâce à une clé secrète, sans compte.

create table if not exists public.jeux (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  jour date,
  format text not null default 'ops',
  joueurs jsonb not null default '[]'::jsonb,   -- [{ k, nom, pid }] ; pid = fiche adhérent, vide pour un invité
  manches jsonb not null default '[]'::jsonb,   -- [{ fmt, lot, etat }] ; etat = état calculé par jeux-moteur.js
  config jsonb not null default '{}'::jsonb,    -- { malus: [...], terrains, defis: [...] }
  actuelle int not null default 0,
  cle text not null unique default replace(gen_random_uuid()::text, '-', ''),
  archive boolean not null default false,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  cree_par uuid default auth.uid()
);
do $$ begin
  alter table public.jeux add constraint jeux_format_chk check (format in ('ops', 'roi', 'montante', 'defis'));
exception when duplicate_object then null; end $$;

alter table public.jeux enable row level security;
drop policy if exists jeux_gerer on public.jeux;
create policy jeux_gerer on public.jeux for all to authenticated
  using (prive.a_acces((select auth.uid()), 'fetes')) with check (prive.a_acces((select auth.uid()), 'fetes'));

create or replace function prive.jeux_maj() returns trigger language plpgsql set search_path = '' as $$
begin new.maj_le := now(); return new; end $$;
drop trigger if exists jeux_maj on public.jeux;
create trigger jeux_maj before update on public.jeux for each row execute function prive.jeux_maj();

-- Écran du club : lecture seule par la clé, sans compte. Seuls les noms affichés sortent (pas les fiches).
create or replace function public.jeu_ecran(p_cle text)
 returns jsonb language sql stable security definer set search_path to ''
as $$
  select jsonb_build_object('titre', j.titre, 'jour', j.jour, 'actuelle', j.actuelle, 'config', j.config, 'maj_le', j.maj_le,
    'joueurs', coalesce((select jsonb_agg(jsonb_build_object('k', x->>'k', 'nom', x->>'nom')) from jsonb_array_elements(j.joueurs) x), '[]'::jsonb),
    'manches', coalesce((select jsonb_agg(case when jsonb_typeof(y->'etat') = 'object' then jsonb_set(y, '{etat}', (y->'etat') - 'hist') else y end order by n)
                         from jsonb_array_elements(j.manches) with ordinality as t(y, n)), '[]'::jsonb))
  from public.jeux j where j.cle = p_cle and length(p_cle) >= 16 and not j.archive;
$$;
revoke all on function public.jeu_ecran(text) from public;
grant execute on function public.jeu_ecran(text) to anon, authenticated;

-- Inscription des adhérents eux-mêmes depuis l'appli (carte à la une, comme la fête de Noël)
-- La carte apparaît à l'heure d'ouverture choisie (par défaut le jour J à 18h30) et disparaît à la fermeture.
alter table public.jeux
  add column if not exists insc_appli boolean not null default false,
  add column if not exists insc_ouvre_le timestamptz,
  add column if not exists insc_ferme_le timestamptz,
  add column if not exists public_cible text not null default 'adultes',
  add column if not exists lieu text;
do $$ begin
  alter table public.jeux add constraint jeux_public_chk check (public_cible in ('adultes', 'tous'));
exception when duplicate_object then null; end $$;

create or replace function prive.jeu_ouvert(j public.jeux) returns boolean language sql stable set search_path = '' as $$
  select j.insc_appli and not j.archive and j.insc_ouvre_le is not null and now() >= j.insc_ouvre_le
    and now() < coalesce(j.insc_ferme_le, (j.jour + 1)::timestamp at time zone 'Europe/Paris', j.insc_ouvre_le + interval '6 hours');
$$;
-- Adulte = profil adulte, et 18 ans ou plus si la date de naissance est connue
create or replace function prive.est_majeur(pid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.personnes p where p.id = pid and p.profil <> 'jeune'
    and (p.date_naissance is null or p.date_naissance <= (current_date - interval '18 years')));
$$;

-- Les jeux ouverts pour l'adhérent connecté : qui de sa famille peut jouer, qui est déjà inscrit
create or replace function public.jeux_a_la_une()
 returns jsonb language sql stable security definer set search_path to ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', j.id, 'titre', j.titre, 'jour', j.jour, 'lieu', j.lieu, 'ferme_le', j.insc_ferme_le,
      'inscrits', jsonb_array_length(j.joueurs),
      'moi', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'prenom', p.prenom,
                'inscrit', exists (select 1 from jsonb_array_elements(j.joueurs) x where x->>'pid' = p.id::text))), '[]'::jsonb)
              from public.personnes p where p.id in (select prive.mes_personnes())
                and (j.public_cible = 'tous' or prive.est_majeur(p.id)))
    ) order by j.insc_ouvre_le), '[]'::jsonb)
  from public.jeux j where prive.est_adherent() and prive.jeu_ouvert(j);
$$;
revoke all on function public.jeux_a_la_une() from public, anon;
grant execute on function public.jeux_a_la_une() to authenticated;

-- S'inscrire ou se désinscrire (seulement soi-même ou sa famille, adultes uniquement si le jeu est réservé aux adultes)
create or replace function public.jeu_inscrire(p_jeu uuid, p_pers uuid, p_oui boolean)
 returns void language plpgsql security definer set search_path to ''
as $$
declare j public.jeux; p public.personnes; k text; nom text; base text; n int := 2;
begin
  select * into j from public.jeux where id = p_jeu for update;
  if not found or not prive.jeu_ouvert(j) then raise exception 'Les inscriptions à ce jeu sont fermées'; end if;
  if p_pers not in (select prive.mes_personnes()) then raise exception 'Tu ne peux inscrire que toi ou ta famille'; end if;
  if j.public_cible = 'adultes' and not prive.est_majeur(p_pers) then raise exception 'Ce jeu est réservé aux adultes'; end if;
  select * into p from public.personnes where id = p_pers;
  select x->>'k' into k from jsonb_array_elements(j.joueurs) x where x->>'pid' = p_pers::text limit 1;
  if p_oui then
    if k is not null then return; end if;
    base := p.prenom || ' ' || upper(left(coalesce(p.nom, ''), 1)) || '.'; nom := base;
    while exists (select 1 from jsonb_array_elements(j.joueurs) x where x->>'nom' = nom) loop nom := base || ' (' || n || ')'; n := n + 1; end loop;
    update public.jeux set joueurs = joueurs || jsonb_build_array(jsonb_build_object('k', 'a' || replace(gen_random_uuid()::text, '-', ''), 'nom', nom, 'pid', p_pers, 'appli', true)) where id = p_jeu;
  else
    if k is null then return; end if;
    if exists (select 1 from jsonb_array_elements(j.manches) m where m->'etat'->>'statut' = 'en_cours' and (m->'etat'->'ordre') ? k) then
      raise exception 'La manche a commencé : préviens l''organisateur pour te retirer';
    end if;
    update public.jeux set joueurs = (select coalesce(jsonb_agg(x), '[]'::jsonb) from jsonb_array_elements(j.joueurs) x where x->>'k' <> k) where id = p_jeu;
  end if;
end $$;
revoke all on function public.jeu_inscrire(uuid, uuid, boolean) from public, anon;
grant execute on function public.jeu_inscrire(uuid, uuid, boolean) to authenticated;
