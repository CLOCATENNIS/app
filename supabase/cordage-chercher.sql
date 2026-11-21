-- Atelier cordage : le cordeur cherche un adhérent par son nom en déposant une raquette pour lui (21/11/2026)
-- Prénom ou nom, sans tenir compte des accents ni des majuscules ; 10 résultats, ceux dont le prénom commence par la saisie d'abord.
create or replace function public.cordage_chercher(p_q text)
returns table (id uuid, prenom text, nom text, age int)
language plpgsql stable security definer set search_path to ''
as $$
declare
  a text := 'àâäáãéèêëíìîïóòôöõúùûüçñ';
  b text := 'aaaaaeeeeiiiiooooouuuucn';
  t text := translate(lower(btrim(coalesce(p_q, ''))), a, b);
begin
  if not prive.est_cordeur() then raise exception 'non autorisé'; end if;
  if length(t) < 2 then return; end if;
  return query
    select p.id, p.prenom, p.nom,
           case when p.date_naissance is not null then extract(year from age(p.date_naissance))::int end
    from public.personnes p
    where coalesce(p.actif, true) and not coalesce(p.demo, false)
      and (translate(lower(p.prenom || ' ' || p.nom), a, b) like '%' || t || '%'
        or translate(lower(p.nom || ' ' || p.prenom), a, b) like '%' || t || '%')
    order by (translate(lower(p.prenom), a, b) like t || '%') desc, p.prenom, p.nom
    limit 10;
end;
$$;
revoke all on function public.cordage_chercher(text) from public, anon;
grant execute on function public.cordage_chercher(text) to authenticated;
