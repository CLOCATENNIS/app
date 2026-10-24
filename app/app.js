/* CLOCA Tennis — nouvelle appli (version de test)
   Données : base Supabase du club. Les droits sont appliqués par la base elle-même. */
(function () {
'use strict';

// ---------- Réglages ----------
var SUPA_URL = 'https://ccvfdsriogqerdcopuuv.supabase.co';
var SUPA_KEY = 'sb_publishable_01H1gmGMH3t4XLqD1EeTeg_ErdW1VvM';
var ADOC_URL = 'https://tenup.fft.fr/club/57780019/reservations';
var INSTAGRAM_URL = 'https://www.instagram.com/cloc.acheres.tennis?cplk=Mnd4OTkwdWFjdGZz';
var FACEBOOK_URL = 'https://www.facebook.com/ClocaTennis/';
var WA_CLUB = '33662488087';
var LOGO = 'logo.png';
var NIVEAUX = ['Blanc', 'Violet', 'Rouge', 'Orange', 'Vert', 'Jaune'];
var NIV = {
  Blanc: { bg: '#e4e8eb', fg: '#2b3943' }, Violet: { bg: '#7b4fa0', fg: '#fff' }, Rouge: { bg: '#c62f2f', fg: '#fff' },
  Orange: { bg: '#c95a12', fg: '#fff' }, Vert: { bg: '#2a7d4f', fg: '#fff' }, Jaune: { bg: '#f2cf3a', fg: '#3a2f00' }
};
var FAMILLE = ['#7b4fa0', '#c62f2f', '#1f5a85', '#2a7d4f', '#c95a12', '#b4532a'];

var sb = window.supabase ? window.supabase.createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: true, detectSessionInUrl: true, flowType: 'implicit' }
}) : null;

// ---------- État ----------
var S = {
  user: null, compte: null, pers: [], roles: [], groupesDe: {}, couleur: {},
  isDir: false, isStaff: false, gere: [], sel: 'all',
  pubs: null, evts: null, classement: null, formats: null,
  clubTab: 'actus', arenaTab: 'classement', arenaFiltre: 'Général', progNiv: '', gesTab: 'saisir',
  week: 0, loginStep: 1, loginEmail: ''
};

// ---------- Outils ----------
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function $(id) { return document.getElementById(id); }
function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }
function toast(t) { var d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2600); }
function fmtJour(d) { var s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); return s.charAt(0).toUpperCase() + s.slice(1); }
function fmtCourt(d) { return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); }
function fmtH(d) { return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h'); }
function isoJour(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function debutJour(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function lundi(d) { var x = debutJour(d); var j = (x.getDay() + 6) % 7; x.setDate(x.getDate() - j); return x; }
function niveauBadge(n) { var c = NIV[n] || { bg: '#667068', fg: '#fff' }; return '<span class="badge" style="background:' + c.bg + ';color:' + c.fg + '">' + esc(n) + '</span>'; }
function groupeBadge(g) {
  if (!g) return '';
  var n = String(g.nom || '').replace("CLOC'ARENA ", '');
  if (NIV[n]) return niveauBadge(n);
  return '<span class="badge" style="background:' + esc(g.couleur || '#1f5a85') + ';color:#fff">' + esc(n) + '</span>';
}
function initiale(p) { return p.prenom + ' ' + String(p.nom || '').charAt(0) + '.'; }
function go(h) { if (location.hash === h) render(); else location.hash = h; }
window.CT = { go: go };

var IC = {
  home: '<path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10z"/>',
  cal: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  club: '<path d="M3 11l18-8-6 18-3-8-9-2z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  check: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  back: '<path d="M15 18l-6-6 6-6"/>', next: '<path d="M9 18l6-6-6-6"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5h.01"/>',
  dl: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  racket: '<ellipse cx="14" cy="9" rx="6" ry="7" transform="rotate(35 14 9)"/><path d="M9.5 13.5L3 20M11 6l6 6M9 9l6 6M12 4l4 8"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M15 20a4.5 4.5 0 0 1 6-4.2"/>'
};
function ic(n, size, color) {
  return '<svg width="' + (size || 22) + '" height="' + (size || 22) + '" viewBox="0 0 24 24" fill="none" stroke="' + (color || 'currentColor') +
    '" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>';
}

// ---------- Données ----------
function q(p) { return p.then(function (r) { if (r.error) throw r.error; return r.data; }); }

function chargerPublic() {
  if (!sb) return Promise.resolve();
  var depuis = new Date(); depuis.setDate(depuis.getDate() - 60);
  return Promise.all([
    q(sb.from('publications').select('*').order('epingle', { ascending: false }).order('publie_le', { ascending: false }).limit(20)).catch(function () { return []; }),
    q(sb.from('evenements').select('*, groupes!evenements_groupe_id_fkey(nom,couleur), evenement_groupes(groupe_id, groupes(nom,couleur))').gte('debut', depuis.toISOString()).order('debut')).catch(function () { return []; })
  ]).then(function (r) { S.pubs = r[0]; S.evts = r[1]; });
}

function chargerUtilisateur() {
  S.compte = null; S.pers = []; S.roles = []; S.groupesDe = {}; S.couleur = {}; S.isDir = false; S.isStaff = false; S.gere = [];
  if (!S.user) return Promise.resolve();
  return Promise.all([
    q(sb.from('comptes').select('*').eq('user_id', S.user.id).maybeSingle()),
    q(sb.from('responsabilites').select('role, groupe_id').eq('user_id', S.user.id))
  ]).then(function (r) {
    S.compte = r[0]; S.roles = r[1] || [];
    S.isDir = S.roles.some(function (x) { return x.role === 'direction' && !x.groupe_id; });
    S.isStaff = S.roles.some(function (x) { return ['direction', 'bureau', 'accueil'].indexOf(x.role) >= 0 && !x.groupe_id; });
    S.gere = S.roles.filter(function (x) { return x.groupe_id; }).map(function (x) { return x.groupe_id; });
    if (!S.compte || (!S.compte.foyer_id && !S.compte.personne_id)) return;
    var f = sb.from('personnes').select('id, prenom, nom, profil, niveau_arena, foyer_id, groupe_membres(groupe_id, groupes(nom,couleur,type))').order('prenom');
    f = S.compte.foyer_id ? f.or('foyer_id.eq.' + S.compte.foyer_id + (S.compte.personne_id ? ',id.eq.' + S.compte.personne_id : '')) : f.eq('id', S.compte.personne_id);
    return q(f).then(function (pers) {
      S.pers = pers || [];
      S.pers.forEach(function (p, i) {
        S.couleur[p.id] = FAMILLE[i % FAMILLE.length];
        (p.groupe_membres || []).forEach(function (g) { (S.groupesDe[g.groupe_id] = S.groupesDe[g.groupe_id] || []).push(p); });
      });
    });
  });
}

function evGroupes(ev) {
  var ids = [], gs = [];
  if (ev.groupe_id) { ids.push(ev.groupe_id); if (ev.groupes) gs.push(ev.groupes); }
  (ev.evenement_groupes || []).forEach(function (x) { if (ids.indexOf(x.groupe_id) < 0) { ids.push(x.groupe_id); if (x.groupes) gs.push(x.groupes); } });
  return { ids: ids, gs: gs };
}
function concernes(ev, insc) {
  var qui = [];
  evGroupes(ev).ids.forEach(function (g) { (S.groupesDe[g] || []).forEach(function (p) { if (qui.indexOf(p) < 0) qui.push(p); }); });
  (insc || []).forEach(function (i) {
    if (i.evenement_id !== ev.id || i.statut === 'annule') return;
    var p = S.pers.filter(function (x) { return x.id === i.personne_id; })[0];
    if (p && qui.indexOf(p) < 0) qui.push(p);
  });
  if (S.sel !== 'all') qui = qui.filter(function (p) { return p.id === S.sel; });
  return qui;
}

var AG = null; // cache agenda : {creneaux, insc}
function chargerAgenda() {
  if (!S.user || !S.pers.length) return Promise.resolve(AG = { creneaux: [], insc: [] });
  return Promise.all([
    q(sb.from('creneaux').select('*, groupes(nom,couleur)')).catch(function () { return []; }),
    q(sb.from('inscriptions').select('evenement_id, personne_id, statut, paye')).catch(function () { return []; })
  ]).then(function (r) { AG = { creneaux: r[0], insc: r[1] }; return AG; });
}

function mesItems(du, au) {
  var items = [];
  (S.evts || []).forEach(function (ev) {
    var d = new Date(ev.debut); if (d < du || d >= au) return;
    var qui = concernes(ev, AG && AG.insc);
    if (qui.length) items.push({ d: d, f: ev.fin ? new Date(ev.fin) : null, titre: ev.titre, lieu: ev.lieu, enc: ev.encadrant, statut: ev.statut, objectif: ev.objectif, qui: qui, gs: evGroupes(ev).gs, id: ev.id, type: ev.type });
  });
  (AG ? AG.creneaux : []).forEach(function (cr) {
    for (var j = new Date(du); j < au; j.setDate(j.getDate() + 1)) {
      var js = j.getDay() === 0 ? 7 : j.getDay(), iso = isoJour(j);
      if (cr.jour_semaine !== js || (cr.du && iso < cr.du) || (cr.au && iso > cr.au)) continue;
      var qui = (S.groupesDe[cr.groupe_id] || []).filter(function (p) { return S.sel === 'all' || p.id === S.sel; });
      if (!qui.length) continue;
      var a = cr.heure_debut.split(':'), b = cr.heure_fin.split(':');
      var d = new Date(j); d.setHours(+a[0], +a[1], 0, 0); var f = new Date(j); f.setHours(+b[0], +b[1], 0, 0);
      items.push({ d: d, f: f, titre: cr.groupes ? String(cr.groupes.nom).replace(/^.*?·\s*/, '').replace(/\s*\([^)]*\)\s*$/, '') : 'Cours', lieu: cr.lieu, enc: cr.encadrant, statut: 'prevu', qui: qui, gs: cr.groupes ? [cr.groupes] : [] });
    }
  });
  items.sort(function (x, y) { return x.d - y.d; });
  return items;
}

// ---------- Mise en page commune ----------
function tabs(actif) {
  var showArena = !S.user || !S.pers.length || S.pers.some(function (p) { return p.niveau_arena; }) || S.isStaff;
  var t = [['accueil', 'home', 'Accueil'], ['agenda', 'cal', 'Agenda']];
  if (showArena) t.push(['arena', 'trophy', 'Arena']);
  t.push(['club', 'club', 'Club']);
  t.push(S.isStaff || S.gere.length ? ['gestion', 'tool', 'Gestion'] : ['profil', 'user', 'Profil']);
  $('tabs-in').style.setProperty('--n', t.length);
  $('tabs-in').innerHTML = t.map(function (x) {
    return '<a href="#/' + x[0] + '" class="' + (actif === x[0] ? 'on' : '') + '"' + (actif === x[0] ? ' aria-current="page"' : '') + '>' + ic(x[1], 24) + x[2] + '</a>';
  }).join('');
}
function backLink(h, label, light) { return '<a class="back" href="' + h + '" style="color:' + (light ? '#fff' : 'var(--tx)') + '">' + ic('back', 20) + esc(label) + '</a>'; }
function selFamille(onHero) {
  if (S.pers.length < 2) return '';
  return '<div class="chips" style="margin-top:12px">' +
    '<button class="chip ' + (S.sel === 'all' ? 'on' : '') + '" data-sel="all">Tous</button>' +
    S.pers.map(function (p) { return '<button class="chip ' + (S.sel === p.id ? 'on' : '') + '" data-sel="' + p.id + '"><span class="dot" style="background:' + S.couleur[p.id] + '"></span>' + esc(p.prenom) + '</button>'; }).join('') + '</div>';
}
function lierSel() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-sel]'), function (b) { b.onclick = function () { S.sel = b.dataset.sel; render(); }; });
}
function nomAffiche() {
  if (!S.user) return '';
  var moi = S.pers.filter(function (p) { return S.compte && p.id === S.compte.personne_id; })[0];
  if (moi) return moi.prenom;
  if (S.pers.length) return 'Famille ' + S.pers[0].nom.charAt(0) + S.pers[0].nom.slice(1).toLowerCase();
  return S.isDir ? 'Direction sportive' : 'Bienvenue';
}

// ---------- Accueil ----------
function pageAccueil() {
  var urgent = (S.pubs || []).filter(function (p) { return p.urgent; })[0];
  var h = '<div class="hero"><div class="wrap"><div class="hero-row"><img class="logo" src="' + LOGO + '" alt="Logo CLOCA Tennis">' +
    '<div style="flex:1"><div class="hello">' + (S.user ? 'Bonjour' : 'Bienvenue au club') + '</div><div class="hello-name">' + esc(S.user ? nomAffiche() : 'CLOCA Tennis') + '</div></div></div>' +
    selFamille(true) + '</div></div><main>';
  h += '<div id="presence"></div>';
  if (urgent) h += '<div class="alert urgent">' + ic('alert', 20, '#fff') + '<div class="stack"><b>' + esc(urgent.titre) + '</b>' + (urgent.texte ? '<span class="small" style="color:#fde3dc">' + esc(urgent.texte) + '</span>' : '') + '</div></div>';

  // Prochain rendez-vous
  var now = new Date(), fin = new Date(); fin.setDate(fin.getDate() + 45);
  var prochain = null;
  if (S.user && S.pers.length) prochain = mesItems(new Date(now.getTime() - 3600e3), fin).filter(function (i) { return (i.f || i.d) > now; })[0];
  else prochain = (S.evts || []).filter(function (e) { return e.public && new Date(e.fin || e.debut) > now && e.statut !== 'annule'; }).map(function (e) { return { d: new Date(e.debut), f: e.fin ? new Date(e.fin) : null, titre: e.titre, lieu: e.lieu, enc: e.encadrant, gs: evGroupes(e).gs, qui: [], id: e.id }; })[0];
  if (prochain) {
    h += '<section class="card stack" style="gap:12px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="eyebrow">Prochain rendez-vous</span><span>' + prochain.gs.map(groupeBadge).join(' ') + '</span></div>' +
      '<div class="rdv"><div class="datebox"><span>' + esc(prochain.d.toLocaleDateString('fr-FR', { weekday: 'short' })) + '</span><b>' + prochain.d.getDate() + '</b></div>' +
      '<div class="stack"><span class="disp" style="font-size:22px;line-height:1.1">' + esc(prochain.titre) + '</span>' +
      '<span class="mut small">' + fmtH(prochain.d) + (prochain.f ? ' – ' + fmtH(prochain.f) : '') + (prochain.lieu ? ' · ' + esc(prochain.lieu) : '') + '</span>' +
      (prochain.enc || prochain.qui.length ? '<span class="mut small">' + (prochain.enc ? 'Avec ' + esc(prochain.enc) : '') + (prochain.enc && prochain.qui.length ? ' · ' : '') + prochain.qui.map(function (p) { return '<b style="color:' + S.couleur[p.id] + '">' + esc(p.prenom) + '</b>'; }).join(', ') + '</span>' : '') +
      '</div></div><a class="btn ghost" href="#/' + (S.user ? 'agenda' : 'arena') + '">' + (S.user ? 'Voir tout mon agenda' : 'Voir la programmation') + '</a></section>';
  }

  // Raccourcis
  var ouverts = (S.evts || []).filter(function (e) { return e.inscription_ouverte && e.statut !== 'annule' && new Date(e.debut) > now; }).length;
  var arenaTxt = 'Classements et programme';
  if (S.user && S.pers.length && S.classement) {
    var rangs = S.pers.filter(function (p) { return p.niveau_arena; }).map(function (p) {
      var i = S.classement.map(function (c) { return c.personne_id; }).indexOf(p.id); return i >= 0 ? esc(p.prenom) + ' ' + (i + 1) + (i ? 'e' : 'er') : null;
    }).filter(Boolean);
    if (rangs.length) arenaTxt = rangs.join(' · ');
  }
  h += '<div class="grid2">' +
    '<a class="tile" href="#/arena">' + ic('trophy', 24) + '<b>CLOC\'ARENA</b><span class="mut small">' + arenaTxt + '</span></a>' +
    '<a class="tile" href="#/club/evenements">' + ic('check', 24) + '<b>Inscriptions</b><span class="mut small">' + (ouverts ? ouverts + ' ouverte' + (ouverts > 1 ? 's' : '') : 'Stages et événements') + '</span></a>' +
    '<a class="tile" href="' + ADOC_URL + '" target="_blank" rel="noopener">' + ic('cal', 24) + '<b>Réserver un court</b><span class="mut small">Sur Ten\'Up</span></a>' +
    '<a class="tile" href="#/cordage">' + ic('racket', 24) + '<b>Cordage</b><span class="mut small">' + resumeCordage() + '</span></a></div>';

  if (!S.user) h += '<section class="card stack" style="gap:10px"><b>Ton espace personnel</b><span class="mut small">Connecte-toi avec l\'adresse mail donnée au club pour voir ton agenda, tes inscriptions et la fiche de tes enfants.</span><a class="btn" href="#/profil">Me connecter</a></section>';
  else if (!S.pers.length && !S.isStaff) h += '<section class="card stack"><b>Adresse pas encore reconnue</b><span class="mut small">Tu es connecté avec ' + esc(S.user.email) + ', mais cette adresse n\'est pas encore rattachée à un adhérent. Contacte le club pour qu\'il l\'ajoute.</span></section>';

  var actu = (S.pubs || []).filter(function (p) { return !p.urgent; })[0];
  if (actu) h += '<a class="card stack" href="#/club" style="text-decoration:none;color:var(--tx)"><span class="eyebrow">Dernière actu</span><b>' + esc(actu.titre) + '</b>' + (actu.texte ? '<span class="mut small">' + esc(actu.texte) + '</span>' : '') + '</a>';
  h += '<div class="partners"><div class="eyebrow" style="margin-bottom:6px">Nos partenaires</div><a href="https://ecosport-tennis.fr/" target="_blank" rel="noopener">Ecosport</a><a href="https://www.tecnifibre.com/?country=FR" target="_blank" rel="noopener">Tecnifibre</a></div></main>';
  return h;
}

