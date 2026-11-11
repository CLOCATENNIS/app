// Prévient la direction (notification push) quand une famille confirme sa venue à une fête
// ou réserve des tickets de tombola. Appelable sans compte : on n'accepte qu'une ligne
// créée il y a moins de 10 minutes et pas encore notifiée.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const euros = (n: number) => String(Number(n)).replace(".", ",") + " €";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erreur: "méthode" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const b = await req.json();
    const table = b.type === "tombola" ? "tombola_commandes" : "fete_participations";
    const depuis = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    // On marque la ligne comme notifiée en même temps qu'on la lit : un seul envoi possible
    const { data: rows } = await admin.from(table).update({ notifie: true }).eq("id", b.id).eq("notifie", false).gte("cree_le", depuis).select("*");
    const r = rows && rows[0];
    if (!r) return json({ envoyes: 0, raison: "déjà notifié ou introuvable" });
    const { data: f } = await admin.from("fetes").select("titre").eq("edition", r.edition).maybeSingle();
    const fete = f?.titre || "Fête";

    let titre: string, texte: string;
    if (table === "tombola_commandes") {
      titre = "🎟️ Tombola · " + fete;
      texte = r.nom + " réserve " + r.nb + " ticket" + (r.nb > 1 ? "s" : "") + " (" + euros(r.montant) + ", à encaisser)";
    } else {
      const { count } = await admin.from("fete_participations").select("id", { count: "exact", head: true }).eq("edition", r.edition).eq("annule", false);
      titre = "🎄 " + fete + " : nouvelle famille";
      texte = r.nom + " · " + (r.groupe === "plus5" ? "5 personnes ou plus" : "moins de 5 personnes") + (r.avec_invites ? " · avec invités" : "") + " · " + (count || 0) + " famille" + ((count || 0) > 1 ? "s" : "") + " au total";
    }

    const users = ((await admin.from("responsabilites").select("user_id").eq("role", "direction").is("groupe_id", null)).data || []).map((x) => x.user_id as string);
    if (!users.length) return json({ envoyes: 0 });
    await admin.rpc("notif_ajouter", { users, p_titre: titre, p_texte: texte, p_url: "/app/gestion/#/fetes" });
    const { data: abos } = await admin.from("push_abonnements").select("id, endpoint, p256dh, auth").in("user_id", users);
    if (!abos?.length) return json({ envoyes: 0, appareils: 0 });
    const cle = async (c: string) => (await admin.rpc("reglage_prive", { c })).data as string;
    webpush.setVapidDetails(await cle("vapid_sujet"), await cle("vapid_public"), await cle("vapid_prive"));
    const corps = JSON.stringify({ title: titre.slice(0, 80), body: texte.slice(0, 200), url: "/app/gestion/#/fetes", tag: "fete-" + r.edition });
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
