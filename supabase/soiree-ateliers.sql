-- Soirée jeux (décembre 2026) : ateliers pickleball / touch tennis, tombola gratuite, enregistrement par QR code.
-- S'ajoute au module jeux (jeux.sql) : un jeu = la soirée. Rien d'existant n'est modifié.
--  - ateliers : état de l'écran pickleball / touch tennis (tirages en cours, terrains, résultats), écrit par l'écran lui-même
--  - tombola  : gagnants tirés au sort (dans l'ordre)
--  - cle_pilote : clé secrète de l'écran des ateliers (≠ cle, qui est montrée en QR sur l'écran One Point Slam)
--  - code_ecran : code court à 6 caractères, valable 15 minutes, pour relier un ordinateur à la soirée sans compte
--  - code_insc  : code du QR d'enregistrement (page soiree.html), utilisable seulement le jour de la soirée

alter table public.jeux
  add column if not exists ateliers jsonb not null default '{}'::jsonb,
  add column if not exists tombola jsonb not null default '{}'::jsonb,
  add column if not exists cle_pilote text default replace(gen_random_uuid()::text, '-', ''),
  add column if not exists code_insc text default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  add column if not exists code_ecran text,
  add column if not exists code_ecran_exp timestamptz;
create unique index if not exists jeux_cle_pilote_uk on public.jeux (cle_pilote);
create unique index if not exists jeux_code_insc_uk on public.jeux (code_insc);

-- Comparaison de noms sans accents ni majuscules (pas d'extension unaccent sur cette base)
create or replace function prive.sans_accent(t text) returns text language sql immutable set search_path = '' as $$
  select lower(translate(coalesce(btrim(t), ''), 'ÀÂÄÁÃÅàâäáãåÇçÉÈÊËéèêëÍÌÎÏíìîïÑñÓÒÔÖÕóòôöõÚÙÛÜúùûüÝýÿ’''-', 'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOoooooUUUUuuuuYyy   '));
$$;

-- Enregistrer une personne dans la soirée : relie à la fiche adhérent si prénom + nom correspondent à une seule fiche active,
-- sinon invité. Ne crée jamais de doublon (même fiche, ou même invité déjà enregistré).
create or replace function prive.jeu_ajout(p_jeu uuid, p_prenom text, p_nom text, p_src text, p_ops boolean)
 returns jsonb language plpgsql security definer set search_path = '' as $$
declare j public.jeux; pid uuid; n int; aff text; base text; c int := 2; k text; pr text := btrim(coalesce(p_prenom, '')); no text := btrim(coalesce(p_nom, ''));
begin
  if length(pr) < 1 or length(pr) > 30 or length(no) > 40 then raise exception 'Prénom ou nom invalide'; end if;
  select * into j from public.jeux where id = p_jeu for update;
  select count(*), min(p.id::text)::uuid into n, pid from public.personnes p
   where p.actif and not coalesce(p.demo, false) and prive.sans_accent(p.prenom) = prive.sans_accent(pr)
     and length(no) > 0 and prive.sans_accent(p.nom) = prive.sans_accent(no);
  if n <> 1 then pid := null; end if;
  if pid is not null then
    select x->>'k' into k from jsonb_array_elements(j.joueurs) x where x->>'pid' = pid::text limit 1;
    if k is not null then return jsonb_build_object('k', k, 'nom', (select x->>'nom' from jsonb_array_elements(j.joueurs) x where x->>'k' = k), 'deja', true, 'adherent', true); end if;
    -- « Prénom N. », ou le nom complet si un autre adhérent actif a le même prénom et la même initiale (ex. deux Alexis N.)
    select initcap(btrim(p.prenom)) || ' ' || case when exists (select 1 from public.personnes o where o.id <> p.id and o.actif and not coalesce(o.demo, false)
             and prive.sans_accent(o.prenom) = prive.sans_accent(p.prenom) and upper(left(btrim(o.nom), 1)) = upper(left(btrim(p.nom), 1)))
           then initcap(btrim(p.nom)) else upper(left(btrim(p.nom), 1)) || '.' end
      into base from public.personnes p where p.id = pid;
  else
    base := initcap(pr) || case when length(no) > 0 then ' ' || upper(left(no, 1)) || '.' else '' end;
    select x->>'k' into k from jsonb_array_elements(j.joueurs) x
     where x->>'pid' is null and prive.sans_accent(coalesce(x->>'ident', x->>'nom')) = prive.sans_accent(btrim(pr || ' ' || no)) limit 1;
    if k is not null then return jsonb_build_object('k', k, 'nom', (select x->>'nom' from jsonb_array_elements(j.joueurs) x where x->>'k' = k), 'deja', true, 'adherent', false); end if;
  end if;
  if jsonb_array_length(j.joueurs) >= 400 then raise exception 'La soirée est complète'; end if;
  aff := base;
  while exists (select 1 from jsonb_array_elements(j.joueurs) x where x->>'nom' = aff) loop aff := base || ' (' || c || ')'; c := c + 1; end loop;
  k := 'q' || replace(gen_random_uuid()::text, '-', '');
  update public.jeux set joueurs = joueurs || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
    'k', k, 'nom', aff, 'pid', pid, 'src', p_src, 'hors_ops', case when p_ops then null else true end,
    'ident', case when pid is null then btrim(initcap(pr) || ' ' || initcap(no)) end)))
  where id = p_jeu;
  return jsonb_build_object('k', k, 'nom', aff, 'deja', false, 'adherent', pid is not null);