// ---------- Agenda ----------
function pageAgenda() {
  var h = '<div class="pagehead wrap"><h1>Mon agenda</h1></div><main>';
  if (!S.user) return h + '<section class="card stack" style="gap:10px"><b>Connecte-toi pour voir ton agenda</b><span class="mut small">Tes cours, tes séances CLOC\'ARENA et tes événements, au même endroit.</span><a class="btn" href="#/profil">Me connecter</a></section></main>';
  if (!S.pers.length) return h + '<section class="card empty">Ton adresse n\'est rattachée à aucun adhérent pour l\'instant.</section></main>';
  var l = lundi(new Date()); l.setDate(l.getDate() + 7 * S.week);
  var f = new Date(l); f.setDate(f.getDate() + 7);
  var items = mesItems(l, f);
  h += (S.pers.length > 1 ? selFamille() : '') +
    '<div style="display:flex;justify-content:space-between;align-items:center">' +
    '<button class="back" aria-label="Semaine précédente" id="wk-prev" style="width:44px;justify-content:center">' + ic('back', 20) + '</button>' +
    '<b>' + (S.week === 0 ? 'Cette semaine' : S.week === 1 ? 'Semaine prochaine' : 'Semaine du ' + fmtCourt(l)) + '</b>' +
    '<button class="back" aria-label="Semaine suivante" id="wk-next" style="width:44px;justify-content:center">' + ic('next', 20) + '</button></div>';
  if (!items.length) h += '<section class="card empty">Rien de prévu cette semaine.</section>';
  var jour = '';
  items.forEach(function (it, k) {
    var jl = fmtJour(it.d);
    if (jl !== jour) { jour = jl; h += '<div class="dayhead">' + esc(jl) + '</div>'; }
    var c = it.qui.length === 1 ? S.couleur[it.qui[0].id] : (it.gs[0] && NIV[String(it.gs[0].nom).replace("CLOC'ARENA ", '')] ? NIV[String(it.gs[0].nom).replace("CLOC'ARENA ", '')].bg : '#1f5a85');
    var etat = it.statut === 'annule' ? '<span class="badge" style="background:var(--ko);color:#fff">Annulé</span>' : it.statut === 'deplace' ? '<span class="badge" style="background:var(--ac);color:#fff">Déplacé</span>' : '';
    var det = [fmtH(it.d) + (it.f ? ' – ' + fmtH(it.f) : '')]; if (it.lieu) det.push(esc(it.lieu)); if (it.enc) det.push('avec ' + esc(it.enc));
    h += '<' + (it.id ? 'a href="#/evenement/' + it.id + '"' : 'div') + ' class="ev' + (it.statut === 'annule' ? ' off' : '') + '"><span class="bar" style="background:' + c + '"></span><div class="stack" style="flex:1;min-width:0">' +
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b class="t">' + esc(it.titre) + '</b>' + etat + '</div>' +
      '<span class="mut small">' + det.join(' · ') + '</span>' +
      (it.objectif ? '<span class="mut small">' + esc(it.objectif) + '</span>' : '') +
      (S.pers.length > 1 ? '<span class="small">' + it.qui.map(function (p) { return '<b style="color:' + S.couleur[p.id] + '">' + esc(p.prenom) + '</b>'; }).join(', ') + '</span>' : '') +
      '</div></' + (it.id ? 'a' : 'div') + '>';
  });
  h += blocSynchro() + '</main>';
  setTimeout(function () {
    $('wk-prev').onclick = function () { S.week--; render(); };
    $('wk-next').onclick = function () { S.week++; render(); };
    if ($('ics-semaine')) $('ics-semaine').onclick = function () { telechargerIcs(items, 'agenda-cloca-tennis.ics'); };
    lierSynchro();
    lierSel();
  });
  return h;
}

// Abonnement : l'agenda du club se met à jour tout seul dans le téléphone
function lienAgenda() { return S.compte && S.compte.calendrier_token ? SUPA_URL + '/functions/v1/agenda?t=' + S.compte.calendrier_token : ''; }
function blocSynchro() {
  var l = lienAgenda(); if (!l) return '';
  var web = l.replace(/^https:/, 'webcal:'), ouvert = S.synchroOuverte;
  return '<section class="card stack" style="gap:10px"><b>Mon agenda dans mon téléphone</b><span class="mut small">Ajoute-le une seule fois : les séances, stages et annulations s\'y mettent ensuite à jour tout seuls, pour toute la famille.</span>' +
    '<div class="grid2"><a class="btn navy" href="' + esc(web) + '">' + ic('cal', 18, '#fff') + 'iPhone / Mac</a><a class="btn navy" target="_blank" rel="noopener" href="https://calendar.google.com/calendar/r?cid=' + encodeURIComponent(web) + '">Google Agenda</a></div>' +
    '<button class="btn line" id="sync-plus">' + (ouvert ? 'Masquer' : 'Android, Outlook et autres') + '</button>' +
    (ouvert ? '<span class="small"><b>Android et Samsung Calendar</b> : ajoute-le avec le bouton Google Agenda (depuis un ordinateur si le téléphone ne l\'ouvre pas). Il apparaît ensuite dans l\'agenda du téléphone, y compris Samsung Calendar : vérifie que « CLOCA Tennis » est coché dans ses calendriers. <b>Outlook</b> : Ajouter un calendrier → À partir d\'Internet, puis colle le lien.</span>' +
      '<input class="f" readonly value="' + esc(l) + '" id="sync-lien" aria-label="Lien de l\'agenda"><div class="grid2"><button class="btn ghost" id="sync-copier">Copier le lien</button><button class="btn ghost" id="sync-reset">Changer de lien</button></div>' +
      '<span class="mut xs">Ce lien est personnel : ne le partage pas. « Changer de lien » désactive l\'ancien (il faudra ré-ajouter l\'agenda).</span>' : '') + '</section>';
}
function lierSynchro() {
  if ($('sync-plus')) $('sync-plus').onclick = function () { S.synchroOuverte = !S.synchroOuverte; render(); };
  if ($('sync-copier')) $('sync-copier').onclick = function () {
    var i = $('sync-lien'); i.select();
    (navigator.clipboard ? navigator.clipboard.writeText(i.value) : Promise.reject()).then(function () { toast('Lien copié'); }).catch(function () { document.execCommand && document.execCommand('copy'); toast('Lien copié'); });
  };
  if ($('sync-reset')) $('sync-reset').onclick = function () {
    if (!confirm('L\'ancien lien ne marchera plus. Il faudra ré-ajouter l\'agenda sur tes appareils. Continuer ?')) return;
    q(sb.rpc('calendrier_nouveau_lien')).then(function (t) { S.compte.calendrier_token = t; toast('Nouveau lien créé'); render(); }).catch(function () { toast('Action impossible'); });
  };
}
function icsDate(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
function telechargerIcs(items, nom) {
  var l = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CLOCA Tennis//Appli//FR', 'CALSCALE:GREGORIAN'];
  items.forEach(function (it, i) {
    if (it.statut === 'annule') return;
    l.push('BEGIN:VEVENT', 'UID:' + (it.id || 'c' + i) + '-' + icsDate(it.d) + '@clocatennis.fr', 'DTSTAMP:' + icsDate(new Date()),
      'DTSTART:' + icsDate(it.d), 'DTEND:' + icsDate(it.f || new Date(it.d.getTime() + 3600e3)),
      'SUMMARY:' + String(it.titre).replace(/[,;]/g, ' ') + (it.qui && it.qui.length ? ' (' + it.qui.map(function (p) { return p.prenom; }).join(' ') + ')' : ''),
      'LOCATION:' + String(it.lieu || 'CLOCA Tennis, 81 rue de Saint-Germain, Achères').replace(/[,;]/g, ' '), 'END:VEVENT');
  });
  l.push('END:VCALENDAR');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([l.join('\r\n')], { type: 'text/calendar' }));
  a.download = nom; document.body.appendChild(a); a.click(); a.remove();
}

// ---------- CLOC'ARENA ----------
function pageArena() {
  var h = '<div class="darkhead"><div class="wrap"><div class="kicker">LE TOURNOI DES JEUNES · SAISON 2026-2027</div><h1>CLOC\'ARENA</h1>' +
    '<div class="seg" style="margin-top:14px">' + [['classement', 'Classement'], ['programme', 'Programme'], ['resultats', 'Résultats']].map(function (t) {
      return '<button data-atab="' + t[0] + '" class="' + (S.arenaTab === t[0] ? 'on' : '') + '">' + t[1] + '</button>';
    }).join('') + '</div></div></div><main id="arena-main"><div class="skel"></div></main>';
  setTimeout(function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-atab]'), function (b) { b.onclick = function () { S.arenaTab = b.dataset.atab; render(); }; });
    if (S.arenaTab === 'classement') arenaClassement();
    else if (S.arenaTab === 'programme') arenaProgramme();
    else arenaResultats();
  });
  return h;
}
function chargerClassement() {
  if (S.classement) return Promise.resolve(S.classement);
  return q(sb.rpc('arena_classement')).then(function (d) { S.classement = d || []; return S.classement; });
}
function arenaClassement() {
  var box = $('arena-main');
  chargerClassement().then(function (all) {
    var filtres = ['Général', 'Filles', 'Garçons'].concat(NIVEAUX);
    var f = S.arenaFiltre;
    var l = all.filter(function (c) { return f === 'Général' || (f === 'Filles' && c.sexe === 'F') || (f === 'Garçons' && c.sexe === 'M') || c.niveau === f; });
    var mes = S.pers.map(function (p) { return p.id; });
    var lien = function (c, inner) { return (S.isStaff || mes.indexOf(c.personne_id) >= 0) ? '<a href="#/fiche/' + c.personne_id + '">' + inner + '</a>' : inner; };
    var h = '<div class="chips">' + filtres.map(function (x) {
      var st = NIV[x] && f === x ? ' style="background:' + NIV[x].bg + ';border-color:' + NIV[x].bg + ';color:' + NIV[x].fg + '"' : '';
      return '<button class="chip ' + (f === x ? 'on' : '') + '" data-filtre="' + x + '"' + st + '>' + x + '</button>';
    }).join('') + '</div>';
    if (!l.length) { box.innerHTML = h + '<section class="card empty">Pas encore de joueur classé ici.</section>'; lierFiltres(); return; }
    var p = l.slice(0, 3), ordre = [1, 0, 2], hauteurs = [96, 70, 54], fonds = ['var(--ac)', '#dfe6ec', '#ede3d2'], txt = ['#fff', '#102f4a', '#102f4a'];
    h += '<section class="card podium">' + ordre.map(function (i) {
      var c = p[i]; if (!c) return '<div></div>';
      return '<div class="p">' + lien(c, '<b>' + esc(c.joueur) + '</b>') + '<span class="mut small">' + (+c.points) + ' pts</span><div class="blk" style="height:' + hauteurs[i] + 'px;background:' + fonds[i] + ';color:' + txt[i] + '">' + (i + 1) + '</div></div>';
    }).join('') + '</section>';
    h += '<section class="card tight"><div class="rk h"><span>#</span><span>Joueur</span><span class="n">Part.</span><span class="n">Points</span></div>' +
      l.slice(3).map(function (c, i) {
        var me = mes.indexOf(c.personne_id) >= 0;
        return '<div class="rk' + (me ? ' me' : '') + '"><span>' + (i + 4) + '</span><span>' + lien(c, esc(c.joueur) + (me ? ' <span class="xs" style="color:#6f43a0">· ' + (S.compte && S.compte.personne_id === c.personne_id ? 'toi' : 'ta famille') + '</span>' : '')) + '</span><span class="n mut">' + c.participations + '</span><span class="n"><b>' + (+c.points) + '</b></span></div>';
      }).join('') + '</section><p class="mut xs" style="text-align:center;margin:0 0 6px">Classement par points, puis nombre de participations.</p>';
    box.innerHTML = h; lierFiltres();
  }).catch(function () { box.innerHTML = '<section class="card empty">Impossible de charger le classement pour le moment.</section>'; });
}
function lierFiltres() { Array.prototype.forEach.call(document.querySelectorAll('[data-filtre]'), function (b) { b.onclick = function () { S.arenaFiltre = b.dataset.filtre; arenaClassement(); }; }); }

function arenaProgramme() {
  var box = $('arena-main'), now = debutJour(new Date());
  var l = (S.evts || []).filter(function (e) { return e.type === 'seance' && new Date(e.debut) >= now; });
  var mesNiv = S.pers.map(function (p) { return p.niveau_arena; }).filter(Boolean);
  var f = S.progNiv;
  if (f) l = l.filter(function (e) { return evGroupes(e).gs.some(function (g) { return String(g.nom).indexOf(f) >= 0; }); });
  var h = '<div class="chips"><button class="chip ' + (!f ? 'on' : '') + '" data-pn="">Tous</button>' + NIVEAUX.concat(['Miss Cup']).map(function (n) {
    return '<button class="chip ' + (f === n ? 'on' : '') + '" data-pn="' + n + '">' + n + (mesNiv.indexOf(n) >= 0 ? ' ★' : '') + '</button>';
  }).join('') + '</div>';
  if (!l.length) h += '<section class="card empty">Pas de séance programmée pour l\'instant.</section>';
  var jour = '';
  l.forEach(function (e) {
    var d = new Date(e.debut), jl = fmtJour(d);
    if (jl !== jour) { jour = jl; h += '<div class="dayhead">' + esc(jl) + '</div>'; }
    h += '<div class="ev' + (e.statut === 'annule' ? ' off' : '') + '"><div class="stack" style="flex:1">' +
      '<div style="display:flex;justify-content:space-between;gap:8px"><b class="t">' + esc(e.titre) + '</b><b class="small">' + fmtH(d) + '</b></div>' +
      '<span class="mut small">' + [e.fin ? 'jusqu\'à ' + fmtH(new Date(e.fin)) : '', e.lieu].filter(Boolean).map(esc).join(' · ') + '</span>' +
      (e.objectif ? '<span class="mut small">' + esc(e.objectif) + '</span>' : '') +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">' + evGroupes(e).gs.map(groupeBadge).join('') + (e.statut === 'annule' ? '<span class="badge" style="background:var(--ko);color:#fff">Annulé</span>' : '') + '</div></div></div>';
  });
  box.innerHTML = h;
  Array.prototype.forEach.call(document.querySelectorAll('[data-pn]'), function (b) { b.onclick = function () { S.progNiv = b.dataset.pn; arenaProgramme(); }; });
}

