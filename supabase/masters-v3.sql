-- Masters v3 (19/11/2026) : bonus exploit, bonus Masters des matchs Versus, notifications « Ace ! » (cloche)
-- Participants Masters sans contrôle de compte (pour les déclencheurs)
create or replace function prive.masters_participants() returns table(personne_id uuid, place int, rang int)
language sql stable security definer set search_path to '' as $$
  select b.id, b.place, (row_number() over (order by b.place nulls last, b.prenom))::int
  from (select p.id, r.place, p.prenom from public.personnes p
        left join public.masters_rang r on r.personne_id = p.id
        left join public.arena_choix c on c.personne_id = p.id
        where p.actif and not p.demo
          and (r.personne_id is not null or p.niveau_club like 'Adultes%' or p.niveau_club = 'Ados compétition')
          and coalesce(c.masters, true)) b;
$$;
-- Déplacer un joueur à un rang affiché (sans contrôle : utilisé par masters_placer et les bonus Versus)
create or replace function prive.masters_deplacer(p uuid, rang_cible int) returns void language plpgsql security definer set search_path to '' as $$
declare cur int; cible int; nmax int;
begin
  select coalesce(max(place), 0) into nmax from public.masters_rang;
  insert into public.masters_rang (personne_id, place) values (p, nmax + 1) on conflict (personne_id) do nothing;
  select place into cur from public.masters_rang where personne_id = p;
  select mp.place into cible from prive.masters_participants() mp where mp.rang = greatest(1, rang_cible) and mp.personne_id <> p and mp.place is not null;
  if cible is null or cible = cur then return; end if;
  if cible < cur then
    update public.masters_rang set place = place + 1, maj_le = now() where place >= cible and place < cur;
  else
    update public.masters_rang set place = place - 1, maj_le = now() where place > cur and place <= cible;
  end if;
  update public.masters_rang set place = cible, maj_le = now() where personne_id = p;
end;
$$;
create or replace function public.masters_placer(p uuid, rang_cible int) returns void language plpgsql security definer set search_path to '' as $$
begin
  if not prive.est_direction() then raise exception 'interdit'; end if;
  perform prive.masters_deplacer(p, rang_cible);
end;
$$;

-- Échelle Masters + bonus Versus
create or replace function prive.masters_echelle() returns trigger language plpgsql security definer set search_path to '' as $$
declare g uuid; p uuid; pg int; pp int; nmax int; chal uuid; rg int; rp int; a_id uuid; a_pl int; j record; r int;
begin
  if new.statut <> 'valide' or (tg_op = 'UPDATE' and old.statut = 'valide') then return new; end if;
  if new.circuit not in ('masters', 'versus') then return new; end if;
  if (select count(*) from public.arena_match_joueurs where match_id = new.id) <> 2 then return new; end if; -- simples uniquement

  if new.circuit = 'versus' then
    -- Match Versus : chaque joueur inscrit au Masters gagne des places (gagnant +3, perdant +1) et des Rush Points (5 / 3)
    for j in select aj.personne_id, (aj.equipe = new.vainqueur) as gagne from public.arena_match_joueurs aj where aj.match_id = new.id and not aj.invite loop
      select mp.rang into r from prive.masters_participants() mp where mp.personne_id = j.personne_id;
      if r is null then continue; end if;
      perform prive.masters_deplacer(j.personne_id, r - case when j.gagne then 3 else 1 end);
      insert into public.arena_points (date_points, personne_id, type, motif, points, match_id, created_by, circuit)
      values (new.date_match::timestamptz, j.personne_id, 'versus', case when j.gagne then 'Victoire Versus' else 'Défaite Versus' end,
              case when j.gagne then 5 else 3 end, new.id, new.valide_par, 'masters');
    end loop;
    return new;
  end if;

  select personne_id into g from public.arena_match_joueurs where match_id = new.id and equipe = new.vainqueur and not invite;
  select personne_id into p from public.arena_match_joueurs where match_id = new.id and equipe <> new.vainqueur and not invite;
  if g is null or p is null then return new; end if;
  select coalesce(max(place), 0) into nmax from public.masters_rang;
  insert into public.masters_rang (personne_id, place) values (g, nmax + 1) on conflict (personne_id) do nothing;
  select coalesce(max(place), 0) into nmax from public.masters_rang;
  insert into public.masters_rang (personne_id, place) values (p, nmax + 1) on conflict (personne_id) do nothing;
  select place into pg from public.masters_rang where personne_id = g;
  select place into pp from public.masters_rang where personne_id = p;
  chal := case when pg > pp then g else p end;
  if abs(pg - pp) > 5 then update public.masters_rang set bonus = false where personne_id = chal; end if; -- bonus utilisé
  if pg > pp then
    -- le challenger gagne : bonus exploit s'il bat un joueur classé au moins 5 places au-dessus
    select mp.rang into rg from prive.masters_participants() mp where mp.personne_id = g;
    select mp.rang into rp from prive.masters_participants() mp where mp.personne_id = p;
    if rg - rp >= 5 then
      insert into public.arena_points (date_points, personne_id, type, motif, points, match_id, created_by, circuit)
      values (new.date_match::timestamptz, g, 'exploit', 'Exploit : victoire contre un joueur ' || (rg - rp) || ' places au-dessus', 5, new.id, new.valide_par, 'masters');
    end if;
    update public.masters_rang set place = place + 1, maj_le = now() where place >= pp and place < pg;
    update public.masters_rang set place = pp, maj_le = now() where personne_id = g;
  else
    -- le défié gagne : défense du trône (top 5), bonus Portée +3, et il monte d'une place
    select count(*) + 1 into rg from public.masters_rang r2 left join public.arena_choix c on c.personne_id = r2.personne_id
      where r2.place < pg and coalesce(c.masters, true);
    if rg <= 5 then
      insert into public.arena_points (date_points, personne_id, type, motif, points, match_id, created_by, circuit)
      values (new.date_match::timestamptz, g, 'trone', 'Défense du trône', 5, new.id, new.valide_par, 'masters');
    end if;
    update public.masters_rang set bonus = true, maj_le = now() where personne_id = g;
    select r2.personne_id, r2.place into a_id, a_pl from public.masters_rang r2 left join public.arena_choix c on c.personne_id = r2.personne_id
      where r2.place < pg and coalesce(c.masters, true) order by r2.place desc limit 1;
    if a_id is not null then
      update public.masters_rang set place = pg, maj_le = now() where personne_id = a_id;
      update public.masters_rang set place = a_pl, maj_le = now() where personne_id = g;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists masters_echelle on public.arena_matchs;
