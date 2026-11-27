-- Soirée (suite, 27/11/2026) : tickets visibles sur le téléphone après le QR code, et lots de la tombola activables.
--  - lots : { afficher: bool, liste: [texte] } réglés dans la gestion ; le n-ième gagnant tiré remporte le n-ième lot
--  - jeu_insc_public renvoie aussi la clé de chaque personne (le téléphone s'en souvient pour mettre « ses » tickets en avant)
--  - jeu_insc_suivi : participants, matchs, points du One Point Slam et gagnants, pour calculer les tickets sur le téléphone
--    (lisible avec le code du QR, du jour de la soirée jusqu'au surlendemain, pour voir les gagnants après coup)

alter table public.jeux add column if not exists lots jsonb not null default '{"afficher": false, "liste": []}'::jsonb;

create or replace function public.jeu_insc_public(p_code text, p_personnes jsonb)
 returns jsonb language plpgsql security definer set search_path = '' as $$
declare j public.jeux; x jsonb; r jsonb := '[]'::jsonb; a jsonb;
begin
  select * into j from public.jeux where code_insc = upper(btrim(p_code)) and length(btrim(p_code)) >= 6;
  if not found then raise exception 'Lien d''enregistrement inconnu'; end if;
  if not prive.jeu_insc_ouverte(j) then raise exception 'L''enregistrement est fermé pour cette soirée'; end if;
  if jsonb_typeof(p_personnes) <> 'array' or jsonb_array_length(p_personnes) < 1 or jsonb_array_length(p_personnes) > 10 then raise exception 'Entre 1 et 10 personnes à la fois'; end if;
  for x in select * from jsonb_array_elements(p_personnes) loop
    if length(btrim(coalesce(x->>'prenom', ''))) = 0 then continue; end if;
    a := prive.jeu_ajout(j.id, x->>'prenom', x->>'nom', 'qr', coalesce((x->>'ops')::boolean, true));
    r := r || jsonb_build_array(a);
  end loop;
  return r;
end $$;

create or replace function public.jeu_insc_suivi(p_code text)
 returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('titre', j.titre, 'jour', j.jour, 'lieu', j.lieu, 'ouvert', prive.jeu_insc_ouverte(j),
    'joueurs', coalesce((select jsonb_agg(jsonb_build_object('k', x->>'k', 'nom', x->>'nom')) from jsonb_array_elements(j.joueurs) x), '[]'::jsonb),
    'hist', coalesce((select jsonb_agg(jsonb_build_object('players', h->'players', 'win', h->'win')) from jsonb_array_elements(coalesce(j.ateliers->'hist', '[]'::jsonb)) h), '[]'::jsonb),
    'manches', coalesce((select jsonb_agg(jsonb_build_object('etat', case when jsonb_typeof(y->'etat') = 'object' then jsonb_build_object(
        'fmt', y->'etat'->'fmt', 'statut', y->'etat'->'statut', 'pts', y->'etat'->'pts', 'vic', y->'etat'->'vic', 'gagnant', y->'etat'->'gagnant', 'gagnants', y->'etat'->'gagnants') end))
      from jsonb_array_elements(j.manches) y), '[]'::jsonb),
    'winners', coalesce(j.tombola->'winners', '[]'::jsonb),
    'tirage', j.tombola->'tirage',
    'lots', case when (j.lots->>'afficher')::boolean then j.lots else jsonb_build_object('afficher', false) end)
  from public.jeux j
  where j.code_insc = upper(btrim(p_code)) and length(btrim(p_code)) >= 6 and not j.archive
    and (j.jour is null or now() < ((j.jour + 2)::timestamp at time zone 'Europe/Paris'));
$$;
revoke all on function public.jeu_insc_suivi(text) from public;
grant execute on function public.jeu_insc_suivi(text) to anon, authenticated;

-- L'écran des ateliers reçoit aussi les lots
create or replace function public.jeu_atelier(p_cle text)
 returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', j.id, 'titre', j.titre, 'jour', j.jour, 'lieu', j.lieu, 'maj_le', j.maj_le, 'code_insc', j.code_insc,
    'insc_ouverte', prive.jeu_insc_ouverte(j), 'ateliers', j.ateliers, 'tombola', j.tombola, 'lots', j.lots,
    'joueurs', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('k', x->>'k', 'nom', x->>'nom', 'src', x->>'src', 'adh', x ? 'pid' and x->>'pid' is not null))) from jsonb_array_elements(j.joueurs) x), '[]'::jsonb),
    'manches', coalesce((select jsonb_agg(case when jsonb_typeof(y->'etat') = 'object' then jsonb_set(y, '{etat}', (y->'etat') - 'hist') else y end order by n)
                         from jsonb_array_elements(j.manches) with ordinality as t(y, n)), '[]'::jsonb))
  from public.jeux j where j.cle_pilote = p_cle and length(p_cle) >= 16 and not j.archive;
$$;