function scorePour(score, equipe) {
  if (equipe !== 2 || !score) return score || '';
  return String(score).split(/\s+/).map(function (s) { var x = s.split('-'); return x.length === 2 ? x[1] + '-' + x[0] : s; }).join(' ');
}
function arenaResultats() {
  var box = $('arena-main');
  q(sb.rpc('arena_resultats', { nb: 80 })).then(function (l) {
    if (!l || !l.length) { box.innerHTML = '<section class="card empty">Pas encore de résultats.</section>'; return; }
    var parJour = {}, ordre = [];
    l.forEach(function (m) { if (!parJour[m.date_match]) { parJour[m.date_match] = []; ordre.push(m.date_match); } parJour[m.date_match].push(m); });
    box.innerHTML = ordre.map(function (d) {
      return '<div class="dayhead">' + esc(fmtJour(new Date(d + 'T12:00:00'))) + '</div><section class="card tight">' + parJour[d].map(function (m) {
        var g = m.vainqueur === 1 ? m.equipe1 : m.equipe2, p = m.vainqueur === 1 ? m.equipe2 : m.equipe1;
        return '<div class="row"><div class="stack"><span><b>' + esc(g) + '</b> <span class="mut">bat</span> ' + esc(p) + '</span><span class="mut xs">' + esc(m.format.charAt(0) + m.format.slice(1).toLowerCase()) + '</span></div><b>' + esc(scorePour(m.score, m.vainqueur)) + '</b></div>';
      }).join('') + '</section>';
    }).join('');
  }).catch(function () { box.innerHTML = '<section class="card empty">Impossible de charger les résultats.</section>'; });
}

// ---------- Fiche joueur ----------
function pageFiche(id) {
  setTimeout(function () {
    q(sb.rpc('arena_fiche', { p: id })).then(function (f) {
      var c = NIV[f.niveau] || { bg: '#1f5a85', fg: '#fff' };
      var v = f.matchs.filter(function (m) { return m.gagne; }).length;
      var h = '<div class="darkhead" style="background:' + c.bg + ';color:' + c.fg + '"><div class="wrap">' + backLink('#/arena', 'Classement', c.fg === '#fff') +
        '<div class="hero-row" style="margin-top:6px"><div class="datebox" style="background:#fff;color:' + c.bg + ';border-radius:50%"><b style="font-size:24px">' + esc(f.prenom.charAt(0) + f.nom.charAt(0)) + '</b></div>' +
        '<div><h1 style="font-size:26px;line-height:1.1">' + esc(f.prenom + ' ' + f.nom) + '</h1><div class="small" style="opacity:.9">Niveau ' + esc(f.niveau || '—') + (f.rang ? ' · ' + f.rang + (f.rang === 1 ? 'er' : 'e') + ' au général' : '') + (f.rang_niveau ? ' · ' + f.rang_niveau + (f.rang_niveau === 1 ? 'er' : 'e') + ' en ' + esc(f.niveau) : '') + '</div></div></div></div></div><main>' +
        '<div class="grid4"><div class="stat"><b>' + (+f.points) + '</b><span class="mut xs">points</span></div><div class="stat"><b>' + f.matchs.length + '</b><span class="mut xs">matchs</span></div><div class="stat"><b>' + v + '</b><span class="mut xs">victoires</span></div><div class="stat"><b>' + f.participations + '</b><span class="mut xs">présences</span></div></div>';
      var pr = f.progression.slice(-10);
      if (pr.length > 1) {
        var max = Math.max.apply(null, pr.map(function (x) { return +x.cumul; })) || 1;
        h += '<section class="card stack" style="gap:8px"><span class="eyebrow">Progression des points</span><div style="display:flex;align-items:flex-end;gap:6px;height:80px">' + pr.map(function (x, i) {
          return '<div title="' + esc(fmtCourt(new Date(x.date + 'T12:00:00')) + ' : ' + (+x.cumul) + ' pts') + '" style="flex:1;height:' + Math.max(6, Math.round(+x.cumul / max * 100)) + '%;border-radius:6px 6px 0 0;background:' + (i === pr.length - 1 ? c.bg : 'var(--soft)') + '"></div>';
        }).join('') + '</div><span class="mut xs">Points cumulés, du ' + fmtCourt(new Date(pr[0].date + 'T12:00:00')) + ' au ' + fmtCourt(new Date(pr[pr.length - 1].date + 'T12:00:00')) + ' : ' + (+pr[pr.length - 1].cumul) + ' pts</span></section>';
      }
      h += '<section class="card tight"><div class="eyebrow" style="padding:12px 0 4px">Derniers matchs</div>' + (f.matchs.length ? f.matchs.slice(0, 12).map(function (m) {
        return '<div class="row"><div class="stack"><b class="small">' + (m.partenaires ? 'avec ' + esc(m.partenaires) + ' ' : '') + 'contre ' + esc(m.adversaires || '—') + '</b><span class="mut xs">' + esc(fmtCourt(new Date(m.date + 'T12:00:00'))) + ' · ' + esc(m.format.toLowerCase()) + (m.invite ? ' · invité' : '') + '</span></div>' +
          '<div style="display:flex;gap:8px;align-items:center"><b class="small">' + esc(scorePour(m.score, m.equipe)) + '</b><span class="badge" style="background:' + (m.gagne ? 'var(--ok)' : '#f3dcc8') + ';color:' + (m.gagne ? '#fff' : '#5d3a17') + '">' + (m.gagne ? 'Gagné' : 'Perdu') + '</span></div></div>';
      }).join('') : '<div class="empty">Pas encore de match.</div>') + '</section>' +
        '<p class="mut xs" style="display:flex;gap:6px;align-items:center;justify-content:center">' + ic('lock', 14) + 'Fiche visible seulement par la famille, les coachs et la direction sportive.</p></main>';
      $('app').innerHTML = h;
    }).catch(function () {
      $('app').innerHTML = '<div class="pagehead">' + backLink('#/arena', 'Classement') + '</div><main><section class="card empty">Cette fiche n\'est visible que par la famille du joueur, ses coachs et la direction sportive.</section></main>';
    });
  });
  return '<div style="padding:40px 16px"><div class="skel"></div></div>';
}