create trigger masters_echelle after insert or update of statut on public.arena_matchs for each row execute function prive.masters_echelle();

-- Clé de période d'une quête
create or replace function prive.mq_cle(periode text, d date) returns text language sql immutable set search_path to '' as $$
  select case periode when 'jour' then d::text when 'semaine' then to_char(date_trunc('week', d), 'IYYY-IW') when 'mois' then to_char(d, 'YYYY-MM') else 'saison' end;
$$;

-- Ce qu'un match validé apporte à chaque joueur (pour les notifications)
create or replace function public.arena_evenements_match(mid uuid)
returns table(personne_id uuid, titre text, texte text) language plpgsql volatile security definer set search_path to '' as $$
declare m record; j record; lg int; e record; qq record; incl int; avant int; k text;
begin
  select * into m from public.arena_matchs where id = mid;
  if m.id is null or m.statut <> 'valide' or m.vainqueur is null or m.circuit not in ('masters', 'versus') then return; end if;
  if (select count(*) from public.arena_match_joueurs where match_id = mid) <> 2 then return; end if;
  for j in select aj.personne_id as pid, (aj.equipe = m.vainqueur) as gagne from public.arena_match_joueurs aj where aj.match_id = mid and not aj.invite loop
    personne_id := j.pid;
    if m.circuit = 'versus' then
      titre := case when j.gagne then 'ACE ! 🎾 Match Versus validé' else 'Match Versus validé 🎾' end;
      texte := case when j.gagne then 'Victoire' else 'Défaite' end || coalesce(' · ' || m.score, '')
        || case when exists (select 1 from public.arena_points ap where ap.match_id = mid and ap.personne_id = j.pid and ap.type = 'versus')
             then ' · Masters : +' || case when j.gagne then 3 else 1 end || ' place' || case when j.gagne then 's' else '' end || ', +' || case when j.gagne then 5 else 3 end || ' Rush Points' else '' end;
      return next;
      continue;
    end if;
    titre := case when j.gagne then 'ACE ! 🎾 Victoire validée' else 'Match validé 🎾' end;
    texte := 'CLOC''ARENA Masters' || coalesce(' · ' || m.score, '') || ' · +' || case when j.gagne then 5 else 3 end || ' Rush Points';
    return next;
    -- série de victoires atteinte avec ce match
    if j.gagne then
      select u.lg into lg from (
        select t.id, case when t.gagne then row_number() over (partition by t.grp, t.gagne order by t.date_match, t.created_at, t.id) end as lg
        from (select m2.id, m2.date_match, m2.created_at, (x.equipe = m2.vainqueur) as gagne,
                sum(case when x.equipe = m2.vainqueur then 0 else 1 end) over (order by m2.date_match, m2.created_at, m2.id rows unbounded preceding) as grp
              from public.arena_matchs m2 join public.arena_match_joueurs x on x.match_id = m2.id and x.personne_id = j.pid and not x.invite
              where m2.circuit = 'masters' and m2.statut = 'valide' and m2.vainqueur is not null
                and (select count(*) from public.arena_match_joueurs y where y.match_id = m2.id) = 2) t) u
      where u.id = mid;
      if lg in (3, 5, 10, 20) then
        titre := '🔥 ' || lg || ' victoires d''affilée !';
        texte := 'Série CLOC''ARENA Masters : +' || case lg when 3 then 10 when 5 then 25 when 10 then 50 else 100 end || ' Rush Points';
        return next;
      end if;
    end if;
    -- défense du trône, exploit
    for e in select ap.type, ap.points from public.arena_points ap where ap.match_id = mid and ap.personne_id = j.pid and ap.type in ('trone', 'exploit') loop
      titre := case e.type when 'trone' then '👑 Trône défendu !' else '⚡ Exploit !' end;
      texte := case e.type when 'trone' then 'Tu gardes ta place dans le top 5' else 'Victoire contre un joueur classé au moins 5 places au-dessus' end || ' : +' || (e.points)::int || ' Rush Points';
      return next;
    end loop;
    -- quêtes automatiques réussies avec ce match
    for qq in select * from public.masters_quetes q0 where q0.actif and q0.critere <> 'manuel'
                and (q0.debut is null or m.date_match >= q0.debut) and (q0.fin is null or m.date_match <= q0.fin) loop
      k := prive.mq_cle(qq.periode, m.date_match);
      select
        case qq.critere when 'matchs' then count(*) filter (where (t.date_match, t.created_at, t.id) <= (m.date_match, m.created_at, m.id))
                        when 'victoires' then count(*) filter (where t.gagne and (t.date_match, t.created_at, t.id) <= (m.date_match, m.created_at, m.id))
                        else count(distinct t.adv) filter (where (t.date_match, t.created_at, t.id) <= (m.date_match, m.created_at, m.id)) end,
        case qq.critere when 'matchs' then count(*) filter (where (t.date_match, t.created_at, t.id) < (m.date_match, m.created_at, m.id))
                        when 'victoires' then count(*) filter (where t.gagne and (t.date_match, t.created_at, t.id) < (m.date_match, m.created_at, m.id))
                        else count(distinct t.adv) filter (where (t.date_match, t.created_at, t.id) < (m.date_match, m.created_at, m.id)) end
      into incl, avant
      from (select m2.id, m2.date_match, m2.created_at, (x.equipe = m2.vainqueur) as gagne,
              (select o.personne_id from public.arena_match_joueurs o where o.match_id = m2.id and o.equipe <> x.equipe and not o.invite limit 1) as adv
            from public.arena_matchs m2 join public.arena_match_joueurs x on x.match_id = m2.id and x.personne_id = j.pid and not x.invite
            where m2.circuit = 'masters' and m2.statut = 'valide' and m2.vainqueur is not null
              and (select count(*) from public.arena_match_joueurs y where y.match_id = m2.id) = 2
              and prive.mq_cle(qq.periode, m2.date_match) = k
              and (qq.debut is null or m2.date_match >= qq.debut) and (qq.fin is null or m2.date_match <= qq.fin)) t;
      if incl >= qq.objectif and avant < qq.objectif then
        titre := '🎯 Quête réussie !';
        texte := qq.titre || ' : +' || rtrim(rtrim((qq.points)::text, '0'), '.') || ' Rush Points';
        return next;
      end if;
    end loop;
  end loop;
