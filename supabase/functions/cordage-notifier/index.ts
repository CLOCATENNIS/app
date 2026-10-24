// Prévient la famille qu'une raquette est cordée (notification push sur ses appareils).
// Appelée par l'appli quand un cordeur passe une demande en « prête ».
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const euros = (n: number | null) => (n == null ? "" : String(Number(n)).replace(".", ",") + " €");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erreur: "méthode" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    // 1. Qui appelle ? Seuls les cordeurs et la direction peuvent notifier.
    const jeton = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jeton);
    if (!u?.user) return json({ erreur: "non connecté" }, 401);
    const { data: roles } = await admin.from("responsabilites").select("role").eq("user_id", u.user.id).is("groupe_id", null).in("role", ["cordeur", "direction"]);
    if (!roles?.length) return json({ erreur: "réservé aux cordeurs" }, 403);

    const { demande_id } = await req.json();
    const { data: d } = await admin.from("cordage_demandes").select("id, nom, prix, personne_id, statut").eq("id", demande_id).maybeSingle();
    if (!d) return json({ erreur: "demande introuvable" }, 404);
    if (!d.personne_id) return json({ envoyes: 0, appareils: 0, raison: "joueur sans compte" });

    // 2. Les comptes de la famille du joueur
    const { data: p } = await admin.from("personnes").select("prenom, foyer_id").eq("id", d.personne_id).single();
    let cq = admin.from("comptes").select("user_id");
    cq = p?.foyer_id ? cq.or(`personne_id.eq.${d.personne_id},foyer_id.eq.${p.foyer_id}`) : cq.eq("personne_id", d.personne_id);
    const { data: comptes } = await cq;
    const ids = (comptes || []).map((c) => c.user_id);
    if (!ids.length) return json({ envoyes: 0, appareils: 0, raison: "aucun compte" });

    const { data: abos } = await admin.from("push_abonnements").select("id, endpoint, p256dh, auth").in("user_id", ids);
    if (!abos?.length) return json({ envoyes: 0, appareils: 0, raison: "notifications non activées" });

    // 3. Envoi
    const cle = async (c: string) => (await admin.rpc("reglage_prive", { c })).data as string;
    webpush.setVapidDetails(await cle("vapid_sujet"), await cle("vapid_public"), await cle("vapid_prive"));
    const message = JSON.stringify({
      title: "Raquette prête 🎾",
      body: `La raquette de ${p?.prenom || d.nom} est cordée. Elle t'attend au club house` + (d.prix != null ? ` (${euros(d.prix)}).` : "."),
      url: "/app/#/cordage/pretes",
      tag: "cordage-" + d.id,
    });
    let envoyes = 0;
    for (const a of abos) {
      try {
        await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, message, { TTL: 60 * 60 * 24 * 3 });
        envoyes++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await admin.from("push_abonnements").delete().eq("id", a.id); // appareil désinscrit
      }
    }
    if (envoyes) await admin.from("cordage_demandes").update({ notifie_le: new Date().toISOString() }).eq("id", d.id);
    return json({ envoyes, appareils: abos.length });
  } catch (e) {
    return json({ erreur: String((e as Error).message || e) }, 500);
  }
});
