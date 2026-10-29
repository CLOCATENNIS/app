// Boîte à idées et signalement de bug : envoie le retour par mail au club, et prévient la direction par notification.
// Secrets attendus (Supabase → Edge Functions → Secrets) : SMTP_USER, SMTP_PASS (mot de passe d'application Google), RETOURS_DEST (facultatif).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";
import nodemailer from "npm:nodemailer@6.9.16";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erreur: "méthode" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const jeton = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jeton);
    if (!u?.user) return json({ erreur: "non connecté" }, 401);
    const b = await req.json();
    const { data: r } = await admin.from("retours").select("*").eq("id", b.retour_id).maybeSingle();
    if (!r || r.user_id !== u.user.id) return json({ erreur: "retour introuvable" }, 404);
    if (r.mail_envoye) return json({ mail: true });

    const genre = r.type === "bug" ? "Bug signalé" : "Boîte à idées";
    const qui = [r.prenom, r.nom].filter(Boolean).join(" ") || "Adhérent";
    let mail = false;
    const user = Deno.env.get("SMTP_USER"), pass = Deno.env.get("SMTP_PASS");
    if (user && pass) {
      try {
        const t = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });
        await t.sendMail({
          from: `"Appli CLOCA Tennis" <${user}>`,
          to: Deno.env.get("RETOURS_DEST") || "contact@clocatennis.fr",
          replyTo: r.email || undefined,
          subject: `[${genre}] ${r.categorie} · ${qui}`.slice(0, 150),
          text: `${genre} : ${r.categorie}\nDe : ${qui} <${r.email || "?"}>\nLe : ${new Date(r.cree_le).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}\n\n${r.texte}\n\n---\n${r.contexte || ""}\nRéponds directement à ce mail pour répondre à l'adhérent.`,
          html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#102f4a"><p style="margin:0 0 4px;color:#b4532a;font-weight:bold;text-transform:uppercase;font-size:12px">${esc(genre)} · ${esc(r.categorie)}</p><p style="margin:0 0 12px"><b>${esc(qui)}</b> &lt;${esc(r.email || "?")}&gt;</p><div style="white-space:pre-wrap;background:#f5f2ec;border-radius:8px;padding:12px 14px">${esc(r.texte)}</div><p style="font-size:12px;color:#667">${esc(r.contexte || "")}<br>Réponds directement à ce mail pour répondre à l'adhérent. Tous les retours sont aussi dans l'espace gestion → Retours.</p></div>`,
        });
        mail = true;
        await admin.from("retours").update({ mail_envoye: true }).eq("id", r.id);
      } catch (_e) { mail = false; }
    }

    // Notification à la direction (en plus du mail)
    try {
      const ids = ((await admin.from("responsabilites").select("user_id").eq("role", "direction").is("groupe_id", null)).data || []).map((x) => x.user_id as string);
      if (ids.length) {
        const { data: abos } = await admin.from("push_abonnements").select("id, endpoint, p256dh, auth").in("user_id", ids);
        if (abos?.length) {
          const cle = async (c: string) => (await admin.rpc("reglage_prive", { c })).data as string;
          webpush.setVapidDetails(await cle("vapid_sujet"), await cle("vapid_public"), await cle("vapid_prive"));
          const corps = JSON.stringify({ title: (genre + " · " + r.categorie).slice(0, 80), body: (qui + " : " + String(r.texte).replace(/\s+/g, " ")).slice(0, 200), url: "/app/gestion/#/retours" });
          await Promise.all(abos.map((a) => webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, corps, { TTL: 86400 }).catch(() => {})));
        }
      }
    } catch (_e) { /* la notification est un bonus */ }
    return json({ mail });
  } catch (e) {
    return json({ erreur: String((e as Error).message || e) }, 500);
  }
});
