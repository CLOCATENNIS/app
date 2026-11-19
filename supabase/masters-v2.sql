-- Masters v2 (19/11/2026) : quêtes paramétrables, Rush Points, placement manuel, retraits validés par le club
-- 1. Quêtes
create table if not exists public.masters_quetes (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  description text,
  periode text not null default 'saison' check (periode in ('jour','semaine','mois','saison')),
  critere text not null default 'matchs' check (critere in ('matchs','victoires','adversaires','manuel')),
  objectif int not null default 1 check (objectif >= 1),
  points numeric(6,1) not null default 0,
  debut date,
  fin date,
  actif boolean not null default true,
  ordre int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.masters_quetes enable row level security;
drop policy if exists masters_quetes_lecture on public.masters_quetes;
create policy masters_quetes_lecture on public.masters_quetes for select to authenticated using (prive.est_adherent() or prive.est_staff());
drop policy if exists masters_quetes_gestion on public.masters_quetes;
create policy masters_quetes_gestion on public.masters_quetes for all to authenticated using (prive.est_direction()) with check (prive.est_direction());
grant select, insert, update, delete on public.masters_quetes to authenticated;
drop trigger if exists zz_journal on public.masters_quetes;
create trigger zz_journal after insert or update or delete on public.masters_quetes for each row execute function prive.journaliser();
insert into public.masters_quetes (titre, description, periode, critere, objectif, points, ordre)
select * from (values
  ('Premier match', 'Jouer son premier match Masters', 'saison', 'matchs', 1, 3::numeric, 1),
  ('5 adversaires différents', 'Affronter 5 joueurs différents dans la saison', 'saison', 'adversaires', 5, 10::numeric, 2),
  ('Mission du mois', 'Jouer 2 matchs dans le mois', 'mois', 'matchs', 2, 5::numeric, 3)) v
where not exists (select 1 from public.masters_quetes);

-- 2. Points manuels (ajustements, quêtes validées à la main, défense du trône)
alter table public.arena_points add column if not exists quete_id uuid references public.masters_quetes(id) on delete cascade;
alter table public.arena_points add column if not exists periode_cle text;
create unique index if not exists arena_points_quete_unique on public.arena_points (personne_id, quete_id, periode_cle) where quete_id is not null;

-- 3. Retrait de Masters : demande de l'adhérent, validée par la direction ou un enseignant
alter table public.arena_choix add column if not exists masters_retrait_le timestamptz;
create or replace function prive.masters_valideur() returns boolean language sql stable security definer set search_path to '' as $$
  select prive.a_role(array['direction','enseignant']);
$$;
create or replace function prive.arena_choix_retrait() returns trigger language plpgsql security definer set search_path to '' as $$
begin
  -- un adhérent ne sort pas seul de Masters : sa case devient une demande à valider
  if not prive.masters_valideur() and new.masters = false and (tg_op = 'INSERT' or old.masters is distinct from false) then
    new.masters := case when tg_op = 'INSERT' then true else coalesce(old.masters, true) end;
    new.masters_retrait_le := coalesce(case when tg_op = 'UPDATE' then old.masters_retrait_le end, now());
  end if;
  if coalesce(new.masters, true) = false then new.masters_retrait_le := null; end if;
  return new;
end;
$$;
drop trigger if exists arena_choix_retrait on public.arena_choix;
create trigger arena_choix_retrait before insert or update on public.arena_choix for each row execute function prive.arena_choix_retrait();

create or replace function public.masters_retrait_annuler(p uuid) returns void language plpgsql security definer set search_path to '' as $$
begin
  if not (prive.masters_valideur() or p in (select prive.mes_personnes())) then raise exception 'interdit'; end if;
  update public.arena_choix set masters_retrait_le = null, maj_le = now() where personne_id = p;
end;
$$;
create or replace function public.masters_retrait_traiter(p uuid, accepter boolean) returns void language plpgsql security definer set search_path to '' as $$
begin
  if not prive.masters_valideur() then raise exception 'interdit'; end if;
  if accepter then
    insert into public.arena_choix (personne_id, masters, masters_retrait_le, maj_le) values (p, false, null, now())
    on conflict (personne_id) do update set masters = false, masters_retrait_le = null, maj_le = now();
  else
    update public.arena_choix set masters_retrait_le = null, maj_le = now() where personne_id = p;
  end if;
end;
$$;
create or replace function public.masters_retraits() returns table(personne_id uuid, joueur text, demande_le timestamptz) language sql stable security definer set search_path to '' as $$
  select c.personne_id, p.prenom || ' ' || p.nom, c.masters_retrait_le
  from public.arena_choix c join public.personnes p on p.id = c.personne_id
  where c.masters_retrait_le is not null and coalesce(c.masters, true) and (prive.masters_valideur() or c.personne_id in (select prive.mes_personnes()))
  order by c.masters_retrait_le;
$$;

-- 4. Placement manuel au Classement ATP (rang affiché = rang parmi les participants)
create or replace function public.masters_placer(p uuid, rang_cible int) returns void language plpgsql security definer set search_path to '' as $$
declare cur int; cible int; nmax int;
begin
  if not prive.est_direction() then raise exception 'interdit'; end if;
  select coalesce(max(place), 0) into nmax from public.masters_rang;
  insert into public.masters_rang (personne_id, place) values (p, nmax + 1) on conflict (personne_id) do nothing;
  select place into cur from public.masters_rang where personne_id = p;
  select c.place into cible from public.masters_classement() c where c.rang = greatest(1, rang_cible) and c.personne_id <> p;
  if cible is null then select coalesce(max(place), 0) into cible from public.masters_rang; end if;
  if cible < cur then
    update public.masters_rang set place = place + 1, maj_le = now() where place >= cible and place < cur;
  elsif cible > cur then
    update public.masters_rang set place = place - 1, maj_le = now() where place > cur and place <= cible;
  end if;
  update public.masters_rang set place = cible, maj_le = now() where personne_id = p;
end;
$$;

-- 5. Échelle : le défié qui gagne monte d'une place, gagne le bonus et, s'il est dans le top 5, la défense du trône
create or replace function prive.masters_echelle() returns trigger language plpgsql security definer set search_path to '' as $$
declare g uuid; p uuid; pg int; pp int; nmax int; chal uuid; rg int; a_id uuid; a_pl int;
begin
  if new.circuit is distinct from 'masters' or new.statut <> 'valide' or (tg_op = 'UPDATE' and old.statut = 'valide') then return new; end if;
  if (select count(*) from public.arena_match_joueurs where match_id = new.id) <> 2 then return new; end if; -- simples uniquement
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
    -- le challenger gagne : il prend la place, les joueurs entre les deux reculent d'une place
    update public.masters_rang set place = place + 1, maj_le = now() where place >= pp and place < pg;
    update public.masters_rang set place = pp, maj_le = now() where personne_id = g;
  else
    -- le défié gagne : bonus Portée +3, défense du trône s'il est dans le top 5, et il monte d'une place
    select count(*) + 1 into rg from public.masters_rang r left join public.arena_choix c on c.personne_id = r.personne_id
      where r.place < pg and coalesce(c.masters, true);
    if rg <= 5 then
      insert into public.arena_points (date_points, personne_id, type, motif, points, match_id, created_by, circuit)
      values (new.date_match::timestamptz, g, 'trone', 'Défense du trône', 5, new.id, new.valide_par, 'masters');
    end if;
    update public.masters_rang set bonus = true, maj_le = now() where personne_id = g;
    select r.personne_id, r.place into a_id, a_pl from public.masters_rang r left join public.arena_choix c on c.personne_id = r.personne_id
      where r.place < pg and coalesce(c.masters, true) order by r.place desc limit 1;
    if a_id is not null then
      update public.masters_rang set place = pg, maj_le = now() where personne_id = a_id;
      update public.masters_rang set place = a_pl, maj_le = now() where personne_id = g;
    end if;
  end if;
  return new;
end;
$$;

-- 6. Rush Points : calculés à la volée (victoire 5, défaite 3, séries, quêtes, trône, ajustements)
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
    select mj.personne_id, qa.id as quete_id, qa.points, qa.objectif, qa.critere, mj.gagne, mj.adv,
      case qa.periode when 'jour' then mj.date_match::text when 'semaine' then to_char(date_trunc('week', mj.date_match), 'IYYY-IW')
        when 'mois' then to_char(mj.date_match, 'YYYY-MM') else 'saison' end as cle
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
      sum(case when ap.type = 'trone' then ap.points else 0 end) as trone,
      sum(case when ap.type = 'ajustement' then ap.points else 0 end) as ajust
    from public.arena_points ap where ap.circuit = 'masters' and ap.type in ('quete', 'trone', 'ajustement') group by ap.personne_id)
  select part.personne_id, part.joueur, part.rang,
    coalesce(agg.v, 0) * cfg.v + (coalesce(agg.n, 0) - coalesce(agg.v, 0)) * cfg.d + coalesce(agg.series, 0) + coalesce(qauto.pts, 0) + coalesce(extra.quetes, 0) + coalesce(extra.trone, 0) + coalesce(extra.ajust, 0),
    coalesce(agg.v, 0), coalesce(agg.n, 0),
    coalesce(agg.v, 0) * cfg.v + (coalesce(agg.n, 0) - coalesce(agg.v, 0)) * cfg.d,
    coalesce(agg.series, 0), coalesce(qauto.pts, 0) + coalesce(extra.quetes, 0), coalesce(extra.trone, 0), coalesce(extra.ajust, 0), coalesce(agg.serie, 0)
  from part cross join cfg
  left join agg on agg.personne_id = part.personne_id
  left join qauto on qauto.personne_id = part.personne_id
  left join extra on extra.personne_id = part.personne_id
  order by 4 desc, 5 desc, 6 desc, 3 asc;
$$;
grant execute on function public.masters_rush(), public.masters_placer(uuid, int), public.masters_retrait_traiter(uuid, boolean), public.masters_retrait_annuler(uuid), public.masters_retraits() to authenticated;
revoke execute on function public.masters_rush(), public.masters_placer(uuid, int), public.masters_retrait_traiter(uuid, boolean), public.masters_retrait_annuler(uuid), public.masters_retraits() from anon;
