-- Challenge Week CLOC'ARENA Tweener (23, 27 et 28 novembre 2026) — cadrage Notion « Challenge Week Tweener ».
-- Une animation temporaire : des défis (frappes, volées, services, deux balles, jongles, étoile), des équipes tirées
-- par niveau à chaque séance, des tentatives illimitées et des points par paliers de performance.
-- Les points de la Challenge Week sont séparés du classement Tweener (ils n'y sont pas envoyés).

create table if not exists public.arena_challenges (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  circuit text not null default 'tweener',
  debut date,
  fin date,
  en_ligne boolean not null default false,   -- visible dans l'appli des familles (onglet Challenge du Tweener)
  archive boolean not null default false,
  defis jsonb not null default '[]'::jsonb,   -- [{ k, nom, mode: duo|equipe|solo, unite: nb|sec, consigne, consignes: {niveau: texte}, seuils: {tous: [[valeur, points]], Rouge: [...]}, actif }]
  seances jsonb not null default '[]'::jsonb, -- [{ jour, niveaux: [...], evenement_id }]
  equipes jsonb not null default '{}'::jsonb, -- { jour: { presents: [pid], equipes: [{ k, niveau, joueurs: [pid] }] } }
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);

-- Une tentative = un résultat saisi. La composition est figée dans la tentative (changer les équipes ne touche pas aux résultats).
create table if not exists public.arena_challenge_essais (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.arena_challenges(id) on delete cascade,
  jour date not null,
  defi text not null,
  niveau text not null,
  joueurs uuid[] not null,
  scores jsonb not null default '{}'::jsonb,  -- résultat brut de chaque joueur pour les défis en binôme { pid: n }
  resultat numeric not null,                  -- performance officielle (meilleur des deux en binôme, temps pour l'étoile)
  annule boolean not null default false,
  cree_par uuid default auth.uid(),
  cree_le timestamptz not null default now()
);
create index if not exists arena_challenge_essais_ch on public.arena_challenge_essais (challenge_id, defi, niveau);

alter table public.arena_challenges enable row level security;
alter table public.arena_challenge_essais enable row level security;

drop policy if exists arena_challenges_gestion on public.arena_challenges;
create policy arena_challenges_gestion on public.arena_challenges for all to authenticated using (prive.est_direction()) with check (prive.est_direction());
drop policy if exists arena_challenge_essais_gestion on public.arena_challenge_essais;
create policy arena_challenge_essais_gestion on public.arena_challenge_essais for all to authenticated using (prive.est_direction()) with check (prive.est_direction());
grant select, insert, update, delete on public.arena_challenges, public.arena_challenge_essais to authenticated;

create or replace function prive.arena_challenges_maj() returns trigger language plpgsql set search_path = '' as $$
begin new.maj_le := now(); return new; end $$;
drop trigger if exists arena_challenges_maj on public.arena_challenges;
create trigger arena_challenges_maj before update on public.arena_challenges for each row execute function prive.arena_challenges_maj();
drop trigger if exists zz_journal on public.arena_challenges;
create trigger zz_journal after insert or update or delete on public.arena_challenges for each row execute function prive.journaliser();
drop trigger if exists zz_journal on public.arena_challenge_essais;
create trigger zz_journal after insert or update or delete on public.arena_challenge_essais for each row execute function prive.journaliser();

-- Lecture pour l'appli : la Challenge Week en ligne (ou en préparation pour la direction), avec les noms « Prénom N. » seulement.
create or replace function public.challenge_public()
 returns jsonb language sql stable security definer set search_path to ''
as $$
  select jsonb_build_object('id', c.id, 'titre', c.titre, 'debut', c.debut, 'fin', c.fin, 'en_ligne', c.en_ligne, 'maj_le', c.maj_le,
    'defis', (select coalesce(jsonb_agg(d), '[]'::jsonb) from jsonb_array_elements(c.defis) d where coalesce((d->>'actif')::boolean, true)),
    'seances', (select coalesce(jsonb_agg(jsonb_build_object('jour', s->>'jour', 'niveaux', s->'niveaux')), '[]'::jsonb) from jsonb_array_elements(c.seances) s),
    'joueurs', (select coalesce(jsonb_object_agg(p.id, jsonb_build_object('nom', p.prenom || ' ' || upper(left(coalesce(p.nom, ''), 1)) || '.', 'sexe', p.sexe)), '{}'::jsonb)
                from public.personnes p where p.id in (select unnest(e.joueurs) from public.arena_challenge_essais e where e.challenge_id = c.id and not e.annule)),
    'essais', (select coalesce(jsonb_agg(jsonb_build_object('jour', e.jour, 'defi', e.defi, 'niveau', e.niveau, 'joueurs', to_jsonb(e.joueurs), 'resultat', e.resultat, 'le', e.cree_le) order by e.cree_le), '[]'::jsonb)
               from public.arena_challenge_essais e where e.challenge_id = c.id and not e.annule))
  from public.arena_challenges c
  where not c.archive and (c.en_ligne or prive.est_direction()) and (prive.est_adherent() or prive.est_staff())
  order by c.en_ligne desc, c.cree_le desc limit 1;
$$;
revoke all on function public.challenge_public() from public, anon;
grant execute on function public.challenge_public() to authenticated;

-- La Challenge Week de novembre 2026, prête à l'emploi (paliers proposés, à ajuster dans Gestion › CLOC'ARENA › Tweener › Challenge Week)
insert into public.arena_challenges (titre, debut, fin, en_ligne, defis, seances)
select 'Challenge Week', '2026-11-23', '2026-11-28', false,
  '[
    {"k":"frappes","nom":"Frappes en 2 minutes","mode":"duo","unite":"nb","actif":true,
     "consigne":"En binôme. Le joueur A joue 2 minutes : on compte ses frappes bonnes. Au sifflet on inverse. Le record du duo = le meilleur des deux scores.",
     "seuils":{"tous":[[5,1],[10,2],[20,3],[30,4],[40,5]]}},
    {"k":"volees","nom":"Volées en 2 minutes","mode":"duo","unite":"nb","actif":true,
     "consigne":"Même principe que les frappes, avec des volées bonnes. Le record du duo = le meilleur des deux scores.",
     "seuils":{"tous":[[5,1],[10,2],[15,3],[20,4],[30,5]]}},
    {"k":"services","nom":"Services consécutifs","mode":"equipe","unite":"nb","actif":true,
     "consigne":"Les joueurs servent chacun leur tour pendant 2 minutes. On compte la plus longue série de services bons sans faute.",
     "seuils":{"tous":[[2,1],[4,2],[6,3],[8,4],[10,5]]}},
    {"k":"deuxballes","nom":"Échanges à deux balles","mode":"equipe","unite":"nb","actif":true,
     "consigne":"Deux joueurs, une balle chacun, départ en même temps. Un échange compte quand les deux balles sont passées. Une balle perdue arrête la série.",
     "seuils":{"tous":[[2,1],[4,2],[6,3],[8,4],[10,5]]}},
    {"k":"jongles","nom":"Jongles","mode":"solo","unite":"nb","actif":true,
     "consigne":"La plus longue suite de jongles réussis, arrêt au premier échec.",
     "consignes":{"Violet":"Jongles normaux.","Rouge":"Jongles normaux.","Orange":"Un jongle sur chaque face, en alternance.","Vert":"Un jongle sur chaque face, en alternance.","Jaune":"Alternance face de raquette / côté du cadre."},
     "seuils":{"tous":[[5,1],[10,2],[20,3],[30,4],[50,5]]}},
    {"k":"etoile","nom":"Vitesse étoile","mode":"solo","unite":"sec","actif":true,
     "consigne":"Poser 5 balles sur 5 plots (1 balle par plot) en partant du point de départ. Chrono le plus court.",
     "seuils":{"tous":[[60,1],[45,2],[35,3],[28,4],[22,5]]}}
  ]'::jsonb,
  (select coalesce(jsonb_agg(jsonb_build_object('jour', (e.debut at time zone 'Europe/Paris')::date, 'evenement_id', e.id,
      'niveaux', (select coalesce(jsonb_agg(replace(g.nom, 'CLOC''ARENA ', '') order by g.nom), '[]'::jsonb) from public.evenement_groupes eg join public.groupes g on g.id = eg.groupe_id where eg.evenement_id = e.id))
    order by e.debut), '[]'::jsonb)
   from public.evenements e where e.titre = 'CLOC''ARENA Challenge' and e.debut >= '2026-11-23' and e.debut < '2026-11-29')
where not exists (select 1 from public.arena_challenges where titre = 'Challenge Week' and debut = '2026-11-23');