end;
$$;
revoke execute on function public.arena_evenements_match(uuid) from public, anon, authenticated;
grant execute on function public.arena_evenements_match(uuid) to service_role;

-- Cloche de l'appli à chaque match Masters ou Versus validé
create or replace function prive.arena_notif_match() returns trigger language plpgsql security definer set search_path to '' as $$
declare e record; u uuid[];
begin
  if new.statut <> 'valide' or (tg_op = 'UPDATE' and old.statut = 'valide') or new.circuit not in ('masters', 'versus') then return new; end if;
  begin
    for e in select * from public.arena_evenements_match(new.id) loop
      select array_agg(distinct c.user_id) into u from public.comptes_concernes(array[e.personne_id]) c;
      if u is not null then perform public.notif_ajouter(u, e.titre, e.texte, '/app/#/arena/' || new.circuit); end if;
    end loop;
  exception when others then null; -- une notification ratée ne bloque jamais la validation du match
  end;
  return new;
end;
$$;
drop trigger if exists zz_arena_notif on public.arena_matchs;
create trigger zz_arena_notif after insert or update of statut on public.arena_matchs for each row execute function prive.arena_notif_match();

-- Rush Points : bonus = trône + exploit + matchs Versus
create or replace function public.masters_rush()
returns table(personne_id uuid, joueur text, rang_atp int, points numeric, victoires int, matchs int,
              pts_matchs numeric, pts_series numeric, pts_quetes numeric, pts_trone numeric, pts_ajust numeric, serie int)
