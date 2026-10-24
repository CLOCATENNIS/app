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
    const { data: roles } = await admin.from("responsabilites").select("role").eq("user_id", u.user.id).is("groupe_id", null).in("role", ["direction", "bureau", "accueil"]);
    if (!roles?.length) return json({ erreur: "réservé à l'équipe du club" }, 403);

    const b = await req.json();
    const titre = String(b.titre || "CLOCA Tennis").slice(0, 80);
    const texte = String(b.texte || "").slice(0, 200);
    const url = typeof b.url === "string" && b.url.startsWith("/app/") ? b.url : "/app/";
    const groupes = Array.isArray(b.groupes) && b.groupes.length ? b.groupes : null;
    const evt = b.evenement_id || null;

    const { data: ids, error } = await admin.rpc("destinataires_notif", { groupes, evt });
    if (error) return json({ erreur: error.message }, 500);
    const users = (ids || []).map((x: unknown) => (typeof x === "string" ? x : (x as Record<string, string>).destinataires_notif));
    if (!users.length) return json({ envoyes: 0, appareils: 0 });

    const abos: { id: string; endpoint: string; p256dh: string; auth: string }[] = [];
    for (let i = 0; i < users.length; i += 200) {
      const { data } = await admin.from("push_abonnements").select("id, endpoint, p256dh, auth").in("user_id", users.slice(i, i + 200));
      abos.push(...(data || []));
    }
    if (!abos.length) return json({ envoyes: 0, appareils: 0 });

    const cle = async (c: string) => (await admin.rpc("reglage_prive", { c })).data as string;
    webpush.setVapidDetails(await cle("vapid_sujet"), await cle("vapid_public"), await cle("vapid_prive"));
    const message = JSON.stringify({ title: titre, body: texte, url, tag: b.tag || undefined });
    let envoyes = 0;
    await Promise.all(abos.map(async (a) => {
      try {
        await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, message, { TTL: 60 * 60 * 24 });
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
