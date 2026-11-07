// Robot de vérification de l'appli CLOCA Tennis.
// Il ouvre l'appli comme une famille (vraies données, en lecture seule) et l'espace gestion
// comme la direction (fausses données), et signale toute page vide, erreur ou donnée illisible.
// Lancement : node .github/tests/robot.mjs   (depuis la racine du dépôt)
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, appendFileSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const RACINE = resolve(process.cwd());
const PORT = 8790;
const BASE = `http://localhost:${PORT}`;
const resultats = []; // { zone, page, ok, detail }
const note = (zone, page, ok, detail = '') => { resultats.push({ zone, page, ok, detail }); console.log(`${ok ? '✅' : '❌'} ${zone} · ${page}${detail ? ' — ' + detail : ''}`); };

// ---------- 1. Le code se lit sans erreur ----------
const FICHIERS_JS = ['app/app.js', 'app/gestion/admin.js', 'app/sw.js'];
for (const f of FICHIERS_JS) {
  try { new Function(readFileSync(join(RACINE, f), 'utf8')); note('Code', f, true); }
  catch (e) { note('Code', f, false, e.message); }
}

// Clés publiques de la base, lues dans l'appli (ce sont les mêmes que celles du navigateur)
const appJs = readFileSync(join(RACINE, 'app/app.js'), 'utf8');
const SUPA_URL = (appJs.match(/var SUPA_URL = '([^']+)'/) || [])[1];
const SUPA_KEY = (appJs.match(/var SUPA_KEY = '([^']+)'/) || [])[1];

// ---------- 2. Les données publiques sont lisibles par les familles ----------
// (c'est ce qui manquait le 3 novembre : la page Noël restait vide)
const TABLES_PUBLIQUES = ['fetes', 'tombola_lots', 'publications', 'evenements', 'reglages_publics', 'mises_en_avant', 'annonces'];
async function api(chemin, opts = {}) {
  const r = await fetch(SUPA_URL + chemin, { ...opts, headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  let corps = null; try { corps = await r.json(); } catch { }
  return { status: r.status, corps };
}
const HORS_LIGNE = !!process.env.HORS_LIGNE;
if (HORS_LIGNE) note('Données', 'base réelle', true, 'non testée (mode hors ligne)');
else if (SUPA_URL && SUPA_KEY) {
  for (const t of TABLES_PUBLIQUES) {
    try { const r = await api(`/rest/v1/${t}?select=*&limit=1`); note('Données', t, r.status === 200, r.status === 200 ? '' : `réponse ${r.status} ${JSON.stringify(r.corps).slice(0, 120)}`); }
    catch (e) { note('Données', t, false, e.message); }
  }
  try {
    const f = await api('/rest/v1/fetes?select=edition&actif=eq.true&limit=1');
    if (f.corps && f.corps[0]) {
      const r = await api('/rest/v1/rpc/fete_ma_reponse', { method: 'POST', body: JSON.stringify({ p_edition: f.corps[0].edition, p_jeton: '00000000-0000-4000-8000-000000000000' }) });
      note('Données', 'réponse d\'une famille à la fête', r.status === 200, r.status === 200 ? '' : `réponse ${r.status}`);
    }
  } catch (e) { note('Données', 'réponse d\'une famille à la fête', false, e.message); }
} else note('Données', 'clés de la base', false, 'introuvables dans app.js');

// ---------- Petit serveur local qui sert le site tel qu'il sera en ligne ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const serveur = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = join(RACINE, p);
  if (!f.startsWith(RACINE)) { res.writeHead(403); return res.end(); }
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404); return res.end('introuvable'); }
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((ok) => serveur.listen(PORT, ok));

const navigateur = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
const MOTS_ALERTE = ['Impossible de charger', 'n\'est plus en ligne', 'Erreur inattendue'];

async function verifierPage(page, zone, nom, attendu) {
  const erreurs = [];
  const surErreur = (e) => erreurs.push(String(e.message || e));
  const surConsole = (m) => { if (m.type() === 'error' && /TypeError|ReferenceError|SyntaxError|is not defined|is not a function/.test(m.text())) erreurs.push(m.text()); };
  page.on('pageerror', surErreur); page.on('console', surConsole);
  try {
    await page.goto(attendu.url, { waitUntil: 'load' });
    await page.waitForTimeout(attendu.attente || 3500);
    const etat = await page.evaluate((mots) => {
      const main = document.querySelector('main') || document.body;
      const texte = (main.innerText || '').trim();
      return { longueur: texte.length, alerte: mots.find((m) => texte.includes(m)) || null, skel: !!document.querySelector('main .skel') && texte.length < 40 };
    }, MOTS_ALERTE);
    const pbs = [];
    if (erreurs.length) pbs.push('erreur : ' + erreurs[0].slice(0, 160));
    if (etat.longueur < (attendu.min || 40)) pbs.push('page vide');
    if (etat.skel) pbs.push('chargement bloqué');
    if (etat.alerte) pbs.push(`message « ${etat.alerte} »`);
    if (attendu.contient) {
      const ok = await page.evaluate((t) => (document.body.innerText || '').includes(t), attendu.contient);
      if (!ok) pbs.push(`« ${attendu.contient} » absent`);
    }
    note(zone, nom, !pbs.length, pbs.join(' · '));
  } catch (e) { note(zone, nom, false, e.message.slice(0, 160)); }
  page.off('pageerror', surErreur); page.off('console', surConsole);
}