// ---------- Club ----------
function pageClub(sous) {
  if (sous) S.clubTab = sous;
  var h = '<div class="pagehead wrap"><h1>Vie du club</h1></div><main>' +
    '<div class="seg">' + [['actus', 'Actus'], ['evenements', 'Événements'], ['annonces', 'Annonces'], ['infos', 'Infos']].map(function (t) {
      return '<button data-ctab="' + t[0] + '" class="' + (S.clubTab === t[0] ? 'on' : '') + '">' + t[1] + '</button>';
    }).join('') + '</div><div id="club-main" style="display:flex;flex-direction:column;gap:12px"></div></main>';
  setTimeout(function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-ctab]'), function (b) { b.onclick = function () { go('#/club/' + b.dataset.ctab); }; });
    var box = $('club-main');
    if (S.clubTab === 'actus') box.innerHTML = clubActus();
    else if (S.clubTab === 'evenements') box.innerHTML = clubEvenements();
    else if (S.clubTab === 'infos') { box.innerHTML = clubInfos(); remplirPresence(); }
    else clubAnnonces(box);
  });
  return h;
}
function clubActus() {
  var l = S.pubs || [];
  if (!l.length) return '<section class="card empty">Pas d\'actu pour le moment.</section>' + suivre();
  return l.map(function (a) {
    var img = safeUrl(a.image_url), link = safeUrl(a.lien);
    return '<article class="card stack" style="gap:6px">' + (img && !/drive\.google\.com\/file/.test(img) ? '<img src="' + esc(img) + '" alt="" loading="lazy" style="width:100%;border-radius:12px" onerror="this.remove()">' : '') +
      '<span class="mut xs">' + esc(fmtJour(new Date(a.publie_le))) + '</span><b style="font-size:16px">' + esc(a.titre) + '</b>' +
      (a.texte ? '<span class="mut" style="white-space:pre-line">' + esc(a.texte) + '</span>' : '') +
      (link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener" style="font-weight:600">En savoir plus →</a>' : '') + '</article>';
  }).join('') + suivre();
}
function suivre() {
  return '<section class="card stack" style="gap:10px"><b>Suivez-nous</b><span class="mut small">Photos, moments forts et performances des joueurs.</span><div class="grid2"><a class="btn line" href="' + INSTAGRAM_URL + '" target="_blank" rel="noopener">Instagram</a><a class="btn line" href="' + FACEBOOK_URL + '" target="_blank" rel="noopener">Facebook</a></div></section>';
}
function clubEvenements() {
  var now = new Date();
  var l = (S.evts || []).filter(function (e) { return e.type !== 'seance'; });
  var avenir = l.filter(function (e) { return new Date(e.fin || e.debut) >= now; }), passes = l.filter(function (e) { return new Date(e.fin || e.debut) < now; }).reverse().slice(0, 6);
  if (!l.length) return '<section class="card empty">Pas d\'événement annoncé pour le moment.<br>Les séances CLOC\'ARENA sont dans l\'onglet Arena.</section>';
  var carte = function (e, passe) {
    var d = new Date(e.debut);
    return '<a class="ev' + (passe ? ' off' : '') + '" href="#/evenement/' + e.id + '"><div class="datebox"><span>' + esc(d.toLocaleDateString('fr-FR', { month: 'short' })) + '</span><b>' + d.getDate() + '</b></div><div class="stack" style="flex:1;min-width:0">' +
      '<b>' + esc(e.titre) + '</b><span class="mut small">' + [fmtH(d), e.lieu].filter(Boolean).map(esc).join(' · ') + '</span>' +
      (e.inscription_ouverte && !passe ? '<span><span class="badge" style="background:var(--ok);color:#fff">Inscriptions ouvertes</span></span>' : '') + '</div></a>';
  };
  return (avenir.length ? '<div class="dayhead">À venir</div>' + avenir.map(function (e) { return carte(e, false); }).join('') : '') +
    (passes.length ? '<div class="dayhead">Passés</div>' + passes.map(function (e) { return carte(e, true); }).join('') : '');
}
function clubInfos() {
  return '<section class="card stack" style="gap:6px"><span class="eyebrow">Le club</span><b style="font-size:17px">CLOCA Tennis</b><span class="mut">81 rue de Saint-Germain, 78260 Achères</span>' +
    '<a class="btn" style="margin-top:6px" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=81+Rue+de+Saint-Germain+78260+Ach%C3%A8res">' + ic('pin', 18, '#fff') + 'Itinéraire</a></section>' +
    '<div id="presence"></div><section class="card stack" style="gap:6px"><span class="eyebrow">Club house</span><b>Ouvert le mercredi et le samedi</b><span class="mut">9h30 – 12h et 14h – 16h30</span><a class="btn ghost" href="tel:+33139116947">01 39 11 69 47</a></section>' +
    '<section class="card stack" style="gap:6px"><span class="eyebrow">Coordinateur sportif</span><b>Dorian</b><a class="btn" target="_blank" rel="noopener" href="https://wa.me/' + WA_CLUB + '">WhatsApp</a>' +
    '<div class="grid2"><a class="btn line" href="tel:+' + WA_CLUB + '">Appeler</a><a class="btn line" href="sms:+' + WA_CLUB + '">SMS</a></div></section>' +
    '<section class="card stack" style="gap:6px"><span class="eyebrow">Installer l\'appli</span><span class="small"><b>iPhone</b> : dans Safari, bouton Partager, puis « Sur l\'écran d\'accueil ».<br><b>Android</b> : dans Chrome, menu ⋮, puis « Installer l\'application ».</span></section>' +
    suivre() + '<p class="mut xs" style="text-align:center"><a href="confidentialite.html" style="color:var(--mut)">Politique de confidentialité</a></p>';
}
// Petites annonces : recherche de partenaire et matériel à vendre, validées par le club
var AN = { liste: null, type: 'partenaire', form: null, f: {} };
function photoUrl(p) { return p ? SUPA_URL + '/storage/v1/object/public/annonces/' + p.split('/').map(encodeURIComponent).join('/') : ''; }
function chargerAnnonces() {
  return q(sb.from('annonces').select('id, num, type, created_at, cree_par, prenom, titre, niveau, dispo, prix, description, image_path, statut, expire_le').in('statut', ['attente', 'publiee']).order('created_at', { ascending: false }))
    .then(function (l) { AN.liste = l || []; return AN.liste; });
}
function carteAnnonce(a, opts) {
  var wa = function (t) { return 'https://wa.me/' + WA_CLUB + '?text=' + encodeURIComponent(t); };
  var h = '<section class="card stack" style="gap:6px">';
  if (a.type === 'vente') {
    if (a.image_path) h += '<img src="' + esc(photoUrl(a.image_path)) + '" alt="" loading="lazy" style="width:100%;max-height:260px;object-fit:cover;border-radius:12px" onerror="this.remove()">';
    h += '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><b>' + esc(a.titre) + '</b>' + (a.prix ? '<span class="badge" style="background:var(--ac);color:#fff">' + esc(a.prix) + '</span>' : '') + '</div>' +
      (a.description ? '<span class="mut small" style="white-space:pre-line">' + esc(a.description) + '</span>' : '');
  } else {
    h += '<div style="display:flex;justify-content:space-between;gap:8px"><b>' + esc(a.prenom) + '</b>' + (NIV[a.niveau] ? niveauBadge(a.niveau) : '<span class="badge" style="background:var(--soft);color:var(--tx)">' + esc(a.niveau) + '</span>') + '</div>' +
      '<span class="mut small">' + esc(a.dispo) + '</span>' + (a.description ? '<span class="small" style="white-space:pre-line">' + esc(a.description) + '</span>' : '');
  }
  h += '<span class="mut xs">Annonce n°' + a.num + ' · ' + esc(fmtCourt(new Date(a.created_at))) + '</span>';
  if (opts.statut) h += '<span><span class="badge" style="background:' + (a.statut === 'attente' ? 'var(--soft)' : 'var(--ok)') + ';color:' + (a.statut === 'attente' ? 'var(--tx)' : '#fff') + '">' + (a.statut === 'attente' ? 'En attente de validation' : 'Publiée jusqu\'au ' + esc(fmtCourt(new Date(a.expire_le + 'T12:00:00')))) + '</span></span>';
  if (opts.contact && !opts.staff) h += '<a class="btn" target="_blank" rel="noopener" href="' + esc(wa(a.type === 'vente' ? 'Bonjour, je suis intéressé(e) par l\'annonce n°' + a.num + ' : ' + a.titre + '. Pouvez-vous me mettre en relation ?' : 'Bonjour, je suis intéressé(e) par la demande de partenaire n°' + a.num + ' (' + a.prenom + ', ' + a.niveau + '). Pouvez-vous nous mettre en relation ?')) + '">Me mettre en relation</a>';
  if (opts.staff) h += '<div class="stack" style="gap:8px" data-ancontact="' + a.id + '"><button class="btn ghost" data-anvoir="' + a.id + '">Voir le numéro de l\'auteur</button></div>' +
    (a.statut === 'attente' ? '<div class="grid2"><button class="btn line" data-anstat="' + a.id + '|refusee">Refuser</button><button class="btn" data-anstat="' + a.id + '|publiee">Publier</button></div>' : '<button class="btn line" data-anstat="' + a.id + '|close">Retirer l\'annonce</button>');
  else if (opts.retirer) h += '<button class="btn line" data-anstat="' + a.id + '|close">Retirer mon annonce</button>';
  return h + '</section>';
}
function clubAnnonces(box) {
  if (AN.form) return formAnnonce(box);
  box.innerHTML = '<div class="skel"></div>';
  chargerAnnonces().then(function (l) {
    var staff = S.user && S.isStaff, moi = S.user ? S.user.id : null;
    var pub = l.filter(function (a) { return a.statut === 'publiee' && a.type === AN.type; });
    var h = '';
    var att = staff ? l.filter(function (a) { return a.statut === 'attente'; }) : [];
    if (att.length) h += '<div class="dayhead">À valider (' + att.length + ')</div>' + att.map(function (a) { return carteAnnonce(a, { staff: true }); }).join('');
    var mes = moi ? l.filter(function (a) { return a.cree_par === moi && !(staff && a.statut === 'attente'); }) : [];
    if (mes.length) h += '<div class="dayhead">Mes annonces</div>' + mes.map(function (a) { return carteAnnonce(a, { statut: true, retirer: true }); }).join('');
    h += '<div class="chips" style="margin-top:6px"><button class="chip ' + (AN.type === 'partenaire' ? 'on' : '') + '" data-antype="partenaire">Recherche de partenaire</button><button class="chip ' + (AN.type === 'vente' ? 'on' : '') + '" data-antype="vente">Matériel à vendre</button></div>';
    h += pub.length ? pub.map(function (a) { return carteAnnonce(a, { contact: a.cree_par !== moi, staff: staff && a.cree_par !== moi }); }).join('')
      : '<section class="card empty">' + (AN.type === 'vente' ? 'Aucun article à vendre pour le moment.' : 'Aucune demande pour le moment. Sois le premier à en déposer une !') + '</section>';
    h += '<button class="btn" id="an-new">' + (AN.type === 'vente' ? 'Vendre du matériel' : 'Déposer une demande de partenaire') + '</button>' +
      '<p class="mut xs" style="text-align:center">Les numéros ne sont jamais affichés : le club fait la mise en relation. Les annonces restent en ligne 2 mois.</p>';
    box.innerHTML = h;
    Array.prototype.forEach.call(box.querySelectorAll('[data-antype]'), function (b) { b.onclick = function () { AN.type = b.dataset.antype; clubAnnonces(box); }; });
    $('an-new').onclick = function () { if (!S.user) return go('#/profil'); AN.form = AN.type; AN.f = {}; clubAnnonces(box); };
    Array.prototype.forEach.call(box.querySelectorAll('[data-anstat]'), function (b) {
      b.onclick = function () {
        var x = b.dataset.anstat.split('|');
        if (x[1] === 'close' && !confirm('Retirer cette annonce ?')) return;
        q(sb.from('annonces').update({ statut: x[1] }).eq('id', x[0])).then(function () { toast({ publiee: 'Annonce publiée', refusee: 'Annonce refusée', close: 'Annonce retirée' }[x[1]]); clubAnnonces(box); }).catch(function () { toast('Action impossible'); });
      };
    });
    Array.prototype.forEach.call(box.querySelectorAll('[data-anvoir]'), function (b) {
      b.onclick = function () {
        q(sb.rpc('annonce_contact', { a: b.dataset.anvoir })).then(function (r) {
          var c = r && r[0], w = c && telWa(c.contact);
          box.querySelector('[data-ancontact="' + b.dataset.anvoir + '"]').innerHTML = c ? '<span class="small"><b>' + esc(c.contact || '—') + '</b>' + (c.email ? ' · ' + esc(c.email) : '') + '</span>' +
            '<div class="grid2">' + (c.contact ? '<a class="btn line" href="tel:' + esc(String(c.contact).replace(/\s/g, '')) + '">Appeler</a>' : '<span></span>') + (w ? '<a class="btn line" target="_blank" rel="noopener" href="https://wa.me/' + w + '">WhatsApp</a>' : '') + '</div>' : '<span class="mut small">Numéro introuvable.</span>';
        }).catch(function () { toast('Action impossible'); });
      };
    });
  }).catch(function () { box.innerHTML = '<section class="card empty">Impossible de charger les annonces pour le moment.</section>'; });
}
function reduirePhoto(fichier) {
  return new Promise(function (ok, ko) {
    var img = new Image(), url = URL.createObjectURL(fichier);
    img.onload = function () {
      var r = Math.min(1, 1200 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob(function (b) { b ? ok(b) : ko(new Error('photo')); }, 'image/jpeg', 0.82);
    };
    img.onerror = function () { ko(new Error('photo')); };
    img.src = url;
  });
}
function formAnnonce(box) {
  var v = AN.form === 'vente', F = AN.f;
  var champ = function (k, label, attrs, ta) { return '<label class="f">' + label + (ta ? '<textarea class="f" data-anf="' + k + '" ' + attrs + '>' + esc(F[k] || '') + '</textarea>' : '<input class="f" data-anf="' + k + '" ' + attrs + ' value="' + esc(F[k] || '') + '">') + '</label>'; };
  box.innerHTML = '<section class="card stack" style="gap:12px"><b style="font-size:17px">' + (v ? 'Vendre du matériel' : 'Chercher un partenaire') + '</b>' +
    (v ? champ('titre', 'Quoi ?', 'maxlength="80" placeholder="Ex. Raquette Babolat Pure Drive 26"') + champ('prix', 'Prix', 'maxlength="30" placeholder="Ex. 40 €"') +
      champ('description', 'Description (facultatif)', 'maxlength="600" placeholder="État, taille, tension…"', true) +
      '<label class="f">Photo (facultatif)<input class="f" type="file" accept="image/*" id="an-photo"></label>'
      : champ('prenom', 'Prénom', 'maxlength="40" autocomplete="given-name"') +
      '<label class="f">Niveau<select class="f" data-anf="niveau"><option value="">Choisir…</option>' + NIVEAUX.concat(['Adulte / autre']).map(function (n) { return '<option' + (F.niveau === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>' +
      champ('dispo', 'Mes disponibilités', 'maxlength="140" placeholder="Ex. mercredi après-midi, samedi matin"') +
      champ('description', 'Message (facultatif)', 'maxlength="600" placeholder="Ex. je cherche quelqu\'un pour m\'entraîner"', true)) +
    champ('contact', 'Téléphone ou WhatsApp <span class="mut">(jamais affiché)</span>', 'type="tel" inputmode="tel" autocomplete="tel" maxlength="40" placeholder="06 12 34 56 78"') +
    '<label class="check"><input type="checkbox" id="an-ok"><span>J\'accepte que mon annonce soit publiée dans l\'appli après validation par le club. Mon numéro n\'est jamais publié : le club fait la mise en relation. Pour un mineur, le numéro est celui d\'un parent.</span></label>' +
    '<button class="btn" id="an-go">Envoyer</button><button class="btn line" id="an-back">Annuler</button></section>';
  Array.prototype.forEach.call(box.querySelectorAll('[data-anf]'), function (i) { i.oninput = i.onchange = function () { F[i.dataset.anf] = i.value; }; });
  $('an-back').onclick = function () { AN.form = null; clubAnnonces(box); };
  $('an-go').onclick = function () {
    var t = function (k) { return String(F[k] || '').trim(); };
    if (v && !t('titre')) return toast('Indique ce que tu vends');
    if (!v && (!t('prenom') || !t('niveau') || !t('dispo'))) return toast('Prénom, niveau et disponibilités sont nécessaires');
    if (!telWa(t('contact'))) return toast('Vérifie le numéro de téléphone');
    if (!$('an-ok').checked) return toast('Coche la case d\'accord');
    var row = v ? { type: 'vente', titre: t('titre'), prix: t('prix') || null, description: t('description') || null, contact: t('contact') }
      : { type: 'partenaire', prenom: t('prenom'), niveau: t('niveau'), dispo: t('dispo'), description: t('description') || null, contact: t('contact') };
    $('an-go').disabled = true;
    var fichier = v && $('an-photo').files && $('an-photo').files[0];
    var photo = fichier ? reduirePhoto(fichier).then(function (blob) {
      var chemin = S.user.id + '/' + Date.now() + '.jpg';
      return sb.storage.from('annonces').upload(chemin, blob, { contentType: 'image/jpeg' }).then(function (r) { if (r.error) throw r.error; row.image_path = chemin; });
    }) : Promise.resolve();
    photo.then(function () { return q(sb.from('annonces').insert(row)); }).then(function () {
      AN.form = null; AN.type = row.type;
      toast(S.isStaff ? 'Annonce enregistrée' : 'Merci ! Ton annonce sera visible après validation par le club.');
      clubAnnonces(box);
    }).catch(function () { toast('Envoi impossible, réessaie'); $('an-go').disabled = false; });
  };
}

// ---------- Événement ----------
function pageEvenement(id) {
  var e = (S.evts || []).filter(function (x) { return x.id === id; })[0];
  if (!e) return '<div class="pagehead">' + backLink('#/club/evenements', 'Vie du club') + '</div><main><section class="card empty">Événement introuvable.</section></main>';
  var d = new Date(e.debut), fin = e.fin ? new Date(e.fin) : null;
  var multi = fin && isoJour(fin) !== isoJour(d);
  var h = '<div class="darkhead"><div class="wrap">' + backLink(e.type === 'seance' ? '#/agenda' : '#/club/evenements', e.type === 'seance' ? 'Mon agenda' : 'Vie du club', true) +
    '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' + evGroupes(e).gs.map(groupeBadge).join('') + (e.statut === 'annule' ? '<span class="badge" style="background:var(--ko);color:#fff">Annulé</span>' : '') + '</div>' +
    '<h1 style="margin-top:8px">' + esc(e.titre) + '</h1><div class="stack small" style="gap:4px;margin-top:10px;color:#dbe4ec">' +
    '<span>' + (multi ? 'Du ' + esc(fmtJour(d).toLowerCase()) + ' au ' + esc(fmtJour(fin).toLowerCase()) : esc(fmtJour(d))) + ' · ' + fmtH(d) + (fin ? ' – ' + fmtH(fin) : '') + '</span>' +
    (e.lieu ? '<span>' + esc(e.lieu) + '</span>' : '') + (e.encadrant ? '<span>Encadré par ' + esc(e.encadrant) + '</span>' : '') + '</div></div></div><main>';
  if (e.places_max) h += '<section class="card stack" style="gap:8px" id="places"><span class="mut small">Chargement des places…</span></section>';
  if (e.description || e.objectif) h += '<section class="card stack" style="gap:6px"><span class="eyebrow">Au programme</span><span style="white-space:pre-line">' + esc(e.description || e.objectif) + '</span></section>';
  if (e.prix_euros) h += '<section class="card"><span class="mut small">Tarif : <b style="color:var(--tx)">' + esc(String(e.prix_euros).replace('.', ',')) + ' €</b> · paiement au club house</span></section>';
  if (e.inscription_ouverte && e.statut !== 'annule') {
    if (!S.user) h += '<section class="card stack" style="gap:10px"><b>Inscriptions ouvertes</b><span class="mut small">Connecte-toi pour inscrire ta famille.</span><a class="btn" href="#/profil">Me connecter</a></section>';
    else if (S.pers.length) h += '<section class="card stack" style="gap:10px" id="insc"><span class="mut small">Chargement…</span></section>';
  }
  h += '<button class="btn line" id="ics-evt">' + ic('dl', 18) + 'Ajouter à mon agenda</button></main>';
  setTimeout(function () {
    $('ics-evt').onclick = function () { telechargerIcs([{ id: e.id, d: d, f: fin, titre: e.titre, lieu: e.lieu, statut: e.statut, qui: [] }], 'cloca-tennis.ics'); };
    if (e.places_max) q(sb.rpc('nb_inscrits', { evt: e.id })).then(function (n) {
      var reste = Math.max(0, e.places_max - n);
      $('places').innerHTML = '<div style="display:flex;justify-content:space-between"><b>' + n + ' inscrit' + (n > 1 ? 's' : '') + ' sur ' + e.places_max + '</b><b style="color:var(--ac)">' + (reste ? reste + ' place' + (reste > 1 ? 's' : '') + ' restante' + (reste > 1 ? 's' : '') : 'Complet · liste d\'attente') + '</b></div>' +
        '<div style="height:8px;border-radius:4px;background:var(--soft);overflow:hidden"><div style="height:8px;width:' + Math.min(100, Math.round(n / e.places_max * 100)) + '%;background:var(--ac)"></div></div>';
    }).catch(function () { $('places').remove(); });
    if ($('insc')) blocInscription(e);
  });
  return h;
}
function blocInscription(e) {
  var box = $('insc');
  q(sb.from('inscriptions').select('personne_id, statut, paye').eq('evenement_id', e.id)).then(function (ins) {
    var choix = {};
    var dessiner = function () {
      var h = '<span class="eyebrow">Qui inscrire ?</span>';
      S.pers.forEach(function (p) {
        var i = ins.filter(function (x) { return x.personne_id === p.id; })[0];
        if (i) h += '<div class="pick"><span class="dot" style="background:' + S.couleur[p.id] + '"></span>' + esc(p.prenom) + '<span class="small" style="margin-left:auto;color:var(--ok)">' + (i.statut === 'attente' ? 'liste d\'attente' : 'inscrit' + (i.paye ? ' · payé' : '')) + '</span>' +
          (!i.paye ? '<button class="chip" data-desins="' + p.id + '">Annuler</button>' : '') + '</div>';
        else h += '<label class="pick ' + (choix[p.id] ? 'on' : '') + '"><input type="checkbox" data-ins="' + p.id + '" ' + (choix[p.id] ? 'checked' : '') + ' style="width:20px;height:20px;accent-color:var(--ac)">' + esc(p.prenom) + '</label>';
      });
      var n = Object.keys(choix).filter(function (k) { return choix[k]; }).length;
      h += '<button class="btn" id="ins-go" ' + (n ? '' : 'disabled') + '>' + (n ? 'Inscrire ' + S.pers.filter(function (p) { return choix[p.id]; }).map(function (p) { return p.prenom; }).join(' et ') : 'Choisis qui inscrire') + '</button>';
      box.innerHTML = h;
      Array.prototype.forEach.call(box.querySelectorAll('[data-ins]'), function (c) { c.onchange = function () { choix[c.dataset.ins] = c.checked; dessiner(); }; });
      Array.prototype.forEach.call(box.querySelectorAll('[data-desins]'), function (b) {
        b.onclick = function () {
          q(sb.from('inscriptions').delete().eq('evenement_id', e.id).eq('personne_id', b.dataset.desins)).then(function () { toast('Inscription annulée'); render(); }).catch(function () { toast('Annulation impossible'); });
        };
      });
      $('ins-go').onclick = function () {
        var rows = Object.keys(choix).filter(function (k) { return choix[k]; }).map(function (k) { return { evenement_id: e.id, personne_id: k, created_by: S.user.id }; });
        $('ins-go').disabled = true;
        q(sb.from('inscriptions').insert(rows)).then(function () { toast('Inscription enregistrée'); AG = null; render(); }).catch(function () { toast('Inscription impossible pour le moment'); $('ins-go').disabled = false; });
      };
    };
    dessiner();
  }).catch(function () { box.innerHTML = '<span class="mut small">Impossible de charger les inscriptions.</span>'; });
}

// ---------- Profil et connexion ----------
function pageProfil() {
  var h = '<div class="pagehead wrap"><h1>' + (S.user ? 'Mon profil' : 'Connexion') + '</h1></div><main>';
  if (!S.user) {
    h += '<section class="card stack" style="gap:12px"><span class="mut small">Entre l\'adresse mail que tu as donnée au club. Tu recevras un code, sans mot de passe à retenir.</span>';
    if (S.loginStep === 1) h += '<label class="f">Adresse mail<input class="f" id="lg-mail" type="email" autocomplete="email" inputmode="email" placeholder="prenom.nom@exemple.fr" value="' + esc(S.loginEmail) + '"></label><button class="btn" id="lg-send">Recevoir mon code</button>';
    else h += '<label class="f">Code reçu par mail<input class="f" id="lg-code" inputmode="numeric" autocomplete="one-time-code" placeholder="123456"></label><button class="btn" id="lg-ok">Me connecter</button><button class="btn line" id="lg-back">Changer d\'adresse</button>';
    h += '<p class="mut small" id="lg-msg" style="margin:0">' + (S.loginStep === 2 ? 'Un mail vient de partir vers ' + esc(S.loginEmail) + '. Tape le code, ou clique sur le lien du mail.' : '') + '</p></section></main>';
    setTimeout(lierLogin);
    return h;
  }
  if (S.pers.length) {
    h += '<section class="card tight"><div class="eyebrow" style="padding:12px 0 4px">' + (S.pers.length > 1 ? 'Ma famille' : 'Mon profil') + '</div>' + S.pers.map(function (p) {
      var gs = (p.groupe_membres || []).filter(function (g) { return g.groupes && g.groupes.type !== 'profil'; }).map(function (g) { return groupeBadge(g.groupes); }).join(' ');
      return '<div class="row"><span style="display:flex;gap:8px;align-items:center"><span class="dot" style="background:' + S.couleur[p.id] + '"></span><b>' + esc(p.prenom + ' ' + p.nom) + '</b></span><span style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">' + gs + '</span></div>' +
        (p.niveau_arena ? '<a href="#/fiche/' + p.id + '" class="small" style="display:block;padding:0 0 10px 18px;font-weight:600">Voir la fiche CLOC\'ARENA →</a>' : '');
    }).join('') + '</section>';
  } else if (!S.isStaff) h += '<section class="card stack"><b>Adresse pas encore reconnue</b><span class="mut small">Cette adresse n\'est rattachée à aucun adhérent. Contacte le club pour qu\'il l\'ajoute.</span></section>';
  if (S.roles.length) h += '<section class="card stack" style="gap:8px"><span class="eyebrow">Mes responsabilités</span><span>' + S.roles.map(function (r) { return { direction: 'Direction sportive', bureau: 'Bureau', accueil: 'Accueil', coach: 'Coach', responsable: 'Responsable', cordeur: 'Cordeur' }[r.role]; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(', ') + '</span>' +
    (S.isStaff || estCordeur() ? '<a class="btn navy" href="gestion/">' + ic('tool', 18, '#fff') + 'Espace gestion</a>' : '') +
    (S.gere.length || S.isDir ? '<a class="btn ghost" href="#/gestion">Saisie CLOC\'ARENA</a>' : '') +
    (estCordeur() ? '<a class="btn ghost" href="#/cordage/attente">' + ic('racket', 18) + 'Atelier cordage</a>' : '') + '</section>';
  h += blocInstaller() + blocPush();
  h += '<section class="card stack" style="gap:4px"><span class="eyebrow">Connecté avec</span><span>' + esc(S.user.email) + '</span></section>' +
    '<button class="btn line" id="logout">Se déconnecter</button><p class="mut xs" style="text-align:center"><a href="confidentialite.html" style="color:var(--mut)">Politique de confidentialité</a></p></main>';
  setTimeout(function () { lierPush(); lierInstaller(); $('logout').onclick = function () { oublierPush().then(function () { return sb.auth.signOut(); }).then(function () { S.user = null; chargerUtilisateur().then(function () { go('#/accueil'); }); }); }; });
  return h;
}
function lierLogin() {
  var msg = function (t, err) { $('lg-msg').textContent = t; $('lg-msg').style.color = err ? 'var(--ko)' : 'var(--mut)'; };
  if ($('lg-send')) {
    var envoyer = function () {
      var m = ($('lg-mail').value || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)) return msg('Vérifie ton adresse mail.', true);
      $('lg-send').disabled = true; msg('Envoi en cours…');
      sb.auth.signInWithOtp({ email: m, options: { emailRedirectTo: location.origin + location.pathname } }).then(function (r) {
        $('lg-send').disabled = false;
        if (r.error) return msg(r.error.status === 429 ? 'Trop de demandes d\'affilée : attends quelques minutes, ou utilise le dernier mail reçu.' : 'L\'envoi a échoué. Réessaie dans un instant.', true);
        S.loginEmail = m; S.loginStep = 2; render();
      });
    };
    $('lg-send').onclick = envoyer;
    $('lg-mail').onkeydown = function (e) { if (e.key === 'Enter') envoyer(); };
  }
  if ($('lg-ok')) {
    var valider = function () {
      var c = ($('lg-code').value || '').replace(/\s/g, '');
      if (!/^\d{6,10}$/.test(c)) return msg('Le code contient uniquement des chiffres.', true);
      $('lg-ok').disabled = true; msg('Vérification…');
      sb.auth.verifyOtp({ email: S.loginEmail, token: c, type: 'email' }).then(function (r) {
        $('lg-ok').disabled = false;
        if (r.error) return msg('Code incorrect ou expiré. Redemande un code si besoin.', true);
        S.loginStep = 1;
      });
    };
    $('lg-ok').onclick = valider;
    $('lg-code').onkeydown = function (e) { if (e.key === 'Enter') valider(); };
    $('lg-back').onclick = function () { S.loginStep = 1; render(); };
  }
}

// ---------- Gestion ----------
var G = { joueurs: null, form: null };
function pageGestion() {
  if (!S.user || !(S.isStaff || S.gere.length)) return '<div class="pagehead wrap"><h1>Gestion</h1></div><main><section class="card empty">Espace réservé à l\'équipe du club.</section></main>';
  var h = '<div class="darkhead"><div class="wrap"><div class="kicker">GESTION · ' + (S.isDir ? 'DIRECTION SPORTIVE' : 'ÉQUIPE DU CLUB') + '</div><h1>CLOC\'ARENA</h1>' +
    '<div class="seg" style="margin-top:14px">' + [['saisir', 'Saisir'], ['valider', 'À valider'], ['recents', 'Récents'], ['niveaux', 'Niveaux']].map(function (t) {
      return '<button data-gtab="' + t[0] + '" class="' + (S.gesTab === t[0] ? 'on' : '') + '">' + t[1] + '</button>';
    }).join('') + '</div></div></div><main id="ges-main"><div class="skel"></div></main>';
  setTimeout(function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-gtab]'), function (b) { b.onclick = function () { S.gesTab = b.dataset.gtab; render(); }; });
    Promise.all([chargerJoueurs(), chargerFormats()]).then(function () {
      if (S.gesTab === 'saisir') gesSaisir(); else if (S.gesTab === 'valider') gesListe('propose'); else if (S.gesTab === 'niveaux') gesNiveaux(); else gesListe('valide');
    }).catch(function () { $('ges-main').innerHTML = '<section class="card empty">Impossible de charger les joueurs.</section>'; });
  });
  return h + (S.isStaff ? '<div style="padding:0 16px"><a class="btn navy" href="gestion/">' + ic('tool', 18, '#fff') + 'Espace gestion complet (adhérents, actus, événements…)</a></div>' : '') +
    '<p class="mut xs" style="text-align:center;margin:12px"><a href="#/profil" style="color:var(--mut)">Mon profil et déconnexion</a></p>';
}
function chargerJoueurs() {
  if (G.joueurs) return Promise.resolve(G.joueurs);
  return q(sb.from('personnes').select('id, prenom, nom, niveau_arena, sexe').not('arena_id', 'is', null).eq('actif', true).order('prenom')).then(function (l) { G.joueurs = l || []; return G.joueurs; });
}
function chargerFormats() {
  if (S.formats) return Promise.resolve(S.formats);
  return q(sb.from('arena_formats').select('*').order('ordre')).then(function (l) { S.formats = l || []; return S.formats; });
}
function lireScore(txt) {
  var sets = String(txt || '').trim().split(/[\s,;/]+/).filter(Boolean), a = 0, b = 0, ok = sets.length > 0;
  sets.forEach(function (s) { var m = s.match(/^(\d{1,2})-(\d{1,2})$/); if (!m || m[1] === m[2]) { ok = false; return; } if (+m[1] > +m[2]) a++; else b++; });
  if (!ok || a === b) return null;
  return { score: sets.join(' '), vainqueur: a > b ? 1 : 2 };
}
function gesSaisir() {
  var box = $('ges-main');
  if (!G.form) G.form = { date: isoJour(new Date()), format: 'FLASH MATCH', niv: [], e1: ['', ''], e2: ['', ''], inv: {}, score: '' };
  var F = G.form, fmt = S.formats.filter(function (x) { return x.code === F.format; })[0] || S.formats[0], dbl = fmt && fmt.double;
  var liste = G.joueurs.filter(function (j) { return !F.niv.length || F.niv.indexOf(j.niveau_arena) >= 0; });
  var options = function (val) {
    return '<option value="">Choisir…</option>' + liste.map(function (j) { return '<option value="' + j.id + '"' + (j.id === val ? ' selected' : '') + '>' + esc(j.prenom + ' ' + j.nom) + (F.niv.length === 1 ? '' : ' · ' + esc(j.niveau_arena || '')) + '</option>'; }).join('');
  };
  var ligne = function (eq, k) {
    var v = F['e' + eq][k];
    return '<div style="display:flex;gap:8px;align-items:center"><select class="f" data-j="' + eq + '-' + k + '" aria-label="Joueur ' + (k + 1) + ' équipe ' + eq + '">' + options(v) + '</select>' +
      '<label class="xs" style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:none;width:52px;color:var(--mut)"><input type="checkbox" data-inv="' + eq + '-' + k + '" ' + (F.inv[eq + '-' + k] ? 'checked' : '') + ' style="width:20px;height:20px;accent-color:var(--ac)">invité</label></div>';
  };
  var lu = lireScore(F.score);
  var nomEq = function (eq) { return (dbl ? [0, 1] : [0]).map(function (k) { var j = G.joueurs.filter(function (x) { return x.id === F['e' + eq][k]; })[0]; return j ? j.prenom : '?'; }).join(' / '); };
  box.innerHTML = '<section class="card stack" style="gap:10px"><label class="f">Date<input class="f" type="date" id="g-date" value="' + F.date + '"></label>' +
    '<span class="eyebrow">Format</span><div class="chips" style="flex-wrap:wrap">' + S.formats.map(function (x) { return '<button class="chip ' + (x.code === F.format ? 'on' : '') + '" data-fmt="' + esc(x.code) + '">' + esc(x.libelle) + ' · ' + (+x.points_victoire) + '/' + (+x.points_defaite) + '</button>'; }).join('') + '</div></section>' +
    '<section class="card stack" style="gap:10px"><span class="eyebrow">Joueurs</span><div class="chips"><button class="chip ' + (!F.niv.length ? 'on' : '') + '" data-gniv="">Tous niveaux</button>' + NIVEAUX.map(function (n) { return '<button class="chip ' + (F.niv.indexOf(n) >= 0 ? 'on' : '') + '" data-gniv="' + n + '">' + n + '</button>'; }).join('') + '</div>' +
    '<span class="mut xs">Touche plusieurs niveaux pour un regroupement (ex. Violet + Rouge).</span>' +
    '<b class="small">' + (dbl ? 'Équipe 1' : 'Joueur 1') + '</b>' + ligne(1, 0) + (dbl ? ligne(1, 1) : '') +
    '<b class="small">' + (dbl ? 'Équipe 2' : 'Joueur 2') + '</b>' + ligne(2, 0) + (dbl ? ligne(2, 1) : '') +
    '<label class="f">Score (côté ' + (dbl ? 'équipe 1' : 'joueur 1') + ', sets séparés par un espace)<input class="f" id="g-score" inputmode="numeric" placeholder="7-4  ou  6-3 4-6 10-8" value="' + esc(F.score) + '"></label>' +
    '<p class="small" style="margin:0;color:' + (lu ? 'var(--ok)' : 'var(--mut)') + '" id="g-prev">' + (lu ? '🏆 ' + esc(nomEq(lu.vainqueur)) + ' gagne ' + esc(scorePour(lu.score, lu.vainqueur)) : 'Tape le score pour voir le vainqueur.') + '</p>' +
    '<button class="btn" id="g-save">' + (S.isDir ? 'Enregistrer et valider' : 'Proposer ce score') + '</button>' +
    (S.isDir ? '' : '<p class="mut xs" style="margin:0">Le score sera ajouté au classement après validation par la direction sportive.</p>') + '</section>';
  $('g-date').onchange = function () { F.date = this.value; };
  Array.prototype.forEach.call(box.querySelectorAll('[data-fmt]'), function (b) { b.onclick = function () { F.format = b.dataset.fmt; gesSaisir(); }; });
  Array.prototype.forEach.call(box.querySelectorAll('[data-gniv]'), function (b) { b.onclick = function () { var n = b.dataset.gniv, i = F.niv.indexOf(n); if (!n) F.niv = []; else if (i >= 0) F.niv.splice(i, 1); else F.niv.push(n); gesSaisir(); }; });
  Array.prototype.forEach.call(box.querySelectorAll('[data-j]'), function (s) { s.onchange = function () { var x = s.dataset.j.split('-'); F['e' + x[0]][+x[1]] = s.value; gesSaisir(); }; });
  Array.prototype.forEach.call(box.querySelectorAll('[data-inv]'), function (c) { c.onchange = function () { F.inv[c.dataset.inv] = c.checked; }; });
  $('g-score').oninput = function () {
    F.score = this.value; var l2 = lireScore(F.score);
    $('g-prev').style.color = l2 ? 'var(--ok)' : 'var(--mut)';
    $('g-prev').textContent = l2 ? '🏆 ' + nomEq(l2.vainqueur) + ' gagne ' + scorePour(l2.score, l2.vainqueur) : 'Tape le score pour voir le vainqueur.';
  };
  $('g-save').onclick = function () { enregistrerMatch(dbl); };
}
function enregistrerMatch(dbl) {
  var F = G.form, ks = dbl ? [0, 1] : [0];
  var j1 = ks.map(function (k) { return F.e1[k]; }), j2 = ks.map(function (k) { return F.e2[k]; });
  var tous = j1.concat(j2);
  if (tous.some(function (x) { return !x; })) return toast('Choisis tous les joueurs');
  if (tous.filter(function (x, i) { return tous.indexOf(x) !== i; }).length) return toast('Un joueur apparaît deux fois');
  var lu = lireScore(F.score); if (!lu) return toast('Score invalide, exemple : 7-4');
  $('g-save').disabled = true;
  var match;
  q(sb.from('arena_matchs').insert({ date_match: F.date, format: F.format, score: lu.score, vainqueur: lu.vainqueur, statut: 'propose', propose_par: S.user.id }).select().single())
    .then(function (m) {
      match = m;
      var rows = [];
      ks.forEach(function (k) { rows.push({ match_id: m.id, personne_id: F.e1[k], equipe: 1, invite: !!F.inv['1-' + k] }); rows.push({ match_id: m.id, personne_id: F.e2[k], equipe: 2, invite: !!F.inv['2-' + k] }); });
      return q(sb.from('arena_match_joueurs').insert(rows));
    })
    .then(function () { return S.isDir ? q(sb.from('arena_matchs').update({ statut: 'valide', valide_par: S.user.id }).eq('id', match.id)) : null; })
    .then(function () {
      toast(S.isDir ? 'Match enregistré, classement mis à jour' : 'Score proposé à la direction sportive');
      S.classement = null; G.form.e1 = ['', '']; G.form.e2 = ['', '']; G.form.inv = {}; G.form.score = ''; gesSaisir();
    })
    .catch(function () {
      if (match) sb.from('arena_matchs').delete().eq('id', match.id);
      toast('Enregistrement impossible, réessaie'); $('g-save').disabled = false;
    });
}
function gesNiveaux() {
  var box = $('ges-main');
  var h = '<p class="mut small" style="margin:0">Le niveau fixé ici est celui du joueur dans CLOC\'ARENA : classement par niveau, séances dans son agenda, notifications.</p>';
  NIVEAUX.forEach(function (n) {
    var l = G.joueurs.filter(function (j) { return j.niveau_arena === n; }); if (!l.length) return;
    h += '<div class="dayhead">' + niveauBadge(n) + ' <span class="mut small">' + l.length + ' joueur' + (l.length > 1 ? 's' : '') + '</span></div><section class="card tight">' + l.map(function (j) {
      return '<div class="row"><b class="small">' + esc(j.prenom + ' ' + j.nom) + '</b><select class="f" data-niv="' + j.id + '" style="width:auto;min-height:40px">' + NIVEAUX.map(function (x) { return '<option' + (x === n ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>';
    }).join('') + '</section>';
  });
  box.innerHTML = h;
  Array.prototype.forEach.call(box.querySelectorAll('[data-niv]'), function (sel) {
    sel.onchange = function () {
      var j = G.joueurs.filter(function (x) { return x.id === sel.dataset.niv; })[0], n = sel.value;
      if (!confirm('Passer ' + j.prenom + ' en ' + n + ' ?')) { sel.value = j.niveau_arena; return; }
      q(sb.rpc('changer_niveau', { p: j.id, niveau: n })).then(function () { j.niveau_arena = n; S.classement = null; toast(j.prenom + ' passe en ' + n); gesNiveaux(); })
        .catch(function () { sel.value = j.niveau_arena; toast('Changement impossible : seuls la direction et le coach du groupe peuvent le faire'); });
    };
  });
}
function gesListe(statut) {
  var box = $('ges-main');
  var req = sb.from('arena_matchs').select('id, date_match, format, score, vainqueur, statut, legacy_id, arena_match_joueurs(equipe, invite, personnes(prenom, nom))').eq('statut', statut).order('date_match', { ascending: false }).order('created_at', { ascending: false }).limit(statut === 'propose' ? 100 : 25);
  q(req).then(function (l) {
    if (!l.length) { box.innerHTML = '<section class="card empty">' + (statut === 'propose' ? 'Aucun score en attente.' : 'Aucun match récent.') + '</section>'; return; }
    box.innerHTML = '<section class="card tight">' + l.map(function (m) {
      var eq = function (n) { return m.arena_match_joueurs.filter(function (j) { return j.equipe === n; }).map(function (j) { return initiale(j.personnes) + (j.invite ? ' (invité)' : ''); }).join(' / '); };
      var g = m.vainqueur === 1 ? eq(1) : eq(2), p = m.vainqueur === 1 ? eq(2) : eq(1);
      var actions = statut === 'propose' && S.isDir ? '<div style="display:flex;gap:6px"><button class="chip" data-ref="' + m.id + '" aria-label="Refuser">Refuser</button><button class="chip on" data-val="' + m.id + '">Valider</button></div>'
        : (statut === 'valide' && S.isDir && !m.legacy_id ? '<button class="chip" data-ann="' + m.id + '">Annuler</button>' : '');
      return '<div class="row"><div class="stack" style="min-width:0"><span class="small"><b>' + esc(g) + '</b> <span class="mut">bat</span> ' + esc(p) + '</span><span class="mut xs">' + esc(fmtCourt(new Date(m.date_match + 'T12:00:00'))) + ' · ' + esc(m.format.toLowerCase()) + ' · ' + esc(scorePour(m.score, m.vainqueur)) + '</span></div>' + actions + '</div>';
    }).join('') + '</section>' + (statut === 'valide' ? '<p class="mut xs" style="text-align:center">Les matchs importés du classeur Google ne peuvent pas être annulés ici.</p>' : '');
    var maj = function (id, st, msg) {
      q(sb.from('arena_matchs').update({ statut: st, valide_par: S.user.id }).eq('id', id)).then(function () { toast(msg); S.classement = null; gesListe(statut); }).catch(function () { toast('Action impossible'); });
    };
    Array.prototype.forEach.call(box.querySelectorAll('[data-val]'), function (b) { b.onclick = function () { maj(b.dataset.val, 'valide', 'Score validé'); }; });
    Array.prototype.forEach.call(box.querySelectorAll('[data-ref]'), function (b) { b.onclick = function () { maj(b.dataset.ref, 'refuse', 'Score refusé'); }; });
    Array.prototype.forEach.call(box.querySelectorAll('[data-ann]'), function (b) { b.onclick = function () { if (confirm('Annuler ce match ? Les points seront retirés du classement.')) maj(b.dataset.ann, 'refuse', 'Match annulé'); }; });
  }).catch(function () { box.innerHTML = '<section class="card empty">Impossible de charger les matchs.</section>'; });
}

// ---------- Cordage ----------
var VAPID_PUBLIC = 'BMmaOXjktnfundELUQ-Cme51cT_QYxRu43l2dw8ges6gkNZkjsXFouJn61Z2Ln3bdlyTF6znQ_Hg9iFHBP1yBwU';
var C = null; // {file, dem, cordages, tarifs}
var CF = null; // brouillon du formulaire de dépôt
function euros(n) { return n == null ? '' : String(+n).replace('.', ',') + ' €'; }
function telWa(t) {
  var d = String(t || '').replace(/[^\d+]/g, '');
  if (d.indexOf('+') === 0) d = d.slice(1); else if (d.indexOf('00') === 0) d = d.slice(2); else if (/^0\d{9}$/.test(d)) d = '33' + d.slice(1);
  return d.length >= 10 ? d : '';
}
function chargerCordage() {
  if (!S.user) return Promise.resolve(C = null);
  return Promise.all([
    q(sb.rpc('cordage_file')),
    q(sb.from('cordage_demandes').select('*, cordages(nom)').in('statut', ['attente', 'fini', 'recupere']).order('created_at')),
    q(sb.from('cordages').select('*').order('ordre').order('nom')),
    q(sb.from('cordage_tarifs').select('*'))
  ]).then(function (r) { C = { file: r[0] || [], dem: r[1] || [], cordages: r[2] || [], tarifs: r[3] || [] }; return C; });
}
function estCordeur() { return S.roles.some(function (x) { return (x.role === 'cordeur' || x.role === 'direction') && !x.groupe_id; }); }
function aMoi(d) { return d.cree_par === S.user.id || S.pers.some(function (p) { return p.id === d.personne_id; }); }
function tarifPose() { var t = C && C.tarifs.filter(function (x) { return x.code === 'pose'; })[0]; return t ? +t.prix : null; }
function resumeCordage() {
  if (!C) return 'Déposer une raquette';
  var mien = C.file.filter(function (x) { return x.a_moi; });
  var prete = mien.filter(function (x) { return x.statut === 'fini'; })[0];
  if (prete) return '<b style="color:var(--ok)">Ta raquette est prête !</b>';
  var att = mien.filter(function (x) { return x.statut === 'attente'; })[0];
  if (att) return 'En attente · ' + att.rang + (att.rang === 1 ? 're' : 'e') + ' dans la file';
  if (estCordeur()) { var n = C.file.filter(function (x) { return x.statut === 'attente'; }).length; return n + ' raquette' + (n > 1 ? 's' : '') + ' à corder'; }
  return 'Déposer une raquette';
}

function pageCordage(sous) {
  if (sous) S.cordTab = sous;
  var cordeur = S.user && estCordeur();
  var tabsC = [['deposer', 'Déposer'], ['attente', cordeur ? 'Attente' : 'En attente'], ['pretes', 'Prêtes']];
  if (cordeur) tabsC.push(['reglages', 'Réglages']);
  if (!S.cordTab || (S.cordTab === 'reglages' && !cordeur)) S.cordTab = 'deposer';
  var h = '<div class="darkhead"><div class="wrap">' + backLink('#/accueil', 'Accueil', true) + '<div class="kicker" style="margin-top:4px">ATELIER CORDAGE' + (cordeur ? ' · CORDEUR' : '') + '</div><h1>Cordage</h1>' +
    '<div class="seg" style="margin-top:14px">' + tabsC.map(function (t) {
      var n = C ? C.file.filter(function (x) { return x.statut === (t[0] === 'attente' ? 'attente' : 'fini'); }).length : 0;
      return '<button style="white-space:nowrap" data-cotab="' + t[0] + '" class="' + (S.cordTab === t[0] ? 'on' : '') + '">' + t[1] + ((t[0] === 'attente' || t[0] === 'pretes') && n ? ' · ' + n : '') + '</button>';
    }).join('') + '</div></div></div><main id="cord-main"><div class="skel"></div></main>';
  setTimeout(function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cotab]'), function (b) { b.onclick = function () { go('#/cordage/' + b.dataset.cotab); }; });
    var box = $('cord-main');
    if (!S.user) { box.innerHTML = '<section class="card stack" style="gap:10px"><b>Connecte-toi pour déposer ta raquette</b><span class="mut small">Tu suis ensuite où elle en est, et tu es prévenu dès qu\'elle est cordée.</span><a class="btn" href="#/profil">Me connecter</a></section>'; return; }
    chargerCordage().then(function () {
      if (S.cordTab === 'deposer') cordDeposer(box);
      else if (S.cordTab === 'attente') cordListe(box, 'attente');
      else if (S.cordTab === 'pretes') cordListe(box, 'fini');
      else cordReglages(box);
    }).catch(function () { box.innerHTML = '<section class="card empty">Impossible de charger le cordage pour le moment.</section>'; });
  });
  return h;
}

function cordDeposer(box) {
  var cordeur = estCordeur();
  if (!S.pers.length && !cordeur) { box.innerHTML = '<section class="card empty">Ton adresse n\'est rattachée à aucun adhérent. Contacte le club.</section>'; return; }
  if (!CF) {
    var dernier = C.dem.filter(function (d) { return d.cree_par === S.user.id && d.telephone; }).slice(-1)[0];
    CF = { qui: S.pers.length === 1 ? S.pers[0].id : '', nomExt: '', raquette: '', fourni: 'club', cordage: '', perso: '', tension: '', avant: '', tel: dernier ? dernier.telephone : '', note: '' };
  }
  var F = CF, actifs = C.cordages.filter(function (c) { return c.actif; });
  var prix = F.fourni === 'club' ? (actifs.filter(function (c) { return c.id === F.cordage; })[0] || {}).prix : tarifPose();
  var pick = function (attr, val, on, label, extra) { return '<button type="button" class="pick' + (on ? ' on' : '') + '" data-' + attr + '="' + esc(val) + '" style="width:100%;text-align:left;background:' + (on ? 'var(--sun)' : 'var(--card)') + '"><span style="flex:1">' + label + '</span>' + (extra || '') + '</button>'; };
  var histo = C.dem.filter(function (d) { return aMoi(d) && d.statut === 'recupere'; }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).slice(0, 5);
  var h = infosAtelier() + '<div id="presence"></div>' +
    (histo.length ? '<section class="card tight"><div class="eyebrow" style="padding:12px 0 4px">Mes derniers cordages</div>' + histo.map(function (d) {
      return '<div class="row"><div class="stack" style="min-width:0"><b class="small">' + esc(d.nom.split(' ')[0]) + ' · ' + esc(fmtCourt(new Date(d.recupere_le || d.fini_le || d.created_at))) + '</b><span class="mut xs">' +
        esc(d.fourni_par === 'club' ? (d.cordages ? d.cordages.nom : 'Cordage du club') : (d.cordage_perso || 'Cordage perso')) + (d.tension ? ' · ' + esc(d.tension) : '') + (d.raquette ? ' · ' + esc(d.raquette) : '') + ' · ' + euros(d.prix) + '</span></div>' +
        '<button class="chip" data-crefaire="' + d.id + '" style="flex:none">Refaire le même</button></div>';
    }).join('') + '</section>' : '') +
    '<section class="card stack" style="gap:10px"><span class="eyebrow">Pour qui ?</span>' +
    S.pers.map(function (p) { return pick('cqui', p.id, F.qui === p.id, '<span class="dot" style="background:' + S.couleur[p.id] + ';margin-right:8px"></span>' + esc(p.prenom + ' ' + p.nom)); }).join('') +
    (cordeur ? pick('cqui', 'ext', F.qui === 'ext', 'Autre joueur (saisi par le cordeur)') + (F.qui === 'ext' ? '<label class="f">Nom du joueur<input class="f" data-cf="nomExt" value="' + esc(F.nomExt) + '" placeholder="Prénom Nom"></label>' : '') : '') +
    '<label class="f">Raquette (facultatif)<input class="f" data-cf="raquette" value="' + esc(F.raquette) + '" placeholder="Ex. Babolat Pure Drive bleue"></label></section>' +
    '<section class="card stack" style="gap:10px"><span class="eyebrow">Cordage</span><div class="grid2">' +
    pick('cfour', 'club', F.fourni === 'club', 'Fourni par le club') + pick('cfour', 'joueur', F.fourni === 'joueur', 'J\'apporte le mien') + '</div>' +
    (F.fourni === 'club'
      ? (actifs.length ? actifs.map(function (c) { return pick('ccord', c.id, F.cordage === c.id, esc(c.nom), '<b>' + euros(c.prix) + '</b>'); }).join('') : '<span class="mut small">Aucun cordage du club disponible pour le moment.</span>')
      : '<label class="f">Quel cordage ?<input class="f" data-cf="perso" value="' + esc(F.perso) + '" placeholder="Ex. Luxilon Alu Power 1.25"></label><span class="mut xs">Pense à le laisser avec la raquette. Pose seule : ' + euros(tarifPose()) + '.</span>') +
    '<label class="f">Tension (facultatif)<input class="f" data-cf="tension" value="' + esc(F.tension) + '" placeholder="Ex. 24 kg / 23 kg, ou « comme d\'habitude »"></label></section>' +
    '<section class="card stack" style="gap:10px"><label class="f">J\'en ai besoin avant le (facultatif)<input class="f" type="date" data-cf="avant" min="' + isoJour(new Date()) + '" value="' + esc(F.avant) + '"></label>' +
    '<label class="f">Téléphone (pour te prévenir)<input class="f" type="tel" inputmode="tel" autocomplete="tel" data-cf="tel" value="' + esc(F.tel) + '" placeholder="06 12 34 56 78"></label>' +
    '<label class="f">Un mot pour le cordeur (facultatif)<textarea class="f" data-cf="note" placeholder="Ex. garder le même grip">' + esc(F.note) + '</textarea></label></section>' +
    '<section class="card stack" style="gap:10px"><div style="display:flex;justify-content:space-between;align-items:center"><span>Prix</span><b class="disp" style="font-size:28px">' + (prix != null ? euros(prix) : '—') + '</b></div>' +
    '<span class="mut xs">À régler au club house en récupérant la raquette.</span><button class="btn" id="cf-go">Déposer ma raquette</button></section>';
  box.innerHTML = h;
  Array.prototype.forEach.call(box.querySelectorAll('[data-cf]'), function (i) { i.oninput = function () { F[i.dataset.cf] = i.value; }; });
  Array.prototype.forEach.call(box.querySelectorAll('[data-cqui]'), function (b) { b.onclick = function () { F.qui = b.dataset.cqui; cordDeposer(box); }; });
  Array.prototype.forEach.call(box.querySelectorAll('[data-crefaire]'), function (b) {
    b.onclick = function () {
      var d = C.dem.filter(function (x) { return x.id === b.dataset.crefaire; })[0]; if (!d) return;
      var encore = d.cordage_id && actifs.some(function (c) { return c.id === d.cordage_id; });
      CF = { qui: d.personne_id || (cordeur ? 'ext' : ''), nomExt: d.personne_id ? '' : d.nom, raquette: d.raquette || '', fourni: d.fourni_par, cordage: encore ? d.cordage_id : '', perso: d.cordage_perso || '',
        tension: d.tension || '', avant: '', tel: d.telephone || F.tel, note: '' };
      cordDeposer(box); window.scrollTo(0, document.querySelector('[data-cfour]').getBoundingClientRect().top + window.scrollY - 120);
      toast(d.fourni_par === 'club' && !encore ? 'Ce cordage n\'est plus proposé : choisis-en un autre' : 'Formulaire rempli comme la dernière fois');
    };
  });
  remplirPresence();
  Array.prototype.forEach.call(box.querySelectorAll('[data-cfour]'), function (b) { b.onclick = function () { F.fourni = b.dataset.cfour; cordDeposer(box); }; });
  Array.prototype.forEach.call(box.querySelectorAll('[data-ccord]'), function (b) { b.onclick = function () { F.cordage = b.dataset.ccord; cordDeposer(box); }; });
  $('cf-go').onclick = function () {
    if (!F.qui) return toast('Choisis pour qui');
    if (F.qui === 'ext' && !F.nomExt.trim()) return toast('Indique le nom du joueur');
    if (F.fourni === 'club' && !F.cordage) return toast('Choisis un cordage');
    if (F.fourni === 'joueur' && !F.perso.trim()) return toast('Indique ton cordage');
    if (!telWa(F.tel)) return toast('Vérifie le numéro de téléphone');
    var row = {
      personne_id: F.qui === 'ext' ? null : F.qui, nom: F.qui === 'ext' ? F.nomExt.trim() : '-', telephone: F.tel.trim(), raquette: F.raquette.trim() || null,
      fourni_par: F.fourni, cordage_id: F.fourni === 'club' ? F.cordage : null, cordage_perso: F.fourni === 'joueur' ? F.perso.trim() : null,
      tension: F.tension.trim() || null, besoin_avant: F.avant || null, note: F.note.trim() || null
    };
    $('cf-go').disabled = true;
    q(sb.from('cordage_demandes').insert(row)).then(function () {
      CF = null;
      return chargerCordage();
    }).then(function () {
      var att = C.file.filter(function (x) { return x.a_moi && x.statut === 'attente'; }).slice(-1)[0];
      box.innerHTML = '<section class="card stack" style="gap:10px;text-align:center"><span style="font-size:40px">🎾</span><b style="font-size:18px">Demande enregistrée</b>' +
        '<span class="mut">Laisse maintenant ta raquette au club house, avec une étiquette à ton nom.' + (att ? ' Tu es ' + att.rang + (att.rang === 1 ? 'r' : '') + 'e dans la file.' : '') + '</span></section>' +
        blocPush() + '<a class="btn line" href="#/cordage/attente">Voir la file d\'attente</a>';
      lierPush();
    }).catch(function () { toast('Envoi impossible, réessaie'); $('cf-go').disabled = false; });
  };
}

function cordListe(box, statut) {
  var cordeur = estCordeur(), now = debutJour(new Date());
  var h = '';
  if (cordeur) {
    var l = C.dem.filter(function (d) { return statut === 'attente' ? d.statut === 'attente' : (d.statut === 'fini' || (d.statut === 'recupere' && !d.paye)); });
    if (statut === 'attente') l.sort(function (a, b) { return (a.besoin_avant || '9999') < (b.besoin_avant || '9999') ? -1 : (a.besoin_avant || '9999') > (b.besoin_avant || '9999') ? 1 : (a.created_at < b.created_at ? -1 : 1); });
    if (!l.length) h += '<section class="card empty">' + (statut === 'attente' ? 'Aucune raquette en attente. 👌' : 'Aucune raquette à récupérer ou à régler.') + '</section>';
    h += l.map(function (d) {
      var urgent = d.besoin_avant && (new Date(d.besoin_avant + 'T12:00:00') - now) < 3 * 864e5;
      var wa = telWa(d.telephone);
      var info = [
        d.raquette ? esc(d.raquette) : '',
        d.fourni_par === 'club' ? 'Cordage club : ' + esc(d.cordages ? d.cordages.nom : '?') : 'Cordage perso : ' + esc(d.cordage_perso || '?'),
        d.tension ? 'Tension : ' + esc(d.tension) : ''
      ].filter(Boolean).join('<br>');
      var etat = statut === 'attente'
        ? (d.besoin_avant ? '<span class="badge" style="background:' + (urgent ? 'var(--ko)' : 'var(--soft)') + ';color:' + (urgent ? '#fff' : 'var(--tx)') + '">Avant le ' + esc(fmtCourt(new Date(d.besoin_avant + 'T12:00:00'))) + '</span>' : '')
        : '<span class="badge" style="background:' + (d.statut === 'recupere' ? 'var(--soft)' : 'var(--ok)') + ';color:' + (d.statut === 'recupere' ? 'var(--tx)' : '#fff') + '">' + (d.statut === 'recupere' ? 'Récupérée' : 'À récupérer') + '</span> <span class="badge" style="background:' + (d.paye ? 'var(--soft)' : 'var(--ac)') + ';color:' + (d.paye ? 'var(--tx)' : '#fff') + '">' + (d.paye ? 'Réglée' : 'À régler') + '</span>';
      var msg = 'Bonjour ! C\'est le club CLOCA Tennis 🎾 La raquette de ' + d.nom.split(' ')[0] + ' est cordée et t\'attend au club house' + (d.prix != null ? ' (' + euros(d.prix) + ')' : '') + '. À bientôt !';
      var actions = statut === 'attente'
        ? '<div class="grid2"><button class="btn line" data-csup="' + d.id + '">Supprimer</button><button class="btn" data-cfini="' + d.id + '">Prête ✓</button></div>'
        : '<div class="grid2">' + (d.statut === 'fini' ? '<button class="btn line" data-crec="' + d.id + '">Récupérée</button>' : '<span></span>') + (!d.paye ? '<button class="btn navy" data-cpaye="' + d.id + '">Réglée</button>' : '') + '</div>' +
          '<div class="grid2">' + (wa ? '<a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/' + wa + '?text=' + encodeURIComponent(msg) + '">WhatsApp</a>' : '<span></span>') +
          (d.personne_id ? '<button class="btn ghost" data-cnotif="' + d.id + '">' + (d.notifie_le ? 'Renvoyer la notif' : 'Envoyer la notif') + '</button>' : '') + '</div>';
      return '<section class="card stack" style="gap:8px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div class="stack"><b style="font-size:16px">' + esc(d.nom) + '</b><span class="mut xs">Déposée le ' + esc(fmtCourt(new Date(d.created_at))) + (d.fini_le ? ' · prête le ' + esc(fmtCourt(new Date(d.fini_le))) : '') + (d.notifie_le ? ' · notifiée' : '') + '</span></div><b class="disp" style="font-size:22px">' + euros(d.prix) + '</b></div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' + etat + '</div><span class="small">' + info + '</span>' +
        (d.note ? '<span class="small" style="background:var(--soft);border-radius:10px;padding:8px 10px">' + esc(d.note) + '</span>' : '') +
        (d.telephone ? '<a class="small" href="tel:' + esc(d.telephone.replace(/\s/g, '')) + '" style="font-weight:600">' + esc(d.telephone) + '</a>' : '') + actions + '</section>';
    }).join('');
  } else {
    var mes = C.dem.filter(function (d) { return aMoi(d) && (statut === 'attente' ? d.statut === 'attente' : (d.statut === 'fini' || (d.statut === 'recupere' && !d.paye))); });
    mes.forEach(function (d) {
      var f = C.file.filter(function (x) { return x.id === d.id; })[0];
      h += '<section class="card stack" style="gap:8px;border:2px solid ' + (statut === 'attente' ? 'var(--ac)' : 'var(--ok)') + '"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:16px">' + esc(d.nom) + '</b><b class="disp" style="font-size:22px">' + euros(d.prix) + '</b></div>' +
        '<span class="small">' + (statut === 'attente' ? (f ? '<b>' + f.rang + (f.rang === 1 ? 're' : 'e') + ' dans la file</b> · ' : '') + 'déposée le ' + esc(fmtCourt(new Date(d.created_at))) : (d.statut === 'fini' ? '<b style="color:var(--ok)">Prête, elle t\'attend au club house</b>' : 'Récupérée') + (!d.paye ? ' · reste à régler' : '')) + '</span>' +
        '<span class="mut small">' + (d.fourni_par === 'club' ? esc(d.cordages ? d.cordages.nom : 'Cordage du club') : esc(d.cordage_perso || 'Cordage perso')) + (d.tension ? ' · ' + esc(d.tension) : '') + '</span>' +
        (statut === 'attente' ? '<button class="btn line" data-csup="' + d.id + '">Annuler ma demande</button>' : '') + '</section>';
    });
    if (statut === 'attente' && mes.length) h += blocPush(true);
    var file = C.file.filter(function (x) { return x.statut === statut; });
    h += '<div class="dayhead">' + (statut === 'attente' ? 'File d\'attente du club' : 'Raquettes prêtes au club house') + '</div>';
    h += file.length ? '<section class="card tight">' + file.map(function (x) {
      return '<div class="rk' + (x.a_moi ? ' me' : '') + '" style="grid-template-columns:34px minmax(0,1fr) auto"><span>' + x.rang + '</span><span>' + esc(x.joueur) + (x.a_moi ? ' <span class="xs" style="color:#6f43a0">· toi</span>' : '') + '</span><span class="mut xs">' +
        (statut === 'attente' ? (x.besoin_avant ? 'avant le ' + esc(fmtCourt(new Date(x.besoin_avant + 'T12:00:00'))) : 'déposée le ' + esc(fmtCourt(new Date(x.depose_le)))) : 'prête le ' + esc(fmtCourt(new Date(x.fini_le || x.depose_le)))) + '</span></div>';
    }).join('') + '</section>' : '<section class="card empty">' + (statut === 'attente' ? 'Aucune raquette en attente.' : 'Aucune raquette prête pour le moment.') + '</section>';
    if (statut === 'attente') h += '<a class="btn" href="#/cordage/deposer">Déposer une raquette</a>';
  }
  box.innerHTML = h;
  lierPush();
  var maj = function (id, champs, msg) {
    return q(sb.from('cordage_demandes').update(champs).eq('id', id)).then(function () { toast(msg); return chargerCordage(); }).then(function () { render(); }).catch(function () { toast('Action impossible'); });
  };
  var notifier = function (id) {
    return sb.functions.invoke('cordage-notifier', { body: { demande_id: id } }).then(function (r) {
      var d = r.data || {};
      if (r.error || d.erreur) toast('Notification non envoyée');
      else if (d.envoyes) toast('Notification envoyée sur ' + d.envoyes + ' appareil' + (d.envoyes > 1 ? 's' : ''));
      else toast('Pas de notif possible (' + (d.raison || 'non activées') + ') : utilise WhatsApp');
    }).catch(function () { toast('Notification non envoyée'); });
  };
  Array.prototype.forEach.call(box.querySelectorAll('[data-cfini]'), function (b) {
    b.onclick = function () {
      b.disabled = true; var id = b.dataset.cfini;
      q(sb.from('cordage_demandes').update({ statut: 'fini' }).eq('id', id)).then(function () {
        var d = C.dem.filter(function (x) { return x.id === id; })[0];
        return d && d.personne_id ? notifier(id) : toast('Raquette prête. Préviens le joueur par WhatsApp.');
      }).then(chargerCordage).then(function () { go('#/cordage/pretes'); }).catch(function () { toast('Action impossible'); b.disabled = false; });
    };
  });
  Array.prototype.forEach.call(box.querySelectorAll('[data-crec]'), function (b) { b.onclick = function () { maj(b.dataset.crec, { statut: 'recupere' }, 'Raquette récupérée'); }; });
  Array.prototype.forEach.call(box.querySelectorAll('[data-cpaye]'), function (b) { b.onclick = function () { maj(b.dataset.cpaye, { paye: true }, 'Paiement noté'); }; });
  Array.prototype.forEach.call(box.querySelectorAll('[data-cnotif]'), function (b) { b.onclick = function () { b.disabled = true; notifier(b.dataset.cnotif).then(chargerCordage).then(render); }; });
  Array.prototype.forEach.call(box.querySelectorAll('[data-csup]'), function (b) {
    b.onclick = function () {
      if (!confirm(cordeur ? 'Supprimer cette demande ?' : 'Annuler ta demande de cordage ?')) return;
      q(sb.from('cordage_demandes').delete().eq('id', b.dataset.csup)).then(function () { toast(cordeur ? 'Demande supprimée' : 'Demande annulée'); return chargerCordage(); }).then(render).catch(function () { toast('Action impossible'); });
    };
  });
}

function cordReglages(box) {
  var h = '<section class="card stack" style="gap:10px"><span class="eyebrow">Barème</span>' +
    '<label class="f">Pose seule (cordage apporté par le joueur), en €<div style="display:flex;gap:8px"><input class="f" id="cr-pose" inputmode="decimal" value="' + esc(String(tarifPose() == null ? '' : tarifPose()).replace('.', ',')) + '"><button class="btn" id="cr-pose-ok" style="width:auto">OK</button></div></label></section>' +
    '<section class="card stack" style="gap:10px"><span class="eyebrow">Cordages du club (pose comprise)</span>' +
    C.cordages.map(function (c) {
      return '<div class="stack" style="gap:6px;padding-bottom:10px;border-bottom:1px solid var(--line)"><input class="f" data-cnom="' + c.id + '" value="' + esc(c.nom) + '" aria-label="Nom du cordage">' +
        '<div style="display:flex;gap:8px;align-items:center"><input class="f" data-cprix="' + c.id + '" inputmode="decimal" value="' + esc(String(+c.prix).replace('.', ',')) + '" aria-label="Prix" style="width:110px"><span>€</span>' +
        '<label class="check" style="margin-left:auto"><input type="checkbox" data-cact="' + c.id + '"' + (c.actif ? ' checked' : '') + '>Proposé</label></div>' +
        '<button class="btn line" data-csave="' + c.id + '">Enregistrer</button></div>';
    }).join('') +
    '<b class="small">Ajouter un cordage</b><input class="f" id="cr-nom" placeholder="Ex. Tecnifibre X-One Biphase 1.30"><div style="display:flex;gap:8px"><input class="f" id="cr-prix" inputmode="decimal" placeholder="Prix en €"><button class="btn" id="cr-add" style="width:auto">Ajouter</button></div></section>';
  if (S.isDir) h += '<section class="card stack" style="gap:10px" id="cr-cordeurs"><span class="eyebrow">Cordeurs</span><span class="mut small">Chargement…</span></section>';
  box.innerHTML = h;
  var num = function (v) { var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) || n < 0 ? null : n; };
  var apres = function (msg) { toast(msg); chargerCordage().then(function () { cordReglages(box); }); };
  $('cr-pose-ok').onclick = function () {
    var n = num($('cr-pose').value); if (n == null) return toast('Prix invalide');
    q(sb.from('cordage_tarifs').update({ prix: n }).eq('code', 'pose')).then(function () { apres('Tarif enregistré'); }).catch(function () { toast('Action impossible'); });
  };
  Array.prototype.forEach.call(box.querySelectorAll('[data-csave]'), function (b) {
    b.onclick = function () {
      var id = b.dataset.csave, n = num(box.querySelector('[data-cprix="' + id + '"]').value), nom = box.querySelector('[data-cnom="' + id + '"]').value.trim();
      if (n == null || !nom) return toast('Nom ou prix invalide');
      q(sb.from('cordages').update({ nom: nom, prix: n, actif: box.querySelector('[data-cact="' + id + '"]').checked }).eq('id', id)).then(function () { apres('Cordage enregistré'); }).catch(function () { toast('Action impossible'); });
    };
  });
  $('cr-add').onclick = function () {
    var n = num($('cr-prix').value), nom = $('cr-nom').value.trim();
    if (n == null || !nom) return toast('Indique un nom et un prix');
    q(sb.from('cordages').insert({ nom: nom, prix: n, ordre: C.cordages.length + 1 })).then(function () { apres('Cordage ajouté'); }).catch(function () { toast('Action impossible'); });
  };
  if (S.isDir) {
    var dessiner = function () {
      q(sb.rpc('cordeurs_liste')).then(function (l) {
        $('cr-cordeurs').innerHTML = '<span class="eyebrow">Cordeurs</span><span class="mut small">Ils voient toutes les demandes et préviennent les joueurs. La direction sportive a aussi ces droits.</span>' +
          (l.length ? l.map(function (c) { return '<div class="row"><span class="small">' + esc(c.email) + '</span><button class="chip" data-cret="' + c.user_id + '">Retirer</button></div>'; }).join('') : '<span class="small">Aucun cordeur pour l\'instant.</span>') +
          '<label class="f">Adresse mail du cordeur<input class="f" id="cr-mail" type="email" placeholder="Il doit s\'être connecté une fois à l\'appli"></label><button class="btn navy" id="cr-addc">Ajouter comme cordeur</button>';
        Array.prototype.forEach.call(document.querySelectorAll('[data-cret]'), function (b) { b.onclick = function () { q(sb.rpc('cordeur_retirer', { u: b.dataset.cret })).then(function () { toast('Cordeur retiré'); dessiner(); }); }; });
        $('cr-addc').onclick = function () {
          var m = $('cr-mail').value.trim(); if (!m) return;
          q(sb.rpc('cordeur_ajouter', { mail: m })).then(function (r) {
            if (r === 'inconnu') toast('Cette personne doit d\'abord se connecter une fois à l\'appli'); else { toast('Cordeur ajouté'); dessiner(); }
          }).catch(function () { toast('Action impossible'); });
        };
      }).catch(function () { $('cr-cordeurs').innerHTML = '<span class="mut small">Impossible de charger les cordeurs.</span>'; });
    };
    dessiner();
  }
}

// Notifications push sur cet appareil
function pushPossible() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
function estIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
function estInstallee() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
// Installation de l'appli (Android / Chrome) : la notification affiche alors « CLOCA Tennis » au lieu de l'adresse du site
var INSTALL = null;
window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); INSTALL = e; });
function blocInstaller() {
  if (estInstallee() || !INSTALL) return '';
  return '<section class="card stack" style="gap:8px"><b>Installer l\'appli sur ce téléphone</b><span class="mut small">Elle s\'ouvre comme une vraie appli, et les notifications s\'affichent au nom de « CLOCA Tennis ».</span><button class="btn navy" id="install-go">Installer CLOCA Tennis</button></section>';
}
function lierInstaller() {
  var b = $('install-go'); if (!b) return;
  b.onclick = function () { INSTALL.prompt(); INSTALL.userChoice.then(function (r) { INSTALL = null; if (r.outcome === 'accepted') toast('Appli installée'); render(); }); };
}
function blocPush(compact) {
  if (!S.user) return '';
  if (pushPossible() && Notification.permission === 'granted' && localStorageGet('cloca-push') === S.user.id) return compact ? '' : '<section class="card"><span class="small" style="color:var(--ok)">✓ Les notifications sont activées sur cet appareil.</span></section>';
  if (estIos() && !estInstallee()) return '<section class="card stack" style="gap:6px"><b>Être prévenu sur ton iPhone</b><span class="mut small">Installe d\'abord l\'appli : dans Safari, bouton Partager, puis « Sur l\'écran d\'accueil ». Ouvre-la depuis l\'icône et active les notifications. Sinon, le club te préviendra par WhatsApp.</span></section>';
  if (!pushPossible()) return '<section class="card"><span class="mut small">Ce navigateur ne gère pas les notifications : le club te préviendra par WhatsApp.</span></section>';
  if (Notification.permission === 'denied') return '<section class="card"><span class="mut small">Les notifications sont bloquées pour l\'appli dans les réglages de ton navigateur. Le club te préviendra par WhatsApp.</span></section>';
  return '<section class="card stack" style="gap:8px"><b>Être prévenu dès que c\'est prêt</b><span class="mut small">Active les notifications sur ce téléphone.</span><button class="btn navy" id="push-on">Activer les notifications</button></section>';
}
function localStorageGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function localStorageSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
function b64u(s) { var p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
function swEnregistrer() { return navigator.serviceWorker.register('sw.js', { scope: './' }); }
function activerPush() {
  return Notification.requestPermission().then(function (perm) {
    if (perm !== 'granted') throw new Error('refus');
    return swEnregistrer().then(function () { return navigator.serviceWorker.ready; });
  }).then(function (reg) {
    return reg.pushManager.getSubscription().then(function (s) { return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(VAPID_PUBLIC) }); });
  }).then(function (sub) {
    var j = sub.toJSON();
    return q(sb.rpc('push_enregistrer', { endpoint: j.endpoint, p256dh: j.keys.p256dh, cle: j.keys.auth, appareil: navigator.userAgent }));
  }).then(function () { localStorageSet('cloca-push', S.user.id); });
}
function oublierPush() {
  if (!pushPossible() || !navigator.serviceWorker.controller) return Promise.resolve();
  return navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
    localStorageSet('cloca-push', '');
    return sub ? sb.from('push_abonnements').delete().eq('endpoint', sub.endpoint) : null;
  }).catch(function () { });
}
function lierPush() {
  var b = $('push-on'); if (!b) return;
  b.onclick = function () {
    b.disabled = true;
    activerPush().then(function () { toast('Notifications activées'); b.parentNode.innerHTML = '<span class="small" style="color:var(--ok)">✓ Les notifications sont activées sur cet appareil.</span>'; })
      .catch(function (e) { b.disabled = false; toast(e && e.message === 'refus' ? 'Notifications refusées' : 'Activation impossible sur cet appareil'); });
  };
}

