// Notification générale envoyée depuis l'espace gestion (actu, séance annulée ou déplacée…).
// Cibles : tout le monde, des groupes, ou les familles concernées par un événement.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erreur: "méthode" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const jeton = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jeton);
    if (!u?.user) return json({ erreur: "non connecté" }, 401);
    const b = await req.json();
    const direction = async () => ((await admin.from("responsabilites").select("user_id").eq("role", "direction").is("groupe_id", null)).data || []).map((r) => r.user_id as string);
    let titre = String(b.titre || "CLOCA Tennis").slice(0, 80);
    let texte = String(b.texte || "").slice(0, 200);
    let url = typeof b.url === "string" && b.url.startsWith("/app/") ? b.url : "/app/";
    let users: string[] = [];
    let perso: Record<string, string> = {}; // texte personnalisé par destinataire (messagerie)

    if (b.mode === "message") {
      // Message de la messagerie : seul son auteur peut déclencher les notifications
      const { data: m } = await admin.from("messages").select("id, auteur, expediteur, titre, texte").eq("id", b.message_id).maybeSingle();
      if (!m || m.auteur !== u.user.id) return json({ erreur: "message introuvable" }, 404);
      const { data: ds } = await admin.from("message_destinataires").select("user_id, pour").eq("message_id", m.id);
      titre = (m.expediteur + " · " + m.titre).slice(0, 80);
      texte = String(m.texte).replace(/\s+/g, " ").slice(0, 200);
      url = "/app/#/message/" + m.id;
      users = (ds || []).map((d) => d.user_id as string);
      (ds || []).forEach((d) => { if (d.pour) perso[d.user_id as string] = ("Pour " + d.pour + " : " + texte).slice(0, 200); });
    } else if (b.mode === "absence_ng") {
      // Un jeune Next Gen (ou sa famille) signale une absence : la direction est prévenue tout de suite
      const { data: abs } = await admin.from("nextgen_absences").select("id, jour, motif, cree_par, nextgen(grade, libelle, personne_id, personnes(prenom, nom, foyer_id), groupes(nom))").eq("id", b.absence_id).maybeSingle();
      const ng = abs?.nextgen as unknown as { libelle: string | null; personne_id: string; personnes: { prenom: string; nom: string; foyer_id: string | null }; groupes: { nom: string } | null } | null;
      if (!abs || !ng || abs.cree_par !== u.user.id) return json({ erreur: "absence introuvable" }, 404);
      const jour = new Date(abs.jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
      titre = "Absence Next Gen : " + ng.personnes.prenom + " " + ng.personnes.nom.charAt(0) + ".";
      texte = (jour + " · " + (ng.libelle || (ng.groupes ? ng.groupes.nom.replace(/^.*?·\s*/, "") : "")) + (abs.motif ? " · " + abs.motif : "")).slice(0, 200);
      url = "/app/gestion/#/nextgen";
      users = await direction();
    } else if (b.mode === "resa_double") {
      // Réservation d'un terrain pour un match du double interne
      const { data: r } = await admin.from("double_reservations").select("*").eq("id", b.reservation_id).maybeSingle();
      if (!r) return json({ erreur: "réservation introuvable" }, 404);
      const { data: eqs } = await admin.from("double_equipes").select("id, joueur1, joueur2, personne1, personne2, categorie, poule").in("id", [r.equipe_a, r.equipe_b]);
      const nomEq = (id: string) => { const e = (eqs || []).find((x) => x.id === id); return e ? e.joueur1 + (e.joueur2 ? " / " + e.joueur2 : "") : "?"; };
      const quand = new Date(r.jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Paris" });
      const h = String(r.heure).slice(0, 5).split(":"), hd = +h[0], md = h[1];
      const creneau = quand + " · " + hd + "h" + (md !== "00" ? md : "") + "–" + (hd + 2) + "h" + (md !== "00" ? md : "") + " · " + r.terrain;
      const match = nomEq(r.equipe_a) + " contre " + nomEq(r.equipe_b);
      url = "/app/#/double";
      if (r.statut === "demande") {
        if (r.cree_par !== u.user.id) return json({ erreur: "non autorisé" }, 403);
        titre = "Demande de réservation · Double";
        texte = (creneau + " · " + match).slice(0, 200);
        url = "/app/gestion/#/double";
        users = ((await admin.from("responsabilites").select("user_id").in("role", ["direction", "accueil"]).is("groupe_id", null)).data || []).map((x) => x.user_id as string);
      } else {
        const { data: roles } = await admin.from("responsabilites").select("role").eq("user_id", u.user.id).is("groupe_id", null).in("role", ["direction", "accueil"]);
        if (!roles?.length) return json({ erreur: "réservé à l'équipe du club" }, 403);
        const pids = (eqs || []).flatMap((e) => [e.personne1, e.personne2]).filter(Boolean);
        const { data: cs } = pids.length ? await admin.rpc("comptes_concernes", { pids }) : { data: [] };
        users = ((cs || []) as { user_id: string }[]).map((x) => x.user_id);
        if (r.cree_par) users.push(r.cree_par);
        users = [...new Set(users)];
        if (r.statut === "confirmee") { titre = "Terrain réservé ✅ · Double"; texte = (creneau + " · " + match).slice(0, 200); }
        else if (r.statut === "refusee") { titre = "Réservation impossible · Double"; texte = (creneau + (r.motif ? " · " + r.motif : "") + " · Faites une nouvelle demande.").slice(0, 200); }
        else return json({ envoyes: 0, appareils: 0 });
      }
    } else {
      const { data: roles } = await admin.from("responsabilites").select("role").eq("user_id", u.user.id).is("groupe_id", null).in("role", ["direction", "bureau", "accueil"]);
      if (!roles?.length) return json({ erreur: "réservé à l'équipe du club" }, 403);
      if (b.mode === "mission") {
        // Nouvelle mission : le coach visé, ou tous les comptes coach
        const q = admin.from("comptes").select("user_id, nom_coach").not("nom_coach", "is", null);
        const { data: cs } = await q;
        users = (cs || []).filter((c) => !b.pour_nom || String(c.nom_coach).toLowerCase() === String(b.pour_nom).toLowerCase()).map((c) => c.user_id as string);
      } else {
        const groupes = Array.isArray(b.groupes) && b.groupes.length ? b.groupes : null;
        const evt = b.evenement_id || null;
        const { data: ids, error } = await admin.rpc("destinataires_notif", { groupes, evt });
        if (error) return json({ erreur: error.message }, 500);
        users = (ids || []).map((x: unknown) => (typeof x === "string" ? x : (x as Record<string, string>).destinataires_notif));
      }
    }
    if (!users.length) return json({ envoyes: 0, appareils: 0 });

    const abos: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }[] = [];
    for (let i = 0; i < users.length; i += 200) {
      const { data } = await admin.from("push_abonnements").select("id, user_id, endpoint, p256dh, auth").in("user_id", users.slice(i, i + 200));
      abos.push(...(data || []));
    }
    if (!abos.length) return json({ envoyes: 0, appareils: 0 });

    const cle = async (c: string) => (await admin.rpc("reglage_prive", { c })).data as string;
    webpush.setVapidDetails(await cle("vapid_sujet"), await cle("vapid_public"), await cle("vapid_prive"));
    const corps = (uid: string) => JSON.stringify({ title: titre, body: perso[uid] || texte, url, tag: b.tag || undefined });
    let envoyes = 0;
    await Promise.all(abos.map(async (a) => {
      try {
        await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, corps(a.user_id), { TTL: 60 * 60 * 24 });
        envoyes++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await admin.from("push_abonnements").delete().eq("id", a.id);
      }
    }));
    return json({ envoyes, appareils: abos.length });
  } catch (e) {
    return json({ erreur: String((e as Error).message || e) }, 500);
  }
});
