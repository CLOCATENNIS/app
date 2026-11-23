// Se connecter « en tant que » (direction sportive uniquement) — 23/11/2026.
// Entrée : { user_id } du compte à ouvrir → renvoie un jeton à usage unique que l'appli échange contre une session de ce compte
// (sb.auth.verifyOtp). Aucun mail n'est envoyé à la personne. Chaque entrée est notée au journal (Gestion → Historique).
// Entrée : { fin: true, user_id } → note seulement la sortie au journal (appelé avec la session de la direction revenue).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

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
    if (!u?.user) return json({ erreur: "Non connecté" }, 401);
    const { data: dir } = await admin.from("responsabilites").select("id").eq("user_id", u.user.id).eq("role", "direction").is("groupe_id", null).limit(1);
    if (!dir?.length) return json({ erreur: "Réservé à la direction sportive" }, 403);

    const b = await req.json().catch(() => ({}));
    const cible = String(b.user_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(cible)) return json({ erreur: "Compte manquant" }, 400);
    if (cible === u.user.id) return json({ erreur: "C'est déjà ton compte" }, 400);
    const { data: t } = await admin.auth.admin.getUserById(cible);
    const email = t?.user?.email;
    if (!email) return json({ erreur: "Compte introuvable" }, 404);

    const noter = (action: string) => admin.from("journal").insert({
      jour: new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }), user_id: u.user.id, auteur: u.user.email,
      table_nom: "connexion_comme", action: "ajout", cle: cible,
      objet: (action === "fin" ? "Sortie du compte " : "Connexion en tant que ") + email,
    });

    if (b.fin) { await noter("fin"); return json({ ok: true }); }

    const { data: lien, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !lien?.properties?.hashed_token) return json({ erreur: "Connexion impossible : " + (error?.message || "jeton absent") }, 500);
    await noter("debut");
    return json({ token_hash: lien.properties.hashed_token, email });
  } catch (e) {
    return json({ erreur: String((e as Error)?.message || e) }, 500);
  }
});