const faux = readFileSync(join(RACINE, '.github/tests/faux-supabase.js'), 'utf8');
const MOCK = {
  tables: {
    responsabilites: [{ role: 'direction', groupe_id: null }],
    fetes: [{ edition: 'noel-2026', titre: 'Fête de Noël', debut: '2026-12-19T13:00:00Z', fin: '2026-12-19T15:00:00Z', actif: true, inscription_ouverte: true, tombola_ouverte: true, prix_ticket: 2, carnet_nb: 5, prix_carnet: 8, tirage_publie: false }]
  }
};
const MOCK_FAMILLES = { session: null, tables: { fetes: MOCK.tables.fetes, publications: [{ id: 'p', titre: 'Actu de test', texte: 'Texte', publie_le: '2026-11-01T10:00:00Z', urgent: false }] }, rpc: { fete_ma_reponse: { participation: null, tickets: [], familles: 0 } } };
async function brancherFaux(ctx, mock) {
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (/supabase/.test(u) && /cdn|jsdelivr|unpkg/.test(u)) return route.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.__MOCK=' + JSON.stringify(mock) + ';' + faux });
    if (!u.startsWith(BASE)) return route.fulfill({ status: 404, body: '' });
    return route.continue();
  });
}

// ---------- 3. L'appli des familles, avec les vraies données (sans compte) ----------
const PAGES_FAMILLES = [
  ['accueil', { contient: 'CLOCA' }], ['agenda'], ['arena'], ['club/actus'], ['club/evenements'], ['club/annonces'], ['club/infos'],
  ['inscriptions'], ['double'], ['cordage'], ['aide', { contient: 'guide' }], ['profil'], ['noel']
];
for (const [ecran, taille] of [['téléphone', { width: 390, height: 844 }], ['ordinateur', { width: 1280, height: 900 }]]) {
  const ctx = await navigateur.newContext({ viewport: taille, serviceWorkers: 'block' });
  await ctx.addInitScript(() => { try { localStorage.setItem('cloca-guide-vu', '1'); } catch (e) { } });
  if (HORS_LIGNE) await brancherFaux(ctx, MOCK_FAMILLES);
  const page = await ctx.newPage();
  for (const [route, attendu = {}] of PAGES_FAMILLES) await verifierPage(page, `Appli familles (${ecran})`, route, { ...attendu, url: `${BASE}/app/#/${route}` });
  await ctx.close();
}

// ---------- 4. L'espace gestion, comme la direction, avec de fausses données ----------
const adminJs = readFileSync(join(RACINE, 'app/gestion/admin.js'), 'utf8');
const blocModules = (adminJs.match(/var MODULES = \[([\s\S]*?)\n\];/) || [])[1] || '';
const modules = [...blocModules.matchAll(/^\s*\['([a-z]+)', '((?:[^'\\]|\\.)*)', \[/gm)].map((m) => [m[1], m[2].replace(/\\'/g, '\'')]);
const sousPages = [['fetes/tombola', 'Tombola'], ['fetes/stage', 'Stages'], ['fetes/noel-2026', 'Fête de Noël']];
if (!modules.length) note('Gestion', 'liste des écrans', false, 'impossible de lire MODULES dans admin.js');
{
  const ctx = await navigateur.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await brancherFaux(ctx, MOCK);
  const page = await ctx.newPage();
  for (const [cle, nom] of [...modules, ...sousPages]) await verifierPage(page, 'Gestion', nom, { url: `${BASE}/app/gestion/#/${cle}`, attente: 1500, min: 20 });
  await ctx.close();
}

await navigateur.close();
serveur.close();

// ---------- Bilan ----------
const ko = resultats.filter((r) => !r.ok);
const bilan = ko.length ? `❌ ${ko.length} problème${ko.length > 1 ? 's' : ''} sur ${resultats.length} vérifications` : `✅ Tout va bien : ${resultats.length} vérifications réussies`;
console.log('\n' + bilan);
if (process.env.GITHUB_STEP_SUMMARY) {
  let md = `## Robot de vérification de l'appli\n\n**${bilan}**\n\n`;
  if (ko.length) md += '| Partie | Page | Problème |\n|---|---|---|\n' + ko.map((r) => `| ${r.zone} | ${r.page} | ${r.detail.replace(/\|/g, '/')} |`).join('\n') + '\n\n';
  md += '<details><summary>Toutes les vérifications</summary>\n\n' + resultats.map((r) => `- ${r.ok ? '✅' : '❌'} ${r.zone} · ${r.page}`).join('\n') + '\n</details>\n';
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}
process.exit(ko.length ? 1 : 0);
