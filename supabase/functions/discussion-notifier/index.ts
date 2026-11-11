// Discussions : notification push aux membres d'un fil quand un message arrive.
// Appelée par l'appli juste après l'envoi, par l'auteur du message uniquement.
// Pas de notification pour l'auteur, les membres qui ont coupé le fil, ni les exclus.
// Fil fermé (en test) : seule la direction est prévenue.
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

    const { data: m } = await admin.from("discussion_messages").select("id, discussion_id, user_id, auteur, texte, supprime_le").eq("id", b.message_id).maybeSingle();
    if (!m || m.user_id !== u.user.id || m.supprime_le) return json({ erreur: "message introuvable" }, 404);
    const { data: d } = await admin.from("discussions").select("id, nom, ouvert, archive").eq("id", m.discussion_id).maybeSingle();
    if (!d || d.archive) return json({ envoyes: 0, appareils: 0 });

    let q = admin.from("discussion_membres").select("user_id").eq("discussion_id", d.id).eq("exclu", false).eq("muet", false).neq("user_id", u.user.id);
    if (!d.ouvert) {
      const dir = ((await admin.from("responsabilites").select("user_id").eq("role", "direction").is("groupe_id", null)).data || []).map((r) => r.user_id as string);
      if (!dir.length) return json({ envoyes: 0, appareils: 0 });
      q = q.in("user_id", dir);
    }
    const users = ((await q).data || []).map((r) => r.user_id as string);
    if (!users.length) return json({ envoyes: 0, appareils: 0 });

    // Cloche de l'appli : une seule ligne par fil et par compte, le compteur monte jusqu'à ce que le fil soit ouvert
    await admin.rpc("notif_ajouter", { users, p_titre: String(d.nom), p_texte: (m.auteur + " : " + String(m.texte).replace(/\s+/g, " ")), p_url: "/app/#/discussion/" + d.id, p_cle: "disc:" + d.id });

    const abos: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }[] = [];
    for (let i = 0; i < users.length; i += 200) {
      const { data } = await admin.from("push_abonnements").select("id, user_id, endpoint, p256dh, auth").in("user_id", users.slice(i, i + 200));
      abos.push(...(data || []));
    }
    if (!abos.length) return json({ envoyes: 0, appareils: 0 });

    const cle = async (c: string) => (await admin.rpc("reglage_prive", { c })).data as string;
    webpush.setVapidDetails(await cle("vapid_sujet"), await cle("vapid_public"), await cle("vapid_prive"));
    const corps = JSON.stringify({
      title: String(d.nom).slice(0, 80),
      body: (m.auteur + " : " + String(m.texte).replace(/\s+/g, " ")).slice(0, 200),
      url: "/app/#/discussion/" + d.id,
      tag: "disc-" + d.id,
    });
    let envoyes = 0;
    await Promise.all(abos.map(async (a) => {
      try {
        await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, corps, { TTL: 60 * 60 * 24, urgency: "high" });
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
