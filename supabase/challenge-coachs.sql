-- Challenge Week dans l'espace coach (23/11/2026) : les coachs (rôles enseignant ou coach) et la direction
-- gèrent présents, équipes et résultats. Les défis, les paliers et l'affichage dans l'appli restent à la direction.
create or replace function prive.challenge_staff() returns boolean
 language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.responsabilites r where r.user_id = (select auth.uid()) and r.role in ('direction', 'enseignant', 'coach'));
$$;
revoke all on function prive.challenge_staff() from public, anon;
grant execute on function prive.challenge_staff() to authenticated;

drop policy if exists arena_challenges_coach_lecture on public.arena_challenges;
create policy arena_challenges_coach_lecture on public.arena_challenges for select to authenticated using (prive.challenge_staff());
drop policy if exists arena_challenge_essais_coach_lecture on public.arena_challenge_essais;
create policy arena_challenge_essais_coach_lecture on public.arena_challenge_essais for select to authenticated using (prive.challenge_staff());
drop policy if exists arena_challenge_essais_coach_ajout on public.arena_challenge_essais;
create policy arena_challenge_essais_coach_ajout on public.arena_challenge_essais for insert to authenticated with check (prive.challenge_staff());
drop policy if exists arena_challenge_essais_coach_annuler on public.arena_challenge_essais;
create policy arena_challenge_essais_coach_annuler on public.arena_challenge_essais for update to authenticated using (prive.challenge_staff()) with check (prive.challenge_staff());

-- Présents et équipes d'une séance (seul ce jour est réécrit : deux coachs sur deux séances ne s'écrasent pas)
create or replace function public.challenge_equipes_maj(p_id uuid, p_jour text, p_val jsonb)
 returns void language plpgsql security definer set search_path to '' as $$
begin
  if not prive.challenge_staff() then raise exception 'Réservé aux coachs et à la direction'; end if;
  if p_jour !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Jour invalide'; end if;
  update public.arena_challenges set equipes = jsonb_set(coalesce(equipes, '{}'::jsonb), array[p_jour], coalesce(p_val, '{}'::jsonb), true) where id = p_id and not archive;
end $$;
revoke all on function public.challenge_equipes_maj(uuid, text, jsonb) from public, anon;
grant execute on function public.challenge_equipes_maj(uuid, text, jsonb) to authenticated;

-- Joueurs CLOC'ARENA (pour cocher les présents), avec leur réponse « Je participe » à la séance si elle est donnée
create or replace function public.challenge_joueurs(p_evenement uuid default null)
 returns table(id uuid, prenom text, nom text, niveau_arena text, arena_id text, actif boolean, oui boolean)
 language sql stable security definer set search_path to '' as $$
  select p.id, p.prenom, p.nom, p.niveau_arena, p.arena_id::text, p.actif,
    exists (select 1 from public.participations x where x.evenement_id = p_evenement and x.personne_id = p.id and x.reponse = 'oui')
  from public.personnes p
  where prive.challenge_staff() and p.actif and p.niveau_arena is not null
  order by p.prenom;
$$;
revoke all on function public.challenge_joueurs(uuid) from public, anon;
grant execute on function public.challenge_joueurs(uuid) to authenticated;
