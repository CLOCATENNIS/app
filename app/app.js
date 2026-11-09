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
function toast(t) { if (S.apercuT && Date.now() - S.apercuT < 1500 && t.indexOf('Aperçu') < 0) return; var d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2600); }
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
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  home: '<path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10z"/>',
  cal: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  club: '<path d="M3 11l18-8-6 18-3-8-9-2z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  check: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  back: '<path d="M15 18l-6-6 6-6"/>', next: '<path d="M9 18l6-6-6-6"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
  mute: '<path d="M18 8a6 6 0 0 0-9.3-5M6 8c0 7-3 9-3 9h14"/><path d="M13.7 21a2 2 0 0 1-3.4 0M3 3l18 18"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5h.01"/>',
  dl: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  racket: '<ellipse cx="14" cy="9" rx="6" ry="7" transform="rotate(35 14 9)"/><path d="M9.5 13.5L3 20M11 6l6 6M9 9l6 6M12 4l4 8"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M15 20a4.5 4.5 0 0 1 6-4.2"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  wa: '<path d="M3 21l1.7-4.6A8.5 8.5 0 1 1 8 19.6L3 21z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1.2-1.6-2-1-.9.9a4.5 4.5 0 0 1-2.6-2.6l.9-.9-1-2L9 8.5z"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4.5L17 13H5"/>'
};
function ic(n, size, color) {
  return '<svg width="' + (size || 22) + '" height="' + (size || 22) + '" viewBox="0 0 24 24" fill="none" stroke="' + (color || 'currentColor') +
    '" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>';
}

// ---------- Données ----------
function q(p) { return p.then(function (r) { if (r.error) throw r.error; return r.data; }); }
// Aperçu d'une famille (direction) : on lit ses données, on n'écrit jamais rien
if (sb) (function () {
  var from = sb.from.bind(sb), rpc = sb.rpc.bind(sb);
  var bloque = function () {
    toast('Aperçu : rien n\'est enregistré'); S.apercuT = Date.now();
    var f = { then: function (ok, ko) { return Promise.resolve({ data: null, error: { message: 'apercu' } }).then(ok, ko); } };
    ['eq', 'neq', 'in', 'is', 'match', 'select', 'single', 'maybeSingle', 'order', 'limit'].forEach(function (m) { f[m] = function () { return f; }; });
    return f;
  };
  sb.from = function (t) {
    var b = from(t);
    if (S.apercu) ['insert', 'update', 'delete', 'upsert'].forEach(function (m) { b[m] = bloque; });
    return b;
  };
  sb.rpc = function (n, a) { return S.apercu && /enregistrer|nouveau_lien|changer|ajouter|retirer|deposer|notifier|envoyer|messages_lus|declarer/.test(n) ? bloque() : rpc(n, a); };
})();

function chargerPublic() {
  if (!sb) return Promise.resolve();
  var depuis = new Date(); depuis.setDate(depuis.getDate() - 60);
  return Promise.all([
    q(sb.from('publications').select('*').order('epingle', { ascending: false }).order('publie_le', { ascending: false }).limit(20)).catch(function () { return []; }),
    q(sb.from('evenements').select('*, groupes!evenements_groupe_id_fkey(nom,couleur), evenement_groupes(groupe_id, groupes(nom,couleur))').gte('debut', depuis.toISOString()).order('debut')).catch(function () { return []; }),
    q(sb.from('fetes').select('*').eq('actif', true).order('debut')).catch(function () { return []; })
  ]).then(function (r) { S.pubs = r[0]; S.evts = r[1]; S.fetes = r[2]; return q(sb.from('reglages_publics').select('cle, valeur')).catch(function () { return []; }); })
    .then(function (l) { S.reglages = {}; (l || []).forEach(function (x) { S.reglages[x.cle] = x.valeur; }); appliquerReglages(); });
}
// Réglages modifiables depuis l'espace gestion (Administration → Réglages de l'appli)
function reg(k, def) { var v = S.reglages && S.reglages[k]; return v == null || v === '' ? def : v; }
function appliquerReglages() {
  if (reg('horaires_clubhouse')) HORAIRES.clubhouse = reg('horaires_clubhouse');
  if (reg('horaires_coach')) HORAIRES.coach = reg('horaires_coach');
  if (reg('wa_club') && telWa(reg('wa_club'))) WA_CLUB = telWa(reg('wa_club'));
}
// Le cordage via l'appli peut être mis en pause par le club (prix pas encore prêts…) ; l'équipe garde l'accès
function cordageOuvert() { return !S.reglages || S.reglages.cordage_ouvert !== false || (S.user && (estCordeur() || S.isStaff)); }

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
    var cible = S.apercu && S.isDir ? { foyer_id: S.apercu.foyer, personne_id: null } : S.compte;
    if (!S.isDir) S.apercu = null;
    if (S.apercu) { S.roles = []; S.isStaff = false; S.isDir = false; S.gere = []; } // l'appli exactement comme un parent
    var champs = 'id, prenom, nom, sexe, profil, niveau_arena, foyer_id, groupe_membres(groupe_id, groupes(nom,couleur,type))';
    // Qui suit qui : un adulte voit sa fiche et les mineurs de sa famille (la règle est appliquée par la base)
    var liste = S.apercu ? q(sb.from('personnes').select(champs).eq('foyer_id', cible.foyer_id).order('prenom'))
      : q(sb.rpc('mes_personnes_ids')).then(function (ids) {
        ids = (ids || []).map(function (x) { return typeof x === 'string' ? x : x.mes_personnes_ids; });
        return ids.length ? q(sb.from('personnes').select(champs).in('id', ids).order('prenom')) : [];
      });
    if (!S.apercu && (!cible || (!cible.foyer_id && !cible.personne_id))) return;
    return liste.then(function (pers) {
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
  if (!ev.inscription_ouverte) evGroupes(ev).ids.forEach(function (g) { (S.groupesDe[g] || []).forEach(function (p) { if (qui.indexOf(p) < 0) qui.push(p); }); });
  (insc || []).forEach(function (i) {
    if (i.evenement_id !== ev.id || (i.statut !== 'inscrit' && i.statut !== 'attente')) return;
    var p = S.pers.filter(function (x) { return x.id === i.personne_id; })[0];
    if (p && qui.indexOf(p) < 0) qui.push(p);
  });
  if (S.sel !== 'all') qui = qui.filter(function (p) { return p.id === S.sel; });
  return qui;
}

// Qui de la famille peut s'inscrire : les membres des groupes visés, ou tout le monde si l'événement n'a pas de groupe
function eligibles(ev) {
  var ids = evGroupes(ev).ids;
  return S.pers.filter(function (p) { return !ids.length || ids.some(function (g) { return (S.groupesDe[g] || []).indexOf(p) >= 0; }); });
}
function inscOuverte(ev) { return ev.inscription_ouverte && ev.statut !== 'annule' && new Date(ev.debut) > new Date(); }
function monInsc(ev, p) { return ((AG && AG.insc) || []).filter(function (i) { return i.evenement_id === ev.id && i.personne_id === p.id && i.statut !== 'annule'; })[0]; }

// Une seule séance CLOC'ARENA sur inscription à venir par joueur : la prochaine se réserve une fois celle-ci passée
function seanceAVenir(p, sauf) {
  var now = new Date();
  return ((AG && AG.insc) || []).map(function (i) {
    if (i.personne_id !== p.id || i.evenement_id === sauf || (i.statut !== 'inscrit' && i.statut !== 'attente')) return null;
    var e = (S.evts || []).filter(function (x) { return x.id === i.evenement_id; })[0];
    return e && e.type === 'seance' && e.statut !== 'annule' && new Date(e.fin || (new Date(e.debut).getTime() + 3600e3)) > now ? e : null;
  }).filter(Boolean)[0] || null;
}
function blocage(ev, p) {
  if (ev.type !== 'seance') return '';
  var x = seanceAVenir(p, ev.id);
  return x ? 'Déjà inscrit' + (p.sexe === 'F' ? 'e' : '') + ' le ' + fmtJour(new Date(x.debut)).toLowerCase() + ' : une séance à la fois' : '';
}
// État d'inscription lisible, enfant par enfant
function etatInsc(ev, qui) {
  if (!S.user || !qui || !qui.length || !ev.inscription_ouverte || ev.statut === 'annule') return '';
  var passe = new Date(ev.debut) <= new Date();
  return '<span class="stack" style="gap:2px">' + qui.map(function (p) {
    var i = monInsc(ev, p), nom = qui.length > 1 || S.pers.length > 1 ? '<b style="color:' + S.couleur[p.id] + '">' + esc(p.prenom) + '</b> : ' : '';
    if (i && i.statut === 'inscrit') return '<span class="small" style="color:var(--ok);font-weight:600">' + nom + '✓ Inscription confirmée</span>';
    if (i && i.statut === 'attente') return '<span class="small" style="color:var(--ac);font-weight:600">' + nom + '⏳ En liste d\'attente</span>';
    return '<span class="small mut">' + nom + (passe ? 'Non inscrit' + (p.sexe === 'F' ? 'e' : '') : 'Pas encore inscrit' + (p.sexe === 'F' ? 'e' : '') + ' · clique pour t\'inscrire') + '</span>';
  }).join('') + '</span>';
}

// « Je participe » pour les séances sans inscription
function maReponse(ev, p) { var r = ((AG && AG.part) || []).filter(function (x) { return x.evenement_id === ev.id && x.personne_id === p.id; })[0]; return r ? r.reponse : null; }
function peutRepondre(ev) { return S.user && !ev.inscription_ouverte && ev.statut !== 'annule' && new Date(ev.debut) > new Date() && evGroupes(ev).ids.length; }
function boutonsPart(ev, qui) {
  if (!peutRepondre(ev)) return '';
  return '<span class="stack" style="gap:6px;margin-top:4px">' + qui.map(function (p) {
    var r = maReponse(ev, p);
    return '<span style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">' + (qui.length > 1 || S.pers.length > 1 ? '<b class="small" style="min-width:56px;color:' + S.couleur[p.id] + '">' + esc(p.prenom) + '</b>' : '') +
      '<button class="chip' + (r === 'oui' ? ' on' : '') + '" data-part="oui|' + ev.id + '|' + p.id + '" style="min-height:36px">' + (r === 'oui' ? '✓ Présent' + (p.sexe === 'F' ? 'e' : '') : 'Présent' + (p.sexe === 'F' ? 'e' : '')) + '</button>' +
      '<button class="chip' + (r === 'non' ? ' on' : '') + '" data-part="non|' + ev.id + '|' + p.id + '" style="min-height:36px">' + (r === 'non' ? '✗ Absent' + (p.sexe === 'F' ? 'e' : '') : 'Absent' + (p.sexe === 'F' ? 'e' : '')) + '</button></span>';
  }).join('') + '</span>';
}
function lierPart() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-part]'), function (b) {
    b.onclick = function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      var x = b.dataset.part.split('|'), deja = (AG.part || []).filter(function (r) { return r.evenement_id === x[1] && r.personne_id === x[2]; })[0];
      var op = deja && deja.reponse === x[0] ? sb.from('participations').delete().eq('evenement_id', x[1]).eq('personne_id', x[2])
        : sb.from('participations').upsert({ evenement_id: x[1], personne_id: x[2], reponse: x[0], maj_le: new Date().toISOString() });
      b.disabled = true;
      q(op).then(function () {
        AG.part = (AG.part || []).filter(function (r) { return !(r.evenement_id === x[1] && r.personne_id === x[2]); });
        if (!(deja && deja.reponse === x[0])) AG.part.push({ evenement_id: x[1], personne_id: x[2], reponse: x[0] });
        toast(deja && deja.reponse === x[0] ? 'Réponse retirée' : x[0] === 'oui' ? 'Présence notée' : 'Absence notée'); render();
      }).catch(function () { toast('Réponse impossible pour le moment'); b.disabled = false; });
    };
  });
}

var AG = null; // cache agenda : {creneaux, insc, part}
function chargerAgenda() {
  if (!S.user || (!S.pers.length && !nomCoachCompte())) return Promise.resolve(AG = { creneaux: [], insc: [] });
  return Promise.all([
    q(sb.from('creneaux').select('*, groupes(nom,couleur)')).catch(function () { return []; }),
    q(sb.from('inscriptions').select('evenement_id, personne_id, statut, paye').in('personne_id', S.pers.map(function (p) { return p.id; }))).catch(function () { return []; }),
    q(sb.from('periodes_sans_cours').select('debut, fin, libelle')).catch(function () { return []; }),
    q(sb.from('participations').select('evenement_id, personne_id, reponse').in('personne_id', S.pers.map(function (p) { return p.id; }))).catch(function () { return []; }),
    q(sb.from('nextgen').select('*').in('personne_id', S.pers.map(function (p) { return p.id; }))).catch(function () { return []; }),
    q(sb.from('nextgen_absences').select('id, nextgen_id, jour, motif')).catch(function () { return []; }),
    q(sb.from('absences_cours').select('creneau_id, jour, personne_id, personnes(prenom, nom)').gte('jour', isoJour(new Date(Date.now() - 14 * 864e5)))).catch(function () { return []; })
  ]).then(function (r) { AG = { creneaux: r[0], insc: r[1], pauses: r[2] || [], part: r[3] || [], ng: r[4] || [], ngabs: r[5] || [], abs: r[6] || [] }; return AG; });
}

function mesItems(du, au) {
  var items = [];
  (S.evts || []).forEach(function (ev) {
    var d = new Date(ev.debut); if (d < du || d >= au) return;
    var qui = concernes(ev, AG && AG.insc);
    if (!qui.length && nomCoachCompte() && S.sel === 'all' && encadrePar(ev.encadrant, nomCoachCompte())) { items.push({ d: d, f: ev.fin ? new Date(ev.fin) : null, titre: ev.titre, lieu: ev.lieu, enc: ev.encadrant, statut: ev.statut, objectif: ev.objectif, qui: [], gs: evGroupes(ev).gs, id: ev.id, type: ev.type, coach: true }); return; }
    if (qui.length) items.push({ d: d, f: ev.fin ? new Date(ev.fin) : null, titre: ev.titre, lieu: ev.lieu, enc: ev.encadrant, statut: ev.statut, objectif: ev.objectif, qui: qui, gs: evGroupes(ev).gs, id: ev.id, type: ev.type, inscrit: ev.inscription_ouverte });
    else if (inscOuverte(ev) && evGroupes(ev).ids.length) {
      var pos = eligibles(ev).filter(function (p) { return S.sel === 'all' || p.id === S.sel; });
      if (pos.length) items.push({ d: d, f: ev.fin ? new Date(ev.fin) : null, titre: ev.titre, lieu: ev.lieu, statut: ev.statut, qui: pos, gs: evGroupes(ev).gs, id: ev.id, type: ev.type, possible: true });
    }
  });
  (AG ? AG.creneaux : []).forEach(function (cr) {
    for (var j = new Date(du); j < au; j.setDate(j.getDate() + 1)) {
      var js = j.getDay() === 0 ? 7 : j.getDay(), iso = isoJour(j);
      if (cr.jour_semaine !== js || (cr.du && iso < cr.du) || (cr.au && iso > cr.au)) continue;
      if ((AG.pauses || []).some(function (v) { return iso >= v.debut && iso <= v.fin; })) continue;
      var qui = (S.groupesDe[cr.groupe_id] || []).filter(function (p) { return S.sel === 'all' || p.id === S.sel; });
      var jeCoache = nomCoachCompte() && encadrePar(cr.encadrant, nomCoachCompte()) && S.sel === 'all';
      if (!qui.length && !jeCoache) continue;
      var a = cr.heure_debut.split(':'), b = cr.heure_fin.split(':');
      var d = new Date(j); d.setHours(+a[0], +a[1], 0, 0); var f = new Date(j); f.setHours(+b[0], +b[1], 0, 0);
      items.push({ d: d, f: f, titre: cr.groupes ? String(cr.groupes.nom).replace(/^.*?·\s*/, '').replace(/\s*\([^)]*\)\s*$/, '') : 'Cours', lieu: cr.lieu, enc: cr.encadrant, statut: 'prevu', qui: qui, gs: cr.groupes ? [cr.groupes] : [], gid: cr.groupe_id, coach: !qui.length || !!jeCoache, crid: cr.id, jour: iso, eleve: qui.length > 0 });
    }
  });
  // Encadrement Next Gen : le jeune vient aider sur un cours, avec ses propres horaires
  ((AG && AG.ng) || []).forEach(function (n) {
    var p = S.pers.filter(function (x) { return x.id === n.personne_id; })[0];
    if (!p || (S.sel !== 'all' && S.sel !== p.id)) return;
    (n.groupe_id ? (AG.creneaux || []).filter(function (cr) { return cr.groupe_id === n.groupe_id; }) : [{ jour_semaine: n.jour_semaine, lieu: null, encadrant: null, groupes: { nom: n.libelle || 'Encadrement' } }]).forEach(function (cr) {
      for (var j = new Date(du); j < au; j.setDate(j.getDate() + 1)) {
        var js = j.getDay() === 0 ? 7 : j.getDay(), iso = isoJour(j);
        if (cr.jour_semaine !== js || (n.du && iso < n.du) || (n.au && iso > n.au) || (cr.du && iso < cr.du) || (cr.au && iso > cr.au)) continue;
        if ((AG.pauses || []).some(function (v) { return iso >= v.debut && iso <= v.fin; })) continue;
        var a = n.arrivee.split(':'), b = n.depart.split(':');
        var d = new Date(j); d.setHours(+a[0], +a[1], 0, 0); var f = new Date(j); f.setHours(+b[0], +b[1], 0, 0);
        var abs = ((AG && AG.ngabs) || []).filter(function (x) { return x.nextgen_id === n.id && x.jour === iso; })[0];
        items.push({ d: d, f: f, titre: GRADES_NG[n.grade] + ' · ' + (n.libelle && n.groupe_id ? n.libelle : cr.groupes ? String(cr.groupes.nom).replace(/^.*?·\s*/, '').replace(/\s*\([^)]*\)\s*$/, '') : 'Cours'), lieu: cr.lieu, enc: cr.encadrant, statut: abs ? 'annule' : 'prevu', qui: [p], gs: [], ng: n.id, ngJour: iso, ngAbs: abs, objectif: n.notes });
      }
    });
  });
  items.sort(function (x, y) { return x.d - y.d; });
  return items;
}
var GRADES_NG = { mini_coach: 'Mini coach', coach_junior: 'Coach junior', coach_next_gen: 'Coach Next Gen' };

// ---------- Mise en page commune ----------
// Écran large (tablette et ordinateur) : certaines pages changent de disposition. Le téléphone garde l'affichage d'origine.
var MQ_LARGE = window.matchMedia ? window.matchMedia('(min-width: 768px)') : null;
function vueLarge() { return !!(MQ_LARGE && MQ_LARGE.matches); }
// Agendas sur écran large : chaque journée (titre + séances) est regroupée dans un bloc, pour les afficher côte à côte
function grouperJours() {
  if (!vueLarge()) return;
  Array.prototype.forEach.call(document.querySelectorAll('#app .dayhead.jour'), function (dh) {
    if (dh.parentNode.classList.contains('ag-jour')) return;
    var g = document.createElement('div'); g.className = 'ag-jour';
    dh.parentNode.insertBefore(g, dh);
    var n = dh;
    while (n) { var suiv = n.nextElementSibling; g.appendChild(n); n = suiv && suiv.classList.contains('ev') ? suiv : null; }
  });
}
function tabs(actif) {
  // Arena n'est plus dans la barre : carte « Mon CLOC'ARENA » sur l'accueil (joueurs concernés) et Club → Compétitions
  var t = [['accueil', 'home', 'Accueil'], ['agenda', 'cal', 'Agenda'], ['messages', 'chat', 'Messages'], ['club', 'club', 'Club']];
  var nm = totalNonLus();
  t.push(aDesEspaces() ? ['gestion', 'tool', 'Gestion'] : ['profil', 'user', 'Profil']);
  $('tabs-in').style.setProperty('--n', t.length);
  $('tabs-in').innerHTML = t.map(function (x) {
    return '<a href="#/' + x[0] + '" class="' + (actif === x[0] ? 'on' : '') + '"' + (actif === x[0] ? ' aria-current="page"' : '') + ' style="position:relative">' + ic(x[1], 24) + x[2] + (x[0] === 'messages' && nm ? '<span class="bulle-tab" aria-label="' + nm + ' non lu' + (nm > 1 ? 's' : '') + '">' + (nm > 99 ? '99+' : nm) + '</span>' : '') + '</a>';
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
var VERSION_APPLI = '08/11 01h00';
function nomAffiche() {
  if (!S.user) return '';
  var moi = S.pers.filter(function (p) { return S.compte && p.id === S.compte.personne_id; })[0];
  if (moi) return moi.prenom;
  if (S.compte && S.compte.prenom_declare && !S.apercu) return S.compte.prenom_declare;
  if (S.pers.length) return 'Famille ' + S.pers[0].nom.charAt(0) + S.pers[0].nom.slice(1).toLowerCase();
  return S.isDir ? 'Direction sportive' : 'Bienvenue';
}

// ---------- Accueil ----------

// ---------- Accueil réglable depuis la gestion (Communication → Accueil de l'appli) ----------
var ACC_BLOCS = [['presence', 'Présence au club'], ['rdv', 'Prochain rendez-vous'], ['arena', 'Mon CLOC\'ARENA'], ['fete', 'Fête à la une'], ['actu', 'Dernière actu'], ['tiles', 'Raccourcis'], ['reseaux', 'Réseaux sociaux'], ['partners', 'Partenaires']];
var ACC_TUILES = {
  double: ['Double interne', 'trophy', '#/double'], inscriptions: ['Inscriptions', 'check', '#/inscriptions'], reserver: ['Réserver un court', 'cal', ''],
  cordage: ['Cordage', 'racket', '#/cordage'], arena: ['CLOC\'ARENA', 'trophy', '#/arena'], agenda: ['Mon agenda', 'cal', '#/agenda'],
  annonces: ['Petites annonces', 'chat', '#/club/annonces'], club: ['Infos du club', 'club', '#/club/infos'], fete: ['Fête de Noël', 'people', '#/noel'], aide: ['Aide', 'user', '#/aide']
};
var ACC_DEF = {
  mot: { actif: false, titre: '', texte: '', lien: '', lien_txt: '', couleur: 'ac', fin: '' },
  blocs: ACC_BLOCS.map(function (b) { return { k: b[0], on: true }; }),
  tuiles: [{ type: 'double' }, { type: 'inscriptions' }, { type: 'reserver' }, { type: 'cordage' }],
  reseaux: { instagram: 'https://www.instagram.com/cloc.acheres.tennis', facebook: 'https://www.facebook.com/ClocaTennis/' },
  partenaires: [{ nom: 'Ecosport', lien: 'https://ecosport-tennis.fr/' }, { nom: 'Tecnifibre', lien: 'https://www.tecnifibre.com/?country=FR' }],
  faq: []
};
function accueilCfg() {
  var c = (S.reglages && S.reglages.accueil) || {}, d = ACC_DEF;
  var blocs = Array.isArray(c.blocs) ? c.blocs.filter(function (b) { return b && ACC_BLOCS.some(function (x) { return x[0] === b.k; }); }) : [];
  ACC_BLOCS.forEach(function (x) { if (!blocs.some(function (b) { return b.k === x[0]; })) blocs.push({ k: x[0], on: true }); }); // un bloc ajouté plus tard apparaît par défaut
  return {
    mot: Object.assign({}, d.mot, c.mot || {}), blocs: blocs,
    tuiles: Array.isArray(c.tuiles) ? c.tuiles.filter(function (t) { return t && (ACC_TUILES[t.type] || (t.type === 'lien' && t.titre && t.lien)); }) : d.tuiles,
    reseaux: Object.assign({}, d.reseaux, c.reseaux || {}),
    partenaires: Array.isArray(c.partenaires) ? c.partenaires.filter(function (x) { return x && x.nom; }) : d.partenaires,
    faq: Array.isArray(c.faq) ? c.faq.filter(function (x) { return x && x.q; }) : d.faq
  };
}
// Accueil personnalisé (Profil → Mon accueil) : chaque compte choisit ses raccourcis et masque des blocs ; sinon, le réglage du club
function accueilPerso(cfg) {
  var m = S.monAccueil;
  if (!m) return cfg;
  if (Array.isArray(m.tuiles)) cfg.tuiles = m.tuiles.map(function (t) { return cfg.tuiles.filter(function (x) { return (x.type === 'lien' ? 'lien:' + x.titre : x.type) === t; })[0] || (ACC_TUILES[t] ? { type: t } : null); }).filter(Boolean);
  (m.blocs_masques || []).forEach(function (k) { cfg.blocs.forEach(function (b) { if (b.k === k) b.on = false; }); });
  return cfg;
}
function chargerMonAccueil() {
  S.monAccueil = null;
  if (!S.user || S.apercu) return Promise.resolve();
  return q(sb.from('compte_accueil').select('tuiles, blocs_masques').eq('user_id', S.user.id).maybeSingle()).then(function (r) { S.monAccueil = r; }).catch(function () { });
}
var ACC_AIDE = { double: 'Poules, dispos, scores', inscriptions: 'Stages et événements', reserver: 'Ten\'Up', cordage: 'Déposer une raquette', arena: 'Classement, programme', agenda: 'Mon planning', annonces: 'Vendre, chercher un partenaire', club: 'Horaires, adresse', fete: 'Fête du club', aide: 'Installer, se connecter' };
function pageMonAccueil() {
  var club = accueilCfg(), base = S.monAccueil && Array.isArray(S.monAccueil.tuiles) ? S.monAccueil.tuiles : club.tuiles.map(function (x) { return x.type === 'lien' ? 'lien:' + x.titre : x.type; });
  var E = S.monAccEd || (S.monAccEd = { tuiles: base.slice(), blocs: ((S.monAccueil && S.monAccueil.blocs_masques) || []).slice() });
  var dispo = Object.keys(ACC_TUILES).filter(function (k) { return k !== 'fete' || (S.fetes || []).length; }).map(function (k) { return [k, ACC_TUILES[k][0], ACC_AIDE[k] || '', ACC_TUILES[k][1]]; })
    .concat(club.tuiles.filter(function (x) { return x.type === 'lien'; }).map(function (x) { return ['lien:' + x.titre, x.titre, x.sous || 'Lien du club', IC[x.icone] ? x.icone : 'pin']; }));
  // ordre : les choisis d'abord (dans l'ordre choisi), puis les autres
  dispo.sort(function (a, b) { var ia = E.tuiles.indexOf(a[0]), ib = E.tuiles.indexOf(b[0]); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
  var blocs = [['arena', 'Mon CLOC\'ARENA', 'Classement et prochaine séance'], ['actu', 'Dernière actu', 'La dernière actu du club'], ['rdv', 'Prochain rendez-vous', 'Ma prochaine séance'], ['reseaux', 'Réseaux sociaux', 'Instagram et Facebook du club'], ['presence', 'Club house', 'Ouvert ou fermé']];
  var h = '<div class="pagehead wrap">' + backLink('#/profil', 'Profil') + '<h1 style="font-size:26px">Mon accueil</h1><p class="mut small" style="margin:4px 0 0">Choisis ce que tu veux voir en ouvrant l\'appli.</p></div><main>' +
    '<section class="card stack" style="gap:2px"><span class="eyebrow" style="margin-bottom:6px">Mes raccourcis</span>' + dispo.map(function (d) {
      var i = E.tuiles.indexOf(d[0]), on = i >= 0;
      return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--bd)"><label class="check" style="flex:1;min-height:0;padding:0;align-items:center"><input type="checkbox" data-mat="' + esc(d[0]) + '"' + (on ? ' checked' : '') + '>' +
        '<span style="width:36px;height:36px;border-radius:10px;background:var(--soft);display:flex;align-items:center;justify-content:center;flex:none">' + ic(d[3], 20, on ? 'var(--ac)' : 'var(--mut)') + '</span><span class="stack" style="gap:0"><b class="small">' + esc(d[1]) + '</b><span class="xs mut">' + esc(d[2]) + '</span></span></label>' +
        (on ? '<span style="display:flex;gap:4px;flex:none"><button class="chip" data-mam="' + i + '|-1" aria-label="Monter"' + (i ? '' : ' disabled style="opacity:.35"') + '>↑</button><button class="chip" data-mam="' + i + '|1" aria-label="Descendre"' + (i < E.tuiles.length - 1 ? '' : ' disabled style="opacity:.35"') + '>↓</button></span>' : '') + '</div>';
    }).join('') + '</section>' +
    '<section class="card stack" style="gap:2px"><span class="eyebrow" style="margin-bottom:6px">Ce que j\'affiche</span>' + blocs.map(function (b) {
      return '<label class="check" style="border-top:1px solid var(--bd);padding:10px 0"><input type="checkbox" data-mab="' + b[0] + '"' + (E.blocs.indexOf(b[0]) < 0 ? ' checked' : '') + '><span class="stack" style="gap:0"><b class="small">' + b[1] + '</b><span class="xs mut">' + b[2] + '</span></span></label>';
    }).join('') + '<span class="xs mut" style="margin-top:6px">Les messages importants du club et les questionnaires à remplir restent toujours affichés.</span></section>' +
    '<button class="btn" id="ma-go">Enregistrer</button><button class="btn line" id="ma-raz">Revenir à l\'accueil du club</button></main>';
  setTimeout(function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-mat]'), function (c) { c.onchange = function () { var k = c.dataset.mat; if (c.checked) E.tuiles.push(k); else E.tuiles = E.tuiles.filter(function (x) { return x !== k; }); render(); }; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-mam]'), function (b) { b.onclick = function () { var x = b.dataset.mam.split('|'), i = +x[0], j = i + +x[1], t = E.tuiles[i]; E.tuiles[i] = E.tuiles[j]; E.tuiles[j] = t; render(); }; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-mab]'), function (c) { c.onchange = function () { var k = c.dataset.mab; E.blocs = E.blocs.filter(function (x) { return x !== k; }); if (!c.checked) E.blocs.push(k); }; });
    $('ma-go').onclick = function () {
      q(sb.from('compte_accueil').upsert({ user_id: S.user.id, tuiles: E.tuiles, blocs_masques: E.blocs })).then(function () { S.monAccueil = { tuiles: E.tuiles.slice(), blocs_masques: E.blocs.slice() }; S.monAccEd = null; toast('Accueil enregistré'); go('#/accueil'); }).catch(function () { toast('Enregistrement impossible'); });
    };
    $('ma-raz').onclick = function () {
      q(sb.from('compte_accueil').delete().eq('user_id', S.user.id)).then(function () { S.monAccueil = null; S.monAccEd = null; toast('Accueil du club rétabli'); go('#/accueil'); }).catch(function () { toast('Action impossible'); });
    };
  });
  return h;
}
function lienSur(u) { u = String(u || '').trim(); return /^(https?:\/\/|#\/|mailto:|tel:)/i.test(u) ? u : (u && /^[\w.-]+\.[a-z]{2,}/i.test(u) ? 'https://' + u : ''); }
function lienExterne(u) { return /^https?:/i.test(u) ? ' target="_blank" rel="noopener"' : ''; }
function motDuClub(cfg) {
  var m = cfg.mot; if (!m.actif || !(m.titre || m.texte)) return '';
  if (m.fin && m.fin < isoJour(new Date())) return '';
  var fond = { ac: 'var(--ac)', navy: 'var(--navy)', ok: 'var(--ok)', sun: '#f3d98a' }[m.couleur] || 'var(--ac)', clair = m.couleur === 'sun', tx = clair ? '#12304a' : '#fff';
  var lien = lienSur(m.lien);
  return '<section class="card stack mot-club" style="gap:6px;background:' + fond + ';border-color:' + fond + ';color:' + tx + '">' +
    (m.titre ? '<b style="font-size:18px;line-height:1.25">' + esc(m.titre) + '</b>' : '') + (m.texte ? '<span class="small" style="white-space:pre-line;line-height:1.5">' + esc(m.texte) + '</span>' : '') +
    (lien ? '<a class="btn" href="' + esc(lien) + '"' + lienExterne(lien) + ' style="align-self:flex-start;margin-top:4px;background:' + (clair ? 'var(--navy)' : '#fff') + ';color:' + (clair ? '#fff' : 'var(--navy)') + '">' + esc(m.lien_txt || 'En savoir plus') + '</a>' : '') + '</section>';
}
function tuilesAccueil(cfg, dyn) {
  var l = cfg.tuiles; if (!l.length) return '';
  return '<div class="grid2">' + l.map(function (t) {
    if (t.type === 'lien') { var u = lienSur(t.lien); if (!u) return ''; return '<a class="tile" href="' + esc(u) + '"' + lienExterne(u) + '>' + ic(IC[t.icone] ? t.icone : 'pin', 24) + '<b>' + esc(t.titre) + '</b><span class="mut small">' + esc(t.sous || '') + '</span></a>'; }
    if (t.type === 'fete' && !feteConcerne(feteActive())) return '';
    var d = ACC_TUILES[t.type], href = t.type === 'reserver' ? ADOC_URL : d[2];
    var sous = t.sous || dyn[t.type] || '';
    return '<a class="tile" href="' + href + '"' + lienExterne(href) + '>' + ic(d[1], 24) + '<b>' + esc(t.titre || d[0]) + '</b><span class="mut small">' + sous + '</span></a>';
  }).join('') + '</div>';
}

function pageAccueil() {
  var urgent = (S.pubs || []).filter(function (p) { return p.urgent; })[0];
  var h = '<div class="hero"><div class="wrap"><div class="hero-row"><img class="logo" src="' + LOGO + '" alt="Logo CLOCA Tennis">' +
    '<div style="flex:1"><div class="hello">' + (S.user ? 'Bonjour' : 'Bienvenue au club') + '</div><div class="hello-name">' + esc(S.user ? nomAffiche() : 'CLOCA Tennis') + '</div></div>' + cloche() + '</div>' +
    selFamille(true) + '</div></div><main>';
  var tDisc = ''; // les discussions sont dans l'onglet Messages
  var top = h, P = { presence: '<div class="grid2 top2"><div id="presence"' + (tDisc ? '' : ' style="grid-column:1/-1"') + '></div>' + tDisc + '</div><div id="presence-det"></div>', msg: '', disc: '', qst: carteQuestionnairesAccueil(), urgent: '', fete: carteFeteAccueil(), rdv: '', tiles: '', login: '', install: '', actu: '', reseaux: '<div id="reseaux"></div>', partners: '', mot: '' };
  var nl = nonLus();
  if (nl.length) P.msg = '<a class="card stack" href="#/' + (nl.length === 1 ? 'message/' + nl[0].messages.id : 'messages') + '" style="gap:4px;text-decoration:none;color:inherit;border-left:4px solid var(--ac)"><span class="eyebrow">' + (nl.length === 1 ? 'Nouveau message' : nl.length + ' nouveaux messages') + '</span><b>' + esc(nl[0].messages.titre) + '</b><span class="mut small">' + esc(nl[0].messages.expediteur) + (nl[0].pour ? ' · pour ' + esc(nl[0].pour) : '') + '</span></a>';
  if (urgent) P.urgent = '<div class="alert urgent">' + ic('alert', 20, '#fff') + '<div class="stack"><b>' + esc(urgent.titre) + '</b>' + (urgent.texte ? '<span class="small" style="color:#fde3dc">' + esc(urgent.texte) + '</span>' : '') + '</div></div>';

  // Prochain rendez-vous
  var now = new Date(), fin = new Date(); fin.setDate(fin.getDate() + 45);
  var prochain = null;
  if (S.user && S.pers.length) prochain = mesItems(new Date(now.getTime() - 3600e3), fin).filter(function (i) { return (i.f || i.d) > now; })[0];
  else prochain = (S.evts || []).filter(function (e) { return e.public && new Date(e.fin || e.debut) > now && e.statut !== 'annule'; }).map(function (e) { return { d: new Date(e.debut), f: e.fin ? new Date(e.fin) : null, titre: e.titre, lieu: e.lieu, enc: e.encadrant, gs: evGroupes(e).gs, qui: [], id: e.id }; })[0];
  if (prochain) {
    P.rdv = '<section class="card stack" style="gap:12px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="eyebrow">Prochain rendez-vous</span><span>' + prochain.gs.map(groupeBadge).join(' ') + '</span></div>' +
      '<div class="rdv"><div class="datebox"><span>' + esc(prochain.d.toLocaleDateString('fr-FR', { weekday: 'short' })) + '</span><b>' + prochain.d.getDate() + '</b></div>' +
      '<div class="stack"><span class="disp" style="font-size:22px;line-height:1.1">' + esc(prochain.titre) + '</span>' +
      '<span class="mut small">' + fmtH(prochain.d) + (prochain.f ? ' – ' + fmtH(prochain.f) : '') + (prochain.lieu ? ' · ' + esc(prochain.lieu) : '') + '</span>' +
      (prochain.enc || prochain.qui.length ? '<span class="mut small">' + (prochain.enc ? 'Avec ' + esc(prochain.enc) : '') + (prochain.enc && prochain.qui.length ? ' · ' : '') + prochain.qui.map(function (p) { return '<b style="color:' + S.couleur[p.id] + '">' + esc(p.prenom) + '</b>'; }).join(', ') + '</span>' : '') +
      '</div></div>' + (prochain.id ? boutonsPart((S.evts || []).filter(function (x) { return x.id === prochain.id; })[0] || {}, prochain.qui) : '') + '<a class="btn ghost" href="#/' + (S.user ? 'agenda' : 'arena') + '">' + (S.user ? 'Voir tout mon agenda' : 'Voir la programmation') + '</a></section>';
  }

  // Raccourcis
  var ouverts = (S.evts || []).filter(function (e) { return inscOuverte(e) && (!S.user || !S.pers.length || eligibles(e).length); }).length;
  var arenaTxt = 'Classements et programme';
  if (S.user && S.pers.length && S.classement) {
    var rangs = S.pers.filter(function (p) { return p.niveau_arena; }).map(function (p) {
      var i = S.classement.map(function (c) { return c.personne_id; }).indexOf(p.id); return i >= 0 ? esc(p.prenom) + ' ' + (i + 1) + (i ? 'e' : 'er') : null;
    }).filter(Boolean);
    if (rangs.length) arenaTxt = rangs.join(' · ');
  }
  var cfg = accueilPerso(accueilCfg());
  P.arena = carteArenaAccueil();
  P.tiles = tuilesAccueil(cfg, { double: 'Poules, dispos, scores', inscriptions: ouverts ? ouverts + ' ouverte' + (ouverts > 1 ? 's' : '') : 'Stages et événements', reserver: 'Sur Ten\'Up', cordage: resumeCordage(), arena: arenaTxt, agenda: 'Mon planning de la semaine', annonces: 'Vendre, acheter, échanger', club: 'Horaires, adresse, contacts', fete: 'Toutes les infos', aide: 'Installer, se connecter' });
  P.mot = motDuClub(cfg);
  if (!S.user) P.login = '<section class="card stack" style="gap:12px;border:2px solid var(--ac)"><span class="eyebrow" style="color:var(--ac)">Tu n\'es pas connecté</span><b style="font-size:18px">Connecte-toi en 1 minute</b>' +
    '<ol class="small" style="margin:0;padding-left:20px;line-height:1.7"><li>Tape l\'adresse mail donnée au club</li><li>Ouvre le mail : tu reçois un code</li><li>Tape le code : c\'est fait !</li></ol>' +
    '<a class="btn" href="#/profil">Me connecter</a><button class="btn line" data-guide="1">Besoin d\'aide ? Le guide pas à pas</button></section>';
  else if (!S.pers.length && !S.isStaff) P.login = '<section class="card stack" style="gap:8px"><b>Adresse pas encore reconnue</b><span class="mut small">Tu es connecté avec ' + esc(S.user.email) + ', mais cette adresse n\'est pas encore rattachée à un adhérent. ' + (S.compte && S.compte.identite_le ? 'Le club a reçu ton nom (' + esc(S.compte.prenom_declare + ' ' + S.compte.nom_declare) + ') et va relier ton compte à ta famille.' : 'Indique ton nom pour que le club relie ton compte à ta famille.') + '</span>' + (S.compte && S.compte.identite_le ? '' : '<button class="btn" data-identite="1">Indiquer mon nom</button>') + '</section>';

  if (S.user && estMobile() && !estInstallee() && !localStorageGet('cloca-install-masque')) P.install = '<section class="card stack" style="gap:8px"><b>📲 Installe l\'appli sur ton téléphone</b><span class="mut small">Une icône sur l\'écran d\'accueil, et les notifications du club.</span><div style="display:flex;gap:8px"><button class="btn" data-guide="1" style="flex:2">Me montrer comment</button><button class="btn line" id="inst-masq" style="flex:1">Plus tard</button></div></section>';
  var actu = (S.pubs || []).filter(function (p) { return !p.urgent; })[0];
  if (actu) P.actu = carteActu(actu, 'Dernière actu');
  // (l'espace coach est dans l'onglet Gestion)
  P.partners = cfg.partenaires.length ? '<div class="partners"><div class="eyebrow" style="margin-bottom:6px">Nos partenaires</div>' + cfg.partenaires.map(function (x) { var u = lienSur(x.lien); return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(x.nom) + '</a>' : '<span>' + esc(x.nom) + '</span>'; }).join('') + '</div>' : '';
  // Blocs masqués dans la gestion
  cfg.blocs.forEach(function (b) { if (!b.on) P[b.k] = ''; });
  // Sur ordinateur et tablette : deux colonnes. Sur téléphone : exactement l'ordre d'origine.
  // Ordre réglable : messages, questionnaires et alertes restent juste après la présence (ou en haut si elle est masquée)
  var auto = P.msg + P.disc + P.qst + P.urgent, ordre = cfg.blocs.filter(function (b) { return b.on; }).map(function (b) { return b.k; });
  if (vueLarge()) {
    var col1 = ['rdv', 'fete', 'actu'], c1 = '', c2 = '';
    ordre.forEach(function (k) { if (k === 'partners') return; if (col1.indexOf(k) >= 0) c1 += P[k]; else c2 += P[k]; });
    return top + P.mot + '<div class="dk-home">' + (auto ? '<div class="dk-top">' + P.urgent + P.msg + P.disc + P.qst + '</div>' : '') +
      '<div class="dk-col">' + c1 + P.login + P.install + '</div><div class="dk-col">' + c2 + '</div></div>' + P.partners + '</main>';
  }
  var corps = '', autoPlace = ordre.indexOf('presence') < 0;
  if (autoPlace) corps += auto;
  ordre.forEach(function (k) {
    corps += P[k];
    if (k === 'presence') corps += auto;
    if (k === 'tiles') corps += P.login + P.install;
  });
  if (ordre.indexOf('tiles') < 0) corps += P.login + P.install;
  return top + P.mot + corps + '</main>';
}

// Carte « Mon CLOC'ARENA » : seulement pour les familles dont un joueur a un niveau CLOC'ARENA
function carteArenaAccueil() {
  var joueurs = S.user ? S.pers.filter(function (p) { return p.niveau_arena; }) : [];
  if (!joueurs.length) return '';
  var cl = S.classement || [], now = new Date();
  var seance = (S.evts || []).filter(function (e) { return e.type === 'seance' && e.statut !== 'annule' && new Date(e.debut) > now; })[0];
  return '<a href="#/arena/tweener" class="card stack" style="gap:10px;text-decoration:none;color:#fff;background:linear-gradient(135deg,#5b3a86,#c62f2f);border:0">' +
    '<div style="display:flex;justify-content:space-between;align-items:center"><span class="xs" style="letter-spacing:1.2px;font-weight:700;opacity:.9">MON CLOC\'ARENA</span>' + ic('trophy', 20, '#fff') + '</div>' +
    joueurs.map(function (p) {
      var i = cl.map(function (c) { return c.personne_id; }).indexOf(p.id), c = cl[i];
      return '<div style="display:flex;align-items:center;gap:10px"><span class="disp" style="font-size:30px;line-height:1;min-width:46px">' + (i >= 0 ? (i + 1) + '<sup style="font-size:14px">' + (i ? 'e' : 'er') + '</sup>' : '–') + '</span>' +
        '<span class="stack" style="gap:2px;flex:1"><b>' + esc(p.prenom) + '</b><span class="xs" style="opacity:.85">' + (c ? (+c.points) + ' points · ' + c.participations + ' séance' + (c.participations > 1 ? 's' : '') : 'Pas encore classé') + '</span></span>' + niveauBadge(p.niveau_arena) + '</div>';
    }).join('') +
    (seance ? '<span class="small" style="opacity:.92">Prochaine séance : <b>' + esc(fmtJour(new Date(seance.debut))) + ' à ' + fmtH(new Date(seance.debut)) + '</b></span>' : '') +
    '<span class="small" style="font-weight:700">Classement et programme →</span></a>';
}
function lierAccueilAide() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-guide]'), function (b) { b.onclick = function () { ouvrirGuide(0); }; });
  Array.prototype.forEach.call(document.querySelectorAll('[data-identite]'), function (b) { b.onclick = function () { modale(formIdentite(false), function () { lierIdentite(function () { fermerModale(); render(); }); }); }; });
  if ($('inst-masq')) $('inst-masq').onclick = function () { localStorageSet('cloca-install-masque', '1'); render(); };
}

// ---------- Agenda ----------
function enteteSemaine(l) {
  return '<div style="display:flex;justify-content:space-between;align-items:center">' +
    '<button class="back" aria-label="Semaine précédente" id="wk-prev" style="width:44px;justify-content:center">' + ic('back', 20) + '</button>' +
    '<b>' + (S.week === 0 ? 'Cette semaine' : S.week === 1 ? 'Semaine prochaine' : S.week === -1 ? 'Semaine dernière' : 'Semaine du ' + fmtCourt(l)) + '</b>' +
    '<button class="back" aria-label="Semaine suivante" id="wk-next" style="width:44px;justify-content:center">' + ic('next', 20) + '</button></div>';
}
function blocPause(pauses, l, f) {
  var pause = (pauses || []).slice().sort(function (x, y) { return (y.fin > y.debut) - (x.fin > x.debut); }).filter(function (v) { return v.debut <= isoJour(new Date(f.getTime() - 864e5)) && v.fin >= isoJour(l); })[0];
  if (!pause) return '';
  return '<section class="card" style="background:var(--sun);border-color:var(--sun)"><b style="color:#12304a">' + esc(pause.libelle) + '</b><span class="small" style="display:block;color:#12304a">' + (pause.debut === pause.fin ? 'Pas de cours collectifs ce jour-là (' + esc(fmtJour(new Date(pause.debut + 'T12:00:00')).toLowerCase()) + ').' : 'Pas de cours collectifs du ' + esc(fmtCourt(new Date(pause.debut + 'T12:00:00'))) + ' au ' + esc(fmtCourt(new Date(pause.fin + 'T12:00:00'))) + ' inclus.') + '</span></section>';
}
function carteAgenda(it, couleur, quiHtml) {
  var etat = it.statut === 'annule' ? '<span class="badge" style="background:var(--ko);color:#fff">Annulé</span>' : it.statut === 'deplace' ? '<span class="badge" style="background:var(--ac);color:#fff">Déplacé</span>' : it.possible || it.surInsc || it.inscrit ? '<span class="badge" style="background:var(--sun);color:#12304a">Sur inscription</span>' : '';
  var det = [fmtH(it.d) + (it.f ? ' – ' + fmtH(it.f) : '')]; if (it.lieu) det.push(esc(it.lieu)); if (it.enc) det.push('avec ' + esc(it.enc));
  var href = it.id ? '#/evenement/' + it.id : it.gid && voitGroupe(it.gid) ? '#/groupe/' + it.gid : null;
  if (it.coach) quiHtml = (quiHtml || '') + '<span class="small" style="color:var(--navy);font-weight:600">Tu encadres' + (href && !it.id ? ' · clique pour voir le groupe' : '') + '</span>';
  if (it.crid) {
    var absL = ((AG && AG.abs) || []).filter(function (x) { return x.creneau_id === it.crid && x.jour === it.jour; });
    var futur = it.d > new Date() && !S.apercu;
    if (it.eleve) quiHtml = (quiHtml || '') + '<span style="display:flex;gap:6px;flex-wrap:wrap">' + it.qui.map(function (p) {
      var ab = absL.some(function (x) { return x.personne_id === p.id; }), nom = it.qui.length > 1 || S.pers.length > 1 ? esc(p.prenom) + ' : ' : '';
      return ab ? '<span class="chip" style="min-height:32px;border-color:var(--ko);color:var(--ko)">' + nom + 'Absent' + (futur ? ' · <u data-absx="' + it.crid + '|' + it.jour + '|' + p.id + '">annuler</u>' : '') + '</span>'
        : futur ? '<button class="chip" data-absc="' + it.crid + '|' + it.jour + '|' + p.id + '" style="min-height:32px">' + nom + 'Absent à ce cours</button>' : '';
    }).join('') + '</span>';
    if (it.coach && nomCoachCompte()) quiHtml = (quiHtml || '') + '<span class="small" style="color:' + (absL.length ? 'var(--ko)' : 'var(--mut)') + ';font-weight:600">' + (absL.length ? absL.length + ' absent' + (absL.length > 1 ? 's' : '') + ' : ' + esc(absL.map(function (x) { return x.personnes ? x.personnes.prenom + ' ' + x.personnes.nom.charAt(0) + '.' : '?'; }).join(', ')) : 'Aucune absence signalée') + '</span>';
  }
  if (it.ng) quiHtml = (quiHtml || '') + (it.ngAbs ? '<span class="small" style="color:var(--ko);font-weight:600">Absence signalée' + (it.ngAbs.motif ? ' · ' + esc(it.ngAbs.motif) : '') + '</span>' : it.d > new Date() && !S.apercu ? '<button class="chip" data-ngabs="' + it.ng + '|' + it.ngJour + '" style="align-self:flex-start;min-height:34px">Je serai absent</button>' : '');
  return '<' + (href ? 'a href="' + href + '"' : 'div') + ' class="ev' + (it.statut === 'annule' ? ' off' : '') + (it.possible ? ' possible' : '') + '"><span class="bar" style="background:' + couleur + '"></span><div class="stack" style="flex:1;min-width:0">' +
    '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b class="t">' + esc(it.titre) + '</b>' + etat + '</div>' +
    '<span class="mut small">' + det.join(' · ') + '</span>' + (it.objectif ? '<span class="mut small">' + esc(it.objectif) + '</span>' : '') + (quiHtml || '') +
    '</div></' + (href ? 'a' : 'div') + '>';
}
function couleurGroupes(gs) { var n = gs[0] && String(gs[0].nom).replace("CLOC'ARENA ", ''); return NIV[n] ? NIV[n].bg : '#1f5a85'; }
function pageAgenda() {
  var perso = !!S.user;
  var tab = S.agTab || (perso ? 'moi' : 'tout');
  if (!perso && tab === 'moi') tab = 'tout';
  var vue = tab === 'moi' ? 'moi' : 'club';
  var l = lundi(new Date()); l.setDate(l.getDate() + 7 * S.week);
  var f = new Date(l); f.setDate(f.getDate() + 7);
  var h = '<div class="pagehead wrap"><h1>' + (vue === 'club' ? 'Agenda du club' : 'Mon agenda') + '</h1></div><main>';
  h += '<div class="chips">' + (perso ? [['moi', 'Mon agenda']] : []).concat([['cours', 'Cours'], ['arena', 'CLOC\'ARENA'], ['evt', 'Événements'], ['tout', 'Tout le club']]).map(function (x) { return '<button class="chip ' + (tab === x[0] ? 'on' : '') + '" data-agf="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
  if (vue === 'club') {
    S.agFiltre = tab;
    h += (S.pers.length > 1 ? selFamille() : '') + enteteSemaine(l) + '<div id="club-ag" style="display:flex;flex-direction:column;gap:12px"><div class="skel"></div></div>' +
      (!S.user ? '<section class="card stack" style="gap:10px"><b>Ton agenda personnel</b><span class="mut small">Connecte-toi pour ne voir que les cours et séances de ta famille, et les ajouter à ton téléphone.</span><a class="btn" href="#/profil">Me connecter</a></section>' : '') + '</main>';
    setTimeout(function () { lierAgenda(); lierSel(); agendaClub(l, f); });
    return h;
  }
  if (!S.pers.length && !nomCoachCompte()) {
    h += enteteSemaine(l) + '<section class="card stack" style="gap:6px"><b>Aucun cours rattaché à ce compte</b><span class="mut small">Pour un coach : la direction indique ton prénom de coach dans « Accès et rôles » (rôle Coach des cours), et tes cours apparaissent ici.</span></section></main>';
    setTimeout(lierAgenda);
    return h;
  }
  var items = mesItems(l, f);
  h += (S.pers.length > 1 ? selFamille() : '') + enteteSemaine(l) + blocPause(AG && AG.pauses, l, f);
  if (!items.length) h += '<section class="card empty">Rien de prévu cette semaine.</section>';
  var jour = '';
  items.forEach(function (it) {
    var jl = fmtJour(it.d);
    if (jl !== jour) { jour = jl; h += '<div class="dayhead jour">' + esc(jl) + '</div>'; }
    var c = it.coach ? 'var(--navy)' : it.qui.length === 1 ? S.couleur[it.qui[0].id] : couleurGroupes(it.gs);
    var evo = it.id && !it.possible ? (S.evts || []).filter(function (x) { return x.id === it.id; })[0] : null;
    var evi = it.id ? (S.evts || []).filter(function (x) { return x.id === it.id; })[0] : null;
    if (evi && evi.inscription_ouverte) { h += carteAgenda(it, c, etatInsc(evi, it.possible ? it.qui : eligibles(evi).filter(function (p) { return S.sel === 'all' || p.id === S.sel; }))); return; }
    h += carteAgenda(it, c, (S.pers.length > 1 && !(evo && peutRepondre(evo)) ? '<span class="small">' + it.qui.map(function (p) { return '<b style="color:' + S.couleur[p.id] + '">' + esc(p.prenom) + '</b>'; }).join(', ') + '</span>' : '') + (evo ? boutonsPart(evo, it.qui) : ''));
  });
  h += blocSynchro() + '</main>';
  setTimeout(function () { lierAgenda(); lierSynchro(); lierSel(); lierPart(); lierAbsenceNg(); lierAbsenceCours(); });
  return h;
}
function lierAgenda() {
  $('wk-prev').onclick = function () { S.week--; render(); };
  $('wk-next').onclick = function () { S.week++; render(); };
  Array.prototype.forEach.call(document.querySelectorAll('[data-agf]'), function (b) { b.onclick = function () { S.agTab = b.dataset.agf; render(); }; });
}
// Agenda de tout le club : cours de la semaine, séances CLOC'ARENA et événements
var CLUBAG = null;
function coachNom() { try { return localStorage.getItem('coachNom') || ''; } catch (e) { return ''; } }
function nomsEncadrants(t) { return String(t || '').split(/\s*(?:,|\bet\b|&|\+|\/)\s*/).map(function (x) { return x.trim(); }).filter(Boolean); }
function encadrePar(t, nom) { return nomsEncadrants(t).some(function (x) { return x.toLowerCase() === nom.toLowerCase(); }); }
function choixCoach(C, nom) {
  var box = $('coach-nom'); if (!box) return;
  var noms = [];
  C.cren.forEach(function (cr) { nomsEncadrants(cr.encadrant).forEach(function (n) { if (noms.indexOf(n) < 0) noms.push(n); }); });
  noms.sort(function (a, b) { return a.localeCompare(b, 'fr'); });
  box.innerHTML = '<section class="card stack" style="gap:8px"><b>' + (nom === '?' ? 'Qui es-tu ?' : 'Mes cours en tant que') + '</b>' +
    (nom === '?' ? '<span class="mut small">Choisis ton prénom pour voir tes cours et séances.</span>' : '') +
    '<div class="chips" style="flex-wrap:wrap">' + noms.map(function (n) { return '<button class="chip ' + (n === nom ? 'on' : '') + '" data-coach="' + esc(n) + '">' + esc(n) + '</button>'; }).join('') + '</div></section>';
  Array.prototype.forEach.call(box.querySelectorAll('[data-coach]'), function (b) { b.onclick = function () { try { localStorage.setItem('coachNom', b.dataset.coach); } catch (e) {} S.coachNomMem = b.dataset.coach; render(); }; });
}
// Un cours collectif n'apparaît que pour ceux qu'il concerne : la famille (élève ou Next Gen), ou le coach qui l'encadre
function monCours(cr, coach) {
  if (!S.user) return false;
  if (S.sel && S.sel !== 'all') return (S.groupesDe[cr.groupe_id] || []).some(function (p) { return p.id === S.sel; }) || ((AG && AG.ng) || []).some(function (n) { return n.groupe_id === cr.groupe_id && n.personne_id === S.sel; });
  if (S.groupesDe[cr.groupe_id] && S.groupesDe[cr.groupe_id].length) return true;
  if (((AG && AG.ng) || []).some(function (n) { return n.groupe_id === cr.groupe_id; })) return true;
  var nom = nomCoachCompte();
  if (nom && encadrePar(cr.encadrant, nom)) return true;
  return S.gere.indexOf(cr.groupe_id) >= 0;
}
function agendaClub(l, f, coach) {
  var box = $('club-ag');
  (CLUBAG ? Promise.resolve(CLUBAG) : Promise.all([
    q(sb.from('creneaux').select('groupe_id, jour_semaine, heure_debut, heure_fin, lieu, encadrant, du, au, groupes(nom, type)')),
    q(sb.from('periodes_sans_cours').select('debut, fin, libelle')).catch(function () { return []; })
  ]).then(function (r) { CLUBAG = { cren: r[0] || [], pauses: r[1] || [] }; return CLUBAG; })).then(function (C) {
    if (!$('club-ag')) return;
    if (coach === '?' && S.coachNomMem) coach = S.coachNomMem;
    if (coach) { choixCoach(C, coach); if (coach === '?') { box.innerHTML = ''; return; } }
    var fl = coach ? 'tout' : (S.agFiltre || 'tout'), items = [];
    if (fl === 'tout' || fl === 'cours') {
      C.cren.forEach(function (cr) {
        for (var j = new Date(l); j < f; j.setDate(j.getDate() + 1)) {
          var js = j.getDay() === 0 ? 7 : j.getDay(), iso = isoJour(j);
          if (cr.jour_semaine !== js || (cr.du && iso < cr.du) || (cr.au && iso > cr.au)) continue;
          if (C.pauses.some(function (v) { return iso >= v.debut && iso <= v.fin; })) continue;
          if (!monCours(cr, coach)) continue;
          var a = cr.heure_debut.split(':'), b = cr.heure_fin.split(':');
          var d = new Date(j); d.setHours(+a[0], +a[1], 0, 0); var fi = new Date(j); fi.setHours(+b[0], +b[1], 0, 0);
          items.push({ d: d, f: fi, titre: cr.groupes ? String(cr.groupes.nom).replace(/^.*?·\s*/, '').replace(/\s*\([^)]*\)\s*$/, '') : 'Cours', lieu: cr.lieu, enc: cr.encadrant, c: '#5d6b78', type: 'cours' });
        }
      });
    }
    (S.evts || []).forEach(function (e) {
      var d = new Date(e.debut); if (d < l || d >= f) return;
      var arena = e.type === 'seance';
      if (fl === 'cours' || (fl === 'arena' && !arena) || (fl === 'evt' && arena)) return;
      var eg = evGroupes(e), gs = eg.gs;
      if (S.user && S.sel && S.sel !== 'all' && eg.ids.length && !eg.ids.some(function (g) { return (S.groupesDe[g] || []).some(function (p) { return p.id === S.sel; }); })) return;
      if (coach && !encadrePar(e.encadrant, coach) && !eg.ids.some(function (g) { return S.gere.indexOf(g) >= 0; })) return;
      items.push({ d: d, f: e.fin ? new Date(e.fin) : null, titre: e.titre, lieu: e.lieu, enc: e.encadrant, statut: e.statut, objectif: e.objectif, id: e.id, c: arena ? couleurGroupes(gs) : 'var(--ac)', gs: gs, surInsc: e.inscription_ouverte });
    });
    items.sort(function (x, y) { return x.d - y.d; });
    var h = blocPause(C.pauses, l, f);
    if (!items.length) h += '<section class="card empty">Rien au programme cette semaine.</section>';
    var jour = '';
    items.forEach(function (it) {
      var jl = fmtJour(it.d);
      if (jl !== jour) { jour = jl; h += '<div class="dayhead jour">' + esc(jl) + '</div>'; }
      var evc = it.surInsc ? (S.evts || []).filter(function (x) { return x.id === it.id; })[0] : null;
      h += carteAgenda(it, it.c, (it.gs && it.gs.length ? '<span>' + it.gs.map(groupeBadge).join(' ') + '</span>' : '') + (evc && S.pers.length ? etatInsc(evc, eligibles(evc)) : ''));
    });
    box.innerHTML = h;
  }).catch(function () { box.innerHTML = '<section class="card empty">Impossible de charger l\'agenda du club.</section>'; });
}

// Abonnement : l'agenda du club se met à jour tout seul dans le téléphone
function lienAgenda() { return S.compte && S.compte.calendrier_token ? SUPA_URL + '/functions/v1/agenda?t=' + S.compte.calendrier_token : ''; }
function blocSynchro() {
  if (S.apercu) return '<section class="card"><span class="mut small">Synchronisation du téléphone : non disponible en aperçu.</span></section>';
  var l = lienAgenda(); if (!l) return '';
  var web = l.replace(/^https:/, 'webcal:'), ouvert = S.synchroOuverte, gUrl = 'https://calendar.google.com/calendar/r?cid=' + encodeURIComponent(web), andr = estAndroid();
  return '<section class="card stack" style="gap:10px"><b>Mon agenda dans mon téléphone</b><span class="mut small">Ajoute-le une seule fois : les séances, stages et annulations s\'y mettent ensuite à jour tout seuls, pour toute la famille.</span>' +
    '<div class="grid2"><a class="btn navy" href="' + esc(web) + '">' + ic('cal', 18, '#fff') + 'iPhone / Mac</a>' + (andr ? '<button class="btn navy" id="sync-google">Google Agenda</button>' : '<a class="btn navy" target="_blank" rel="noopener" href="' + esc(gUrl) + '">Google Agenda</a>') + '</div>' +
    '<button class="btn line" id="sync-plus">' + (ouvert ? 'Masquer' : 'Android, Outlook et autres') + '</button>' +
    (ouvert ? '<span class="small"><b>Android et Samsung Calendar</b> : ajoute-le avec le bouton Google Agenda (le lien est copié, puis tu le colles sur la page Google). Il apparaît ensuite dans l\'agenda du téléphone, y compris Samsung Calendar : vérifie que « CLOCA Tennis » est coché dans ses calendriers. <b>Outlook</b> : Ajouter un calendrier → À partir d\'Internet, puis colle le lien.</span>' +
      '<input class="f" readonly value="' + esc(l) + '" id="sync-lien" aria-label="Lien de l\'agenda"><div class="grid2"><button class="btn ghost" id="sync-copier">Copier le lien</button><button class="btn ghost" id="sync-reset">Changer de lien</button></div>' +
      '<span class="mut xs">Ce lien est personnel : ne le partage pas. « Changer de lien » désactive l\'ancien (il faudra ré-ajouter l\'agenda).</span>' : '') + '</section>';
}
// Android : seul l'ajout « À partir de l'URL » sur la page web de Google marche (testé le 8/11/2026).
// Le bouton copie le lien puis ouvre cette page dans Chrome (l'appli Google Agenda ignorerait le lien).
function popupGoogleAgenda() {
  var l = lienAgenda(); if (!l) return;
  var page = 'https://calendar.google.com/calendar/r/settings/addbyurl';
  var chrome = 'intent://' + page.replace(/^https:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(page) + ';end';
  var et = function (n, t) { return '<div class="getape"><span>' + n + '</span><div>' + t + '</div></div>'; };
  modale('<div class="stack" style="gap:14px"><div style="text-align:center"><div class="gico">' + ic('cal', 26, '#fff') + '</div><h2 style="margin:10px 0 0;font-size:20px">Ajouter à Google Agenda</h2><span class="mut small">À faire une seule fois.</span></div>' +
    '<div class="stack" style="gap:10px">' + et(1, 'Appuie sur le bouton : le lien est copié et la page Google s\'ouvre. Si elle est en version mobile : menu <b>⋮</b> → <b>« Version pour ordinateur »</b>.') +
    et(2, 'Vérifie en haut à droite que c\'est <b>le compte Google de ton téléphone</b>, colle le lien dans <b>« URL de l\'agenda »</b> et appuie sur <b>« Ajouter un agenda »</b>.') +
    et(3, 'Dans l\'appli <b>Google Agenda</b> : ☰ → <b>Paramètres</b> → ton compte → <b>CLOCA Tennis</b> → active <b>« Synchroniser »</b>.') + '</div>' +
    '<button class="btn navy" id="g-go">Ajouter à Google Agenda</button>' +
    '<input class="f" readonly id="g-lien" value="' + esc(l) + '" aria-label="Lien de l\'agenda" style="display:none"></div>',
    function (d) {
      d.classList.add('centre');
      $('g-go').onclick = function () {
        var ouvrir = function () { location.href = chrome; };
        (navigator.clipboard ? navigator.clipboard.writeText(l) : Promise.reject()).then(function () { toast('Lien copié'); setTimeout(ouvrir, 600); })
          .catch(function () { var i = $('g-lien'); i.style.display = ''; i.select(); try { document.execCommand('copy'); toast('Lien copié'); setTimeout(ouvrir, 600); } catch (e) { toast('Copie le lien ci-dessous, puis réappuie'); } });
      };
    });
}
function lierSynchro() {
  if ($('sync-plus')) $('sync-plus').onclick = function () { S.synchroOuverte = !S.synchroOuverte; render(); };
  if ($('sync-google')) $('sync-google').onclick = popupGoogleAgenda;
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
function pageArenaAccueil() {
  var niv = ['Blanc', 'Violet', 'Rouge', 'Orange', 'Vert', 'Jaune'].map(function (n) { return '<span style="width:18px;height:6px;border-radius:3px;background:' + (NIV[n] ? NIV[n].bg : '#ccc') + '"></span>'; }).join('');
  return '<div class="darkhead"><div class="wrap"><div class="kicker">LES CIRCUITS DU CLUB · SAISON 2026-2027</div><h1>CLOC\'ARENA</h1><p class="small" style="color:#c9d6e2;margin:6px 0 0">Choisis ton circuit.</p></div></div><main>' +
    '<a href="#/arena/tweener" class="card stack" style="gap:10px;text-decoration:none;color:#fff;background:linear-gradient(135deg,#5b3a86,#c62f2f);border:0;padding:22px">' +
      '<span class="xs" style="letter-spacing:1.4px;font-weight:700;opacity:.85">JEUNES · JUSQU\'À 17 ANS</span><span class="disp" style="font-size:34px;line-height:1">CLOC\'ARENA<br>Tweener</span>' +
      '<span class="small" style="opacity:.9">Le tournoi des jeunes toute la saison : classement, programme et résultats, du Blanc au Jaune.</span>' +
      '<span style="display:flex;gap:4px;margin-top:2px">' + niv + '</span><span class="small" style="font-weight:700">Entrer →</span></a>' +
    '<a href="#/arena/masters" class="card stack" style="gap:10px;text-decoration:none;color:#fff;background:linear-gradient(135deg,#102f4a,#2f5b7d);border:0;padding:22px">' +
      '<span class="xs" style="letter-spacing:1.4px;font-weight:700;opacity:.85">ADULTES</span><span class="disp" style="font-size:34px;line-height:1">CLOC\'ARENA<br>Masters</span>' +
      '<span class="small" style="opacity:.9">Le circuit des adultes du club : matchs, défis et classement.</span>' +
      '<span><span class="badge" style="background:#e9a37f;color:#12304a">En préparation</span></span><span class="small" style="font-weight:700">Découvrir →</span></a></main>';
}
function pageMasters() {
  return '<div class="darkhead" style="background:linear-gradient(135deg,#102f4a,#2f5b7d)"><div class="wrap">' + backLink('#/arena', 'CLOC\'ARENA', true) + '<div class="kicker" style="margin-top:8px">ADULTES</div><h1>CLOC\'ARENA Masters</h1></div></div><main>' +
    '<section class="card stack" style="gap:10px"><span class="badge" style="background:var(--sun);color:#12304a;align-self:flex-start">En préparation</span><b>Le circuit des adultes arrive bientôt</b>' +
    '<span class="mut small">Matchs entre adhérents adultes, défis et classement de la saison, sur le même principe que CLOC\'ARENA Tweener pour les jeunes. Les infos seront publiées ici et dans les actus du club.</span></section></main>';
}
function pageArena() {
  var h = '<div class="darkhead"><div class="wrap">' + backLink('#/arena', 'CLOC\'ARENA', true) + '<div class="kicker" style="margin-top:8px">JEUNES · SAISON 2026-2027</div><h1>CLOC\'ARENA Tweener</h1>' +
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
    var lien = function (c, inner) { return '<a href="#/fiche/' + c.personne_id + '">' + inner + '</a>'; };
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
    if (jl !== jour) { jour = jl; h += '<div class="dayhead jour">' + esc(jl) + '</div>'; }
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
      var h = '<div class="darkhead" style="background:' + c.bg + ';color:' + c.fg + '"><div class="wrap">' + backLink('#/arena/tweener', 'Classement', c.fg === '#fff') +
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
        '<p class="mut xs" style="text-align:center">Fiche CLOC\'ARENA visible par tous les adhérents.</p></main>';
      $('app').innerHTML = h;
    }).catch(function () {
      $('app').innerHTML = '<div class="pagehead">' + backLink('#/arena/tweener', 'Classement') + '</div><main><section class="card empty">Fiche introuvable : ce joueur n\'a pas (ou plus) de niveau CLOC\'ARENA.</section></main>';
    });
  });
  return '<div style="padding:40px 16px"><div class="skel"></div></div>';
}

// ---------- Club ----------
function pageClub(sous) {
  if (sous) S.clubTab = sous;
  var h = '<div class="pagehead wrap"><h1>Vie du club</h1></div><main>' +
    '<div class="seg seg5">' + [['actus', 'Actus'], ['evenements', 'Événements'], ['competitions', 'Compét.'], ['annonces', 'Annonces'], ['infos', 'Infos']].map(function (t) {
      return '<button data-ctab="' + t[0] + '" class="' + (S.clubTab === t[0] ? 'on' : '') + '">' + t[1] + '</button>';
    }).join('') + '</div><div id="club-main" style="display:flex;flex-direction:column;gap:12px"></div></main>';
  setTimeout(function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-ctab]'), function (b) { b.onclick = function () { go('#/club/' + b.dataset.ctab); }; });
    var box = $('club-main');
    if (S.clubTab === 'actus') box.innerHTML = clubActus();
    else if (S.clubTab === 'evenements') box.innerHTML = clubEvenements();
    else if (S.clubTab === 'infos') { box.innerHTML = clubInfos(); remplirPresence(); }
    else if (S.clubTab === 'competitions') box.innerHTML = clubCompetitions();
    else clubAnnonces(box);
  });
  return h;
}
// Compétitions du club : CLOC'ARENA Tweener, CLOC'ARENA Masters, double interne
function clubCompetitions() {
  var carte = function (lien, fond, kicker, titre, texte, extra) { return '<a href="' + lien + '" class="card stack" style="gap:6px;text-decoration:none;color:#fff;background:' + fond + ';border:0;padding:18px"><span class="xs" style="letter-spacing:1.3px;font-weight:700;opacity:.85">' + kicker + '</span><span class="disp" style="font-size:26px;line-height:1.05">' + titre + '</span><span class="small" style="opacity:.9">' + texte + '</span>' + (extra || '') + '<span class="small" style="font-weight:700">Entrer →</span></a>'; };
  var niv = ['Blanc', 'Violet', 'Rouge', 'Orange', 'Vert', 'Jaune'].map(function (n) { return '<span style="width:18px;height:6px;border-radius:3px;background:' + NIV[n].bg + '"></span>'; }).join('');
  return carte('#/arena/tweener', 'linear-gradient(135deg,#5b3a86,#c62f2f)', 'JEUNES · JUSQU\'À 17 ANS', 'CLOC\'ARENA Tweener', 'Classement, programme et résultats de la saison, du Blanc au Jaune.', '<span style="display:flex;gap:4px">' + niv + '</span>') +
    carte('#/arena/masters', 'linear-gradient(135deg,#102f4a,#2f5b7d)', 'ADULTES', 'CLOC\'ARENA Masters', 'Le circuit des adultes : matchs, défis et classement.', '<span><span class="badge" style="background:#e9a37f;color:#12304a">En préparation</span></span>') +
    carte('#/double', 'linear-gradient(135deg,#8a3b1c,#c9693a)', 'TOUS LES ADHÉRENTS', 'Tournoi interne de double', 'Poules, disponibilités, réservations de terrain et scores.');
}
function imgActu(a) { var img = safeUrl(a.image_url); return img && !/drive\.google\.com\/file/.test(img) ? img : ''; }
// Carte courte : titre, début du texte, et un appel à ouvrir l'actu en entier
function carteActu(a, sur) {
  var img = imgActu(a);
  return '<a class="card stack" href="#/actu/' + a.id + '" style="gap:6px;text-decoration:none;color:var(--tx)">' +
    (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" style="width:100%;max-height:180px;object-fit:cover;border-radius:12px" onerror="this.remove()">' : '') +
    '<span class="eyebrow">' + (sur ? esc(sur) + ' · ' : '') + esc(fmtCourt(new Date(a.publie_le))) + (a.epingle ? ' · 📌' : '') + '</span>' +
    '<b class="disp" style="font-size:22px;line-height:1.1">' + esc(a.titre) + '</b>' +
    (a.texte ? '<span class="mut small clamp2">' + esc(String(a.texte).replace(/\s+/g, ' ')) + '</span>' : '') +
    '<span style="font-weight:600;color:var(--ac);margin-top:2px">Voir les infos →</span></a>';
}
// Actus : l'actu épinglée en premier, puis « À ne pas manquer » (rempli tout seul : fête, inscriptions ouvertes), puis les autres actus
function aNePasManquer() {
  var now = new Date(), l = [];
  (S.fetes || []).filter(function (f) { return f.actif && new Date(f.fin || f.debut) > now; }).forEach(function (f) {
    if (feteConcerne(f)) l.push({ d: new Date(f.debut), lien: '#/noel', k: f.inscription_ouverte ? 'Réponse attendue' : 'Fête du club', t: f.titre + ' · ' + fmtJour(new Date(f.debut)).toLowerCase(),
      s: f.inscription_ouverte ? 'Dis-nous si tu viens' : 'Toutes les infos' });
    if (f.tombola_ouverte) l.push({ d: new Date(f.debut), lien: '#/noel/tombola', k: 'Tombola', t: '🎟️ Tickets en vente jusqu\'au ' + fmtCourt(new Date(f.debut)), s: (+f.prix_ticket) + ' € le ticket' + (f.carnet_nb ? ', ' + (+f.prix_carnet) + ' € les ' + f.carnet_nb : '') + ' · lots remis même si tu n\'es pas là au tirage' });
  });
  (S.evts || []).filter(function (e) { return e.type !== 'seance' && inscOuverte(e); }).forEach(function (e) {
    l.push({ d: new Date(e.debut), lien: '#/evenement/' + e.id, k: 'Inscriptions ouvertes', t: e.titre, s: fmtJour(new Date(e.debut)) + (e.lieu ? ' · ' + e.lieu : '') });
  });
  return l.sort(function (a, b) { return a.d - b.d; });
}
function carteAuto(x) {
  return '<a class="card stack" href="' + x.lien + '" style="gap:4px;text-decoration:none;color:inherit;border-left:4px solid var(--ac)"><span class="eyebrow" style="color:var(--ac)">' + esc(x.k) + '</span><b>' + esc(x.t) + '</b><span class="mut small">' + esc(x.s) + '</span></a>';
}
function clubActus() {
  var l = S.pubs || [], auto = aNePasManquer();
  var ep = l.filter(function (a) { return a.epingle; }), autres = l.filter(function (a) { return !a.epingle; });
  if (!l.length && !auto.length) return '<section class="card empty">Pas d\'actu pour le moment.</section>' + suivre();
  return ep.map(function (a) { return carteActu(a, 'À la une'); }).join('') +
    (auto.length ? '<div class="dayhead">À ne pas manquer</div>' + auto.map(carteAuto).join('') : '') +
    (autres.length ? '<div class="dayhead">Dernières actus</div>' + autres.map(function (a) { return carteActu(a); }).join('') : '') + suivre();
}
function pageActu(id) {
  var a = (S.pubs || []).filter(function (x) { return x.id === id; })[0];
  if (!a) return '<div class="pagehead">' + backLink('#/club/actus', 'Vie du club') + '</div><main><section class="card empty">Cette actu n\'est plus en ligne.</section></main>';
  var img = imgActu(a), link = safeUrl(a.lien);
  // Texte : paragraphes et listes numérotées (1️⃣, 2️⃣…) chacun sur sa ligne
  var texte = String(a.texte || '').replace(/\s*([0-9]\uFE0F?\u20E3)/g, '\n$1').replace(/^\n+/, '');
  var paras = texte.split(/\n{2,}/).map(function (p) { return '<p style="margin:0 0 12px;white-space:pre-line">' + esc(p.trim()) + '</p>'; }).join('');
  return '<div class="darkhead"><div class="wrap">' + backLink('#/club/actus', 'Vie du club', true) +
    '<div class="kicker" style="margin-top:8px">' + esc(fmtJour(new Date(a.publie_le)).toUpperCase()) + '</div><h1 style="margin-top:6px">' + esc(a.titre) + '</h1></div></div><main>' +
    (img ? '<img src="' + esc(img) + '" alt="" style="width:100%;border-radius:16px" onerror="this.remove()">' : '') +
    (paras ? '<section class="card" style="font-size:16px;line-height:1.6">' + paras + '</section>' : '') +
    (link ? '<a class="btn" href="' + esc(link) + '" target="_blank" rel="noopener">Ouvrir le lien</a>' : '') + '</main>';
}
function suivre() {
  return '<section class="card stack" style="gap:10px"><b>Suivez-nous</b><span class="mut small">Photos, moments forts et performances des joueurs.</span><div class="grid2"><a class="btn line" href="' + INSTAGRAM_URL + '" target="_blank" rel="noopener">Instagram</a><a class="btn line" href="' + FACEBOOK_URL + '" target="_blank" rel="noopener">Facebook</a></div></section>';
}
// Événements : tout ce qui se passe au club, rempli tout seul (fêtes et tombola, stages et animations, vacances sans cours)
function clubEvenements() {
  var now = new Date(), lim = new Date(); lim.setMonth(lim.getMonth() + 4);
  if (!S.pauses) {
    q(sb.from('periodes_sans_cours').select('debut, fin, libelle')).catch(function () { return []; }).then(function (p) { S.pauses = p || []; if ($('club-main') && S.clubTab === 'evenements') $('club-main').innerHTML = clubEvenements(); });
    return '<div class="skel"></div>';
  }
  var it = [];
  (S.fetes || []).filter(function (f) { return f.actif && new Date(f.fin || f.debut) >= now; }).forEach(function (f) {
    var d = new Date(f.debut);
    if (feteConcerne(f)) it.push({ d: d, h: '<a class="ev" href="#/noel"><div class="datebox"><span>' + esc(d.toLocaleDateString('fr-FR', { month: 'short' })) + '</span><b>' + d.getDate() + '</b></div><div class="stack" style="flex:1;min-width:0"><b>' + esc(f.titre) + '</b><span class="mut small">' + fmtH(d) + (f.fin ? ' – ' + fmtH(new Date(f.fin)) : '') + ' · au club</span>' +
      (f.inscription_ouverte ? '<span><span class="badge" style="background:var(--ok);color:#fff">Réponds dans l\'appli</span></span>' : '') + '</div></a>' });
    // La tombola a sa propre ligne : on peut prendre des tickets dès maintenant, jusqu'au tirage
    if (f.tombola_ouverte) it.push({ d: now, h: '<a class="ev" href="#/noel/tombola"><div class="datebox" style="background:var(--sun);color:#12304a"><span>' + esc(d.toLocaleDateString('fr-FR', { month: 'short' })) + '</span><b style="color:#12304a">' + d.getDate() + '</b></div><div class="stack" style="flex:1;min-width:0"><b>🎟️ Tombola · ' + esc(f.titre) + '</b>' +
      '<span class="mut small">' + (+f.prix_ticket) + ' € le ticket' + (f.carnet_nb ? ', ' + (+f.prix_carnet) + ' € les ' + f.carnet_nb : '') + ' · tirage le ' + esc(fmtJour(d).toLowerCase()) + ', lots remis même aux absents</span><span><span class="badge" style="background:var(--ok);color:#fff">Tickets en vente jusqu\'au ' + d.getDate() + '</span></span></div></a>' });
  });
  (S.evts || []).filter(function (e) { return e.type !== 'seance' && e.statut !== 'annule' && new Date(e.fin || e.debut) >= now; }).forEach(function (e) {
    var d = new Date(e.debut);
    it.push({ d: d, h: '<a class="ev" href="#/evenement/' + e.id + '"><div class="datebox"><span>' + esc(d.toLocaleDateString('fr-FR', { month: 'short' })) + '</span><b>' + d.getDate() + '</b></div><div class="stack" style="flex:1;min-width:0"><b>' + esc(e.titre) + '</b><span class="mut small">' + [fmtH(d), e.lieu].filter(Boolean).map(esc).join(' · ') + '</span>' +
      (e.inscription_ouverte ? '<span><span class="badge" style="background:var(--ok);color:#fff">Inscriptions ouvertes</span></span>' : '') + '</div></a>' });
  });
  // séances CLOC'ARENA : pas ici (déjà dans l'agenda de chaque joueur et la carte Mon CLOC'ARENA)
  S.pauses.filter(function (p) { var f = new Date(p.fin + 'T23:59:00'); return f >= now && new Date(p.debut) <= lim; }).forEach(function (p) {
    var d = new Date(p.debut + 'T12:00:00'), f = new Date(p.fin + 'T12:00:00'), un = p.debut === p.fin;
    it.push({ d: d, h: '<div class="ev off" style="cursor:default"><div class="datebox" style="background:var(--soft);color:var(--mut);box-shadow:none"><span>' + esc(d.toLocaleDateString('fr-FR', { month: 'short' })) + '</span><b style="color:var(--mut)">' + d.getDate() + '</b></div><div class="stack" style="flex:1;min-width:0"><b>' + esc(p.libelle) + '</b><span class="mut small">Pas de cours collectifs' + (un ? '' : ' du ' + esc(fmtCourt(d)) + ' au ' + esc(fmtCourt(f))) + '</span></div></div>' });
  });
  it = it.filter(function (x) { return x.d <= lim || x.d < now; }).sort(function (a, b) { return a.d - b.d; });
  if (!it.length) return '<section class="card empty">Pas d\'événement annoncé pour le moment.</section>';
  var mois = '';
  return it.map(function (x) { var m = x.d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); var t = m !== mois ? '<div class="dayhead">' + esc(m.charAt(0).toUpperCase() + m.slice(1)) + '</div>' : ''; mois = m; return t + x.h; }).join('') +
    '<p class="mut xs" style="text-align:center">Fêtes, stages, animations et vacances s\'ajoutent ici tout seuls.</p>';
}
function clubEvenementsAncien() {
  var now = new Date();
  var l = (S.evts || []).filter(function (e) { return e.type !== 'seance'; });
  var avenir = l.filter(function (e) { return new Date(e.fin || e.debut) >= now; }), passes = l.filter(function (e) { return new Date(e.fin || e.debut) < now; }).reverse().slice(0, 6);
  if (!l.length) return '<section class="card empty">Pas d\'événement annoncé pour le moment.</section>';
  var carte = function (e, passe) {
    var d = new Date(e.debut);
    return '<a class="ev' + (passe ? ' off' : '') + '" href="#/evenement/' + e.id + '"><div class="datebox"><span>' + esc(d.toLocaleDateString('fr-FR', { month: 'short' })) + '</span><b>' + d.getDate() + '</b></div><div class="stack" style="flex:1;min-width:0">' +
      '<b>' + esc(e.titre) + '</b><span class="mut small">' + [fmtH(d), e.lieu].filter(Boolean).map(esc).join(' · ') + '</span>' +
      (e.inscription_ouverte && !passe ? '<span><span class="badge" style="background:var(--ok);color:#fff">Inscriptions ouvertes</span></span>' : '') + '</div></a>';
  };
  return (avenir.length ? '<div class="dayhead">À venir</div>' + avenir.map(function (e) { return carte(e, false); }).join('') : '') +
    (passes.length ? '<div class="dayhead">Passés</div>' + passes.map(function (e) { return carte(e, true); }).join('') : '');
}
function horairesTexte(t) {
  var J = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'], H = HORAIRES[t] || {};
  var l = [1, 2, 3, 4, 5, 6, 7].filter(function (j) { return H[j] && H[j].length; });
  if (!l.length) return '<b>Fermé pour le moment</b>';
  var f = function (x) { return x.replace(/^0/, '').replace(':', 'h').replace('h00', 'h'); };
  return l.map(function (j) { return '<span class="small"><b>' + J[j] + '</b> · ' + H[j].map(function (c) { return f(c[0]) + ' – ' + f(c[1]); }).join(' et ') + '</span>'; }).join('');
}
function clubInfos() {
  return '<section class="card stack" style="gap:6px"><span class="eyebrow">Le club</span><b style="font-size:17px">CLOCA Tennis</b><span class="mut">' + esc(reg('club_adresse', '81 rue de Saint-Germain, 78260 Achères')) + '</span>' +
    '<a class="btn" style="margin-top:6px" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(reg('club_adresse', '81 rue de Saint-Germain, 78260 Achères')) + '">' + ic('pin', 18, '#fff') + 'Itinéraire</a></section>' +
    '<div id="presence"></div><section class="card stack" style="gap:6px"><span class="eyebrow">Club house</span>' + horairesTexte('clubhouse') + '<a class="btn ghost" href="tel:' + esc(String(reg('club_tel', '01 39 11 69 47')).replace(/\s/g, '')) + '">' + esc(reg('club_tel', '01 39 11 69 47')) + '</a></section>' +
    '<section class="card stack" style="gap:6px"><span class="eyebrow">Coordinateur sportif</span><b>' + esc(reg('coord_nom', 'Dorian')) + '</b><a class="btn" target="_blank" rel="noopener" href="https://wa.me/' + WA_CLUB + '">WhatsApp</a>' +
    '<div class="grid2"><a class="btn line" href="tel:+' + WA_CLUB + '">Appeler</a><a class="btn line" href="sms:+' + WA_CLUB + '">SMS</a></div></section>' +
    '<section class="card stack" style="gap:6px"><span class="eyebrow">Installer l\'appli</span><span class="small"><b>iPhone</b> : dans Safari, bouton Partager, puis « Sur l\'écran d\'accueil ».<br><b>Android</b> : dans Chrome, menu ⋮, puis « Installer l\'application ».</span></section>' +
    suivre() + '<p class="mut xs" style="text-align:center"><a href="confidentialite.html" style="color:var(--mut)">Politique de confidentialité</a></p>';
}
// Petites annonces : recherche de partenaire et matériel à vendre, validées par le club.
// L'auteur choisit lui-même comment on le contacte (messages dans l'appli, numéro, WhatsApp) : les adhérents se mettent
// en relation directement. Numéro visible seulement des adhérents connectés et tant que l'annonce est en ligne (règle en base).
var AN = { liste: null, type: 'partenaire', form: null, f: {}, contacts: {} };
function photoUrl(p) { return p ? SUPA_URL + '/storage/v1/object/public/annonces/' + p.split('/').map(encodeURIComponent).join('/') : ''; }
// Compte jeune (mineur avec son propre téléphone) : ni message privé, ni numéro, ni WhatsApp
function estCompteJeune() { return !!S.jeune; } // fixé par la base (suis_compte_jeune), chargé avec les annonces
function annonceDirecte(a) { return !!(a.contact_appli || a.contact_tel || a.contact_wa); }
function chargerAnnonces() {
  var jeune = S.user && S.jeune == null ? q(sb.rpc('suis_compte_jeune')).then(function (j) { S.jeune = !!j; }).catch(function () { S.jeune = false; }) : Promise.resolve();
  return jeune.then(function () { return Promise.all([
    q(sb.from('annonces').select('id, num, type, created_at, cree_par, prenom, titre, niveau, dispo, prix, description, image_path, images, statut, expire_le, contact_appli, contact_tel, contact_wa').in('statut', ['attente', 'publiee']).order('created_at', { ascending: false })),
    S.user && !estCompteJeune() ? q(sb.rpc('annonces_contacts')).catch(function () { return []; }) : Promise.resolve([])
  ]); }).then(function (r) {
    AN.liste = r[0] || []; AN.contacts = {};
    (r[1] || []).forEach(function (c) { AN.contacts[c.annonce_id] = c; });
    return AN.liste;
  });
}
function moyensTexte(a) {
  var m = [];
  if (a.contact_appli) m.push('messages dans l\'appli'); if (a.contact_tel) m.push('numéro affiché'); if (a.contact_wa) m.push('WhatsApp');
  return m.length ? m.join(' · ') : 'mise en relation par le club';
}
function blocContact(a) {
  var c = AN.contacts[a.id] || {}, qui = a.type === 'partenaire' ? a.prenom : c.prenom || 'le vendeur';
  if (!S.user) return '<a class="btn line" href="#/profil">Connecte-toi pour contacter ' + esc(qui) + '</a>';
  if (estCompteJeune()) return '<div class="small" style="background:var(--soft);border-radius:12px;padding:10px 12px">' + ic('lock', 16) + ' <b>Compte jeune</b> : pour contacter ' + esc(qui) + ', demande à un parent depuis son compte.</div>';
  if (!annonceDirecte(a)) {
    var wa = function (t) { return 'https://wa.me/' + WA_CLUB + '?text=' + encodeURIComponent(t); };
    return '<a class="btn" target="_blank" rel="noopener" href="' + esc(wa(a.type === 'vente' ? 'Bonjour, je suis intéressé(e) par l\'annonce n°' + a.num + ' : ' + a.titre + '. Pouvez-vous me mettre en relation ?' : 'Bonjour, je suis intéressé(e) par la demande de partenaire n°' + a.num + ' (' + a.prenom + ', ' + a.niveau + '). Pouvez-vous nous mettre en relation ?')) + '">Me mettre en relation</a>';
  }
  var tel = c.tel && telWa(c.tel), h = '<div class="stack" style="gap:8px;margin-top:2px">';
  if (a.contact_appli) h += '<button class="btn" data-anmsg="' + a.id + '">' + ic('chat', 18, '#fff') + 'Envoyer un message</button>';
  var bas = [];
  if (a.contact_tel && tel) bas.push('<a class="btn line" href="tel:+' + tel + '">' + ic('phone', 17) + 'Appeler</a>');
  if (a.contact_wa && tel) bas.push('<a class="btn line" target="_blank" rel="noopener" href="https://wa.me/' + tel + '?text=' + encodeURIComponent('Bonjour, je te contacte pour ton annonce n°' + a.num + (a.titre ? ' (' + a.titre + ')' : '') + ' sur l\'appli CLOCA Tennis.') + '">' + ic('wa', 17) + 'WhatsApp</a>');
  if (bas.length) h += bas.length > 1 ? '<div class="grid2">' + bas.join('') + '</div>' : bas[0];
  if (a.contact_tel && c.tel) h += '<span class="small" style="text-align:center">' + ic('phone', 14, 'var(--mut)') + ' ' + esc(qui.charAt(0).toUpperCase() + qui.slice(1)) + ' : <b>' + esc(c.tel) + '</b></span>';
  return h + '</div>';
}
function carteAnnonce(a, opts) {
  var h = '<section class="card stack" style="gap:6px">', c = AN.contacts[a.id] || {};
  if (a.type === 'vente') {
    var imgs = (a.images && a.images.length ? a.images : a.image_path ? [a.image_path] : []);
    if (imgs.length) h += carrousel(imgs);
    h += '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><b>' + esc(a.titre) + '</b>' + (a.prix ? '<span class="badge" style="background:var(--ac);color:#fff">' + esc(a.prix) + '</span>' : '') + '</div>' +
      (a.description ? '<span class="mut small" style="white-space:pre-line">' + esc(a.description) + '</span>' : '');
  } else {
    h += '<div style="display:flex;justify-content:space-between;gap:8px"><b>' + esc(a.prenom) + '</b>' + (NIV[a.niveau] ? niveauBadge(a.niveau) : '<span class="badge" style="background:var(--soft);color:var(--tx)">' + esc(a.niveau) + '</span>') + '</div>' +
      '<span class="mut small">' + esc(a.dispo) + '</span>' + (a.description ? '<span class="small" style="white-space:pre-line">' + esc(a.description) + '</span>' : '');
  }
  h += '<span class="mut xs">Annonce n°' + a.num + ' · ' + esc(fmtCourt(new Date(a.created_at))) + (a.type === 'vente' && c.prenom ? ' · ' + esc(c.prenom) : '') + '</span>';
  if (opts.statut) h += '<span><span class="badge" style="background:' + (a.statut === 'attente' ? 'var(--soft)' : 'var(--ok)') + ';color:' + (a.statut === 'attente' ? 'var(--tx)' : '#fff') + '">' + (a.statut === 'attente' ? 'En attente de validation' : 'Publiée jusqu\'au ' + esc(fmtCourt(new Date(a.expire_le + 'T12:00:00')))) + '</span></span>' +
    '<span class="xs mut">On te contacte par : ' + esc(moyensTexte(a)) + '</span>';
  if (opts.contact) h += blocContact(a);
  if (opts.retirer) h += '<button class="btn line" data-anstat="' + a.id + '|close">Retirer mon annonce</button>';
  return h + '</section>';
}
function clubAnnonces(box) {
  if (AN.form) return formAnnonce(box);
  box.innerHTML = '<div class="skel"></div>';
  chargerAnnonces().then(function (l) {
    var moi = S.user ? S.user.id : null; // validation et gestion : espace gestion
    var pub = l.filter(function (a) { return a.statut === 'publiee' && a.type === AN.type; });
    var h = '';
    var mes = moi ? l.filter(function (a) { return a.cree_par === moi; }) : [];
    if (mes.length) h += '<div class="dayhead">Mes annonces</div>' + mes.map(function (a) { return carteAnnonce(a, { statut: true, retirer: true }); }).join('');
    h += '<div class="chips" style="margin-top:6px"><button class="chip ' + (AN.type === 'partenaire' ? 'on' : '') + '" data-antype="partenaire">Recherche de partenaire</button><button class="chip ' + (AN.type === 'vente' ? 'on' : '') + '" data-antype="vente">Matériel à vendre</button></div>';
    h += pub.length ? pub.map(function (a) { return carteAnnonce(a, { contact: a.cree_par !== moi }); }).join('')
      : '<section class="card empty">' + (AN.type === 'vente' ? 'Aucun article à vendre pour le moment.' : 'Aucune demande pour le moment. Sois le premier à en déposer une !') + '</section>';
    h += '<button class="btn" id="an-new">' + (AN.type === 'vente' ? 'Vendre du matériel' : 'Déposer une demande de partenaire') + '</button>' +
      '<p class="mut xs" style="text-align:center">Tu contactes directement l\'auteur, par les moyens qu\'il a choisis. Un problème ? Bouton « Signaler » dans la conversation. Les annonces restent en ligne ' + (reg('annonces_duree') || 60) + ' jours.</p>';
    box.innerHTML = h;
    Array.prototype.forEach.call(box.querySelectorAll('[data-antype]'), function (b) { b.onclick = function () { AN.type = b.dataset.antype; clubAnnonces(box); }; });
    $('an-new').onclick = function () { if (!S.user) return go('#/profil'); AN.form = AN.type; AN.f = {}; clubAnnonces(box); };
    Array.prototype.forEach.call(box.querySelectorAll('[data-anstat]'), function (b) {
      b.onclick = function () {
        var x = b.dataset.anstat.split('|');
        if (x[1] === 'close' && !confirm('Retirer cette annonce ? Ton numéro ne sera plus affiché.')) return;
        q(sb.from('annonces').update({ statut: x[1] }).eq('id', x[0])).then(function () { toast('Annonce retirée'); clubAnnonces(box); }).catch(function () { toast('Action impossible'); });
      };
    });
    // Message privé : la base crée (ou retrouve) la conversation entre l'acheteur et l'auteur, liée à l'annonce
    Array.prototype.forEach.call(box.querySelectorAll('[data-anmsg]'), function (b) {
      b.onclick = function () {
        b.disabled = true;
        q(sb.rpc('annonce_discussion', { p_annonce: b.dataset.anmsg })).then(function (id) {
          return chargerDiscussions().then(function () { go('#/discussion/' + id); });
        }).catch(function () { b.disabled = false; toast('Conversation impossible pour le moment'); });
      };
    });
  }).catch(function () { box.innerHTML = '<section class="card empty">Impossible de charger les annonces pour le moment.</section>'; });
}
// Photos d'une annonce : on fait défiler du doigt (ou avec les flèches sur ordinateur)
function carrousel(imgs) {
  return '<div class="carou"><div class="car-l">' + imgs.map(function (p, i) { return '<img src="' + esc(photoUrl(p)) + '" alt="Photo ' + (i + 1) + '" loading="lazy">'; }).join('') + '</div>' +
    (imgs.length > 1 ? '<button class="car-b g" data-car="-1" aria-label="Photo précédente">‹</button><button class="car-b d" data-car="1" aria-label="Photo suivante">›</button>' +
      '<span class="car-n">1 / ' + imgs.length + '</span><div class="car-dots">' + imgs.map(function (p, i) { return '<span class="' + (i ? '' : 'on') + '"></span>'; }).join('') + '</div>' : '') + '</div>';
}
document.addEventListener('scroll', function (e) {
  var l = e.target; if (!l.classList || !l.classList.contains('car-l')) return;
  var c = l.parentNode, i = Math.round(l.scrollLeft / l.clientWidth), n = l.children.length;
  var t = c.querySelector('.car-n'); if (t) t.textContent = (i + 1) + ' / ' + n;
  Array.prototype.forEach.call(c.querySelectorAll('.car-dots span'), function (d, k) { d.className = k === i ? 'on' : ''; });
}, true);
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-car]'); if (!b) return;
  var l = b.parentNode.querySelector('.car-l'); l.scrollBy({ left: +b.dataset.car * l.clientWidth, behavior: 'smooth' });
});
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
// Réglages de contact retenus par compte (pré-remplissent la prochaine annonce, comme le mémo du cordage)
function chargerPrefsAnnonce() {
  if (!S.user) return Promise.resolve(null);
  return q(sb.from('annonce_prefs').select('contact_appli, contact_tel, contact_wa, tel').eq('user_id', S.user.id).maybeSingle()).catch(function () { return null; });
}
function formAnnonce(box) {
  var v = AN.form === 'vente', F = AN.f, jeune = estCompteJeune();
  if (!F._init) {
    F._init = true; F.appli = !jeune; F.tel = false; F.wa = false;
    chargerPrefsAnnonce().then(function (m) {
      if (!m || jeune || AN.form === null) return;
      F.appli = !!m.contact_appli; F.tel = !!m.contact_tel; F.wa = !!m.contact_wa; F.contact = F.contact || m.tel || ''; F.memo = true;
      formAnnonce(box);
    });
  }
  var champ = function (k, label, attrs, ta) { return '<label class="f">' + label + (ta ? '<textarea class="f" data-anf="' + k + '" ' + attrs + '>' + esc(F[k] || '') + '</textarea>' : '<input class="f" data-anf="' + k + '" ' + attrs + ' value="' + esc(F[k] || '') + '">') + '</label>'; };
  var caseC = function (id, k, titre, aide) { return '<label class="check" style="min-height:0;padding:4px 0"><input type="checkbox" id="' + id + '"' + (F[k] ? ' checked' : '') + '><span><b>' + titre + '</b><br><span class="mut xs">' + aide + '</span></span></label>'; };
  var numero = F.tel || F.wa;
  var moyens = jeune
    ? '<div class="f" id="an-moyens"><b style="font-size:15px">Comment te contacter ?</b><span class="small" style="background:var(--soft);border-radius:12px;padding:10px 12px;font-weight:400">' + ic('lock', 16) + ' <b>Compte jeune</b> : ton numéro n\'est jamais affiché et personne ne peut t\'écrire en privé. Le club fait la mise en relation avec tes parents.</span></div>'
    : '<div class="f stack" id="an-moyens" style="gap:2px;border:1px solid var(--bd);border-radius:14px;padding:12px 14px"><b style="font-size:15px">Comment veux-tu être contacté ?</b><span class="mut xs" style="font-weight:400;margin-bottom:4px">Les adhérents connectés te contactent directement, sans passer par le club.</span>' +
      caseC('an-appli', 'appli', 'Messages dans l\'appli', 'Recommandé : ton numéro reste caché.') +
      caseC('an-tel', 'tel', 'Afficher mon numéro', 'Bouton « Appeler » sous l\'annonce.') +
      caseC('an-wa', 'wa', 'Bouton WhatsApp', 'Créé à partir de ton numéro, rien d\'autre à faire.') +
      (numero ? champ('contact', 'Mon numéro <span class="mut" style="font-weight:400">(visible des adhérents connectés tant que l\'annonce est en ligne)</span>', 'type="tel" inputmode="tel" autocomplete="tel" maxlength="40" placeholder="06 12 34 56 78"') : '') +
      '<label class="check" style="min-height:0;padding:8px 0 0;border-top:1px solid var(--bd);margin-top:6px"><input type="checkbox" id="an-memo"' + (F.memo ? ' checked' : '') + '><span class="small">Retenir ces choix pour mes prochaines annonces</span></label></div>';
  box.innerHTML = '<section class="card stack" style="gap:12px"><b style="font-size:17px">' + (v ? 'Vendre du matériel' : 'Chercher un partenaire') + '</b>' +
    (v ? champ('titre', 'Quoi ?', 'maxlength="80" placeholder="Ex. Raquette Babolat Pure Drive 26"') + champ('prix', 'Prix', 'maxlength="30" placeholder="Ex. 40 €"') +
      champ('description', 'Description (facultatif)', 'maxlength="600" placeholder="État, taille, tension…"', true) +
      '<div class="f">Photos (facultatif, jusqu\'à 6)<div id="an-ph" class="an-ph"></div><label class="btn line" style="margin-top:6px">+ Ajouter des photos<input type="file" accept="image/*" multiple id="an-photo" hidden></label></div>'
      : champ('prenom', 'Prénom', 'maxlength="40" autocomplete="given-name"') +
      '<label class="f">Niveau<select class="f" data-anf="niveau"><option value="">Choisir…</option>' + NIVEAUX.concat(['Adulte / autre']).map(function (n) { return '<option' + (F.niveau === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>' +
      champ('dispo', 'Mes disponibilités', 'maxlength="140" placeholder="Ex. mercredi après-midi, samedi matin"') +
      champ('description', 'Message (facultatif)', 'maxlength="600" placeholder="Ex. je cherche quelqu\'un pour m\'entraîner"', true)) +
    moyens +
    '<label class="check"><input type="checkbox" id="an-ok"' + (F.ok ? ' checked' : '') + '><span>J\'accepte que mon annonce soit publiée dans l\'appli après validation par le club' + (jeune ? '.' : ', et que les adhérents connectés me contactent par les moyens cochés. Je peux retirer l\'annonce à tout moment : mon numéro disparaît avec elle.') + '</span></label>' +
    '<button class="btn" id="an-go">Envoyer</button><button class="btn line" id="an-back">Annuler</button></section>';
  Array.prototype.forEach.call(box.querySelectorAll('[data-anf]'), function (i) { i.oninput = i.onchange = function () { F[i.dataset.anf] = i.value; }; });
  // Cocher « numéro » ou « WhatsApp » fait apparaître le champ du numéro
  [['an-appli', 'appli'], ['an-tel', 'tel'], ['an-wa', 'wa'], ['an-memo', 'memo'], ['an-ok', 'ok']].forEach(function (x) {
    if ($(x[0])) $(x[0]).onchange = function () { var avant = F.tel || F.wa; F[x[1]] = this.checked; if ((F.tel || F.wa) !== avant) { formAnnonce(box); if ($('an-moyens')) $('an-moyens').scrollIntoView({ block: 'nearest' }); } };
  });
  AN.photos = AN.photos || [];
  var majPhotos = function () {
    if (!$('an-ph')) return;
    $('an-ph').innerHTML = AN.photos.map(function (f, i) { return '<span class="th"><img src="' + URL.createObjectURL(f) + '" alt=""><button type="button" data-phx="' + i + '" aria-label="Retirer la photo">×</button></span>'; }).join('');
    Array.prototype.forEach.call($('an-ph').querySelectorAll('[data-phx]'), function (b) { b.onclick = function () { AN.photos.splice(+b.dataset.phx, 1); majPhotos(); }; });
  };
  if ($('an-photo')) $('an-photo').onchange = function () {
    var l = Array.prototype.slice.call(this.files || []);
    if (AN.photos.length + l.length > 6) toast('6 photos maximum');
    AN.photos = AN.photos.concat(l).slice(0, 6); this.value = ''; majPhotos();
  };
  majPhotos();
  $('an-back').onclick = function () { AN.form = null; AN.photos = []; clubAnnonces(box); };
  $('an-go').onclick = function () {
    var t = function (k) { return String(F[k] || '').trim(); };
    if (v && !t('titre')) return toast('Indique ce que tu vends');
    if (!v && (!t('prenom') || !t('niveau') || !t('dispo'))) return toast('Prénom, niveau et disponibilités sont nécessaires');
    if (!jeune && !F.appli && !F.tel && !F.wa) return toast('Choisis au moins un moyen d\'être contacté');
    if ((F.tel || F.wa) && !telWa(t('contact'))) return toast('Vérifie le numéro de téléphone');
    if (!$('an-ok').checked) return toast('Coche la case d\'accord');
    var moyens = { contact_appli: !jeune && !!F.appli, contact_tel: !jeune && !!F.tel, contact_wa: !jeune && !!F.wa, contact: (F.tel || F.wa) && !jeune ? t('contact') : null };
    var row = Object.assign(v ? { type: 'vente', titre: t('titre'), prix: t('prix') || null, description: t('description') || null }
      : { type: 'partenaire', prenom: t('prenom'), niveau: t('niveau'), dispo: t('dispo'), description: t('description') || null }, moyens);
    $('an-go').disabled = true;
    // Mémo : enregistré si la case est cochée, oublié si elle est décochée
    var memo = jeune ? Promise.resolve() : F.memo
      ? q(sb.from('annonce_prefs').upsert({ user_id: S.user.id, contact_appli: moyens.contact_appli, contact_tel: moyens.contact_tel, contact_wa: moyens.contact_wa, tel: moyens.contact })).catch(function () { })
      : q(sb.from('annonce_prefs').delete().eq('user_id', S.user.id)).catch(function () { });
    var chemins = [], base = Date.now();
    var photo = (v ? AN.photos : []).reduce(function (pr, f, i) {
      return pr.then(function () { return reduirePhoto(f); }).then(function (blob) {
        var chemin = S.user.id + '/' + base + '-' + i + '.jpg';
        return sb.storage.from('annonces').upload(chemin, blob, { contentType: 'image/jpeg' }).then(function (r) { if (r.error) throw r.error; chemins.push(chemin); });
      });
    }, Promise.resolve()).then(function () { if (chemins.length) { row.images = chemins; row.image_path = chemins[0]; } });
    Promise.all([photo, memo]).then(function () { return q(sb.from('annonces').insert(row)); }).then(function () {
      AN.form = null; AN.photos = []; AN.type = row.type;
      toast(S.isStaff ? 'Annonce publiée' : 'Merci ! Ton annonce sera visible après validation par le club.');
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
    else if (eligibles(e).length) h += '<section class="card stack" style="gap:10px" id="insc"><span class="mut small">Chargement…</span></section>';
    else if (S.pers.length) h += '<section class="card"><span class="mut small">Inscription réservée aux joueurs des niveaux concernés' + (evGroupes(e).gs.length ? ' : ' + evGroupes(e).gs.map(function (g) { return esc(String(g.nom).replace("CLOC'ARENA ", '')); }).join(', ') : '') + '.</span></section>';
  }
  if (peutRepondre(e) && eligibles(e).length) h += '<section class="card stack" style="gap:8px"><span class="eyebrow">Ta présence</span><span class="mut small">Préviens le coach à l\'avance : ça l\'aide à préparer la séance.</span>' + boutonsPart(e, eligibles(e)) + '</section>';
  if (!S.apercu && (S.isStaff || evGroupes(e).ids.some(function (g) { return S.gere.indexOf(g) >= 0; }))) h += '<section class="card stack" style="gap:8px" id="coach-vue"><span class="eyebrow">Pour les coachs</span><span class="mut small">Chargement…</span></section>';
  h += '<button class="btn line" id="ics-evt">' + ic('dl', 18) + 'Ajouter à mon agenda</button></main>';
  setTimeout(function () {
    $('ics-evt').onclick = function () { telechargerIcs([{ id: e.id, d: d, f: fin, titre: e.titre, lieu: e.lieu, statut: e.statut, qui: [] }], 'cloca-tennis.ics'); };
    if (e.places_max) q(sb.rpc('nb_inscrits', { evt: e.id })).then(function (n) {
      var reste = Math.max(0, e.places_max - n);
      $('places').innerHTML = '<div style="display:flex;justify-content:space-between"><b>' + n + ' inscrit' + (n > 1 ? 's' : '') + ' sur ' + e.places_max + '</b><b style="color:var(--ac)">' + (reste ? reste + ' place' + (reste > 1 ? 's' : '') + ' restante' + (reste > 1 ? 's' : '') : 'Complet · liste d\'attente') + '</b></div>' +
        '<div style="height:8px;border-radius:4px;background:var(--soft);overflow:hidden"><div style="height:8px;width:' + Math.min(100, Math.round(n / e.places_max * 100)) + '%;background:var(--ac)"></div></div>';
    }).catch(function () { $('places').remove(); });
    if ($('insc')) blocInscription(e);
    lierPart();
    if ($('coach-vue')) vueCoach(e);
    if (e.inscription_ouverte) q(sb.rpc('places_niveaux', { evts: [e.id] })).then(function (l) {
      if (!l || !l.length || !$('places') && !$('insc')) return;
      var html = '<div class="stack" style="gap:4px">' + l.map(function (x) {
        var g = evGroupes(e).gs[evGroupes(e).ids.indexOf(x.groupe_id)], r = Math.max(0, x.places - x.n);
        return '<div style="display:flex;justify-content:space-between" class="small"><span>' + (g ? groupeBadge(g) : 'Niveau') + '</span><b style="color:' + (r ? 'var(--ok)' : 'var(--ac)') + '">' + x.n + '/' + x.places + (r ? ' · ' + r + ' place' + (r > 1 ? 's' : '') : ' · complet') + '</b></div>';
      }).join('') + '</div>';
      var box = $('places');
      if (box) box.insertAdjacentHTML('beforeend', html); else $('insc').insertAdjacentHTML('beforebegin', '<section class="card stack" style="gap:6px"><span class="eyebrow">Places par niveau</span>' + html + '</section>');
    }).catch(function () { });
  });
  return h;
}
function blocInscription(e) {
  var box = $('insc');
  q(sb.from('inscriptions').select('personne_id, statut, paye').eq('evenement_id', e.id)).then(function (ins) {
    var choix = {};
    var dessiner = function () {
      var h = '<span class="eyebrow">Qui inscrire ?</span>';
      eligibles(e).forEach(function (p) {
        var i = ins.filter(function (x) { return x.personne_id === p.id; })[0];
        if (i) h += '<div class="pick"><span class="dot" style="background:' + S.couleur[p.id] + '"></span>' + esc(p.prenom) + '<span class="small" style="margin-left:auto;color:var(--ok)">' + (i.statut === 'attente' ? 'liste d\'attente' : i.statut === 'annule' ? 'annulé' : 'inscrit' + (i.paye ? ' · payé' : '')) + '</span>' +
          (!i.paye ? '<button class="chip" data-desins="' + p.id + '">Annuler</button>' : '') + '</div>';
        else if (blocage(e, p)) h += '<div class="pick" style="cursor:default"><span class="dot" style="background:' + S.couleur[p.id] + '"></span>' + esc(p.prenom) + '<span class="small mut" style="margin-left:auto;text-align:right">' + esc(blocage(e, p)) + '</span></div>';
        else h += '<label class="pick ' + (choix[p.id] ? 'on' : '') + '"><input type="checkbox" data-ins="' + p.id + '" ' + (choix[p.id] ? 'checked' : '') + ' style="width:20px;height:20px;accent-color:var(--ac)">' + esc(p.prenom) + '</label>';
      });
      var n = Object.keys(choix).filter(function (k) { return choix[k]; }).length;
      h += '<button class="btn" id="ins-go" ' + (n ? '' : 'disabled') + '>' + (n ? 'Inscrire ' + S.pers.filter(function (p) { return choix[p.id]; }).map(function (p) { return p.prenom; }).join(' et ') : 'Choisis qui inscrire') + '</button>';
      box.innerHTML = h;
      Array.prototype.forEach.call(box.querySelectorAll('[data-ins]'), function (c) { c.onchange = function () { choix[c.dataset.ins] = c.checked; dessiner(); }; });
      Array.prototype.forEach.call(box.querySelectorAll('[data-desins]'), function (b) {
        b.onclick = function () {
          q(sb.from('inscriptions').delete().eq('evenement_id', e.id).eq('personne_id', b.dataset.desins)).then(function () { toast('Inscription annulée'); return chargerAgenda(); }).then(render).catch(function () { toast('Annulation impossible'); });
        };
      });
      $('ins-go').onclick = function () {
        var rows = Object.keys(choix).filter(function (k) { return choix[k]; }).map(function (k) { return { evenement_id: e.id, personne_id: k, created_by: S.user.id }; });
        $('ins-go').disabled = true;
        q(sb.from('inscriptions').insert(rows)).then(function () { toast('Inscription enregistrée'); return chargerAgenda(); }).then(render).catch(function () { toast('Inscription impossible pour le moment'); $('ins-go').disabled = false; });
      };
    };
    dessiner();
  }).catch(function () { box.innerHTML = '<span class="mut small">Impossible de charger les inscriptions.</span>'; });
}

// Vue coach d'une séance : qui vient, qui est absent, qui n'a pas répondu (ou les inscrits)
function vueCoach(e) {
  var box = $('coach-vue'), ids = evGroupes(e).ids;
  Promise.all([
    ids.length ? q(sb.from('groupe_membres').select('personne_id, personnes(prenom, nom)').in('groupe_id', ids)).catch(function () { return []; }) : Promise.resolve([]),
    q(sb.from('participations').select('personne_id, reponse').eq('evenement_id', e.id)).catch(function () { return []; }),
    q(sb.from('inscriptions').select('personne_id, statut, personnes(prenom, nom)').eq('evenement_id', e.id)).catch(function () { return []; })
  ]).then(function (r) {
    var nom = function (p) { return p ? esc(p.prenom + ' ' + (p.nom || '').charAt(0) + '.') : '?'; };
    var h = '<span class="eyebrow">Pour les coachs</span>';
    if (e.inscription_ouverte) {
      var ins = r[2].filter(function (i) { return i.statut === 'inscrit'; }), att = r[2].filter(function (i) { return i.statut === 'attente'; });
      h += '<b>' + ins.length + ' inscrit' + (ins.length > 1 ? 's' : '') + '</b><span class="small">' + (ins.map(function (i) { return nom(i.personnes); }).join(', ') || '—') + '</span>' +
        (att.length ? '<span class="small mut">Liste d\'attente : ' + att.map(function (i) { return nom(i.personnes); }).join(', ') + '</span>' : '');
    } else {
      var vus = {}, mb = r[0].filter(function (m) { if (vus[m.personne_id]) return false; vus[m.personne_id] = 1; return true; });
      var rep = {}; r[1].forEach(function (x) { rep[x.personne_id] = x.reponse; });
      var oui = mb.filter(function (m) { return rep[m.personne_id] === 'oui'; }), non = mb.filter(function (m) { return rep[m.personne_id] === 'non'; }), sans = mb.filter(function (m) { return !rep[m.personne_id]; });
      h += '<div style="display:flex;gap:14px;flex-wrap:wrap"><b style="color:var(--ok)">✓ ' + oui.length + ' présent' + (oui.length > 1 ? 's' : '') + '</b><b style="color:var(--ko)">✗ ' + non.length + ' absent' + (non.length > 1 ? 's' : '') + '</b></div>' +
        (oui.length ? '<span class="small"><b>Présents :</b> ' + oui.map(function (m) { return nom(m.personnes); }).join(', ') + '</span>' : '') +
        (non.length ? '<span class="small"><b>Absents :</b> ' + non.map(function (m) { return nom(m.personnes); }).join(', ') + '</span>' : '') +
        (sans.length ? '<details class="small mut"><summary style="cursor:pointer">' + sans.length + ' sans réponse ▾</summary><div style="margin-top:4px">' + sans.map(function (m) { return nom(m.personnes); }).join(', ') + '</div></details>' : '');
    }
    box.innerHTML = h;
  });
}

// ---------- Coachs : nom de coach du compte, groupes, notes, missions ----------
function nomCoachCompte() { return (S.compte && S.compte.nom_coach && !S.apercu) ? S.compte.nom_coach : ''; }
function voitGroupe(gid) {
  if (S.apercu) return false;
  if (S.isDir || S.isStaff || S.gere.indexOf(gid) >= 0) return true;
  var nc = nomCoachCompte();
  return !!nc && ((AG && AG.creneaux) || []).some(function (cr) { return cr.groupe_id === gid && encadrePar(cr.encadrant, nc); });
}
function lierAbsenceCours() {
  var maj = function () { return chargerAgenda().then(render); };
  Array.prototype.forEach.call(document.querySelectorAll('[data-absc]'), function (b) {
    b.onclick = function (ev) {
      ev.preventDefault(); ev.stopPropagation(); var x = b.dataset.absc.split('|'); b.disabled = true;
      q(sb.from('absences_cours').insert({ creneau_id: x[0], jour: x[1], personne_id: x[2] })).then(function () { toast('Absence signalée au coach'); return maj(); })
        .catch(function () { toast('Trop tard : le cours a commencé, préviens le coach directement'); b.disabled = false; });
    };
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-absx]'), function (b) {
    b.onclick = function (ev) {
      ev.preventDefault(); ev.stopPropagation(); var x = b.dataset.absx.split('|');
      q(sb.from('absences_cours').delete().eq('creneau_id', x[0]).eq('jour', x[1]).eq('personne_id', x[2])).then(function () { toast('Absence annulée'); return maj(); }).catch(function () { toast('Action impossible'); });
    };
  });
}
function lierAbsenceNg() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-ngabs]'), function (b) {
    b.onclick = function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      var x = b.dataset.ngabs.split('|'), carte = b.parentNode;
      if (carte.querySelector('.ngabs-f')) return;
      b.insertAdjacentHTML('afterend', '<span class="ngabs-f stack" style="gap:6px"><input class="f" placeholder="Motif (facultatif) : malade, sortie scolaire…" maxlength="120"><span style="display:flex;gap:6px"><button class="chip on">Prévenir le club</button><button class="chip">Annuler</button></span></span>');
      var f = carte.querySelector('.ngabs-f'), btns = f.querySelectorAll('button');
      f.onclick = function (e) { e.preventDefault(); e.stopPropagation(); };
      btns[1].onclick = function (e) { e.preventDefault(); e.stopPropagation(); f.remove(); };
      btns[0].onclick = function (e) {
        e.preventDefault(); e.stopPropagation(); btns[0].disabled = true;
        q(sb.from('nextgen_absences').insert({ nextgen_id: x[0], jour: x[1], motif: f.querySelector('input').value.trim() || null }).select('id').single()).then(function (r) {
          sb.functions.invoke('notifier', { body: { mode: 'absence_ng', absence_id: r.id } }).catch(function () { });
          toast('Absence envoyée à la direction'); return chargerAgenda();
        }).then(render).catch(function () { toast('Envoi impossible pour le moment'); btns[0].disabled = false; });
      };
    };
  });
}
// Le double interne : l'appli du tournoi, affichée dans l'appli du club
var DOUBLE_URL = 'https://script.google.com/macros/s/AKfycbw7UgI_ieHq-AXgELH6NHJQVoDMVsF9VK_fxK7oEPGuBGvq1Omye5CNNjZJy5m8j40/exec';
// ---------- Double interne : poules, classement, matchs, dispos et scores ----------
var DB2 = null;
var JOURS_D = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'], MOMENTS = ['Matin', 'Après-midi', 'Soir'];
function chargerDouble(force) {
  if (DB2 && !force) return Promise.resolve(DB2);
  return Promise.all([
    q(sb.from('double_equipes').select('*').order('categorie').order('poule').order('numero')),
    q(sb.from('double_dispos').select('*')),
    q(sb.from('double_resultats').select('*').order('date')),
    q(sb.from('double_reservations').select('*').order('cree_le', { ascending: false })).catch(function () { return []; })
  ]).then(function (r) { DB2 = { eq: r[0] || [], dispos: r[1] || [], res: r[2] || [], resa: r[3] || [] }; return DB2; });
}
// ---------- Réservation d'un terrain pour un match du double ----------
function creneauResa(x) {
  var j = new Date(x.jour + 'T12:00:00'), h = String(x.heure).slice(0, 5).split(':'), hd = +h[0], md = h[1];
  var hh = function (H) { return H + 'h' + (md !== '00' ? md : ''); };
  return j.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + hh(hd) + '–' + hh(hd + 2) + ' · ' + x.terrain;
}
function resasDuMatch(a, b) { return (DB2.resa || []).filter(function (x) { return (x.equipe_a === a.id && x.equipe_b === b.id) || (x.equipe_a === b.id && x.equipe_b === a.id); }); }
function blocResa(a, b) {
  var l = resasDuMatch(a, b), act = l.filter(function (x) { return x.statut === 'confirmee' || x.statut === 'demande'; })[0];
  if (act && act.statut === 'confirmee') return '<div class="resa ok">' + ic('check', 16) + '<span><b>Terrain réservé</b><br>' + esc(creneauResa(act)) + '</span></div>';
  if (act) return '<div class="resa att"><span><b>⏳ Demande envoyée au club</b><br>' + esc(creneauResa(act)) + '</span>' + (S.user && act.cree_par === S.user.id ? '<button class="chip" data-resa-x="' + act.id + '">Annuler</button>' : '') + '</div>';
  var ref = l.filter(function (x) { return x.statut === 'refusee'; })[0];
  return (ref ? '<span class="xs" style="color:var(--ko)">Demande du ' + esc(creneauResa(ref)) + ' refusée' + (ref.motif ? ' : ' + esc(ref.motif) : '') + '</span>' : '') +
    (S.user ? '<button class="btn line" style="min-height:40px" data-resa="' + a.id + '|' + b.id + '">' + ic('cal', 18) + ' Demander une réservation</button>' : '');
}
function formResa(a, b, box) {
  if (!a || !b) return;
  if (S.apercu) return toast('Aperçu : rien n\'est envoyé');
  var terrains = (S.reglages && Array.isArray(S.reglages.terrains_double) && S.reglages.terrains_double.length) ? S.reglages.terrains_double : ['Couvert 1', 'Couvert 2', 'Terre 3', 'Terre 4', 'Quick 5', 'Quick 6', 'Quick 7'];
  var joueurs = [[a.id, 1, a.joueur1], [a.id, 2, a.joueur2], [b.id, 1, b.joueur1], [b.id, 2, b.joueur2]].filter(function (x) { return x[2]; });
  var moiEq = localStorageGet('dbl-eq') || '', moiJ = localStorageGet('dbl-j') || '1';
  var heures = []; for (var H = 8; H <= 20; H++) ['00', '30'].forEach(function (mm) { if (!(H === 20 && mm === '30')) heures.push((H < 10 ? '0' : '') + H + ':' + mm); });
  var demain = new Date(); var iso = isoJour(demain);
  modale('<div class="stack" style="gap:12px"><h2 style="margin:0;font-size:21px">Demander une réservation</h2>' +
    '<span class="small"><b>' + esc(nomEq(a)) + '</b><br><span class="mut">contre</span> <b>' + esc(nomEq(b)) + '</b></span>' +
    '<span class="mut small">Créneau de 2 heures. Mettez-vous d\'accord à 4 avant d\'envoyer : le club réserve le terrain et vous prévient par notification.</span>' +
    '<label class="f">Jour<input class="f" type="date" id="rs-j" min="' + iso + '"></label>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label class="f">Début<select class="f" id="rs-h">' + heures.map(function (h) { return '<option' + (h === '10:00' ? ' selected' : '') + '>' + h + '</option>'; }).join('') + '</select></label><label class="f">Fin<input class="f" id="rs-f" disabled></label></div>' +
    '<label class="f">Terrain<select class="f" id="rs-t">' + terrains.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('') + '</select></label>' +
    '<label class="f">Je suis<select class="f" id="rs-m"><option value="">Choisir…</option>' + joueurs.map(function (x) { var v = x[0] + '|' + x[1]; return '<option value="' + esc(v) + '"' + (x[0] === moiEq && String(x[1]) === moiJ ? ' selected' : '') + '>' + esc(x[2]) + '</option>'; }).join('') + '</select></label>' +
    '<label class="f">Un mot pour le club (facultatif)<input class="f" id="rs-n" maxlength="300" placeholder="Ex. sinon 11h possible"></label>' +
    '<label style="display:flex;gap:10px;align-items:flex-start" class="small"><input type="checkbox" id="rs-ok" style="width:20px;height:20px;flex:none;margin-top:1px"> Les 4 joueurs sont d\'accord sur ce jour, cette heure et ce terrain.</label>' +
    '<button class="btn" id="rs-go">Envoyer la demande</button></div>', function () {
    var fin = function () { var h = $('rs-h').value.split(':'); $('rs-f').value = (+h[0] + 2) + ':' + h[1]; };
    $('rs-h').onchange = fin; fin();
    $('rs-go').onclick = function () {
      var j = $('rs-j').value, me = $('rs-m').value;
      if (!j) return toast('Choisis le jour');
      if (j < isoJour(new Date())) return toast('Ce jour est déjà passé');
      if (!me) return toast('Indique qui tu es');
      if (!$('rs-ok').checked) return toast('Mettez-vous d\'accord à 4 avant d\'envoyer');
      var mm = me.split('|'), nomMoi = (joueurs.filter(function (x) { return x[0] + '|' + x[1] === me; })[0] || [])[2] || null;
      localStorageSet('dbl-eq', mm[0]); localStorageSet('dbl-j', mm[1]);
      $('rs-go').disabled = true; $('rs-go').textContent = 'Envoi…';
      q(sb.from('double_reservations').insert({ equipe_a: a.id, equipe_b: b.id, jour: j, heure: $('rs-h').value, terrain: $('rs-t').value, note: $('rs-n').value.trim() || null, demandeur: nomMoi, cree_par: S.user.id }).select('id').single()).then(function (r) {
        sb.functions.invoke('notifier', { body: { mode: 'resa_double', reservation_id: r.id } }).catch(function () { });
        fermerModale(); toast('Demande envoyée au club 👍');
        return chargerDouble(true).then(function () { remplirDouble(box); });
      }).catch(function () { toast('Envoi impossible, réessaie'); $('rs-go').disabled = false; $('rs-go').textContent = 'Envoyer la demande'; });
    };
  });
}
function nomEq(e) { return e ? e.joueur1 + (e.joueur2 ? ' / ' + e.joueur2 : '') : '?'; }
function lireSets(score) { return String(score || '').trim().split(/\s+/).filter(Boolean).map(function (s) { var m = s.split('-'); return [+m[0], +m[1]]; }); }
function classementPoule(cat, poule) {
  var eqs = DB2.eq.filter(function (e) { return e.categorie === cat && e.poule === poule; });
  var t = {}; eqs.forEach(function (e) { t[e.id] = { e: e, j: 0, v: 0, d: 0, pts: 0, sets: 0, jeux: 0 }; });
  DB2.res.filter(function (r) { return r.statut === 'validé' && r.categorie === cat && r.poule === poule; }).forEach(function (r) {
    var g = t[r.gagnant], p = t[r.perdant]; if (!g || !p) return;
    g.j++; p.j++; g.v++; p.d++; g.pts += 2; p.pts += r.forfait ? 0 : 1;
    if (!r.forfait) lireSets(r.score).forEach(function (s, i, all) {
      var tb = i === 2 && all.length === 3 && Math.max(s[0], s[1]) >= 10;
      if (s[0] > s[1]) { g.sets++; p.sets--; } else { g.sets--; p.sets++; }
      if (!tb) { g.jeux += s[0] - s[1]; p.jeux += s[1] - s[0]; }
    });
  });
  return Object.keys(t).map(function (k) { return t[k]; }).sort(function (a, b) { return b.pts - a.pts || b.sets - a.sets || b.jeux - a.jeux || a.e.numero - b.e.numero; });
}
// Ordre des matchs conseillé (tourniquet, une équipe exempte si nombre impair)
function ordreMatchs(eqs) {
  var l = eqs.slice(); if (l.length % 2) l.push(null);
  var n = l.length, tours = [];
  for (var t = 0; t < n - 1; t++) {
    var m = [];
    for (var i = 0; i < n / 2; i++) { var a = l[i], b = l[n - 1 - i]; if (a && b) m.push([a, b]); }
    tours.push(m); l.splice(1, 0, l.pop());
  }
  return tours;
}
function disposDe(eq) { return DB2.dispos.filter(function (d) { return d.equipe_id === eq.id; }); }
function creneauxCommuns(e1, e2) {
  // Un créneau n'est « en commun » que si les 4 joueurs ont donné leurs dispos et sont tous libres
  var ds = disposDe(e1).concat(disposDe(e2)), manquants = [];
  [e1, e2].forEach(function (e) { [1, 2].forEach(function (j) { var nom = j === 1 ? e.joueur1 : e.joueur2; if (nom && !disposDe(e).some(function (d) { return d.joueur === j; })) manquants.push(nom); }); });
  var ok = [];
  if (ds.length) for (var k = 0; k < 21; k++) if (ds.every(function (d) { return d.creneaux.charAt(k) === '1'; })) ok.push(k);
  return { ok: manquants.length ? [] : ok, possibles: manquants.length === 1 ? ok : [], manque: manquants.length, manquants: manquants };
}
function scoreValide(sets, forfait) {
  if (forfait) return { ok: true, score: 'forfait' };
  var s = sets.filter(function (x) { return x[0] !== '' && x[1] !== '' && x[0] != null; }).map(function (x) { return [+x[0], +x[1]]; });
  if (s.length < 2) return { ok: false, msg: 'Il faut au moins 2 sets' };
  var setOk = function (a, b) { var hi = Math.max(a, b), lo = Math.min(a, b); return (hi === 6 && lo <= 4) || (hi === 7 && (lo === 5 || lo === 6)); };
  var g = 0;
  for (var i = 0; i < s.length; i++) {
    var a = s[i][0], b = s[i][1];
    if (i === 2) { if (!(Math.max(a, b) >= 10 && Math.abs(a - b) >= 2) && !setOk(a, b)) return { ok: false, msg: 'Super tie-break : 10 points et 2 d\'écart (ex. 10-7)' }; }
    else if (!setOk(a, b)) return { ok: false, msg: 'Set ' + (i + 1) + ' impossible (ex. 6-4, 7-5, 7-6)' };
    if (a > b) g++;
  }
  if (s.length === 2 && g !== 2) return { ok: false, msg: 'À 1 set partout, ajoute le super tie-break' };
  if (s.length === 3 && g !== 2) return { ok: false, msg: 'Les scores sont côté équipe gagnante : elle doit gagner 2 sets' };
  return { ok: true, score: s.map(function (x) { return x[0] + '-' + x[1]; }).join(' ') };
}
function pageDouble() {
  var D = S.dbl = S.dbl || { tab: 'classement', cat: 'Hommes', poule: 1 };
  var tabs = [['classement', 'Classement', 'trophy'], ['matchs', 'Matchs', 'racket'], ['dispos', 'Mes dispos', 'cal'], ['score', 'Envoyer un score', 'check']];
  if (S.isDir && !S.apercu) tabs.push(['orga', 'Organisateur', 'tool']);
  setTimeout(function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-dtab]'), function (b) { b.onclick = function () { D.tab = b.dataset.dtab; render(); }; });
    var box = $('dbl-main');
    if (!S.user) { box.innerHTML = '<section class="card stack" style="gap:10px"><b>Connecte-toi pour suivre le double interne</b><a class="btn" href="#/profil">Me connecter</a></section>'; return; }
    chargerDouble().then(function () { remplirDouble(box); }).catch(function () { box.innerHTML = '<section class="card empty">Impossible de charger le tournoi pour le moment.</section>'; });
  });
  return '<div class="darkhead"><div class="wrap">' + backLink('#/accueil', 'Accueil', true) + '<div class="kicker" style="margin-top:8px">TOURNOI INTERNE · SAISON 2026-2027</div><h1>Double interne</h1>' +
    '<div class="cases">' + tabs.map(function (t) { return '<button data-dtab="' + t[0] + '" class="' + (D.tab === t[0] ? 'on' : '') + '">' + ic(t[2], 20) + '<span>' + t[1] + '</span></button>'; }).join('') + '</div></div></div><main id="dbl-main"><div class="skel"></div></main>';
}
function choixPoule(D) {
  var cats = ['Dames', 'Hommes', 'Mixte'].filter(function (c) { return DB2.eq.some(function (e) { return e.categorie === c; }); });
  if (cats.indexOf(D.cat) < 0) D.cat = cats[0];
  var poules = []; DB2.eq.forEach(function (e) { if (e.categorie === D.cat && poules.indexOf(e.poule) < 0) poules.push(e.poule); }); poules.sort(function (a, b) { return a - b; });
  if (poules.indexOf(D.poule) < 0) D.poule = poules[0];
  return '<div class="tuiles t3">' + cats.map(function (c) { var n = DB2.eq.filter(function (e) { return e.categorie === c; }).length; return '<button class="' + (D.cat === c ? 'on' : '') + '" data-dcat="' + c + '"><b>' + c + '</b><span>' + n + ' équipes</span></button>'; }).join('') + '</div>' +
    '<div class="tuiles tp">' + poules.map(function (p) { return '<button class="' + (D.poule === p ? 'on' : '') + '" data-dpoule="' + p + '"><span>Poule</span><b>' + p + '</b></button>'; }).join('') + '</div>';
}
function remplirDouble(box) {
  var D = S.dbl;
  if (!DB2.eq.length) { box.innerHTML = '<section class="card empty">Les poules ne sont pas encore en ligne dans l\'appli du club.<br>En attendant, utilise l\'appli du tournoi.<br><br><a class="btn line" href="' + DOUBLE_URL + '" target="_blank" rel="noopener">Ouvrir l\'appli du tournoi</a></section>'; return; }
  var h = '', apres = function () { };
  if (D.tab === 'classement' || D.tab === 'matchs') {
    h += choixPoule(D);
    if (D.tab === 'classement') {
      var cl = classementPoule(D.cat, D.poule);
      h += '<section class="card tight"><div class="eyebrow" style="padding:12px 0 6px">' + esc(D.cat) + ' · Poule ' + D.poule + '</div><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr class="mut xs" style="text-align:right"><th style="text-align:left;padding:6px 4px">#</th><th style="text-align:left">Équipe</th><th>J</th><th>V</th><th>D</th><th>Sets</th><th>Jeux</th><th>Pts</th></tr></thead><tbody>' +
        cl.map(function (x, i) { return '<tr style="border-top:1px solid var(--line);text-align:right"><td style="text-align:left;padding:8px 4px"><b>' + (i + 1) + '</b></td><td style="text-align:left">' + esc(nomEq(x.e)) + '</td><td>' + x.j + '</td><td>' + x.v + '</td><td>' + x.d + '</td><td>' + (x.sets > 0 ? '+' : '') + x.sets + '</td><td>' + (x.jeux > 0 ? '+' : '') + x.jeux + '</td><td><b>' + x.pts + '</b></td></tr>'; }).join('') +
        '</tbody></table></div></section><p class="mut xs" style="text-align:center">Victoire 2 pts · défaite 1 pt · forfait 0 pt. Égalité : différence de sets, puis de jeux.</p>';
      var att = DB2.res.filter(function (r) { return r.statut === 'en attente' && r.categorie === D.cat && r.poule === D.poule; });
      if (att.length) h += '<section class="card stack" style="gap:6px"><span class="eyebrow">En attente de validation</span>' + att.map(function (r) { return '<span class="small">' + esc(nomEq(eqDe(r.gagnant))) + ' bat ' + esc(nomEq(eqDe(r.perdant))) + ' · ' + esc(r.forfait ? 'forfait' : r.score) + '</span>'; }).join('') + '</section>';
    } else {
      var eqs = DB2.eq.filter(function (e) { return e.categorie === D.cat && e.poule === D.poule; });
      var exempt = eqs.length % 2 === 1;
      h += ordreMatchs(eqs).map(function (tour, ti) {
        var joue = eqs.filter(function (e) { return !tour.some(function (m) { return m[0] === e || m[1] === e; }); })[0];
        return '<div class="dayhead">Tour ' + (ti + 1) + (exempt && joue ? ' · exempt : ' + esc(nomEq(joue)) : '') + '</div>' + tour.map(function (m) {
          var r = DB2.res.filter(function (x) { return x.statut !== 'refusé' && ((x.gagnant === m[0].id && x.perdant === m[1].id) || (x.gagnant === m[1].id && x.perdant === m[0].id)); })[0];
          var cc = creneauxCommuns(m[0], m[1]);
          var bResa = r ? '' : blocResa(m[0], m[1]);
          return '<section class="card stack" style="gap:6px"><b class="small">' + esc(nomEq(m[0])) + '<br><span class="mut">contre</span> ' + esc(nomEq(m[1])) + '</b>' +
            (r ? '<span class="small" style="color:' + (r.statut === 'validé' ? 'var(--ok)' : 'var(--ac)') + ';font-weight:600">' + (r.statut === 'validé' ? '✓ ' : '⏳ ') + esc(nomEq(eqDe(r.gagnant)).split(' / ')[0]) + '… gagne ' + esc(r.forfait ? 'par forfait' : r.score) + (r.statut === 'validé' ? '' : ' · en attente de validation') + '</span>'
              : (cc.manque ? '<span class="xs" style="color:var(--ac);font-weight:600">En attente des dispos de : ' + esc(cc.manquants.join(', ')) + '</span>' +
                  (cc.possibles.length ? '<span class="xs mut">Possible pour ceux qui ont répondu (à confirmer) :</span><span style="display:flex;flex-wrap:wrap;gap:4px">' + cc.possibles.map(function (k) { return '<span class="badge" style="background:transparent;border:1px dashed var(--mut);color:var(--mut)">' + JOURS_D[Math.floor(k / 3)] + ' ' + MOMENTS[k % 3].toLowerCase() + '</span>'; }).join('') + '</span>' : '')
                : '<span class="xs mut">Créneaux en commun (les 4 joueurs) :</span><span style="display:flex;flex-wrap:wrap;gap:4px">' + (cc.ok.length ? cc.ok.map(function (k) { return '<span class="badge" style="background:var(--ok);color:#fff">' + JOURS_D[Math.floor(k / 3)] + ' ' + MOMENTS[k % 3].toLowerCase() + '</span>'; }).join('') : '<span class="xs mut">aucun créneau commun : à caler sur WhatsApp</span>') + '</span>')) + bResa + '</section>';
        }).join('');
      }).join('') + '<p class="mut xs" style="text-align:center">Mettez-vous d\'accord à 4 sur un jour, une heure et un terrain, puis touchez « Demander une réservation » : le club réserve et vous recevez une notification.</p>';
    }
    apres = function () {
      Array.prototype.forEach.call(box.querySelectorAll('[data-dcat]'), function (b) { b.onclick = function () { D.cat = b.dataset.dcat; D.poule = 0; remplirDouble(box); }; });
      Array.prototype.forEach.call(box.querySelectorAll('[data-dpoule]'), function (b) { b.onclick = function () { D.poule = +b.dataset.dpoule; remplirDouble(box); }; });
      Array.prototype.forEach.call(box.querySelectorAll('[data-resa]'), function (b) { b.onclick = function () { var x = b.dataset.resa.split('|'); formResa(eqDe(x[0]), eqDe(x[1]), box); }; });
      Array.prototype.forEach.call(box.querySelectorAll('[data-resa-x]'), function (b) {
        b.onclick = function () {
          if (!confirm('Annuler cette demande de réservation ?')) return;
          q(sb.from('double_reservations').update({ statut: 'annulee' }).eq('id', b.dataset.resaX)).then(function () { toast('Demande annulée'); return chargerDouble(true); }).then(function () { remplirDouble(box); }).catch(function () { toast('Annulation impossible'); });
        };
      });
    };
  } else if (D.tab === 'dispos') {
    var monEq = localStorageGet('dbl-eq') || '', monJ = +(localStorageGet('dbl-j') || 1), eq = eqDe(monEq);
    var dd = eq ? DB2.dispos.filter(function (d) { return d.equipe_id === eq.id && d.joueur === monJ; })[0] : null;
    var grille = (D.grille && D.grilleCle === monEq + monJ) ? D.grille : (dd ? dd.creneaux : '000000000000000000000');
    D.grille = grille; D.grilleCle = monEq + monJ;
    h += '<section class="card stack" style="gap:10px"><label class="f">Mon équipe<select class="f" id="dd-eq"><option value="">Choisir…</option>' + DB2.eq.map(function (e) { return '<option value="' + e.id + '"' + (e.id === monEq ? ' selected' : '') + '>' + esc(e.categorie + ' P' + e.poule + ' · ' + nomEq(e)) + '</option>'; }).join('') + '</select></label>' +
      (eq ? '<div class="grid2">' + [1, 2].filter(function (j) { return j === 1 || eq.joueur2; }).map(function (j) { return '<button class="pick' + (monJ === j ? ' on' : '') + '" data-dj="' + j + '">Je suis ' + esc(j === 1 ? eq.joueur1 : eq.joueur2) + '</button>'; }).join('') + '</div>' : '') + '</section>';
    if (eq) {
      h += '<section class="card stack" style="gap:8px"><span class="eyebrow">Quand es-tu disponible en général ?</span><span class="mut xs">Coche tes créneaux habituels, puis enregistre. Ton partenaire coche les siens de son côté.</span>' +
        '<div style="display:grid;grid-template-columns:52px repeat(3,minmax(0,1fr));gap:6px;align-items:center"><span></span>' + MOMENTS.map(function (m) { return '<span class="xs mut" style="text-align:center">' + m + '</span>'; }).join('') +
        JOURS_D.map(function (j, di) { return '<b class="small">' + j + '</b>' + [0, 1, 2].map(function (mi) { var k = di * 3 + mi, on = grille.charAt(k) === '1'; return '<button class="chip' + (on ? ' on' : '') + '" data-dk="' + k + '" style="min-height:40px;justify-content:center">' + (on ? '✓' : '') + '</button>'; }).join(''); }).join('') + '</div>' +
        '<button class="btn" id="dd-ok">Enregistrer mes dispos</button>' + (dd ? '<span class="mut xs">Dernière mise à jour : ' + esc(fmtCourt(new Date(dd.maj))) + '</span>' : '') + '</section>';
    }
    apres = function () {
      $('dd-eq').onchange = function () { localStorageSet('dbl-eq', this.value); localStorageSet('dbl-j', '1'); D.grille = null; remplirDouble(box); };
      Array.prototype.forEach.call(box.querySelectorAll('[data-dj]'), function (b) { b.onclick = function () { localStorageSet('dbl-j', b.dataset.dj); D.grille = null; remplirDouble(box); }; });
      Array.prototype.forEach.call(box.querySelectorAll('[data-dk]'), function (b) { b.onclick = function () { var k = +b.dataset.dk, g = D.grille.split(''); g[k] = g[k] === '1' ? '0' : '1'; D.grille = g.join(''); remplirDouble(box); }; });
      if ($('dd-ok')) $('dd-ok').onclick = function () {
        if (S.apercu) return toast('Aperçu : rien n\'est enregistré');
        q(sb.from('double_dispos').upsert({ equipe_id: monEq, joueur: monJ, creneaux: D.grille, maj: new Date().toISOString() })).then(function () { toast('Dispos enregistrées'); return chargerDouble(true); }).then(function () { remplirDouble(box); }).catch(function () { toast('Enregistrement impossible'); });
      };
    };
  } else if (D.tab === 'score') {
    var F = D.form = D.form || { g: '', p: '', sets: [['', ''], ['', ''], ['', '']], forfait: false };
    var g = eqDe(F.g), memes = g ? DB2.eq.filter(function (e) { return e.categorie === g.categorie && e.poule === g.poule && e.id !== g.id; }) : [];
    var v = scoreValide(F.sets, F.forfait);
    h += '<section class="card stack" style="gap:10px"><span class="mut small">Juste après le match, <b>un seul joueur</b> envoie le score. Dorian le valide, puis le classement se met à jour.</span>' +
      '<label class="f">Équipe gagnante<select class="f" id="ds-g"><option value="">Choisir…</option>' + DB2.eq.map(function (e) { return '<option value="' + e.id + '"' + (e.id === F.g ? ' selected' : '') + '>' + esc(e.categorie + ' P' + e.poule + ' · ' + nomEq(e)) + '</option>'; }).join('') + '</select></label>' +
      '<label class="f">Équipe perdante<select class="f" id="ds-p"' + (g ? '' : ' disabled') + '><option value="">Choisir…</option>' + memes.map(function (e) { return '<option value="' + e.id + '"' + (e.id === F.p ? ' selected' : '') + '>' + esc(nomEq(e)) + '</option>'; }).join('') + '</select></label>' +
      '<label class="check"><input type="checkbox" id="ds-f"' + (F.forfait ? ' checked' : '') + '><span>Victoire par forfait</span></label>' +
      (F.forfait ? '' : '<div class="f">Score, côté équipe gagnante' + [0, 1, 2].map(function (k) { return '<div style="display:flex;gap:8px;align-items:center;margin-top:6px"><span class="small mut" style="width:96px">' + ['Set 1', 'Set 2', 'Super tie-break'][k] + '</span><input class="f" data-ds="' + k + '-0" type="number" inputmode="numeric" min="0" max="30" value="' + esc(F.sets[k][0]) + '" style="width:70px;text-align:center"><b>–</b><input class="f" data-ds="' + k + '-1" type="number" inputmode="numeric" min="0" max="30" value="' + esc(F.sets[k][1]) + '" style="width:70px;text-align:center"></div>'; }).join('') + '<span class="mut xs" style="display:block;margin-top:6px">Super tie-break seulement à 1 set partout (ex. 10-7).</span></div>') +
      '<span class="small" id="ds-v" style="font-weight:600;color:' + (v.ok ? 'var(--ok)' : 'var(--mut)') + '">' + (v.ok ? '✓ Score correct : ' + esc(v.score) : esc(v.msg || '')) + '</span>' +
      '<button class="btn" id="ds-ok">Envoyer le score</button></section>';
    apres = function () {
      $('ds-g').onchange = function () { F.g = this.value; F.p = ''; remplirDouble(box); };
      $('ds-p').onchange = function () { F.p = this.value; };
      $('ds-f').onchange = function () { F.forfait = this.checked; remplirDouble(box); };
      Array.prototype.forEach.call(box.querySelectorAll('[data-ds]'), function (i) {
        i.oninput = function () { var x = i.dataset.ds.split('-'); F.sets[+x[0]][+x[1]] = i.value; var w = scoreValide(F.sets, F.forfait); $('ds-v').textContent = w.ok ? '✓ Score correct : ' + w.score : (w.msg || ''); $('ds-v').style.color = w.ok ? 'var(--ok)' : 'var(--mut)'; };
      });
      $('ds-ok').onclick = function () {
        var gg = eqDe(F.g), pp = eqDe(F.p), w = scoreValide(F.sets, F.forfait);
        if (!gg || !pp) return toast('Choisis les deux équipes');
        if (!w.ok) return toast(w.msg);
        if (DB2.res.some(function (r) { return r.statut !== 'refusé' && ((r.gagnant === gg.id && r.perdant === pp.id) || (r.gagnant === pp.id && r.perdant === gg.id)); })) return toast('Ce match a déjà un score envoyé');
        if (S.apercu) return toast('Aperçu : rien n\'est enregistré');
        $('ds-ok').disabled = true;
        var moi = S.pers.filter(function (p) { return S.compte && p.id === S.compte.personne_id; })[0];
        q(sb.from('double_resultats').insert({ categorie: gg.categorie, poule: gg.poule, gagnant: gg.id, perdant: pp.id, score: F.forfait ? null : w.score, forfait: F.forfait, saisi_par: S.user.id, saisi_nom: moi ? moi.prenom + ' ' + moi.nom : S.user.email }))
          .then(function () { toast('Score envoyé : en attente de validation'); D.form = null; D.tab = 'classement'; D.cat = gg.categorie; D.poule = gg.poule; return chargerDouble(true); }).then(render)
          .catch(function () { toast('Envoi impossible pour le moment'); $('ds-ok').disabled = false; });
      };
    };
  } else if (D.tab === 'orga') {
    var att2 = DB2.res.filter(function (r) { return r.statut === 'en attente'; }), val = DB2.res.filter(function (r) { return r.statut === 'validé'; }).slice().reverse();
    var ligne = function (r, actions) { return '<section class="card stack" style="gap:6px"><span class="xs mut">' + esc(r.categorie + ' · Poule ' + r.poule + ' · ' + fmtCourt(new Date(r.date)) + (r.saisi_nom ? ' · envoyé par ' + r.saisi_nom : '')) + '</span><span class="small"><b>' + esc(nomEq(eqDe(r.gagnant))) + '</b> bat ' + esc(nomEq(eqDe(r.perdant))) + ' · ' + esc(r.forfait ? 'forfait' : r.score) + '</span><span style="display:flex;gap:6px;flex-wrap:wrap">' + actions + '</span></section>'; };
    h += '<div class="dayhead">À valider (' + att2.length + ')</div>' + (att2.length ? att2.map(function (r) { return ligne(r, '<button class="chip on" data-dv="' + r.id + '|validé">Valider</button><button class="chip" data-dinv="' + r.id + '">Inverser le vainqueur</button><button class="chip" data-dv="' + r.id + '|refusé">Refuser</button>'); }).join('') : '<section class="card empty">Aucun score en attente.</section>') +
      '<div class="dayhead">Validés</div>' + (val.length ? val.slice(0, 30).map(function (r) { return ligne(r, '<button class="chip" data-dv="' + r.id + '|en attente">Remettre en attente</button>'); }).join('') : '<section class="card empty">Aucun score validé.</section>') +
      '<p class="mut xs" style="text-align:center">Équipes et poules : espace gestion → Double interne.</p>';
    apres = function () {
      Array.prototype.forEach.call(box.querySelectorAll('[data-dv]'), function (b) { b.onclick = function () { var x = b.dataset.dv.split('|'); q(sb.from('double_resultats').update({ statut: x[1], traite_le: new Date().toISOString() }).eq('id', x[0])).then(function () { toast(x[1] === 'validé' ? 'Score validé' : x[1] === 'refusé' ? 'Score refusé' : 'Remis en attente'); return chargerDouble(true); }).then(function () { remplirDouble(box); }).catch(function () { toast('Action impossible'); }); }; });
      Array.prototype.forEach.call(box.querySelectorAll('[data-dinv]'), function (b) { b.onclick = function () { var r = DB2.res.filter(function (x) { return x.id === b.dataset.dinv; })[0]; q(sb.from('double_resultats').update({ gagnant: r.perdant, perdant: r.gagnant, score: r.score ? lireSets(r.score).map(function (s) { return s[1] + '-' + s[0]; }).join(' ') : r.score }).eq('id', r.id)).then(function () { toast('Vainqueur inversé'); return chargerDouble(true); }).then(function () { remplirDouble(box); }); }; });
    };
  }
  box.innerHTML = h; apres();
}
function eqDe(id) { return (DB2 && DB2.eq || []).filter(function (e) { return e.id === id; })[0]; }

// Page d'un groupe (coachs et direction) : joueurs, Next Gen et notes
function pageGroupe(gid) {
  var cr = ((AG && AG.creneaux) || []).filter(function (c) { return c.groupe_id === gid; })[0];
  var nom = cr && cr.groupes ? cr.groupes.nom : 'Groupe';
  setTimeout(function () { remplirGroupe(gid); });
  return '<div class="pagehead wrap">' + backLink('#/agenda', 'Agenda') + '<h1 style="font-size:26px">' + esc(String(nom).replace(/^.*?·\s*/, '')) + '</h1>' +
    (cr ? '<p class="mut small" style="margin:4px 0 0">' + esc(JOURS[cr.jour_semaine].charAt(0).toUpperCase() + JOURS[cr.jour_semaine].slice(1)) + ' ' + cr.heure_debut.slice(0, 5).replace(':', 'h') + ' – ' + cr.heure_fin.slice(0, 5).replace(':', 'h') + (cr.lieu ? ' · ' + esc(cr.lieu) : '') + (cr.encadrant ? ' · ' + esc(cr.encadrant) : '') + '</p>' : '') + '</div>' +
    '<main id="grp-main"><div class="skel"></div></main>';
}
function remplirGroupe(gid) {
  var box = $('grp-main'); if (!box) return;
  Promise.all([
    q(sb.from('groupe_membres').select('personne_id, personnes(prenom, nom, niveau_arena, date_naissance)').eq('groupe_id', gid)),
    q(sb.from('notes_coach').select('*').eq('groupe_id', gid).order('created_at', { ascending: false })).catch(function () { return []; }),
    q(sb.from('nextgen').select('grade, arrivee, depart, personnes(prenom, nom)').eq('groupe_id', gid)).catch(function () { return []; }),
    q(sb.from('absences_cours').select('jour, personne_id, creneau_id, personnes(prenom, nom), creneaux!inner(groupe_id, heure_debut)').eq('creneaux.groupe_id', gid).gte('jour', isoJour(new Date())).order('jour')).catch(function () { return []; })
  ]).then(function (r) {
    var absG = r[3] || [];
    var mb = (r[0] || []).filter(function (m) { return m.personnes; }).sort(function (a, b) { return a.personnes.prenom.localeCompare(b.personnes.prenom, 'fr'); });
    var notes = r[1] || [], ng = r[2] || [];
    var nomP = function (id) { var m = mb.filter(function (x) { return x.personne_id === id; })[0]; return m ? m.personnes.prenom + ' ' + m.personnes.nom.charAt(0) + '.' : ''; };
    var age = function (d) { if (!d) return ''; var n = new Date(d), t = new Date(); var a = t.getFullYear() - n.getFullYear() - ((t.getMonth() < n.getMonth() || (t.getMonth() === n.getMonth() && t.getDate() < n.getDate())) ? 1 : 0); return a + ' ans'; };
    var parJour = {}; absG.forEach(function (a) { (parJour[a.jour] = parJour[a.jour] || []).push(a); });
    var hAbs = '<section class="card stack" style="gap:6px"><span class="eyebrow">Absences signalées</span>' + (Object.keys(parJour).length ? Object.keys(parJour).sort().map(function (j) {
      return '<div class="small" style="padding:6px 0;border-top:1px solid var(--line)"><b>' + esc(fmtJour(new Date(j + 'T12:00:00'))) + '</b> · ' + parJour[j].length + ' absent' + (parJour[j].length > 1 ? 's' : '') + ' : ' + esc(parJour[j].map(function (a) { return a.personnes ? a.personnes.prenom + ' ' + a.personnes.nom.charAt(0) + '.' : '?'; }).join(', ')) + '</div>';
    }).join('') : '<span class="mut small">Aucune absence signalée pour les prochains cours.</span>') + '</section>';
    var h = hAbs + formEcrireGroupe(gid) + '<section class="card stack" style="gap:10px"><span class="eyebrow">Nouvelle note</span>' +
      '<label class="f">Pour<select class="f" id="nt-p"><option value="">Tout le groupe</option>' + mb.map(function (m) { return '<option value="' + m.personne_id + '">' + esc(m.personnes.prenom + ' ' + m.personnes.nom) + '</option>'; }).join('') + '</select></label>' +
      '<label class="f">Séance du (facultatif)<input class="f" type="date" id="nt-j"></label>' +
      '<label class="f">Note<textarea class="f" id="nt-t" rows="3" maxlength="2000" placeholder="Ex. Nicolas : changement de prise en coup droit. Absent les 2 prochaines semaines."></textarea></label>' +
      '<button class="btn" id="nt-ok">Enregistrer la note</button><span class="mut xs">Visible uniquement par les coachs du groupe et la direction sportive.</span></section>';
    h += '<section class="card stack" style="gap:8px"><span class="eyebrow">Notes (' + notes.length + ')</span>' + (notes.length ? notes.map(function (n) {
      return '<div class="stack" style="gap:2px;padding:8px 0;border-top:1px solid var(--line)"><span class="xs mut">' + esc(n.personne_id ? nomP(n.personne_id) : 'Tout le groupe') + (n.jour ? ' · séance du ' + esc(fmtCourt(new Date(n.jour + 'T12:00:00'))) : '') + ' · ' + esc(n.auteur_nom || '') + ', le ' + esc(fmtCourt(new Date(n.created_at))) + '</span>' +
        '<span class="small" style="white-space:pre-line">' + esc(n.texte) + '</span>' + (n.auteur === S.user.id || S.isDir ? '<button class="chip" data-ntx="' + n.id + '" style="align-self:flex-start;min-height:30px">Supprimer</button>' : '') + '</div>';
    }).join('') : '<span class="mut small">Aucune note pour le moment.</span>') + '</section>';
    if (ng.length) h += '<section class="card stack" style="gap:6px"><span class="eyebrow">Next Gen sur ce cours</span>' + ng.map(function (n) { return '<span class="small"><b>' + esc(n.personnes ? n.personnes.prenom + ' ' + n.personnes.nom : '?') + '</b> · ' + GRADES_NG[n.grade] + ' · ' + n.arrivee.slice(0, 5).replace(':', 'h') + ' – ' + n.depart.slice(0, 5).replace(':', 'h') + '</span>'; }).join('') + '</section>';
    h += '<section class="card tight"><div class="eyebrow" style="padding:12px 0 4px">Joueurs (' + mb.length + ')</div>' + mb.map(function (m) {
      var nb = notes.filter(function (n) { return n.personne_id === m.personne_id; }).length;
      return '<div class="row"><span><b>' + esc(m.personnes.prenom + ' ' + m.personnes.nom) + '</b>' + (nb ? ' <span class="badge" style="background:var(--sun);color:#12304a">' + nb + ' note' + (nb > 1 ? 's' : '') + '</span>' : '') + '</span><span class="mut small">' + [m.personnes.niveau_arena, age(m.personnes.date_naissance)].filter(Boolean).map(esc).join(' · ') + '</span></div>';
    }).join('') + '</section>';
    box.innerHTML = h;
    lierEcrireGroupe(gid);
    $('nt-ok').onclick = function () {
      var t = $('nt-t').value.trim(); if (!t) return toast('Écris ta note');
      $('nt-ok').disabled = true;
      q(sb.from('notes_coach').insert({ groupe_id: gid, personne_id: $('nt-p').value || null, jour: $('nt-j').value || null, texte: t, auteur_nom: nomCoachCompte() || (S.isDir ? 'Direction' : S.user.email) })).then(function () { toast('Note enregistrée'); remplirGroupe(gid); })
        .catch(function () { toast('Enregistrement impossible'); $('nt-ok').disabled = false; });
    };
    Array.prototype.forEach.call(box.querySelectorAll('[data-ntx]'), function (b) { b.onclick = function () { q(sb.from('notes_coach').delete().eq('id', b.dataset.ntx)).then(function () { toast('Note supprimée'); remplirGroupe(gid); }); }; });
  }).catch(function () { box.innerHTML = '<section class="card empty">Ce groupe n\'est visible que par ses coachs et la direction.</section>'; });
}
function remplirMissions() {
  var box = $('missions'); if (!box) return;
  q(sb.from('coach_missions').select('*').order('faite_le', { nullsFirst: true }).order('echeance', { nullsFirst: false }).order('created_at', { ascending: false })).then(function (l) {
    l = l || [];
    box.innerHTML = l.length ? l.map(function (x) {
      var retard = !x.faite_le && x.echeance && x.echeance < isoJour(new Date());
      return '<section class="card stack" style="gap:8px;' + (x.faite_le ? 'opacity:.6' : '') + '"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><b>' + esc(x.titre) + '</b>' + (x.faite_le ? '<span class="badge" style="background:var(--ok);color:#fff">Faite</span>' : x.echeance ? '<span class="badge" style="background:' + (retard ? 'var(--ko)' : 'var(--sun)') + ';color:' + (retard ? '#fff' : '#12304a') + '">Avant le ' + esc(fmtCourt(new Date(x.echeance + 'T12:00:00'))) + '</span>' : '') + '</div>' +
        (x.texte ? '<span class="small" style="white-space:pre-line">' + esc(x.texte) + '</span>' : '') + (x.image_url ? '<a href="' + esc(x.image_url) + '" target="_blank" rel="noopener"><img src="' + esc(x.image_url) + '" alt="Pièce jointe de la mission" style="width:100%;border-radius:12px"></a>' : '') +
        (x.lien ? '<a class="btn line" href="' + esc(x.lien) + '" target="_blank" rel="noopener">Ouvrir le lien</a>' : '') +
        '<button class="btn ' + (x.faite_le ? 'line' : '') + '" data-mfait="' + x.id + '|' + (x.faite_le ? '0' : '1') + '">' + (x.faite_le ? 'Remettre à faire' : '✓ C\'est fait') + '</button></section>';
    }).join('') : '<section class="card empty">Aucune mission pour le moment.</section>';
    Array.prototype.forEach.call(box.querySelectorAll('[data-mfait]'), function (b) {
      b.onclick = function () { var x = b.dataset.mfait.split('|'); q(sb.rpc('mission_faite', { m: x[0], fait: x[1] === '1' })).then(function () { toast(x[1] === '1' ? 'Mission faite, merci !' : 'Mission remise à faire'); remplirMissions(); }).catch(function () { toast('Action impossible'); }); };
    });
  }).catch(function () { box.innerHTML = '<section class="card empty">Impossible de charger les missions.</section>'; });
}
function resumeCoach() {
  var el = $('coach-resume'); if (!el) return;
  q(sb.from('coach_missions').select('id').is('faite_le', null)).then(function (l) { if (l && l.length && $('coach-resume')) $('coach-resume').innerHTML = '<b style="color:var(--ac)">' + l.length + ' mission' + (l.length > 1 ? 's' : '') + ' à faire</b>'; }).catch(function () { });
}
// Réseaux sociaux : publications mises en avant par le club
var RESEAUX = { instagram: 'https://www.instagram.com/cloc.acheres.tennis', facebook: 'https://www.facebook.com/ClocaTennis/' };
function remplirReseaux() {
  var box = $('reseaux'); if (!box) return;
  var R = accueilCfg().reseaux; RESEAUX = { instagram: lienSur(R.instagram) || RESEAUX.instagram, facebook: lienSur(R.facebook) || RESEAUX.facebook };
  var boutons = '<div class="grid2"><a class="btn" href="' + RESEAUX.instagram + '" target="_blank" rel="noopener" style="background:linear-gradient(45deg,#f09433,#dc2743,#bc1888)">Instagram</a><a class="btn" href="' + RESEAUX.facebook + '" target="_blank" rel="noopener" style="background:#1877f2">Facebook</a></div>';
  var dessiner = function (l) {
    box.innerHTML = '<section class="card stack" style="gap:10px"><span class="eyebrow">Suivez le club</span>' + (l.length ? '<div style="display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:4px">' + l.map(function (x) {
      return '<a href="' + esc(x.lien) + '" target="_blank" rel="noopener" style="flex:0 0 ' + (l.length > 1 ? '78%' : '100%') + ';scroll-snap-align:start;text-decoration:none;color:inherit" class="stack">' + (x.image_url ? '<img src="' + esc(x.image_url) + '" alt="' + esc(x.legende || 'Publication du club') + '" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px">' : '') + '<span class="small" style="margin-top:6px"><b>' + (x.plateforme === 'facebook' ? 'Facebook' : x.plateforme === 'instagram' ? 'Instagram' : 'À voir') + '</b>' + (x.legende ? ' · ' + esc(x.legende) : '') + '</span></a>';
    }).join('') + '</div>' : '<span class="mut small">Photos, résultats et coulisses du club.</span>') + boutons + '</section>';
  };
  q(sb.from('mises_en_avant').select('*').eq('actif', true).order('ordre').order('created_at', { ascending: false }).limit(6)).then(dessiner).catch(function () { dessiner([]); });
}
// Profil d'un cordage : graphique en toile (0 à 100 sur 6 critères)
var AXES_CORDAGE = [['puissance', 'Puissance'], ['controle', 'Contrôle'], ['confort', 'Confort'], ['effet', 'Prise d\'effet'], ['tension', 'Tenue de tension'], ['durabilite', 'Durabilité']];
var COUL_CORDAGE = ['#c4602f', '#1f9e94'];
function aProfil(c) { return !!(c && c.profil && AXES_CORDAGE.every(function (a) { return c.profil[a[0]] != null; })); }
function radarCordage(liste) {
  var R = 100, pt = function (i, v) { var ang = (-90 + i * 60) * Math.PI / 180; return [Math.cos(ang) * R * v / 100, Math.sin(ang) * R * v / 100]; };
  var poly = function (v) { return AXES_CORDAGE.map(function (a, i) { var p = pt(i, typeof v === 'number' ? v : (+((v || {})[a[0]]) || 0)); return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); };
  var h = '<svg viewBox="-185 -150 370 300" role="img" aria-label="Profil du cordage" style="width:100%;max-width:' + (liste.length > 1 ? 420 : 320) + 'px;display:block;margin:0 auto">';
  [20, 40, 60, 80, 100].forEach(function (r) { h += '<polygon points="' + poly(r) + '" fill="none" stroke="var(--line)" stroke-width="1"/>'; });
  AXES_CORDAGE.forEach(function (a, i) { var p = pt(i, 100); h += '<line x1="0" y1="0" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '" stroke="var(--line)" stroke-width="1"/>'; });
  [40, 80].forEach(function (r) { h += '<text x="3" y="' + (-R * r / 100 + 4) + '" font-size="9" fill="var(--mut)">' + r + '</text>'; });
  liste.forEach(function (c, k) {
    var col = COUL_CORDAGE[k % 2];
    h += '<polygon points="' + poly(c.profil) + '" fill="' + col + '" fill-opacity="0.13" stroke="' + col + '" stroke-width="2.2" stroke-linejoin="round"/>';
    AXES_CORDAGE.forEach(function (a, i) { var v = +c.profil[a[0]]; if (isNaN(v)) return; var p = pt(i, v); h += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="5" fill="' + col + '" stroke="#fff" stroke-width="1.5"><title>' + esc(c.nom + ' · ' + a[1] + ' : ' + v) + '</title></circle>'; });
  });
  AXES_CORDAGE.forEach(function (a, i) {
    var p = pt(i, 116), anc = Math.abs(p[0]) < 5 ? 'middle' : p[0] > 0 ? 'start' : 'end';
    var lignes = a[1] === 'Tenue de tension' ? ['Tenue de', 'tension'] : [a[1]];
    if (liste.length === 1 && liste[0].profil[a[0]] != null) lignes.push(String(liste[0].profil[a[0]]));
    var y0 = p[1] + (p[1] > 10 ? 12 : p[1] < -10 ? -4 - 13 * (lignes.length - 1) : 4 - 6.5 * (lignes.length - 1));
    h += '<text text-anchor="' + anc + '" font-size="12" font-weight="600" fill="var(--tx)">' + lignes.map(function (l, k) {
      var val = liste.length === 1 && k === lignes.length - 1 && /^\d+$/.test(l);
      return '<tspan x="' + p[0].toFixed(1) + '" y="' + (y0 + k * 13).toFixed(1) + '"' + (val ? ' fill="' + COUL_CORDAGE[0] + '" font-weight="700"' : '') + '>' + esc(l) + '</tspan>';
    }).join('') + '</text>';
  });
  h += '</svg>';
  if (liste.length > 1) h += '<div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">' + liste.map(function (c, k) { return '<span class="small" style="display:inline-flex;gap:6px;align-items:center"><span class="dot" style="background:' + COUL_CORDAGE[k % 2] + '"></span><b>' + esc(c.nom) + '</b></span>'; }).join('') + '</div>';
  return h;
}
// Guide des cordages
function pageGuideCordage() {
  setTimeout(function () {
    chargerCordage().then(function () {
      var box = $('guide-c'); if (!box) return;
      var actifs = C.cordages.filter(function (c) { return c.actif; }), avec = actifs.filter(aProfil);
      var cmp = $('guide-cmp');
      if (cmp && avec.length >= 2) {
        var A = S.cmpCord || [avec[0].id, avec[1].id];
        var dessinerCmp = function () {
          var la = avec.filter(function (c) { return c.id === A[0]; })[0] || avec[0], lb = avec.filter(function (c) { return c.id === A[1]; })[0] || avec[1];
          var opts = function (sel) { return avec.map(function (c) { return '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.nom) + '</option>'; }).join(''); };
          cmp.innerHTML = '<section class="card stack" style="gap:10px"><span class="eyebrow">Comparer deux cordages</span>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><select class="f" id="cmp-a" style="border-left:4px solid ' + COUL_CORDAGE[0] + '">' + opts(la.id) + '</select><select class="f" id="cmp-b" style="border-left:4px solid ' + COUL_CORDAGE[1] + '">' + opts(lb.id) + '</select></div>' +
            radarCordage(la.id === lb.id ? [la] : [la, lb]) + '<span class="mut xs" style="text-align:center">Notes de 0 à 100 données par le club. Touche un point pour voir sa valeur.</span></section>';
          $('cmp-a').onchange = $('cmp-b').onchange = function () { A = S.cmpCord = [$('cmp-a').value, $('cmp-b').value]; dessinerCmp(); };
        };
        dessinerCmp();
      }
      box.innerHTML = actifs.map(function (c) {
        return '<section class="card stack" style="gap:8px"><div style="display:flex;justify-content:space-between;gap:8px"><b>' + esc(c.nom) + '</b><b>' + euros(c.prix) + '</b></div>' +
          (aProfil(c) ? radarCordage([c]) : '') +
          (c.description ? '<span class="small">' + esc(c.description) + '</span>' : '') +
          (c.pour_qui ? '<span class="small"><b>Pour qui :</b> ' + esc(c.pour_qui) + '</span>' : '') +
          (c.sensation ? '<span class="small"><b>Sensations :</b> ' + esc(c.sensation) + '</span>' : '') + '</section>';
      }).join('') || '<section class="card empty">Aucun cordage proposé pour le moment.</section>';
    }).catch(function () { });
  });
  return '<div class="pagehead wrap">' + backLink('#/cordage/deposer', 'Cordage') + '<h1>Quel cordage choisir ?</h1></div><main>' +
    '<section class="card stack" style="gap:6px"><b>En bref</b><span class="small">• <b>Tu débutes ou tu joues de temps en temps</b> : un synthétique.<br>• <b>Tu veux du confort, ou tu as mal au coude ou à l\'épaule</b> : un multifilament.<br>• <b>Tu frappes fort, tu mets beaucoup d\'effet ou tu casses souvent</b> : un monofilament (polyester), plutôt pour les joueurs confirmés.</span></section>' +
    '<div id="guide-cmp"></div><div class="dayhead">Les cordages du club</div><div id="guide-c" class="stack" style="gap:12px"><div class="skel"></div></div>' +
    '<div class="dayhead">Bon à savoir</div><section class="card stack" style="gap:6px"><span class="small"><b>Quand recorder ?</b> Un repère simple : autant de fois par an que tu joues de fois par semaine. Un cordage qui ne casse pas perd quand même sa tension et ses sensations.</span>' +
    '<span class="small"><b>La tension :</b> plus elle est basse, plus la raquette est puissante et confortable ; plus elle est haute, plus elle contrôle. Pas d\'idée ? Mets « comme d\'habitude » ou demande conseil à Skander ou à ton coach.</span>' +
    '<span class="small"><b>Jeunes joueurs :</b> un synthétique ou un multifilament, à tension modérée. Le polyester est trop rigide pour un bras qui grandit.</span></section>' +
    '<a class="btn" href="#/cordage/deposer">Déposer ma raquette</a></main>';
}

// ---------- Inscriptions : tout ce qui est ouvert, au même endroit ----------
function pageInscriptions() {
  var l = (S.evts || []).filter(inscOuverte).sort(function (a, b) { return new Date(a.debut) - new Date(b.debut); });
  var perso = S.user && S.pers.length;
  var pourMoi = perso ? l.filter(function (e) { return eligibles(e).length; }) : l.filter(function (e) { return !evGroupes(e).ids.length; });
  var h = '<div class="pagehead wrap">' + backLink('#/accueil', 'Accueil') + '<h1>Inscriptions</h1><p class="mut small" style="margin:4px 0 0">Places limitées : l\'inscription garantit ta place. Au-delà, liste d\'attente, avec une place attribuée automatiquement si quelqu\'un se désiste.</p></div><main>';
  h += carteFeteAccueil();
  if (!S.user) h += '<section class="card stack" style="gap:10px"><b>Connecte-toi pour t\'inscrire</b><span class="mut small">Tu verras les séances et stages ouverts pour ta famille.</span><a class="btn" href="#/profil">Me connecter</a></section>';
  else if (!S.pers.length) h += '<section class="card"><span class="mut small">Ton adresse n\'est rattachée à aucun adhérent : contacte le club pour t\'inscrire.</span></section>';
  if (perso) {
    var mes = pourMoi.filter(function (e) { return eligibles(e).some(function (p) { return monInsc(e, p); }); });
    if (mes.length) h += '<div class="dayhead">Mes inscriptions</div>' + mes.map(function (e) { return carteInsc(e); }).join('');
    var reste = pourMoi.filter(function (e) { return mes.indexOf(e) < 0; });
    h += '<div class="dayhead">Ouvertes pour ' + (S.pers.length > 1 ? 'ta famille' : 'toi') + '</div>' + (reste.length ? reste.map(function (e) { return carteInsc(e); }).join('') : '<section class="card empty">Rien d\'autre d\'ouvert pour le moment.</section>');
  } else if (pourMoi.length) h += '<div class="dayhead">Stages et événements ouverts</div>' + pourMoi.map(function (e) { return carteInsc(e); }).join('');
  h += '</main>';
  setTimeout(function () {
    var ids = pourMoi.map(function (e) { return e.id; });
    if (ids.length) q(sb.rpc('nb_inscrits_liste', { evts: ids })).then(function (r) {
      (r || []).forEach(function (x) {
        var e = l.filter(function (y) { return y.id === x.evenement_id; })[0], box = document.querySelector('[data-pl="' + x.evenement_id + '"]');
        if (!e || !box || !e.places_max) return;
        var rest = Math.max(0, e.places_max - x.n);
        box.innerHTML = rest ? '<b style="color:var(--ok)">' + rest + ' place' + (rest > 1 ? 's' : '') + ' sur ' + e.places_max + '</b>' : '<b style="color:var(--ac)">Complet · liste d\'attente</b>';
        if (!rest) Array.prototype.forEach.call(document.querySelectorAll('[data-qins^="in|' + e.id + '|"]'), function (b) { b.textContent = 'Liste d\'attente'; });
      });
    }).catch(function () { });
    if (ids.length) q(sb.rpc('places_niveaux', { evts: ids })).then(function (r) {
      var par = {};
      (r || []).forEach(function (x) { (par[x.evenement_id] = par[x.evenement_id] || []).push(x); });
      Object.keys(par).forEach(function (id) {
        var e = l.filter(function (y) { return y.id === id; })[0], box = document.querySelector('[data-pl="' + id + '"]'); if (!e || !box) return;
        var nl = box.querySelector('.mut'); if (nl) nl.remove();
        box.insertAdjacentHTML('beforeend', '<span style="display:flex;gap:10px;flex-wrap:wrap;margin-top:2px">' + par[id].map(function (x) {
          var g = evGroupes(e).gs[evGroupes(e).ids.indexOf(x.groupe_id)], rr = Math.max(0, x.places - x.n);
          return '<span class="xs"><b>' + esc(g ? String(g.nom).replace("CLOC'ARENA ", '') : 'Niveau') + '</b> ' + (rr ? rr + ' place' + (rr > 1 ? 's' : '') : '<b style="color:var(--ac)">complet</b>') + '</span>';
        }).join('') + '</span>');
        par[id].forEach(function (x) {
          if (x.n < x.places) return;
          Array.prototype.forEach.call(document.querySelectorAll('[data-qins^="in|' + id + '|"]'), function (b) { if (b.dataset.qins.split('|')[3].split(',').indexOf(x.groupe_id) >= 0) b.textContent = 'Liste d\'attente'; });
        });
      });
    }).catch(function () { });
    Array.prototype.forEach.call(document.querySelectorAll('[data-qins]'), function (b) {
      b.onclick = function (ev) {
        ev.preventDefault(); b.disabled = true;
        var x = b.dataset.qins.split('|');
        var op = x[0] === 'in' ? sb.from('inscriptions').insert({ evenement_id: x[1], personne_id: x[2], created_by: S.user.id }) : sb.from('inscriptions').delete().eq('evenement_id', x[1]).eq('personne_id', x[2]);
        q(op).then(function () { toast(x[0] === 'in' ? 'Inscription enregistrée' : 'Inscription annulée'); return chargerAgenda(); }).then(render)
          .catch(function () { toast('Action impossible pour le moment'); b.disabled = false; });
      };
    });
  });
  return h;
}
function carteInsc(e) {
  var d = new Date(e.debut), fin = e.fin ? new Date(e.fin) : null, gs = evGroupes(e).gs;
  var h = '<section class="card stack" style="gap:10px"><a href="#/evenement/' + e.id + '" style="display:flex;gap:12px;text-decoration:none;color:inherit"><div class="datebox"><span>' + esc(d.toLocaleDateString('fr-FR', { weekday: 'short' })) + '</span><b>' + d.getDate() + '</b></div>' +
    '<div class="stack" style="flex:1;min-width:0;gap:2px"><b>' + esc(e.titre) + '</b><span class="mut small">' + esc(fmtJour(d)) + ' · ' + fmtH(d) + (fin ? ' – ' + fmtH(fin) : '') + (e.lieu ? ' · ' + esc(e.lieu) : '') + '</span>' +
    (gs.length ? '<span>' + gs.map(groupeBadge).join(' ') + '</span>' : '') + '<span class="small" data-pl="' + e.id + '">' + (e.places_max ? '' : '<span class="mut">Places non limitées</span>') + '</span></div></a>';
  if (S.user && S.pers.length) eligibles(e).forEach(function (p) {
    var i = monInsc(e, p);
    h += '<div class="pick" style="cursor:default"><span class="dot" style="background:' + S.couleur[p.id] + '"></span>' + esc(p.prenom) +
      (i ? '<span class="small" style="margin-left:auto;color:' + (i.statut === 'attente' ? 'var(--ac)' : 'var(--ok)') + '">' + (i.statut === 'attente' ? 'Liste d\'attente' : 'Inscrit') + '</span>' + (!i.paye ? '<button class="chip" data-qins="out|' + e.id + '|' + p.id + '">Annuler</button>' : '')
        : blocage(e, p) ? '<span class="xs mut" style="margin-left:auto;text-align:right;max-width:60%">' + esc(blocage(e, p)) + '</span>'
        : '<button class="chip on" style="margin-left:auto" data-qins="in|' + e.id + '|' + p.id + '|' + evGroupes(e).ids.filter(function (g) { return (S.groupesDe[g] || []).indexOf(p) >= 0; }).join(',') + '">Inscrire</button>') + '</div>';
  });
  return h + '</section>';
}

// ---------- Profil et connexion ----------
function pageProfil() {
  var h = '<div class="pagehead wrap"><h1>' + (S.user ? 'Mon profil' : 'Connexion') + '</h1></div><main>';
  if (!S.user) {
    h += '<section class="card stack" style="gap:12px"><span class="mut small">Entre l\'adresse mail que tu as donnée au club. Tu recevras un code, sans mot de passe à retenir.</span>';
    if (S.loginStep === 1) h += '<label class="f">Adresse mail<input class="f" id="lg-mail" type="email" autocomplete="email" inputmode="email" placeholder="prenom.nom@exemple.fr" value="' + esc(S.loginEmail) + '"></label><button class="btn" id="lg-send">Recevoir mon code</button>';
    else h += '<label class="f">Code reçu par mail<input class="f" id="lg-code" inputmode="numeric" autocomplete="one-time-code" placeholder="123456"></label><button class="btn" id="lg-ok">Me connecter</button><button class="btn line" id="lg-back">Changer d\'adresse</button>';
    h += '<p class="mut small" id="lg-msg" style="margin:0">' + (S.loginStep === 2 ? 'Un mail vient de partir vers ' + esc(S.loginEmail) + '. Il arrive en moins d\'une minute : regarde aussi dans les spams ou l\'onglet Promotions. Tape le code à 6 chiffres ci-dessus.' : '') + '</p></section>' +
      '<section class="card stack" style="gap:8px"><b>Besoin d\'aide ?</b><span class="mut small">Installer l\'appli, se connecter, activer les notifications : on te montre où appuyer.</span><a class="btn line" href="#/aide">Voir le guide pas à pas</a><span class="mut xs">Le code n\'arrive pas, ou un autre souci ? Écris à <a href="mailto:contact@clocatennis.fr?subject=Appli%20CLOCA%20Tennis%20%3A%20probl%C3%A8me%20de%20connexion">contact@clocatennis.fr</a></span></section></main>';
    setTimeout(lierLogin);
    return h;
  }
  if (S.pers.length) {
    h += '<section class="card tight"><div class="eyebrow" style="padding:12px 0 4px">' + (S.pers.length > 1 ? 'Ma famille' : 'Mon profil') + '</div>' + S.pers.map(function (p) {
      var gs = (p.groupe_membres || []).filter(function (g) { return g.groupes && g.groupes.type !== 'profil'; }).map(function (g) { return groupeBadge(g.groupes); }).join(' ');
      return '<div class="stack" style="gap:8px;padding:12px 0;border-top:1px solid var(--line)"><span style="display:flex;gap:8px;align-items:center"><span class="dot" style="background:' + S.couleur[p.id] + '"></span><b>' + esc(p.prenom + ' ' + p.nom) + '</b></span>' + (gs ? '<span style="display:flex;gap:6px;flex-wrap:wrap;padding-left:18px">' + gs + '</span>' : '') + '</div>' +
        (p.niveau_arena ? '<a href="#/fiche/' + p.id + '" class="small" style="display:block;padding:0 0 10px 18px;font-weight:600">Voir la fiche CLOC\'ARENA →</a>' : '');
    }).join('') + '</section>';
  } else if (!S.isStaff) h += '<section class="card stack"><b>Adresse pas encore reconnue</b><span class="mut small">Cette adresse n\'est rattachée à aucun adhérent. Contacte le club pour qu\'il l\'ajoute.</span></section>';
  if (S.roles.length) h += '<section class="card stack" style="gap:8px"><span class="eyebrow">Mes responsabilités</span><span>' + S.roles.map(function (r) { return { direction: 'Direction sportive', bureau: 'Bureau', accueil: 'Accueil', enseignant: 'Coach des cours', coach: 'Coach d\'un groupe', responsable: 'Responsable', cordeur: 'Cordeur' }[r.role]; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(', ') + '</span>' +
    (S.isStaff || estCordeur() ? '<a class="btn navy" href="gestion/">' + ic('tool', 18, '#fff') + 'Espace gestion</a>' : '') +
    (estCoach() ? '<a class="btn ghost" href="#/coach">Mon espace coach</a>' : '') +
'</section>';
  if (S.isDir) h += '<section class="card stack" style="gap:10px"><span class="eyebrow">Voir l\'appli comme une famille</span><span class="mut small">Pour tester : tu vois exactement ce que voit la famille (agenda, inscriptions, CLOC\'ARENA), sans rien pouvoir modifier.</span>' +
    '<input class="f" id="ap-q" placeholder="Nom ou prénom d\'un adhérent" autocomplete="off"><div id="ap-r" class="stack" style="gap:6px"></div><button class="btn line" id="ap-h">Une famille au hasard</button></section>';
  if (S.compte && !S.compte.foyer_id && !S.compte.personne_id && !S.isStaff) h += '<section class="card stack" style="gap:8px"><span class="eyebrow">Mes informations</span>' + (S.compte && S.compte.identite_le ? '<span>' + esc(S.compte.prenom_declare + ' ' + S.compte.nom_declare) + '</span>' + (S.compte.enfants_declares ? '<span class="mut small">Enfants : ' + esc(S.compte.enfants_declares) + '</span>' : '') : '<span class="mut small">Pas encore renseignées.</span>') + '<button class="btn line" id="pr-id">' + (S.compte && S.compte.identite_le ? 'Modifier' : 'Indiquer mon nom') + '</button></section>';
  h += blocInstaller() + blocPush();
  h += '<a class="btn ghost" href="#/aide">' + ic('alert', 18) + ' Aide et guide pas à pas</a>';
  h += '<a class="card stack" href="#/profil/accueil" style="gap:6px;text-decoration:none;color:inherit"><span class="eyebrow">Mon accueil</span><b>Choisir mes raccourcis</b><span class="mut small">CLOC\'ARENA, cordage, double interne… garde seulement ce qui t\'intéresse.</span></a>';
  h += '<section class="card stack" style="gap:10px"><span class="eyebrow">Ton avis compte</span><span class="mut small">L\'appli est en version bêta : une idée, un souci ? Ton message part directement au club.</span>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn line" id="rt-idee">💡 Boîte à idées</button><button class="btn line" id="rt-bug">🐞 Signaler un bug</button></div></section>';
  h += '<section class="card stack" style="gap:4px"><span class="eyebrow">Connecté avec</span><span>' + esc(S.user.email) + '</span></section>' +
    '<button class="btn line" id="logout">Se déconnecter</button><p class="mut xs" style="text-align:center"><a href="confidentialite.html" style="color:var(--mut)">Politique de confidentialité</a> · version ' + VERSION_APPLI + '</p></main>';
  setTimeout(function () { if ($('pr-id')) $('pr-id').onclick = function () { modale(formIdentite(true), function () { lierIdentite(function () { fermerModale(); render(); }); }); }; lierPush(); lierInstaller(); lierApercu(); $('rt-idee').onclick = function () { ouvrirRetour('idee'); }; $('rt-bug').onclick = function () { ouvrirRetour('bug'); }; $('logout').onclick = function () { oublierPush().then(function () { return sb.auth.signOut(); }).then(function () { S.user = null; chargerUtilisateur().then(function () { go('#/accueil'); }); }); }; });
  return h;
}
function apercu(foyer, nom) {
  S.apercu = foyer ? { foyer: foyer, nom: nom } : null; S.sel = 'all'; S.agTab = null; AG = null;
  chargerUtilisateur().then(chargerAgenda).then(chargerMessages).then(chargerNotifs).then(function () { toast(foyer ? 'Aperçu : ' + nom : 'Retour à ton compte'); go('#/accueil'); render(); });
}
function lierApercu() {
  if (!$('ap-q')) return;
  var nomFoyer = function (p) { return 'Famille ' + p.nom.charAt(0) + p.nom.slice(1).toLowerCase(); };
  var t;
  $('ap-q').oninput = function () {
    clearTimeout(t); var v = this.value.trim(); if (v.length < 2) { $('ap-r').innerHTML = ''; return; }
    t = setTimeout(function () {
      q(sb.from('personnes').select('id, prenom, nom, foyer_id, niveau_arena').not('foyer_id', 'is', null).eq('actif', true).or('nom.ilike.%' + v.replace(/[%,()]/g, '') + '%,prenom.ilike.%' + v.replace(/[%,()]/g, '') + '%').order('nom').limit(8)).then(function (l) {
        $('ap-r').innerHTML = l.length ? l.map(function (p) { return '<button class="pick" data-ap="' + p.foyer_id + '" data-apn="' + esc(nomFoyer(p)) + '">' + esc(p.prenom + ' ' + p.nom) + (p.niveau_arena ? ' <span class="mut small">· ' + esc(p.niveau_arena) + '</span>' : '') + '</button>'; }).join('') : '<span class="mut small">Aucun adhérent trouvé.</span>';
        Array.prototype.forEach.call(document.querySelectorAll('[data-ap]'), function (b) { b.onclick = function () { apercu(b.dataset.ap, b.dataset.apn); }; });
      }).catch(function () { $('ap-r').innerHTML = '<span class="mut small">Recherche impossible.</span>'; });
    }, 250);
  };
  $('ap-h').onclick = function () {
    q(sb.from('personnes').select('foyer_id, nom').not('foyer_id', 'is', null).eq('actif', true).limit(1000)).then(function (l) {
      l = l.filter(function (p) { return p.foyer_id; });
      if (!l.length) return toast('Aucune famille');
      var p = l[Math.floor(Math.random() * l.length)]; apercu(p.foyer_id, nomFoyer(p));
    });
  };
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
function pageSaisieArena() {
  if (!S.user || !(S.isStaff || S.gere.length)) return '<div class="pagehead wrap"><h1>Saisie CLOC\'ARENA</h1></div><main><section class="card empty">Espace réservé à l\'équipe du club.</section></main>';
  var h = '<div class="darkhead"><div class="wrap">' + backLink('#/coach', 'Espace coach', true) + '<div class="kicker" style="margin-top:8px">SAISIE CLOC\'ARENA</div><h1>CLOC\'ARENA</h1>' +
    '<div class="seg" style="margin-top:14px">' + [['saisir', 'Saisir'], ['valider', 'À valider'], ['recents', 'Récents'], ['niveaux', 'Niveaux']].map(function (t) {
      return '<button data-gtab="' + t[0] + '" class="' + (S.gesTab === t[0] ? 'on' : '') + '">' + t[1] + '</button>';
    }).join('') + '</div></div></div><main id="ges-main"><div class="skel"></div></main>';
  setTimeout(function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-gtab]'), function (b) { b.onclick = function () { S.gesTab = b.dataset.gtab; render(); }; });
    Promise.all([chargerJoueurs(), chargerFormats()]).then(function () {
      if (S.gesTab === 'saisir') gesSaisir(); else if (S.gesTab === 'valider') gesListe('propose'); else if (S.gesTab === 'niveaux') gesNiveaux(); else gesListe('valide');
    }).catch(function () { $('ges-main').innerHTML = '<section class="card empty">Impossible de charger les joueurs.</section>'; });
  });
  return h;
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
    '<span class="mut xs">Clique sur plusieurs niveaux pour un regroupement (ex. Violet + Rouge).</span>' +
    '<b class="small">' + (dbl ? 'Équipe 1' : 'Joueur 1') + '</b>' + ligne(1, 0) + (dbl ? ligne(1, 1) : '') +
    '<b class="small">' + (dbl ? 'Équipe 2' : 'Joueur 2') + '</b>' + ligne(2, 0) + (dbl ? ligne(2, 1) : '') +
    '<div class="f">Score, côté ' + (dbl ? 'équipe 1' : 'joueur 1') + ' à gauche' + [0, 1, 2].map(function (k) {
      var v = (F.sets || [])[k] || ['', ''];
      return '<div style="display:flex;gap:8px;align-items:center;margin-top:6px"><span class="small mut" style="width:96px">' + ['Set 1 / match', 'Set 2', 'Set 3 / super TB'][k] + '</span><input class="f" data-set="' + k + '-0" type="number" inputmode="numeric" min="0" max="20" value="' + esc(v[0]) + '" style="width:70px;text-align:center"><b>–</b><input class="f" data-set="' + k + '-1" type="number" inputmode="numeric" min="0" max="20" value="' + esc(v[1]) + '" style="width:70px;text-align:center"></div>';
    }).join('') + '</div><input type="hidden" id="g-score" value="' + esc(F.score) + '"></label>' +
    '<p class="small" style="margin:0;color:' + (lu ? 'var(--ok)' : 'var(--mut)') + '" id="g-prev">' + (lu ? '🏆 ' + esc(nomEq(lu.vainqueur)) + ' gagne ' + esc(scorePour(lu.score, lu.vainqueur)) : 'Tape le score pour voir le vainqueur.') + '</p>' +
    '<button class="btn" id="g-save">' + (S.isDir ? 'Enregistrer et valider' : 'Proposer ce score') + '</button>' +
    (S.isDir ? '' : '<p class="mut xs" style="margin:0">Le score sera ajouté au classement après validation par la direction sportive.</p>') + '</section>';
  $('g-date').onchange = function () { F.date = this.value; };
  Array.prototype.forEach.call(box.querySelectorAll('[data-fmt]'), function (b) { b.onclick = function () { F.format = b.dataset.fmt; gesSaisir(); }; });
  Array.prototype.forEach.call(box.querySelectorAll('[data-gniv]'), function (b) { b.onclick = function () { var n = b.dataset.gniv, i = F.niv.indexOf(n); if (!n) F.niv = []; else if (i >= 0) F.niv.splice(i, 1); else F.niv.push(n); gesSaisir(); }; });
  Array.prototype.forEach.call(box.querySelectorAll('[data-j]'), function (s) { s.onchange = function () { var x = s.dataset.j.split('-'); F['e' + x[0]][+x[1]] = s.value; gesSaisir(); }; });
  Array.prototype.forEach.call(box.querySelectorAll('[data-inv]'), function (c) { c.onchange = function () { F.inv[c.dataset.inv] = c.checked; }; });
  Array.prototype.forEach.call(box.querySelectorAll('[data-set]'), function (i) {
    i.oninput = function () {
      F.sets = [0, 1, 2].map(function (k) { return [box.querySelector('[data-set="' + k + '-0"]').value, box.querySelector('[data-set="' + k + '-1"]').value]; });
      F.score = F.sets.filter(function (x) { return x[0] !== '' && x[1] !== ''; }).map(function (x) { return (+x[0]) + '-' + (+x[1]); }).join(' ');
      $('g-score').oninput.call({ value: F.score });
    };
  });
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
      S.classement = null; G.form.e1 = ['', '']; G.form.e2 = ['', '']; G.form.inv = {}; G.form.score = ''; G.form.sets = []; gesSaisir();
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
    q(sb.from('cordage_tarifs').select('*')),
    q(sb.from('cordage_memos').select('*')).catch(function () { return []; })
  ]).then(function (r) { C = { file: r[0] || [], dem: r[1] || [], cordages: r[2] || [], tarifs: r[3] || [], memos: r[4] || [] }; return C; });
}
// Réglages de cordage mémorisés (case « Enregistrer pour mes prochaines demandes »)
function memoCordage(pid) { return pid && C && C.memos ? C.memos.filter(function (m) { return m.personne_id === pid; })[0] || null : null; }
function appliquerMemoCordage(F, pid) {
  var m = memoCordage(pid); if (!m) { F.memo = false; F.memoNom = ''; return false; }
  var g = m.reglages || {}, actifs = C.cordages.filter(function (c) { return c.actif; });
  F.raquette = g.raquette || ''; F.fourni = g.fourni === 'joueur' ? 'joueur' : 'club';
  F.cordage = g.cordage && actifs.some(function (c) { return c.id === g.cordage; }) ? g.cordage : '';
  F.perso = g.perso || ''; F.tension = g.tension || ''; F.note = g.note || ''; if (g.tel) F.tel = g.tel;
  var p = S.pers.filter(function (x) { return x.id === pid; })[0];
  F.memo = true; F.memoNom = p ? p.prenom : ''; F.memoPerdu = g.fourni !== 'joueur' && !!g.cordage && !F.cordage;
  return true;
}
function estCordeur() { return S.roles.some(function (x) { return (x.role === 'cordeur' || x.role === 'direction') && !x.groupe_id; }); }
function aMoi(d) { return d.cree_par === S.user.id || S.pers.some(function (p) { return p.id === d.personne_id; }); }
function tarifPose() { var t = C && C.tarifs.filter(function (x) { return x.code === 'pose'; })[0]; return t ? +t.prix : null; }
function resumeCordage() {
  if (!cordageOuvert()) return 'Bientôt disponible';
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
  if (!cordageOuvert()) return '<div class="darkhead"><div class="wrap">' + backLink('#/accueil', 'Accueil', true) + '<div class="kicker" style="margin-top:4px">ATELIER CORDAGE</div><h1>Cordage</h1></div></div><main>' +
    '<section class="card stack" style="gap:10px;text-align:center"><span style="font-size:42px">🎾</span><b style="font-size:19px">Bientôt disponible</b><span class="small">Le dépôt de raquette via l\'appli arrive très bientôt : tu pourras choisir ton cordage, voir le prix et être prévenu quand ta raquette est prête.</span><span class="mut small">En attendant, dépose ta raquette au club house, avec une étiquette à ton nom.</span></section></main>';
  if (sous) S.cordTab = sous;
  var cordeur = false; // l'atelier se gère dans « Mon espace cordeur » ; ici, la vue de tout le monde
  var tabsC = [['deposer', 'Déposer'], ['attente', 'En attente'], ['pretes', 'Prêtes']];

  if (S.cordTab === 'reglages') { location.href = 'gestion/#/cordage'; return ''; }
  if (!S.cordTab) S.cordTab = 'deposer';
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
    CF = { qui: S.pers.length === 1 ? S.pers[0].id : '', autre: false, autreNom: '', nomExt: '', raquette: '', fourni: 'club', cordage: '', perso: '', tension: '', avant: '', tel: dernier ? dernier.telephone : '', note: '', memo: false };
    if (CF.qui) appliquerMemoCordage(CF, CF.qui);
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
    (F.autre ? '' : S.pers.map(function (p) { return pick('cqui', p.id, F.qui === p.id, '<span class="dot" style="background:' + S.couleur[p.id] + ';margin-right:8px"></span>' + esc(p.prenom + ' ' + p.nom)); }).join('')) +
    (S.pers.length ? '<label class="check"><input type="checkbox" id="cf-autre"' + (F.autre ? ' checked' : '') + '><span>Je dépose la raquette pour une autre personne</span></label>' +
      (F.autre ? '<label class="f">Nom et prénom de la personne<input class="f" data-cf="autreNom" value="' + esc(F.autreNom) + '" maxlength="80" placeholder="Prénom Nom" autocomplete="off"></label><span class="mut xs">C\'est toi qui es prévenu quand la raquette est prête, et toi qui la récupères.</span>' : '') : '') +
    (cordeur ? pick('cqui', 'ext', F.qui === 'ext', 'Autre joueur (saisi par le cordeur)') + (F.qui === 'ext' ? '<label class="f">Nom du joueur<input class="f" data-cf="nomExt" value="' + esc(F.nomExt) + '" placeholder="Prénom Nom"></label>' : '') : '') +
    '<label class="f">Raquette (facultatif)<input class="f" data-cf="raquette" value="' + esc(F.raquette) + '" placeholder="Ex. Babolat Pure Drive bleue"></label></section>' +
    (F.memo && F.memoNom && !F.autre && F.qui !== 'ext' ? '<div class="small" style="background:var(--soft);border-left:4px solid var(--ok, #2e7d32);border-radius:10px;padding:10px 12px">✓ Réglages enregistrés de ' + esc(F.memoNom) + ' remplis automatiquement. Vérifie et dépose.' + (F.memoPerdu ? ' Le cordage habituel n\'est plus proposé : choisis-en un autre.' : '') + '</div>' : '') +
    '<section class="card stack" style="gap:10px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="eyebrow">Cordage</span><a class="small" href="#/cordage/guide" style="font-weight:600">Quel cordage choisir ? →</a></div><div class="grid2">' +
    pick('cfour', 'club', F.fourni === 'club', 'Fourni par le club') + pick('cfour', 'joueur', F.fourni === 'joueur', 'J\'apporte le mien') + '</div>' +
    (F.fourni === 'club'
      ? (actifs.length ? actifs.map(function (c) { return pick('ccord', c.id, F.cordage === c.id, esc(c.nom) + (c.pour_qui ? '<span class="mut xs" style="display:block;font-weight:400">' + esc(c.pour_qui) + '</span>' : ''), '<b>' + euros(c.prix) + '</b>'); }).join('') : '<span class="mut small">Aucun cordage du club disponible pour le moment.</span>')
      : '<label class="f">Quel cordage ?<input class="f" data-cf="perso" value="' + esc(F.perso) + '" placeholder="Ex. Luxilon Alu Power 1.25"></label><span class="mut xs">Pense à le laisser avec la raquette. Pose seule : ' + euros(tarifPose()) + '.</span>') +
    '<label class="f">Tension (facultatif)<input class="f" data-cf="tension" value="' + esc(F.tension) + '" placeholder="Ex. 24 kg / 23 kg, ou « comme d\'habitude »"></label></section>' +
    '<section class="card stack" style="gap:10px"><label class="f">J\'en ai besoin pour (facultatif)<input class="f" type="date" data-cf="avant" min="' + isoJour(new Date()) + '" value="' + esc(F.avant) + '"></label>' +
    '<div class="small" style="background:var(--soft);border-left:4px solid var(--ac);border-radius:10px;padding:10px 12px">⚠️ ' + esc(reg('cordage_dispo_msg', 'Cette date est indicative : le cordage se fait selon la disponibilité du cordeur. Nous ne pouvons pas garantir qu\'elle sera prête à temps.')) + '</div>' +
    '<label class="f">Téléphone (pour te prévenir)<input class="f" type="tel" inputmode="tel" autocomplete="tel" data-cf="tel" value="' + esc(F.tel) + '" placeholder="06 12 34 56 78"></label>' +
    '<label class="f">Un mot pour le cordeur (facultatif)<textarea class="f" data-cf="note" placeholder="Ex. garder le même grip">' + esc(F.note) + '</textarea></label></section>' +
    '<section class="card stack" style="gap:10px"><div style="display:flex;justify-content:space-between;align-items:center"><span>Prix</span><b class="disp" style="font-size:28px">' + (prix != null ? euros(prix) : '—') + '</b></div>' +
    '<span class="mut xs">À régler au club house en récupérant la raquette.</span>' +
    (F.qui && F.qui !== 'ext' && !F.autre ? '<label class="check"><input type="checkbox" id="cf-memo"' + (F.memo ? ' checked' : '') + '><span>Enregistrer ces réglages pour mes prochaines demandes<span class="mut xs" style="display:block">Raquette, cordage, tension, téléphone et mot au cordeur seront remplis tout seuls la prochaine fois.</span></span></label>' : '') +
    '<button class="btn" id="cf-go">Déposer ma raquette</button></section>';
  box.innerHTML = h;
  Array.prototype.forEach.call(box.querySelectorAll('[data-cf]'), function (i) { i.oninput = function () { F[i.dataset.cf] = i.value; }; });
  Array.prototype.forEach.call(box.querySelectorAll('[data-cqui]'), function (b) { b.onclick = function () { if (F.qui !== b.dataset.cqui) { F.qui = b.dataset.cqui; if (F.qui !== 'ext') appliquerMemoCordage(F, F.qui); else F.memo = false; } cordDeposer(box); }; });
  if ($('cf-memo')) $('cf-memo').onchange = function () { F.memo = this.checked; };
  if ($('cf-autre')) $('cf-autre').onchange = function () { F.autre = this.checked; if (F.autre && (!F.qui || F.qui === 'ext')) F.qui = S.pers[0].id; cordDeposer(box); };
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
    if (F.autre) { if (!F.autreNom.trim() || F.autreNom.trim().indexOf(' ') < 0) return toast('Indique le nom et le prénom de la personne'); if (!F.qui || F.qui === 'ext') F.qui = S.pers[0].id; }
    if (!F.qui) return toast('Choisis pour qui');
    if (F.qui === 'ext' && !F.nomExt.trim()) return toast('Indique le nom du joueur');
    if (F.fourni === 'club' && !F.cordage) return toast('Choisis un cordage');
    if (F.fourni === 'joueur' && !F.perso.trim()) return toast('Indique ton cordage');
    if (!telWa(F.tel)) return toast('Vérifie le numéro de téléphone');
    var row = {
      personne_id: F.qui === 'ext' ? null : F.qui, nom: F.qui === 'ext' ? F.nomExt.trim() : F.autre ? F.autreNom.trim() : '-', pour_tiers: !!F.autre && F.qui !== 'ext', telephone: F.tel.trim(), raquette: F.raquette.trim() || null,
      fourni_par: F.fourni, cordage_id: F.fourni === 'club' ? F.cordage : null, cordage_perso: F.fourni === 'joueur' ? F.perso.trim() : null,
      tension: F.tension.trim() || null, besoin_avant: F.avant || null, note: F.note.trim() || null
    };
    $('cf-go').disabled = true;
    var memoPid = F.qui !== 'ext' && !F.autre ? F.qui : null, garder = !!F.memo, avait = !!memoCordage(memoPid);
    var reglages = { raquette: row.raquette || '', fourni: F.fourni, cordage: row.cordage_id || '', perso: row.cordage_perso || '', tension: row.tension || '', tel: row.telephone, note: row.note || '' };
    q(sb.from('cordage_demandes').insert(row)).then(function () {
      CF = null;
      if (!memoPid) return;
      var m = garder ? sb.from('cordage_memos').upsert({ personne_id: memoPid, reglages: reglages, maj_le: new Date().toISOString() }, { onConflict: 'user_id,personne_id' })
        : avait ? sb.from('cordage_memos').delete().eq('personne_id', memoPid) : null;
      return m ? q(m).catch(function () { toast('Demande enregistrée, mais les réglages n\'ont pas pu être mémorisés'); }) : null;
    }).then(function () {
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
  var cordeur = false, now = debutJour(new Date()); // gestion de l'atelier : « Mon espace cordeur »
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
        ? (d.besoin_avant ? '<span class="badge" style="background:' + (urgent ? 'var(--ko)' : 'var(--soft)') + ';color:' + (urgent ? '#fff' : 'var(--tx)') + '">Pour le ' + esc(fmtCourt(new Date(d.besoin_avant + 'T12:00:00'))) + '</span>' : '')
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
        (statut === 'attente' ? (x.besoin_avant ? 'pour le ' + esc(fmtCourt(new Date(x.besoin_avant + 'T12:00:00'))) : 'déposée le ' + esc(fmtCourt(new Date(x.depose_le)))) : 'prête le ' + esc(fmtCourt(new Date(x.fini_le || x.depose_le)))) + '</span></div>';
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
        '<textarea class="f" data-cdesc="' + c.id + '" rows="2" placeholder="Ce que c\'est (guide des cordages)">' + esc(c.description) + '</textarea>' +
        '<textarea class="f" data-cpq="' + c.id + '" rows="2" placeholder="Pour qui ?">' + esc(c.pour_qui) + '</textarea>' +
        '<textarea class="f" data-csen="' + c.id + '" rows="2" placeholder="Sensations, conseils">' + esc(c.sensation) + '</textarea>' +
        '<details' + (aProfil(c) ? '' : '') + '><summary class="small" style="cursor:pointer;font-weight:600">Profil (graphique) : notes de 0 à 100</summary><div class="stack" style="gap:6px;margin-top:8px">' +
        AXES_CORDAGE.map(function (a) { var v = c.profil && c.profil[a[0]] != null ? c.profil[a[0]] : ''; return '<label class="small" style="display:grid;grid-template-columns:120px 1fr 44px;gap:8px;align-items:center">' + a[1] + '<input type="range" min="0" max="100" step="1" data-cpf="' + c.id + '|' + a[0] + '" value="' + (v === '' ? 50 : v) + '"' + (v === '' ? ' data-vide="1"' : '') + '><b data-cpfv="' + c.id + '|' + a[0] + '">' + (v === '' ? '–' : v) + '</b></label>'; }).join('') +
        '<span class="mut xs">Laisse « – » si tu n\'as pas de note : le graphique n\'apparaît que quand les 6 sont remplies.</span></div></details>' +
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
  Array.prototype.forEach.call(box.querySelectorAll('[data-cpf]'), function (r) { r.oninput = function () { delete r.dataset.vide; box.querySelector('[data-cpfv="' + r.dataset.cpf + '"]').textContent = r.value; }; });
  Array.prototype.forEach.call(box.querySelectorAll('[data-csave]'), function (b) {
    b.onclick = function () {
      var id = b.dataset.csave, n = num(box.querySelector('[data-cprix="' + id + '"]').value), nom = box.querySelector('[data-cnom="' + id + '"]').value.trim();
      if (n == null || !nom) return toast('Nom ou prix invalide');
      var tx = function (a) { var v = box.querySelector('[data-' + a + '="' + id + '"]').value.trim(); return v || null; };
      var pf = {}, nbv = 0; AXES_CORDAGE.forEach(function (a) { var r = box.querySelector('[data-cpf="' + id + '|' + a[0] + '"]'); if (r && !r.dataset.vide) { pf[a[0]] = +r.value; nbv++; } });
      q(sb.from('cordages').update({ nom: nom, prix: n, actif: box.querySelector('[data-cact="' + id + '"]').checked, description: tx('cdesc'), pour_qui: tx('cpq'), sensation: tx('csen'), profil: nbv === AXES_CORDAGE.length ? pf : (nbv ? pf : null) }).eq('id', id)).then(function () { apres('Cordage enregistré'); }).catch(function () { toast('Action impossible'); });
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
  if (estInstallee()) return '<section class="card"><span class="small" style="color:var(--ok)">✓ L\'appli est installée sur cet appareil.</span></section>';
  if (!INSTALL) return '<section class="card stack" style="gap:6px"><b>Installer l\'appli sur ce téléphone</b><span class="mut small">' + (estIos() ? 'Dans Safari : bouton Partager, puis « Sur l\'écran d\'accueil ».' : 'Dans le menu ⋮ du navigateur : « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ». Si l\'option n\'apparaît pas, l\'appli est sûrement déjà installée : cherche l\'icône CLOCA Tennis.') + '</span></section>';
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
var PRES = null, PRES_T = 0, PAUSES = null;
// Vacances, trêve, jours fériés : pas de cours, donc personne au club par défaut
function pauseDu(j) { var iso = isoJour(j); return (PAUSES || []).filter(function (v) { return iso >= v.debut && iso <= v.fin; }).sort(function (a, b) { return (b.fin > b.debut) - (a.fin > a.debut); })[0] || null; }
var ETATS = {
  ouvert: { c: '#1f8a4c', t: 'Club house ouvert', d: 'Quelqu\'un est à l\'accueil pour te rendre ta raquette.' },
  coach: { c: '#d9822b', t: 'Un coach est au club', d: 'Il est sur le terrain : pas toujours disponible pour rendre une raquette.' },
  ferme: { c: '#c62f2f', t: 'Club house fermé', d: 'Personne n\'est présent pour le moment.' }
};
function chargerPresence(force) {
  if (!force && PRES && Date.now() - PRES_T < 60e3) return Promise.resolve(PRES);
  return Promise.all([
    q(sb.from('club_presence').select('etat, jusqua, message, maj_le').eq('id', 1).maybeSingle()),
    PAUSES ? Promise.resolve(PAUSES) : q(sb.from('periodes_sans_cours').select('debut, fin, libelle')).catch(function () { return []; })
  ]).then(function (r) { PRES = r[0]; PAUSES = r[1] || []; PRES_T = Date.now(); return PRES; });
}
// Horaires habituels (jour : 1 = lundi … 7 = dimanche)
var HORAIRES = {
  clubhouse: { 3: [['09:30', '12:00'], ['14:00', '16:30']], 6: [['09:30', '12:00'], ['14:00', '16:30']] },
  coach: { 1: [['17:30', '22:45']], 2: [['17:30', '22:45']], 3: [['09:00', '21:00']], 4: [['17:30', '22:15']], 5: [['17:30', '22:45']], 6: [['09:00', '16:00']] }
};
var MOIS_P = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
var JOURS = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
function aHeure(j, hm) { var x = new Date(j), t = hm.split(':'); x.setHours(+t[0], +t[1], 0, 0); return x; }
function creneauEnCours(type, now) {
  now = now || new Date(); var js = now.getDay() || 7;
  if (pauseDu(now)) return null;
  var l = (HORAIRES[type][js] || []).map(function (c) { return { debut: aHeure(now, c[0]), fin: aHeure(now, c[1]) }; });
  return l.filter(function (c) { return now >= c.debut && now < c.fin; })[0] || null;
}
function prochainCreneau(type) {
  var now = new Date();
  for (var k = 0; k < 60; k++) {
    var j = new Date(now); j.setDate(j.getDate() + k); var js = j.getDay() || 7;
    if (pauseDu(j)) continue;
    var c = (HORAIRES[type][js] || []).map(function (x) { return aHeure(j, x[0]); }).filter(function (d) { return d > now; })[0];
    if (c) return c;
  }
  return null;
}
function quandTexte(d) {
  var auj = debutJour(new Date()), dj = debutJour(d), n = Math.round((dj - auj) / 864e5);
  return (n === 0 ? 'aujourd\'hui' : n === 1 ? 'demain' : JOURS[d.getDay() || 7] + (n > 6 ? ' ' + d.getDate() + ' ' + MOIS_P[d.getMonth()] : '')) + ' à ' + fmtH(d);
}
// Ce qu'on affiche : la mise à jour manuelle tant qu'elle court, sinon les horaires des cours
function etatAffiche(p) {
  var now = new Date();
  if (p && p.jusqua && new Date(p.jusqua) > now) return { etat: p.etat, fin: new Date(p.jusqua), manuel: true, message: p.message };
  var c = creneauEnCours('coach');
  if (c) return { etat: 'coach', fin: c.fin, auto: true };
  return { etat: 'ferme', prochain: prochainCreneau('coach'), pause: pauseDu(now) };
}
function estEquipe() { return S.user && S.roles.length > 0; }
function remplirPresence() {
  var box = $('presence'); if (!box || !sb) return;
  chargerPresence().then(function (p) {
    if (!$('presence')) return;
    var A = etatAffiche(p), E = ETATS[A.etat], ch = creneauEnCours('clubhouse');
    var h = '<section class="card stack" style="gap:6px"><div style="display:flex;gap:10px;align-items:center"><span class="dot" style="width:14px;height:14px;background:' + E.c + ';box-shadow:0 0 0 4px ' + E.c + '33"></span>' +
      '<b>' + E.t + (A.fin ? ' jusqu\'à ' + fmtH(A.fin) : '') + '</b></div>' +
      '<span class="mut small">' + (A.pause ? esc(A.pause.libelle) + ' : pas de cours collectifs.' + (A.prochain ? ' Reprise ' + quandTexte(A.prochain) + '.' : '') : E.d + (A.etat === 'ferme' && A.prochain ? ' Prochain créneau : ' + quandTexte(A.prochain) + '.' : '')) + '</span>' +
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
    // Accueil : une tuile carrée (état + heure) ; un appui affiche le détail et, pour l'équipe, les boutons
    var det = $('presence-det');
    if (det) {
      var court = { ouvert: 'Ouvert', coach: 'Coach au club', ferme: 'Fermé' }[A.etat];
      var sous = A.pause ? esc(A.pause.libelle) : A.fin ? 'jusqu\'à ' + fmtH(A.fin) : A.etat === 'ferme' && A.prochain ? 'Ouvre ' + esc(quandTexte(A.prochain)) : '';
      box.innerHTML = '<button class="tile tile-top" id="pres-tile" aria-expanded="' + (S.presDet ? 'true' : 'false') + '"><span style="display:flex;align-items:center;gap:8px"><span class="dot" style="width:12px;height:12px;flex:none;background:' + E.c + ';box-shadow:0 0 0 4px ' + E.c + '33"></span><span class="xs mut" style="text-transform:uppercase;letter-spacing:.6px;font-weight:600">Club house</span></span>' +
        '<b style="font-size:19px;color:' + E.c + '">' + court + '</b><span class="mut small">' + (sous || (estEquipe() ? 'Appuie pour mettre à jour' : 'Appuie pour le détail')) + '</span></button>';
      det.innerHTML = S.presDet ? h + '</section>' : '';
      $('pres-tile').onclick = function () { S.presDet = !S.presDet; remplirPresence(); };
    } else box.innerHTML = h + '</section>';
    var maj = function (row, msg) { q(sb.from('club_presence').update(row).eq('id', 1)).then(function () { toast(msg); return chargerPresence(true); }).then(remplirPresence).catch(function () { toast('Mise à jour impossible'); }); };
    if ($('pres-ouvrir')) $('pres-ouvrir').onclick = function () { if (!ch) finCh.setMinutes(Math.ceil(finCh.getMinutes() / 15) * 15, 0, 0); maj({ etat: 'ouvert', jusqua: finCh.toISOString(), message: null }, 'Club house ouvert'); };
    if ($('pres-fermer')) $('pres-fermer').onclick = function () { maj({ etat: 'ferme', jusqua: null, message: null }, 'Club house fermé'); };
    if ($('pres-edit')) $('pres-edit').onclick = function () { editerPresence($('presence-det') || box, p, A.etat); };
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
    '<div class="row" style="padding:6px 0;border:0"><span class="mut small">Cordeur officiel</span><b class="small">' + esc(reg('cordage_cordeur', 'Skander')) + '</b></div>' +
    '<div class="row" style="padding:6px 0"><span class="mut small">Paiement</span><b class="small">' + esc(reg('cordage_paiement', 'En espèces, au retrait')) + '</b></div>' +
    '<span class="mut xs">' + esc(reg('cordage_consigne', 'Remplis le formulaire, laisse ta raquette au club house avec une étiquette à ton nom : tu es prévenu dès qu\'elle est cordée.')) + '</span></section>';
}


// ---------- Messagerie : messages du club, des coachs, actus et séances ----------
// ===== Cloche : notifications du compte (messages du club, fils, questionnaires, cordage, double…) =====
// Chaque envoi est gardé par la base (table notifications) ; la pastille compte ce qui n'est pas encore ouvert.
// Une notification passe en « lue » quand on la touche, ou quand on ouvre la page vers laquelle elle mène.
function chargerNotifs() {
  if (!S.user || S.apercu) { S.notifs = []; return Promise.resolve(); }
  return q(sb.from('notifications').select('id, titre, texte, url, nb, lu_le, created_at').order('created_at', { ascending: false }).limit(80))
    .then(function (l) { S.notifs = l || []; majCloche(); }).catch(function () { S.notifs = S.notifs || []; });
}
function notifsNonLues() { return (S.notifs || []).filter(function (n) { return !n.lu_le; }); }
function pastilleCloche(n) { return n ? '<span class="nb">' + (n > 99 ? '99+' : n) + '</span>' : ''; }
function majCloche() {
  var n = notifsNonLues().length;
  Array.prototype.forEach.call(document.querySelectorAll('.bell'), function (b) {
    var p = b.querySelector('.nb'); if (p) p.remove();
    if (n) b.insertAdjacentHTML('beforeend', pastilleCloche(n));
    b.setAttribute('aria-label', 'Notifications' + (n ? ', ' + n + ' non lue' + (n > 1 ? 's' : '') : ''));
    b.classList.toggle('sonne', n > 0);
  });
}
// La cloche prend la place de la balle dans l'en-tête de la page (accueil et en-têtes marine)
function poserCloche() {
  if (!S.user || S.apercu) return;
  var page = document.body.getAttribute('data-page');
  var h = document.querySelector('#app .hero, #app .darkhead' + (page === 'discussion' || page === 'message' ? '' : ', #app .pagehead'));
  if (!h || h.querySelector('.bell')) return;
  h.classList.add('a-cloche');
  h.insertAdjacentHTML('beforeend', '<a class="bell" href="#/notifs"><img src="cloche.png" alt="" width="44" height="46"></a>');
  majCloche();
}
// Ouvrir une page = lire les notifications qui y mènent
function notifsLuesPage() {
  if (!S.user || S.apercu) return;
  var ici = '/app/' + (location.hash || '#/accueil');
  var ids = notifsNonLues().filter(function (n) { return n.url === ici; }).map(function (n) { return n.id; });
  if (ids.length) notifsLire(ids);
}
function notifsLire(ids, tout) {
  var t = new Date().toISOString();
  (S.notifs || []).forEach(function (n) { if (!n.lu_le && (tout || ids.indexOf(n.id) >= 0)) n.lu_le = t; });
  majCloche();
  return q(sb.rpc('notifs_lues', tout ? { tout: true } : { ids: ids })).catch(function () { });
}
function iconeNotif(u) {
  return /#\/discussion\//.test(u) ? 'chat' : /#\/message\//.test(u) ? 'mail' : /#\/questionnaire\//.test(u) ? 'check' : /cordage/.test(u) ? 'racket' : /double/.test(u) ? 'trophy' : /\/gestion\//.test(u) ? 'tool' : 'bell';
}
function quandNotif(d) {
  var j = new Date(d), min = Math.round((Date.now() - j) / 60000);
  if (min < 1) return 'À l\'instant';
  if (min < 60) return 'Il y a ' + min + ' min';
  return quandMsg(d);
}
function ligneNotif(n) {
  var nl = !n.lu_le, txt = n.texte;
  if (n.nb > 1 && /#\/discussion\//.test(n.url)) txt = n.nb + ' nouveaux messages · ' + txt;
  return '<button class="row notif' + (nl ? ' nl' : '') + '" data-notif="' + esc(n.id) + '">' +
    '<span class="notif-ic">' + ic(iconeNotif(n.url), 20, '#fff') + '</span>' +
    '<span class="stack" style="flex:1;gap:2px;min-width:0;text-align:left"><span style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b class="notif-t">' + esc(n.titre) + '</b><span class="xs notif-q">' + esc(quandNotif(n.created_at)) + '</span></span>' +
    '<span class="small notif-x">' + esc(txt) + '</span></span>' + (nl ? '<span class="notif-pt" aria-label="Non lue"></span>' : '') + '</button>';
}
function pageNotifs() {
  var h = '<div class="darkhead"><div class="wrap">' + backLink('#/accueil', 'Accueil', true) + '<div class="kicker" style="margin-top:8px">MON COMPTE</div><h1>Notifications</h1></div></div><main>';
  if (!S.user) return h + '<section class="card empty">Connecte-toi pour voir tes notifications.</section></main>';
  var l = S.notifs || [], nl = l.filter(function (n) { return !n.lu_le; }), lu = l.filter(function (n) { return n.lu_le; });
  if (!l.length) return h + '<section class="card empty">Rien pour le moment. Messages du club, discussions, questionnaires, raquette prête… tout ce qui concerne ton compte arrivera ici.</section></main>';
  if (nl.length) h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div class="sect" style="margin:0">Nouvelles · ' + nl.length + '</div><button class="btn ghost" id="notifs-tout" style="width:auto;padding:6px 12px">Tout marquer comme lu</button></div>' +
    '<section class="card list notifs">' + nl.map(ligneNotif).join('') + '</section>';
  if (lu.length) h += '<div class="sect">Déjà vues</div><section class="card list notifs">' + lu.map(ligneNotif).join('') + '</section>';
  return h + '<p class="mut xs" style="text-align:center">Les notifications sont gardées 3 mois.</p></main>';
}
function lierNotifs() {
  var t = $('notifs-tout');
  if (t) t.onclick = function () { notifsLire([], true); render(); };
  Array.prototype.forEach.call(document.querySelectorAll('[data-notif]'), function (b) {
    b.onclick = function () {
      var n = (S.notifs || []).filter(function (x) { return x.id === b.dataset.notif; })[0];
      if (!n) return;
      if (!n.lu_le) notifsLire([n.id]);
      var u = n.url || '/app/';
      if (u.indexOf('/app/#') === 0) go(u.slice(5));
      else location.href = u;
    };
  });
}

function chargerMessages() {
  S.msgs = [];
  if (!S.user) return Promise.resolve();
  var champs = 'user_id, pour, lu_le, messages(id, created_at, expediteur, titre, texte, lien, repondre_a, repondre_libelle, source)';
  // En aperçu, la direction voit les messages reçus par les comptes de cette famille (sans les marquer comme lus)
  var req = S.apercu ? q(sb.rpc('comptes_liste')).then(function (l) {
      var ids = (l || []).filter(function (c) { return c.foyer_id === S.apercu.foyer; }).map(function (c) { return c.user_id; });
      return ids.length ? q(sb.from('message_destinataires').select(champs).in('user_id', ids).limit(300)) : [];
    }) : q(sb.from('message_destinataires').select(champs).eq('user_id', S.user.id).limit(300));
  return req.then(function (l) {
      var vu = {};
      S.msgs = (l || []).filter(function (x) { if (!x.messages || vu[x.messages.id]) return false; vu[x.messages.id] = 1; return true; }).sort(function (a, b) { return a.messages.created_at < b.messages.created_at ? 1 : -1; });
    })
    .catch(function () { S.msgs = []; });
}
function nonLus() { return (S.msgs || []).filter(function (x) { return !x.lu_le; }); }
function totalNonLus() { return nonLus().length + discNonLus(); }
function cloche() {
  return ''; // remplacée par l'onglet Messages
  if (!S.user) return '';
  var n = nonLus().length;
  return '<a href="#/messages" class="cloche" aria-label="Messages' + (n ? ', ' + n + ' non lu' + (n > 1 ? 's' : '') : '') + '">' + ic('bell', 24, '#fff') + (n ? '<span class="nb">' + (n > 9 ? '9+' : n) + '</span>' : '') + '</a>';
}
function quandMsg(d) {
  var t = new Date(), j = new Date(d);
  if (j.toDateString() === t.toDateString()) return fmtH(j);
  var hier = new Date(); hier.setDate(hier.getDate() - 1);
  if (j.toDateString() === hier.toDateString()) return 'Hier';
  return fmtCourt(j);
}
// Onglet Messages : un filtre par usage. « Annonces » en premier (messages du club : remplace le WhatsApp Annonces),
// puis un filtre par catégorie de fils (CLOC'ARENA, Next Gen, Interclub, Double interne…), puis « Privés » (petites annonces).
// Seuls les filtres où la personne a quelque chose apparaissent ; chaque filtre affiche ses non-lus.
var MSGF = 'annonces';
// « Club » réunit les fils de la vie sportive du club (CLOC'ARENA Tweener / Masters / Versus, CLOCA Next Gen…) : chacun ne voit que les siens
var MSG_ORDRE = ['annonces', 'club', 'Interclub'];
var MSG_NOM = { annonces: 'Annonces', club: 'Club', prives: 'Privés' };
var MSG_CLUB = ['CLOC\'ARENA', 'CLOCA Next Gen', 'Double interne', 'Club'];
function msgCat(d) { return d.type === 'prive' ? 'prives' : d.type === 'annonce' ? 'annonces' : MSG_CLUB.indexOf(d.categorie) >= 0 || !d.categorie ? 'club' : d.categorie; }
function ligneMsgClub(x) {
  var m = x.messages, nl = !x.lu_le;
  return '<a class="row" href="#/message/' + m.id + '" style="text-decoration:none;color:inherit;gap:12px;align-items:flex-start">' +
    '<span style="width:44px;height:44px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;background:var(--navy)">' + ic('bell', 20, '#fff') + '</span>' +
    '<span class="stack" style="flex:1;gap:2px;min-width:0"><span style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(m.expediteur) + '</b><span class="xs" style="flex:none;color:' + (nl ? 'var(--ac)' : 'var(--mut)') + '">' + esc(quandMsg(m.created_at)) + '</span></span>' +
    '<span style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span class="small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' + (nl ? 'font-weight:700' : 'color:var(--mut)') + '">' + esc(m.titre) + (x.pour ? ' · pour ' + esc(x.pour) : '') + '</span>' +
    (nl ? '<span class="badge" style="background:var(--ac);color:#fff;min-width:22px;justify-content:center;flex:none">1</span>' : '') + '</span></span></a>';
}
function pageMessages() {
  var h = '<div class="pagehead wrap"><h1>Messages</h1></div><main>';
  if (!S.user) return h + '<section class="card empty">Connecte-toi pour voir tes messages.</section></main>';
  var club = S.msgs || [], discs = S.discs || [], par = { annonces: [] }, nb = { annonces: nonLus().length };
  club.forEach(function (x) { par.annonces.push({ t: x.messages.created_at, h: ligneMsgClub(x) }); });
  discs.forEach(function (d) {
    var c = msgCat(d);
    (par[c] = par[c] || []).push({ t: d.dernier_le || '', h: discLigne(d, false) });
    nb[c] = (nb[c] || 0) + (d.muet ? 0 : d.non_lus || 0);
  });
  var cats = Object.keys(par).sort(function (a, b) {
    var ia = a === 'prives' ? 98 : MSG_ORDRE.indexOf(a), ib = b === 'prives' ? 98 : MSG_ORDRE.indexOf(b);
    return (ia < 0 ? 50 : ia) - (ib < 0 ? 50 : ib) || a.localeCompare(b);
  });
  if (cats.indexOf(MSGF) < 0) MSGF = 'annonces';
  var items = (par[MSGF] || []).sort(function (a, b) { return a.t < b.t ? 1 : -1; });
  // Une seule ligne, de gauche à droite (même style que les sous-onglets de Club)
  // Pastille des non-lus en haut à droite de chaque filtre : le texte garde toute la place
  h += '<div class="seg msgseg">' + cats.map(function (c) {
    return '<button class="' + (MSGF === c ? 'on' : '') + '" data-msgf="' + esc(c) + '">' + esc(MSG_NOM[c] || c) + (nb[c] ? '<span class="msgnb">' + (nb[c] > 99 ? '99+' : nb[c]) + '</span>' : '') + '</button>';
  }).join('') + '</div>';
  if (MSGF === 'annonces' && nonLus().length > 1) h += '<button class="chip" id="msg-tout" style="align-self:flex-end">Tout marquer comme lu</button>';
  h += items.length ? '<section class="card tight">' + items.map(function (i) { return i.h; }).join('') + '</section>'
    : '<section class="card empty">' + (MSGF === 'annonces' ? 'Aucune annonce du club pour le moment. Les infos du club et des coachs arriveront ici, avec une notification.' : 'Rien pour le moment.') + '</section>';
  h += '</main>';
  setTimeout(function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-msgf]'), function (b) { b.onclick = function () { MSGF = b.dataset.msgf; render(); }; });
    if ($('msg-tout')) $('msg-tout').onclick = function () {
      var ids = nonLus().map(function (x) { return x.messages.id; });
      q(sb.rpc('messages_lus', { ids: ids })).then(function () { nonLus().forEach(function (x) { x.lu_le = new Date().toISOString(); }); render(); });
    };
  });
  return h;
}
function pageMessage(id) {
  var x = (S.msgs || []).filter(function (y) { return y.messages.id === id; })[0];
  var h = '<div class="pagehead wrap">' + backLink('#/messages', 'Messages') + '</div><main>';
  if (!x) return h + '<section class="card empty">Message introuvable. Il a peut-être été retiré par le club.</section></main>';
  var m = x.messages;
  if (!x.lu_le && !S.apercu) { x.lu_le = new Date().toISOString(); q(sb.rpc('messages_lus', { ids: [m.id] })).catch(function () { }); }
  var d = new Date(m.created_at);
  h += '<section class="card stack" style="gap:12px"><span class="xs mut">' + esc(m.expediteur) + ' · ' + esc(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })) + ' à ' + fmtH(d) + '</span>' +
    '<h1 style="font-size:22px;margin:0">' + esc(m.titre) + '</h1>' +
    (x.pour ? '<span class="badge" style="align-self:flex-start;background:var(--ac);color:#fff">Pour ' + esc(x.pour) + '</span>' : '') +
    '<div class="small" style="white-space:pre-line;line-height:1.55">' + esc(m.texte) + '</div>' +
    (m.lien ? '<a class="btn ghost" href="' + esc(m.lien) + '">Voir le détail</a>' : '') + '</section>';
  if (m.repondre_a) {
    var sujet = 'Re : ' + m.titre, corps = '\n\n\n— En réponse au message « ' + m.titre + ' » (' + m.expediteur + ', ' + fmtCourt(d) + ')' + (x.pour ? ' · concernant ' + x.pour : '');
    h += '<section class="card stack" style="gap:8px"><span class="eyebrow">Répondre</span><span class="mut small">Ta réponse part par mail à <b>' + esc(m.repondre_libelle || m.repondre_a) + '</b> (' + esc(m.repondre_a) + ').</span>' +
      '<a class="btn" href="mailto:' + esc(m.repondre_a) + '?subject=' + encodeURIComponent(sujet) + '&body=' + encodeURIComponent(corps) + '">' + ic('mail', 20, '#fff') + ' Répondre par mail</a></section>';
  }
  return h + '</main>';
}
// Coach (ou direction) : écrire à tout un groupe, jamais à un enfant seul
function formEcrireGroupe(gid, nomGroupe) {
  return '<section class="card stack" style="gap:10px"><span class="eyebrow">Écrire au groupe</span>' +
    '<span class="mut xs">Le message arrive dans la messagerie des familles du groupe, avec une notification. Il est visible par la direction sportive.</span>' +
    '<label class="f">Objet<input class="f" id="eg-t" maxlength="120" placeholder="Ex. Séance de samedi en extérieur"></label>' +
    '<label class="f">Message<textarea class="f" id="eg-x" rows="4" maxlength="4000" placeholder="Ex. Pensez à prendre une gourde et une tenue chaude."></textarea></label>' +
    '<label class="f">Les réponses arrivent à<select class="f" id="eg-r"><option value="">Chargement…</option></select></label>' +
    '<button class="btn" id="eg-ok">Envoyer au groupe</button></section>';
}
function lierEcrireGroupe(gid) {
  if (!$('eg-ok')) return;
  var nc = (nomCoachCompte() || '').toLowerCase();
  q(sb.from('adresses_reponse').select('id, libelle, email, nom_coach').eq('actif', true).order('ordre').order('libelle')).then(function (l) {
    l = l || []; var moi = l.filter(function (a) { return a.nom_coach && a.nom_coach.toLowerCase() === nc; })[0];
    $('eg-r').innerHTML = l.map(function (a) { return '<option value="' + a.id + '"' + (moi && moi.id === a.id ? ' selected' : '') + '>' + esc(a.libelle + ' · ' + a.email) + '</option>'; }).join('') || '<option value="">Adresse du club</option>';
  }).catch(function () { $('eg-r').innerHTML = '<option value="">Adresse du club</option>'; });
  $('eg-ok').onclick = function () {
    var t = $('eg-t').value.trim(), x = $('eg-x').value.trim();
    if (!t || !x) return toast('Écris un objet et un message');
    if (S.apercu) return toast('Aperçu : rien n\'est envoyé');
    $('eg-ok').disabled = true;
    q(sb.rpc('envoyer_message', { p_titre: t, p_texte: x, p_cible: 'groupes', p_groupes: [gid], p_repondre: $('eg-r').value || null, p_expediteur: S.isStaff ? 'Direction sportive' : null })).then(function (r) {
      sb.functions.invoke('notifier', { body: { mode: 'message', message_id: r.id } }).catch(function () { });
      toast('Message envoyé à ' + r.destinataires + ' famille' + (r.destinataires > 1 ? 's' : ''));
      $('eg-t').value = ''; $('eg-x').value = ''; $('eg-ok').disabled = false;
    }).catch(function (e) { toast(e && e.message ? e.message : 'Envoi impossible'); $('eg-ok').disabled = false; });
  };
}

// ---------- Guide pas à pas : installer l'appli, se connecter, s'y retrouver ----------
function estAndroid() { return /android/i.test(navigator.userAgent); }
function estMobile() { return estIos() || estAndroid(); }
function navInterne() { return /FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|musical_ly|TikTok/i.test(navigator.userAgent) || (estAndroid() && /; wv\)/.test(navigator.userAgent)); }
function iosHorsSafari() { return estIos() && /CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent); }
var URL_APPLI = 'https://clocatennis.fr/app/';
// Petites maquettes dessinées pour montrer où appuyer
function maquette(t) {
  var o = '#b4532a', cadre = function (h, c) { return '<svg viewBox="0 0 260 ' + h + '" width="100%" style="max-width:300px;display:block;margin:0 auto" role="img" aria-hidden="true"><rect x="1" y="1" width="258" height="' + (h - 2) + '" rx="16" fill="#f4f6f8" stroke="#c9d3dc" stroke-width="2"/>' + c + '</svg>'; };
  var halo = function (x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="none" stroke="' + o + '" stroke-width="3.5"/><circle cx="' + x + '" cy="' + y + '" r="' + (r + 7) + '" fill="none" stroke="' + o + '" stroke-opacity=".35" stroke-width="3"/>'; };
  var txt = function (x, y, s, w, c, a) { return '<text x="' + x + '" y="' + y + '" font-family="system-ui,sans-serif" font-size="' + (w || 13) + '" fill="' + (c || '#12304a') + '"' + (a ? ' text-anchor="' + a + '"' : '') + '>' + s + '</text>'; };
  if (t === 'ios-partager') return cadre(170, '<rect x="14" y="16" width="232" height="70" rx="10" fill="#fff"/>' + txt(130, 56, 'clocatennis.fr/app', 14, '#5d6b78', 'middle') +
    '<rect x="1" y="104" width="258" height="64" fill="#fff"/><rect x="18" y="114" width="224" height="30" rx="9" fill="#e9edf1"/>' + txt(130, 134, 'clocatennis.fr', 12, '#5d6b78', 'middle') +
    '<g stroke="#2f6fd6" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M40 156l-6 0"/><path d="M80 150h0"/>' +
    '<path d="M124 154v-14M118 146l6-6 6 6"/><path d="M117 150v8h14v-8"/></g>' + halo(124, 151, 15) +
    txt(130, 98, '1. Touche ce bouton, en bas de Safari', 12.5, o, 'middle'));
  if (t === 'ios-ecran') return cadre(190, '<rect x="14" y="14" width="232" height="162" rx="12" fill="#fff"/>' +
    ['Copier', 'Ajouter à la liste de lecture', 'Ajouter un signet', 'Sur l\'écran d\'accueil', 'Imprimer'].map(function (l, i) {
      var y = 44 + i * 30, on = i === 3;
      return (on ? '<rect x="20" y="' + (y - 20) + '" width="220" height="28" rx="7" fill="#fbe3d8" stroke="' + o + '" stroke-width="2.5"/>' : '<line x1="24" y1="' + (y + 9) + '" x2="236" y2="' + (y + 9) + '" stroke="#eef1f4"/>') +
        txt(30, y, l, 13, on ? o : '#12304a') + (on ? '<rect x="212" y="' + (y - 14) + '" width="16" height="16" rx="4" fill="none" stroke="' + o + '" stroke-width="2"/><path d="M220 ' + (y - 10) + 'v8M216 ' + (y - 6) + 'h8" stroke="' + o + '" stroke-width="2"/>' : '');
    }).join(''));
  if (t === 'ios-ajouter') return cadre(150, '<rect x="14" y="14" width="232" height="122" rx="12" fill="#fff"/>' + txt(30, 40, 'Annuler', 13, '#2f6fd6') + txt(130, 40, 'Écran d\'accueil', 13, '#12304a', 'middle') +
    '<rect x="196" y="24" width="44" height="24" rx="7" fill="#fbe3d8" stroke="' + o + '" stroke-width="2.5"/>' + txt(218, 41, 'Ajouter', 12, o, 'middle') +
    '<image href="' + LOGO + '" x="30" y="64" width="52" height="52"/>' + txt(96, 86, 'CLOCA Tennis', 15) + txt(96, 106, 'clocatennis.fr', 12, '#5d6b78'));
  if (t === 'icone') return cadre(150, [0, 1, 2, 3].map(function (i) { return '<rect x="' + (28 + i * 56) + '" y="22" width="40" height="40" rx="10" fill="#d6dee6"/>'; }).join('') +
    '<rect x="28" y="80" width="40" height="40" rx="10" fill="#d6dee6"/><rect x="84" y="80" width="40" height="40" rx="10" fill="#fff"/><image href="' + LOGO + '" x="86" y="82" width="36" height="36"/>' + halo(104, 100, 26) + txt(104, 140, 'CLOCA Tennis', 11, o, 'middle'));
  if (t === 'android-menu') return cadre(190, '<rect x="14" y="14" width="232" height="30" rx="9" fill="#fff"/>' + txt(26, 34, 'clocatennis.fr/app', 12, '#5d6b78') +
    '<g fill="#12304a"><circle cx="234" cy="22" r="2.3"/><circle cx="234" cy="29" r="2.3"/><circle cx="234" cy="36" r="2.3"/></g>' + halo(234, 29, 11) +
    '<rect x="96" y="54" width="150" height="124" rx="10" fill="#fff" stroke="#d6dee6"/>' + ['Nouvel onglet', 'Favoris', 'Historique', 'Installer l\'application'].map(function (l, i) {
      var y = 78 + i * 28, on = i === 3; return (on ? '<rect x="100" y="' + (y - 18) + '" width="142" height="26" rx="6" fill="#fbe3d8" stroke="' + o + '" stroke-width="2.5"/>' : '') + txt(110, y, l, 12, on ? o : '#12304a');
    }).join('') + txt(20, 176, 'ou « Ajouter à l\'écran d\'accueil »', 11, '#5d6b78'));
  if (t === 'connexion') return cadre(170, '<rect x="14" y="14" width="232" height="142" rx="12" fill="#fff"/>' + txt(28, 38, 'Adresse mail', 12, '#5d6b78') +
    '<rect x="28" y="46" width="204" height="30" rx="8" fill="#f4f6f8" stroke="#c9d3dc"/>' + txt(38, 66, 'prenom.nom@gmail.com', 12) + '<rect x="28" y="86" width="204" height="32" rx="9" fill="' + o + '"/>' + txt(130, 107, 'Recevoir mon code', 13, '#fff', 'middle') +
    txt(28, 140, 'Code reçu par mail :', 12, '#5d6b78') + '<g font-family="system-ui" font-size="16" font-weight="700" fill="#12304a">' + '482915'.split('').map(function (c, i) { return '<rect x="' + (150 + i * 14) + '" y="126" width="12" height="20" rx="3" fill="#fbe3d8"/><text x="' + (156 + i * 14) + '" y="141" text-anchor="middle" font-size="12">' + c + '</text>'; }).join('') + '</g>');
  if (t === 'notifs') return cadre(130, '<rect x="14" y="20" width="232" height="56" rx="12" fill="#fff" stroke="#d6dee6"/><image href="' + LOGO + '" x="24" y="30" width="36" height="36"/>' + txt(70, 44, 'CLOCA Tennis · Coach Florian', 12, '#12304a') + txt(70, 62, 'Pour Enora : séance en extérieur…', 11.5, '#5d6b78') +
    '<rect x="70" y="90" width="120" height="30" rx="9" fill="' + o + '"/>' + txt(130, 110, 'Autoriser', 13, '#fff', 'middle'));
  return '';
}
function etapesGuide() {
  var E = [], ios = estIos(), andr = estAndroid(), inst = estInstallee();
  E.push({ t: 'Bienvenue dans l\'appli du club 🎾', x: 'En 2 minutes, on t\'explique comment l\'installer sur ton téléphone, te connecter et t\'y retrouver. Tu pourras revoir ce guide à tout moment dans <b>Profil → Aide</b>.', img: '<img src="' + LOGO + '" alt="" style="width:96px;height:96px;border-radius:50%;background:#fff;display:block;margin:6px auto">' });
  if (navInterne() || iosHorsSafari()) E.push({ t: 'Ouvre la page dans ' + (ios ? 'Safari' : 'Chrome'), x: (ios ? 'Sur iPhone, l\'installation ne marche que depuis <b>Safari</b>.' : 'Tu es dans le navigateur d\'une autre appli (Instagram, Facebook…).') + ' Copie le lien ci-dessous, ouvre <b>' + (ios ? 'Safari' : 'Chrome') + '</b> et colle-le dans la barre d\'adresse.' + (navInterne() ? ' Ou touche <b>⋯</b> en haut, puis « Ouvrir dans le navigateur ».' : ''), btn: ['copier', 'Copier le lien de l\'appli'] });
  if (estMobile() && !inst) {
    if (ios) {
      E.push({ t: 'Installer · étape 1 sur 3', x: 'Dans <b>Safari</b>, touche le bouton <b>Partager</b> : le carré avec une flèche vers le haut, en bas de l\'écran (ou en haut à droite sur iPad).', img: maquette('ios-partager') });
      E.push({ t: 'Installer · étape 2 sur 3', x: 'Fais défiler la liste vers le bas et touche <b>« Sur l\'écran d\'accueil »</b>. Si tu ne la vois pas, touche « Modifier les actions » tout en bas pour l\'ajouter.', img: maquette('ios-ecran') });
      E.push({ t: 'Installer · étape 3 sur 3', x: 'Touche <b>« Ajouter »</b> en haut à droite. L\'icône CLOCA Tennis apparaît sur ton écran d\'accueil, comme une vraie appli.', img: maquette('ios-ajouter') });
    } else {
      E.push({ t: 'Installer l\'appli', x: INSTALL ? 'Touche le bouton ci-dessous, puis <b>« Installer »</b>. L\'icône CLOCA Tennis apparaît sur ton écran d\'accueil.' : 'Dans <b>Chrome</b>, touche les <b>3 petits points ⋮</b> en haut à droite, puis <b>« Installer l\'application »</b> (ou « Ajouter à l\'écran d\'accueil »), et confirme.', img: INSTALL ? '' : maquette('android-menu'), btn: INSTALL ? ['installer', 'Installer CLOCA Tennis'] : null });
    }
    E.push({ t: 'Ouvre l\'appli depuis son icône', x: 'Ferme ' + (ios ? 'Safari' : 'le navigateur') + ' et ouvre <b>CLOCA Tennis</b> depuis ton écran d\'accueil. ' + (ios ? 'C\'est indispensable sur iPhone pour recevoir les notifications.' : 'Elle s\'ouvre en plein écran, comme une vraie appli.'), img: maquette('icone') });
  } else if (!estMobile()) E.push({ t: 'Sur ordinateur', x: 'Tu peux utiliser l\'appli directement ici, rien à installer. Pour l\'avoir sur ton téléphone, ouvre <b>clocatennis.fr/app</b> dessus et relance ce guide.' });
  E.push({ t: 'Se connecter', x: 'Va dans <b>Profil</b> et tape <b>l\'adresse mail que tu as donnée au club</b> à l\'inscription. Tu reçois un <b>code à 6 chiffres</b> par mail (pas de mot de passe). Il arrive en moins d\'une minute : regarde aussi dans les <b>spams</b> ou l\'onglet <b>Promotions</b>.', img: maquette('connexion'), btn: S.user ? null : ['connexion', 'Me connecter maintenant'] });
  E.push({ t: 'Activer les notifications', x: 'Cours annulé, message du coach, inscriptions ouvertes : tu es prévenu tout de suite. Une fois connecté, va dans <b>Profil</b> et touche <b>« Activer les notifications »</b>, puis <b>« Autoriser »</b>.' + (ios && !inst ? ' Sur iPhone, ça marche seulement depuis l\'icône installée.' : ''), img: maquette('notifs') });
  E.push({ t: 'Ce que tu trouves dans l\'appli', x: '<div class="stack" style="gap:8px;text-align:left">' + [['home', 'Accueil', 'le prochain rendez-vous, les actus, qui est au club'], ['cal', 'Agenda', 'les cours et séances de toute la famille'], ['bell', 'Messages', 'la cloche 🔔 en haut : les messages du club et des coachs'], ['check', 'Inscriptions', 'stages, CLOC\'ARENA et événements'], ['user', 'Profil', 'ta famille, les notifications et ce guide']].map(function (x) { return '<div style="display:flex;gap:10px;align-items:center">' + ic(x[0], 22, '#b4532a') + '<span class="small"><b>' + x[1] + '</b> : ' + x[2] + '</span></div>'; }).join('') + '</div>' });
  E.push({ t: 'C\'est tout ! 👏', x: 'Une question ? Écris au club depuis <b>Profil</b> ou demande à l\'accueil du club house. Tu retrouves ce guide dans <b>Profil → Aide</b>.' });
  return E;
}
// ---------- Boîte à idées et signalement de bug ----------
var CAT_RETOUR = {
  idee: ['L\'appli', 'Cours et entraînements', 'CLOC\'ARENA', 'Stages et événements', 'Vie du club et club house', 'Autre'],
  bug: ['Connexion ou code', 'Notifications', 'Agenda et cours', 'CLOC\'ARENA', 'Inscriptions', 'Messages', 'Affichage', 'Autre']
};
function ouvrirRetour(type) {
  var c = S.compte || {}, moi = (S.pers || []).filter(function (p) { return p.id === c.personne_id; })[0];
  var pr = moi ? moi.prenom : c.prenom_declare || '', nm = moi ? moi.nom : c.nom_declare || '';
  var bug = type === 'bug';
  modale('<div class="stack" style="gap:12px"><h2 style="margin:0;font-size:21px">' + (bug ? '🐞 Signaler un bug' : '💡 Boîte à idées') + '</h2>' +
    '<span class="mut small">' + (bug ? 'Dis-nous ce qui ne marche pas : où tu étais, ce que tu as touché, ce qui s\'est passé. On corrige au plus vite.' : 'Une envie, une amélioration, une idée pour le club ou pour l\'appli ? Le club lit tout.') + '</span>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label class="f">Prénom<input class="f" id="rt-p" autocomplete="given-name" maxlength="60" value="' + esc(pr) + '"></label><label class="f">Nom<input class="f" id="rt-n" autocomplete="family-name" maxlength="60" value="' + esc(nm) + '"></label></div>' +
    '<label class="f">Catégorie<select class="f" id="rt-c"><option value="">Choisir…</option>' + CAT_RETOUR[type].map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select></label>' +
    '<label class="f">' + (bug ? 'Que s\'est-il passé ?' : 'Ton idée') + '<textarea class="f" id="rt-t" rows="5" maxlength="3000" placeholder="' + (bug ? 'Ex. Quand je touche « Absent à ce cours », rien ne se passe.' : 'Ex. Pouvoir voir la météo du court dans l\'agenda.') + '"></textarea></label>' +
    '<span class="mut xs">Envoyé au club avec ton adresse ' + esc(S.user ? S.user.email : '') + ', pour qu\'on puisse te répondre.</span>' +
    '<button class="btn" id="rt-ok">Envoyer</button></div>', function () {
    $('rt-ok').onclick = function () {
      var p = $('rt-p').value.trim(), n = $('rt-n').value.trim(), cat = $('rt-c').value, t = $('rt-t').value.trim();
      if (!p || !n) return toast('Indique ton prénom et ton nom');
      if (!cat) return toast('Choisis une catégorie');
      if (t.length < 3) return toast(bug ? 'Décris le problème' : 'Écris ton idée');
      $('rt-ok').disabled = true; $('rt-ok').textContent = 'Envoi…';
      var ctx = 'Version ' + VERSION_APPLI + ' · ' + (estInstallee() ? 'appli installée' : 'navigateur') + ' · ' + navigator.userAgent.replace(/\s+/g, ' ').slice(0, 300);
      q(sb.from('retours').insert({ type: type, categorie: cat, texte: t, prenom: p, nom: n.toUpperCase(), email: S.user ? S.user.email : null, contexte: ctx, user_id: S.user.id }).select('id').single()).then(function (r) {
        sb.functions.invoke('retour', { body: { retour_id: r.id } }).catch(function () { });
        fermerModale(); toast(bug ? 'Merci, le bug est signalé 🙏' : 'Merci pour ton idée 💡');
      }).catch(function () { toast('Envoi impossible, réessaie'); $('rt-ok').disabled = false; $('rt-ok').textContent = 'Envoyer'; });
    };
  });
}
function modale(html, lier, fermable) {
  fermerModale();
  var d = document.createElement('div'); d.className = 'modal-f'; d.id = 'modale';
  d.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + (fermable === false ? '' : '<button class="modal-x" id="modal-x" aria-label="Fermer">×</button>') + html + '</div>';
  document.body.appendChild(d); document.body.style.overflow = 'hidden';
  if ($('modal-x')) $('modal-x').onclick = fermerModale;
  if (lier) lier(d);
}
function fermerModale() { var d = $('modale'); if (d) d.remove(); document.body.style.overflow = ''; }
function ouvrirGuide(i) {
  var E = etapesGuide(); i = Math.max(0, Math.min(i || 0, E.length - 1)); var e = E[i];
  localStorageSet('cloca-guide-vu', '1');
  modale('<div class="stack" style="gap:14px;text-align:center"><div class="guide-pts">' + E.map(function (x, k) { return '<span class="' + (k === i ? 'on' : k < i ? 'fait' : '') + '"></span>'; }).join('') + '</div>' +
    '<h2 style="margin:0;font-size:21px">' + e.t + '</h2>' + (e.img || '') + '<div class="small" style="line-height:1.55">' + e.x + '</div>' +
    (e.btn ? '<button class="btn navy" id="g-act">' + e.btn[1] + '</button>' : '') +
    '<div style="display:flex;gap:8px">' + (i ? '<button class="btn line" id="g-prec" style="flex:1">Précédent</button>' : '') + '<button class="btn" id="g-suiv" style="flex:2">' + (i === E.length - 1 ? 'Terminer' : 'Suivant') + '</button></div>' +
    '<span class="mut xs">' + (i + 1) + ' / ' + E.length + '</span></div>', function () {
    if ($('g-prec')) $('g-prec').onclick = function () { ouvrirGuide(i - 1); };
    $('g-suiv').onclick = function () { if (i === E.length - 1) fermerModale(); else ouvrirGuide(i + 1); };
    if ($('g-act')) $('g-act').onclick = function () {
      if (e.btn[0] === 'copier') { var ok = function () { toast('Lien copié : colle-le dans ' + (estIos() ? 'Safari' : 'Chrome')); }; if (navigator.clipboard) navigator.clipboard.writeText(URL_APPLI).then(ok, function () { prompt('Copie ce lien :', URL_APPLI); }); else prompt('Copie ce lien :', URL_APPLI); }
      else if (e.btn[0] === 'installer' && INSTALL) { INSTALL.prompt(); INSTALL.userChoice.then(function (r) { INSTALL = null; if (r.outcome === 'accepted') toast('Appli installée'); ouvrirGuide(i + 1); }); }
      else if (e.btn[0] === 'connexion') { fermerModale(); go('#/profil'); }
    };
  });
}
// Après la connexion : qui es-tu ? Le club peut ainsi rattacher le compte à la bonne famille.
function formIdentite(depuisProfil) {
  var c = S.compte || {};
  return '<div class="stack" style="gap:12px"><h2 style="margin:0;font-size:21px">' + (depuisProfil ? 'Mes informations' : 'Faisons connaissance 👋') + '</h2>' +
    '<span class="mut small">Ton adresse mail ne dit pas toujours qui tu es. Indique ton nom : le club pourra relier ton compte à ta famille et à tes enfants.</span>' +
    '<div class="row2" style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label class="f">Prénom<input class="f" id="id-p" autocomplete="given-name" maxlength="60" value="' + esc(c.prenom_declare) + '"></label><label class="f">Nom<input class="f" id="id-n" autocomplete="family-name" maxlength="60" value="' + esc(c.nom_declare) + '"></label></div>' +
    '<label class="f">Tu es…<select class="f" id="id-q">' + [['', 'Choisir…'], ['parent', 'Parent d\'un ou plusieurs adhérents'], ['adherent', 'Adhérent (je joue au club)'], ['les_deux', 'Les deux'], ['coach', 'Coach du club'], ['autre', 'Autre (bureau, bénévole…)']].map(function (x) { return '<option value="' + x[0] + '"' + (c.qualite_declaree === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></label>' +
    '<label class="f" id="id-el">Prénom et nom de tes enfants inscrits au club<input class="f" id="id-e" maxlength="200" placeholder="Ex. Enora et Mila Martin" value="' + esc(c.enfants_declares) + '"></label>' +
    '<button class="btn" id="id-ok">Enregistrer</button>' + (depuisProfil ? '' : '<button class="btn line" id="id-later">Plus tard</button>') + '</div>';
}
function lierIdentite(apres) {
  var maj = function () { var v = $('id-q').value; $('id-el').style.display = v === 'parent' || v === 'les_deux' || v === '' ? '' : 'none'; };
  $('id-q').onchange = maj; maj();
  if ($('id-later')) $('id-later').onclick = function () { try { sessionStorage.setItem('cloca-identite-plus-tard', '1'); } catch (e) { } fermerModale(); };
  $('id-ok').onclick = function () {
    var p = $('id-p').value.trim(), n = $('id-n').value.trim(); if (!p || !n) return toast('Indique ton prénom et ton nom');
    if (S.apercu) return toast('Aperçu : rien n\'est enregistré');
    $('id-ok').disabled = true;
    q(sb.rpc('declarer_identite', { p_prenom: p, p_nom: n, p_enfants: $('id-e').value.trim() || null, p_qualite: $('id-q').value || null })).then(function () {
      S.compte = Object.assign(S.compte || {}, { prenom_declare: p, nom_declare: n.toUpperCase(), enfants_declares: $('id-e').value.trim() || null, qualite_declaree: $('id-q').value || null, identite_le: new Date().toISOString() });
      toast('Merci ' + p + ' !'); if (apres) apres();
    }).catch(function () { toast('Enregistrement impossible'); $('id-ok').disabled = false; });
  };
}
// Ce qui s'ouvre tout seul, une fois, au bon moment
function guidesAuto() {
  if (S.apercu || $('modale')) return;
  var ss = function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, ssSet = function (k) { try { sessionStorage.setItem(k, '1'); } catch (e) { } };
  var inconnu = S.compte && !S.compte.foyer_id && !S.compte.personne_id && !S.isStaff && !S.roles.length;
  if (S.user && inconnu && !S.compte.identite_le && !ss('cloca-identite-plus-tard')) return modale(formIdentite(false), function () { lierIdentite(fermerModale); }, false);
  if (!S.user && !localStorageGet('cloca-guide-vu')) return modale('<div class="stack" style="gap:14px;text-align:center"><img src="' + LOGO + '" alt="" style="width:84px;height:84px;border-radius:50%;background:#fff;margin:0 auto"><h2 style="margin:0;font-size:22px">Bienvenue dans l\'appli du club !</h2>' +
    '<span class="small">Laisse-toi guider : en 2 minutes, l\'appli est sur ton téléphone et tu es connecté.</span><button class="btn" id="w-go">C\'est parti, guide-moi</button><button class="btn line" id="w-non">Je sais déjà faire</button></div>', function () {
    $('w-go').onclick = function () { ouvrirGuide(0); };
    $('w-non').onclick = function () { localStorageSet('cloca-guide-vu', '1'); fermerModale(); };
  });
  if (!S.user && estInstallee() && !ss('cloca-rappel-cnx')) { ssSet('cloca-rappel-cnx'); return modale('<div class="stack" style="gap:14px;text-align:center"><h2 style="margin:0;font-size:21px">Tu n\'es pas encore connecté</h2><span class="small">Connecte-toi avec l\'adresse mail donnée au club pour voir ton agenda, tes messages et tes inscriptions. Un code arrive par mail, sans mot de passe.</span>' + maquette('connexion') +
    '<button class="btn" id="r-go">Me connecter</button><button class="btn line" id="r-aide">Voir le guide</button></div>', function () { $('r-go').onclick = function () { fermerModale(); go('#/profil'); }; $('r-aide').onclick = function () { ouvrirGuide(0); }; }); }
}
function pageAide() {
  var h = '<div class="pagehead wrap">' + backLink('#/profil', 'Profil') + '<h1 style="font-size:26px">Aide</h1></div><main>' +
    '<section class="card stack" style="gap:10px"><b>Le guide pas à pas</b><span class="mut small">Installer l\'appli, se connecter, activer les notifications : on te montre où appuyer, écran par écran.</span><button class="btn" id="aide-go">Lancer le guide</button></section>';
  var bloc = function (titre, etapes, img) { return '<details class="card"><summary style="cursor:pointer;font-weight:700;list-style:none;display:flex;justify-content:space-between;gap:8px">' + titre + '<span class="mut">▾</span></summary><div class="stack" style="gap:10px;margin-top:12px">' + (img || '') + '<ol class="small" style="margin:0;padding-left:20px;line-height:1.6">' + etapes.map(function (e) { return '<li>' + e + '</li>'; }).join('') + '</ol></div></details>'; };
  h += bloc('Installer sur iPhone', ['Ouvre <b>clocatennis.fr/app</b> dans <b>Safari</b> (pas depuis WhatsApp ou Instagram : copie le lien dans Safari).', 'Touche le bouton <b>Partager</b> (carré avec une flèche), en bas.', 'Choisis <b>« Sur l\'écran d\'accueil »</b>, puis <b>« Ajouter »</b>.', 'Ouvre l\'appli depuis l\'icône <b>CLOCA Tennis</b>.'], maquette('ios-partager'));
  h += bloc('Installer sur Android', ['Ouvre <b>clocatennis.fr/app</b> dans <b>Chrome</b>.', 'Touche les <b>3 points ⋮</b> en haut à droite.', 'Choisis <b>« Installer l\'application »</b> ou <b>« Ajouter à l\'écran d\'accueil »</b>.', 'Ouvre l\'appli depuis l\'icône <b>CLOCA Tennis</b>.'], maquette('android-menu'));
  h += bloc('Se connecter', ['Va dans <b>Profil</b>.', 'Tape l\'adresse mail donnée au club à l\'inscription.', 'Ouvre le mail reçu et tape le <b>code à 6 chiffres</b> dans l\'appli.', 'Pas de mail ? Regarde dans les <b>spams</b> ou <b>Promotions</b>, attends une minute, puis redemande un code.'], maquette('connexion'));
  h += bloc('Activer les notifications', ['Ouvre l\'appli <b>depuis son icône</b> (obligatoire sur iPhone).', 'Va dans <b>Profil</b> → <b>Activer les notifications</b>.', 'Touche <b>« Autoriser »</b>.'], maquette('notifs'));
  h += bloc('Mon adresse n\'est pas reconnue', ['Vérifie que c\'est bien l\'adresse donnée au club à l\'inscription.', 'Remplis <b>Profil → Mes informations</b> (prénom, nom, enfants) : le club reliera ton compte à ta famille.', 'Sinon, demande à l\'accueil du club house.']);
  var faq = accueilCfg().faq;
  if (faq.length) h += '<div class="eyebrow" style="margin-top:6px">Questions fréquentes</div>' + faq.map(function (x) { return '<details class="card"><summary style="cursor:pointer;font-weight:700;list-style:none;display:flex;justify-content:space-between;gap:8px">' + esc(x.q) + '<span class="mut">▾</span></summary><p class="small" style="margin:12px 0 0;line-height:1.6;white-space:pre-line">' + esc(x.r || '') + '</p></details>'; }).join('');
  h += '</main>';
  setTimeout(function () { if ($('aide-go')) $('aide-go').onclick = function () { ouvrirGuide(0); }; });
  return h;
}

// ---------- Espaces par rôle : chacun voit seulement ce qui le concerne ----------
function aRole(r) { return S.roles.some(function (x) { return x.role === r && !x.groupe_id; }); }
function estCoach() { return !!nomCoachCompte() || S.gere.length > 0 || S.isDir; }
function estCordeurSeul() { return aRole('cordeur') || S.isDir; }
function estBureau() { return aRole('bureau') || S.isDir; }
function aDesEspaces() { return !S.apercu && (S.isStaff || estCoach() || estCordeurSeul() || estBureau()); }
function pageEspaces() {
  if (!S.user || !aDesEspaces()) return '<div class="pagehead wrap"><h1>Gestion</h1></div><main><section class="card empty">Espace réservé à l\'équipe du club.</section></main>';
  var carte = function (href, icone, titre, texte, id, ext) {
    return '<a class="card stack" href="' + href + '"' + (ext ? '' : '') + ' style="gap:4px;text-decoration:none;color:inherit;display:flex;flex-direction:row;align-items:center;gap:14px"><span style="width:46px;height:46px;border-radius:14px;background:var(--sun);color:var(--ac);display:flex;align-items:center;justify-content:center;flex:none">' + ic(icone, 24, 'var(--ac)') + '</span><span class="stack" style="gap:2px;flex:1"><b style="font-size:16px">' + titre + '</b><span class="mut small"' + (id ? ' id="' + id + '"' : '') + '>' + texte + '</span></span><span class="mut">›</span></a>';
  };
  var h = '<div class="darkhead"><div class="wrap"><div class="kicker">GESTION' + (S.isDir ? ' · DIRECTION SPORTIVE' : '') + '</div><h1>Mes espaces</h1></div></div><main>';
  if (S.isStaff || estCordeurSeul()) h += carte('gestion/', 'tool', 'Espace gestion', S.isStaff ? 'Tout se gère ici : adhérents, messagerie, événements, CLOC\'ARENA, cordage, annonces, réglages…' : 'Atelier cordage : raquettes à corder, prêtes, paiements, historique', 'esp-ges');
  if (estCoach()) h += carte('#/coach', 'cal', 'Mon espace coach', 'Mes cours du jour, les absents, mes séances et événements', 'esp-coach');
  h += carte('#/profil', 'user', 'Mon profil et déconnexion', esc(S.user.email));
  setTimeout(function () {
    if ($('esp-coach')) { var c = coursDuJour(new Date()); if (c.length) $('esp-coach').innerHTML = '<b style="color:var(--tx)">' + c.length + ' cours aujourd\'hui</b>' + (function () { var n = c.reduce(function (s, x) { return s + absentsDe(x.cr.id, x.iso).length; }, 0); return n ? ' · <b style="color:var(--ko)">' + n + ' absent' + (n > 1 ? 's' : '') + '</b>' : ''; })(); }
    if ($('esp-cord')) chargerCordage().then(function () { var n = C.dem.filter(function (d) { return d.statut === 'attente'; }).length, r = C.dem.filter(function (d) { return d.statut !== 'attente' && !d.paye; }).length; if ($('esp-cord')) $('esp-cord').innerHTML = (n ? '<b style="color:var(--ac)">' + n + ' à corder</b>' : 'Rien à corder') + (r ? ' · ' + r + ' à régler' : ''); }).catch(function () { });
  });
  return h + '</main>';
}
function coursDuJour(j) {
  var nc = nomCoachCompte(), iso = isoJour(j), js = j.getDay() === 0 ? 7 : j.getDay();
  if ((AG && AG.pauses || []).some(function (v) { return iso >= v.debut && iso <= v.fin; })) return [];
  return ((AG && AG.creneaux) || []).filter(function (cr) {
    return cr.jour_semaine === js && (!cr.du || iso >= cr.du) && (!cr.au || iso <= cr.au) && ((nc && encadrePar(cr.encadrant, nc)) || S.gere.indexOf(cr.groupe_id) >= 0);
  }).sort(function (a, b) { return a.heure_debut < b.heure_debut ? -1 : 1; }).map(function (cr) { return { cr: cr, iso: iso }; });
}
function absentsDe(crid, iso) { return ((AG && AG.abs) || []).filter(function (x) { return x.creneau_id === crid && x.jour === iso; }); }
function evtsDuCoach(du, au) {
  var nc = nomCoachCompte(), mesG = {};
  ((AG && AG.creneaux) || []).forEach(function (cr) { if (nc && encadrePar(cr.encadrant, nc)) mesG[cr.groupe_id] = 1; });
  S.gere.forEach(function (g) { mesG[g] = 1; });
  return (S.evts || []).filter(function (e) {
    var d = new Date(e.debut); if (d < du || d >= au || e.statut === 'annule') return false;
    return (nc && encadrePar(e.encadrant, nc)) || evGroupes(e).ids.some(function (g) { return mesG[g]; }) || (S.isDir && /arena/i.test(e.titre));
  }).sort(function (a, b) { return a.debut < b.debut ? -1 : 1; });
}
var CO = { jour: 0, tab: 'jour' };
function pageCoach() {
  var nc = nomCoachCompte();
  var tabs = [['jour', 'Mes cours', 'cal'], ['evts', 'Séances et événements', 'trophy']].concat([['missions', 'Missions', 'check'], ['groupes', 'Mes groupes', 'user']]);
  var h = '<div class="darkhead"><div class="wrap">' + backLink('#/gestion', 'Mes espaces', true) + '<div class="kicker" style="margin-top:8px">ESPACE COACH' + (nc ? ' · ' + esc(nc.toUpperCase()) : '') + '</div><h1>Mon espace coach</h1>' +
    '<div class="cases">' + tabs.map(function (t) { return '<button data-cot="' + t[0] + '" class="' + (CO.tab === t[0] ? 'on' : '') + '">' + ic(t[2], 20) + '<span>' + t[1] + '</span></button>'; }).join('') + '</div></div></div><main id="co-main">';
  if (CO.tab === 'jour') {
    var j = new Date(); j.setHours(12, 0, 0, 0); j.setDate(j.getDate() + CO.jour);
    var c = coursDuJour(j), ev = evtsDuCoach(debutJour(j), new Date(debutJour(j).getTime() + 864e5));
    h += '<div style="display:flex;justify-content:space-between;align-items:center"><button class="back" id="cj-p" style="width:44px;justify-content:center" aria-label="Jour précédent">' + ic('back', 20) + '</button><b>' + (CO.jour === 0 ? 'Aujourd\'hui' : CO.jour === 1 ? 'Demain' : CO.jour === -1 ? 'Hier' : '') + ' ' + esc(fmtJour(j)) + '</b><button class="back" id="cj-n" style="width:44px;justify-content:center;transform:scaleX(-1)" aria-label="Jour suivant">' + ic('back', 20) + '</button></div>';
    if (!c.length && !ev.length) h += '<section class="card empty">' + ((AG && AG.pauses || []).some(function (v) { var i = isoJour(j); return i >= v.debut && i <= v.fin; }) ? 'Pas de cours ce jour-là (vacances).' : 'Aucun cours ni séance ce jour-là.') + '</section>';
    h += c.map(function (x) {
      var ab = absentsDe(x.cr.id, x.iso), cr = x.cr;
      return '<a class="ev" href="#/groupe/' + cr.groupe_id + '"><span class="bar" style="background:var(--navy)"></span><div class="stack" style="flex:1"><div style="display:flex;justify-content:space-between;gap:8px"><b class="t">' + esc(cr.groupes ? String(cr.groupes.nom).replace(/^.*?·\s*/, '') : 'Cours') + '</b>' +
        (ab.length ? '<span class="badge" style="background:var(--ko);color:#fff">' + ab.length + ' absent' + (ab.length > 1 ? 's' : '') + '</span>' : '<span class="badge" style="background:var(--soft);color:var(--mut)">0 absent</span>') + '</div>' +
        '<span class="mut small">' + cr.heure_debut.slice(0, 5).replace(':', 'h') + ' – ' + cr.heure_fin.slice(0, 5).replace(':', 'h') + (cr.lieu ? ' · ' + esc(cr.lieu) : '') + '</span>' +
        (ab.length ? '<span class="small" style="color:var(--ko)">' + esc(ab.map(function (a) { return a.personnes ? a.personnes.prenom + ' ' + a.personnes.nom.charAt(0) + '.' : '?'; }).join(', ')) + '</span>' : '') + '</div></a>';
    }).join('');
    if (ev.length) h += '<div class="dayhead">Séances et événements</div>' + ev.map(carteEvtCoach).join('');
  } else if (CO.tab === 'evts') {
    var du = debutJour(new Date()), au = new Date(du.getTime() + 35 * 864e5), l = evtsDuCoach(du, au);
    h += l.length ? l.map(carteEvtCoach).join('') : '<section class="card empty">Aucune séance ni événement à encadrer dans les 5 prochaines semaines.</section>';
  } else if (CO.tab === 'missions') h += '<div id="missions"><div class="skel"></div></div>';
  else {
    var mesGroupes = [];
    ((AG && AG.creneaux) || []).forEach(function (cr) { if ((nc && encadrePar(cr.encadrant, nc)) || S.gere.indexOf(cr.groupe_id) >= 0) mesGroupes.push(cr); });
    mesGroupes.sort(function (a, b) { return a.jour_semaine - b.jour_semaine || (a.heure_debut < b.heure_debut ? -1 : 1); });
    h += mesGroupes.length ? mesGroupes.map(function (cr) {
      return '<a class="ev" href="#/groupe/' + cr.groupe_id + '"><span class="bar" style="background:var(--navy)"></span><div class="stack" style="flex:1"><b class="t">' + esc(cr.groupes ? String(cr.groupes.nom).replace(/^.*?·\s*/, '') : 'Groupe') + '</b><span class="mut small">' + esc(JOURS[cr.jour_semaine]) + ' ' + cr.heure_debut.slice(0, 5).replace(':', 'h') + ' – ' + cr.heure_fin.slice(0, 5).replace(':', 'h') + (cr.lieu ? ' · ' + esc(cr.lieu) : '') + '</span></div></a>';
    }).join('') : '<section class="card empty">' + (nc ? 'Aucun cours avec ton prénom (' + esc(nc) + ') dans les créneaux.' : 'La direction doit indiquer ton prénom de coach dans l\'Équipe du club.') + '</section>';
  }
  setTimeout(function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cot]'), function (b) { b.onclick = function () { CO.tab = b.dataset.cot; render(); }; });
    if ($('cj-p')) { $('cj-p').onclick = function () { CO.jour--; render(); }; $('cj-n').onclick = function () { CO.jour++; render(); }; }
    if (CO.tab === 'missions') remplirMissions();
    remplirComptesEvt();
  });
  return h + '</main>';
}
// Une séance ou un événement pour le coach : présents / absents / inscrits
function carteEvtCoach(e) {
  var d = new Date(e.debut);
  return '<a class="ev" href="#/evenement/' + e.id + '"><span class="bar" style="background:' + couleurGroupes(evGroupes(e).gs) + '"></span><div class="stack" style="flex:1"><b class="t">' + esc(e.titre) + '</b>' +
    '<span class="mut small">' + esc(fmtCourt(d)) + ' · ' + fmtH(d) + (e.fin ? ' – ' + fmtH(new Date(e.fin)) : '') + (e.lieu ? ' · ' + esc(e.lieu) : '') + '</span>' +
    '<span class="small" data-cevt="' + e.id + '" data-insc="' + (e.inscription_ouverte ? 1 : 0) + '" style="font-weight:600;color:var(--mut)">…</span></div></a>';
}
function remplirComptesEvt() {
  var els = document.querySelectorAll('[data-cevt]'); if (!els.length) return;
  var ids = Array.prototype.map.call(els, function (x) { return x.dataset.cevt; });
  Promise.all([q(sb.from('participations').select('evenement_id, reponse').in('evenement_id', ids)).catch(function () { return []; }),
    q(sb.from('inscriptions').select('evenement_id, statut').in('evenement_id', ids)).catch(function () { return []; })]).then(function (r) {
    Array.prototype.forEach.call(els, function (el) {
      var id = el.dataset.cevt;
      if (el.dataset.insc === '1') { var n = (r[1] || []).filter(function (x) { return x.evenement_id === id && x.statut === 'inscrit'; }).length, at = (r[1] || []).filter(function (x) { return x.evenement_id === id && x.statut === 'attente'; }).length; el.innerHTML = '<span style="color:var(--ok)">' + n + ' inscrit' + (n > 1 ? 's' : '') + '</span>' + (at ? ' · ' + at + ' en attente' : ''); }
      else { var p = (r[0] || []).filter(function (x) { return x.evenement_id === id; }), oui = p.filter(function (x) { return x.reponse === 'oui'; }).length, non = p.filter(function (x) { return x.reponse === 'non'; }).length; el.innerHTML = '<span style="color:var(--ok)">' + oui + ' présent' + (oui > 1 ? 's' : '') + '</span> · <span style="color:var(--ko)">' + non + ' absent' + (non > 1 ? 's' : '') + '</span>'; }
    });
  });
}
// Espace cordeur : suivre les raquettes et les paiements (les prix se règlent dans la gestion, par la direction)
var CDR = { tab: 'attente' };
var MODES_PAI = { especes: 'Espèces', cb: 'Carte', cheque: 'Chèque', virement: 'Virement', autre: 'Autre' };
function pageCordeur() {
  if (!S.user || !estCordeurSeul()) return '<div class="pagehead wrap"><h1>Espace cordeur</h1></div><main><section class="card empty">Réservé aux cordeurs du club.</section></main>';
  var tabs = [['attente', 'À corder'], ['pretes', 'Prêtes'], ['regler', 'À régler'], ['histo', 'Historique']];
  var h = '<div class="darkhead"><div class="wrap">' + backLink('#/gestion', 'Mes espaces', true) + '<div class="kicker" style="margin-top:8px">ESPACE CORDEUR</div><h1>Atelier cordage</h1>' +
    '<div class="cases">' + tabs.map(function (t) { return '<button data-cdt="' + t[0] + '" class="' + (CDR.tab === t[0] ? 'on' : '') + '"><span>' + t[1] + '</span><b data-cdn="' + t[0] + '"></b></button>'; }).join('') + '</div></div></div><main id="cdr-main"><div class="skel"></div></main>';
  setTimeout(function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cdt]'), function (b) { b.onclick = function () { CDR.tab = b.dataset.cdt; render(); }; });
    Promise.all([chargerCordage(), q(sb.from('cordage_demandes').select('*, cordages(nom)').eq('statut', 'recupere').eq('paye', true).order('paye_le', { ascending: false, nullsFirst: false }).limit(60)).catch(function () { return []; })]).then(function (r) { remplirCordeur(r[1] || []); })
      .catch(function () { $('cdr-main').innerHTML = '<section class="card empty">Impossible de charger l\'atelier.</section>'; });
  });
  return h;
}
function remplirCordeur(histo) {
  var box = $('cdr-main'); if (!box) return;
  var L = { attente: C.dem.filter(function (d) { return d.statut === 'attente'; }), pretes: C.dem.filter(function (d) { return d.statut === 'fini'; }), regler: C.dem.filter(function (d) { return d.statut === 'recupere' && !d.paye; }), histo: histo };
  ['attente', 'pretes', 'regler'].forEach(function (k) { var e = document.querySelector('[data-cdn="' + k + '"]'); if (e && L[k].length) e.textContent = L[k].length; });
  var l = L[CDR.tab];
  if (CDR.tab === 'attente') l.sort(function (a, b) { return (a.besoin_avant || '9999') < (b.besoin_avant || '9999') ? -1 : (a.besoin_avant || '9999') > (b.besoin_avant || '9999') ? 1 : (a.created_at < b.created_at ? -1 : 1); });
  var vide = { attente: 'Aucune raquette à corder. 👌', pretes: 'Aucune raquette qui attend d\'être récupérée.', regler: 'Tout est réglé.', histo: 'Aucun paiement enregistré.' };
  var now = debutJour(new Date());
  box.innerHTML = (l.length ? l.map(function (d) {
    var urgent = d.besoin_avant && (new Date(d.besoin_avant + 'T12:00:00') - now) < 3 * 864e5, wa = telWa(d.telephone);
    var info = [d.raquette ? esc(d.raquette) : '', d.fourni_par === 'club' ? 'Cordage club : ' + esc(d.cordages ? d.cordages.nom : '?') : 'Cordage perso : ' + esc(d.cordage_perso || '?'), d.tension ? 'Tension : ' + esc(d.tension) : ''].filter(Boolean).join('<br>');
    var msg = 'Bonjour ! C\'est le club CLOCA Tennis 🎾 La raquette de ' + d.nom.split(' ')[0] + ' est cordée et t\'attend au club house' + (d.prix != null ? ' (' + euros(d.prix) + ')' : '') + '. À bientôt !';
    var act = CDR.tab === 'attente' ? '<button class="btn" data-kfini="' + d.id + '">Raquette prête ✓ (prévenir le joueur)</button>'
      : CDR.tab === 'pretes' ? '<div class="grid2"><button class="btn line" data-krec="' + d.id + '">Récupérée</button><button class="btn navy" data-kpay="' + d.id + '">Récupérée et payée</button></div>' +
        '<div class="grid2">' + (wa ? '<a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/' + wa + '?text=' + encodeURIComponent(msg) + '">WhatsApp</a>' : '<span></span>') + (d.personne_id ? '<button class="btn ghost" data-knotif="' + d.id + '">' + (d.notifie_le ? 'Renvoyer la notif' : 'Envoyer la notif') + '</button>' : '') + '</div>'
      : CDR.tab === 'regler' ? '<button class="btn navy" data-kpay="' + d.id + '">Noter le paiement</button>'
      : '<span class="small" style="color:var(--ok)">Payée' + (d.mode_paiement ? ' en ' + MODES_PAI[d.mode_paiement].toLowerCase() : '') + (d.paye_le ? ' le ' + esc(fmtCourt(new Date(d.paye_le))) : '') + '</span>';
    return '<section class="card stack" style="gap:8px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div class="stack"><b style="font-size:16px">' + esc(d.nom) + '</b><span class="mut xs">Déposée le ' + esc(fmtCourt(new Date(d.created_at))) + (d.fini_le ? ' · prête le ' + esc(fmtCourt(new Date(d.fini_le))) : '') + '</span></div>' + (d.prix != null ? '<b class="disp" style="font-size:22px">' + euros(d.prix) + '</b>' : '') + '</div>' +
      (CDR.tab === 'attente' && d.besoin_avant ? '<span class="badge" style="align-self:flex-start;background:' + (urgent ? 'var(--ko)' : 'var(--soft)') + ';color:' + (urgent ? '#fff' : 'var(--tx)') + '">Avant le ' + esc(fmtCourt(new Date(d.besoin_avant + 'T12:00:00'))) + '</span>' : '') +
      '<span class="small">' + info + '</span>' + (d.note ? '<span class="small" style="background:var(--soft);border-radius:10px;padding:8px 10px">' + esc(d.note) + '</span>' : '') +
      (d.telephone && CDR.tab !== 'histo' ? '<a class="small" href="tel:' + esc(d.telephone.replace(/\s/g, '')) + '" style="font-weight:600">' + esc(d.telephone) + '</a>' : '') + act + '</section>';
  }).join('') : '<section class="card empty">' + vide[CDR.tab] + '</section>') + (CDR.tab === 'histo' ? '' : '<p class="mut xs" style="text-align:center">Les cordages et les prix sont réglés par la direction sportive.</p>');
  var recharger = function () { return chargerCordage().then(render); };
  var notifier = function (id) {
    return sb.functions.invoke('cordage-notifier', { body: { demande_id: id } }).then(function (r) { var x = r.data || {}; toast(r.error || x.erreur ? 'Notification non envoyée' : x.envoyes ? 'Joueur prévenu sur ' + x.envoyes + ' appareil' + (x.envoyes > 1 ? 's' : '') : 'Pas de notif possible : préviens-le par WhatsApp'); }).catch(function () { toast('Notification non envoyée'); });
  };
  Array.prototype.forEach.call(box.querySelectorAll('[data-kfini]'), function (b) { b.onclick = function () {
    b.disabled = true; var id = b.dataset.kfini, d = C.dem.filter(function (x) { return x.id === id; })[0];
    q(sb.from('cordage_demandes').update({ statut: 'fini' }).eq('id', id)).then(function () { return d && d.personne_id ? notifier(id) : toast('Raquette prête : préviens le joueur par WhatsApp'); }).then(function () { CDR.tab = 'pretes'; return recharger(); }).catch(function () { toast('Action impossible'); b.disabled = false; });
  }; });
  Array.prototype.forEach.call(box.querySelectorAll('[data-krec]'), function (b) { b.onclick = function () { q(sb.from('cordage_demandes').update({ statut: 'recupere' }).eq('id', b.dataset.krec)).then(function () { toast('Récupérée : le paiement reste à noter (onglet À régler)'); return recharger(); }); }; });
  Array.prototype.forEach.call(box.querySelectorAll('[data-knotif]'), function (b) { b.onclick = function () { b.disabled = true; notifier(b.dataset.knotif).then(recharger); }; });
  Array.prototype.forEach.call(box.querySelectorAll('[data-kpay]'), function (b) { b.onclick = function () {
    var id = b.dataset.kpay, d = C.dem.filter(function (x) { return x.id === id; })[0];
    modale('<div class="stack" style="gap:12px"><h2 style="margin:0;font-size:20px">Paiement · ' + esc(d.nom) + '</h2>' + (d.prix != null ? '<b class="disp" style="font-size:26px">' + euros(d.prix) + '</b>' : '') +
      '<label class="f">Payé par<div class="chips" id="kp-m">' + Object.keys(MODES_PAI).map(function (k, i) { return '<button class="chip' + (i ? '' : ' on') + '" data-m="' + k + '">' + MODES_PAI[k] + '</button>'; }).join('') + '</div></label>' +
      '<label class="f">Le<input class="f" type="date" id="kp-d" value="' + isoJour(new Date()) + '"></label><button class="btn" id="kp-ok">Enregistrer le paiement</button></div>', function (r) {
      var mode = 'especes';
      Array.prototype.forEach.call(r.querySelectorAll('[data-m]'), function (c) { c.onclick = function () { mode = c.dataset.m; Array.prototype.forEach.call(r.querySelectorAll('[data-m]'), function (x) { x.classList.toggle('on', x === c); }); }; });
      $('kp-ok').onclick = function () {
        $('kp-ok').disabled = true; var j = $('kp-d').value || isoJour(new Date());
        q(sb.from('cordage_demandes').update({ statut: 'recupere', paye: true, mode_paiement: mode, paye_le: new Date(j + 'T' + (j === isoJour(new Date()) ? new Date().toTimeString().slice(0, 8) : '12:00:00')).toISOString() }).eq('id', id))
          .then(function () { fermerModale(); toast('Paiement noté'); return recharger(); }).catch(function () { toast('Action impossible'); $('kp-ok').disabled = false; });
      };
    });
  }; });
}
// Espace bureau : les chiffres clés (à enrichir)
function pageBureau() {
  if (!S.user || !estBureau()) return '<div class="pagehead wrap"><h1>Espace bureau</h1></div><main><section class="card empty">Réservé aux membres du bureau.</section></main>';
  setTimeout(remplirBureau);
  return '<div class="darkhead"><div class="wrap">' + backLink('#/gestion', 'Mes espaces', true) + '<div class="kicker" style="margin-top:8px">ESPACE BUREAU</div><h1>Le club en chiffres</h1></div></div><main id="bur-main"><div class="skel"></div></main>';
}
function remplirBureau() {
  var box = $('bur-main'); if (!box) return;
  var nb = function (p) { return p.then(function (r) { if (r.error) throw r.error; return r.count || 0; }).catch(function () { return null; }); };
  var dans30 = new Date(Date.now() + 30 * 864e5).toISOString();
  Promise.all([
    nb(sb.from('personnes').select('id', { count: 'exact', head: true }).eq('actif', true).eq('demo', false)),
    nb(sb.from('personnes').select('id', { count: 'exact', head: true }).eq('actif', true).eq('demo', false).eq('profil', 'jeune')),
    nb(sb.from('personnes').select('id', { count: 'exact', head: true }).eq('actif', true).eq('demo', false).eq('cotisation_a_jour', false)),
    nb(sb.from('comptes').select('user_id', { count: 'exact', head: true })),
    q(sb.from('boutique_ventes').select('total').eq('paye', false)).catch(function () { return null; }),
    q(sb.from('evenements').select('id, titre, debut, inscription_ouverte, places_max').gte('debut', new Date().toISOString()).lte('debut', dans30).neq('statut', 'annule').order('debut').limit(8)).catch(function () { return []; })
  ]).then(function (r) {
    var k = function (v, l, c) { return '<section class="card stack" style="gap:2px;text-align:center"><b class="disp" style="font-size:30px;color:' + (c || 'var(--tx)') + '">' + (v == null ? '–' : v) + '</b><span class="mut small">' + l + '</span></section>'; };
    var ardoise = r[4] ? r[4].reduce(function (s, x) { return s + (+x.total); }, 0) : null;
    box.innerHTML = '<div class="grid2">' + k(r[0], 'adhérents') + k(r[1], 'jeunes') + k(r[2], 'cotisations pas à jour', 'var(--ko)') + k(r[3], 'comptes dans l\'appli') + k(ardoise == null ? null : euros(ardoise), 'à encaisser (boutique)', 'var(--ac)') + '</div>' +
      '<div class="dayhead">Les 30 prochains jours</div>' + ((r[5] || []).length ? (r[5] || []).map(function (e) { var d = new Date(e.debut); return '<a class="ev" href="#/evenement/' + e.id + '"><span class="bar" style="background:var(--navy)"></span><div class="stack" style="flex:1"><b class="t">' + esc(e.titre) + '</b><span class="mut small">' + esc(fmtCourt(d)) + ' · ' + fmtH(d) + (e.inscription_ouverte ? ' · sur inscription' : '') + '</span></div></a>'; }).join('') : '<section class="card empty">Rien de prévu.</section>') +
      (S.isStaff ? '<a class="btn navy" href="gestion/">' + ic('tool', 18, '#fff') + 'Espace gestion complet</a>' : '');
  });
}

// ---------- Fêtes du club (Noël…) : page publique, présence, invitation, tombola ----------
// Visible par tout le monde, avec ou sans compte. Le téléphone garde un « jeton » pour retrouver sa réponse.
function feteActive() {
  var now = Date.now();
  return (S.fetes || []).filter(function (f) { return f.actif && new Date(f.fin || f.debut).getTime() > now - 2 * 864e5; })[0] || null;
}
function feteImg(u) { return !u ? '' : /^https?:\/\//i.test(u) ? u : u.replace(/^\/?/, ''); }
function feteLien(f) { return location.origin + location.pathname.replace(/[^\/]*$/, '') + '#/fete/' + encodeURIComponent(f.edition); }
function feteJeton(ed) {
  var k = 'cloca-fete-' + ed, j = localStorageGet(k);
  if (!j || !/^[0-9a-f-]{36}$/i.test(j)) {
    j = window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
    localStorageSet(k, j);
  }
  return j;
}
function prixTickets(f, n) { return Math.floor(n / f.carnet_nb) * f.prix_carnet + (n % f.carnet_nb) * f.prix_ticket; }
function nomFamilleDefaut() {
  if (S.pers && S.pers.length) { var n = S.pers[0].nom || ''; return 'Famille ' + n.charAt(0) + n.slice(1).toLowerCase(); }
  if (S.compte && S.compte.nom_declare) return 'Famille ' + S.compte.nom_declare;
  return '';
}

// Carte d'accueil : visible par tous tant que la fête n'est pas passée
// Une fête vise un public (école de tennis, adultes, tout le club) : on ne la montre qu'aux familles concernées.
// Visiteur non connecté ou famille pas encore reconnue : on montre (la page publique sert aussi aux invitations).
function feteConcerne(f) {
  var c = f && f.public_cible || 'tous';
  if (c === 'tous' || !S.user || !S.pers.length || S.isStaff) return true;
  return S.pers.some(function (p) { return c === 'jeunes' ? p.profil === 'jeune' : p.profil !== 'jeune'; });
}
function carteFeteAccueil() {
  var f = feteActive(); if (!f || !feteConcerne(f)) return '';
  var d = new Date(f.debut), fin = f.fin ? new Date(f.fin) : null;
  var rep = localStorageGet('cloca-fete-ok-' + f.edition);
  return '<a class="card fete-carte" href="#/fete/' + esc(f.edition) + '">' +
    (f.affiche_url ? '<img src="' + esc(feteImg(f.affiche_url)) + '" alt="" loading="lazy">' : '') +
    '<div class="stack" style="gap:4px;flex:1;min-width:0"><span class="eyebrow" style="color:var(--ac)">🎄 ' + esc(f.titre) + '</span>' +
    '<b style="font-size:17px;line-height:1.2">' + esc(fmtJour(d)) + '</b><span class="mut small">' + fmtH(d) + (fin ? ' – ' + fmtH(fin) : '') + (f.lieu ? ' · ' + esc(f.lieu) : '') + '</span>' +
    '<span class="badge" style="align-self:flex-start;margin-top:4px;background:' + (rep ? 'var(--ok)' : 'var(--ac)') + ';color:#fff">' + (rep ? 'Ta venue est confirmée ✅' : 'Je confirme ma venue') + '</span></div></a>';
}

function pageFete(ed) {
  var f = (S.fetes || []).filter(function (x) { return x.edition === ed; })[0] || (ed === 'noel' || !ed ? feteActive() : null);
  if (!f) return '<div class="pagehead">' + backLink('#/accueil', 'Accueil') + '</div><main><section class="card empty">Cette fête n\'est plus en ligne.</section></main>';
  var d = new Date(f.debut), fin = f.fin ? new Date(f.fin) : null, passe = new Date(f.fin || f.debut) < new Date();
  var h = '<div class="darkhead fete-head"><div class="wrap">' + backLink('#/accueil', 'Accueil', true) +
    '<div class="kicker" style="margin-top:6px">🎄 Pour toute la famille</div><h1>' + esc(f.titre) + '</h1>' + (f.sous_titre ? '<div style="color:#c9d6e2;margin-top:4px">' + esc(f.sous_titre) + '</div>' : '') + '</div></div><main class="wrap">';
  if (f.affiche_url) h += '<button class="fete-affiche" id="fete-zoom" aria-label="Agrandir l\'affiche"><img src="' + esc(feteImg(f.affiche_url)) + '" alt="Affiche : ' + esc(f.titre) + ', ' + esc(fmtJour(d)) + '"></button>';
  h += '<section class="card stack" style="gap:10px"><div class="rdv"><div class="datebox"><span>' + esc(d.toLocaleDateString('fr-FR', { month: 'short' })) + '</span><b>' + d.getDate() + '</b></div>' +
    '<div class="stack"><span class="disp" style="font-size:22px;line-height:1.1">' + esc(fmtJour(d)) + '</span><span class="mut small">' + fmtH(d) + (fin ? ' – ' + fmtH(fin) : '') + '</span>' +
    (f.lieu ? '<span class="mut small">' + ic('pin', 14) + ' ' + esc(f.lieu) + '</span>' : '') + '</div></div>' +
    (f.public_vise ? '<span class="small">' + ic('people', 16) + ' ' + esc(f.public_vise) + '</span>' : '') +
    '<span class="small">🎁 <b>Gratuit</b> (hors espace goûter)</span><span class="mut small" id="fete-nb"></span></section>' +
    '<div id="fete-main"><section class="card"><div class="skel"></div></section></div></main>';
  setTimeout(function () { chargerFete(f, passe); });
  return h;
}

function chargerFete(f, passe) {
  var jeton = feteJeton(f.edition);
  Promise.all([
    q(sb.rpc('fete_ma_reponse', { p_edition: f.edition, p_jeton: jeton })).catch(function () { return {}; }),
    q(sb.from('tombola_lots').select('*').eq('edition', f.edition).order('rang')).catch(function () { return []; })
  ]).then(function (r) {
    if (!$('fete-main')) return;
    var R = r[0] || {}, lots = r[1] || [], P = R.participation, T = R.tickets || [];
    if (P && P.jeton && P.jeton !== jeton) localStorageSet('cloca-fete-' + f.edition, P.jeton); // compte connecté sur un autre appareil
    if (P && !P.annule) localStorageSet('cloca-fete-ok-' + f.edition, '1'); else localStorageSet('cloca-fete-ok-' + f.edition, '');
    if (R.familles && $('fete-nb')) $('fete-nb').textContent = '🎄 ' + R.familles + ' famille' + (R.familles > 1 ? 's ont déjà confirmé leur venue' : ' a déjà confirmé sa venue');
    var h = '';
    if (!passe) h += blocPresence(f, P);
    h += blocInviter(f);
    if (f.tombola_ouverte || lots.length || T.length) h += blocTombola(f, lots, T, P, passe);
    $('fete-main').innerHTML = h;
    lierFete(f, P);
  });
  if ($('fete-zoom')) $('fete-zoom').onclick = function () { modale('<img src="' + esc(feteImg(f.affiche_url)) + '" alt="Affiche" style="width:100%;border-radius:12px;display:block">'); };
}

function blocPresence(f, P) {
  if (P && !P.annule && !S.feteEdit) {
    return '<section class="card stack fete-ok" style="gap:10px"><b style="font-size:18px">C\'est noté, à bientôt ! 🎉</b>' +
      '<span class="small"><b>' + esc(P.nom) + '</b> · ' + (P.groupe === 'plus5' ? '5 personnes ou plus' : 'moins de 5 personnes') + (P.avec_invites ? ' · avec des invités' : '') + '</span>' +
      (P.photos ? '<span class="small">📸 Le lien des photos sera envoyé à ' + esc(P.email_photos) + '</span>' : '') +
      '<div class="grid2"><button class="btn line" id="fete-modif">Modifier</button><button class="btn line" id="fete-annul">On ne vient plus</button></div></section>';
  }
  if (!f.inscription_ouverte) return '<section class="card empty">Les confirmations sont fermées. Tu peux quand même venir : tout le monde est le bienvenu !</section>';
  var F = S.feteForm = S.feteForm || (P ? { nom: P.nom, contact: P.contact || '', groupe: P.groupe, invites: P.avec_invites, photos: P.photos, email: P.email_photos || '' } :
    { nom: nomFamilleDefaut(), contact: '', groupe: '', invites: false, photos: false, email: S.user ? S.user.email : '' });
  return '<section class="card stack" style="gap:14px" id="fete-form"><div class="stack" style="gap:4px"><b style="font-size:18px">Tu viens ?</b>' +
    '<span class="mut small">Ça nous aide à prévoir les jeux, l\'animation et le goûter. Pas besoin du nombre exact, une idée suffit.</span></div>' +
    '<label class="f">Nom de la famille<input class="f" id="ff-nom" maxlength="80" placeholder="Ex. Famille Martin" value="' + esc(F.nom) + '" autocomplete="family-name"></label>' +
    '<div class="stack" style="gap:8px"><span style="font-size:13px;font-weight:600">Vous serez combien, à peu près ?</span>' +
    '<button class="pick' + (F.groupe === 'moins5' ? ' on' : '') + '" data-fg="moins5">👨‍👩‍👧 Moins de 5 personnes</button>' +
    '<button class="pick' + (F.groupe === 'plus5' ? ' on' : '') + '" data-fg="plus5">👨‍👩‍👧‍👦👫 5 personnes ou plus</button></div>' +
    '<label class="check"><input type="checkbox" id="ff-inv"' + (F.invites ? ' checked' : '') + '><span><b>On vient avec des invités</b><br><span class="mut">Un copain, un cousin, des amis : tout le monde est le bienvenu, même s\'il n\'est pas au club !</span></span></label>' +
    (S.user ? '' : '<label class="f">Téléphone ou mail <span class="mut" style="font-weight:400">(facultatif, pour te prévenir en cas de changement)</span><input class="f" id="ff-contact" maxlength="120" value="' + esc(F.contact) + '"></label>') +
    '<label class="check"><input type="checkbox" id="ff-photos"' + (F.photos ? ' checked' : '') + '><span><b>Je veux recevoir le lien des photos</b><br><span class="mut">Le club t\'envoie le lien de l\'album après la fête.</span></span></label>' +
    '<label class="f" id="ff-mail-l"' + (F.photos ? '' : ' hidden') + '>Mail pour les photos<input class="f" id="ff-mail" type="email" maxlength="120" value="' + esc(F.email) + '" autocomplete="email"></label>' +
    '<button class="btn" id="ff-ok">Oui, on vient ! 🎄</button>' + (P ? '<button class="btn ghost" id="ff-stop">Annuler la modification</button>' : '') + '</section>';
}

function blocInviter(f) {
  var img = feteImg(f.flyer_url || f.affiche_url);
  return '<section class="card stack" style="gap:10px"><b style="font-size:18px">Invite tes amis 💌</b>' +
    '<span class="mut small">Envoie l\'invitation à tes copains, ta famille, tes voisins : ils reçoivent l\'image avec toutes les infos, sans passer par l\'appli.</span>' +
    '<button class="btn navy" id="fete-share">' + ic('people', 20, '#fff') + 'Envoyer l\'invitation</button>' +
    '<div class="grid2">' + (img ? '<a class="btn ghost" href="' + esc(img) + '" download="Invitation-' + esc(f.edition) + '.jpg">' + ic('dl', 18) + 'Le flyer</a>' : '') +
    '<button class="btn ghost" id="fete-copy">Copier le message</button></div><span class="mut xs">Tes invités n\'ont rien à faire : coche simplement « On vient avec des invités » dans ta réponse.</span></section>';
}

function blocTombola(f, lots, T, P, passe) {
  var h = '<section class="card stack" style="gap:12px" id="fete-tombola"><div class="stack" style="gap:4px"><b style="font-size:18px">🎟️ Tombola</b>' +
    '<span class="small"><b>' + euros(f.prix_ticket) + ' le ticket</b> · <b>' + f.carnet_nb + ' tickets pour ' + euros(f.prix_carnet) + '</b></span>' +
    '<span class="mut small">Tirage pendant la fête. 100 % tennis !</span></div>';
  h += '<div class="stack" style="gap:6px"><span class="eyebrow">Les lots</span>' + (lots.length ? lots.map(function (l, i) {
    var gagne = f.tirage_publie && l.gagnant_nom;
    return '<div class="lot">' + (l.photo_url ? '<button class="lot-ph" data-lotimg="' + esc(l.photo_url) + '" aria-label="Voir la photo du lot"><img src="' + esc(l.photo_url) + '" alt=""></button>' : '<span class="lot-n">' + (i + 1) + '</span>') + '<div class="stack" style="flex:1;min-width:0"><b>' + esc(l.nom) + '</b>' + (l.detail ? '<span class="mut small">' + esc(l.detail) + '</span>' : '') +
      (gagne ? '<span class="small" style="color:var(--ok);font-weight:700">🎉 Gagnant : ' + esc(l.gagnant_nom) + '</span>' : '') + '</div></div>';
  }).join('') : '<span class="mut small">Les lots seront dévoilés très bientôt 🎁</span>') + '</div>';
  if (T.length) {
    h += '<div class="stack" style="gap:6px"><span class="eyebrow">Mes tickets</span>' + T.map(function (t) {
      var paye = t.statut === 'paye';
      return '<div class="lot" style="align-items:flex-start"><span class="lot-n" style="background:' + (paye ? 'var(--ok)' : 'var(--ac)') + '">' + t.nb + '</span><div class="stack" style="flex:1;min-width:0"><b>' + t.nb + ' ticket' + (t.nb > 1 ? 's' : '') + ' · ' + euros(t.montant) + '</b>' +
        (paye ? '<span class="small" style="color:var(--ok)">Payé ✅ · tes tickets papier t\'ont été remis</span>' : '<span class="small" style="color:var(--ac)">Réservé · à régler au club house ou le jour de la fête</span>') + '</div>' +
        (!paye ? '<button class="chip" data-tkx="' + t.id + '">Annuler</button>' : '') + '</div>';
    }).join('') + '</div>';
  }
  if (f.tombola_ouverte && !passe) {
    var n = S.feteNb || 1;
    h += '<div class="stack" style="gap:10px;border-top:1px solid var(--line);padding-top:12px"><b>Réserver des tickets</b>' +
      '<div class="stepper"><button class="btn ghost" id="tk-moins" aria-label="Un ticket de moins">−</button><div class="stack" style="align-items:center;flex:1"><b class="disp" style="font-size:30px;line-height:1" id="tk-n">' + n + '</b><span class="mut small" id="tk-p">' + euros(prixTickets(f, n)) + '</span></div><button class="btn ghost" id="tk-plus" aria-label="Un ticket de plus">+</button></div>' +
      '<div class="chips" style="flex-wrap:wrap">' + [1, f.carnet_nb, f.carnet_nb * 2].map(function (x) { return '<button class="chip" data-tkn="' + x + '">' + x + ' ticket' + (x > 1 ? 's' : '') + ' · ' + euros(prixTickets(f, x)) + '</button>'; }).join('') + '</div>' +
      '<label class="f">Au nom de<input class="f" id="tk-nom" maxlength="80" value="' + esc((P && P.nom) || nomFamilleDefaut()) + '"></label>' +
      (S.user ? '' : '<label class="f">Téléphone <span class="mut" style="font-weight:400">(facultatif)</span><input class="f" id="tk-contact" maxlength="120" value="' + esc((P && P.contact) || '') + '"></label>') +
      '<button class="btn" id="tk-ok">Réserver mes tickets</button>' +
      '<span class="mut xs">Paiement au club house ou le jour de la fête : on te remet alors tes tickets papier, avec ton nom noté sur chaque talon pour le tirage.</span></div>';
  }
  return h + '</section>';
}

function erreurFete(e) {
  var m = String((e && e.message) || '');
  if (/nom manquant/.test(m)) return 'Indique le nom de la famille';
  if (/mail manquant/.test(m)) return 'Indique un mail pour recevoir les photos';
  if (/fermée|fermées/.test(m)) return 'Les réservations sont fermées';
  if (/trop de réservations/.test(m)) return 'Règle d\'abord tes tickets déjà réservés';
  return 'Envoi impossible, réessaie dans un instant';
}

function lierFete(f, P) {
  var jeton = feteJeton(f.edition), re = function () { chargerFete(f, false); };
  var F = S.feteForm;
  if ($('fete-modif')) $('fete-modif').onclick = function () { S.feteEdit = true; S.feteForm = null; re(); };
  if ($('fete-annul')) $('fete-annul').onclick = function () {
    if (!confirm('Tu ne viens plus à la fête ?')) return;
    q(sb.rpc('fete_annuler', { p_edition: f.edition, p_jeton: jeton })).then(function () { localStorageSet('cloca-fete-ok-' + f.edition, ''); toast('C\'est noté, dommage !'); re(); }).catch(function () { toast('Action impossible'); });
  };
  if ($('ff-stop')) $('ff-stop').onclick = function () { S.feteEdit = false; S.feteForm = null; re(); };
  Array.prototype.forEach.call(document.querySelectorAll('[data-fg]'), function (b) {
    b.onclick = function () { F.groupe = b.dataset.fg; Array.prototype.forEach.call(document.querySelectorAll('[data-fg]'), function (x) { x.classList.toggle('on', x === b); }); };
  });
  if ($('ff-photos')) $('ff-photos').onchange = function () { $('ff-mail-l').hidden = !this.checked; };
  if ($('ff-ok')) $('ff-ok').onclick = function () {
    F.nom = $('ff-nom').value.trim(); F.invites = $('ff-inv').checked; F.photos = $('ff-photos').checked; F.email = $('ff-mail').value.trim();
    if ($('ff-contact')) F.contact = $('ff-contact').value.trim();
    if (!F.nom) { toast('Indique le nom de la famille'); $('ff-nom').focus(); return; }
    if (!F.groupe) { toast('Choisis : moins de 5 ou 5 personnes et plus'); return; }
    if (F.photos && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(F.email)) { toast('Indique un mail valide pour les photos'); $('ff-mail').focus(); return; }
    var b = this; b.disabled = true;
    q(sb.rpc('fete_repondre', { p_edition: f.edition, p_nom: F.nom, p_contact: F.contact || null, p_groupe: F.groupe, p_invites: F.invites, p_photos: F.photos, p_email: F.photos ? F.email : null, p_jeton: jeton })).then(function (r) {
      if (r && r.jeton && r.jeton !== jeton) localStorageSet('cloca-fete-' + f.edition, r.jeton);
      if (r && r.nouveau) sb.functions.invoke('fete-notifier', { body: { type: 'presence', id: r.id } }).catch(function () { });
      localStorageSet('cloca-fete-ok-' + f.edition, '1');
      S.feteEdit = false; S.feteForm = null;
      toast(r && r.nouveau ? 'Merci, ta venue est confirmée 🎄' : 'Réponse mise à jour');
      re();
    }).catch(function (e) { b.disabled = false; toast(erreurFete(e)); });
  };
  // Invitation : partage natif (avec l'image si possible), sinon WhatsApp
  var lien = feteLien(f), d = new Date(f.debut);
  var texte = '🎄 ' + f.titre + ' du club CLOCA Tennis ! ' + fmtJour(d) + ', ' + fmtH(d) + (f.fin ? '-' + fmtH(new Date(f.fin)) : '') + ' au club CLOCA Tennis à Achères. Gratuit (hors goûter), pour les enfants et leurs familles. Viens avec nous ! 🎾';
  if ($('fete-share')) $('fete-share').onclick = function () {
    var img = feteImg(f.flyer_url || f.affiche_url);
    var simple = function () {
      if (navigator.share) return navigator.share({ title: f.titre, text: texte }).catch(function () { });
      window.open('https://wa.me/?text=' + encodeURIComponent(texte), '_blank', 'noopener');
    };
    if (!img || !navigator.canShare || !window.fetch || !window.File) return simple();
    fetch(img).then(function (r) { return r.blob(); }).then(function (bl) {
      var fi = new File([bl], 'Invitation-' + f.edition + '.jpg', { type: bl.type || 'image/jpeg' });
      if (navigator.canShare({ files: [fi] })) return navigator.share({ files: [fi], title: f.titre, text: texte });
      return simple();
    }).catch(function (e) { if (!e || e.name !== 'AbortError') simple(); });
  };
  if ($('fete-copy')) $('fete-copy').onclick = function () {
    var ok = function () { toast('Message copié : colle-le dans WhatsApp ou un SMS'); };
    if (navigator.clipboard) navigator.clipboard.writeText(texte).then(ok).catch(function () { prompt('Copie ce message :', texte); });
    else prompt('Copie ce message :', texte);
  };
  Array.prototype.forEach.call(document.querySelectorAll('[data-lotimg]'), function (x) { x.onclick = function () { modale('<img src="' + esc(x.dataset.lotimg) + '" alt="Photo du lot" style="width:100%;border-radius:12px;display:block">'); }; });
  // Tombola
  var n = S.feteNb || 1, maj = function () { if ($('tk-n')) { $('tk-n').textContent = n; $('tk-p').textContent = euros(prixTickets(f, n)); } S.feteNb = n; };
  if ($('tk-moins')) $('tk-moins').onclick = function () { n = Math.max(1, n - 1); maj(); };
  if ($('tk-plus')) $('tk-plus').onclick = function () { n = Math.min(30, n + 1); maj(); };
  Array.prototype.forEach.call(document.querySelectorAll('[data-tkn]'), function (b) { b.onclick = function () { n = +b.dataset.tkn; maj(); }; });
  if ($('tk-ok')) $('tk-ok').onclick = function () {
    var nom = $('tk-nom').value.trim(), b = this;
    if (!nom) { toast('Indique un nom'); $('tk-nom').focus(); return; }
    if (!confirm('Réserver ' + n + ' ticket' + (n > 1 ? 's' : '') + ' pour ' + euros(prixTickets(f, n)) + ' ?\nÀ régler au club house ou le jour de la fête.')) return;
    b.disabled = true;
    q(sb.rpc('tombola_reserver', { p_edition: f.edition, p_nom: nom, p_contact: $('tk-contact') ? $('tk-contact').value.trim() || null : null, p_nb: n, p_jeton: jeton })).then(function (r) {
      sb.functions.invoke('fete-notifier', { body: { type: 'tombola', id: r.id } }).catch(function () { });
      S.feteNb = 1; toast('Tickets réservés 🎟️'); re();
    }).catch(function (e) { b.disabled = false; toast(erreurFete(e)); });
  };
  Array.prototype.forEach.call(document.querySelectorAll('[data-tkx]'), function (b) {
    b.onclick = function () {
      if (!confirm('Annuler cette réservation ?')) return;
      q(sb.rpc('tombola_annuler', { p_id: b.dataset.tkx, p_jeton: jeton })).then(function () { toast('Réservation annulée'); re(); }).catch(function () { toast('Action impossible'); });
    };
  });
}

// ---------- Questionnaires (créés par la direction, remplis par la famille pour l'enfant concerné) ----------
function chargerQuestionnaires() {
  if (!S.user || !S.pers.length) return Promise.resolve(S.qst = []);
  return q(sb.rpc('mes_questionnaires')).then(function (r) { S.qst = r || []; }).catch(function () { S.qst = []; });
}
function carteQuestionnairesAccueil() {
  var aFaire = (S.qst || []).filter(function (x) { return !x.repondu; });
  if (!aFaire.length) return '';
  var ids = aFaire.map(function (x) { return x.questionnaire_id; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
  var qui = aFaire.map(function (x) { var p = S.pers.filter(function (y) { return y.id === x.personne_id; })[0]; return p ? p.prenom : null; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; });
  return '<a class="card stack" href="#/questionnaire/' + ids[0] + '" style="gap:4px;text-decoration:none;color:inherit;border-left:4px solid var(--ac)"><span class="eyebrow">' + (ids.length > 1 ? ids.length + ' questionnaires à remplir' : 'Questionnaire à remplir') + '</span><b id="qst-acc-t">Réponds en 1 minute</b>' + (qui.length ? '<span class="mut small">Pour ' + esc(qui.join(', ')) + '</span>' : '') + '</a>';
}
function pageQuestionnaire(id) {
  var h = '<div class="pagehead">' + backLink('#/accueil', 'Accueil') + '<h1 id="qa-t">Questionnaire</h1></div><main><div id="qa"><section class="card"><div class="skel"></div></section></div></main>';
  setTimeout(function () { chargerQuestionnaire(id); });
  return h;
}
function chargerQuestionnaire(id, choix) {
  if (!S.user) { $('qa').innerHTML = '<section class="card stack"><b>Connecte-toi pour répondre</b><a class="btn" href="#/profil">Me connecter</a></section>'; return; }
  var miens = (S.qst || []).filter(function (x) { return x.questionnaire_id === id; });
  Promise.all([q(sb.from('questionnaires').select('*').eq('id', id).maybeSingle()), q(sb.from('questionnaire_questions').select('*').eq('questionnaire_id', id).order('ordre')),
    miens.length ? q(sb.from('questionnaire_reponses').select('*').eq('questionnaire_id', id).in('personne_id', miens.map(function (x) { return x.personne_id; }))) : Promise.resolve([])]).then(function (r) {
    var Q = r[0], QQ = r[1] || [], REP = r[2] || [];
    if (!Q || !miens.length) { $('qa').innerHTML = '<section class="card empty">Ce questionnaire n\'est plus ouvert, ou il ne concerne personne de ta famille.</section>'; return; }
    $('qa-t').textContent = Q.titre;
    var pid = choix && miens.some(function (x) { return x.personne_id === choix; }) ? choix : (miens.filter(function (x) { return !REP.some(function (y) { return y.personne_id === x.personne_id; }); })[0] || miens[0]).personne_id;
    var rep = REP.filter(function (y) { return y.personne_id === pid; })[0], V = rep ? rep.reponses || {} : {};
    var lecture = rep && !Q.modifiable;
    var nomP = function (x) { var p = S.pers.filter(function (y) { return y.id === x; })[0]; return p ? p.prenom : ''; };
    var champ = function (qu) {
      var v = V[qu.id], n = 'qa-' + qu.id, dis = lecture ? ' disabled' : '';
      var titre = esc(qu.libelle) + (qu.obligatoire ? ' <span style="color:var(--ac)">*</span>' : '');
      if (qu.type === 'oui_non' || qu.type === 'choix' || qu.type === 'taille' || qu.type === 'multi') {
        var opts = qu.type === 'oui_non' ? ['Oui', 'Non'] : (qu.options || []);
        var sel = qu.type === 'oui_non' ? (v === true ? ['Oui'] : v === false ? ['Non'] : []) : Array.isArray(v) ? v : v ? [v] : [];
        var multi = qu.type === 'multi';
        return '<div class="stack" style="gap:8px" data-q="' + qu.id + '"><b class="small">' + titre + '</b>' + (multi ? '<span class="mut xs">Plusieurs réponses possibles</span>' : '') + '<div style="display:flex;flex-wrap:wrap;gap:8px">' + opts.map(function (o) {
          var on = sel.indexOf(o) >= 0;
          return '<label class="chip' + (on ? ' on' : '') + '" style="display:inline-flex;align-items:center;cursor:pointer"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + n + '" value="' + esc(o) + '"' + (on ? ' checked' : '') + dis + ' style="display:none">' + esc(o) + '</label>';
        }).join('') + '</div></div>';
      }
      if (qu.type === 'texte_long') return '<label class="f" data-q="' + qu.id + '"><span>' + titre + '</span><textarea class="f" name="' + n + '" rows="3" maxlength="2000"' + dis + '>' + esc(v || '') + '</textarea></label>';
      var t = qu.type === 'nombre' ? 'number' : qu.type === 'date' ? 'date' : 'text';
      return '<label class="f" data-q="' + qu.id + '"><span>' + titre + '</span><input class="f" type="' + t + '" name="' + n + '" maxlength="300" value="' + esc(v == null ? '' : v) + '"' + dis + '></label>';
    };
    $('qa').innerHTML = (miens.length > 1 ? '<div class="chips" style="margin-bottom:12px">' + miens.map(function (x) { var fait = REP.some(function (y) { return y.personne_id === x.personne_id; }); return '<button class="chip' + (x.personne_id === pid ? ' on' : '') + '" data-qap="' + x.personne_id + '">' + esc(nomP(x.personne_id)) + (fait ? ' ✓' : '') + '</button>'; }).join('') + '</div>' : '') +
      '<section class="card stack" style="gap:16px">' + (Q.intro ? '<p class="small" style="margin:0;white-space:pre-line">' + esc(Q.intro) + '</p>' : '') +
      '<span class="eyebrow">Pour ' + esc(nomP(pid)) + (Q.date_limite ? ' · avant le ' + esc(new Date(Q.date_limite + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })) : '') + '</span>' +
      (rep ? '<div class="small" style="color:var(--ok, #2e7d32)">✓ Réponse envoyée le ' + esc(new Date(rep.maj_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })) + (Q.modifiable ? '. Tu peux la modifier.' : '.') + '</div>' : '') +
      QQ.map(champ).join('') +
      (lecture ? '' : '<button class="btn" id="qa-ok">' + (rep ? 'Mettre à jour ma réponse' : 'Envoyer ma réponse') + '</button>') + '</section>';
    Array.prototype.forEach.call(document.querySelectorAll('[data-qap]'), function (b) { b.onclick = function () { chargerQuestionnaire(id, b.dataset.qap); }; });
    Array.prototype.forEach.call(document.querySelectorAll('#qa label.chip input'), function (i) {
      i.onchange = function () { Array.prototype.forEach.call(document.querySelectorAll('#qa input[name="' + i.name + '"]'), function (x) { x.parentNode.classList.toggle('on', x.checked); }); };
    });
    if (!$('qa-ok')) return;
    $('qa-ok').onclick = function () {
      var out = {}, manque = null;
      QQ.forEach(function (qu) {
        var n = 'qa-' + qu.id, v;
        if (['oui_non', 'choix', 'taille', 'multi'].indexOf(qu.type) >= 0) {
          var c = Array.prototype.map.call(document.querySelectorAll('#qa input[name="' + n + '"]:checked'), function (x) { return x.value; });
          v = qu.type === 'multi' ? c : qu.type === 'oui_non' ? (c[0] === 'Oui' ? true : c[0] === 'Non' ? false : null) : (c[0] || null);
        } else {
          var el = document.querySelector('#qa [name="' + n + '"]'); v = el ? el.value.trim() : '';
          if (qu.type === 'nombre' && v !== '') v = +v;
        }
        var vide = v == null || v === '' || (Array.isArray(v) && !v.length);
        if (vide && qu.obligatoire && !manque) manque = qu;
        if (!vide) out[qu.id] = v;
      });
      if (manque) { toast('Réponds à : ' + manque.libelle); var z = document.querySelector('[data-q="' + manque.id + '"]'); if (z) z.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      $('qa-ok').disabled = true;
      q(sb.from('questionnaire_reponses').upsert({ questionnaire_id: id, personne_id: pid, reponses: out }, { onConflict: 'questionnaire_id,personne_id' })).then(function () {
        toast('Merci, réponse enregistrée');
        (S.qst || []).forEach(function (x) { if (x.questionnaire_id === id && x.personne_id === pid) x.repondu = true; });
        var suivant = miens.filter(function (x) { return x.personne_id !== pid && !x.repondu; })[0];
        chargerQuestionnaire(id, suivant ? suivant.personne_id : pid);
      }).catch(function (e) { $('qa-ok').disabled = false; toast(e && /row-level|policy/i.test(e.message || '') ? 'Ce questionnaire est fermé' : 'Envoi impossible pour le moment'); });
    };
  }).catch(function () { $('qa').innerHTML = '<section class="card empty">Impossible de charger le questionnaire.</section>'; });
}

// ---------- Routeur ----------
// ---------- Discussions : un fil par groupe (remplace les groupes WhatsApp) ----------
// Les droits (qui lit, qui écrit) sont appliqués par la base. Un fil « en test » n'est visible que par la direction.
var DISC = { id: null, msgs: [], canal: null, tout: false, luT: null };
function chargerDiscussions() {
  S.discs = [];
  if (!S.user || S.apercu) return Promise.resolve();
  return q(sb.rpc('mes_discussions')).then(function (l) { S.discs = l || []; }).catch(function () { S.discs = []; });
}
function discNonLus() { return (S.discs || []).reduce(function (s, d) { return s + (d.muet ? 0 : d.non_lus || 0); }, 0); }
function discCouleur(t) { var h = 0; String(t || '').split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) % 360; }); return 'hsl(' + h + ',45%,42%)'; }
function discAvatar(d, taille) {
  var t = taille || 44, txt = d.type === 'annonce' ? '📣' : esc(String(d.nom).replace(/^[^A-Za-zÀ-ÿ0-9]+/, '').charAt(0).toUpperCase());
  return '<span style="width:' + t + 'px;height:' + t + 'px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:' + Math.round(t * 0.42) + 'px;color:#fff;background:' + (d.type === 'annonce' ? 'var(--ac)' : d.couleur || discCouleur(d.nom)) + '">' + txt + '</span>';
}
function discQuand(d) {
  var j = new Date(d), n = new Date();
  if (isoJour(j) === isoJour(n)) return fmtH(j);
  var hier = new Date(); hier.setDate(hier.getDate() - 1);
  if (isoJour(j) === isoJour(hier)) return 'Hier';
  return (n - j) < 6 * 864e5 ? j.toLocaleDateString('fr-FR', { weekday: 'short' }) : fmtCourt(j);
}
function discTexte(t) {
  return esc(t).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, '<a href="$1" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">$1</a>');
}
function tuileDiscussions() {
  var l = S.discs || [];
  if (!l.length) return '';
  var n = discNonLus(), test = l.every(function (d) { return !d.ouvert; });
  return '<a class="tile tile-top" href="#/discussions" aria-label="Discussions' + (n ? ', ' + n + ' message' + (n > 1 ? 's' : '') + ' non lu' + (n > 1 ? 's' : '') : '') + '"><span style="display:flex;align-items:center;gap:8px">' + ic('chat', 18) + '<span class="xs mut" style="text-transform:uppercase;letter-spacing:.6px;font-weight:600">Discussions' + (test ? ' · test' : '') + '</span></span>' +
    '<b style="font-size:19px">' + (n ? n + ' non lu' + (n > 1 ? 's' : '') : 'Mes groupes') + '</b><span class="mut small">' + l.length + ' fil' + (l.length > 1 ? 's' : '') + '</span>' +
    (n ? '<span class="bulle" aria-hidden="true">' + (n > 99 ? '99+' : n) + '</span>' : '') + '</a>';
}
function carteDiscussionsAccueil() {
  var l = S.discs || [];
  if (!l.length) return '';
  var n = discNonLus(), test = l.every(function (d) { return !d.ouvert; });
  return '<a class="card stack" href="#/discussions" style="gap:4px;text-decoration:none;color:inherit' + (n ? ';border-left:4px solid var(--ac)' : '') + '"><span class="eyebrow">Discussions' + (test ? ' · en test' : '') + '</span>' +
    '<b>' + (n ? n + ' nouveau' + (n > 1 ? 'x' : '') + ' message' + (n > 1 ? 's' : '') : 'Tes groupes du club') + '</b>' +
    '<span class="mut small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(l.slice(0, 3).map(function (d) { return d.nom; }).join(' · ')) + (l.length > 3 ? '…' : '') + '</span></a>';
}
// Liste des fils regroupés par catégorie (dossiers repliables). Une catégorie avec un seul fil s'affiche directement.
function norm(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
var DISC_OUV = (function () { try { return JSON.parse(localStorage.getItem('disc_ouverts') || '{}'); } catch (e) { return {}; } })();
function discLigne(d, dansDossier) {
  var n = d.muet ? 0 : d.non_lus, nom = d.nom;
  // Dans le dossier « Double interne », « Double interne · Dames poule 1 » devient « Dames poule 1 »
  if (dansDossier && d.categorie && nom.indexOf(d.categorie + ' · ') === 0) nom = nom.slice(d.categorie.length + 3);
  return '<a class="row" href="#/discussion/' + d.id + '" style="text-decoration:none;color:inherit;gap:12px' + (dansDossier ? ';padding-left:14px' : '') + '">' + discAvatar(Object.assign({}, d, { nom: nom }), dansDossier ? 36 : 44) +
    '<span class="stack" style="flex:1;gap:2px;min-width:0"><span style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(nom) + '</b>' +
    '<span class="xs" style="flex:none;color:' + (n ? 'var(--ac)' : 'var(--mut)') + '">' + (d.dernier_le ? esc(discQuand(d.dernier_le)) : '') + '</span></span>' +
    '<span style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span class="small mut" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' + (n ? 'font-weight:600;color:var(--tx)' : '') + '">' +
    (d.dernier_texte ? esc(d.dernier_auteur + ' : ' + d.dernier_texte) : (d.description ? esc(d.description) : 'Pas encore de message')) + '</span>' +
    '<span style="display:flex;gap:6px;align-items:center;flex:none">' + (!d.ouvert ? '<span class="badge" style="background:var(--soft);color:var(--mut)">Test</span>' : '') + (d.muet ? ic('mute', 16, 'var(--mut)') : '') +
    (n ? '<span class="badge" style="background:var(--ac);color:#fff;min-width:22px;justify-content:center">' + (n > 99 ? '99+' : n) + '</span>' : '') + '</span></span></span></a>';
}
function discListeHtml() {
  var l = S.discs || [];
  if (!l.length) return '<section class="card empty">Aucune discussion pour le moment. Les groupes du club arriveront ici.</section>';
  var cats = [], par = {};
  l.forEach(function (d) { var c = d.categorie || 'Autres'; if (!par[c]) { par[c] = []; cats.push(c); } par[c].push(d); });
  var recherche = l.length > 10 ? '<input class="f" id="disc-q" type="search" placeholder="Chercher une discussion" aria-label="Chercher une discussion" style="margin-bottom:2px">' : '';
  return recherche + '<section class="card tight" id="disc-box">' + cats.map(function (c) {
    var fils = par[c];
    if (fils.length === 1) return discLigne(fils[0], false);
    var n = fils.reduce(function (s, d) { return s + (d.muet ? 0 : d.non_lus || 0); }, 0);
    var der = fils.filter(function (d) { return d.dernier_le; }).sort(function (a, b) { return a.dernier_le < b.dernier_le ? 1 : -1; })[0];
    var ouvert = !!DISC_OUV[c];
    return '<div class="dossier" data-cat="' + esc(c) + '"><button class="row dos-tete" data-dos="' + esc(c) + '" aria-expanded="' + ouvert + '" style="width:100%;background:none;border:0;font:inherit;color:inherit;text-align:left;cursor:pointer;gap:12px">' +
      discAvatar({ nom: c, couleur: fils[0].couleur, type: fils.every(function (d) { return d.type === 'annonce'; }) ? 'annonce' : 'groupe' }) +
      '<span class="stack" style="flex:1;gap:2px;min-width:0"><span style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c) + '</b>' +
      '<span class="xs" style="flex:none;color:' + (n ? 'var(--ac)' : 'var(--mut)') + '">' + (der ? esc(discQuand(der.dernier_le)) : '') + '</span></span>' +
      '<span style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span class="small mut" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + fils.length + ' discussions' + (der ? ' · ' + esc(der.dernier_auteur + ' : ' + der.dernier_texte) : '') + '</span>' +
      '<span style="display:flex;gap:6px;align-items:center;flex:none">' + (n ? '<span class="badge" style="background:var(--ac);color:#fff;min-width:22px;justify-content:center">' + (n > 99 ? '99+' : n) + '</span>' : '') +
      '<span class="dos-fl" style="display:inline-flex;transition:transform .2s;transform:rotate(' + (ouvert ? 90 : 0) + 'deg)">' + ic('next', 18, 'var(--mut)') + '</span></span></span></span></button>' +
      '<div class="dos-fils"' + (ouvert ? '' : ' hidden') + ' style="border-left:3px solid var(--soft);margin-left:20px">' + fils.map(function (d) { return discLigne(d, true); }).join('') + '</div></div>';
  }).join('') + '</section>';
}
function lierListeDisc() {
  var box = $('disc-box'); if (!box) return;
  Array.prototype.forEach.call(box.querySelectorAll('[data-dos]'), function (b) {
    b.onclick = function () {
      var c = b.dataset.dos, ouv = !DISC_OUV[c];
      if (ouv) DISC_OUV[c] = 1; else delete DISC_OUV[c];
      try { localStorage.setItem('disc_ouverts', JSON.stringify(DISC_OUV)); } catch (e) { }
      b.setAttribute('aria-expanded', ouv); b.nextElementSibling.hidden = !ouv;
      b.querySelector('.dos-fl').style.transform = 'rotate(' + (ouv ? 90 : 0) + 'deg)';
    };
  });
  // Recherche : ouvre les dossiers et ne garde que les fils dont le nom correspond
  if ($('disc-q')) $('disc-q').oninput = function () {
    var t = norm(this.value).trim(), mots = t.split(/\s+/);
    var colle = function (txt) { txt = norm(txt); return mots.every(function (m) { return txt.indexOf(m) >= 0; }); };
    Array.prototype.forEach.call(box.querySelectorAll('.dossier'), function (dos) {
      var vus = 0;
      Array.prototype.forEach.call(dos.querySelectorAll('.dos-fils > a'), function (a) { var ok = !t || colle(a.textContent + ' ' + dos.dataset.cat); a.hidden = !ok; if (ok) vus++; });
      dos.hidden = !!t && !vus;
      dos.querySelector('.dos-fils').hidden = t ? false : !DISC_OUV[dos.dataset.cat];
    });
    Array.prototype.forEach.call(box.querySelectorAll(':scope > a.row'), function (a) { a.hidden = !!t && !colle(a.textContent); });
  };
}
function pageDiscussions() {
  var h = '<div class="pagehead wrap">' + backLink('#/accueil', 'Accueil') + '<h1 style="font-size:26px">Discussions</h1><p class="mut small" style="margin:4px 0 0">Tes groupes du club : annonces, CLOC\'ARENA, poules, équipes…</p></div><main>';
  if (!S.user) return h + '<section class="card empty">Connecte-toi pour voir tes discussions.</section></main>';
  setTimeout(function () { lierListeDisc(); chargerDiscussions().then(function () { if ($('disc-l') && !($('disc-q') && $('disc-q').value)) { $('disc-l').innerHTML = discListeHtml(); lierListeDisc(); } tabs('accueil'); }); });
  return h + '<div id="disc-l" class="stack" style="gap:12px">' + discListeHtml() + '</div></main>';
}
function pageDiscussion(id) {
  var d = (S.discs || []).filter(function (x) { return x.id === id; })[0];
  if (!S.user) return '<div class="pagehead wrap">' + backLink('#/messages', 'Messages') + '</div><main><section class="card empty">Connecte-toi pour voir cette discussion.</section></main>';
  if (!d) {
    // Arrivée directe (notification) : on recharge la liste avant d'afficher
    setTimeout(function () { chargerDiscussions().then(function () { if ((S.discs || []).some(function (x) { return x.id === id; })) render(); else if ($('disc-fil')) $('disc-fil').innerHTML = '<section class="card empty">Cette discussion n\'existe plus ou ne te concerne pas.</section>'; }); });
    return '<div class="pagehead wrap">' + backLink('#/messages', 'Messages') + '</div><main><div id="disc-fil"><div class="card empty">Chargement…</div></div></main>';
  }
  var prive = d.type === 'prive';
  var h = '<div class="pagehead wrap" style="display:flex;align-items:center;gap:10px;padding-bottom:10px;border-bottom:1px solid var(--bd);position:sticky;top:0;z-index:18;background:var(--bg)">' +
    '<a class="back" href="#/messages" aria-label="Retour aux messages" style="color:var(--tx);margin:0">' + ic('back', 22) + '</a>' + discAvatar(d, 38) +
    '<span class="stack" style="flex:1;min-width:0;gap:0"><b style="font-size:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(d.nom) + '</b><span class="xs mut" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
    (prive ? esc(d.annonce_titre || 'Annonce n°' + d.annonce_num) : d.membres + ' membre' + (d.membres > 1 ? 's' : '')) + (d.muet ? ' · notifications coupées' : '') + '</span></span>' +
    '<button class="chip" id="disc-muet" aria-label="' + (d.muet ? 'Réactiver les notifications' : 'Couper les notifications') + '" title="' + (d.muet ? 'Réactiver les notifications' : 'Couper les notifications') + '">' + ic(d.muet ? 'bell' : 'mute', 18) + '</button>' +
    (prive ? '<button class="chip" id="disc-signal" style="color:var(--ac);border-color:var(--ac)">' + ic('flag', 16) + 'Signaler</button>' : '') + '</div><main style="gap:0">';
  // Conversation privée liée à une petite annonce : rappel des règles et lien vers l'annonce
  if (prive) h += '<div class="card small stack" style="gap:6px;margin:10px 0 4px;background:var(--soft);border-color:var(--soft)"><span>' + ic('lock', 15) + ' Conversation privée avec <b>' + esc(d.nom) + '</b>, à propos de son annonce. Reste courtois : en cas de signalement, la direction du club peut lire cette conversation.</span>' +
    '<a href="#/club/annonces" style="color:var(--ac);font-weight:600">Voir l\'annonce n°' + d.annonce_num + (d.annonce_prix ? ' · ' + esc(d.annonce_prix) : '') + '</a></div>';
  if (!d.ouvert) h += '<div class="card small" style="background:var(--sun);border-color:var(--peach);color:#5a2a14;margin-bottom:10px"><b>En test</b> : ce fil n\'est visible que par la direction. Ouvre-le aux membres depuis l\'espace gestion quand il est prêt.</div>';
  if (d.description) h += '<p class="xs mut" style="text-align:center;margin:4px 0 8px">' + esc(d.description) + '</p>';
  h += '<div id="disc-fil" class="dfil"><div class="card empty">Chargement…</div></div></main>';
  if (d.peut_ecrire) h += '<form class="dcompo" id="disc-f"><textarea id="disc-t" rows="1" maxlength="2000" placeholder="Écrire un message" aria-label="Message"></textarea><button type="submit" aria-label="Envoyer">' + ic('send', 20, '#fff') + '</button></form>';
  else h += '<div class="dcompo" style="justify-content:center"><span class="small mut">' + (d.archive ? 'Cette discussion est archivée.' : 'Seule l\'équipe du club écrit dans ce fil.') + '</span></div>';
  setTimeout(function () { ouvrirFil(d); });
  return h;
}
// Signaler une conversation privée : la direction reçoit le motif et la conversation ; l'autre personne n'est pas prévenue
function signalerDiscussion(d) {
  var M = { motif: '', bloquer: false };
  var MOTIFS = [['arnaque', 'Arnaque ou demande suspecte', 'Paiement à l\'avance, lien douteux, demande de coordonnées…'], ['propos', 'Propos déplacés ou insultants', ''], ['autre', 'Autre chose', '']];
  var dessin = function () {
    modale('<div class="stack" style="gap:12px"><h2 style="margin:0;font-size:20px">' + ic('flag', 20, 'var(--ac)') + ' Signaler la conversation</h2>' +
      '<span class="small mut">La direction du club reçoit ce signalement et peut lire la conversation. L\'autre personne n\'est pas prévenue.</span>' +
      '<div class="stack" style="gap:8px">' + MOTIFS.map(function (m) {
        var on = M.motif === m[0];
        return '<button class="btn line" data-motif="' + m[0] + '" style="justify-content:flex-start;text-align:left;height:auto;padding:10px 14px;flex-direction:column;align-items:flex-start;gap:2px' + (on ? ';border:2px solid var(--ac);background:var(--sun)' : '') + '"><b>' + (on ? '● ' : '○ ') + m[1] + '</b>' + (m[2] ? '<span class="xs mut" style="font-weight:400">' + m[2] + '</span>' : '') + '</button>';
      }).join('') + '</div>' +
      '<label class="f">Précise si tu veux (facultatif)<textarea class="f" id="sig-t" rows="2" maxlength="600" placeholder="Ce qui s\'est passé">' + esc(M.detail || '') + '</textarea></label>' +
      '<label class="check" style="min-height:0"><input type="checkbox" id="sig-b"' + (M.bloquer ? ' checked' : '') + '><span class="small"><b>Bloquer ' + esc(d.nom) + '</b> : cette personne ne pourra plus m\'écrire.</span></label>' +
      '<button class="btn" id="sig-go"' + (M.motif ? '' : ' disabled style="opacity:.5"') + '>Envoyer le signalement</button><button class="btn line" id="sig-x">Annuler</button></div>', function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-motif]'), function (b) { b.onclick = function () { M.motif = b.dataset.motif; M.bloquer = $('sig-b').checked; dessin(); }; });
      $('sig-b').onchange = function () { M.bloquer = this.checked; };
      $('sig-t').oninput = function () { M.detail = this.value; };
      $('sig-x').onclick = fermerModale;
      $('sig-go').onclick = function () {
        if (!M.motif) return;
        q(sb.rpc('discussion_signaler', { p_disc: d.id, p_motif: M.motif, p_detail: $('sig-t').value.trim() || null, p_bloquer: M.bloquer })).then(function (rid) {
          if (rid) sb.functions.invoke('retour', { body: { retour_id: rid } }).catch(function () { });
          if (M.bloquer) { d.archive = true; d.peut_ecrire = false; }
          fermerModale(); toast('Merci, la direction du club a reçu ton signalement'); if (M.bloquer) render();
        }).catch(function () { toast('Envoi impossible, réessaie'); });
      };
    });
  };
  dessin();
}
function discFermerCanal() { if (DISC.canal) { try { sb.removeChannel(DISC.canal); } catch (e) { } DISC.canal = null; } DISC.id = null; }
function discMarquerLu(d) {
  clearTimeout(DISC.luT);
  DISC.luT = setTimeout(function () { q(sb.rpc('discussion_lu', { p_disc: d.id })).then(function () { d.non_lus = 0; d.lu_le = new Date().toISOString(); tabs('accueil'); }).catch(function () { }); }, 400);
}
function ouvrirFil(d) {
  discFermerCanal();
  DISC.id = d.id; DISC.msgs = []; DISC.tout = false;
  var champs = 'id, user_id, auteur, auteur_club, texte, supprime_le, created_at';
  var charger = function (avant) {
    var r = sb.from('discussion_messages').select(champs).eq('discussion_id', d.id).order('created_at', { ascending: false }).limit(60);
    if (avant) r = r.lt('created_at', avant);
    return q(r).then(function (l) { l = (l || []).reverse(); if (l.length < 60) DISC.tout = true; return l; });
  };
  charger().then(function (l) {
    if (DISC.id !== d.id) return;
    DISC.msgs = l; dessinerFil(d, true); discMarquerLu(d);
  }).catch(function () { if ($('disc-fil')) $('disc-fil').innerHTML = '<section class="card empty">Impossible de charger les messages.</section>'; });
  // Temps réel : nouveaux messages et messages retirés
  DISC.canal = sb.channel('disc-' + d.id).on('postgres_changes', { event: '*', schema: 'public', table: 'discussion_messages', filter: 'discussion_id=eq.' + d.id }, function (p) {
    if (DISC.id !== d.id || !p.new || !p.new.id) return;
    var i = DISC.msgs.map(function (m) { return m.id; }).indexOf(p.new.id);
    if (i >= 0) DISC.msgs[i] = p.new; else DISC.msgs.push(p.new);
    var bas = (window.innerHeight + window.scrollY) >= document.body.scrollHeight - 160;
    dessinerFil(d, bas || p.new.user_id === S.user.id);
    if (document.visibilityState === 'visible') discMarquerLu(d);
  }).subscribe();
  if ($('disc-signal')) $('disc-signal').onclick = function () { signalerDiscussion(d); };
  if ($('disc-muet')) $('disc-muet').onclick = function () {
    q(sb.rpc('discussion_muet', { p_disc: d.id, p_muet: !d.muet })).then(function () { d.muet = !d.muet; toast(d.muet ? 'Notifications coupées pour ce fil' : 'Notifications réactivées'); render(); }).catch(function () { toast('Action impossible'); });
  };
  var t = $('disc-t');
  if (t) {
    var taille = function () { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; };
    t.oninput = taille;
    // Sur ordinateur, Entrée envoie (Maj+Entrée pour aller à la ligne) ; sur téléphone, Entrée va à la ligne
    t.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey && !estMobile()) { e.preventDefault(); $('disc-f').requestSubmit ? $('disc-f').requestSubmit() : $('disc-f').onsubmit(e); } };
    $('disc-f').onsubmit = function (e) {
      e.preventDefault();
      var v = t.value.trim();
      if (!v) return;
      var btn = $('disc-f').querySelector('button'); btn.disabled = true;
      q(sb.from('discussion_messages').insert({ discussion_id: d.id, texte: v }).select(champs).single()).then(function (m) {
        t.value = ''; taille(); btn.disabled = false; t.focus();
        if (DISC.msgs.map(function (x) { return x.id; }).indexOf(m.id) < 0) { DISC.msgs.push(m); dessinerFil(d, true); }
        d.dernier_texte = m.texte; d.dernier_auteur = m.auteur; d.dernier_le = m.created_at;
        sb.functions.invoke('discussion-notifier', { body: { message_id: m.id } }).catch(function () { });
      }).catch(function () { btn.disabled = false; toast('Message non envoyé'); });
    };
  }
  DISC.plus = function () {
    var premier = DISC.msgs[0];
    if (!premier) return;
    var hAvant = document.body.scrollHeight;
    charger(premier.created_at).then(function (l) { DISC.msgs = l.concat(DISC.msgs); dessinerFil(d, false); window.scrollTo(0, document.body.scrollHeight - hAvant + window.scrollY); });
  };
}
function dessinerFil(d, enBas) {
  var box = $('disc-fil');
  if (!box) return;
  var moi = S.user.id, jour = '', h = '';
  if (!DISC.tout) h += '<button class="chip" id="disc-plus" style="align-self:center;margin-bottom:6px">Voir les messages précédents</button>';
  if (!DISC.msgs.length) h += '<div class="card empty" style="margin-top:12px">Pas encore de message. ' + (d.peut_ecrire ? 'Lance la discussion !' : '') + '</div>';
  DISC.msgs.forEach(function (m, i) {
    var dt = new Date(m.created_at), j = isoJour(dt);
    if (j !== jour) { jour = j; h += '<div class="djour">' + esc(discQuand(m.created_at) === fmtH(dt) ? 'Aujourd\'hui' : fmtJour(dt)) + '</div>'; }
    var mien = m.user_id === moi, prec = DISC.msgs[i - 1];
    var suite = prec && prec.user_id === m.user_id && isoJour(new Date(prec.created_at)) === j && (dt - new Date(prec.created_at)) < 5 * 60e3;
    var retirable = !m.supprime_le && (mien || d.admin);
    h += '<div class="dmsg' + (mien ? ' moi' : '') + (suite ? ' suite' : '') + (m.supprime_le ? ' retire' : '') + '"' + (retirable ? ' data-dret="' + m.id + '" role="button" tabindex="0" title="Appuie pour retirer ce message"' : '') + '>' +
      (!mien && !suite ? '<span class="qui">' + esc(m.auteur) + (m.auteur_club ? ' <span class="club">Club</span>' : '') + '</span>' : '') +
      (m.supprime_le ? '<i>Message retiré</i>' : discTexte(m.texte)) + '<span class="h">' + fmtH(dt) + '</span></div>';
  });
  box.innerHTML = h;
  if ($('disc-plus')) $('disc-plus').onclick = function () { DISC.plus(); };
  Array.prototype.forEach.call(box.querySelectorAll('[data-dret]'), function (el) {
    el.onclick = function (e) {
      if (e.target.tagName === 'A') return;
      if (!confirm('Retirer ce message ? Il sera remplacé par « Message retiré » pour tout le monde.')) return;
      q(sb.rpc('discussion_message_retirer', { p_msg: el.dataset.dret })).then(function () {
        DISC.msgs.forEach(function (m) { if (m.id === el.dataset.dret) m.supprime_le = new Date().toISOString(); }); dessinerFil(d, false); toast('Message retiré');
      }).catch(function () { toast('Action impossible'); });
    };
  });
  if (enBas) setTimeout(function () { window.scrollTo(0, document.body.scrollHeight); }, 0);
}
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState !== 'visible' || !S.user) return;
  chargerNotifs().then(function () { if (document.body.getAttribute('data-page') === 'notifs') render(); });
  var d = DISC.id && (S.discs || []).filter(function (x) { return x.id === DISC.id; })[0];
  if (d) discMarquerLu(d); else chargerDiscussions().then(function () { if (document.body.getAttribute('data-page') === 'accueil' || document.body.getAttribute('data-page') === 'discussions') render(); });
});

function render() {
  var parts = (location.hash || '#/accueil').replace(/^#\/?/, '').split('/');
  if (parts[0] !== 'discussion') discFermerCanal();
  var p = parts[0] || 'accueil', arg = parts[1];
  var html, actif = p;
  if (p === 'agenda') html = pageAgenda();
  else if (p === 'arena') actif = 'club', html = arg === 'tweener' ? pageArena() : arg === 'masters' ? pageMasters() : pageArenaAccueil();
  else if (p === 'fiche') { html = pageFiche(arg); actif = 'club'; }
  else if (p === 'club') html = pageClub(arg);
  else if (p === 'evenement') { html = pageEvenement(arg); actif = 'club'; }
  else if (p === 'fete' || p === 'noel') {
    html = pageFete(p === 'noel' ? 'noel' : arg); actif = 'accueil';
    if (p === 'noel' && arg === 'tombola') (function attendre(n) { var t = $('fete-tombola'); if (t) t.scrollIntoView({ block: 'start' }); else if (n) setTimeout(function () { attendre(n - 1); }, 200); })(20);
  }
  else if (p === 'inscriptions') { html = pageInscriptions(); actif = 'accueil'; }
  else if (p === 'actu') { html = pageActu(arg); actif = 'club'; }
  else if (p === 'profil') html = arg === 'accueil' ? pageMonAccueil() : pageProfil();
  else if (p === 'gestion') html = pageEspaces();
  else if (p === 'saisie' || p === 'cordeur' || p === 'bureau') { location.replace('gestion/#/' + ({ saisie: 'arena', cordeur: 'cordage', bureau: 'accueil' })[p]); return; }
  else if (p === 'cordage') { html = arg === 'guide' ? pageGuideCordage() : pageCordage(arg); actif = 'accueil'; }
  else if (p === 'double') { html = pageDouble(); actif = 'accueil'; }
  else if (p === 'groupe') { html = pageGroupe(arg); actif = aDesEspaces() ? 'gestion' : 'agenda'; }
  else if (p === 'coach') { html = pageCoach(); actif = 'gestion'; }
  else if (p === 'messages') { html = pageMessages(); actif = 'messages'; }
  else if (p === 'discussions') { MSGF = 'club'; html = pageMessages(); actif = 'messages'; }
  else if (p === 'discussion') { html = pageDiscussion(arg); actif = 'messages'; }
  else if (p === 'aide') { html = pageAide(); actif = 'profil'; }
  else if (p === 'message') { html = pageMessage(arg); actif = 'messages'; }
  else if (p === 'questionnaire') { html = pageQuestionnaire(arg); actif = 'accueil'; }
  else if (p === 'notifs') { html = pageNotifs(); actif = 'accueil'; setTimeout(lierNotifs); }
  else { p = 'accueil'; html = pageAccueil(); actif = 'accueil'; setTimeout(function () { lierSel(); remplirPresence(); lierPart(); remplirReseaux(); resumeCoach(); lierAccueilAide(); setTimeout(guidesAuto, 400); }); }
  if (S.apercu) html = '<div style="position:sticky;top:0;z-index:30;background:#7b4fa0;color:#fff;padding:10px 16px;display:flex;gap:10px;align-items:center;justify-content:space-between"><span class="small"><b>Aperçu : ' + esc(S.apercu.nom) + '</b><br>Tu vois l\'appli comme cette famille. Rien n\'est enregistré.</span><button class="chip" id="apercu-x" style="background:#fff;color:#12304a;flex:none">Quitter</button></div>' + html;
  document.body.setAttribute('data-page', p);
  document.body.setAttribute('data-sub', arg || '');
  $('app').innerHTML = html;
  poserCloche();
  notifsLuesPage();
  if ($('apercu-x')) $('apercu-x').onclick = function () { apercu(null); };
  tabs(actif);
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', render);
if (window.MutationObserver && $('app')) new MutationObserver(function () { if (document.querySelector('#app .dayhead.jour')) grouperJours(); }).observe($('app'), { childList: true, subtree: true });
// Passage téléphone ↔ écran large (rotation, fenêtre redimensionnée) : l'accueil se réorganise
if (MQ_LARGE) { var surLarge = function () { if (document.body.getAttribute('data-page') === 'accueil') render(); }; if (MQ_LARGE.addEventListener) MQ_LARGE.addEventListener('change', surLarge); else if (MQ_LARGE.addListener) MQ_LARGE.addListener(surLarge); }

// La pastille de la cloche se met à jour toute seule pendant que l'appli est ouverte
setInterval(function () { if (S.user && document.visibilityState === 'visible') chargerNotifs(); }, 60000);
function demarrer() {
  if (!sb) { $('app').innerHTML = '<main><section class="card empty">Connexion au club impossible pour le moment. Vérifie ta connexion internet.</section></main>'; return; }
  sb.auth.getSession().then(function (r) {
    S.user = r.data && r.data.session ? r.data.session.user : null;
    return Promise.all([chargerPublic(), chargerUtilisateur()]);
  }).then(function () { return Promise.all([chargerAgenda(), chargerClassement().catch(function () { }), chargerCordage().catch(function () { }), chargerMessages(), chargerQuestionnaires(), chargerDiscussions(), chargerMonAccueil(), chargerNotifs()]); })
    .then(render).catch(render);
  sb.auth.onAuthStateChange(function (ev, session) {
    if (ev === 'SIGNED_IN' && (!S.user || S.user.id !== session.user.id)) {
      S.user = session.user;
      chargerUtilisateur().then(chargerAgenda).then(function () { return Promise.all([chargerCordage().catch(function () { }), chargerMessages(), chargerQuestionnaires(), chargerDiscussions(), chargerNotifs()]); }).then(function () { go(location.hash.indexOf('profil') >= 0 ? '#/accueil' : location.hash || '#/accueil'); });
    }
  });
}
demarrer();
if ('serviceWorker' in navigator) window.addEventListener('load', function () { swEnregistrer().catch(function () { }); });
})();
