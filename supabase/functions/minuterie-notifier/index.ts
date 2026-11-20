// Minuterie du coach : à l'heure de fin, notification qui sonne et vibre sur ses appareils (même appli fermée).
// Appelée uniquement par la base (tâche toutes les 5 secondes) avec le secret partagé.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erreur: "méthode" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const cle = async (c: string) => (await admin.rpc("reglage_prive", { c })).data as string;
    const attendu = await cle("cron_secret");
    if (!attendu || req.headers.get("x-cron-secret") !== attendu) return json({ erreur: "non autorisé" }, 401);
    const { id } = await req.json();
    const { data: m } = await admin.from("minuteries").select("*").eq("id", id).maybeSingle();
    if (!m || m.statut === "annule") return json({ envoyes: 0 });
    const { data: abos } = await admin.from("push_abonnements").select("id, endpoint, p256dh, auth").eq("user_id", m.user_id);
    if (!abos?.length) return json({ envoyes: 0, appareils: 0 });
    webpush.setVapidDetails(await cle("vapid_sujet"), await cle("vapid_public"), await cle("vapid_prive"));
    const corps = JSON.stringify({
      title: String(m.titre).slice(0, 80), body: String(m.texte).slice(0, 200), url: m.url, tag: "minuterie",
      renotify: true, requireInteraction: true, vibrate: [600, 200, 600, 200, 600, 200, 1200],
    });
    let envoyes = 0;
    await Promise.all(abos.map(async (a) => {
      try {
        await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, corps, { TTL: 120, urgency: "high" });
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