// ---------- Présence au club (rouge / orange / vert) ----------
var PRES = null, PRES_T = 0;
var ETATS = {
  ouvert: { c: '#1f8a4c', t: 'Club house ouvert', d: 'Quelqu\'un est à l\'accueil pour te rendre ta raquette.' },
  coach: { c: '#d9822b', t: 'Un coach est au club', d: 'Il est sur le terrain : pas toujours disponible pour rendre une raquette.' },
  ferme: { c: '#c62f2f', t: 'Personne au club', d: 'Personne n\'est présent pour le moment.' }
};
function chargerPresence(force) {
  if (!force && PRES && Date.now() - PRES_T < 60e3) return Promise.resolve(PRES);
  return q(sb.from('club_presence').select('etat, jusqua, message, maj_le').eq('id', 1).maybeSingle()).then(function (p) { PRES = p; PRES_T = Date.now(); return p; });
}
// Horaires habituels (jour : 1 = lundi … 7 = dimanche)
var HORAIRES = {
  clubhouse: { 3: [['09:30', '12:00'], ['14:00', '16:30']], 6: [['09:30', '12:00'], ['14:00', '16:30']] },
  coach: { 1: [['17:30', '22:45']], 2: [['17:30', '22:45']], 3: [['09:00', '21:00']], 4: [['17:30', '22:15']], 5: [['17:30', '22:45']], 6: [['09:00', '16:00']] }
};
var JOURS = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
function aHeure(j, hm) { var x = new Date(j), t = hm.split(':'); x.setHours(+t[0], +t[1], 0, 0); return x; }
function creneauEnCours(type, now) {
  now = now || new Date(); var js = now.getDay() || 7;
  var l = (HORAIRES[type][js] || []).map(function (c) { return { debut: aHeure(now, c[0]), fin: aHeure(now, c[1]) }; });
  return l.filter(function (c) { return now >= c.debut && now < c.fin; })[0] || null;
}
function prochainCreneau(type) {
  var now = new Date();
  for (var k = 0; k < 8; k++) {
    var j = new Date(now); j.setDate(j.getDate() + k); var js = j.getDay() || 7;
    var c = (HORAIRES[type][js] || []).map(function (x) { return aHeure(j, x[0]); }).filter(function (d) { return d > now; })[0];
    if (c) return c;
  }
  return null;
}
function quandTexte(d) {
  var auj = debutJour(new Date()), dj = debutJour(d), n = Math.round((dj - auj) / 864e5);
  return (n === 0 ? 'aujourd\'hui' : n === 1 ? 'demain' : JOURS[d.getDay() || 7]) + ' à ' + fmtH(d);
}
// Ce qu'on affiche : la mise à jour manuelle tant qu'elle court, sinon les horaires des cours
function etatAffiche(p) {
  var now = new Date();
  if (p && p.jusqua && new Date(p.jusqua) > now) return { etat: p.etat, fin: new Date(p.jusqua), manuel: true, message: p.message };
  var c = creneauEnCours('coach');
  if (c) return { etat: 'coach', fin: c.fin, auto: true };
  return { etat: 'ferme', prochain: prochainCreneau('coach') };
}
function estEquipe() { return S.user && S.roles.length > 0; }
function remplirPresence() {
  var box = $('presence'); if (!box || !sb) return;
  chargerPresence().then(function (p) {
    if (!$('presence')) return;
    var A = etatAffiche(p), E = ETATS[A.etat], ch = creneauEnCours('clubhouse');
    var h = '<section class="card stack" style="gap:6px"><div style="display:flex;gap:10px;align-items:center"><span class="dot" style="width:14px;height:14px;background:' + E.c + ';box-shadow:0 0 0 4px ' + E.c + '33"></span>' +
      '<b>' + E.t + (A.fin ? ' jusqu\'à ' + fmtH(A.fin) : '') + '</b></div>' +
      '<span class="mut small">' + E.d + (A.etat === 'ferme' && A.prochain ? ' Prochain créneau : ' + quandTexte(A.prochain) + '.' : '') + '</span>' +
      (A.message ? '<span class="small">' + esc(A.message) + '</span>' : '') +
      (A.etat === 'coach' && ch ? '<span class="mut xs">Le club house ouvre normalement à cette heure : l\'accueil le confirmera ici.</span>' : '') +
      (A.manuel && p.maj_le ? '<span class="mut xs">Mis à jour à ' + fmtH(new Date(p.maj_le)) + '</span>' : A.auto ? '<span class="mut xs">D\'après les horaires des cours</span>' : '');
    if (estEquipe()) {
      var finCh = ch ? ch.fin : new Date(Date.now() + 2 * 3600e3);
      h += A.etat === 'ouvert' && A.manuel
        ? '<button class="btn line" id="pres-fermer" style="margin-top:4px">Je ferme le club house</button>'
        : '<button class="btn" id="pres-ouvrir" style="margin-top:4px;background:#1f8a4c">J\'ouvre le club house' + (ch ? ' jusqu\'à ' + fmtH(ch.fin) : '') + '</button>';
      h += '<button class="btn ghost" id="pres-edit">Autre mise à jour</button>';
    }
    box.innerHTML = h + '</section>';
    var maj = function (row, msg) { q(sb.from('club_presence').update(row).eq('id', 1)).then(function () { toast(msg); return chargerPresence(true); }).then(remplirPresence).catch(function () { toast('Mise à jour impossible'); }); };
    if ($('pres-ouvrir')) $('pres-ouvrir').onclick = function () { if (!ch) finCh.setMinutes(Math.ceil(finCh.getMinutes() / 15) * 15, 0, 0); maj({ etat: 'ouvert', jusqua: finCh.toISOString(), message: null }, 'Club house ouvert'); };
    if ($('pres-fermer')) $('pres-fermer').onclick = function () { maj({ etat: 'ferme', jusqua: null, message: null }, 'Club house fermé'); };
    if ($('pres-edit')) $('pres-edit').onclick = function () { editerPresence(box, p, A.etat); };
  }).catch(function () { box.innerHTML = ''; });
}
function editerPresence(box, p, e) {
  var choix = e, fin = new Date(Date.now() + 2 * 3600e3); fin.setMinutes(Math.ceil(fin.getMinutes() / 15) * 15, 0, 0);
  var heure = p && p.jusqua && new Date(p.jusqua) > new Date() ? fmtH(new Date(p.jusqua)).replace('h', ':') : ('0' + fin.getHours()).slice(-2) + ':' + ('0' + fin.getMinutes()).slice(-2);
  var dessiner = function () {
    box.innerHTML = '<section class="card stack" style="gap:10px"><b>Qui est au club ?</b>' + ['ouvert', 'coach', 'ferme'].map(function (k) {
      return '<button type="button" class="pick' + (choix === k ? ' on' : '') + '" data-pres="' + k + '" style="width:100%;text-align:left;background:' + (choix === k ? 'var(--sun)' : 'var(--card)') + '"><span class="dot" style="background:' + ETATS[k].c + ';margin-right:10px"></span>' + ETATS[k].t + '</button>';
    }).join('') +
      '<label class="f">Jusqu\'à<input class="f" type="time" id="pres-h" value="' + heure + '" step="900"></label>' +
      (choix !== 'ferme' ? '<label class="f">Message (facultatif)<input class="f" id="pres-m" maxlength="120" value="' + esc(p && p.message || '') + '" placeholder="Ex. raquettes à récupérer au bureau"></label>' : '<span class="mut xs">Exemple : cours annulé, personne au club jusqu\'à l\'heure indiquée.</span>') +
      '<button class="btn line" id="pres-auto">Revenir aux horaires habituels</button>' +
      '<div class="grid2"><button class="btn line" id="pres-annul">Annuler</button><button class="btn" id="pres-ok">Enregistrer</button></div></section>';
    Array.prototype.forEach.call(box.querySelectorAll('[data-pres]'), function (b) { b.onclick = function () { heure = $('pres-h').value; choix = b.dataset.pres; dessiner(); }; });
    var envoyer = function (row, msg) { q(sb.from('club_presence').update(row).eq('id', 1)).then(function () { toast(msg); return chargerPresence(true); }).then(remplirPresence).catch(function () { toast('Mise à jour impossible'); }); };
    $('pres-annul').onclick = remplirPresence;
    $('pres-auto').onclick = function () { envoyer({ etat: 'ferme', jusqua: null, message: null }, 'Horaires habituels rétablis'); };
    $('pres-ok').onclick = function () {
      var hm = ($('pres-h').value || '').split(':'); if (hm.length < 2) return toast('Indique jusqu\'à quelle heure');
      var j = new Date(); j.setHours(+hm[0], +hm[1], 0, 0); if (j <= new Date()) return toast('L\'heure doit être après maintenant');
      envoyer({ etat: choix, jusqua: j.toISOString(), message: choix !== 'ferme' ? (($('pres-m').value || '').trim() || null) : null }, 'Présence mise à jour');
    };
  };
  dessiner();
}
function infosAtelier() {
  return '<section class="card stack" style="gap:8px"><span class="eyebrow">Atelier cordage du club</span>' +
    '<div class="row" style="padding:6px 0;border:0"><span class="mut small">Cordeur officiel</span><b class="small">Skander</b></div>' +
    '<div class="row" style="padding:6px 0"><span class="mut small">Jours de cordage</span><b class="small" style="text-align:right">Vendredi soir et samedi après-midi</b></div>' +
    '<div class="row" style="padding:6px 0"><span class="mut small">Paiement</span><b class="small">En espèces, au retrait</b></div>' +
    '<span class="mut xs">Remplis le formulaire, laisse ta raquette au club house avec une étiquette à ton nom : tu es prévenu dès qu\'elle est cordée.</span></section>';
}

