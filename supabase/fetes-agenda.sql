-- Les pages de fête (Fête de Noël…) deviennent des animations de l'agenda (17/11/2026)
-- Chaque page a son événement d'agenda (type animation) relié par evenements.fete_edition :
-- il apparaît dans « Animations à venir » de la gestion et dans l'agenda des familles concernées ;
-- la page de l'événement ouvre la page de la fête (confirmation de venue, invitation, tombola), sans Présent / Absent en double.
alter table public.evenements add column if not exists fete_edition text references public.fetes(edition) on update cascade on delete set null;
create unique index if not exists evenements_fete_edition_unique on public.evenements(fete_edition) where fete_edition is not null;

-- Fête de Noël 2026 : son événement d'agenda, pour les jeunes (comme la page : « école de tennis »)
with f as (select * from public.fetes where edition = 'noel-2026'),
ev as (
  insert into public.evenements (titre, type, debut, fin, lieu, statut, public, inscription_ouverte, description, fete_edition)
  select f.titre, 'animation', f.debut, f.fin, f.lieu, 'prevu', true, false,
         'Pour les enfants de l''école de tennis et leurs familles : jeux, animation et goûter. Amis et invités bienvenus !', f.edition
  from f where not exists (select 1 from public.evenements e where e.fete_edition = f.edition)
  returning id
)
insert into public.evenement_groupes (evenement_id, groupe_id)
select ev.id, g.id from ev, public.groupes g where g.type = 'profil' and g.nom = 'Jeunes';
