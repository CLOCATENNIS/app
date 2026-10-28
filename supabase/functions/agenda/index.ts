// Agenda personnel d'une famille au format iCalendar, à ajouter une fois dans son téléphone.
// Adresse : /functions/v1/agenda?t=<lien secret du compte>. Le lien secret remplace la connexion.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const NOM = "CLOCA Tennis";
const ADRESSE = "CLOCA Tennis, 81 rue de Saint-Germain, 78260 Achères";
const VTZ = [
  "BEGIN:VTIMEZONE", "TZID:Europe/Paris",
  "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
  "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
  "END:VTIMEZONE",
];
const JOURS = ["", "MO", "TU", "WE", "TH", "FR", "SA", "SU"];

const txt = (s: unknown) => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const local = (jour: string, h: string) => jour.replace(/-/g, "") + "T" + h.slice(0, 5).replace(":", "") + "00";
// Les lignes de plus de 75 octets sont repliées, comme l'exige le format
function plier(l: string) {
  const enc = new TextEncoder(), out: string[] = [];
  let cur = "";
  for (const ch of l) {
    if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) { out.push(cur); cur = ch; } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}

// Semaines sans cours (vacances, trêve) : chaque séance concernée est retirée de la répétition
function exdates(premier: string, au: string | null, h: string, pauses: { debut: string; fin: string }[]) {
  const out: string[] = [];
  const fin = au || new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);
  for (let d = new Date(premier + "T12:00:00Z"); d.toISOString().slice(0, 10) <= fin; d.setUTCDate(d.getUTCDate() + 7)) {
    const iso = d.toISOString().slice(0, 10);
    if (pauses.some((p) => iso >= p.debut && iso <= p.fin)) out.push("EXDATE;TZID=Europe/Paris:" + local(iso, h));
  }
  return out;
}