end $$;
revoke all on function prive.jeu_ajout(uuid, text, text, text, boolean) from public, anon, authenticated;

-- ----- QR d'enregistrement (sans compte) -----
create or replace function prive.jeu_insc_ouverte(j public.jeux) returns boolean language sql stable set search_path = '' as $$
  select not j.archive and (j.jour is null or (now() >= (j.jour::timestamp at time zone 'Europe/Paris') and now() < ((j.jour + 1)::timestamp at time zone 'Europe/Paris') + interval '5 hours'));
$$;
create or replace function public.jeu_insc_infos(p_code text)
 returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('titre', j.titre, 'jour', j.jour, 'lieu', j.lieu, 'ouvert', prive.jeu_insc_ouverte(j), 'inscrits', jsonb_array_length(j.joueurs))
  from public.jeux j where j.code_insc = upper(btrim(p_code)) and length(btrim(p_code)) >= 6;
$$;
-- p_personnes : [{ prenom, nom, ops }] (10 au plus). Renvoie [{ nom, deja, adherent }]
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
    r := r || jsonb_build_array(a - 'k');
  end loop;
  return r;
end $$;
revoke all on function public.jeu_insc_infos(text) from public;
revoke all on function public.jeu_insc_public(text, jsonb) from public;
grant execute on function public.jeu_insc_infos(text) to anon, authenticated;
grant execute on function public.jeu_insc_public(text, jsonb) to anon, authenticated;

-- ----- Écran des ateliers (sans compte, par la clé pilote) -----
-- Relier un ordinateur : la gestion affiche un code court valable 15 minutes, l'écran l'échange contre la clé pilote.
create or replace function public.jeu_code_pilote(p_code text)
 returns text language sql stable security definer set search_path = '' as $$
  select j.cle_pilote from public.jeux j
  where j.code_ecran = upper(btrim(p_code)) and length(btrim(p_code)) = 6 and j.code_ecran_exp > now() and not j.archive limit 1;
$$;
create or replace function public.jeu_atelier(p_cle text)
 returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', j.id, 'titre', j.titre, 'jour', j.jour, 'lieu', j.lieu, 'maj_le', j.maj_le, 'code_insc', j.code_insc,
    'insc_ouverte', prive.jeu_insc_ouverte(j), 'ateliers', j.ateliers, 'tombola', j.tombola,
    'joueurs', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('k', x->>'k', 'nom', x->>'nom', 'src', x->>'src', 'adh', x ? 'pid' and x->>'pid' is not null))) from jsonb_array_elements(j.joueurs) x), '[]'::jsonb),
    'manches', coalesce((select jsonb_agg(case when jsonb_typeof(y->'etat') = 'object' then jsonb_set(y, '{etat}', (y->'etat') - 'hist') else y end order by n)
                         from jsonb_array_elements(j.manches) with ordinality as t(y, n)), '[]'::jsonb))
  from public.jeux j where j.cle_pilote = p_cle and length(p_cle) >= 16 and not j.archive;
$$;
-- L'écran enregistre son état (ateliers et/ou tombola ; null = inchangé)
create or replace function public.jeu_atelier_maj(p_cle text, p_ateliers jsonb, p_tombola jsonb)
 returns timestamptz language plpgsql security definer set search_path = '' as $$
declare t timestamptz;
begin
  if (p_ateliers is not null and (jsonb_typeof(p_ateliers) <> 'object' or pg_column_size(p_ateliers) > 400000))
     or (p_tombola is not null and (jsonb_typeof(p_tombola) <> 'object' or pg_column_size(p_tombola) > 50000)) then
    raise exception 'Données refusées';
  end if;
  update public.jeux set ateliers = coalesce(p_ateliers, ateliers), tombola = coalesce(p_tombola, tombola)
   where cle_pilote = p_cle and length(p_cle) >= 16 and not archive returning maj_le into t;
  if t is null then raise exception 'Écran non relié à une soirée'; end if;
  return t;
end $$;
-- Ajouter un joueur depuis l'écran (« Je me place » avec un nom pas encore enregistré)
create or replace function public.jeu_atelier_joueur(p_cle text, p_prenom text, p_nom text)
 returns jsonb language plpgsql security definer set search_path = '' as $$
declare jid uuid;
begin
  select id into jid from public.jeux where cle_pilote = p_cle and length(p_cle) >= 16 and not archive;
  if jid is null then raise exception 'Écran non relié à une soirée'; end if;
  return prive.jeu_ajout(jid, p_prenom, p_nom, 'ecran', true);
end $$;
revoke all on function public.jeu_code_pilote(text) from public;
revoke all on function public.jeu_atelier(text) from public;
revoke all on function public.jeu_atelier_maj(text, jsonb, jsonb) from public;
revoke all on function public.jeu_atelier_joueur(text, text, text) from public;
grant execute on function public.jeu_code_pilote(text) to anon, authenticated;
grant execute on function public.jeu_atelier(text) to anon, authenticated;
grant execute on function public.jeu_atelier_maj(text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.jeu_atelier_joueur(text, text, text) to anon, authenticated;
