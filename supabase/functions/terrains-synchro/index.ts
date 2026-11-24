// Synchronisation du planning des terrains (module « Réservation des terrains », lecture seule).
// Appelée par l'espace gestion (bouton « Actualiser ») et, plus tard, par une tâche planifiée à la fréquence réglée.
//
// ÉTAT AU 24/11/2026 : AUCUNE connexion ADOC n'existe. La source « adoc » répond toujours « non configurée »
// tant que la FFT n'a pas délivré d'accès officiel (identifiants API rangés en secrets côté serveur, jamais dans l'appli).
// Ce fichier prépare seulement l'endroit où la brancher, avec la conversion d'une réservation FFT en occupation
// (champs décrits dans la documentation FFT « Intégration du contrôleur d'accès » v1.9), sans aucun appel réseau à la FFT.
// Rien n'est jamais écrit dans ADOC : la synchronisation est en lecture seule.
// Vie privée : on ne garde que le terrain, la date et les heures. Les noms, mails et téléphones des joueurs sont ignorés.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

// Réservation telle que décrite par la FFT (seuls les champs utiles sont lus)
type ReservationFFT = { idReservation: string | number; idCourt: string | number; date: string; heureDebut: string; heureFin: string; delete?: boolean };
type Occupation = { terrain_id: string; debut: string; fin: string; categorie: string; source: "adoc"; source_ref: string; annule: boolean };

// « 2026-11-25 » + « 18:30 » → horodatage à l'heure de Paris
function horodatage(date: string, heure: string): string {
  const jour = date.slice(0, 10), h = (heure || "00:00").slice(0, 5);
  const essai = new Date(`${jour}T${h}:00Z`);
  const decalage = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", timeZoneName: "shortOffset" }).formatToParts(essai)
    .find((p) => p.type === "timeZoneName")?.value?.replace("GMT", "") || "+1";
  const signe = decalage.startsWith("-") ? "-" : "+", n = decalage.replace(/^[+-]/, "").split(":");
  return `${jour}T${h}:00${signe}${n[0].padStart(2, "0")}:${(n[1] || "00").padStart(2, "0")}`;
}
// Conversion pure : la FFT ne précise pas le type de réservation (cours, animation…) → « occupe » tant que la source ne permet pas de le savoir
export function depuisReservationFFT(r: ReservationFFT, courts: Record<string, string>): Occupation | null {
  const terrain = courts[String(r.idCourt)];
  if (!terrain) return null; // court non relié dans Gestion → Terrains et horaires (champ « ID du court côté FFT »)
  return { terrain_id: terrain, debut: horodatage(r.date, r.heureDebut), fin: horodatage(r.date, r.heureFin), categorie: "occupe", source: "adoc", source_ref: String(r.idReservation), annule: !!r.delete };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erreur: "méthode" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    // Qui appelle ? Seules les personnes qui gèrent les terrains (module « terrains ») peuvent lancer une actualisation.
    const jeton = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jeton);
    if (!u?.user) return json({ erreur: "non connecté" }, 401);
    const { data: ok } = await admin.rpc("terrains_peut_gerer", { uid: u.user.id }).then((r) => r, () => ({ data: false }));
    if (!ok) return json({ erreur: "non autorisé" }, 403);

    const maintenant = new Date().toISOString();
    const sources: Record<string, unknown> = {};

    // Source ADOC : pas d'accès officiel → on le dit, sans rien inventer.
    const identifiants = Deno.env.get("FFT_CLIENT_ID") && Deno.env.get("FFT_CLIENT_SECRET") && Deno.env.get("FFT_CODE_CLUB");
    if (!identifiants) {
      await admin.from("terrains_synchro").update({ statut: "non_configure", dernier_essai: maintenant, message: "Aucune connexion officielle avec ADOC pour le moment : en attente d'une autorisation de la FFT." }).eq("source", "adoc");
      sources.adoc = { statut: "non_configure" };
    } else {
      // Les identifiants existeraient mais le branchement n'est pas écrit : il le sera avec la documentation que fournira la FFT.
      await admin.from("terrains_synchro").update({ statut: "en_attente", dernier_essai: maintenant, message: "Identifiants présents, branchement à terminer avec la documentation officielle de la FFT." }).eq("source", "adoc");
      sources.adoc = { statut: "en_attente" };
    }

    // Source import : rien à aller chercher (c'est la gestion qui envoie le fichier) ; on renvoie simplement son état.
    const { data: imp } = await admin.from("terrains_synchro").select("statut, derniere_reussite, message").eq("source", "import").maybeSingle();
    sources.import = imp || null;

    return json({ ok: true, sources });
  } catch (e) {
    return json({ erreur: String((e as Error)?.message || e) }, 500);
  }
});