// ---------- Routeur ----------
function render() {
  var parts = (location.hash || '#/accueil').replace(/^#\/?/, '').split('/');
  var p = parts[0] || 'accueil', arg = parts[1];
  var html, actif = p;
  if (p === 'agenda') html = pageAgenda();
  else if (p === 'arena') html = pageArena();
  else if (p === 'fiche') { html = pageFiche(arg); actif = 'arena'; }
  else if (p === 'club') html = pageClub(arg);
  else if (p === 'evenement') { html = pageEvenement(arg); actif = 'club'; }
  else if (p === 'profil') html = pageProfil();
  else if (p === 'gestion') html = pageGestion();
  else if (p === 'cordage') { html = pageCordage(arg); actif = 'accueil'; }
  else { html = pageAccueil(); actif = 'accueil'; setTimeout(function () { lierSel(); remplirPresence(); }); }
  $('app').innerHTML = html;
  tabs(actif);
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', render);

function demarrer() {
  if (!sb) { $('app').innerHTML = '<main><section class="card empty">Connexion au club impossible pour le moment. Vérifie ta connexion internet.</section></main>'; return; }
  sb.auth.getSession().then(function (r) {
    S.user = r.data && r.data.session ? r.data.session.user : null;
    return Promise.all([chargerPublic(), chargerUtilisateur()]);
  }).then(function () { return Promise.all([chargerAgenda(), chargerClassement().catch(function () { }), chargerCordage().catch(function () { })]); })
    .then(render).catch(render);
  sb.auth.onAuthStateChange(function (ev, session) {
    if (ev === 'SIGNED_IN' && (!S.user || S.user.id !== session.user.id)) {
      S.user = session.user;
      chargerUtilisateur().then(chargerAgenda).then(function () { return chargerCordage().catch(function () { }); }).then(function () { go(location.hash.indexOf('profil') >= 0 ? '#/accueil' : location.hash || '#/accueil'); });
    }
  });
}
demarrer();
if ('serviceWorker' in navigator) window.addEventListener('load', function () { swEnregistrer().catch(function () { }); });
})();
