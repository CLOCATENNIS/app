/* CLOCA Tennis — nouvelle appli (version de test)
   Données : base Supabase du club. Les droits sont appliqués par la base elle-même. */
(function () {
'use strict';

// ---------- Réglages ----------
var SUPA_URL = 'https://ccvfdsriogqerdcopuuv.supabase.co';
var SUPA_KEY = 'sb_publishable_01H1gmGMH3t4XLqD1EeTeg_ErdW1VvM';
var LEGACY_URL = 'https://script.google.com/macros/s/AKfycbw1SHjhfBL1mLDN9weJ1dJOR0RkSIoMF7TPUhIv5A20_Pkt0LJpvz2KdeWQALGjPRGz/exec'; // petites annonces (encore sur Google)
var ADOC_URL = 'https://tenup.fft.fr/club/57780019/reservations';
var INSTAGRAM_URL = 'https://www.instagram.com/cloc.acheres.tennis?cplk=Mnd4OTkwdWFjdGZz';
var FACEBOOK_URL = 'https://www.facebook.com/ClocaTennis/';
var WA_CLUB = '33662488087';
var LOGO = '../logo.png';
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
    q(sb.from('evenements').select('*, groupes(nom,couleur), evenement_groupes(groupe_id, groupes(nom,couleur))').gte('debut', depuis.toISOString()).order('debut')).catch(function () { return []; })
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
      items.push({ d: d, f: f, titre: cr.groupes ? cr.groupes.nom : 'Cours', lieu: cr.lieu, enc: cr.encadrant, statut: 'prevu', qui: qui, gs: cr.groupes ? [cr.groupes] : [] });
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
    '<a class="tile" href="#/club">' + ic('club', 24) + '<b>Vie du club</b><span class="mut small">Actus, annonces, infos</span></a></div>';

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
  if (items.length) h += '<button class="btn line" id="ics-semaine">' + ic('dl', 18) + 'Ajouter cette semaine à mon téléphone</button>';
  h += '<p class="mut xs" style="text-align:center;margin:2px 0 8px">La synchronisation automatique avec ton agenda arrive bientôt.</p></main>';
  setTimeout(function () {
    $('wk-prev').onclick = function () { S.week--; render(); };
    $('wk-next').onclick = function () { S.week++; render(); };
    if ($('ics-semaine')) $('ics-semaine').onclick = function () { telechargerIcs(items, 'agenda-cloca-tennis.ics'); };
    lierSel();
  });
  return h;
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
    else if (S.clubTab === 'infos') box.innerHTML = clubInfos();
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
    '<section class="card stack" style="gap:6px"><span class="eyebrow">Club house</span><b>Ouvert le mercredi et le samedi</b><span class="mut">9h30 – 12h et 14h – 16h30</span><a class="btn ghost" href="tel:+33139116947">01 39 11 69 47</a></section>' +
    '<section class="card stack" style="gap:6px"><span class="eyebrow">Coordinateur sportif</span><b>Dorian</b><a class="btn" target="_blank" rel="noopener" href="https://wa.me/' + WA_CLUB + '">WhatsApp</a>' +
    '<div class="grid2"><a class="btn line" href="tel:+' + WA_CLUB + '">Appeler</a><a class="btn line" href="sms:+' + WA_CLUB + '">SMS</a></div></section>' +
    '<section class="card stack" style="gap:6px"><span class="eyebrow">Installer l\'appli</span><span class="small"><b>iPhone</b> : dans Safari, bouton Partager, puis « Sur l\'écran d\'accueil ».<br><b>Android</b> : dans Chrome, menu ⋮, puis « Installer l\'application ».</span></section>' +
    suivre() + '<p class="mut xs" style="text-align:center"><a href="../confidentialite.html" style="color:var(--mut)">Politique de confidentialité</a></p>';
}
// Petites annonces : encore servies par le tableau Google, le temps de les migrer
function clubAnnonces(box) {
  box.innerHTML = '<div class="skel"></div>';
  Promise.all([
    fetch(LEGACY_URL + '?format=vente').then(function (r) { return r.json(); }).catch(function () { return null; }),
    fetch(LEGACY_URL + '?format=partenaires').then(function (r) { return r.json(); }).catch(function () { return null; })
  ]).then(function (r) {
    var vente = r[0] || [], part = r[1] || [];
    var wa = function (t) { return 'https://wa.me/' + WA_CLUB + '?text=' + encodeURIComponent(t); };
    var h = '<div class="dayhead">Recherche de partenaire</div>' + (part.length ? part.map(function (p) {
      return '<section class="card stack" style="gap:6px"><div style="display:flex;justify-content:space-between;gap:8px"><b>' + esc(p.prenom) + '</b>' + (NIV[p.niveau] ? niveauBadge(p.niveau) : '<span class="badge" style="background:var(--soft)">' + esc(p.niveau) + '</span>') + '</div>' +
        '<span class="mut small">' + esc(p.dispo) + '</span>' + (p.message ? '<span class="small">' + esc(p.message) + '</span>' : '') +
        '<a class="btn" target="_blank" rel="noopener" href="' + esc(wa('Bonjour, je suis intéressé(e) par la demande de partenaire n°' + p.ref + ' (' + p.prenom + ', ' + p.niveau + '). Pouvez-vous nous mettre en relation ?')) + '">Me mettre en relation</a></section>';
    }).join('') : '<section class="card empty">Aucune demande pour le moment.</section>') +
      '<a class="btn line" href="../">Déposer une demande (sur l\'appli actuelle)</a>' +
      '<div class="dayhead">Matériel à vendre</div>' + (vente.length ? vente.map(function (v) {
        return '<section class="card stack" style="gap:6px"><b>' + esc(v.titre) + '</b>' + (v.prix ? '<span class="badge" style="background:var(--ac);color:#fff;align-self:flex-start">' + esc(v.prix) + '</span>' : '') +
          (v.description ? '<span class="mut small">' + esc(v.description) + '</span>' : '') +
          '<a class="btn" target="_blank" rel="noopener" href="' + esc('https://wa.me/' + encodeURIComponent(v.wa || WA_CLUB) + '?text=' + encodeURIComponent('Bonjour, je suis intéressé(e) par : ' + v.titre)) + '">Contacter sur WhatsApp</a></section>';
      }).join('') : '<section class="card empty">Aucun article à vendre pour le moment.</section>') +
      '<p class="mut xs" style="text-align:center">Les numéros ne sont jamais affichés : le club fait la mise en relation.</p>';
    box.innerHTML = h;
  });
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
  if (S.roles.length) h += '<section class="card stack" style="gap:8px"><span class="eyebrow">Mes responsabilités</span><span>' + S.roles.map(function (r) { return { direction: 'Direction sportive', bureau: 'Bureau', accueil: 'Accueil', coach: 'Coach', responsable: 'Responsable' }[r.role]; }).join(', ') + '</span><a class="btn navy" href="#/gestion">' + ic('tool', 18, '#fff') + 'Espace gestion</a></section>';
  h += '<section class="card stack" style="gap:4px"><span class="eyebrow">Connecté avec</span><span>' + esc(S.user.email) + '</span></section>' +
    '<button class="btn line" id="logout">Se déconnecter</button><p class="mut xs" style="text-align:center"><a href="../confidentialite.html" style="color:var(--mut)">Politique de confidentialité</a></p></main>';
  setTimeout(function () { $('logout').onclick = function () { sb.auth.signOut().then(function () { S.user = null; chargerUtilisateur().then(function () { go('#/accueil'); }); }); }; });
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
    '<div class="seg" style="margin-top:14px">' + [['saisir', 'Saisir'], ['valider', 'À valider'], ['recents', 'Récents']].map(function (t) {
      return '<button data-gtab="' + t[0] + '" class="' + (S.gesTab === t[0] ? 'on' : '') + '">' + t[1] + '</button>';
    }).join('') + '</div></div></div><main id="ges-main"><div class="skel"></div></main>';
  setTimeout(function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-gtab]'), function (b) { b.onclick = function () { S.gesTab = b.dataset.gtab; render(); }; });
    Promise.all([chargerJoueurs(), chargerFormats()]).then(function () {
      if (S.gesTab === 'saisir') gesSaisir(); else if (S.gesTab === 'valider') gesListe('propose'); else gesListe('valide');
    }).catch(function () { $('ges-main').innerHTML = '<section class="card empty">Impossible de charger les joueurs.</section>'; });
  });
  return h + '<p class="mut xs" style="text-align:center;margin:12px"><a href="#/profil" style="color:var(--mut)">Mon profil et déconnexion</a></p>';
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
  if (!G.form) G.form = { date: isoJour(new Date()), format: 'FLASH MATCH', niv: '', e1: ['', ''], e2: ['', ''], inv: {}, score: '' };
  var F = G.form, fmt = S.formats.filter(function (x) { return x.code === F.format; })[0] || S.formats[0], dbl = fmt && fmt.double;
  var liste = G.joueurs.filter(function (j) { return !F.niv || j.niveau_arena === F.niv; });
  var options = function (val) {
    return '<option value="">Choisir…</option>' + liste.map(function (j) { return '<option value="' + j.id + '"' + (j.id === val ? ' selected' : '') + '>' + esc(j.prenom + ' ' + j.nom) + (F.niv ? '' : ' · ' + esc(j.niveau_arena || '')) + '</option>'; }).join('');
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
    '<section class="card stack" style="gap:10px"><span class="eyebrow">Joueurs</span><div class="chips"><button class="chip ' + (!F.niv ? 'on' : '') + '" data-gniv="">Tous niveaux</button>' + NIVEAUX.map(function (n) { return '<button class="chip ' + (F.niv === n ? 'on' : '') + '" data-gniv="' + n + '">' + n + '</button>'; }).join('') + '</div>' +
    '<b class="small">' + (dbl ? 'Équipe 1' : 'Joueur 1') + '</b>' + ligne(1, 0) + (dbl ? ligne(1, 1) : '') +
    '<b class="small">' + (dbl ? 'Équipe 2' : 'Joueur 2') + '</b>' + ligne(2, 0) + (dbl ? ligne(2, 1) : '') +
    '<label class="f">Score (côté ' + (dbl ? 'équipe 1' : 'joueur 1') + ', sets séparés par un espace)<input class="f" id="g-score" inputmode="numeric" placeholder="7-4  ou  6-3 4-6 10-8" value="' + esc(F.score) + '"></label>' +
    '<p class="small" style="margin:0;color:' + (lu ? 'var(--ok)' : 'var(--mut)') + '" id="g-prev">' + (lu ? '🏆 ' + esc(nomEq(lu.vainqueur)) + ' gagne ' + esc(scorePour(lu.score, lu.vainqueur)) : 'Tape le score pour voir le vainqueur.') + '</p>' +
    '<button class="btn" id="g-save">' + (S.isDir ? 'Enregistrer et valider' : 'Proposer ce score') + '</button>' +
    (S.isDir ? '' : '<p class="mut xs" style="margin:0">Le score sera ajouté au classement après validation par la direction sportive.</p>') + '</section>';
  $('g-date').onchange = function () { F.date = this.value; };
  Array.prototype.forEach.call(box.querySelectorAll('[data-fmt]'), function (b) { b.onclick = function () { F.format = b.dataset.fmt; gesSaisir(); }; });
  Array.prototype.forEach.call(box.querySelectorAll('[data-gniv]'), function (b) { b.onclick = function () { F.niv = b.dataset.gniv; gesSaisir(); }; });
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
  else { html = pageAccueil(); actif = 'accueil'; setTimeout(lierSel); }
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
  }).then(function () { return Promise.all([chargerAgenda(), chargerClassement().catch(function () { })]); })
    .then(render).catch(render);
  sb.auth.onAuthStateChange(function (ev, session) {
    if (ev === 'SIGNED_IN' && (!S.user || S.user.id !== session.user.id)) {
      S.user = session.user;
      chargerUtilisateur().then(chargerAgenda).then(function () { go(location.hash.indexOf('profil') >= 0 ? '#/accueil' : location.hash || '#/accueil'); });
    }
  });
}
demarrer();
})();
