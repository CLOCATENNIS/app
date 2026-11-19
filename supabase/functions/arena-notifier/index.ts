// Notifications push « Ace ! » après un match CLOC'ARENA Masters ou Versus validé
// (résultat, points, séries, défense du trône, exploit, quêtes réussies).
// La cloche de l'appli est déjà remplie par la base (déclencheur zz_arena_notif) ; ici, seulement le push sur les téléphones.
// Appelée par l'espace gestion juste après la validation d'un match.
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
    const { data: roles } = await admin.from("responsabilites").select("role").eq("user_id", u.user.id).is("groupe_id", null).in("role", ["direction", "enseignant"]);
    if (!roles?.length) return json({ erreur: "réservé à la direction" }, 403);

    const { match_id } = await req.json();
    const { data: m } = await admin.from("arena_matchs").select("id, circuit, statut").eq("id", match_id).maybeSingle();
    if (!m || m.statut !== "valide") return json({ envoyes: 0, raison: "match non validé" });
    const { data: evts, error } = await admin.rpc("arena_evenements_match", { mid: m.id });
    if (error) return json({ erreur: error.message }, 500);
    const liste = (evts || []) as { personne_id: string; titre: string; texte: string }[];
    if (!liste.length) return json({ envoyes: 0, raison: "rien à notifier" });

    const cle = async (c: string) => (await admin.rpc("reglage_prive", { c })).data as string;
    webpush.setVapidDetails(await cle("vapid_sujet"), await cle("vapid_public"), await cle("vapid_prive"));
    const url = "/app/#/arena/" + m.circuit;
    let envoyes = 0;
    // Une notification par joueur : la première ligne en titre, les accomplissements regroupés dans le texte
    const parJoueur = new Map<string, { titre: string; texte: string }[]>();
    for (const e of liste) parJoueur.set(e.personne_id, [...(parJoueur.get(e.personne_id) || []), e]);
    for (const [pid, es] of parJoueur) {
      const { data: comptes } = await admin.rpc("comptes_concernes", { pids: [pid] });
      const ids = ((comptes || []) as { user_id: string }[]).map((c) => c.user_id);
      if (!ids.length) continue;
      const { data: abos } = await admin.from("push_abonnements").select("id, endpoint, p256dh, auth").in("user_id", ids);
      if (!abos?.length) continue;
      const titre = es.length > 1 ? es[0].titre + " · " + es.slice(1).map((e) => e.titre.replace(/ !$/, "")).join(" · ") : es[0].titre;
      const texte = es.map((e) => e.texte).join(" — ");
      const message = JSON.stringify({ title: titre.slice(0, 80), body: texte.slice(0, 240), url, tag: "arena-" + m.id + "-" + pid });
      for (const a of abos) {
        try {
          await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, message, { TTL: 60 * 60 * 24 * 3, urgency: "high" });
          envoyes++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await admin.from("push_abonnements").delete().eq("id", a.id);
        }
      }
    }
    return json({ envoyes, joueurs: parJoueur.size });
  } catch (e) {
    return json({ erreur: String((e as Error).message || e) }, 500);
  }
});