language sql stable security definer set search_path to '' as $$
  with cfg as (
    select coalesce((r.valeur->>'rush_v')::numeric, 5) as v, coalesce((r.valeur->>'rush_d')::numeric, 3) as d
    from (select 1) x left join public.reglages_publics r on r.cle = 'masters_reglages'),
  part as (select c.personne_id, c.rang, c.joueur from public.masters_classement() c),
  mj as (
    select j.personne_id, m.id as match_id, m.date_match, m.created_at, (j.equipe = m.vainqueur) as gagne,
      (select o.personne_id from public.arena_match_joueurs o where o.match_id = m.id and o.equipe <> j.equipe and not o.invite limit 1) as adv
    from public.arena_matchs m join public.arena_match_joueurs j on j.match_id = m.id and not j.invite
    where m.circuit = 'masters' and m.statut = 'valide' and m.vainqueur is not null
      and (select count(*) from public.arena_match_joueurs x where x.match_id = m.id) = 2),
  ord as (select mj.*, sum(case when mj.gagne then 0 else 1 end) over (partition by mj.personne_id order by mj.date_match, mj.created_at, mj.match_id rows unbounded preceding) as grp from mj),
  st as (select ord.*, case when ord.gagne then row_number() over (partition by ord.personne_id, ord.grp, ord.gagne order by ord.date_match, ord.created_at, ord.match_id) else 0 end as lg,
           row_number() over (partition by ord.personne_id order by ord.date_match desc, ord.created_at desc, ord.match_id desc) as recent from ord),
  agg as (select st.personne_id, count(*)::int as n, (count(*) filter (where st.gagne))::int as v,
            sum(case st.lg when 3 then 10 when 5 then 25 when 10 then 50 when 20 then 100 else 0 end) as series,
            max(case when st.recent = 1 then st.lg end)::int as serie
          from st group by st.personne_id),
  qa as (select * from public.masters_quetes where actif and critere <> 'manuel'),
  buck as (
    select mj.personne_id, qa.id as quete_id, qa.points, qa.objectif, qa.critere, mj.gagne, mj.adv, prive.mq_cle(qa.periode, mj.date_match) as cle
    from mj cross join qa
    where (qa.debut is null or mj.date_match >= qa.debut) and (qa.fin is null or mj.date_match <= qa.fin)),
  reussi as (
    select b.personne_id, b.quete_id, b.cle, max(b.points) as points from buck b
    group by b.personne_id, b.quete_id, b.cle, b.critere, b.objectif
    having (case b.critere when 'matchs' then count(*) when 'victoires' then count(*) filter (where b.gagne) else count(distinct b.adv) end) >= b.objectif),
  qauto as (select r.personne_id, sum(r.points) as pts from reussi r group by r.personne_id),
  extra as (
    select ap.personne_id,
      sum(case when ap.type = 'quete' then ap.points else 0 end) as quetes,
      sum(case when ap.type in ('trone', 'exploit', 'versus') then ap.points else 0 end) as bonus,
      sum(case when ap.type = 'ajustement' then ap.points else 0 end) as ajust
    from public.arena_points ap where ap.circuit = 'masters' and ap.type in ('quete', 'trone', 'exploit', 'versus', 'ajustement') group by ap.personne_id)
  select part.personne_id, part.joueur, part.rang,
    coalesce(agg.v, 0) * cfg.v + (coalesce(agg.n, 0) - coalesce(agg.v, 0)) * cfg.d + coalesce(agg.series, 0) + coalesce(qauto.pts, 0) + coalesce(extra.quetes, 0) + coalesce(extra.bonus, 0) + coalesce(extra.ajust, 0),
    coalesce(agg.v, 0), coalesce(agg.n, 0),
    coalesce(agg.v, 0) * cfg.v + (coalesce(agg.n, 0) - coalesce(agg.v, 0)) * cfg.d,
    coalesce(agg.series, 0), coalesce(qauto.pts, 0) + coalesce(extra.quetes, 0), coalesce(extra.bonus, 0), coalesce(extra.ajust, 0), coalesce(agg.serie, 0)
  from part cross join cfg
  left join agg on agg.personne_id = part.personne_id
  left join qauto on qauto.personne_id = part.personne_id
  left join extra on extra.personne_id = part.personne_id
  order by 4 desc, 5 desc, 6 desc, 3 asc;
$$;
revoke execute on function prive.masters_deplacer(uuid, int), prive.masters_participants() from public, anon, authenticated;