Deno.serve(async (req) => {
  const t = new URL(req.url).searchParams.get("t") || "";
  if (!/^[0-9a-f-]{36}$/i.test(t)) return new Response("Lien d'agenda invalide.", { status: 404 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const { data: compte, error: err } = await db.from("comptes").select("user_id, foyer_id, personne_id").eq("calendrier_token", t).maybeSingle();
  if (err) return new Response("Agenda indisponible pour le moment (" + err.message + ").", { status: 500 });
  if (!compte) return new Response("Ce lien d'agenda n'est plus valable. Récupère le nouveau dans l'appli.", { status: 404 });

  // Les personnes que suit ce compte : soi-même, et les enfants mineurs pour un parent
  const { data: vis } = await db.rpc("personnes_visibles", { uid: compte.user_id });
  const visibles = ((vis || []) as unknown[]).map((x) => (typeof x === "string" ? x : (x as Record<string, string>).personnes_visibles));
  const { data: pers } = visibles.length ? await db.from("personnes").select("id, prenom").eq("actif", true).in("id", visibles) : { data: [] as { id: string; prenom: string }[] };
  const ids = (pers || []).map((p) => p.id);
  const prenom: Record<string, string> = Object.fromEntries((pers || []).map((p) => [p.id, p.prenom]));

  // Les groupes de chacun
  const { data: gm } = ids.length ? await db.from("groupe_membres").select("groupe_id, personne_id").in("personne_id", ids) : { data: [] };
  const parGroupe: Record<string, string[]> = {};
  (gm || []).forEach((g) => (parGroupe[g.groupe_id] = parGroupe[g.groupe_id] || []).push(g.personne_id));
  const groupes = Object.keys(parGroupe);

  // Les événements : ceux de leurs groupes, leurs inscriptions, et ceux du club ouverts à tous
  const depuis = new Date(Date.now() - 30 * 864e5).toISOString(), jusque = new Date(Date.now() + 270 * 864e5).toISOString();
  const { data: evts } = await db.from("evenements").select("id, titre, description, objectif, type, debut, fin, lieu, encadrant, statut, public, groupe_id, inscription_ouverte, evenement_groupes(groupe_id)")
    .gte("debut", depuis).lte("debut", jusque).order("debut");
  const { data: ins } = ids.length ? await db.from("inscriptions").select("evenement_id, personne_id, statut").in("personne_id", ids).eq("statut", "inscrit") : { data: [] };

  const L: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CLOCA Tennis//Agenda//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:" + NOM, "X-WR-TIMEZONE:Europe/Paris", "X-PUBLISHED-TTL:PT3H", "REFRESH-INTERVAL;VALUE=DURATION:PT3H", ...VTZ];
  const stamp = utc(new Date());

  for (const e of evts || []) {
    const gs = [e.groupe_id, ...(e.evenement_groupes || []).map((x: { groupe_id: string }) => x.groupe_id)].filter(Boolean) as string[];
    const qui = new Set<string>();
    // Séance sur inscription (places limitées) : seulement pour les inscrits
    if (!e.inscription_ouverte) gs.forEach((g) => (parGroupe[g] || []).forEach((p) => qui.add(p)));
    (ins || []).filter((i) => i.evenement_id === e.id).forEach((i) => qui.add(i.personne_id));
    const pourTous = e.public && !gs.length && e.type !== "seance" && !e.inscription_ouverte;
    if (!qui.size && !pourTous) continue;
    const noms = [...qui].map((p) => prenom[p]).filter(Boolean);
    const annule = e.statut === "annule";
    const d = new Date(e.debut), f = e.fin ? new Date(e.fin) : new Date(d.getTime() + 3600e3);
    const desc = [annule ? "ANNULÉ" : e.statut === "deplace" ? "Horaire modifié" : "", e.objectif, e.description, e.encadrant ? "Encadré par " + e.encadrant : "", noms.length ? "Pour : " + noms.join(", ") : "",
      "Détails : https://clocatennis.fr/app/#/evenement/" + e.id].filter(Boolean).join("\n");
    L.push("BEGIN:VEVENT", "UID:" + e.id + "@clocatennis.fr", "DTSTAMP:" + stamp, "DTSTART:" + utc(d), "DTEND:" + utc(f),
      "SUMMARY:" + txt((annule ? "ANNULÉ · " : "") + e.titre + (noms.length && (pers || []).length > 1 ? " (" + noms.join(", ") + ")" : "")),
      "LOCATION:" + txt(e.lieu ? e.lieu + " · " + ADRESSE : ADRESSE), "DESCRIPTION:" + txt(desc), "URL:https://clocatennis.fr/app/#/evenement/" + e.id,
      "STATUS:" + (annule ? "CANCELLED" : "CONFIRMED"), "END:VEVENT");
  }

  // Les cours réguliers (créneaux hebdomadaires des groupes)
  if (groupes.length) {
    const { data: pauses } = await db.from("periodes_sans_cours").select("debut, fin");
    const { data: cren } = await db.from("creneaux").select("id, groupe_id, jour_semaine, heure_debut, heure_fin, lieu, encadrant, du, au, groupes(nom)").in("groupe_id", groupes);
    for (const c of cren || []) {
      const premier = new Date((c.du || new Date().toISOString().slice(0, 10)) + "T12:00:00Z");
      while (((premier.getUTCDay() || 7) as number) !== c.jour_semaine) premier.setUTCDate(premier.getUTCDate() + 1);
      const jour = premier.toISOString().slice(0, 10);
      const noms = (parGroupe[c.groupe_id] || []).map((p) => prenom[p]).filter(Boolean);
      const g = ((c.groupes as unknown as { nom: string } | null)?.nom || "Cours").replace(/^.*?·\s*/, "").replace(/\s*\([^)]*\)\s*$/, "");
      L.push("BEGIN:VEVENT", "UID:cours-" + c.id + "@clocatennis.fr", "DTSTAMP:" + stamp,
        "DTSTART;TZID=Europe/Paris:" + local(jour, c.heure_debut), "DTEND;TZID=Europe/Paris:" + local(jour, c.heure_fin),
        "RRULE:FREQ=WEEKLY;BYDAY=" + JOURS[c.jour_semaine] + (c.au ? ";UNTIL=" + c.au.replace(/-/g, "") + "T235959Z" : ""),
        ...exdates(jour, c.au, c.heure_debut, pauses || []),
        "SUMMARY:" + txt(g + ((pers || []).length > 1 && noms.length ? " (" + noms.join(", ") + ")" : "")),
        "LOCATION:" + txt(c.lieu ? c.lieu + " · " + ADRESSE : ADRESSE), "DESCRIPTION:" + txt(c.encadrant ? "Avec " + c.encadrant : ""), "END:VEVENT");
    }
  }

  L.push("END:VCALENDAR");
  return new Response(L.map(plier).join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="cloca-tennis.ics"', "Cache-Control": "no-cache" },
  });
});
