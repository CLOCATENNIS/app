/* CLOCA Tennis — espace gestion (direction, bureau, accueil, cordeurs)
   Même base et même connexion que l'appli. Chaque action est vérifiée par la base selon le rôle. */
(function () {
'use strict';

var SUPA_URL = 'https://ccvfdsriogqerdcopuuv.supabase.co';
var SUPA_KEY = 'sb_publishable_01H1gmGMH3t4XLqD1EeTeg_ErdW1VvM';
var WA_CLUB = '33662488087';
var sb = window.supabase ? window.supabase.createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'implicit' } }) : null;

// ---------- Rôles et modules ----------
var MODULES = [
  ['accueil', 'Tableau de bord', ['direction', 'bureau', 'accueil', 'cordeur']],
  ['messages', 'Messagerie', ['direction', 'bureau', 'accueil']],
  ['actus', 'Actus', ['direction', 'bureau', 'accueil']],
  ['evenements', 'Événements et séances', ['direction', 'bureau']],
  ['inscriptions', 'Inscriptions', ['direction', 'bureau', 'accueil']],
  ['adherents', 'Adhérents', ['direction', 'bureau', 'accueil']],
  ['adoc', 'Mise à jour ADOC', ['direction', 'bureau']],
  ['groupes', 'Groupes', ['direction', 'bureau']],
  ['annonces', 'Petites annonces', ['direction', 'bureau', 'accueil']],
  ['cordage', 'Cordage', ['direction', 'accueil', 'cordeur']],
  ['boutique', 'Boutique et ardoise', ['direction', 'bureau', 'accueil']],
  ['arena', 'CLOC\'ARENA', ['direction']],
  ['nextgen', 'Next Gen', ['direction']],
  ['missions', 'Missions coachs', ['direction']],
  ['double', 'Double interne', ['direction']],
  ['reseaux', 'Réseaux sociaux', ['direction', 'bureau', 'accueil']],
  ['presence', 'Présence au club', ['direction', 'bureau', 'accueil', 'cordeur']],
  ['equipe', 'Équipe du club', ['direction']],
  ['acces', 'Accès particuliers', ['direction']],
  ['historique', 'Historique', ['direction']]
];
// Rubriques : le menu principal. Chaque rubrique a sa page d'accueil et ses pages en onglets.
var RUBRIQUES = [
  ['', ['accueil']],
  ['Communication', ['messages', 'actus', 'reseaux', 'annonces'], 'comm', 'megaphone', 'Messages aux familles, actus, réseaux sociaux et petites annonces.'],
  ['Agenda et activités', ['evenements', 'inscriptions', 'presence'], 'agenda', 'cal', 'Séances, stages et événements, inscriptions, présence au club.'],
  ['Adhérents', ['adherents', 'groupes', 'adoc'], 'adherents', 'users', 'Fiches des adhérents, groupes et cours, mise à jour depuis ADOC.'],
  ['Compétitions', ['arena', 'double'], 'competitions', 'trophy', 'CLOC\'ARENA et tournoi interne de double.'],
  ['Équipe pédagogique', ['nextgen', 'missions'], 'equipe', 'cap', 'Jeunes Next Gen et missions des coachs.'],
  ['Services du club', ['cordage', 'boutique'], 'services', 'bag', 'Atelier cordage, boutique, stock et ardoise.'],
  ['Administration', ['equipe', 'acces', 'historique'], 'admin', 'shield', 'Équipe du club (organigramme), accès particuliers et historique de toutes les actions.']
];
var DESC_MOD = {
  accueil: 'Ce qui demande ton attention aujourd\'hui.', messages: 'Écrire aux familles, à des groupes, aux inscrits d\'une séance ou aux coachs.', actus: 'Publier les actus du club dans l\'appli et sur le site.',
  reseaux: 'Mettre en avant des publications Instagram et Facebook.', annonces: 'Valider les petites annonces des adhérents.', evenements: 'Créer et modifier séances, stages, tournois et événements.',
  inscriptions: 'Voir les inscrits, les listes d\'attente et les paiements.', presence: 'Indiquer si le club house est ouvert ou fermé.', adherents: 'Fiches des adhérents, familles, cotisations.',
  groupes: 'Groupes, niveaux CLOC\'ARENA et créneaux de cours.', adoc: 'Mettre à jour les adhérents depuis l\'export ADOC.', arena: 'Matchs, points et classements CLOC\'ARENA.',
  double: 'Équipes et poules du tournoi interne de double.', nextgen: 'Mini-coachs, coachs juniors et Next Gen : encadrements et absences.', missions: 'Confier des missions aux coachs et suivre ce qui est fait.',
  cordage: 'Raquettes à corder, prêtes et à encaisser.', boutique: 'Ventes, ardoise, stock de la vitrine et articles.', equipe: 'L\'organigramme : coachs, bureau, accueil. Les fonctions donnent automatiquement les bons accès.', acces: 'Cas particuliers : coach d\'un groupe CLOC\'ARENA, responsable d\'une animation…', historique: 'Tout ce qui a été ajouté, modifié ou supprimé.'
};
var ICG = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M17 8a5 5 0 0 1 0 8"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 6h3v2a3 3 0 0 1-3 3M7 6H4v2a3 3 0 0 0 3 3"/>',
  cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'
};
function icg(n, t) { return '<svg width="' + (t || 20) + '" height="' + (t || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICG[n] + '</svg>'; }
function rubDe(v) { return RUBRIQUES.filter(function (r) { return r[0] && r[1].indexOf(v) >= 0; })[0]; }
function nomMod(id) { var m = MODULES.filter(function (x) { return x[0] === id; })[0]; return m ? m[1] : id; }
var NOM_ROLE = { direction: 'Direction sportive', bureau: 'Bureau', accueil: 'Accueil', cordeur: 'Cordeur', enseignant: 'Coach des cours', coach: 'Coach d\'un groupe', responsable: 'Responsable d\'un groupe' };
var TYPES_EVT = { seance: 'Séance', stage: 'Stage', tournoi: 'Tournoi', animation: 'Animation', reunion: 'Réunion', autre: 'Autre' };
var TYPES_GRP = { niveau: 'Niveaux CLOC\'ARENA', creneau: 'Créneaux de cours', activite: 'Activités', cours: 'Formules ADOC', profil: 'Profils', evenement: 'Événements', autre: 'Autres' };
var A = { user: null, roles: [], mods: [], groupes: [], pers: null, view: 'accueil' };

// ---------- Outils ----------
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function $(id) { return document.getElementById(id); }
function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function q(p) { return p.then(function (r) { if (r.error) throw r.error; return r.data; }); }
function nb(p) { return p.then(function (r) { if (r.error) throw r.error; return r.count || 0; }); }
function toast(t) { var d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2800); }
function pad(n) { return ('0' + n).slice(-2); }
function isoJour(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function hhmm(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function fmtH(d) { return pad(d.getHours()) + 'h' + pad(d.getMinutes()); }
function fmtJ(d) { return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }); }
function fmtJour(d) { return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); }
function euros(n) { return n == null || n === '' ? '' : String(+n).replace('.', ',') + ' €'; }
function age(dn) { if (!dn) return ''; var d = new Date(dn + 'T12:00:00'), n = new Date(), a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a; }
function telWa(t) { var d = String(t || '').replace(/[^\d+]/g, ''); if (d.indexOf('+') === 0) d = d.slice(1); else if (d.indexOf('00') === 0) d = d.slice(2); else if (/^0\d{9}$/.test(d)) d = '33' + d.slice(1); return d.length >= 10 ? d : ''; }
function combine(jour, h) { if (!jour) return null; var t = (h || '00:00').split(':'), d = new Date(jour + 'T00:00:00'); d.setHours(+t[0], +t[1], 0, 0); return d; }
function aRole(r) { return A.roles.some(function (x) { return !x.groupe_id && (Array.isArray(r) ? r.indexOf(x.role) >= 0 : x.role === r); }); }
function peut(mod) { return A.mods.indexOf(mod) >= 0; }
function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
function csv(nom, lignes) {
  var t = lignes.map(function (l) { return l.map(function (c) { c = String(c == null ? '' : c); return /[";\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(';'); }).join('\r\n');
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + t], { type: 'text/csv;charset=utf-8' })); a.download = nom; document.body.appendChild(a); a.click(); a.remove();
}
// Message dans la messagerie des personnes concernées + notification personnalisée
function diffuser(o) {
  return q(sb.rpc('envoyer_message', { p_titre: o.titre, p_texte: o.texte, p_cible: o.cible, p_groupes: o.groupes || null, p_evt: o.evt || null, p_repondre: o.repondre || null, p_lien: o.lien || null, p_source: o.source || 'direct', p_expediteur: o.expediteur || 'CLOCA Tennis' }))
    .then(function (r) {
      return sb.functions.invoke('notifier', { body: { mode: 'message', message_id: r.id } }).then(function (x) {
        var d = x.data || {};
        toast('Message envoyé à ' + r.destinataires + ' compte' + (r.destinataires > 1 ? 's' : '') + (d.envoyes ? ' · notification sur ' + d.envoyes + ' appareil' + (d.envoyes > 1 ? 's' : '') : ''));
        return r;
      }, function () { toast('Message envoyé à ' + r.destinataires + ' compte' + (r.destinataires > 1 ? 's' : '')); return r; });
    }).catch(function (e) { toast(e && e.message ? 'Message non envoyé : ' + e.message : 'Message non envoyé'); });
}
function notifier(corps) {
  return sb.functions.invoke('notifier', { body: corps }).then(function (r) {
    var d = r.data || {};
    if (r.error || d.erreur) toast('Notification non envoyée');
    else toast(d.envoyes ? 'Notification envoyée sur ' + d.envoyes + ' appareil' + (d.envoyes > 1 ? 's' : '') : 'Personne concernée n\'a encore activé les notifications');
  }).catch(function () { toast('Notification non envoyée'); });
}

// Panneau latéral pour les formulaires et fiches
function panneau(titre, html, monter) {
  fermer();
  var ov = document.createElement('div'); ov.className = 'ov'; ov.id = 'ov';
  ov.innerHTML = '<div class="drawer" role="dialog" aria-modal="true" aria-label="' + esc(titre) + '"><div class="dh"><h2>' + esc(titre) + '</h2><button class="x" id="ov-x" aria-label="Fermer">×</button></div><div id="ov-c">' + html + '</div></div>';
  var depart = null;
  ov.onpointerdown = function (e) { depart = e.target; };
  ov.onclick = function (e) { if (e.target === ov && depart === ov) fermer(); depart = null; };
  document.body.appendChild(ov);
  $('ov-x').onclick = fermer;
  if (monter) monter($('ov-c'));
}
function fermer() { var o = $('ov'); if (o) o.remove(); }
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fermer(); });

// ---------- Données partagées ----------
function chargerGroupes(force) {
  if (A.groupes.length && !force) return Promise.resolve(A.groupes);
  var ORDRE = ['Blanc', 'Violet', 'Rouge', 'Orange', 'Vert', 'Jaune'];
  var JRS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  var rang = function (g) {
    if (g.type === 'niveau') { var i = ORDRE.indexOf(String(g.nom).replace("CLOC'ARENA ", '')); return i >= 0 ? i : 99; }
    if (g.type === 'creneau') { var m = String(g.nom).toLowerCase().match(/^(\w+)\s+(\d+)h(\d*)/); if (m && JRS.indexOf(m[1]) >= 0) return JRS.indexOf(m[1]) * 10000 + (+m[2]) * 100 + (+m[3] || 0); }
    return 99999;
  };
  return q(sb.from('groupes').select('id, nom, type, couleur, actif, description').order('type').order('nom')).then(function (l) {
    A.groupes = (l || []).sort(function (a, b) { return a.type === b.type ? (rang(a) - rang(b)) || a.nom.localeCompare(b.nom, 'fr') : (a.type < b.type ? -1 : 1); });
    return A.groupes;
  });
}
function chargerPers(force) {
  if (A.pers && !force) return Promise.resolve(A.pers);
  return q(sb.from('personnes').select('id, prenom, nom, profil, sexe, date_naissance, cours, cotisation_a_jour, foyer_id, actif, niveau_arena, adoc_id, email, arena_id, groupe_membres(groupe_id)').order('nom').order('prenom'))
    .then(function (l) { A.pers = l || []; return A.pers; });
}
function nomGroupe(id) { var g = A.groupes.filter(function (x) { return x.id === id; })[0]; return g ? g.nom : '?'; }
function choixGroupes(sel, nomChamp, sansType) {
  var par = {};
  A.groupes.filter(function (g) { return g.actif !== false && g.type !== sansType; }).forEach(function (g) { (par[g.type] = par[g.type] || []).push(g); });
  return Object.keys(TYPES_GRP).filter(function (t) { return par[t]; }).map(function (t) {
    return '<div class="sect" style="margin:8px 0 4px">' + TYPES_GRP[t] + '</div><div class="chips">' + par[t].map(function (g) {
      var on = sel.indexOf(g.id) >= 0;
      return '<label class="chip' + (on ? ' on' : '') + '"><input type="checkbox" name="' + nomChamp + '" value="' + g.id + '"' + (on ? ' checked' : '') + ' style="display:none">' + esc(g.nom.replace("CLOC'ARENA ", '')) + '</label>';
    }).join('') + '</div>';
  }).join('');
}
function lierChips(root) {
  all('label.chip input', root).forEach(function (i) { i.onchange = function () { i.parentNode.classList.toggle('on', i.checked); }; });
}
function lus(root, nomChamp) { return all('input[name="' + nomChamp + '"]:checked', root).map(function (i) { return i.value; }); }
function chercheurPers(root, onPick, filtre) {
  var box = root.querySelector('.cherche'), inp = box.querySelector('input'), res = box.querySelector('.res');
  inp.oninput = function () {
    var t = norm(inp.value).trim(); if (t.length < 2) { res.innerHTML = ''; return; }
    var l = A.pers.filter(function (p) { return (!filtre || filtre(p)) && norm(p.prenom + ' ' + p.nom + ' ' + p.nom + ' ' + p.prenom).indexOf(t) >= 0; }).slice(0, 8);
    res.innerHTML = l.length ? l.map(function (p) { return '<button class="chip" data-pick="' + p.id + '" style="margin:4px 4px 0 0">' + esc(p.prenom + ' ' + p.nom) + (p.date_naissance ? ' · ' + age(p.date_naissance) + ' ans' : '') + '</button>'; }).join('') : '<span class="mut xs">Personne trouvée.</span>';
    all('[data-pick]', res).forEach(function (b) { b.onclick = function () { inp.value = ''; res.innerHTML = ''; onPick(A.pers.filter(function (p) { return p.id === b.dataset.pick; })[0]); }; });
  };
}
var CHERCHEUR = '<div class="cherche"><input class="f" placeholder="Rechercher un adhérent (2 lettres minimum)"><div class="res"></div></div>';

// ---------- Mise en page ----------
function compteurs() {
  var c = {};
  var p = [];
  if (peut('annonces')) p.push(nb(sb.from('annonces').select('id', { count: 'exact', head: true }).eq('statut', 'attente')).then(function (n) { c.annonces = n; }).catch(function () { }));
  if (peut('cordage')) p.push(nb(sb.from('cordage_demandes').select('id', { count: 'exact', head: true }).eq('statut', 'attente')).then(function (n) { c.cordage = n; }).catch(function () { }));
  if (peut('adherents')) p.push(q(sb.rpc('comptes_a_rattacher')).then(function (l) { c.adherents = (l || []).length; }).catch(function () { }));
  if (peut('arena')) p.push(nb(sb.from('arena_matchs').select('id', { count: 'exact', head: true }).eq('statut', 'propose')).then(function (n) { c.arena = n; }).catch(function () { }));
  return Promise.all(p).then(function () { return c; });
}
function cadre(contenu) {
  var moi = A.user.email;
  $('root').innerHTML = '<div class="layout"><aside><div class="brand"><img src="../logo.png" alt=""><div><b>CLOCA Tennis</b><br><span>ESPACE GESTION</span></div></div>' +
    '<nav class="nav" aria-label="Gestion">' + RUBRIQUES.map(function (r) {
      var mods = r[1].filter(peut); if (!mods.length) return '';
      if (!r[0]) return '<a href="#/accueil" class="rubl' + (A.view === 'accueil' ? ' on' : '') + '">' + icg('home') + '<span class="lbl">Tableau de bord</span></a>';
      var act = A.rub === r[2] || mods.indexOf(A.view) >= 0;
      return '<a href="#/r/' + r[2] + '" class="rubl' + (act ? ' on' : '') + '">' + icg(r[3]) + '<span class="lbl">' + esc(r[0]) + '</span><span class="n" data-rcpt="' + r[2] + '" hidden></span></a>' +
        (act && mods.length > 1 ? '<div class="subl">' + mods.map(function (id) { return '<a href="#/' + id + '" class="' + (A.view === id ? 'on' : '') + '">' + nomMod(id) + '<span class="n" data-cpt="' + id + '" hidden></span></a>'; }).join('') + '</div>' : '');
    }).join('') + '</nav>' +
    '<div class="side-foot">' + esc(moi) + '<br>' + A.roles.filter(function (r) { return !r.groupe_id; }).map(function (r) { return NOM_ROLE[r.role]; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).join(', ') +
    '<br><br><a href="../">Ouvrir l\'appli</a> · <a href="#" id="logout">Se déconnecter</a></div></aside><div class="col">' + sousNav() + '<main id="main">' + contenu + '</main></div></div>';
  $('logout').onclick = function (e) { e.preventDefault(); sb.auth.signOut().then(function () { location.reload(); }); };
  compteurs().then(function (c) {
    A.cpt = c;
    Object.keys(c).forEach(function (k) { all('[data-cpt="' + k + '"]').forEach(function (e) { if (c[k]) { e.textContent = c[k]; e.hidden = false; } }); });
    RUBRIQUES.forEach(function (r) { var t = r[1].reduce(function (s2, k) { return s2 + (peut(k) && c[k] ? c[k] : 0); }, 0); if (r[0] && t) all('[data-rcpt="' + r[2] + '"]').forEach(function (e) { e.textContent = t; e.hidden = false; }); });
  });
}
function sousNav() {
  var r = A.rub ? RUBRIQUES.filter(function (x) { return x[2] === A.rub; })[0] : rubDe(A.view);
  if (!r) return '';
  var mods = r[1].filter(peut);
  return '<div class="subnav"><a href="#/r/' + r[2] + '" class="fil">' + icg(r[3], 18) + esc(r[0]) + '</a>' + (mods.length > 1 || A.rub ? '<div class="tabs">' + mods.map(function (id) { return '<a href="#/' + id + '" class="' + (A.view === id && !A.rub ? 'on' : '') + '">' + nomMod(id) + '<span class="n" data-cpt="' + id + '" hidden></span></a>'; }).join('') + '</div>' : '') + '</div>';
}
function grilleRubriques() {
  return '<div class="rgrid">' + RUBRIQUES.filter(function (r) { return r[0] && r[1].some(peut); }).map(function (r) {
    return '<a class="rcard" href="#/r/' + r[2] + '"><span class="ric">' + icg(r[3], 26) + '</span><span class="rtx"><b>' + esc(r[0]) + '<span class="n" data-rcpt="' + r[2] + '" hidden></span></b><span>' + r[1].filter(peut).map(nomMod).join(' · ') + '</span></span></a>';
  }).join('') + '</div>';
}
function vueRubrique(m, slug) {
  var r = RUBRIQUES.filter(function (x) { return x[2] === slug; })[0];
  m.innerHTML = '<div class="head"><div><h1>' + esc(r[0]) + '</h1><p>' + esc(r[4]) + '</p></div></div><div class="pgrid">' + r[1].filter(peut).map(function (id) {
    return '<a class="pcard" href="#/' + id + '"><b>' + nomMod(id) + '<span class="n" data-cpt="' + id + '" hidden></span></b><span>' + esc(DESC_MOD[id] || '') + '</span><span class="go">Ouvrir →</span></a>';
  }).join('') + '</div>';
  if (A.cpt) Object.keys(A.cpt).forEach(function (k) { all('[data-cpt="' + k + '"]', m).forEach(function (e) { if (A.cpt[k]) { e.textContent = A.cpt[k]; e.hidden = false; } }); });
}
function entete(titre, sous, actions) {
  return '<div class="head"><div><h1>' + esc(titre) + '</h1>' + (sous ? '<p>' + sous + '</p>' : '') + '</div><div class="chips">' + (actions || '') + '</div></div>';
}

// ---------- Tableau de bord ----------
function vueAccueil(m) {
  var dans14 = new Date(Date.now() + 14 * 864e5);
  m.innerHTML = entete('Bonjour', 'Ce qui demande ton attention aujourd\'hui.') + grilleRubriques() + '<div class="kpis" id="kpis"><div class="skel"></div></div><div class="two"><div class="card"><div class="sect" style="margin-top:0">Les 14 prochains jours</div><div id="dash-evts" class="list"><div class="skel"></div></div></div><div class="grid"><div id="presence"></div><div class="card" id="dash-liens"></div></div></div>';
  var k = [];
  var P = [];
  if (peut('adherents')) P.push(q(sb.rpc('comptes_a_rattacher')).then(function (l) { var n = (l || []).length; k.push([n, 'compte' + (n > 1 ? 's' : '') + ' à rattacher', '#/adherents/rattacher', n > 0]); }));
  if (peut('annonces')) P.push(nb(sb.from('annonces').select('id', { count: 'exact', head: true }).eq('statut', 'attente')).then(function (n) { k.push([n, 'annonce' + (n > 1 ? 's' : '') + ' à valider', '#/annonces', n > 0]); }));
  if (peut('cordage')) {
    P.push(nb(sb.from('cordage_demandes').select('id', { count: 'exact', head: true }).eq('statut', 'attente')).then(function (n) { k.push([n, 'raquette' + (n > 1 ? 's' : '') + ' à corder', '#/cordage', false]); }));
    P.push(nb(sb.from('cordage_demandes').select('id', { count: 'exact', head: true }).eq('statut', 'fini')).then(function (n) { k.push([n, 'raquette' + (n > 1 ? 's' : '') + ' à récupérer', '#/cordage', false]); }));
  }
  if (peut('arena')) P.push(nb(sb.from('arena_matchs').select('id', { count: 'exact', head: true }).eq('statut', 'propose')).then(function (n) { k.push([n, 'score' + (n > 1 ? 's' : '') + ' CLOC\'ARENA à valider', '#/arena', n > 0]); }));
  if (peut('adherents')) {
    P.push(nb(sb.from('personnes').select('id', { count: 'exact', head: true }).not('adoc_id', 'is', null).eq('actif', true)).then(function (n) { k.push([n, 'adhérents', '#/adherents', false]); }));
    P.push(nb(sb.from('personnes').select('id', { count: 'exact', head: true }).eq('cotisation_a_jour', false).eq('actif', true)).then(function (n) { k.push([n, 'cotisation' + (n > 1 ? 's' : '') + ' pas à jour', '#/adherents/impayes', n > 0]); }));
  }
  Promise.all(P.map(function (p) { return p.catch(function () { }); })).then(function () {
    $('kpis').innerHTML = k.map(function (x) { return '<a class="kpi' + (x[3] ? ' alerte' : '') + '" href="' + x[2] + '"><b>' + x[0] + '</b><span>' + x[1] + '</span></a>'; }).join('') || '';
  });
  q(sb.from('evenements').select('id, titre, type, debut, statut, inscription_ouverte, places_max, inscriptions(count)').gte('debut', new Date().toISOString()).lte('debut', dans14.toISOString()).order('debut')).then(function (l) {
    $('dash-evts').innerHTML = l.length ? l.map(function (e) {
      var n = e.inscriptions && e.inscriptions[0] ? e.inscriptions[0].count : 0, d = new Date(e.debut);
      return '<div class="it"><div><b>' + esc(e.titre) + '</b><div class="mut xs">' + esc(fmtJ(d)) + ' · ' + fmtH(d) + ' · ' + TYPES_EVT[e.type] + '</div></div><div class="chips">' +
        (e.statut !== 'prevu' ? '<span class="badge ' + (e.statut === 'annule' ? 'b-ko' : 'b-warn') + '">' + (e.statut === 'annule' ? 'Annulé' : 'Déplacé') + '</span>' : '') +
        (e.inscription_ouverte || n ? '<a class="badge" href="#/inscriptions/' + e.id + '">' + n + (e.places_max ? '/' + e.places_max : '') + ' inscrit' + (n > 1 ? 's' : '') + '</a>' : '') + '</div></div>';
    }).join('') : '<div class="empty">Rien de prévu.</div>';
  }).catch(function () { $('dash-evts').innerHTML = '<div class="empty">Impossible de charger les événements.</div>'; });
  var liens = [];
  if (peut('actus')) liens.push('<a class="btn" href="#/actus/nouvelle">Publier une actu</a>');
  if (peut('evenements')) liens.push('<a class="btn navy" href="#/evenements/nouveau">Créer un événement</a>');
  if (peut('adherents')) liens.push('<a class="btn line" href="#/adherents">Chercher un adhérent</a>');
  $('dash-liens').innerHTML = '<div class="sect" style="margin-top:0">Raccourcis</div><div class="chips">' + liens.join('') + '</div>';
  presenceWidget($('presence'));
}

// ---------- Actus ----------
function vueActus(m, arg) {
  m.innerHTML = entete('Actus', 'Ce qui s\'affiche dans « Vie du club » et sur l\'accueil de l\'appli.', '<button class="btn" id="a-new">Nouvelle actu</button>') + '<div id="a-l"><div class="skel"></div></div>';
  $('a-new').onclick = function () { formActu(null); };
  var charger = function () {
    q(sb.from('publications').select('*, publication_groupes(groupe_id)').order('publie_le', { ascending: false }).limit(100)).then(function (l) {
      var now = new Date();
      $('a-l').innerHTML = l.length ? '<div class="tw"><table class="t"><thead><tr><th>Titre</th><th>Publiée</th><th>Visible par</th><th>État</th><th></th></tr></thead><tbody>' + l.map(function (a) {
        var exp = a.expire_le && new Date(a.expire_le) < now, fut = new Date(a.publie_le) > now;
        return '<tr class="click" data-a="' + a.id + '"><td><b>' + esc(a.titre) + '</b>' + (a.urgent ? ' <span class="badge b-ko">Urgent</span>' : '') + (a.epingle ? ' <span class="badge">Épinglée</span>' : '') + '<div class="mut xs">' + esc(String(a.texte || '').slice(0, 90)) + '</div></td>' +
          '<td class="small">' + esc(fmtJour(new Date(a.publie_le))) + '</td><td class="small">' + (a.visibilite === 'public' ? 'Tout le monde' : a.visibilite === 'connectes' ? 'Adhérents connectés' : (a.publication_groupes || []).map(function (g) { return esc(nomGroupe(g.groupe_id)); }).join(', ')) + '</td>' +
          '<td>' + (exp ? '<span class="badge">Expirée</span>' : fut ? '<span class="badge b-warn">Programmée</span>' : '<span class="badge b-ok">En ligne</span>') + '</td><td class="act"><button class="btn sm line" data-asup="' + a.id + '">Supprimer</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="card empty">Aucune actu pour le moment.</div>';
      all('[data-a]').forEach(function (tr) { tr.onclick = function (e) { if (e.target.closest('[data-asup]')) return; formActu(l.filter(function (x) { return x.id === tr.dataset.a; })[0]); }; });
      all('[data-asup]').forEach(function (b) { b.onclick = function () { if (confirm('Supprimer cette actu ?')) q(sb.from('publications').delete().eq('id', b.dataset.asup)).then(function () { toast('Actu supprimée'); charger(); }).catch(function () { toast('Suppression impossible'); }); }; });
    }).catch(function () { $('a-l').innerHTML = '<div class="card empty">Impossible de charger les actus.</div>'; });
  };
  var formActu = function (a) {
    a = a || { visibilite: 'public', publie_le: new Date().toISOString(), publication_groupes: [] };
    var gsel = (a.publication_groupes || []).map(function (g) { return g.groupe_id; }), pd = new Date(a.publie_le);
    panneau(a.id ? 'Modifier l\'actu' : 'Nouvelle actu', '<div class="stack">' +
      '<label class="l">Titre<input class="f" id="p-t" maxlength="120" value="' + esc(a.titre) + '"></label>' +
      '<label class="l">Texte<textarea class="f" id="p-x" rows="6">' + esc(a.texte) + '</textarea></label>' +
      '<div class="row2"><label class="l">Lien (facultatif)<input class="f" id="p-l" placeholder="https://…" value="' + esc(a.lien) + '"></label><label class="l">Image : adresse (facultatif)<input class="f" id="p-i" placeholder="https://…" value="' + esc(a.image_url) + '"></label></div>' +
      '<div class="row2"><label class="c"><input type="checkbox" id="p-u"' + (a.urgent ? ' checked' : '') + '>Urgent (bandeau rouge sur l\'accueil)</label><label class="c"><input type="checkbox" id="p-e"' + (a.epingle ? ' checked' : '') + '>Épingler en haut</label></div>' +
      '<div class="row2"><label class="l">Publier le<input class="f" type="date" id="p-d" value="' + isoJour(pd) + '"></label><label class="l">À quelle heure<input class="f" type="time" id="p-h" value="' + hhmm(pd) + '"></label></div>' +
      '<label class="l">Retirer automatiquement le (facultatif)<input class="f" type="date" id="p-exp" value="' + (a.expire_le ? isoJour(new Date(a.expire_le)) : '') + '"></label>' +
      '<label class="l">Visible par<select class="f" id="p-v"><option value="public"' + (a.visibilite === 'public' ? ' selected' : '') + '>Tout le monde</option><option value="connectes"' + (a.visibilite === 'connectes' ? ' selected' : '') + '>Adhérents connectés</option><option value="groupes"' + (a.visibilite === 'groupes' ? ' selected' : '') + '>Certains groupes</option></select></label>' +
      '<div id="p-gs"' + (a.visibilite === 'groupes' ? '' : ' hidden') + '>' + choixGroupes(gsel, 'pg') + '</div>' +
      '<label class="c"><input type="checkbox" id="p-n"' + (a.id ? '' : ' checked') + '>Envoyer aussi dans la messagerie des personnes concernées (avec notification)</label>' +
      '<div class="chips"><button class="btn" id="p-ok">' + (a.id ? 'Enregistrer' : 'Publier') + '</button><button class="btn line" id="p-an">Annuler</button></div></div>', function (r) {
      lierChips(r);
      $('p-v').onchange = function () { $('p-gs').hidden = this.value !== 'groupes'; };
      $('p-an').onclick = fermer;
      $('p-ok').onclick = function () {
        var titre = $('p-t').value.trim(); if (!titre) return toast('Il faut un titre');
        var vis = $('p-v').value, gs = lus(r, 'pg'); if (vis === 'groupes' && !gs.length) return toast('Choisis au moins un groupe');
        var lien = $('p-l').value.trim(), img = $('p-i').value.trim();
        if ((lien && !/^https?:\/\//.test(lien)) || (img && !/^https?:\/\//.test(img))) return toast('Les adresses doivent commencer par https://');
        var pub = combine($('p-d').value, $('p-h').value) || new Date();
        var row = { titre: titre, texte: $('p-x').value.trim() || null, lien: lien || null, image_url: img || null, urgent: $('p-u').checked, epingle: $('p-e').checked,
          visibilite: vis, publie_le: pub.toISOString(), expire_le: $('p-exp').value ? combine($('p-exp').value, '23:59').toISOString() : null };
        if (!a.id) row.auteur = A.user.id;
        $('p-ok').disabled = true;
        var save = a.id ? q(sb.from('publications').update(row).eq('id', a.id).select('id').single()) : q(sb.from('publications').insert(row).select('id').single());
        var idPub;
        save.then(function (r2) {
          idPub = r2.id;
          return q(sb.from('publication_groupes').delete().eq('publication_id', r2.id)).then(function () {
            return vis === 'groupes' ? q(sb.from('publication_groupes').insert(gs.map(function (g) { return { publication_id: r2.id, groupe_id: g }; }))) : null;
          });
        }).then(function () {
          if ($('p-n').checked) diffuser({ titre: (row.urgent ? '⚠️ ' : '') + titre, texte: row.texte || titre, cible: vis === 'groupes' ? 'groupes' : 'tous', groupes: vis === 'groupes' ? gs : null, lien: '#/actu/' + idPub, source: 'actu' });
          toast(a.id ? 'Actu modifiée' : 'Actu publiée'); fermer(); charger();
        }).catch(function () { toast('Enregistrement impossible'); $('p-ok').disabled = false; });
      };
    });
  };
  chargerGroupes().then(function () { charger(); if (arg === 'nouvelle') formActu(null); });
}

// ---------- Événements et séances ----------
var EVF = { quand: 'avenir', type: '' };
function vueEvenements(m, arg) {
  m.innerHTML = entete('Événements et séances', 'Stages, séances CLOC\'ARENA, animations… ce qui apparaît dans l\'agenda des familles.', '<button class="btn" id="e-new">Nouvel événement</button>') +
    '<div class="toolbar"><div class="chips">' + [['avenir', 'À venir'], ['passes', 'Passés']].map(function (x) { return '<button class="chip' + (EVF.quand === x[0] ? ' on' : '') + '" data-eq="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<select class="f" id="e-ty" style="width:auto"><option value="">Tous les types</option>' + Object.keys(TYPES_EVT).map(function (k) { return '<option value="' + k + '"' + (EVF.type === k ? ' selected' : '') + '>' + TYPES_EVT[k] + '</option>'; }).join('') + '</select></div><div id="e-l"><div class="skel"></div></div>';
  all('[data-eq]').forEach(function (b) { b.onclick = function () { EVF.quand = b.dataset.eq; vueEvenements(m); }; });
  $('e-ty').onchange = function () { EVF.type = this.value; charger(); };
  $('e-new').onclick = function () { formEvt(null); };
  var EV = [];
  var charger = function () {
    var r = sb.from('evenements').select('*, evenement_groupes(groupe_id), inscriptions(count), participations(reponse), evenement_quotas(groupe_id, places)');
    var now = new Date().toISOString();
    r = EVF.quand === 'avenir' ? r.gte('debut', new Date(Date.now() - 864e5).toISOString()).order('debut') : r.lt('debut', now).order('debut', { ascending: false }).limit(100);
    if (EVF.type) r = r.eq('type', EVF.type);
    q(r).then(function (l) {
      EV = l;
      $('e-l').innerHTML = l.length ? '<div class="tw"><table class="t"><thead><tr><th>Date</th><th>Événement</th><th>Groupes</th><th>Inscrits</th><th>État</th><th></th></tr></thead><tbody>' + l.map(function (e) {
        var d = new Date(e.debut), n = e.inscriptions && e.inscriptions[0] ? e.inscriptions[0].count : 0;
        var gs = groupesEvt(e).map(function (g) { return esc(nomGroupe(g).replace("CLOC'ARENA ", '')); }).join(', ');
        return '<tr class="click" data-e="' + e.id + '"><td class="small" style="white-space:nowrap"><b>' + esc(fmtJ(d)) + '</b><br>' + fmtH(d) + (e.fin ? ' – ' + fmtH(new Date(e.fin)) : '') + '</td>' +
          '<td><b>' + esc(e.titre) + '</b><div class="mut xs">' + TYPES_EVT[e.type] + (e.lieu ? ' · ' + esc(e.lieu) : '') + (e.encadrant ? ' · ' + esc(e.encadrant) : '') + '</div></td><td class="small">' + (gs || (e.public ? 'Public' : '—')) + '</td>' +
          '<td class="small" style="white-space:nowrap">' + (!e.inscription_ouverte && (e.participations || []).length ? '<span title="Réponses « Je participe »"><b style="color:var(--ok)">✓ ' + e.participations.filter(function (x) { return x.reponse === 'oui'; }).length + '</b> · <span style="color:var(--ko)">✗ ' + e.participations.filter(function (x) { return x.reponse === 'non'; }).length + '</span></span>' : e.inscription_ouverte ? '<a href="#/inscriptions/' + e.id + '">' + n + ' inscrit' + (n > 1 ? 's' : '') + '</a><br><label class="xs mut" style="display:inline-flex;gap:4px;align-items:center">sur <input class="f" type="number" min="1" data-epl="' + e.id + '" value="' + esc(e.places_max) + '" placeholder="∞" title="Nombre de places (vide = illimité)" style="width:64px;min-height:32px;padding:2px 6px"> places</label>' + ((e.evenement_quotas || []).length ? '<div class="xs mut">' + e.evenement_quotas.map(function (x) { return esc(nomGroupe(x.groupe_id).replace("CLOC'ARENA ", '')) + ' ' + x.places; }).join(' · ') + '</div>' : '') : n ? '<a href="#/inscriptions/' + e.id + '">' + n + '</a>' : '—') + '</td>' +
          '<td>' + (e.statut === 'annule' ? '<span class="badge b-ko">Annulé</span>' : e.statut === 'deplace' ? '<span class="badge b-warn">Déplacé</span>' : '<span class="badge b-ok">Prévu</span>') + '</td>' +
          '<td class="act"><button class="btn sm line" data-edup="' + e.id + '" title="Copier à la même heure la semaine suivante">+ 7 jours</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="card empty">Aucun événement.</div>';
      all('[data-epl]').forEach(function (inp) {
        inp.onchange = function () {
          var v = inp.value ? parseInt(inp.value, 10) : null;
          if (v !== null && !(v > 0)) { toast('Nombre de places invalide'); return; }
          q(sb.from('evenements').update({ places_max: v }).eq('id', inp.dataset.epl).select('id').single()).then(function () {
            EV.forEach(function (x) { if (x.id === inp.dataset.epl) x.places_max = v; }); toast(v ? v + ' places enregistrées' : 'Places illimitées');
          }).catch(function () { toast('Enregistrement impossible'); });
        };
      });
      all('[data-e]').forEach(function (tr) { tr.onclick = function (ev) { if (ev.target.closest('[data-edup],a,[data-epl],label')) return; formEvt(EV.filter(function (x) { return x.id === tr.dataset.e; })[0]); }; });
      all('[data-edup]').forEach(function (b) { b.onclick = function () { dupliquer(EV.filter(function (x) { return x.id === b.dataset.edup; })[0]); }; });
    }).catch(function () { $('e-l').innerHTML = '<div class="card empty">Impossible de charger les événements.</div>'; });
  };
  var groupesEvt = function (e) { var ids = []; if (e.groupe_id) ids.push(e.groupe_id); (e.evenement_groupes || []).forEach(function (g) { if (ids.indexOf(g.groupe_id) < 0) ids.push(g.groupe_id); }); return ids; };
  var champsEvt = ['titre', 'type', 'debut', 'fin', 'lieu', 'encadrant', 'description', 'objectif', 'public', 'statut', 'inscription_ouverte', 'places_max', 'prix_euros', 'format'];
  var dupliquer = function (e) {
    var row = {}; champsEvt.forEach(function (k) { row[k] = e[k]; });
    row.debut = new Date(new Date(e.debut).getTime() + 7 * 864e5).toISOString(); if (e.fin) row.fin = new Date(new Date(e.fin).getTime() + 7 * 864e5).toISOString();
    row.statut = 'prevu'; row.created_by = A.user.id;
    q(sb.from('evenements').insert(row).select('id').single()).then(function (r) {
      var gs = groupesEvt(e); return gs.length ? q(sb.from('evenement_groupes').insert(gs.map(function (g) { return { evenement_id: r.id, groupe_id: g }; }))) : null;
    }).then(function () { toast('Copié au ' + fmtJ(new Date(row.debut))); charger(); }).catch(function () { toast('Copie impossible'); });
  };
  var formEvt = function (e) {
    var nouveau = !e; e = e || { type: 'seance', statut: 'prevu', public: true };
    var d = e.debut ? new Date(e.debut) : null, f = e.fin ? new Date(e.fin) : null, gsel = e.id ? groupesEvt(e) : [];
    var quotas = {};
    panneau(nouveau ? 'Nouvel événement' : 'Modifier l\'événement', '<div class="stack">' +
      '<label class="l">Titre<input class="f" id="v-t" maxlength="120" value="' + esc(e.titre) + '" placeholder="Ex. CLOC\'ARENA · Rassemblement"></label>' +
      '<div class="row2"><label class="l">Type<select class="f" id="v-ty">' + Object.keys(TYPES_EVT).map(function (k) { return '<option value="' + k + '"' + (e.type === k ? ' selected' : '') + '>' + TYPES_EVT[k] + '</option>'; }).join('') + '</select></label>' +
      '<label class="l">État<select class="f" id="v-st"><option value="prevu"' + (e.statut === 'prevu' ? ' selected' : '') + '>Prévu</option><option value="deplace"' + (e.statut === 'deplace' ? ' selected' : '') + '>Déplacé</option><option value="annule"' + (e.statut === 'annule' ? ' selected' : '') + '>Annulé</option></select></label></div>' +
      '<div class="row3"><label class="l">Date<input class="f" type="date" id="v-d" value="' + (d ? isoJour(d) : '') + '"></label><label class="l">Début<input class="f" type="time" id="v-h1" value="' + (d ? hhmm(d) : '') + '"></label><label class="l">Fin<input class="f" type="time" id="v-h2" value="' + (f ? hhmm(f) : '') + '"></label></div>' +
      '<label class="l">Se termine un autre jour (stage sur plusieurs jours)<input class="f" type="date" id="v-df" value="' + (f && d && isoJour(f) !== isoJour(d) ? isoJour(f) : '') + '"></label>' +
      '<div class="row2"><label class="l">Lieu<input class="f" id="v-l" value="' + esc(e.lieu) + '" placeholder="Ex. Intérieur (2 terrains)"></label><label class="l">Encadré par<input class="f" id="v-en" value="' + esc(e.encadrant) + '"></label></div>' +
      '<label class="l">Objectif / format (séances)<input class="f" id="v-o" value="' + esc(e.objectif) + '" placeholder="Ex. Flash match"></label>' +
      '<label class="l">Description<textarea class="f" id="v-x">' + esc(e.description) + '</textarea></label>' +
      '<div class="sect">Pour qui ?</div><span class="mut xs">Les familles des groupes choisis le verront dans leur agenda.</span>' + choixGroupes(gsel, 'eg') +
      '<label class="c"><input type="checkbox" id="v-p"' + (e.public ? ' checked' : '') + '>Visible par tout le monde (même sans compte)</label>' +
      '<div class="sect">Inscriptions</div><label class="c"><input type="checkbox" id="v-io"' + (e.inscription_ouverte ? ' checked' : '') + '>Inscriptions ouvertes dans l\'appli</label>' +
      '<span class="mut xs">Places limitées : soit un total, soit par niveau (ex. 8 Rouge et 8 Violet), soit les deux.</span>' +
      '<div class="row2"><label class="l">Nombre de places au total (vide = illimité)<input class="f" type="number" min="1" id="v-pl" value="' + esc(e.places_max) + '"></label><label class="l">Prix en € (facultatif)<input class="f" inputmode="decimal" id="v-pr" value="' + esc(e.prix_euros == null ? '' : String(e.prix_euros).replace('.', ',')) + '"></label></div>' +
      '<div id="v-qt"></div>' +
      '<label class="c"><input type="checkbox" id="v-n">Prévenir les familles concernées (messagerie + notification)</label><textarea class="f" id="v-nm" rows="3" maxlength="4000" placeholder="Message aux familles" hidden></textarea>' +
      '<div class="chips"><button class="btn" id="v-ok">Enregistrer</button><button class="btn line" id="v-an">Annuler</button>' + (nouveau ? '' : '<button class="btn ko" id="v-sup">Supprimer</button>') + '</div></div>', function (r) {
      lierChips(r);
      // Places par niveau : une case par groupe choisi
      var majQuotas = function () {
        all('[data-qt]', r).forEach(function (i) { if (i.value) quotas[i.dataset.qt] = i.value; else delete quotas[i.dataset.qt]; });
        var gs = lus(r, 'eg');
        $('v-qt').innerHTML = gs.length > 1 ? '<div class="sect" style="margin-top:6px">Places par niveau (facultatif)</div><div class="chips" style="gap:10px">' + gs.map(function (g) {
          return '<label class="l" style="width:120px">' + esc(nomGroupe(g).replace("CLOC'ARENA ", '')) + '<input class="f" type="number" min="1" data-qt="' + g + '" value="' + esc(quotas[g] || '') + '" placeholder="∞"></label>';
        }).join('') + '</div>' : '';
      };
      r.addEventListener('change', function (ev) { if (ev.target.name === 'eg') majQuotas(); });
      if (e.id) q(sb.from('evenement_quotas').select('groupe_id, places').eq('evenement_id', e.id)).then(function (l) { (l || []).forEach(function (x) { quotas[x.groupe_id] = String(x.places); }); majQuotas(); }).catch(majQuotas); else majQuotas();
      var majMsg = function () {
        var st = $('v-st').value, t = $('v-t').value.trim(), dd = combine($('v-d').value, $('v-h1').value);
        $('v-nm').value = st === 'annule' ? 'Annulé : ' + t + (dd ? ' du ' + fmtJ(dd) : '') : st === 'deplace' ? 'Changement : ' + t + (dd ? ', maintenant le ' + fmtJ(dd) + ' à ' + fmtH(dd) : '') : 'Nouveau : ' + t + (dd ? ' le ' + fmtJ(dd) + ' à ' + fmtH(dd) : '');
      };
      $('v-n').onchange = function () { $('v-nm').hidden = !this.checked; if (this.checked) majMsg(); };
      $('v-st').onchange = function () { if (!nouveau && this.value !== e.statut && this.value !== 'prevu') { $('v-n').checked = true; $('v-nm').hidden = false; majMsg(); } };
      $('v-an').onclick = fermer;
      if ($('v-sup')) $('v-sup').onclick = function () {
        if (!confirm('Supprimer définitivement cet événement et ses inscriptions ? Pour prévenir les familles, mieux vaut le passer en « Annulé ».')) return;
        q(sb.from('evenements').delete().eq('id', e.id)).then(function () { toast('Événement supprimé'); fermer(); charger(); }).catch(function () { toast('Suppression impossible'); });
      };
      $('v-ok').onclick = function () {
        var titre = $('v-t').value.trim(); if (!titre) return toast('Il faut un titre');
        var deb = combine($('v-d').value, $('v-h1').value); if (!deb || !$('v-h1').value) return toast('Indique la date et l\'heure de début');
        var fin = $('v-h2').value ? combine($('v-df').value || $('v-d').value, $('v-h2').value) : null;
        if (fin && fin <= deb) return toast('La fin doit être après le début');
        var pl = $('v-pl').value ? parseInt($('v-pl').value, 10) : null, pr = $('v-pr').value ? parseFloat($('v-pr').value.replace(',', '.')) : null;
        if (pl !== null && !(pl > 0)) return toast('Nombre de places invalide');
        if (pr !== null && isNaN(pr)) return toast('Prix invalide');
        var gs = lus(r, 'eg');
        all('[data-qt]', r).forEach(function (i) { if (i.value) quotas[i.dataset.qt] = i.value; else delete quotas[i.dataset.qt]; });
        var qts = gs.filter(function (g) { return quotas[g]; }).map(function (g) { return { groupe_id: g, places: parseInt(quotas[g], 10) }; });
        if (qts.some(function (x) { return !(x.places > 0); })) return toast('Nombre de places par niveau invalide');
        var row = { titre: titre, type: $('v-ty').value, statut: $('v-st').value, debut: deb.toISOString(), fin: fin ? fin.toISOString() : null, lieu: $('v-l').value.trim() || null,
          encadrant: $('v-en').value.trim() || null, objectif: $('v-o').value.trim() || null, description: $('v-x').value.trim() || null, public: $('v-p').checked,
          inscription_ouverte: $('v-io').checked, places_max: pl, prix_euros: pr, groupe_id: null };
        if (nouveau) row.created_by = A.user.id;
        $('v-ok').disabled = true;
        var id;
        (nouveau ? q(sb.from('evenements').insert(row).select('id').single()) : q(sb.from('evenements').update(row).eq('id', e.id).select('id').single())).then(function (x) {
          id = x.id; return q(sb.from('evenement_groupes').delete().eq('evenement_id', id));
        }).then(function () {
          return gs.length ? q(sb.from('evenement_groupes').insert(gs.map(function (g) { return { evenement_id: id, groupe_id: g }; }))) : null;
        }).then(function () {
          return q(sb.from('evenement_quotas').delete().eq('evenement_id', id));
        }).then(function () {
          return qts.length ? q(sb.from('evenement_quotas').insert(qts.map(function (x) { return { evenement_id: id, groupe_id: x.groupe_id, places: x.places }; }))) : null;
        }).then(function () {
          if ($('v-n').checked) diffuser({ titre: (row.statut === 'annule' ? 'Annulé · ' : row.statut === 'deplace' ? 'Changement · ' : '') + titre, texte: $('v-nm').value.trim() || titre, cible: 'evenement', evt: id, lien: '#/evenement/' + id, source: 'seance' });
          toast('Événement enregistré'); fermer(); charger();
        }).catch(function () { toast('Enregistrement impossible'); $('v-ok').disabled = false; });
      };
    });
  };
  chargerGroupes().then(function () { charger(); if (arg === 'nouveau') formEvt(null); });
}

// ---------- Inscriptions ----------
function vueInscriptions(m, arg) {
  m.innerHTML = entete('Inscriptions', 'Qui est inscrit, qui a payé.') + '<div class="toolbar"><select class="f grow" id="i-ev"><option value="">Chargement…</option></select></div><div id="i-l"></div>';
  Promise.all([q(sb.from('evenements').select('id, titre, debut, places_max, prix_euros, inscription_ouverte, groupe_id, evenement_groupes(groupe_id), evenement_quotas(groupe_id, places), inscriptions(count)').gte('debut', new Date(Date.now() - 60 * 864e5).toISOString()).order('debut')), chargerPers()]).then(function (r) {
    var l = r[0].filter(function (e) { return e.inscription_ouverte || (e.inscriptions[0] && e.inscriptions[0].count); });
    var sel = arg || (l.filter(function (e) { return new Date(e.debut) > new Date(); })[0] || l[l.length - 1] || {}).id;
    $('i-ev').innerHTML = l.length ? l.map(function (e) { var n = e.inscriptions[0] ? e.inscriptions[0].count : 0; return '<option value="' + e.id + '"' + (e.id === sel ? ' selected' : '') + '>' + esc(fmtJ(new Date(e.debut)) + ' · ' + e.titre + ' (' + n + (e.places_max ? '/' + e.places_max : '') + ')') + '</option>'; }).join('') : '<option value="">Aucun événement avec inscriptions</option>';
    $('i-ev').onchange = function () { location.hash = '#/inscriptions/' + this.value; };
    if (sel) liste(l.filter(function (e) { return e.id === sel; })[0] || r[0].filter(function (e) { return e.id === sel; })[0]);
  }).catch(function () { $('i-l').innerHTML = '<div class="card empty">Impossible de charger les inscriptions.</div>'; });
  var liste = function (ev) {
    if (!ev) return;
    Promise.all([q(sb.from('inscriptions').select('personne_id, statut, paye, created_at').eq('evenement_id', ev.id).order('created_at')), chargerGroupes()]).then(function (rr) {
      var ins = rr[0];
      var gids = [], qt = {}; if (ev.groupe_id) gids.push(ev.groupe_id); (ev.evenement_groupes || []).forEach(function (g) { if (gids.indexOf(g.groupe_id) < 0) gids.push(g.groupe_id); });
      (ev.evenement_quotas || []).forEach(function (x) { qt[x.groupe_id] = x.places; });
      var niveauDe = function (pid) { return gids.filter(function (g) { return A.pers.some(function (p) { return p.id === pid && (p.groupe_membres || []).some(function (m) { return m.groupe_id === g; }); }); })[0]; };
      var parNiv = gids.map(function (g) { var n = ins.filter(function (i) { return i.statut === 'inscrit' && niveauDe(i.personne_id) === g; }).length; return '<span class="badge" style="margin-right:6px">' + esc(nomGroupe(g).replace("CLOC'ARENA ", '')) + ' : ' + n + (qt[g] ? ' / ' + qt[g] : '') + '</span>'; }).join('');
      var pp = function (id) { return A.pers.filter(function (p) { return p.id === id; })[0] || { prenom: '?', nom: '' }; };
      var actifs = ins.filter(function (i) { return i.statut !== 'annule'; }), payes = actifs.filter(function (i) { return i.paye; }).length;
      $('i-l').innerHTML = '<div class="card" style="margin-bottom:12px"><span class="mut xs">Pour : </span>' + (gids.length ? parNiv : '<span class="badge">Tout le monde</span>') + '</div><div class="kpis"><div class="kpi"><b>' + actifs.length + (ev.places_max ? ' / ' + ev.places_max : '') + '</b><span>inscrits</span></div><div class="kpi"><b>' + payes + '</b><span>ont payé</span></div>' +
        (ev.prix_euros ? '<div class="kpi"><b>' + euros(payes * ev.prix_euros) + '</b><span>encaissé sur ' + euros(actifs.length * ev.prix_euros) + '</span></div>' : '') + '</div>' +
        '<div class="two"><div>' + (ins.length ? '<div class="tw"><table class="t"><thead><tr><th>Nom</th><th>Âge</th><th>État</th><th>Paiement</th><th></th></tr></thead><tbody>' + ins.map(function (i) {
          var p = pp(i.personne_id);
          return '<tr><td><b>' + esc(p.prenom + ' ' + p.nom) + '</b>' + (niveauDe(i.personne_id) ? '<div class="mut xs">' + esc(nomGroupe(niveauDe(i.personne_id)).replace("CLOC'ARENA ", '')) + '</div>' : '') + '</td><td class="small">' + age(p.date_naissance) + '</td><td>' + (i.statut === 'attente' ? '<span class="badge b-warn">Liste d\'attente</span>' : i.statut === 'annule' ? '<span class="badge">Annulé</span>' : '<span class="badge b-ok">Inscrit</span>') + '</td>' +
            '<td><label class="c"><input type="checkbox" data-ipaye="' + i.personne_id + '"' + (i.paye ? ' checked' : '') + '>' + (i.paye ? 'Payé' : 'À payer') + '</label></td><td class="act">' + (i.statut === 'attente' ? '<button class="btn sm line" data-ipass="' + i.personne_id + '">Passer inscrit</button> ' : '') + '<button class="btn sm ko" data-isup="' + i.personne_id + '">Retirer</button></td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="card empty">Aucun inscrit pour le moment.</div>') +
        '</div><div class="card stack"><b>Ajouter une inscription</b><span class="mut xs">Pour une inscription faite au club house ou par téléphone.</span>' + CHERCHEUR + '<button class="btn line" id="i-csv">Exporter la liste (Excel)</button></div></div>';
      var maj = function (pid, champs, msg) { q(sb.from('inscriptions').update(champs).eq('evenement_id', ev.id).eq('personne_id', pid)).then(function () { toast(msg); liste(ev); }).catch(function () { toast('Action impossible'); }); };
      all('[data-ipaye]').forEach(function (c) { c.onchange = function () { maj(c.dataset.ipaye, { paye: c.checked }, c.checked ? 'Paiement noté' : 'Paiement retiré'); }; });
      all('[data-ipass]').forEach(function (b) { b.onclick = function () { maj(b.dataset.ipass, { statut: 'inscrit' }, 'Passé en inscrit'); }; });
      all('[data-isup]').forEach(function (b) { b.onclick = function () { if (confirm('Retirer cette inscription ?')) q(sb.from('inscriptions').delete().eq('evenement_id', ev.id).eq('personne_id', b.dataset.isup)).then(function () { toast('Inscription retirée'); liste(ev); }); }; });
      chercheurPers($('i-l'), function (p) {
        if (ins.some(function (i) { return i.personne_id === p.id; })) return toast(p.prenom + ' est déjà inscrit(e)');
        q(sb.from('inscriptions').insert({ evenement_id: ev.id, personne_id: p.id, created_by: A.user.id })).then(function () { toast(p.prenom + ' inscrit(e)'); liste(ev); }).catch(function () { toast('Inscription impossible'); });
      });
      $('i-csv').onclick = function () {
        csv('inscrits-' + isoJour(new Date(ev.debut)) + '.csv', [['Prénom', 'Nom', 'Âge', 'État', 'Payé']].concat(ins.map(function (i) { var p = pp(i.personne_id); return [p.prenom, p.nom, age(p.date_naissance), i.statut, i.paye ? 'oui' : 'non']; })));
      };
    });
  };
}

// ---------- Adhérents ----------
var ADF = { t: '', profil: '', groupe: '', impayes: false };
// À qui est ce compte ? Un adulte = son propre compte (il voit sa fiche + les mineurs de la famille). Un parent sans fiche = compte famille.
function choisirTitulaire(c, foyer, pid, apres) {
  var membres = foyer ? A.pers.filter(function (p) { return p.foyer_id === foyer; }) : A.pers.filter(function (p) { return p.id === pid; });
  var majeur = function (p) { return p.date_naissance ? age(p.date_naissance) >= 18 : p.profil !== 'jeune'; };
  var adultes = membres.filter(majeur);
  panneau('Relier ' + c.email, '<div class="stack"><span class="mut small">' + (c.prenom ? 'Nom indiqué : <b>' + esc(c.prenom + ' ' + c.nom) + '</b>. ' : '') + 'À qui est ce compte ?</span>' +
    adultes.map(function (p) { return '<button class="btn line" data-tit="' + p.id + '" style="justify-content:flex-start">C\'est le compte de <b style="margin-left:4px">' + esc(p.prenom + ' ' + p.nom) + '</b></button>'; }).join('') +
    (foyer ? '<button class="btn line" data-tit="" style="justify-content:flex-start">Un parent qui n\'a pas de fiche adhérent</button>' : '') +
    '<span class="mut xs">Un adulte voit sa propre fiche et les mineurs de sa famille. Un compte parent voit les mineurs (et les adultes qui n\'ont pas leur propre compte).</span></div>', function (r) {
    all('[data-tit]', r).forEach(function (b) { b.onclick = function () {
      q(sb.rpc('compte_definir', { p_user: c.user_id, p_foyer: foyer || null, p_personne: b.dataset.tit || null })).then(function () { toast('Compte relié'); fermer(); if (apres) apres(); }).catch(function () { toast('Action impossible'); });
    }; });
  });
}
// Tous les comptes de l'appli : qui voit qui, avec les exceptions réglées à la main
var CAF = { t: '' };
function comptesAppli(focus) {
  Promise.all([q(sb.rpc('comptes_liste')), chargerPers()]).then(function (r) {
    var L = r[0] || [], P = {}; A.pers.forEach(function (p) { P[p.id] = p; });
    var nomP = function (id) { var p = P[id]; return p ? p.prenom + ' ' + p.nom : '?'; };
    var mineur = function (p) { return p.date_naissance ? age(p.date_naissance) < 18 : p.profil === 'jeune'; };
    var rendu = function () {
      var t = norm(CAF.t).trim();
      var l = L.filter(function (c) { return !t || norm(c.email + ' ' + (c.prenom || '') + ' ' + (c.nom || '') + ' ' + (c.personne_id ? nomP(c.personne_id) : '') + ' ' + c.voit.map(nomP).join(' ')).indexOf(t) >= 0; });
      return '<input class="f" id="caf-q" placeholder="Chercher un compte, un nom…" value="' + esc(CAF.t) + '">' + l.map(function (c) {
        var fam = c.foyer_id ? A.pers.filter(function (p) { return p.foyer_id === c.foyer_id; }) : [];
        var cand = fam.concat(c.voit.filter(function (id) { return !fam.some(function (p) { return p.id === id; }); }).map(function (id) { return P[id]; }).filter(Boolean));
        return '<div class="card stack" style="gap:8px" data-caf="' + c.user_id + '"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><b class="small" style="word-break:break-all">' + esc(c.email) + '</b>' +
          '<div class="xs mut">' + (c.personne_id ? 'Compte de <b>' + esc(nomP(c.personne_id)) + '</b>' : c.foyer_id ? 'Compte famille (parent)' : 'Pas encore relié') + (c.prenom ? ' · nom indiqué : ' + esc(c.prenom + ' ' + c.nom) : '') + '</div></div>' +
          '<span style="display:flex;gap:6px"><button class="btn sm line" data-cft="' + c.user_id + '">' + (c.foyer_id || c.personne_id ? 'Changer' : 'Relier') + '</button><button class="btn sm ko" data-cfx="' + c.user_id + '">Supprimer</button></span></div>' +
          (cand.length ? '<div class="xs mut">Ce compte voit :</div><div class="chips" style="flex-wrap:wrap">' + cand.map(function (p) {
            var on = c.voit.indexOf(p.id) >= 0;
            return '<label class="chip' + (on ? ' on' : '') + '" style="cursor:pointer"><input type="checkbox" data-cfv="' + c.user_id + '|' + p.id + '"' + (on ? ' checked' : '') + ' hidden>' + esc(p.prenom + ' ' + p.nom) + (mineur(p) ? ' <span class="xs">(mineur)</span>' : '') + '</label>';
          }).join('') + '</div>' : '') +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><div data-cfa="' + c.user_id + '" style="flex:1;min-width:220px">' + CHERCHEUR.replace('Rechercher un adhérent (2 lettres minimum)', 'Lui faire voir quelqu\'un d\'autre…') + '</div>' +
          (c.exceptions ? '<button class="btn sm ghost" data-cfr="' + c.user_id + '">Revenir au réglage normal (' + c.exceptions + ' exception' + (c.exceptions > 1 ? 's' : '') + ')</button>' : '') + '</div></div>';
      }).join('') + (l.length ? '' : '<div class="card empty">Aucun compte.</div>');
    };
    panneau('Comptes de l\'appli (' + L.length + ')', '<div class="stack"><span class="mut small">Règle : un adulte a son propre compte et voit sa fiche + les mineurs de sa famille. Les messages, notifications et l\'agenda suivent la même règle. Coche ou décoche pour faire une exception.</span><div id="caf-l" class="stack">' + rendu() + '</div></div>', function (root) {
      var lier = function () {
        $('caf-q').oninput = function () { CAF.t = this.value; var pos = this.selectionStart; $('caf-l').innerHTML = rendu(); lier(); $('caf-q').focus(); $('caf-q').setSelectionRange(pos, pos); };
        all('[data-cft]', root).forEach(function (b) { b.onclick = function () {
          var c = L.filter(function (x) { return x.user_id === b.dataset.cft; })[0];
          if (c.foyer_id || c.personne_id) choisirTitulaire(c, c.foyer_id, c.personne_id, function () { comptesAppli(); });
          else { fermer(); comptesARattacher(); }
        }; });
        all('[data-cfv]', root).forEach(function (i) { i.onchange = function () {
          var x = i.dataset.cfv.split('|');
          q(sb.from('compte_visibilite').upsert({ user_id: x[0], personne_id: x[1], voit: i.checked })).then(function () { toast(i.checked ? 'Ajouté à ce compte' : 'Retiré de ce compte'); comptesAppli(); }).catch(function () { toast('Action impossible'); });
        }; });
        all('[data-cfx]', root).forEach(function (b) { b.onclick = function () { supprimerCompte(L.filter(function (x) { return x.user_id === b.dataset.cfx; })[0], function () { comptesAppli(); }); }; });
        all('[data-cfr]', root).forEach(function (b) { b.onclick = function () { q(sb.from('compte_visibilite').delete().eq('user_id', b.dataset.cfr)).then(function () { toast('Réglage normal rétabli'); comptesAppli(); }); }; });
        all('[data-cfa]', root).forEach(function (box) { chercheurPers(box, function (p) {
          q(sb.from('compte_visibilite').upsert({ user_id: box.dataset.cfa, personne_id: p.id, voit: true })).then(function () { toast(p.prenom + ' ajouté à ce compte'); comptesAppli(); });
        }); });
      };
      lier();
    });
  }).catch(function () { toast('Liste indisponible'); });
}

function supprimerCompte(c, apres) {
  if (!confirm('Supprimer le compte ' + c.email + ' ?\n\nLa personne ne pourra plus se connecter avec cette adresse (elle pourra en recréer un plus tard si besoin). Rien d\'autre n\'est effacé.')) return;
  q(sb.rpc('compte_supprimer', { p_user: c.user_id })).then(function () { toast('Compte supprimé'); if (apres) apres(); })
    .catch(function (e) { toast(String(e && e.message || '').indexOf('rôle') >= 0 ? 'Ce compte a un rôle : retire-le d\'abord' : 'Suppression impossible'); });
}
// Comptes créés dans l'appli mais pas encore reliés à une famille : nom déclaré + suggestions
function comptesARattacher() {
  Promise.all([q(sb.rpc('comptes_a_rattacher')), chargerPers()]).then(function (r) {
    var L = r[0] || [];
    var QUAL = { parent: 'Parent', adherent: 'Adhérent', les_deux: 'Parent et adhérent', coach: 'Coach', autre: 'Autre' };
    var mots = function (x) { return norm(x || '').split(/[^a-z]+/).filter(function (m) { return m.length > 1 && ['et', 'de', 'du', 'la', 'le', 'les'].indexOf(m) < 0; }); };
    var sugg = function (c) {
      var noms = mots(c.nom).concat(mots(c.enfants)), pre = mots(c.enfants).concat(mots(c.prenom)), mail = mots(String(c.email).split('@')[0]);
      var sc = {};
      A.pers.forEach(function (p) {
        var n = mots(p.nom), pr = mots(p.prenom), s2 = 0;
        if (n.some(function (m) { return noms.indexOf(m) >= 0; })) s2 += 3;
        if (n.some(function (m) { return mail.indexOf(m) >= 0 || String(c.email).toLowerCase().indexOf(m) >= 0 && m.length > 3; })) s2 += 2;
        if (pr.some(function (m) { return pre.indexOf(m) >= 0; })) s2 += 2;
        if (p.email && String(p.email).toLowerCase() === String(c.email).toLowerCase()) s2 += 10;
        if (s2 >= 3) { var k = p.foyer_id || p.id; sc[k] = sc[k] || { k: k, foyer: p.foyer_id, pid: p.id, s: 0, l: [] }; sc[k].s = Math.max(sc[k].s, s2); sc[k].l.push(p); }
      });
      return Object.keys(sc).map(function (k) { return sc[k]; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 3);
    };
    var lier = function (c, x) { choisirTitulaire(c, x.foyer, x.pid, comptesARattacher); };
    panneau('Comptes à rattacher (' + L.length + ')', '<div class="stack"><span class="mut small">Ces personnes se sont connectées à l\'appli, mais leur adresse n\'est reliée à aucun adhérent. Elles indiquent leur nom à la première connexion : choisis la bonne famille, et leur agenda s\'affiche aussitôt.</span>' +
      (L.length ? L.map(function (c, i) {
        var sg = sugg(c);
        return '<div class="card stack" style="gap:8px"><div><b>' + (c.prenom ? esc(c.prenom + ' ' + c.nom) : '<span class="mut">Nom pas encore indiqué</span>') + '</b>' + (c.qualite ? ' <span class="badge">' + QUAL[c.qualite] + '</span>' : '') +
          '<div class="xs mut">' + esc(c.email) + ' · inscrit le ' + esc(fmtJour(new Date(c.created_at))) + '</div>' + (c.enfants ? '<div class="small">Enfants : <b>' + esc(c.enfants) + '</b></div>' : '') + '</div>' +
          (sg.length ? '<div class="stack" style="gap:6px"><span class="xs mut">Suggestions :</span>' + sg.map(function (x, j) { return '<button class="btn sm line" data-rsug="' + i + '|' + j + '" style="justify-content:flex-start;text-align:left">Relier à ' + (x.foyer ? 'la famille ' : '') + esc(x.l.map(function (p) { return p.prenom + ' ' + p.nom; }).join(', ')) + '</button>'; }).join('') + '</div>' : '') +
          '<div style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap"><div data-rch="' + i + '" style="flex:1;min-width:200px">' + CHERCHEUR + '</div><button class="btn sm ko" data-rsup="' + i + '">Supprimer ce compte</button></div></div>';
      }).join('') : '<div class="card empty">Tous les comptes sont rattachés. 👍</div>') + '</div>', function (root) {
      L.forEach(function (c, i) {
        var sg = sugg(c);
        all('[data-rsug^="' + i + '|"]', root).forEach(function (b) { b.onclick = function () { lier(c, sg[+b.dataset.rsug.split('|')[1]]); }; });
        var sup = root.querySelector('[data-rsup="' + i + '"]');
        if (sup) sup.onclick = function () { supprimerCompte(c, comptesARattacher); };
        var box = root.querySelector('[data-rch="' + i + '"]');
        if (box) chercheurPers(box, function (p) { if (confirm('Relier ' + c.email + ' à ' + (p.foyer_id ? 'la famille de ' : '') + p.prenom + ' ' + p.nom + ' ?')) lier(c, { foyer: p.foyer_id, pid: p.id }); });
      });
    });
  }).catch(function () { toast('Liste indisponible'); });
}

function vueAdherents(m, arg) {
  if (arg === 'impayes') ADF.impayes = true;
  setTimeout(function () { q(sb.rpc('comptes_a_rattacher')).then(function (l) { if ($('ad-ratn') && l && l.length) { $('ad-ratn').textContent = l.length; $('ad-ratn').hidden = false; } if (arg === 'rattacher') comptesARattacher(); }).catch(function () { }); });
  m.innerHTML = entete('Adhérents', 'Fiches, familles, groupes et cotisations.', '<button class="btn line" id="ad-cpt">Comptes de l\'appli</button><button class="btn line" id="ad-rat">Comptes à rattacher<span class="n" id="ad-ratn" hidden style="margin-left:6px"></span></button><button class="btn line" id="ad-csv">Exporter</button>' + (aRole(['direction', 'bureau', 'accueil']) ? '<button class="btn" id="ad-new">Nouvel adhérent</button>' : '')) +
    '<div class="toolbar"><input class="f grow" id="ad-q" placeholder="Rechercher un nom, un prénom…" value="' + esc(ADF.t) + '">' +
    '<select class="f" id="ad-p" style="width:auto"><option value="">Jeunes et adultes</option><option value="jeune"' + (ADF.profil === 'jeune' ? ' selected' : '') + '>Jeunes</option><option value="adulte"' + (ADF.profil === 'adulte' ? ' selected' : '') + '>Adultes</option></select>' +
    '<select class="f" id="ad-g" style="width:auto"><option value="">Tous les groupes</option></select>' +
    '<label class="c"><input type="checkbox" id="ad-i"' + (ADF.impayes ? ' checked' : '') + '>Cotisation pas à jour</label></div><div id="ad-l"><div class="skel"></div></div>';
  var filtrer = function () {
    var t = norm(ADF.t).trim();
    return A.pers.filter(function (p) {
      return p.actif !== false && (!t || norm(p.prenom + ' ' + p.nom + ' ' + p.nom + ' ' + p.prenom).indexOf(t) >= 0) && (!ADF.profil || p.profil === ADF.profil) &&
        (!ADF.groupe || (p.groupe_membres || []).some(function (g) { return g.groupe_id === ADF.groupe; })) && (!ADF.impayes || !p.cotisation_a_jour);
    });
  };
  var dessiner = function () {
    var l = filtrer();
    $('ad-l').innerHTML = '<p class="mut small">' + l.length + ' personne' + (l.length > 1 ? 's' : '') + '</p>' + (l.length ? '<div class="tw"><table class="t"><thead><tr><th>Nom</th><th>Âge</th><th>Cours</th><th>Groupes</th><th>Cotisation</th></tr></thead><tbody>' + l.slice(0, 400).map(function (p) {
      var gs = (p.groupe_membres || []).map(function (g) { return nomGroupe(g.groupe_id); }).filter(function (n) { return n !== 'Jeunes' && n !== 'Adultes' && n.indexOf('Galaxie') < 0 && n.indexOf('cours') < 0; });
      return '<tr class="click" data-p="' + p.id + '"><td><b>' + esc(p.nom) + '</b> ' + esc(p.prenom) + (p.arena_id ? ' <span class="badge">Arena</span>' : '') + '</td><td class="small">' + age(p.date_naissance) + '</td><td class="small mut">' + esc(String(p.cours || '').split(' | ')[0]) + '</td>' +
        '<td class="small">' + esc(gs.map(function (n) { return n.replace("CLOC'ARENA ", ''); }).join(', ')) + '</td><td>' + (p.cotisation_a_jour ? '<span class="badge b-ok">À jour</span>' : '<span class="badge b-ac">Pas à jour</span>') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="card empty">Personne ne correspond.</div>');
    all('[data-p]').forEach(function (tr) { tr.onclick = function () { fiche(tr.dataset.p); }; });
  };
  var fiche = function (id) {
    var p = A.pers.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    Promise.all([
      p.foyer_id ? q(sb.from('personnes').select('id, prenom, nom, date_naissance').eq('foyer_id', p.foyer_id)) : Promise.resolve([p]),
      p.foyer_id ? q(sb.from('acces_emails').select('email, personne_id').eq('foyer_id', p.foyer_id)) : Promise.resolve([]),
      p.foyer_id ? q(sb.from('comptes').select('email, created_at').eq('foyer_id', p.foyer_id)) : Promise.resolve([])
    ]).then(function (r) {
      var estNiv = function (id) { var g = A.groupes.filter(function (x) { return x.id === id; })[0]; return g && g.type === 'niveau'; };
      var gsel = (p.groupe_membres || []).map(function (g) { return g.groupe_id; }).filter(function (id) { return !estNiv(id); });
      panneau(p.prenom + ' ' + p.nom, '<div class="stack">' +
        '<div class="card small">' + (p.date_naissance ? 'Né(e) le ' + esc(fmtJour(new Date(p.date_naissance + 'T12:00:00'))) + ' · ' + age(p.date_naissance) + ' ans<br>' : '') + (p.adoc_id ? 'Licence ' + esc(p.adoc_id) + '<br>' : '') + (p.email ? 'Mail : ' + esc(p.email) + '<br>' : '') + (p.cours ? 'Cours ADOC : ' + esc(p.cours) : '') + '</div>' +
        '<label class="c"><input type="checkbox" id="f-c"' + (p.cotisation_a_jour ? ' checked' : '') + '>Cotisation à jour</label>' +
        '<label class="l">Niveau CLOC\'ARENA' + (aRole('direction') ? '' : ' (modifiable par la direction sportive)') + '<select class="f" id="f-n"' + (aRole('direction') ? '' : ' disabled') + '><option value="">Aucun</option>' + ['Blanc', 'Violet', 'Rouge', 'Orange', 'Vert', 'Jaune'].map(function (n) { return '<option' + (p.niveau_arena === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>' +
        '<div class="sect">Groupes</div><span class="mut xs">Le groupe CLOC\'ARENA suit automatiquement le niveau choisi au-dessus.</span>' + choixGroupes(gsel, 'fg', 'niveau') + '<button class="btn" id="f-ok">Enregistrer</button>' +
        '<div class="sect">Famille</div><div class="card list">' + r[0].map(function (x) { return '<div class="it"><span>' + esc(x.prenom + ' ' + x.nom) + '</span><span class="mut xs">' + age(x.date_naissance) + ' ans</span></div>'; }).join('') + '</div>' +
        '<div class="sect">Adresses qui ouvrent l\'espace famille</div><div class="card list">' + (r[1].length ? r[1].map(function (a) {
          var c = r[2].filter(function (x) { return x.email === a.email; })[0];
          return '<div class="it"><span class="small">' + esc(a.email) + '<br><span class="mut xs">' + (c ? 'Connecté depuis le ' + esc(fmtJour(new Date(c.created_at))) : 'Jamais connecté') + '</span></span><button class="btn sm ko" data-fdel="' + esc(a.email) + '">Retirer</button></div>';
        }).join('') : '<div class="it mut small">Aucune adresse.</div>') + '</div>' +
        '<div class="toolbar"><input class="f grow" id="f-mail" type="email" placeholder="Ajouter une adresse (parent, joueur)"><button class="btn line" id="f-add">Ajouter</button></div>' +
        '<span class="mut xs">La personne se connecte ensuite à l\'appli avec cette adresse et voit toute la famille.</span></div>', function (root) {
        lierChips(root);
        $('f-ok').onclick = function () {
          var gs = lus(root, 'fg'), avant = gsel;
          var ajout = gs.filter(function (g) { return avant.indexOf(g) < 0; }), retrait = avant.filter(function (g) { return gs.indexOf(g) < 0; });
          $('f-ok').disabled = true;
          var ch = { cotisation_a_jour: $('f-c').checked }; if (aRole('direction') && ($('f-n').value || null) !== (p.niveau_arena || null)) ch.niveau_arena = $('f-n').value || null;
          q(sb.from('personnes').update(ch).eq('id', p.id)).then(function () {
            return ajout.length ? q(sb.from('groupe_membres').insert(ajout.map(function (g) { return { groupe_id: g, personne_id: p.id }; }))) : null;
          }).then(function () {
            return retrait.length ? q(sb.from('groupe_membres').delete().eq('personne_id', p.id).in('groupe_id', retrait)) : null;
          }).then(function () { toast('Fiche enregistrée'); return chargerPers(true); }).then(function () { fermer(); dessiner(); }).catch(function () { toast('Enregistrement impossible'); $('f-ok').disabled = false; });
        };
        all('[data-fdel]').forEach(function (b) { b.onclick = function () { if (confirm('Cette adresse ne pourra plus ouvrir l\'espace famille. Continuer ?')) q(sb.from('acces_emails').delete().eq('email', b.dataset.fdel)).then(function () { toast('Adresse retirée'); fiche(id); }); }; });
        $('f-add').onclick = function () {
          var mail = $('f-mail').value.trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return toast('Adresse invalide');
          if (!p.foyer_id) return toast('Cette personne n\'a pas de famille : crée-la d\'abord');
          q(sb.from('acces_emails').upsert({ email: mail, foyer_id: p.foyer_id })).then(function () { toast('Adresse ajoutée'); fiche(id); }).catch(function () { toast('Ajout impossible'); });
        };
      });
    });
  };
  var nouveau = function () {
    panneau('Nouvel adhérent', '<div class="stack"><div class="row2"><label class="l">Prénom<input class="f" id="n-p"></label><label class="l">Nom<input class="f" id="n-n"></label></div>' +
      '<div class="row3"><label class="l">Né(e) le<input class="f" type="date" id="n-d"></label><label class="l">Sexe<select class="f" id="n-s"><option value="F">Fille / femme</option><option value="M">Garçon / homme</option></select></label><label class="l">Licence (facultatif)<input class="f" id="n-l"></label></div>' +
      '<div class="sect">Famille</div><label class="c"><input type="radio" name="n-f" value="new" checked>Nouvelle famille</label><label class="c"><input type="radio" name="n-f" value="old">Ajouter à la famille d\'un adhérent</label>' +
      '<div id="n-old" hidden>' + CHERCHEUR + '<p class="small" id="n-fam"></p></div>' +
      '<label class="l">Adresse mail du parent ou de l\'adhérent (pour se connecter)<input class="f" type="email" id="n-m"></label>' +
      '<button class="btn" id="n-ok">Créer</button></div>', function (root) {
      var foyer = null;
      all('input[name="n-f"]', root).forEach(function (r) { r.onchange = function () { $('n-old').hidden = r.value !== 'old' || !r.checked; }; });
      chercheurPers(root, function (x) { foyer = x.foyer_id; $('n-fam').textContent = x.foyer_id ? 'Famille de ' + x.prenom + ' ' + x.nom : x.prenom + ' n\'a pas encore de famille.'; });
      $('n-ok').onclick = function () {
        var pr = $('n-p').value.trim(), no = $('n-n').value.trim().toUpperCase(), dn = $('n-d').value, mail = $('n-m').value.trim().toLowerCase();
        if (!pr || !no || !dn) return toast('Prénom, nom et date de naissance sont nécessaires');
        if (mail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return toast('Adresse invalide');
        var vieux = root.querySelector('input[name="n-f"]:checked').value === 'old';
        if (vieux && !foyer) return toast('Choisis l\'adhérent dont tu rejoins la famille');
        var majeur = age(dn) >= 18;
        $('n-ok').disabled = true;
        var f = vieux ? Promise.resolve({ id: foyer }) : q(sb.from('foyers').insert({ nom: no, cle: 'M:' + (mail || (no + '-' + Date.now())) }).select('id').single());
        var pid;
        f.then(function (fo) {
          foyer = fo.id;
          return q(sb.from('personnes').insert({ prenom: pr, nom: no, date_naissance: dn, sexe: $('n-s').value, profil: majeur ? 'adulte' : 'jeune', foyer_id: foyer, adoc_id: $('n-l').value.trim() || null, email: majeur && mail ? mail : null, cotisation_a_jour: true, actif: true }).select('id').single());
        }).then(function (pe) {
          pid = pe.id;
          var g = A.groupes.filter(function (x) { return x.nom === (majeur ? 'Adultes' : 'Jeunes'); })[0];
          return g ? q(sb.from('groupe_membres').insert({ groupe_id: g.id, personne_id: pid })) : null;
        }).then(function () {
          return mail ? q(sb.from('acces_emails').upsert({ email: mail, foyer_id: foyer, personne_id: majeur ? pid : null })) : null;
        }).then(function () { toast(pr + ' ajouté(e)'); return chargerPers(true); }).then(function () { fermer(); fiche(pid); dessiner(); })
          .catch(function () { toast('Création impossible'); $('n-ok').disabled = false; });
      };
    });
  };
  Promise.all([chargerPers(), chargerGroupes()]).then(function () {
    $('ad-g').innerHTML = '<option value="">Tous les groupes</option>' + A.groupes.map(function (g) { return '<option value="' + g.id + '"' + (ADF.groupe === g.id ? ' selected' : '') + '>' + esc(g.nom) + '</option>'; }).join('');
    $('ad-q').oninput = function () { ADF.t = this.value; dessiner(); };
    $('ad-p').onchange = function () { ADF.profil = this.value; dessiner(); };
    $('ad-g').onchange = function () { ADF.groupe = this.value; dessiner(); };
    $('ad-i').onchange = function () { ADF.impayes = this.checked; dessiner(); };
    if ($('ad-new')) $('ad-new').onclick = nouveau;
    $('ad-rat').onclick = comptesARattacher;
    $('ad-cpt').onclick = function () { comptesAppli(); };
    $('ad-csv').onclick = function () {
      csv('adherents.csv', [['Nom', 'Prénom', 'Date de naissance', 'Âge', 'Profil', 'Licence', 'Cours', 'Groupes', 'Cotisation à jour']].concat(filtrer().map(function (p) {
        return [p.nom, p.prenom, p.date_naissance, age(p.date_naissance), p.profil, p.adoc_id, p.cours, (p.groupe_membres || []).map(function (g) { return nomGroupe(g.groupe_id); }).join(', '), p.cotisation_a_jour ? 'oui' : 'non'];
      })));
    };
    dessiner();
  }).catch(function () { $('ad-l').innerHTML = '<div class="card empty">Impossible de charger les adhérents.</div>'; });
}

// ---------- Mise à jour depuis ADOC ----------
// ADOC n'a pas d'accès direct pour les logiciels extérieurs : on dépose l'export Excel, l'outil compare et met à jour.
// Ce qui vient d'ADOC : identité, date de naissance, licence, mails, cours, solde. Tout le reste reste géré dans l'appli.
var XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
function chargerXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise(function (ok, ko) { var s = document.createElement('script'); s.src = XLSX_URL; s.onload = function () { ok(window.XLSX); }; s.onerror = ko; document.head.appendChild(s); });
}
function cle(s) { return norm(s).replace(/[^a-z]/g, ''); }
function coursPropre(c) {
  if (!c) return null;
  var out = String(c).split(', A_').map(function (x) {
    x = x.trim().replace(/^A_/, '').replace(/\s*\((Adhérent|Réservation Mineur)\)\s*$/, '').replace(/\s+/g, ' ').trim();
    return x ? x.charAt(0) + x.slice(1).toLowerCase() : '';
  }).filter(Boolean);
  return out.length ? out.join(' | ') : null;
}
function lireAdoc(XLSX, buf) {
  var wb = XLSX.read(buf, { type: 'array', cellDates: true });
  var ws = wb.Sheets['Détaillé'] || wb.Sheets[wb.SheetNames.filter(function (n) { return /d.taill/i.test(n); })[0]] || wb.Sheets[wb.SheetNames[0]];
  var rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  var hi = -1; for (var i = 0; i < Math.min(rows.length, 6); i++) { if (rows[i].indexOf('Licence') >= 0 && rows[i].indexOf('Nom') >= 0) { hi = i; break; } }
  if (hi < 0) throw new Error('format');
  var H = rows[hi], col = function (n) { return H.indexOf(n); };
  var C = { fam: col('Famille'), nom: col('Nom'), pre: col('Prénom'), civ: col('Civilité'), dn: col('Date Naiss.'), m1: col('Email'), m2: col('2eme Email'), lic: col('Licence'), cours: col('Enseignement (Cours)'), solde: col('Solde') };
  if (C.lic < 0 || C.nom < 0 || C.pre < 0) throw new Error('format');
  var date = function (v) {
    if (!v) return null;
    if (v instanceof Date) return isoJour(new Date(v.getTime() + 12 * 3600e3));
    var m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})/); return m ? m[3] + '-' + m[2] + '-' + m[1] : null;
  };
  return rows.slice(hi + 1).filter(function (r) { return r[C.nom] && r[C.lic]; }).map(function (r) {
    var mail = function (k) { var v = C[k] >= 0 && r[C[k]] ? String(r[C[k]]).trim().toLowerCase() : ''; return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? v : null; };
    var m1 = mail('m1');
    return {
      licence: String(r[C.lic]).trim(), nom: String(r[C.nom]).trim(), prenom: String(r[C.pre]).trim(), sexe: r[C.civ] === 'Madame' ? 'F' : 'M',
      naiss: date(r[C.dn]), email: m1, email2: mail('m2'), cours: C.cours >= 0 ? coursPropre(r[C.cours]) : null,
      solde: C.solde >= 0 ? (parseFloat(r[C.solde]) || 0) : 0, foyerCle: r[C.fam] ? 'F:' + cle(r[C.fam]) : (m1 ? 'M:' + m1 : 'L:' + String(r[C.lic]).trim()),
      foyerNom: String(r[C.fam] || r[C.nom]).trim()
    };
  });
}
function vueAdoc(m) {
  m.innerHTML = entete('Mise à jour depuis ADOC', 'Dépose l\'export ADOC : l\'appli te montre les changements avant de les appliquer.') +
    '<div class="two"><div class="card stack"><b>1. Exporter depuis ADOC</b><span class="small">Dans ADOC : <b>Adhérents → Gestion → Résultats</b>, puis le bouton <b>Excel</b>. Tu obtiens un fichier <i>export.xls</i>.</span>' +
    '<b>2. Le déposer ici</b><input class="f" type="file" id="ad-f" accept=".xls,.xlsx"><div id="ad-r"></div></div>' +
    '<div class="card stack"><b>Ce que fait la mise à jour</b><span class="small">• Ajoute les nouveaux adhérents et leur famille.<br>• Met à jour nom, prénom, date de naissance, cours et cotisation (solde) des adhérents existants, retrouvés par leur licence.<br>• Ajoute les adresses mail qui ouvrent l\'espace famille.<br>• Range chacun dans les groupes de ses cours.</span>' +
    '<b>Ce qu\'elle ne touche jamais</b><span class="small">Niveaux CLOC\'ARENA, points et matchs, autres groupes, rôles, cordage, inscriptions. Ce que tu gères dans l\'appli reste à toi.</span>' +
    '<span class="mut xs">Rien n\'est envoyé vers ADOC : les changements faits dans l\'appli restent dans l\'appli. Les adresses et téléphones de l\'export ne sont pas importés.</span></div></div>';
  $('ad-f').onchange = function () {
    var f = this.files[0]; if (!f) return;
    $('ad-r').innerHTML = '<div class="skel"></div>';
    Promise.all([chargerXlsx(), f.arrayBuffer(), chargerPers(true), chargerGroupes(true), q(sb.from('foyers').select('id, cle, nom')), q(sb.from('acces_emails').select('email, foyer_id'))]).then(function (r) {
      var lignes;
      try { lignes = lireAdoc(r[0], r[1]); } catch (e) { $('ad-r').innerHTML = '<p class="small" style="color:var(--ko)">Ce fichier ne ressemble pas à un export ADOC (feuille « Détaillé » avec une colonne « Licence »).</p>'; return; }
      comparer(lignes, r[4] || [], r[5] || []);
    }).catch(function () { $('ad-r').innerHTML = '<p class="small" style="color:var(--ko)">Lecture impossible. Vérifie ta connexion et réessaie.</p>'; });
  };
  var comparer = function (lignes, foyers, acces) {
    var parLic = {}, parNom = {}; A.pers.forEach(function (p) { if (p.adoc_id) parLic[p.adoc_id] = p; else parNom[cle(p.nom) + '|' + cle(p.prenom)] = p; });
    var nouveaux = [], lies = [], modifs = [], vus = {};
    lignes.forEach(function (l) {
      vus[l.licence] = true;
      var p = parLic[l.licence];
      if (!p) { var x = parNom[cle(l.nom) + '|' + cle(l.prenom)]; if (x) { lies.push({ l: l, p: x }); return; } nouveaux.push(l); return; }
      var d = [];
      if (p.nom !== l.nom) d.push('nom'); if (p.prenom !== l.prenom) d.push('prénom');
      if (l.naiss && p.date_naissance !== l.naiss) d.push('naissance');
      if ((p.cours || null) !== l.cours) d.push('cours');
      if (!!p.cotisation_a_jour !== (l.solde >= 0)) d.push(l.solde >= 0 ? 'cotisation réglée' : 'solde négatif');
      if (p.actif === false) d.push('réactivé');
      if (d.length) modifs.push({ l: l, p: p, d: d });
    });
    var partis = A.pers.filter(function (p) { return p.adoc_id && p.actif !== false && !vus[p.adoc_id]; });
    var mailsConnus = {}; acces.forEach(function (a) { mailsConnus[a.email] = 1; });
    var nbMails = 0; lignes.forEach(function (l) { [l.email, l.email2].forEach(function (mm) { if (mm && !mailsConnus[mm]) { mailsConnus[mm] = 1; nbMails++; } }); });
    var liste = function (t, arr, f) { return arr.length ? '<details' + (arr.length < 12 ? ' open' : '') + '><summary class="small"><b>' + t + ' (' + arr.length + ')</b></summary><div class="small mut" style="margin:6px 0 0 14px">' + arr.slice(0, 200).map(f).join('<br>') + '</div></details>' : ''; };
    $('ad-r').innerHTML = '<div class="kpis" style="margin:8px 0"><div class="kpi"><b>' + lignes.length + '</b><span>dans l\'export</span></div><div class="kpi"><b>' + (nouveaux.length + lies.length) + '</b><span>nouveaux</span></div><div class="kpi"><b>' + modifs.length + '</b><span>à mettre à jour</span></div><div class="kpi"><b>' + nbMails + '</b><span>nouvelles adresses</span></div></div>' +
      liste('Nouveaux adhérents', nouveaux, function (l) { return esc(l.prenom + ' ' + l.nom) + (l.cours ? ' · ' + esc(l.cours) : ''); }) +
      liste('Déjà dans l\'appli sans licence, rattachés à ADOC', lies, function (x) { return esc(x.l.prenom + ' ' + x.l.nom); }) +
      liste('Mises à jour', modifs, function (x) { return esc(x.l.prenom + ' ' + x.l.nom) + ' : ' + esc(x.d.join(', ')); }) +
      (partis.length ? liste('Dans l\'appli mais plus dans l\'export', partis, function (p) { return esc(p.prenom + ' ' + p.nom); }) + '<label class="c"><input type="checkbox" id="ad-partis">Les passer en « ancien adhérent » (ils disparaissent des listes, leur historique CLOC\'ARENA est gardé)</label><span class="mut xs">Ne coche que si ton export contient bien tous les adhérents de la saison.</span>' : '') +
      (nouveaux.length + lies.length + modifs.length + nbMails + partis.length ? '<button class="btn" id="ad-go">Appliquer la mise à jour</button>' : '<p class="small" style="color:var(--ok)">Tout est déjà à jour.</p>');
    if ($('ad-go')) $('ad-go').onclick = function () { appliquer(lignes, nouveaux, lies, modifs, $('ad-partis') && $('ad-partis').checked ? partis : [], foyers); };
  };
  var appliquer = function (lignes, nouveaux, lies, modifs, partis, foyers) {
    var b = $('ad-go'); b.disabled = true;
    var etape = function (t) { b.textContent = t; };
    var foyerDe = {}; foyers.forEach(function (f) { if (f.cle) foyerDe[f.cle] = f.id; });
    var jeune = function (dn) { return dn ? age(dn) < 18 : false; };
    var gJ = A.groupes.filter(function (g) { return g.nom === 'Jeunes'; })[0], gA = A.groupes.filter(function (g) { return g.nom === 'Adultes'; })[0];
    var suite = Promise.resolve(), nbErr = 0, places = 0;
    var seq = function (arr, fn) { arr.forEach(function (x) { suite = suite.then(function () { return fn(x); }).catch(function () { nbErr++; }); }); };
    // 1. Familles manquantes
    var aCreer = {}; nouveaux.concat(lies.map(function (x) { return x.l; })).forEach(function (l) { if (!foyerDe[l.foyerCle]) aCreer[l.foyerCle] = l.foyerNom; });
    etape('Familles…');
    seq(Object.keys(aCreer), function (k) { return q(sb.from('foyers').insert({ cle: k, nom: aCreer[k] }).select('id').single()).then(function (f) { foyerDe[k] = f.id; }); });
    // 2. Nouveaux adhérents
    seq(nouveaux, function (l) {
      etape('Ajout de ' + l.prenom + '…');
      var j = jeune(l.naiss);
      return q(sb.from('personnes').insert({ adoc_id: l.licence, nom: l.nom, prenom: l.prenom, sexe: l.sexe, date_naissance: l.naiss, foyer_id: foyerDe[l.foyerCle], cours: l.cours, profil: j ? 'jeune' : 'adulte', email: j ? null : l.email, cotisation_a_jour: l.solde >= 0, actif: true }).select('id').single())
        .then(function (p) { var g = j ? gJ : gA; return g ? q(sb.from('groupe_membres').insert({ groupe_id: g.id, personne_id: p.id })) : null; });
    });
    // 3. Fiches existantes rattachées ou mises à jour (le niveau CLOC'ARENA n'est jamais touché)
    seq(lies, function (x) { var l = x.l; return q(sb.from('personnes').update({ adoc_id: l.licence, nom: l.nom, prenom: l.prenom, date_naissance: l.naiss || x.p.date_naissance, foyer_id: x.p.foyer_id || foyerDe[l.foyerCle], cours: l.cours, cotisation_a_jour: l.solde >= 0, actif: true }).eq('id', x.p.id)); });
    seq(modifs, function (x) { var l = x.l; etape('Mise à jour de ' + l.prenom + '…'); return q(sb.from('personnes').update({ nom: l.nom, prenom: l.prenom, date_naissance: l.naiss || x.p.date_naissance, cours: l.cours, cotisation_a_jour: l.solde >= 0, actif: true }).eq('id', x.p.id)); });
    seq(partis, function (p) { return q(sb.from('personnes').update({ actif: false }).eq('id', p.id)); });
    // 4. Adresses mail (ajout seulement) et groupes de cours
    suite = suite.then(function () {
      etape('Adresses et groupes…');
      return Promise.all([chargerPers(true), q(sb.from('acces_emails').select('email'))]);
    }).then(function (r) {
      var connus = {}; r[1].forEach(function (a) { connus[a.email] = 1; });
      var parLic = {}; A.pers.forEach(function (p) { if (p.adoc_id) parLic[p.adoc_id] = p; });
      var mails = [];
      lignes.forEach(function (l) { var p = parLic[l.licence]; if (!p || !p.foyer_id) return; [l.email, l.email2].forEach(function (mm) { if (mm && !connus[mm]) { connus[mm] = 1; mails.push({ email: mm, foyer_id: p.foyer_id }); } }); });
      var formules = {}; lignes.forEach(function (l) { String(l.cours || '').split(' | ').filter(Boolean).forEach(function (c) { formules[c] = 1; }); });
      var manquants = Object.keys(formules).filter(function (n) { return !A.groupes.some(function (g) { return g.nom === n; }); });
      return (mails.length ? q(sb.from('acces_emails').upsert(mails)) : Promise.resolve())
        .then(function () { return manquants.length ? q(sb.from('groupes').insert(manquants.map(function (n) { return { nom: n, type: 'cours', description: 'Formule de cours ADOC' }; }))) : null; })
        .then(function () { return chargerGroupes(true); })
        .then(function () {
          var ajouts = [], retraits = [];
          lignes.forEach(function (l) {
            var p = parLic[l.licence]; if (!p) return;
            var voulus = String(l.cours || '').split(' | ').filter(Boolean).map(function (n) { var g = A.groupes.filter(function (x) { return x.nom === n; })[0]; return g && g.id; }).filter(Boolean);
            var actuels = (p.groupe_membres || []).map(function (g) { return g.groupe_id; }).filter(function (id) { var g = A.groupes.filter(function (x) { return x.id === id; })[0]; return g && g.type === 'cours'; });
            voulus.forEach(function (g) { if (actuels.indexOf(g) < 0) ajouts.push({ groupe_id: g, personne_id: p.id }); });
            actuels.forEach(function (g) { if (voulus.indexOf(g) < 0) retraits.push({ g: g, p: p.id }); });
          });
          var t = ajouts.length ? q(sb.from('groupe_membres').upsert(ajouts, { ignoreDuplicates: true })) : Promise.resolve();
          retraits.forEach(function (x) { t = t.then(function () { return q(sb.from('groupe_membres').delete().eq('groupe_id', x.g).eq('personne_id', x.p)); }); });
          return t;
        });
    }).then(function () {
      // Joueurs du planning qui attendaient d'être dans ADOC : placés dans leur créneau
      etape('Créneaux en attente…');
      return q(sb.from('creneaux_en_attente').select('id, nom_planning, groupe_id')).then(function (att) {
        var jeu = function (s) { return norm(s).replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' '); };
        var t = Promise.resolve();
        (att || []).forEach(function (a) {
          var k = jeu(a.nom_planning), p = A.pers.filter(function (x) { return x.actif !== false && jeu(x.nom + ' ' + x.prenom) === k; });
          if (p.length !== 1) return;
          t = t.then(function () { return q(sb.from('groupe_membres').upsert({ groupe_id: a.groupe_id, personne_id: p[0].id }, { ignoreDuplicates: true })); })
            .then(function () { places++; return q(sb.from('creneaux_en_attente').delete().eq('id', a.id)); });
        });
        return t;
      });
    }).catch(function () { nbErr++; });
    suite.then(function () { return chargerPers(true); }).then(function () {
      $('ad-r').innerHTML = '<p class="small" style="color:' + (nbErr ? 'var(--ko)' : 'var(--ok)') + '"><b>' + (nbErr ? 'Mise à jour faite, avec ' + nbErr + ' erreur' + (nbErr > 1 ? 's' : '') + '. Relance l\'import pour voir ce qui reste.' : 'Mise à jour terminée.') + '</b></p>' +
        '<span class="small">' + (nouveaux.length + lies.length) + ' nouveau' + (nouveaux.length + lies.length > 1 ? 'x' : '') + ', ' + modifs.length + ' mis à jour' + (partis.length ? ', ' + partis.length + ' passé' + (partis.length > 1 ? 's' : '') + ' en ancien adhérent' : '') + (places ? ', ' + places + ' placé' + (places > 1 ? 's' : '') + ' dans leur créneau du planning' : '') + '.</span><span class="mut xs">Pense à donner leur niveau CLOC\'ARENA aux nouveaux jeunes qui jouent le tournoi.</span>';
    });
  };
}

// ---------- Groupes ----------
var OUVERTS = {}, LIEUX = {};
function vueGroupes(m) {
  m.innerHTML = entete('Groupes', 'Les groupes servent à cibler l\'agenda, les actus et les notifications.', '<button class="btn" id="g-new">Nouveau groupe</button>') + '<div id="g-l"><div class="skel"></div></div>';
  var dessiner = function () {
    var cpt = {}; A.pers.forEach(function (p) { (p.groupe_membres || []).forEach(function (g) { cpt[g.groupe_id] = (cpt[g.groupe_id] || 0) + 1; }); });
    $('g-l').innerHTML = Object.keys(TYPES_GRP).map(function (t) {
      var l = A.groupes.filter(function (g) { return g.type === t; }); if (!l.length) return '';
      var table = function (liste, sansJour) {
        return '<div class="tw"><table class="t"><tbody>' + liste.map(function (g) {
          var nom = sansJour ? String(g.nom).replace(/^\S+\s+/, '') : g.nom;
          return '<tr class="click" data-g="' + g.id + '"><td><span class="dot" style="background:' + esc(g.couleur || '#1f5a85') + ';margin-right:8px"></span><b>' + esc(nom) + '</b>' + (g.actif === false ? ' <span class="badge">Archivé</span>' : '') + '</td><td class="act small">' + (cpt[g.id] || 0) + ' membre' + ((cpt[g.id] || 0) > 1 ? 's' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      };
      var replie = function (titre, sous, contenu, ouvert) {
        return '<details class="card" style="padding:0;margin-bottom:8px"' + (ouvert ? ' open' : '') + '><summary style="padding:12px 16px;cursor:pointer;display:flex;justify-content:space-between;gap:10px;list-style-position:inside"><b>' + titre + '</b><span class="mut small">' + sous + '</span></summary><div style="padding:0 12px 12px">' + contenu + '</div></details>';
      };
      if (t === 'creneau') {
        var jours = {}, ext = function (g) { return /ext[ée]rieur/i.test((LIEUX[g.id] || '') + ' ' + g.nom); };
        l.forEach(function (g) { var j = String(g.nom).split(' ')[0]; (jours[j] = jours[j] || []).push(g); });
        Object.keys(jours).forEach(function (j) {
          var e = jours[j].filter(ext); if (!e.length || e.length === jours[j].length) return;
          var parts = {}; Object.keys(jours).forEach(function (k) { if (k === j) { parts[j + ' intérieur'] = jours[j].filter(function (g) { return !ext(g); }); parts[j + ' extérieur'] = e; } else parts[k] = jours[k]; });
          jours = parts;
        });
        return '<div class="sect">' + TYPES_GRP[t] + '</div>' + Object.keys(jours).map(function (j) {
          var n = jours[j].reduce(function (x, g) { return x + (cpt[g.id] || 0); }, 0);
          return replie(esc(j), jours[j].length + ' cours · ' + n + ' joueurs', table(jours[j], true), OUVERTS[j]);
        }).join('');
      }
      if (l.length > 8) return '<div class="sect">' + TYPES_GRP[t] + '</div>' + replie(TYPES_GRP[t], l.length + ' groupes', table(l), OUVERTS[t]);
      return '<div class="sect">' + TYPES_GRP[t] + '</div>' + table(l);
    }).join('');
    all('[data-g]').forEach(function (tr) { tr.onclick = function () { fiche(A.groupes.filter(function (g) { return g.id === tr.dataset.g; })[0]); }; });
    all('#g-l details').forEach(function (d) { d.ontoggle = function () { OUVERTS[d.querySelector('summary b').textContent] = d.open; }; });
  };
  var fiche = function (g) {
    var nouveau = !g; g = g || { type: 'activite', couleur: '#1f5a85', actif: true };
    var membres = nouveau ? [] : A.pers.filter(function (p) { return (p.groupe_membres || []).some(function (x) { return x.groupe_id === g.id; }); });
    panneau(nouveau ? 'Nouveau groupe' : g.nom, '<div class="stack"><label class="l">Nom<input class="f" id="gr-n" value="' + esc(g.nom) + '"></label>' +
      '<div class="row3"><label class="l">Type<select class="f" id="gr-t">' + Object.keys(TYPES_GRP).map(function (t) { return '<option value="' + t + '"' + (g.type === t ? ' selected' : '') + '>' + TYPES_GRP[t] + '</option>'; }).join('') + '</select></label>' +
      '<label class="l">Couleur<input class="f" type="color" id="gr-c" value="' + esc(g.couleur || '#1f5a85') + '"></label><label class="c" style="margin-top:18px"><input type="checkbox" id="gr-a"' + (g.actif !== false ? ' checked' : '') + '>Actif</label></div>' +
      '<button class="btn" id="gr-ok">Enregistrer</button>' +
      (nouveau ? '' : '<div class="sect">Membres (' + membres.length + ')</div>' + CHERCHEUR + '<div class="card list">' + (membres.length ? membres.map(function (p) { return '<div class="it"><span>' + esc(p.prenom + ' ' + p.nom) + ' <span class="mut xs">' + age(p.date_naissance) + ' ans</span></span><button class="btn sm ko" data-grm="' + p.id + '">Retirer</button></div>'; }).join('') : '<div class="it mut">Aucun membre.</div>') + '</div>') + '</div>', function (root) {
      $('gr-ok').onclick = function () {
        var row = { nom: $('gr-n').value.trim(), type: $('gr-t').value, couleur: $('gr-c').value, actif: $('gr-a').checked }; if (!row.nom) return toast('Il faut un nom');
        (nouveau ? q(sb.from('groupes').insert(row)) : q(sb.from('groupes').update(row).eq('id', g.id))).then(function () { toast('Groupe enregistré'); return chargerGroupes(true); }).then(function () { fermer(); dessiner(); }).catch(function () { toast('Enregistrement impossible (nom déjà pris ?)'); });
      };
      if (nouveau) return;
      var recharger = function () { return chargerPers(true).then(function () { fiche(g); dessiner(); }); };
      chercheurPers(root, function (p) { q(sb.from('groupe_membres').insert({ groupe_id: g.id, personne_id: p.id })).then(function () { toast(p.prenom + ' ajouté(e)'); recharger(); }).catch(function () { toast('Déjà dans le groupe ?'); }); },
        function (p) { return !(p.groupe_membres || []).some(function (x) { return x.groupe_id === g.id; }); });
      all('[data-grm]').forEach(function (b) { b.onclick = function () { q(sb.from('groupe_membres').delete().eq('groupe_id', g.id).eq('personne_id', b.dataset.grm)).then(function () { toast('Retiré du groupe'); recharger(); }); }; });
      if (g.type === 'creneau') horaireCreneau(root, g);
    });
  };
  // Créneau de cours : jour, horaires, lieu, profs, et joueurs du planning en attente d'inscription ADOC
  var horaireCreneau = function (root, g) {
    var bloc = document.createElement('div'); bloc.className = 'stack'; root.querySelector('.stack').insertBefore(bloc, $('gr-ok').nextSibling);
    var JN = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    Promise.all([q(sb.from('creneaux').select('*').eq('groupe_id', g.id).limit(1)), q(sb.from('creneaux_en_attente').select('id, nom_planning').eq('groupe_id', g.id)).catch(function () { return []; })]).then(function (r) {
      var c = r[0][0] || { jour_semaine: 1, heure_debut: '18:00', heure_fin: '19:00' };
      bloc.innerHTML = '<div class="sect">Horaire du cours</div><div class="row3"><label class="l">Jour<select class="f" id="cr-j">' + [1, 2, 3, 4, 5, 6].map(function (j) { return '<option value="' + j + '"' + (c.jour_semaine === j ? ' selected' : '') + '>' + JN[j] + '</option>'; }).join('') + '</select></label>' +
        '<label class="l">Début<input class="f" type="time" id="cr-d" value="' + esc(String(c.heure_debut).slice(0, 5)) + '"></label><label class="l">Fin<input class="f" type="time" id="cr-f" value="' + esc(String(c.heure_fin).slice(0, 5)) + '"></label></div>' +
        '<div class="row2"><label class="l">Lieu<input class="f" id="cr-l" value="' + esc(c.lieu) + '" placeholder="Terrain 1, Terrains 1 et 2…"></label><label class="l">Profs<input class="f" id="cr-e" value="' + esc(c.encadrant) + '" placeholder="Florian, Skander"></label></div>' +
        '<button class="btn navy" id="cr-ok">Enregistrer l\'horaire</button><span class="mut xs">Les cours n\'apparaissent pas pendant les vacances scolaires, la semaine de trêve et les jours fériés.</span>' +
        (r[1].length ? '<div class="sect">En attente d\'inscription ADOC (' + r[1].length + ')</div><div class="card list">' + r[1].map(function (a) { return '<div class="it"><span class="small">' + esc(a.nom_planning) + '</span><button class="btn sm ko" data-cea="' + a.id + '">Retirer</button></div>'; }).join('') + '</div><span class="mut xs">Ils seront placés ici automatiquement à la prochaine mise à jour ADOC où ils apparaissent.</span>' : '');
      $('cr-ok').onclick = function () {
        if (!$('cr-d').value || !$('cr-f').value || $('cr-f').value <= $('cr-d').value) return toast('Vérifie les horaires');
        var row = { jour_semaine: +$('cr-j').value, heure_debut: $('cr-d').value, heure_fin: $('cr-f').value, lieu: $('cr-l').value.trim() || null, encadrant: $('cr-e').value.trim() || null };
        (c.id ? q(sb.from('creneaux').update(row).eq('id', c.id)) : q(sb.from('creneaux').insert(Object.assign({ groupe_id: g.id, du: '2026-09-14', au: '2027-06-30' }, row)))).then(function () { toast('Horaire enregistré'); }).catch(function () { toast('Enregistrement impossible'); });
      };
      all('[data-cea]', bloc).forEach(function (b) { b.onclick = function () { q(sb.from('creneaux_en_attente').delete().eq('id', b.dataset.cea)).then(function () { toast('Retiré de l\'attente'); fiche(g); }); }; });
    });
  };
  $('g-new').onclick = function () { fiche(null); };
  Promise.all([chargerGroupes(true), chargerPers(), q(sb.from('creneaux').select('groupe_id, lieu')).catch(function () { return []; })]).then(function (r) {
    LIEUX = {}; (r[2] || []).forEach(function (c) { LIEUX[c.groupe_id] = c.lieu; }); dessiner();
  }).catch(function () { $('g-l').innerHTML = '<div class="card empty">Impossible de charger les groupes.</div>'; });
}

// ---------- Petites annonces ----------
function vueAnnonces(m) {
  m.innerHTML = entete('Petites annonces', 'Rien n\'est publié sans validation. Les numéros ne sont jamais affichés aux adhérents.') + '<div id="an-l"><div class="skel"></div></div>';
  var charger = function () {
    q(sb.from('annonces').select('id, num, type, created_at, prenom, titre, niveau, dispo, prix, description, image_path, images, statut, expire_le').in('statut', ['attente', 'publiee']).order('created_at', { ascending: false })).then(function (l) {
      var bloc = function (titre, liste, attente) {
        return '<div class="sect">' + titre + ' (' + liste.length + ')</div>' + (liste.length ? '<div class="tw"><table class="t"><tbody>' + liste.map(function (a) {
          return '<tr><td style="width:46%"><b>' + esc(a.type === 'vente' ? a.titre : a.prenom + ' · ' + a.niveau) + '</b> ' + (a.prix ? '<span class="badge b-ac">' + esc(a.prix) + '</span>' : '') + '<div class="mut xs">' + esc(a.type === 'vente' ? 'Vente' : 'Partenaire : ' + a.dispo) + ' · n°' + a.num + ' · ' + esc(fmtJour(new Date(a.created_at))) + '</div>' + (a.description ? '<div class="small">' + esc(a.description) + '</div>' : '') +
            ((a.images && a.images.length ? a.images : a.image_path ? [a.image_path] : []).map(function (ph, i, l) { return '<a class="xs" target="_blank" rel="noopener" href="' + SUPA_URL + '/storage/v1/object/public/annonces/' + esc(ph) + '" style="margin-right:8px">' + (l.length > 1 ? 'Photo ' + (i + 1) : 'Voir la photo') + '</a>'; }).join('')) + '</td>' +
            '<td class="small" data-anc="' + a.id + '"><button class="btn sm ghost" data-anv="' + a.id + '">Voir le contact</button></td><td class="act">' +
            (attente ? '<button class="btn sm ko" data-ans="' + a.id + '|refusee">Refuser</button> <button class="btn sm ok" data-ans="' + a.id + '|publiee">Publier</button>' : '<span class="mut xs">jusqu\'au ' + esc(fmtJour(new Date(a.expire_le + 'T12:00:00'))) + '</span> <button class="btn sm line" data-ans="' + a.id + '|close">Retirer</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="card empty">' + (attente ? 'Rien à valider.' : 'Aucune annonce en ligne.') + '</div>');
      };
      $('an-l').innerHTML = bloc('À valider', l.filter(function (a) { return a.statut === 'attente'; }), true) + bloc('En ligne', l.filter(function (a) { return a.statut === 'publiee'; }), false);
      all('[data-ans]').forEach(function (b) { b.onclick = function () { var x = b.dataset.ans.split('|'); q(sb.from('annonces').update({ statut: x[1] }).eq('id', x[0])).then(function () { toast({ publiee: 'Annonce publiée', refusee: 'Annonce refusée', close: 'Annonce retirée' }[x[1]]); charger(); }).catch(function () { toast('Action impossible'); }); }; });
      all('[data-anv]').forEach(function (b) {
        b.onclick = function () {
          q(sb.rpc('annonce_contact', { a: b.dataset.anv })).then(function (r) {
            var c = r && r[0], w = c && telWa(c.contact);
            document.querySelector('[data-anc="' + b.dataset.anv + '"]').innerHTML = c ? '<b>' + esc(c.contact || '—') + '</b><br><span class="mut xs">' + esc(c.email || '') + '</span>' + (w ? '<br><a target="_blank" rel="noopener" href="https://wa.me/' + w + '">WhatsApp</a>' : '') : '—';
          });
        };
      });
    }).catch(function () { $('an-l').innerHTML = '<div class="card empty">Impossible de charger les annonces.</div>'; });
  };
  charger();
}

// ---------- Cordage ----------
function vueCordage(m) {
  m.innerHTML = entete('Cordage', 'Raquettes déposées, à corder, à rendre et à encaisser.', '<a class="btn line" href="../#/cordage/reglages">Tarifs et cordeurs</a>') + '<div id="co-l"><div class="skel"></div></div>';
  var charger = function () {
    q(sb.from('cordage_demandes').select('*, cordages(nom)').or('statut.eq.attente,statut.eq.fini,and(statut.eq.recupere,paye.eq.false)').order('created_at')).then(function (l) {
      var ligne = function (d) {
        var w = telWa(d.telephone), msg = 'Bonjour ! C\'est le club CLOCA Tennis 🎾 La raquette de ' + d.nom.split(' ')[0] + ' est cordée et t\'attend au club house' + (d.prix != null ? ' (' + euros(d.prix) + ')' : '') + '. À bientôt !';
        return '<tr><td><b>' + esc(d.nom) + '</b><div class="mut xs">Déposée le ' + esc(fmtJour(new Date(d.created_at))) + (d.besoin_avant ? ' · <b style="color:var(--ac)">avant le ' + esc(fmtJour(new Date(d.besoin_avant + 'T12:00:00'))) + '</b>' : '') + '</div></td>' +
          '<td class="small">' + esc(d.fourni_par === 'club' ? (d.cordages ? d.cordages.nom : 'Club') : 'Perso : ' + (d.cordage_perso || '')) + (d.tension ? '<br><span class="mut">' + esc(d.tension) + '</span>' : '') + (d.raquette ? '<br><span class="mut">' + esc(d.raquette) + '</span>' : '') + (d.note ? '<br><i>' + esc(d.note) + '</i>' : '') + '</td>' +
          '<td class="small">' + esc(d.telephone || '') + (w ? '<br><a target="_blank" rel="noopener" href="https://wa.me/' + w + '?text=' + encodeURIComponent(msg) + '">WhatsApp</a>' : '') + '</td><td><b>' + euros(d.prix) + '</b></td><td class="act">' +
          (d.statut === 'attente' ? '<button class="btn sm ok" data-cof="' + d.id + '">Prête ✓</button>' : '') +
          (d.statut === 'fini' ? '<button class="btn sm line" data-cor="' + d.id + '">Récupérée</button> ' : '') + (d.statut !== 'attente' && !d.paye ? '<button class="btn sm navy" data-cop="' + d.id + '">Réglée</button>' : '') + (d.statut !== 'attente' && d.paye ? '<span class="badge">Réglée</span>' : '') + '</td></tr>';
      };
      var tab = function (t, liste) { return '<div class="sect">' + t + ' (' + liste.length + ')</div>' + (liste.length ? '<div class="tw"><table class="t"><thead><tr><th>Joueur</th><th>Cordage</th><th>Contact</th><th>Prix</th><th></th></tr></thead><tbody>' + liste.map(ligne).join('') + '</tbody></table></div>' : '<div class="card empty">Rien ici.</div>'); };
      $('co-l').innerHTML = tab('À corder', l.filter(function (d) { return d.statut === 'attente'; })) + tab('Prêtes, à récupérer', l.filter(function (d) { return d.statut === 'fini'; })) + tab('Récupérées, à régler', l.filter(function (d) { return d.statut === 'recupere'; }));
      var maj = function (id, ch, msg) { return q(sb.from('cordage_demandes').update(ch).eq('id', id)).then(function () { toast(msg); charger(); }).catch(function () { toast('Action impossible'); }); };
      all('[data-cof]').forEach(function (b) {
        b.onclick = function () {
          b.disabled = true; var d = l.filter(function (x) { return x.id === b.dataset.cof; })[0];
          q(sb.from('cordage_demandes').update({ statut: 'fini' }).eq('id', d.id)).then(function () {
            if (!d.personne_id) { toast('Raquette prête : préviens le joueur par WhatsApp'); return; }
            return sb.functions.invoke('cordage-notifier', { body: { demande_id: d.id } }).then(function (r) { var x = r.data || {}; toast(x.envoyes ? 'Prête, joueur prévenu' : 'Prête. Pas de notification possible : utilise WhatsApp'); });
          }).then(charger).catch(function () { toast('Action impossible'); b.disabled = false; });
        };
      });
      all('[data-cor]').forEach(function (b) { b.onclick = function () { maj(b.dataset.cor, { statut: 'recupere' }, 'Raquette rendue'); }; });
      all('[data-cop]').forEach(function (b) { b.onclick = function () { maj(b.dataset.cop, { paye: true }, 'Paiement noté'); }; });
    }).catch(function () { $('co-l').innerHTML = '<div class="card empty">Impossible de charger le cordage.</div>'; });
  };
  charger();
}

// ---------- CLOC'ARENA ----------
function vueArena(m) {
  m.innerHTML = entete('CLOC\'ARENA', 'Scores proposés par les coachs.', '<a class="btn" href="../#/gestion">Saisir des scores</a><a class="btn line" href="../#/arena">Voir le classement</a>') + '<div id="ar-l"><div class="skel"></div></div>';
  var charger = function () {
    q(sb.from('arena_matchs').select('id, date_match, format, score, vainqueur, arena_match_joueurs(equipe, invite, personnes(prenom, nom))').eq('statut', 'propose').order('date_match', { ascending: false })).then(function (l) {
      var eq = function (mm, n) { return mm.arena_match_joueurs.filter(function (j) { return j.equipe === n; }).map(function (j) { return j.personnes.prenom + ' ' + j.personnes.nom.charAt(0) + '.' + (j.invite ? ' (inv.)' : ''); }).join(' / '); };
      $('ar-l').innerHTML = l.length ? '<div class="tw"><table class="t"><thead><tr><th>Date</th><th>Match</th><th>Score</th><th></th></tr></thead><tbody>' + l.map(function (mm) {
        return '<tr><td class="small">' + esc(fmtJour(new Date(mm.date_match + 'T12:00:00'))) + '<br><span class="mut">' + esc(mm.format.toLowerCase()) + '</span></td><td><b>' + esc(mm.vainqueur === 1 ? eq(mm, 1) : eq(mm, 2)) + '</b> <span class="mut">bat</span> ' + esc(mm.vainqueur === 1 ? eq(mm, 2) : eq(mm, 1)) + '</td><td>' + esc(mm.score) + '</td>' +
          '<td class="act"><button class="btn sm ko" data-arv="' + mm.id + '|refuse">Refuser</button> <button class="btn sm ok" data-arv="' + mm.id + '|valide">Valider</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="card empty">Aucun score en attente.</div>';
      all('[data-arv]').forEach(function (b) { b.onclick = function () { var x = b.dataset.arv.split('|'); q(sb.from('arena_matchs').update({ statut: x[1], valide_par: A.user.id }).eq('id', x[0])).then(function () { toast(x[1] === 'valide' ? 'Score validé' : 'Score refusé'); charger(); }); }; });
    }).catch(function () { $('ar-l').innerHTML = '<div class="card empty">Impossible de charger les scores.</div>'; });
  };
  charger();
}

// ---------- Présence au club ----------
var HORAIRES = {
  clubhouse: { 3: [['09:30', '12:00'], ['14:00', '16:30']], 6: [['09:30', '12:00'], ['14:00', '16:30']] },
  coach: { 1: [['17:30', '22:45']], 2: [['17:30', '22:45']], 3: [['09:00', '21:00']], 4: [['17:30', '22:15']], 5: [['17:30', '22:45']], 6: [['09:00', '16:00']] }
};
var ETATS = { ouvert: ['#1f8a4c', 'Club house ouvert'], coach: ['#d9822b', 'Un coach est au club'], ferme: ['#c62f2f', 'Club house fermé'] };
function aHeure(j, hm) { var x = new Date(j), t = hm.split(':'); x.setHours(+t[0], +t[1], 0, 0); return x; }
var PAUSES_P = null;
function isoJ(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function pauseAuj() { var i = isoJ(new Date()); return (PAUSES_P || []).filter(function (v) { return i >= v.debut && i <= v.fin; })[0] || null; }
function creneau(type) { var n = new Date(), js = n.getDay() || 7; if (pauseAuj()) return null; return (HORAIRES[type][js] || []).map(function (c) { return { d: aHeure(n, c[0]), f: aHeure(n, c[1]) }; }).filter(function (c) { return n >= c.d && n < c.f; })[0] || null; }
function presenceWidget(box) {
  if (!box) return;
  Promise.all([q(sb.from('club_presence').select('etat, jusqua, message, maj_le').eq('id', 1).maybeSingle()), PAUSES_P ? Promise.resolve(PAUSES_P) : q(sb.from('periodes_sans_cours').select('debut, fin, libelle')).catch(function () { return []; })]).then(function (r) {
    var p = r[0]; PAUSES_P = r[1] || []; var pz = pauseAuj();
    var now = new Date(), manuel = p && p.jusqua && new Date(p.jusqua) > now, c = creneau('coach'), ch = creneau('clubhouse');
    var etat = manuel ? p.etat : c ? 'coach' : 'ferme', fin = manuel ? new Date(p.jusqua) : c ? c.f : null;
    box.innerHTML = '<div class="card stack"><div class="sect" style="margin:0">Présence au club</div><div style="display:flex;gap:10px;align-items:center"><span class="dot" style="width:14px;height:14px;background:' + ETATS[etat][0] + '"></span><b>' + ETATS[etat][1] + (fin ? ' jusqu\'à ' + fmtH(fin) : '') + '</b></div>' +
      (manuel && p.message ? '<span class="small">' + esc(p.message) + '</span>' : '') + '<span class="mut xs">' + (manuel ? 'Mis à jour à ' + fmtH(new Date(p.maj_le)) : pz ? esc(pz.libelle) + ' : pas de cours, rouge par défaut' : 'D\'après les horaires habituels') + '</span>' +
      '<div class="chips">' + (etat === 'ouvert' && manuel ? '<button class="btn line" data-pr="ferme">Je ferme le club house</button>' : '<button class="btn ok" data-pr="ouvert">J\'ouvre le club house' + (ch ? ' jusqu\'à ' + fmtH(ch.f) : '') + '</button>') +
      (manuel ? '<button class="btn ghost" data-pr="auto">Revenir aux horaires</button>' : '') + '</div></div>';
    all('[data-pr]', box).forEach(function (b) {
      b.onclick = function () {
        var row = { etat: 'ferme', jusqua: null, message: null };
        if (b.dataset.pr === 'ouvert') { var f = ch ? ch.f : new Date(Date.now() + 2 * 3600e3); row = { etat: 'ouvert', jusqua: f.toISOString(), message: null }; }
        q(sb.from('club_presence').update(row).eq('id', 1)).then(function () { toast('Présence mise à jour'); presenceWidget(box); }).catch(function () { toast('Mise à jour impossible'); });
      };
    });
  }).catch(function () { box.innerHTML = ''; });
}
function vuePresence(m) {
  var jours = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  var hor = function (t) { return [1, 2, 3, 4, 5, 6, 7].filter(function (j) { return HORAIRES[t][j]; }).map(function (j) { return '<div class="it"><span>' + jours[j] + '</span><b class="small">' + HORAIRES[t][j].map(function (c) { return c[0].replace(':', 'h') + ' – ' + c[1].replace(':', 'h'); }).join(', ') + '</b></div>'; }).join(''); };
  m.innerHTML = entete('Présence au club', 'La pastille rouge / orange / verte visible dans l\'appli. Pour un imprévu (cours annulé, message), utilise « Autre mise à jour » dans l\'appli.') +
    '<div class="two"><div id="presence"></div><div class="grid"><div class="card"><div class="sect" style="margin-top:0">Club house (vert si quelqu\'un l\'ouvre)</div><div class="list">' + hor('clubhouse') + '</div></div><div class="card"><div class="sect" style="margin-top:0">Cours (orange automatique)</div><div class="list">' + hor('coach') + '</div></div></div></div>';
  presenceWidget($('presence'));
}

// ---------- Accès et rôles ----------
// ---------- Photo réduite et envoyée dans un dossier public ----------
function envoyerPhoto(fichier, dossier) {
  return new Promise(function (ok, ko) {
    var img = new Image(), url = URL.createObjectURL(fichier);
    img.onload = function () {
      var r = Math.min(1, 1400 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob(function (b) { b ? ok(b) : ko(new Error('photo')); }, 'image/jpeg', 0.84);
    };
    img.onerror = function () { ko(new Error('photo')); };
    img.src = url;
  }).then(function (blob) {
    var chemin = Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '.jpg';
    return sb.storage.from(dossier).upload(chemin, blob, { contentType: 'image/jpeg' }).then(function (r) {
      if (r.error) throw r.error;
      return sb.storage.from(dossier).getPublicUrl(chemin).data.publicUrl;
    });
  });
}

// ---------- Boutique : ce qu'on vend au club et ce qui reste à payer ----------
var BTF = { vue: 'ardoise' };
function vueBoutique(m) {
  m.innerHTML = entete('Boutique et ardoise', 'Grips, surgrips, balles, poses… Note chaque vente : payée tout de suite ou à payer plus tard. L\'ardoise montre qui doit combien, le stock suit les ventes et les arrivages.', '<button class="btn line" id="bt-ent">Arrivage en stock</button><button class="btn" id="bt-new">Nouvelle vente</button>') +
    '<div class="toolbar"><div class="chips">' + [['ardoise', 'À payer'], ['historique', 'Ventes'], ['stock', 'Stock et articles']].map(function (x) { return '<button class="chip' + (BTF.vue === x[0] ? ' on' : '') + '" data-btv="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div><div id="bt-l"><div class="skel"></div></div>';
  var ART = [], V = [];
  var nomV = function (v) { if (v.personne_id) { var p = A.pers.filter(function (x) { return x.id === v.personne_id; })[0]; return p ? p.prenom + ' ' + p.nom : 'Adhérent'; } return v.nom_libre; };
  var cleV = function (v) { return v.personne_id || ('libre:' + norm(v.nom_libre).trim()); };
  var MODES = { especes: 'Espèces', cb: 'Carte', cheque: 'Chèque', virement: 'Virement', autre: 'Autre' };
  var somme = function (l) { return l.reduce(function (s2, v) { return s2 + (+v.total); }, 0); };
  var num = function (x) { var n = parseFloat(String(x || '').replace(',', '.')); return isNaN(n) ? null : n; };
  var encaisser = function (ids, msg) {
    panneau('Encaisser', '<div class="stack"><span class="small">' + esc(msg) + '</span><label class="l">Payé par<select class="f" id="bt-mode">' + Object.keys(MODES).map(function (k) { return '<option value="' + k + '">' + MODES[k] + '</option>'; }).join('') + '</select></label><button class="btn ok" id="bt-enc">Confirmer le paiement</button></div>', function () {
      $('bt-enc').onclick = function () { q(sb.from('boutique_ventes').update({ paye: true, paye_le: new Date().toISOString(), mode: $('bt-mode').value }).in('id', ids)).then(function () { toast('Paiement enregistré'); fermer(); charger(); }).catch(function () { toast('Action impossible'); }); };
    });
  };
  // Nouvelle vente ou modification d'une vente
  var formVente = function (v) {
    var nouveau = !v; v = v || { quantite: 1, jour: isoJour(new Date()) };
    var qui = v.personne_id ? A.pers.filter(function (x) { return x.id === v.personne_id; })[0] || { id: v.personne_id, prenom: 'Adhérent', nom: '' } : null;
    var art = ART.filter(function (a) { return a.id === v.article_id; })[0];
    panneau(nouveau ? 'Nouvelle vente' : 'Modifier la vente', '<div class="stack"><div class="l">Pour qui ?<div id="bt-qui" class="small" style="margin:6px 0">' + (qui ? '<b>' + esc(qui.prenom + ' ' + qui.nom) + '</b>' : v.nom_libre ? '<b>' + esc(v.nom_libre) + '</b> <span class="badge">non adhérent</span>' : '<span class="mut">Cherche un adhérent, ou écris un nom ci-dessous</span>') + '</div>' + CHERCHEUR + '</div>' +
      '<label class="l">… ou nom d\'une personne non adhérente<input class="f" id="bt-libre" value="' + esc(v.nom_libre) + '" placeholder="Ex. Kylian Janssen"></label>' +
      '<label class="l">Article<select class="f" id="bt-a"><option value="">Autre (à écrire)</option>' + ART.filter(function (a) { return a.actif || a.id === v.article_id; }).map(function (a) { return '<option value="' + a.id + '"' + (a.id === v.article_id ? ' selected' : '') + '>' + esc(a.nom) + ' · ' + euros(a.prix) + (a.suivi_stock ? ' · stock ' + a.stock : '') + '</option>'; }).join('') + '</select></label>' +
      '<label class="l" id="bt-libl"' + (art ? ' style="display:none"' : '') + '>Description<input class="f" id="bt-lib" value="' + esc(art ? '' : v.libelle) + '" placeholder="Ex. 2 tubes de balles recyclées"></label>' +
      '<div class="row2"><label class="l">Quantité<input class="f" type="number" min="1" id="bt-q" value="' + esc(v.quantite) + '"></label><label class="l">Prix unitaire (€)<input class="f" inputmode="decimal" id="bt-p" value="' + esc(v.prix_unitaire == null ? '' : String(+v.prix_unitaire).replace('.', ',')) + '"></label></div>' +
      '<b id="bt-tot" class="small"></b>' +
      '<label class="l">Date<input class="f" type="date" id="bt-j" value="' + esc(v.jour) + '"></label>' +
      '<label class="l">Note (facultatif)<input class="f" id="bt-no" maxlength="200" value="' + esc(v.note) + '" placeholder="Ex. paiera samedi"></label>' +
      '<label class="c"><input type="checkbox" id="bt-pp"' + (v.paye ? ' checked' : '') + '>Payé</label><label class="l" id="bt-ml"' + (v.paye ? '' : ' style="display:none"') + '>Payé par<select class="f" id="bt-m">' + Object.keys(MODES).map(function (k) { return '<option value="' + k + '"' + (v.mode === k ? ' selected' : '') + '>' + MODES[k] + '</option>'; }).join('') + '</select></label>' +
      '<div class="chips"><button class="btn" id="bt-ok">Enregistrer</button>' + (nouveau ? '' : '<button class="btn ko" id="bt-sup">Supprimer la vente</button>') + '</div>' + (nouveau ? '' : '<span class="mut xs">Modifier l\'article ou la quantité corrige le stock automatiquement.</span>') + '</div>', function (r) {
      chercheurPers(r, function (p) { qui = p; $('bt-libre').value = ''; $('bt-qui').innerHTML = '<b>' + esc(p.prenom + ' ' + p.nom) + '</b>'; });
      $('bt-libre').oninput = function () { if (this.value.trim()) { qui = null; $('bt-qui').innerHTML = '<b>' + esc(this.value.trim()) + '</b> <span class="badge">non adhérent</span>'; } };
      var tot = function () { var qn = parseInt($('bt-q').value, 10) || 0, pr = num($('bt-p').value); $('bt-tot').textContent = pr != null && qn ? 'Total : ' + euros(Math.round(qn * pr * 100) / 100) : ''; };
      $('bt-a').onchange = function () { var a = ART.filter(function (x) { return x.id === $('bt-a').value; })[0]; $('bt-libl').style.display = a ? 'none' : ''; if (a) $('bt-p').value = String(+a.prix).replace('.', ','); tot(); };
      $('bt-q').oninput = $('bt-p').oninput = tot; tot();
      $('bt-pp').onchange = function () { $('bt-ml').style.display = this.checked ? '' : 'none'; };
      if ($('bt-sup')) $('bt-sup').onclick = function () { if (confirm('Supprimer cette vente ? Le stock sera remis.')) q(sb.from('boutique_ventes').delete().eq('id', v.id)).then(function () { toast('Vente supprimée'); fermer(); charger(); }); };
      $('bt-ok').onclick = function () {
        var libre = $('bt-libre').value.trim(); if (!qui && !libre) return toast('Indique pour qui');
        var a = ART.filter(function (x) { return x.id === $('bt-a').value; })[0], lib = a ? a.nom : $('bt-lib').value.trim(); if (!lib) return toast('Décris l\'article');
        var qn = parseInt($('bt-q').value, 10), pr = num($('bt-p').value);
        if (!(qn > 0) || pr == null || pr < 0) return toast('Quantité ou prix invalide');
        var paye = $('bt-pp').checked;
        var row = { personne_id: qui ? qui.id : null, nom_libre: qui ? null : libre, article_id: a ? a.id : null, libelle: lib, quantite: qn, prix_unitaire: pr, jour: $('bt-j').value || isoJour(new Date()), note: $('bt-no').value.trim() || null, paye: paye, paye_le: paye ? (v.paye_le || new Date().toISOString()) : null, mode: paye ? $('bt-m').value : null };
        (nouveau ? q(sb.from('boutique_ventes').insert(row)) : q(sb.from('boutique_ventes').update(row).eq('id', v.id)))
          .then(function () { toast(nouveau ? (paye ? 'Vente enregistrée' : 'Ajouté à l\'ardoise') : 'Vente modifiée'); fermer(); charger(); }).catch(function () { toast('Enregistrement impossible'); });
      };
    });
  };
  // Arrivage, correction d'inventaire, nouvel article
  var formStock = function (a, mode) {
    var titre = mode === 'corriger' ? 'Corriger le stock' : 'Arrivage en stock';
    panneau(titre, '<div class="stack">' + (mode === 'corriger' ? '<b>' + esc(a.nom) + '</b><span class="mut small">Stock actuel dans l\'appli : ' + a.stock + '. Indique ce que tu as vraiment compté.</span><label class="l">Quantité comptée<input class="f" type="number" min="0" id="bs-q" value="' + a.stock + '"></label>'
      : '<label class="l">Article<select class="f" id="bs-a"><option value="">+ Nouvel article</option>' + ART.filter(function (x) { return x.suivi_stock; }).map(function (x) { return '<option value="' + x.id + '"' + (a && a.id === x.id ? ' selected' : '') + '>' + esc(x.nom) + ' (stock ' + x.stock + ')</option>'; }).join('') + '</select></label>' +
        '<div id="bs-new"' + (a ? ' style="display:none"' : '') + ' class="stack"><label class="l">Nom du nouvel article<input class="f" id="bs-n" placeholder="Ex. Surgrip Tecnifibre Pro Contact (à l\'unité)"></label><div class="row2"><label class="l">Prix de vente (€)<input class="f" inputmode="decimal" id="bs-p"></label><label class="l">Rangé où ?<input class="f" id="bs-e" placeholder="Ex. Vitrine"></label></div></div>' +
        '<label class="l">Quantité ajoutée<input class="f" type="number" min="1" id="bs-q" value="1"></label>') +
      '<label class="l">Note (facultatif)<input class="f" id="bs-no" maxlength="200" placeholder="' + (mode === 'corriger' ? 'Ex. inventaire de la vitrine' : 'Ex. commande Tecnifibre du 27/10') + '"></label><button class="btn" id="bs-ok">Enregistrer</button></div>', function () {
      if ($('bs-a')) $('bs-a').onchange = function () { $('bs-new').style.display = this.value ? 'none' : ''; };
      $('bs-ok').onclick = function () {
        var qn = parseInt($('bs-q').value, 10), note = $('bs-no').value.trim() || null;
        if (mode === 'corriger') {
          if (!(qn >= 0)) return toast('Quantité invalide'); var diff = qn - a.stock; if (!diff) { fermer(); return toast('Stock déjà juste'); }
          return q(sb.from('boutique_mouvements').insert({ article_id: a.id, quantite: diff, motif: 'correction', note: note })).then(function () { toast('Stock corrigé : ' + qn); fermer(); charger(); }).catch(function () { toast('Action impossible'); });
        }
        if (!(qn > 0)) return toast('Quantité invalide');
        var id = $('bs-a').value;
        (id ? Promise.resolve(id) : (function () {
          var nm = $('bs-n').value.trim(), pr = num($('bs-p').value); if (!nm || pr == null || pr < 0) { toast('Nom et prix du nouvel article'); return Promise.reject('saisie'); }
          return q(sb.from('boutique_articles').insert({ nom: nm, prix: pr, emplacement: $('bs-e').value.trim() || null, ordre: ART.length + 1 }).select('id').single()).then(function (x) { return x.id; });
        })()).then(function (aid) { return q(sb.from('boutique_mouvements').insert({ article_id: aid, quantite: qn, motif: 'entree', note: note })); })
          .then(function () { toast('Stock mis à jour'); fermer(); charger(); }).catch(function (e) { if (e !== 'saisie') toast('Action impossible'); });
      };
    });
  };
  var histoStock = function (a) {
    q(sb.from('boutique_mouvements').select('*').eq('article_id', a.id).order('created_at', { ascending: false }).limit(100)).then(function (l) {
      var M = { entree: 'Arrivage', vente: 'Vente', correction: 'Correction' };
      panneau('Mouvements · ' + a.nom, '<div class="stack">' + (l.length ? l.map(function (x) { return '<div class="it" style="display:flex;justify-content:space-between;gap:8px"><span class="small">' + esc(fmtJ(new Date(x.created_at))) + ' · ' + M[x.motif] + (x.note ? ' <span class="mut xs">(' + esc(x.note) + ')</span>' : '') + '</span><b style="color:' + (x.quantite > 0 ? 'var(--ok)' : 'var(--ko)') + '">' + (x.quantite > 0 ? '+' : '') + x.quantite + '</b></div>'; }).join('') : '<span class="mut small">Aucun mouvement.</span>') + '</div>');
    });
  };
  var charger = function () {
    Promise.all([q(sb.from('boutique_articles').select('*').order('ordre').order('nom')), q(sb.from('boutique_ventes').select('*').order('jour', { ascending: false }).order('created_at', { ascending: false }).limit(1000)), chargerPers()]).then(function (r) {
      ART = r[0] || []; V = r[1] || [];
      var du = V.filter(function (v) { return !v.paye; });
      var bas = ART.filter(function (a) { return a.actif && a.suivi_stock && a.stock <= (a.alerte == null ? 0 : a.alerte); });
      var h = '<div class="kpis"><div class="kpi"><b>' + euros(somme(du)) + '</b><span>à encaisser</span></div><div class="kpi"><b>' + Object.keys(du.reduce(function (o, v) { o[cleV(v)] = 1; return o; }, {})).length + '</b><span>personnes concernées</span></div><div class="kpi"><b>' + euros(somme(V.filter(function (v) { return v.paye && v.paye_le && new Date(v.paye_le).getMonth() === new Date().getMonth() && new Date(v.paye_le).getFullYear() === new Date().getFullYear(); }))) + '</b><span>encaissé ce mois-ci</span></div>' +
        '<div class="kpi"><b' + (bas.length ? ' style="color:var(--ko)"' : '') + '>' + bas.length + '</b><span>article' + (bas.length > 1 ? 's' : '') + ' à recommander</span></div></div>';
      var ligneVente = function (v, avecQui) { return '<div class="it click" data-btv2="' + v.id + '" style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span class="small">' + esc(fmtJ(new Date(v.jour + 'T12:00:00'))) + ' · ' + (avecQui ? '<b>' + esc(nomV(v)) + '</b> · ' : '') + (v.quantite > 1 ? v.quantite + ' × ' : '') + esc(v.libelle) + (v.note ? ' <span class="mut xs">(' + esc(v.note) + ')</span>' : '') + '</span><span style="display:flex;gap:6px;align-items:center"><b class="small">' + euros(v.total) + '</b>' + (v.paye ? '<span class="badge b-ok">' + (v.mode ? MODES[v.mode] : 'Payé') + '</span>' : '<button class="btn sm line" data-btpay="' + v.id + '">Payé</button>') + '</span></div>'; };
      if (BTF.vue === 'ardoise') {
        var par = {}, ordre = [];
        du.forEach(function (v) { var k = cleV(v); if (!par[k]) { par[k] = []; ordre.push(k); } par[k].push(v); });
        ordre.sort(function (a, b) { return somme(par[b]) - somme(par[a]); });
        h += ordre.length ? '<div class="stack">' + ordre.map(function (k) {
          var l = par[k];
          return '<div class="card stack" style="gap:8px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>' + esc(nomV(l[0])) + (l[0].personne_id ? '' : ' <span class="badge">non adhérent</span>') + '</b><b style="font-size:20px;color:var(--ko)">' + euros(somme(l)) + '</b></div>' +
            l.map(function (v) { return ligneVente(v, false); }).join('') + (l.length > 1 ? '<button class="btn ok sm" data-btall="' + esc(k) + '">Tout est payé (' + euros(somme(l)) + ')</button>' : '') + '</div>';
        }).join('') + '</div><p class="mut xs">Clique sur une ligne pour la modifier.</p>' : '<div class="card empty">Personne ne doit rien. 🎾</div>';
      } else if (BTF.vue === 'historique') {
        h += V.length ? '<div class="card stack" style="gap:2px">' + V.map(function (v) { return ligneVente(v, true); }).join('') + '</div><p class="mut xs">Clique sur une vente pour la modifier ou la supprimer.</p><button class="btn line" id="bt-csv" style="margin-top:12px">Exporter (Excel)</button>' : '<div class="card empty">Aucune vente enregistrée.</div>';
      } else {
        h += '<div class="tw"><table class="t"><thead><tr><th>Article</th><th>Prix</th><th>Rangé</th><th>Stock</th><th>Alerte si ≤</th><th>Suivi</th><th>En vente</th><th></th></tr></thead><tbody>' + ART.map(function (a) {
          var alerte = a.suivi_stock && a.stock <= (a.alerte == null ? 0 : a.alerte);
          return '<tr><td><input class="f" data-ban="' + a.id + '" value="' + esc(a.nom) + '" style="min-width:180px"></td><td><input class="f" data-bap="' + a.id + '" inputmode="decimal" value="' + esc(String(+a.prix).replace('.', ',')) + '" style="width:80px"></td><td><input class="f" data-bae="' + a.id + '" value="' + esc(a.emplacement) + '" placeholder="Vitrine" style="width:110px"></td>' +
            '<td>' + (a.suivi_stock ? '<b style="font-size:18px;color:' + (alerte ? 'var(--ko)' : 'var(--tx)') + '">' + a.stock + '</b>' : '<span class="mut xs">service</span>') + '</td><td><input class="f" type="number" min="0" data-bal="' + a.id + '" value="' + esc(a.alerte) + '" style="width:70px"' + (a.suivi_stock ? '' : ' disabled') + '></td>' +
            '<td><input type="checkbox" data-bsu="' + a.id + '"' + (a.suivi_stock ? ' checked' : '') + ' title="Suivre le stock"></td><td><input type="checkbox" data-baa="' + a.id + '"' + (a.actif ? ' checked' : '') + '></td>' +
            '<td class="act"><div style="display:flex;flex-wrap:wrap;gap:4px;min-width:200px"><button class="btn sm" data-bas="' + a.id + '">Enregistrer</button>' + (a.suivi_stock ? ' <button class="btn sm line" data-bplus="' + a.id + '">+ Arrivage</button> <button class="btn sm line" data-bcor="' + a.id + '">Inventaire</button> <button class="btn sm ghost" data-bhis="' + a.id + '">Historique</button>' : '') + '</div></td></tr>';
        }).join('') + '</tbody></table></div>' +
          '<div class="card stack" style="margin-top:14px"><b>Ajouter un article</b><div style="display:flex;gap:8px;flex-wrap:wrap"><input class="f" id="ba-n" placeholder="Ex. Grip Tecnifibre ATP" style="flex:1;min-width:180px"><input class="f" id="ba-p" inputmode="decimal" placeholder="Prix €" style="width:90px"><input class="f" type="number" min="0" id="ba-s" placeholder="Stock" style="width:90px"><input class="f" id="ba-e" placeholder="Rangé où ?" style="width:120px"><button class="btn" id="ba-ok">Ajouter</button></div><span class="mut xs">Décoche « Suivi » pour un service sans stock (pose de surgrip, pose de grip…).</span></div>';
      }
      $('bt-l').innerHTML = h;
      all('[data-btv2]').forEach(function (l) { l.onclick = function (e) { if (e.target.closest('[data-btpay]')) return; formVente(V.filter(function (x) { return x.id === l.dataset.btv2; })[0]); }; });
      all('[data-btpay]').forEach(function (b) { b.onclick = function () { var v = V.filter(function (x) { return x.id === b.dataset.btpay; })[0]; encaisser([v.id], nomV(v) + ' · ' + v.libelle + ' · ' + euros(v.total)); }; });
      all('[data-btall]').forEach(function (b) { b.onclick = function () { var l = du.filter(function (v) { return cleV(v) === b.dataset.btall; }); encaisser(l.map(function (v) { return v.id; }), nomV(l[0]) + ' règle ' + euros(somme(l)) + ' (' + l.length + ' achats)'); }; });
      var artDe = function (id) { return ART.filter(function (x) { return x.id === id; })[0]; };
      var champ = function (k, id) { return document.querySelector('[data-' + k + '="' + id + '"]'); };
      all('[data-bas]').forEach(function (b) { b.onclick = function () {
        var id = b.dataset.bas, pr = num(champ('bap', id).value), nm = champ('ban', id).value.trim(), al = champ('bal', id).value;
        if (!nm || pr == null || pr < 0) return toast('Nom ou prix invalide');
        q(sb.from('boutique_articles').update({ nom: nm, prix: pr, emplacement: champ('bae', id).value.trim() || null, alerte: al === '' ? null : parseInt(al, 10), suivi_stock: champ('bsu', id).checked, actif: champ('baa', id).checked }).eq('id', id)).then(function () { toast('Article enregistré'); charger(); });
      }; });
      all('[data-bplus]').forEach(function (b) { b.onclick = function () { formStock(artDe(b.dataset.bplus), 'entree'); }; });
      all('[data-bcor]').forEach(function (b) { b.onclick = function () { formStock(artDe(b.dataset.bcor), 'corriger'); }; });
      all('[data-bhis]').forEach(function (b) { b.onclick = function () { histoStock(artDe(b.dataset.bhis)); }; });
      if ($('ba-ok')) $('ba-ok').onclick = function () {
        var nm = $('ba-n').value.trim(), pr = num($('ba-p').value), st = parseInt($('ba-s').value, 10) || 0; if (!nm || pr == null || pr < 0) return toast('Indique un nom et un prix');
        q(sb.from('boutique_articles').insert({ nom: nm, prix: pr, emplacement: $('ba-e').value.trim() || null, ordre: ART.length + 1 }).select('id').single()).then(function (x) {
          return st > 0 ? q(sb.from('boutique_mouvements').insert({ article_id: x.id, quantite: st, motif: 'entree', note: 'Stock de départ' })) : null;
        }).then(function () { toast('Article ajouté'); charger(); });
      };
      if ($('bt-csv')) $('bt-csv').onclick = function () { csv('boutique-' + isoJour(new Date()) + '.csv', [['Date', 'Qui', 'Article', 'Quantité', 'Prix unitaire', 'Total', 'Payé', 'Mode', 'Note']].concat(V.map(function (v) { return [v.jour, nomV(v), v.libelle, v.quantite, v.prix_unitaire, v.total, v.paye ? 'oui' : 'non', v.mode ? MODES[v.mode] : '', v.note || '']; }))); };
    }).catch(function () { $('bt-l').innerHTML = '<div class="card empty">Impossible de charger la boutique.</div>'; });
  };
  all('[data-btv]').forEach(function (b) { b.onclick = function () { BTF.vue = b.dataset.btv; vueBoutique(m); }; });
  $('bt-new').onclick = function () { formVente(null); };
  $('bt-ent').onclick = function () { formStock(null, 'entree'); };
  charger();
}

// ---------- Double interne : équipes, poules et reprise des données de l'appli Google ----------
function vueDouble(m) {
  m.innerHTML = entete('Double interne', 'Les équipes et les poules du tournoi interne. Les joueurs suivent le tournoi dans l\'appli (tuile Double interne de l\'accueil) ; tu valides les scores dans l\'onglet Organisateur de l\'appli.', '<button class="btn line" id="dbx-imp">Reprendre les données de l\'appli Google</button><button class="btn" id="dbx-new">Ajouter une équipe</button>') +
    '<input type="file" id="dbx-f" accept=".xlsx,.xls" hidden><div id="dbx-l"><div class="skel"></div></div>';
  var EQ = [], RES = [];
  var charger = function () {
    Promise.all([q(sb.from('double_equipes').select('*').order('categorie').order('poule').order('numero')), q(sb.from('double_resultats').select('gagnant, perdant, statut'))]).then(function (r) {
      EQ = r[0] || []; RES = r[1] || [];
      var groupes = {}; EQ.forEach(function (e) { var k = e.categorie + ' · Poule ' + e.poule; (groupes[k] = groupes[k] || []).push(e); });
      $('dbx-l').innerHTML = EQ.length ? '<div class="kpis"><div class="kpi"><b>' + EQ.length + '</b><span>équipes</span></div><div class="kpi"><b>' + Object.keys(groupes).length + '</b><span>poules</span></div><div class="kpi"><b>' + RES.filter(function (x) { return x.statut === 'validé'; }).length + '</b><span>scores validés</span></div><div class="kpi"><b>' + RES.filter(function (x) { return x.statut === 'en attente'; }).length + '</b><span>en attente</span></div></div>' +
        Object.keys(groupes).map(function (k) {
          return '<div class="sect">' + esc(k) + '</div><div class="tw"><table class="t"><thead><tr><th>#</th><th>Joueur 1</th><th>Joueur 2</th><th>Poule</th><th></th></tr></thead><tbody>' + groupes[k].map(function (e) {
            return '<tr><td class="small">' + e.numero + '</td><td><input class="f" data-dj1="' + esc(e.id) + '" value="' + esc(e.joueur1) + '"></td><td><input class="f" data-dj2="' + esc(e.id) + '" value="' + esc(e.joueur2) + '"></td><td><input class="f" type="number" min="1" max="20" data-dpo="' + esc(e.id) + '" value="' + e.poule + '" style="width:70px"></td>' +
              '<td class="act"><button class="btn sm" data-dsave="' + esc(e.id) + '">Enregistrer</button> <button class="btn sm ko" data-ddel="' + esc(e.id) + '">Retirer</button></td></tr>';
          }).join('') + '</tbody></table></div>';
        }).join('') : '<div class="card stack"><b>Aucune équipe pour le moment</b><span class="small">Pour reprendre le tournoi en cours : ouvre le classeur Google « Double interne CLOCA Tennis 2026-2027 — données », Fichier → Télécharger → Microsoft Excel (.xlsx), puis clique sur « Reprendre les données de l\'appli Google » et choisis ce fichier. Équipes, dispos et scores sont repris tels quels.</span></div>';
      var val = function (a, id) { return document.querySelector('[data-' + a + '="' + id + '"]').value.trim(); };
      all('[data-dsave]').forEach(function (b) { b.onclick = function () {
        var id = b.dataset.dsave, po = parseInt(val('dpo', id), 10); if (!val('dj1', id) || !(po >= 1 && po <= 20)) return toast('Nom ou poule invalide');
        q(sb.from('double_equipes').update({ joueur1: val('dj1', id), joueur2: val('dj2', id) || null, poule: po }).eq('id', id)).then(function () { toast('Équipe enregistrée'); charger(); }).catch(function () { toast('Action impossible'); });
      }; });
      all('[data-ddel]').forEach(function (b) { b.onclick = function () {
        var id = b.dataset.ddel; if (RES.some(function (x) { return x.statut !== 'refusé' && (x.gagnant === id || x.perdant === id); })) return toast('Cette équipe a déjà un score : impossible de la retirer');
        if (confirm('Retirer cette équipe ?')) q(sb.from('double_equipes').delete().eq('id', id)).then(function () { toast('Équipe retirée'); charger(); });
      }; });
    }).catch(function () { $('dbx-l').innerHTML = '<div class="card empty">Impossible de charger le tournoi.</div>'; });
  };
  $('dbx-new').onclick = function () {
    panneau('Nouvelle équipe', '<div class="stack"><label class="l">Catégorie<select class="f" id="dn-c"><option>Hommes</option><option>Dames</option><option>Mixte</option></select></label><label class="l">Poule<input class="f" type="number" min="1" max="20" id="dn-p" value="1"></label>' +
      '<label class="l">Joueur 1<input class="f" id="dn-1" placeholder="Ex. G. Lucile"></label><label class="l">Joueur 2<input class="f" id="dn-2" placeholder="Ex. G. Maxence"></label><button class="btn" id="dn-ok">Ajouter</button></div>', function () {
      $('dn-ok').onclick = function () {
        var c = $('dn-c').value, po = parseInt($('dn-p').value, 10); if (!$('dn-1').value.trim() || !(po >= 1)) return toast('Indique au moins le joueur 1 et la poule');
        var n = EQ.filter(function (e) { return e.categorie === c && e.poule === po; }).length + 1;
        q(sb.from('double_equipes').insert({ id: 'T' + Date.now().toString(36), categorie: c, poule: po, numero: n, joueur1: $('dn-1').value.trim(), joueur2: $('dn-2').value.trim() || null })).then(function () { toast('Équipe ajoutée'); fermer(); charger(); }).catch(function () { toast('Ajout impossible'); });
      };
    });
  };
  $('dbx-imp').onclick = function () { $('dbx-f').click(); };
  $('dbx-f').onchange = function () {
    var f = this.files && this.files[0]; if (!f) return;
    Promise.all([chargerXlsx(), f.arrayBuffer()]).then(function (r) {
      var X = r[0], wb = X.read(r[1], { type: 'array', cellDates: true });
      var feuille = function (nom) { var ws = wb.Sheets[nom] || wb.Sheets[Object.keys(wb.Sheets).filter(function (k) { return norm(k) === norm(nom); })[0]]; return ws ? X.utils.sheet_to_json(ws, { raw: false, defval: '' }) : null; };
      var eqs = feuille('Equipes'), dis = feuille('Dispos') || [], res = feuille('Resultats') || [];
      if (!eqs || !eqs.length) throw new Error('Onglet « Equipes » introuvable dans ce fichier');
      var E = eqs.filter(function (e) { return e.id && e.joueur1; }).map(function (e) { return { id: String(e.id).trim(), categorie: String(e.categorie).trim(), poule: parseInt(e.poule, 10), numero: parseInt(e.numero, 10) || 0, joueur1: String(e.joueur1).trim(), joueur2: String(e.joueur2 || '').trim() || null }; });
      var ids = E.map(function (e) { return e.id; });
      var Dd = dis.filter(function (d) { return ids.indexOf(String(d.equipe).trim()) >= 0 && /^[01]{21}$/.test(String(d.creneaux).trim()); }).map(function (d) { return { equipe_id: String(d.equipe).trim(), joueur: parseInt(d.joueur, 10) === 2 ? 2 : 1, creneaux: String(d.creneaux).trim(), maj: d.maj ? new Date(d.maj).toISOString() : new Date().toISOString() }; });
      var date = function (v) { var t = new Date(v); if (isNaN(t)) { var m = String(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); t = m ? new Date(+m[3], +m[2] - 1, +m[1], 12) : new Date(); } return t.toISOString(); };
      var st = function (v) { var n = norm(v); return n.indexOf('valid') === 0 ? 'validé' : n.indexOf('refus') === 0 ? 'refusé' : 'en attente'; };
      var R = res.filter(function (x) { return ids.indexOf(String(x.gagnant).trim()) >= 0 && ids.indexOf(String(x.perdant).trim()) >= 0 && String(x.gagnant).trim() !== String(x.perdant).trim(); }).map(function (x) {
        return { date: date(x.date), categorie: String(x.categorie).trim(), poule: parseInt(x.poule, 10), gagnant: String(x.gagnant).trim(), perdant: String(x.perdant).trim(), score: String(x.score || '').trim() || null, forfait: norm(x.forfait) === 'oui', saisi_nom: String(x.saisiPar || '').trim() || null, statut: st(x.statut), traite_le: x.traiteLe ? date(x.traiteLe) : null };
      });
      if (!confirm('Reprendre ' + E.length + ' équipes, ' + Dd.length + ' dispos et ' + R.length + ' scores ? Les données du double déjà dans l\'appli du club seront remplacées.')) return;
      return q(sb.from('double_resultats').delete().not('id', 'is', null)).then(function () { return q(sb.from('double_dispos').delete().not('equipe_id', 'is', null)); })
        .then(function () { return q(sb.from('double_equipes').delete().not('id', 'is', null)); })
        .then(function () { return q(sb.from('double_equipes').insert(E)); })
        .then(function () { return Dd.length ? q(sb.from('double_dispos').insert(Dd)) : null; })
        .then(function () { return R.length ? q(sb.from('double_resultats').insert(R)) : null; })
        .then(function () { toast('Tournoi repris : ' + E.length + ' équipes, ' + R.length + ' scores'); charger(); });
    }).catch(function (e) { toast(e && e.message && e.message.indexOf('Onglet') === 0 ? e.message : 'Reprise impossible : vérifie le fichier'); }).then(function () { $('dbx-f').value = ''; });
  };
  charger();
}

// ---------- Missions des coachs ----------
function vueMissions(m) {
  m.innerHTML = entete('Missions coachs', 'Ce que les coachs doivent faire passer pendant leurs séances (communication d\'un stage, rappel, consigne…). Ils les voient dans leur espace coach de l\'appli et les cochent une fois faites.', '<button class="btn" id="mi-new">Nouvelle mission</button>') + '<div id="mi-l"><div class="skel"></div></div>';
  var L = [], COACHS = [];
  var charger = function () {
    Promise.all([q(sb.from('coach_missions').select('*').order('created_at', { ascending: false })), q(sb.rpc('roles_liste')).catch(function () { return []; })]).then(function (r) {
      L = r[0] || []; COACHS = [];
      (r[1] || []).forEach(function (x) { if (x.nom_coach && COACHS.indexOf(x.nom_coach) < 0) COACHS.push(x.nom_coach); });
      $('mi-l').innerHTML = (COACHS.length ? '' : '<div class="card small" style="margin-bottom:12px">Aucun coach n\'a encore de prénom de coach : règle-le dans <a href="#/acces">Accès et rôles</a> (rôle « Coach des cours »).</div>') +
        (L.length ? '<div class="stack">' + L.map(function (x) {
          return '<div class="card stack click" data-mi="' + x.id + '" style="gap:6px"><div style="display:flex;justify-content:space-between;gap:8px"><b>' + esc(x.titre) + '</b>' + (x.faite_le ? '<span class="badge b-ok">Faite' + (x.faite_par ? ' par ' + esc(x.faite_par) : '') + '</span>' : '<span class="badge b-warn">À faire</span>') + '</div>' +
            '<span class="mut xs">Pour ' + esc(x.pour_nom || 'tous les coachs') + (x.echeance ? ' · avant le ' + esc(fmtJ(new Date(x.echeance + 'T12:00:00'))) : '') + '</span>' + (x.texte ? '<span class="small" style="white-space:pre-line">' + esc(x.texte) + '</span>' : '') +
            (x.image_url ? '<img src="' + esc(x.image_url) + '" alt="" style="max-width:220px;border-radius:10px">' : '') + '</div>';
        }).join('') + '</div>' : '<div class="card empty">Aucune mission pour le moment.</div>');
      all('[data-mi]').forEach(function (c) { c.onclick = function () { form(L.filter(function (x) { return x.id === c.dataset.mi; })[0]); }; });
    }).catch(function () { $('mi-l').innerHTML = '<div class="card empty">Impossible de charger les missions.</div>'; });
  };
  var form = function (x) {
    var nouveau = !x; x = x || {};
    panneau(nouveau ? 'Nouvelle mission' : 'Modifier la mission', '<div class="stack">' +
      '<label class="l">Pour<select class="f" id="mi-p"><option value="">Tous les coachs</option>' + COACHS.map(function (c) { return '<option' + (x.pour_nom === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></label>' +
      '<label class="l">Titre<input class="f" id="mi-t" maxlength="120" value="' + esc(x.titre) + '" placeholder="Ex. Présenter le stage de Noël à tes groupes"></label>' +
      '<label class="l">Consignes<textarea class="f" id="mi-x" rows="5" placeholder="Ce qu\'il faut dire, à qui, avant quand…">' + esc(x.texte) + '</textarea></label>' +
      '<div class="row2"><label class="l">À faire avant le (facultatif)<input class="f" type="date" id="mi-e" value="' + (x.echeance || '') + '"></label><label class="l">Lien (facultatif)<input class="f" id="mi-li" value="' + esc(x.lien) + '" placeholder="https://…"></label></div>' +
      '<label class="l">Photo / affiche (facultatif)<input class="f" type="file" id="mi-i" accept="image/*"></label>' + (x.image_url ? '<img src="' + esc(x.image_url) + '" alt="" style="max-width:200px;border-radius:10px"><label class="c"><input type="checkbox" id="mi-isup">Retirer la photo</label>' : '') +
      '<label class="c"><input type="checkbox" id="mi-n"' + (nouveau ? ' checked' : '') + '>Prévenir par notification</label>' +
      '<div class="chips"><button class="btn" id="mi-ok">Enregistrer</button><button class="btn line" id="mi-an">Annuler</button>' + (nouveau ? '' : '<button class="btn ko" id="mi-sup">Supprimer</button>') + '</div></div>', function () {
      $('mi-an').onclick = fermer;
      if ($('mi-sup')) $('mi-sup').onclick = function () { if (confirm('Supprimer cette mission ?')) q(sb.from('coach_missions').delete().eq('id', x.id)).then(function () { toast('Mission supprimée'); fermer(); charger(); }); };
      $('mi-ok').onclick = function () {
        var t = $('mi-t').value.trim(); if (!t) return toast('Il faut un titre');
        var li = $('mi-li').value.trim(); if (li && !/^https?:\/\//.test(li)) return toast('Le lien doit commencer par https://');
        $('mi-ok').disabled = true;
        var f = $('mi-i').files && $('mi-i').files[0];
        (f ? envoyerPhoto(f, 'missions') : Promise.resolve(x.image_url && !($('mi-isup') && $('mi-isup').checked) ? x.image_url : null)).then(function (img) {
          var row = { pour_nom: $('mi-p').value || null, titre: t, texte: $('mi-x').value.trim() || null, echeance: $('mi-e').value || null, lien: li || null, image_url: img };
          return nouveau ? q(sb.from('coach_missions').insert(row)) : q(sb.from('coach_missions').update(row).eq('id', x.id));
        }).then(function () {
          if ($('mi-n').checked) notifier({ mode: 'mission', pour_nom: $('mi-p').value || null, titre: 'Nouvelle mission coach', texte: t, url: '/app/#/coach' });
          toast('Mission enregistrée'); fermer(); charger();
        }).catch(function () { toast('Enregistrement impossible'); $('mi-ok').disabled = false; });
      };
    });
  };
  $('mi-new').onclick = function () { form(null); };
  charger();
}

// ---------- Réseaux sociaux : publications mises en avant ----------
function vueReseaux(m) {
  m.innerHTML = entete('Réseaux sociaux', 'Les publications Instagram ou Facebook mises en avant sur le site et sur l\'accueil de l\'appli. Colle le lien de la publication et ajoute sa photo (capture ou photo d\'origine).', '<button class="btn" id="rs-new">Mettre une publication en avant</button>') + '<div id="rs-l"><div class="skel"></div></div>';
  var L = [];
  var charger = function () {
    q(sb.from('mises_en_avant').select('*').order('ordre').order('created_at', { ascending: false })).then(function (l) {
      L = l || [];
      $('rs-l').innerHTML = L.length ? '<div class="grid">' + L.map(function (x) {
        return '<div class="card stack click" data-rs="' + x.id + '" style="gap:6px">' + (x.image_url ? '<img src="' + esc(x.image_url) + '" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px">' : '') +
          '<b class="small">' + (x.plateforme === 'facebook' ? 'Facebook' : x.plateforme === 'instagram' ? 'Instagram' : 'Lien') + '</b>' + (x.legende ? '<span class="small">' + esc(x.legende) + '</span>' : '') + (x.actif ? '<span class="badge b-ok">Affichée</span>' : '<span class="badge">Masquée</span>') + '</div>';
      }).join('') + '</div>' : '<div class="card empty">Aucune publication mise en avant. Le site et l\'appli affichent quand même les boutons Instagram et Facebook.</div>';
      all('[data-rs]').forEach(function (c) { c.onclick = function () { form(L.filter(function (x) { return x.id === c.dataset.rs; })[0]); }; });
    }).catch(function () { $('rs-l').innerHTML = '<div class="card empty">Impossible de charger.</div>'; });
  };
  var form = function (x) {
    var nouveau = !x; x = x || { plateforme: 'instagram', actif: true };
    panneau(nouveau ? 'Publication mise en avant' : 'Modifier', '<div class="stack">' +
      '<label class="l">Réseau<select class="f" id="rs-p"><option value="instagram"' + (x.plateforme === 'instagram' ? ' selected' : '') + '>Instagram</option><option value="facebook"' + (x.plateforme === 'facebook' ? ' selected' : '') + '>Facebook</option><option value="autre"' + (x.plateforme === 'autre' ? ' selected' : '') + '>Autre lien</option></select></label>' +
      '<label class="l">Lien de la publication<input class="f" id="rs-li" value="' + esc(x.lien) + '" placeholder="https://www.instagram.com/p/…"></label>' +
      '<label class="l">Légende courte<input class="f" id="rs-le" maxlength="140" value="' + esc(x.legende) + '" placeholder="Ex. Retour en images sur la Miss Cup !"></label>' +
      '<label class="l">Photo<input class="f" type="file" id="rs-i" accept="image/*"></label>' + (x.image_url ? '<img src="' + esc(x.image_url) + '" alt="" style="max-width:200px;border-radius:10px">' : '') +
      '<div class="row2"><label class="l">Ordre (1 = en premier)<input class="f" type="number" id="rs-o" value="' + esc(x.ordre || 0) + '"></label><label class="c" style="align-self:end"><input type="checkbox" id="rs-a"' + (x.actif ? ' checked' : '') + '>Affichée</label></div>' +
      '<div class="chips"><button class="btn" id="rs-ok">Enregistrer</button><button class="btn line" id="rs-an">Annuler</button>' + (nouveau ? '' : '<button class="btn ko" id="rs-sup">Supprimer</button>') + '</div></div>', function () {
      $('rs-an').onclick = fermer;
      if ($('rs-sup')) $('rs-sup').onclick = function () { if (confirm('Supprimer ?')) q(sb.from('mises_en_avant').delete().eq('id', x.id)).then(function () { toast('Supprimée'); fermer(); charger(); }); };
      $('rs-ok').onclick = function () {
        var li = $('rs-li').value.trim(); if (!/^https?:\/\//.test(li)) return toast('Colle le lien complet (https://…)');
        $('rs-ok').disabled = true;
        var f = $('rs-i').files && $('rs-i').files[0];
        (f ? envoyerPhoto(f, 'reseaux') : Promise.resolve(x.image_url || null)).then(function (img) {
          var row = { plateforme: $('rs-p').value, lien: li, legende: $('rs-le').value.trim() || null, image_url: img, ordre: parseInt($('rs-o').value, 10) || 0, actif: $('rs-a').checked };
          return nouveau ? q(sb.from('mises_en_avant').insert(row)) : q(sb.from('mises_en_avant').update(row).eq('id', x.id));
        }).then(function () { toast('Enregistré'); fermer(); charger(); }).catch(function () { toast('Enregistrement impossible'); $('rs-ok').disabled = false; });
      };
    });
  };
  $('rs-new').onclick = function () { form(null); };
  charger();
}

// ---------- Next Gen : les jeunes qui encadrent un cours ----------
var GRADES_NG = [['mini_coach', 'Mini coach'], ['coach_junior', 'Coach junior'], ['coach_next_gen', 'Coach Next Gen']];
function vueNextGen(m) {
  m.innerHTML = entete('Next Gen', 'Les jeunes du parcours Next Gen (mini coach, coach junior, coach Next Gen) qui s\'engagent sur un cours. Le cours apparaît dans l\'agenda de leur famille, avec leurs horaires (préparation comprise).', '<button class="btn" id="ng-new">Ajouter un engagement</button>') + '<div id="ng-l"><div class="skel"></div></div>';
  var CR = [], NG = [];
  var JRS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  var nomCours = function (n) { if (!n.groupe_id) return (n.jour_semaine ? JRS[n.jour_semaine] + ' · ' : '') + (n.libelle || 'Encadrement'); var c = CR.filter(function (x) { return x.groupe_id === n.groupe_id; })[0]; return (c && c.groupes ? c.groupes.nom : nomGroupe(n.groupe_id)) + (n.libelle ? ' · ' + n.libelle : ''); };
  var ABS = [];
  var hh = function (t) { return t ? t.slice(0, 5).replace(':', 'h') : ''; };
  var charger = function () {
    Promise.all([q(sb.from('nextgen').select('*, personnes(prenom, nom)').order('created_at')), q(sb.from('creneaux').select('groupe_id, jour_semaine, heure_debut, heure_fin, lieu, encadrant, groupes(nom, type)').order('jour_semaine').order('heure_debut')),
      q(sb.from('nextgen_absences').select('id, jour, motif, created_at, nextgen_id').gte('jour', isoJour(new Date(Date.now() - 14 * 864e5))).order('jour')).catch(function () { return []; })]).then(function (r) {
      NG = r[0] || []; CR = r[1] || []; ABS = r[2] || [];
      var nomNg = function (id) { var n = NG.filter(function (x) { return x.id === id; })[0]; return n && n.personnes ? n.personnes.prenom + ' ' + n.personnes.nom : '?'; };
      $('ng-l').innerHTML = (ABS.length ? '<div class="card stack" style="margin-bottom:14px"><b>Absences signalées</b>' + ABS.map(function (a) { return '<div class="small"><b>' + esc(nomNg(a.nextgen_id)) + '</b> · ' + esc(fmtJ(new Date(a.jour + 'T12:00:00'))) + (a.motif ? ' · ' + esc(a.motif) : '') + ' <span class="mut xs">(signalée le ' + esc(fmtJ(new Date(a.created_at))) + ' à ' + fmtH(new Date(a.created_at)) + ')</span></div>'; }).join('') + '</div>' : '') + (NG.length ? GRADES_NG.map(function (g) {
        var l = NG.filter(function (n) { return n.grade === g[0]; });
        return l.length ? '<div class="sect">' + g[1] + ' (' + l.length + ')</div><div class="tw"><table class="t"><thead><tr><th>Jeune</th><th>Cours</th><th>Présence</th><th>Période</th><th></th></tr></thead><tbody>' + l.map(function (n) {
          return '<tr class="click" data-ng="' + n.id + '"><td><b>' + esc(n.personnes ? n.personnes.prenom + ' ' + n.personnes.nom : '?') + '</b>' + (n.notes ? '<div class="mut xs">' + esc(n.notes) + '</div>' : '') + '</td><td class="small">' + esc(nomCours(n)) + '</td><td class="small">' + hh(n.arrivee) + ' – ' + hh(n.depart) + '</td><td class="small">' + (n.du || n.au ? (n.du ? fmtJ(new Date(n.du + 'T12:00:00')) : '…') + ' → ' + (n.au ? fmtJ(new Date(n.au + 'T12:00:00')) : '…') : 'Toute la saison') + '</td><td class="act"><button class="btn sm ko" data-ngx="' + n.id + '">Retirer</button></td></tr>';
        }).join('') + '</tbody></table></div>' : '';
      }).join('') : '<div class="card empty">Aucun engagement Next Gen pour le moment.</div>');
      all('[data-ng]').forEach(function (tr) { tr.onclick = function (ev) { if (ev.target.closest('[data-ngx]')) return; form(NG.filter(function (x) { return x.id === tr.dataset.ng; })[0]); }; });
      all('[data-ngx]').forEach(function (b) { b.onclick = function () { if (confirm('Retirer cet engagement ?')) q(sb.from('nextgen').delete().eq('id', b.dataset.ngx)).then(function () { toast('Engagement retiré'); charger(); }).catch(function () { toast('Action impossible'); }); }; });
    }).catch(function () { $('ng-l').innerHTML = '<div class="card empty">Impossible de charger les engagements.</div>'; });
  };
  var form = function (n) {
    var nouveau = !n; n = n || { grade: 'coach_next_gen' }; var pers = n.personnes ? { id: n.personne_id, prenom: n.personnes.prenom, nom: n.personnes.nom } : null;
    var jours = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    var cours = CR.filter(function (c) { return c.groupes && c.groupes.type === 'creneau'; });
    panneau(nouveau ? 'Nouvel engagement Next Gen' : 'Modifier l\'engagement', '<div class="stack">' +
      '<div class="l">Jeune<div id="ng-p" class="small" style="margin:6px 0">' + (pers ? '<b>' + esc(pers.prenom + ' ' + pers.nom) + '</b>' : '<span class="mut">Choisis un adhérent ci-dessous</span>') + '</div>' + (nouveau ? CHERCHEUR : '') + '</div>' +
      '<label class="l">Grade<select class="f" id="ng-g">' + GRADES_NG.map(function (g) { return '<option value="' + g[0] + '"' + (n.grade === g[0] ? ' selected' : '') + '>' + g[1] + '</option>'; }).join('') + '</select></label>' +
      '<label class="l">Cours encadré (facultatif)<select class="f" id="ng-c"><option value="">Aucun cours précis (choisir le jour ci-dessous)</option>' + cours.map(function (c) { return '<option value="' + c.groupe_id + '"' + (n.groupe_id === c.groupe_id ? ' selected' : '') + '>' + esc(c.groupes.nom) + '</option>'; }).join('') + '</select></label>' +
      '<div class="row2"><label class="l">Jour (si pas de cours précis)<select class="f" id="ng-j"><option value="">—</option>' + [1, 2, 3, 4, 5, 6, 7].map(function (j) { return '<option value="' + j + '"' + (n.jour_semaine === j ? ' selected' : '') + '>' + jours[j] + '</option>'; }).join('') + '</select></label>' +
      '<label class="l">Intitulé (facultatif)<input class="f" id="ng-li" maxlength="80" value="' + esc(n.libelle) + '" placeholder="Ex. Matinée école de tennis"></label></div>' +
      '<div class="row2"><label class="l">Arrive à<input class="f" type="time" id="ng-a" value="' + (n.arrivee ? n.arrivee.slice(0, 5) : '') + '"></label><label class="l">Repart à<input class="f" type="time" id="ng-d" value="' + (n.depart ? n.depart.slice(0, 5) : '') + '"></label></div>' +
      '<span class="mut xs">Par défaut : 30 minutes de préparation avant le cours, jusqu\'à la fin du cours.</span>' +
      '<div class="row2"><label class="l">À partir du (vide = toute la saison)<input class="f" type="date" id="ng-du" value="' + (n.du || '') + '"></label><label class="l">Jusqu\'au<input class="f" type="date" id="ng-au" value="' + (n.au || '') + '"></label></div>' +
      '<label class="l">Note (rôle, engagement…)<input class="f" id="ng-n" maxlength="200" value="' + esc(n.notes) + '" placeholder="Ex. Engagée sur la saison complète, aide sur les ateliers"></label>' +
      '<div class="chips"><button class="btn" id="ng-ok">Enregistrer</button><button class="btn line" id="ng-an">Annuler</button></div></div>', function (r) {
      if (nouveau) chargerPers().then(function () { chercheurPers(r, function (p) { pers = p; $('ng-p').innerHTML = '<b>' + esc(p.prenom + ' ' + p.nom) + '</b>'; }); });
      $('ng-c').onchange = function () {
        var c = CR.filter(function (x) { return x.groupe_id === $('ng-c').value; })[0]; if (!c) return;
        var t = c.heure_debut.split(':'), d = new Date(2000, 0, 1, +t[0], +t[1] - 30);
        if (!$('ng-a').value) $('ng-a').value = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
        if (!$('ng-d').value) $('ng-d').value = c.heure_fin.slice(0, 5);
      };
      $('ng-an').onclick = fermer;
      $('ng-ok').onclick = function () {
        if (!pers) return toast('Choisis le jeune');
        if (!$('ng-c').value && !$('ng-j').value) return toast('Choisis un cours, ou au moins le jour');
        if (!$('ng-a').value || !$('ng-d').value || $('ng-d').value <= $('ng-a').value) return toast('Vérifie les horaires');
        var row = { personne_id: pers.id, grade: $('ng-g').value, groupe_id: $('ng-c').value || null, jour_semaine: $('ng-c').value ? null : +$('ng-j').value, libelle: $('ng-li').value.trim() || null, arrivee: $('ng-a').value, depart: $('ng-d').value, du: $('ng-du').value || null, au: $('ng-au').value || null, notes: $('ng-n').value.trim() || null };
        (nouveau ? q(sb.from('nextgen').insert(row).select('id').single()) : q(sb.from('nextgen').update(row).eq('id', n.id).select('id').single())).then(function () { toast('Engagement enregistré'); fermer(); charger(); }).catch(function () { toast('Enregistrement impossible'); });
      };
    });
  };
  $('ng-new').onclick = function () { form(null); };
  chargerGroupes().then(charger);
}

// ---------- Équipe du club : l'organigramme. Les fonctions donnent les accès, rattachés à la personne (pas à une adresse)
var FONCTIONS = [
  ['direction', 'Direction sportive', 'Tout l\'espace gestion.'],
  ['coach', 'Coach', 'Ses cours dans son agenda, ses groupes, les notes, les missions, écrire à ses groupes.'],
  ['cordeur', 'Cordeur', 'L\'atelier cordage.'],
  ['accueil', 'Accueil', 'Club house, inscriptions, cordage, boutique, messages, annonces.'],
  ['president', 'Président·e', 'Accès bureau : adhérents, actus, événements, boutique…'],
  ['vice_president', 'Vice-président·e', 'Accès bureau.'],
  ['tresorier', 'Trésorier·e', 'Accès bureau.'],
  ['secretaire', 'Secrétaire', 'Accès bureau.'],
  ['bureau', 'Membre du bureau', 'Accès bureau.']
];
var NOM_FCT = {}; FONCTIONS.forEach(function (f) { NOM_FCT[f[0]] = f[1]; });
function vueEquipe(m) {
  m.innerHTML = entete('Équipe du club', 'L\'organigramme du club. Chaque fonction donne automatiquement les bons accès dans l\'appli, à la personne et non à une adresse mail : dès que son compte est relié à sa fiche (même avec une adresse perso), elle retrouve ses accès et ses cours.', '<button class="btn" id="eq-new">Ajouter un membre</button>') + '<div id="eq-l"><div class="skel"></div></div>';
  var EQ = [], CPT = [], CR = [];
  var JRS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  var coursDe = function (nc) {
    if (!nc) return [];
    var n = norm(nc).trim();
    return CR.filter(function (c) { return String(c.encadrant || '').split(/\s*(?:,|\bet\b|&|\+|\/)\s*/i).some(function (x) { return norm(x).trim() === n; }); });
  };
  var comptesDe = function (e) { return CPT.filter(function (c) { return (e.personne_id && c.personne_id === e.personne_id) || c.user_id === e.user_id; }); };
  var form = function (e) {
    var nouveau = !e; e = e || { fonctions: [], actif: true };
    var fiche = e.personne_id ? A.pers.filter(function (p) { return p.id === e.personne_id; })[0] : null;
    panneau(nouveau ? 'Ajouter un membre' : e.prenom + ' ' + (e.nom || ''), '<div class="stack">' +
      '<div class="l">Fiche ADOC<div id="eq-fiche" class="small" style="margin:6px 0">' + (fiche ? '<b>' + esc(fiche.prenom + ' ' + fiche.nom) + '</b>' : '<span class="mut">Aucune fiche : cherche la personne, ou écris son nom ci-dessous</span>') + '</div>' + CHERCHEUR + '</div>' +
      '<div class="row2"><label class="l">Prénom<input class="f" id="eq-p" value="' + esc(e.prenom) + '"></label><label class="l">Nom<input class="f" id="eq-n" value="' + esc(e.nom) + '"></label></div>' +
      '<div class="sect">Fonctions</div>' + FONCTIONS.map(function (f) { return '<label class="c" style="align-items:flex-start"><input type="checkbox" name="eqf" value="' + f[0] + '"' + (e.fonctions.indexOf(f[0]) >= 0 ? ' checked' : '') + '><span><b>' + f[1] + '</b><br><span class="mut xs">' + f[2] + '</span></span></label>'; }).join('') +
      '<label class="l" id="eq-ncl">Prénom écrit dans les horaires des cours<input class="f" id="eq-nc" value="' + esc(e.nom_coach || e.prenom) + '" placeholder="Ex. David"><span class="mut xs" style="font-weight:400">Ses cours sont retrouvés grâce à ce prénom (colonne « encadrant » des créneaux).</span></label>' +
      '<label class="c"><input type="checkbox" id="eq-a"' + (e.actif ? ' checked' : '') + '>Actif (décoche pour retirer les accès sans effacer la fiche)</label>' +
      '<div class="chips"><button class="btn" id="eq-ok">Enregistrer</button>' + (nouveau ? '' : '<button class="btn ko" id="eq-x">Retirer de l\'équipe</button>') + '</div></div>', function (r) {
      chercheurPers(r, function (p) { fiche = p; $('eq-fiche').innerHTML = '<b>' + esc(p.prenom + ' ' + p.nom) + '</b>'; $('eq-p').value = p.prenom; $('eq-n').value = p.nom; if (!$('eq-nc').value) $('eq-nc').value = p.prenom; });
      var maj = function () { $('eq-ncl').style.display = lus(r, 'eqf').indexOf('coach') >= 0 ? '' : 'none'; };
      all('input[name="eqf"]', r).forEach(function (i) { i.onchange = maj; }); maj();
      if ($('eq-x')) $('eq-x').onclick = function () { if (confirm('Retirer ' + e.prenom + ' de l\'équipe ? Ses accès liés à ses fonctions seront retirés.')) q(sb.from('equipe').delete().eq('id', e.id)).then(function () { toast('Retiré de l\'équipe'); fermer(); charger(); }); };
      $('eq-ok').onclick = function () {
        var pr = $('eq-p').value.trim(); if (!pr) return toast('Indique au moins le prénom');
        var fs = lus(r, 'eqf'); if (!fs.length) return toast('Coche au moins une fonction');
        var row = { personne_id: fiche ? fiche.id : null, prenom: pr, nom: $('eq-n').value.trim().toUpperCase() || null, fonctions: fs, nom_coach: fs.indexOf('coach') >= 0 ? ($('eq-nc').value.trim() || pr) : null, actif: $('eq-a').checked };
        (nouveau ? q(sb.from('equipe').insert(row)) : q(sb.from('equipe').update(row).eq('id', e.id))).then(function () { toast('Enregistré'); fermer(); charger(); })
          .catch(function (err) { toast(String(err && err.message || '').indexOf('duplicate') >= 0 ? 'Cette personne est déjà dans l\'équipe' : 'Enregistrement impossible'); });
      };
    });
  };
  var relierCompte = function (e) {
    var libres = CPT.filter(function (c) { return !c.personne_id || c.personne_id !== e.personne_id; });
    panneau('Relier un compte à ' + e.prenom, '<div class="stack"><span class="mut small">Choisis le compte avec lequel ' + esc(e.prenom) + ' s\'est connecté. ' + (e.personne_id ? 'Le compte sera relié à sa fiche ADOC : il verra sa fiche, ses cours et ses accès.' : 'Il récupérera ses accès.') + '</span>' +
      '<input class="f" id="rc-q" placeholder="Chercher une adresse ou un nom…"><div id="rc-l" class="stack" style="gap:6px"></div></div>', function () {
      var aff = function () {
        var t = norm($('rc-q').value).trim();
        $('rc-l').innerHTML = libres.filter(function (c) { return !t || norm(c.email + ' ' + (c.prenom || '') + ' ' + (c.nom || '')).indexOf(t) >= 0; }).slice(0, 30).map(function (c) {
          return '<button class="btn line" data-rcu="' + c.user_id + '" style="justify-content:flex-start;text-align:left"><span><b>' + esc(c.email) + '</b>' + (c.prenom ? '<br><span class="xs mut">nom indiqué : ' + esc(c.prenom + ' ' + c.nom) + '</span>' : '') + '</span></button>';
        }).join('') || '<span class="mut small">Aucun compte trouvé. La personne doit d\'abord se connecter une fois à l\'appli.</span>';
        all('[data-rcu]').forEach(function (b) { b.onclick = function () {
          var act = e.personne_id ? q(sb.rpc('compte_definir', { p_user: b.dataset.rcu, p_foyer: null, p_personne: e.personne_id })) : q(sb.from('equipe').update({ user_id: b.dataset.rcu }).eq('id', e.id));
          act.then(function () { toast('Compte relié'); fermer(); charger(); }).catch(function () { toast('Action impossible'); });
        }; });
      };
      $('rc-q').oninput = aff; aff();
    });
  };
  var charger = function () {
    Promise.all([q(sb.from('equipe').select('*').order('ordre').order('prenom')), q(sb.rpc('comptes_liste')), q(sb.from('creneaux').select('jour_semaine, heure_debut, heure_fin, encadrant, groupes(nom)').order('jour_semaine').order('heure_debut')), chargerPers()]).then(function (r) {
      EQ = r[0] || []; CPT = r[1] || []; CR = r[2] || [];
      var cat = function (e) { var f = e.fonctions; return f.indexOf('direction') >= 0 ? 0 : f.some(function (x) { return ['president', 'vice_president', 'tresorier', 'secretaire', 'bureau'].indexOf(x) >= 0; }) ? 1 : f.indexOf('coach') >= 0 ? 2 : 3; };
      var titres = ['Direction', 'Bureau', 'Coachs', 'Accueil et atelier'];
      var h = [0, 1, 2, 3].map(function (k) {
        var l = EQ.filter(function (e) { return cat(e) === k; }); if (!l.length) return '';
        return '<div class="sect">' + titres[k] + '</div><div class="pgrid">' + l.map(function (e) {
          var cs = comptesDe(e), cours = e.fonctions.indexOf('coach') >= 0 ? coursDe(e.nom_coach || e.prenom) : [];
          return '<div class="pcard" style="min-height:0;gap:8px' + (e.actif ? '' : ';opacity:.55') + '"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:17px">' + esc(e.prenom + ' ' + (e.nom || '')) + '</b><button class="btn sm line" data-eqe="' + e.id + '">Modifier</button></div>' +
            '<div class="chips" style="gap:4px">' + e.fonctions.map(function (f) { return '<span class="badge">' + NOM_FCT[f] + '</span>'; }).join('') + (e.actif ? '' : '<span class="badge b-ko">Inactif</span>') + '</div>' +
            (e.personne_id ? '' : '<span class="xs" style="color:var(--warn)">Pas de fiche ADOC reliée</span>') +
            (cours.length ? '<details><summary class="xs" style="cursor:pointer">' + cours.length + ' cours (« ' + esc(e.nom_coach) + ' » dans les horaires) ▾</summary><div class="xs mut" style="margin-top:4px;line-height:1.6">' + cours.map(function (c) { return JRS[c.jour_semaine] + ' ' + c.heure_debut.slice(0, 5).replace(':', 'h') + ' · ' + esc(String(c.groupes ? c.groupes.nom : '').replace(/^.*?·\s*/, '')); }).join('<br>') + '</div></details>' : e.fonctions.indexOf('coach') >= 0 ? '<span class="xs mut">Aucun cours trouvé pour « ' + esc(e.nom_coach || e.prenom) + ' » dans les horaires</span>' : '') +
            (cs.length ? cs.map(function (c) { return '<span class="xs" style="color:var(--ok)">✓ Compte : ' + esc(c.email) + '</span>'; }).join('') : '<span class="xs mut">Pas encore connecté à l\'appli</span>') +
            '<button class="btn sm ' + (cs.length ? 'ghost' : 'line') + '" data-eqc="' + e.id + '" style="align-self:flex-start">' + (cs.length ? 'Relier un autre compte' : 'Relier son compte') + '</button></div>';
        }).join('') + '</div>';
      }).join('');
      $('eq-l').innerHTML = (h || '<div class="card empty">Aucun membre pour le moment.</div>') + '<p class="mut xs" style="margin-top:16px">Les accès particuliers (coach d\'un groupe CLOC\'ARENA précis, responsable d\'une animation) se règlent dans « Accès particuliers ».</p>';
      all('[data-eqe]').forEach(function (b) { b.onclick = function () { form(EQ.filter(function (e) { return e.id === b.dataset.eqe; })[0]); }; });
      all('[data-eqc]').forEach(function (b) { b.onclick = function () { relierCompte(EQ.filter(function (e) { return e.id === b.dataset.eqc; })[0]); }; });
    }).catch(function () { $('eq-l').innerHTML = '<div class="card empty">Impossible de charger l\'équipe.</div>'; });
  };
  $('eq-new').onclick = function () { chargerPers().then(function () { form(null); }); };
  charger();
}

function vueAcces(m) {
  var ROLES_AC = [['direction', 'Direction sportive (tout)'], ['bureau', 'Bureau / président (adhérents, actus, événements, annonces)'], ['accueil', 'Accueil (club house, annonces, cordage, inscriptions, actus)'], ['cordeur', 'Cordeur'], ['enseignant', 'Coach des cours (ses cours dans son agenda, ses groupes, notes, missions)'], ['coach', 'Coach d\'un groupe CLOC\'ARENA ou d\'une animation (saisit les scores, voit les joueurs du groupe)'], ['responsable', 'Responsable d\'un groupe (même chose, sans être coach)']];
  m.innerHTML = entete('Accès particuliers', 'Qui peut faire quoi. Une même personne peut cumuler plusieurs rôles et plusieurs groupes. Elle doit s\'être connectée une fois à l\'appli avant de recevoir un rôle.') +
    '<div class="two"><div id="ac-l"><div class="skel"></div></div><div class="card stack"><b>Donner des rôles</b><label class="l">Adresse mail<input class="f" id="ac-m" type="email"></label>' +
    '<div class="l">Rôles (plusieurs possibles)<div class="stack" style="gap:6px;margin-top:6px">' + ROLES_AC.map(function (r) { return '<label class="small" style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-acrole="' + r[0] + '"> ' + r[1] + '</label>'; }).join('') + '</div></div>' +
    '<div class="l" id="ac-gl" hidden>Groupes concernés (plusieurs possibles)<input class="f" id="ac-gq" placeholder="Filtrer les groupes…" style="margin-top:6px"><div id="ac-g" class="stack" style="gap:4px;max-height:220px;overflow:auto;margin-top:6px;padding:6px;border:1px solid var(--line);border-radius:10px"></div></div>' +
    '<label class="l" id="ac-nl" hidden>Prénom de coach, tel qu\'il apparaît dans les créneaux<input class="f" id="ac-n" placeholder="Ex. Florian"></label>' +
    '<button class="btn" id="ac-ok">Ajouter</button>' +
    '<div class="sect">Ce que voit chaque rôle</div><div class="small list">' + ['direction', 'bureau', 'accueil', 'cordeur'].map(function (r) { return '<div class="it"><b>' + NOM_ROLE[r] + '</b><span class="mut xs" style="text-align:right">' + MODULES.filter(function (x) { return x[2].indexOf(r) >= 0; }).map(function (x) { return x[1]; }).join(', ') + '</span></div>'; }).join('') + '</div></div></div>';
  var charger = function () {
    q(sb.rpc('roles_liste')).then(function (l) {
      var par = {}, ordre = [];
      l.forEach(function (r) { if (!par[r.email]) { par[r.email] = []; ordre.push(r.email); } par[r.email].push(r); });
      $('ac-l').innerHTML = ordre.length ? '<div class="stack">' + ordre.map(function (mail) {
        var nc = par[mail][0].nom_coach;
        return '<div class="card stack" style="gap:8px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b class="small" style="word-break:break-all">' + esc(mail) + (nc ? ' <span class="badge b-ok">Coach : ' + esc(nc) + '</span>' : '') + '</b><button class="btn sm line" data-acplus="' + esc(mail) + '">+ rôle</button></div><div class="chips" style="flex-wrap:wrap">' +
          (function () {
            var puce = function (r, txt) { return '<span class="chip" style="display:inline-flex;gap:6px;align-items:center">' + esc(txt) + '<button title="Retirer" data-acr="' + r.id + '" style="border:0;background:none;cursor:pointer;color:var(--ko);font-weight:700;padding:0 2px">×</button></span>'; };
            var glob = par[mail].filter(function (r) { return !r.groupe; }), pg = {};
            par[mail].filter(function (r) { return r.groupe; }).forEach(function (r) { (pg[r.role] = pg[r.role] || []).push(r); });
            return glob.map(function (r) { return puce(r, NOM_ROLE[r.role] || r.role); }).join('') + '</div>' +
              Object.keys(pg).map(function (role) {
                var l = pg[role].sort(function (a, b) { return a.groupe.localeCompare(b.groupe, 'fr'); });
                return '<details class="acgrp"><summary><span>' + esc(NOM_ROLE[role] || role) + '</span><span class="badge">' + l.length + ' groupe' + (l.length > 1 ? 's' : '') + '</span><span class="mut xs" style="margin-left:auto">voir / retirer ▾</span></summary><div class="chips" style="flex-wrap:wrap;margin-top:8px">' +
                  l.map(function (r) { return puce(r, r.groupe); }).join('') + '</div></details>';
              }).join('') + '<div>';
          })() + '</div></div>';
      }).join('') + '</div>' : '<div class="card empty">Aucun rôle pour le moment.</div>';
      all('[data-acr]').forEach(function (b) { b.onclick = function () { if (confirm('Retirer ce rôle ?')) q(sb.rpc('role_retirer', { r: b.dataset.acr })).then(function () { toast('Rôle retiré'); charger(); }).catch(function (e) { toast(String(e.message || 'Action impossible').indexOf('direction') >= 0 ? 'Il faut garder au moins une personne à la direction' : 'Action impossible'); }); }; });
      all('[data-acplus]').forEach(function (b) { b.onclick = function () { $('ac-m').value = b.dataset.acplus; $('ac-m').focus(); }; });
      A.coachs = []; l.forEach(function (r) { if (r.nom_coach && A.coachs.indexOf(r.nom_coach) < 0) A.coachs.push(r.nom_coach); });
    }).catch(function () { $('ac-l').innerHTML = '<div class="card empty">Impossible de charger les rôles.</div>'; });
  };
  chargerGroupes().then(function () {
    $('ac-g').innerHTML = A.groupes.map(function (g) { return '<label class="small" data-gnom="' + esc(String(g.nom).toLowerCase()) + '" style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-acg="' + g.id + '"> ' + esc(g.nom) + '</label>'; }).join('');
  });
  $('ac-gq').oninput = function () { var v = this.value.toLowerCase(); all('[data-gnom]').forEach(function (x) { x.hidden = v && x.dataset.gnom.indexOf(v) < 0; }); };
  all('[data-acrole]').forEach(function (c) { c.onchange = function () {
    $('ac-gl').hidden = !all('[data-acrole]').some(function (x) { return x.checked && ['coach', 'responsable'].indexOf(x.dataset.acrole) >= 0; });
    $('ac-nl').hidden = !all('[data-acrole]').some(function (x) { return x.checked && x.dataset.acrole === 'enseignant'; });
  }; });
  $('ac-ok').onclick = function () {
    var mail = $('ac-m').value.trim();
    var roles = all('[data-acrole]').filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.acrole; });
    var grs = all('[data-acg]').filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.acg; });
    if (!mail) return toast('Indique une adresse');
    if (!roles.length) return toast('Coche au moins un rôle');
    var parGroupe = roles.filter(function (r) { return ['coach', 'responsable'].indexOf(r) >= 0; });
    if (parGroupe.length && !grs.length) return toast('Coche au moins un groupe pour le rôle coach ou responsable');
    var appels = [];
    roles.forEach(function (r) {
      if (parGroupe.indexOf(r) >= 0) grs.forEach(function (g) { appels.push({ mail: mail, le_role: r, groupe: g }); });
      else appels.push({ mail: mail, le_role: r, groupe: null });
    });
    $('ac-ok').disabled = true;
    var nomC = $('ac-n').value.trim();
    if (roles.indexOf('enseignant') >= 0 && !nomC) return toast('Indique le prénom de coach');
    Promise.all(appels.map(function (a) { return q(sb.rpc('role_ajouter', a)); }).concat(nomC ? [q(sb.rpc('compte_nom_coach_mail', { mail: mail, nom: nomC }))] : [])).then(function (rs) {
      if (rs.indexOf('inconnu') >= 0) toast('Cette personne doit d\'abord se connecter une fois à l\'appli');
      else { toast(appels.length > 1 ? appels.length + ' rôles ajoutés' : 'Rôle ajouté'); all('[data-acrole],[data-acg]').forEach(function (x) { x.checked = false; }); $('ac-gl').hidden = true; $('ac-nl').hidden = true; $('ac-n').value = ''; charger(); }
    }).catch(function () { toast('Action impossible'); }).then(function () { $('ac-ok').disabled = false; });
  };
  charger();
}

// ---------- Connexion ----------
function pageConnexion(msg) {
  var etape = 1, mail = '';
  var dessiner = function (info, err) {
    $('root').innerHTML = '<div class="login"><div style="text-align:center;margin-bottom:18px"><img src="../logo.png" alt="" style="width:64px;height:64px;border-radius:50%;background:#fff"><h1 style="font-family:var(--disp);font-size:32px;margin-top:8px">Espace gestion</h1><p class="mut">CLOCA Tennis · réservé à l\'équipe du club</p></div>' +
      '<div class="card stack">' + (msg ? '<p class="small" style="margin:0;color:var(--ko)">' + esc(msg) + '</p>' : '') +
      (etape === 1 ? '<label class="l">Adresse mail<input class="f" id="lg-m" type="email" autocomplete="email" value="' + esc(mail) + '"></label><button class="btn" id="lg-s">Recevoir mon code</button>'
        : '<label class="l">Code reçu par mail<input class="f" id="lg-c" inputmode="numeric" autocomplete="one-time-code"></label><button class="btn" id="lg-o">Me connecter</button><button class="btn line" id="lg-b">Changer d\'adresse</button>') +
      '<p class="small" style="margin:0;color:' + (err ? 'var(--ko)' : 'var(--mut)') + '">' + esc(info || '') + '</p></div><p class="mut xs" style="text-align:center"><a href="../">Retour à l\'appli</a></p></div>';
    if ($('lg-s')) $('lg-s').onclick = function () {
      mail = $('lg-m').value.trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return dessiner('Vérifie ton adresse mail.', true);
      $('lg-s').disabled = true;
      sb.auth.signInWithOtp({ email: mail, options: { emailRedirectTo: location.origin + location.pathname } }).then(function (r) {
        if (r.error) return dessiner(r.error.status === 429 ? 'Trop de demandes : attends quelques minutes.' : 'L\'envoi a échoué.', true);
        etape = 2; msg = ''; dessiner('Un code vient de partir vers ' + mail + '.');
      });
    };
    if ($('lg-o')) $('lg-o').onclick = function () {
      var c = ($('lg-c').value || '').replace(/\s/g, ''); if (!/^\d{6,10}$/.test(c)) return dessiner('Le code contient uniquement des chiffres.', true);
      sb.auth.verifyOtp({ email: mail, token: c, type: 'email' }).then(function (r) { if (r.error) dessiner('Code incorrect ou expiré.', true); });
    };
    if ($('lg-b')) $('lg-b').onclick = function () { etape = 1; dessiner(); };
  };
  dessiner();
}

// ---------- Routeur ----------
// ---------- Messagerie : messages aux familles, aux groupes, aux inscrits d'une séance, aux coachs
var MSF = { vue: 'envoyes' };
var CIBLES_MSG = { tous: 'Tout le club', coachs: 'Les coachs', groupes: 'Des groupes', evenement: 'Une séance ou un événement' };
var SOURCES_MSG = { direct: 'Message', actu: 'Actu', seance: 'Séance' };
function vueMessages(m) {
  m.innerHTML = entete('Messagerie', 'Les messages arrivent dans la boîte « Messages » de l\'appli des personnes concernées, avec une notification. Ils vont sur le compte de la famille : jamais de message privé à un enfant. Les réponses partent par mail à l\'adresse que tu choisis.', '<button class="btn" id="ms-new">Nouveau message</button>') +
    '<div class="toolbar"><div class="chips">' + [['envoyes', 'Messages envoyés'], ['adresses', 'Adresses de réponse']].map(function (x) { return '<button class="chip' + (MSF.vue === x[0] ? ' on' : '') + '" data-msv="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div><div id="ms-l"><div class="skel"></div></div>';
  var AD = [], EV = [];
  var nomCible = function (x) {
    if (x.cible === 'groupes') return (x.groupes || []).map(nomGroupe).join(', ');
    if (x.cible === 'evenement') { var e = EV.filter(function (y) { return y.id === x.evenement_id; })[0]; return e ? e.titre + ' (' + fmtJ(new Date(e.debut)) + ')' : 'Séance'; }
    return CIBLES_MSG[x.cible];
  };
  var formMsg = function () {
    var maint = new Date(); maint.setDate(maint.getDate() - 1);
    var evts = EV.filter(function (e) { return new Date(e.debut) >= maint; }).slice(0, 80);
    panneau('Nouveau message', '<div class="stack">' +
      '<label class="l">De la part de<select class="f" id="mn-de">' + ['Direction sportive', 'CLOCA Tennis', 'L\'accueil du club', 'Le bureau'].map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select></label>' +
      '<label class="l">À qui ?<select class="f" id="mn-c">' + Object.keys(CIBLES_MSG).map(function (k) { return '<option value="' + k + '">' + CIBLES_MSG[k] + '</option>'; }).join('') + '</select></label>' +
      '<div id="mn-gs" hidden>' + choixGroupes([], 'mg') + '</div>' +
      '<label class="l" id="mn-el" hidden>Séance ou événement<select class="f" id="mn-e"><option value="">Choisir…</option>' + evts.map(function (e) { return '<option value="' + e.id + '">' + esc(fmtJ(new Date(e.debut)) + ' · ' + e.titre) + '</option>'; }).join('') + '</select><span class="mut xs" style="font-weight:400">Les familles des groupes de la séance, ou seulement les inscrits si elle est sur inscription.</span></label>' +
      '<label class="l">Objet<input class="f" id="mn-t" maxlength="120" placeholder="Ex. Pas de cours samedi 14 novembre"></label>' +
      '<label class="l">Message<textarea class="f" id="mn-x" rows="6" maxlength="4000"></textarea></label>' +
      '<label class="l">Les réponses arrivent à<select class="f" id="mn-r">' + AD.filter(function (a) { return a.actif; }).map(function (a) { return '<option value="' + a.id + '">' + esc(a.libelle + ' · ' + a.email) + '</option>'; }).join('') + '</select></label>' +
      '<span class="mut xs">Chaque famille voit à qui le message s\'adresse (ex. « Pour Enora, Mila ») et reçoit une notification si elle les a activées.</span>' +
      '<button class="btn" id="mn-ok">Envoyer</button></div>', function (r) {
      lierChips(r);
      $('mn-c').onchange = function () { $('mn-gs').hidden = this.value !== 'groupes'; $('mn-el').hidden = this.value !== 'evenement'; };
      $('mn-ok').onclick = function () {
        var c = $('mn-c').value, gs = lus(r, 'mg'), t = $('mn-t').value.trim(), x = $('mn-x').value.trim();
        if (c === 'groupes' && !gs.length) return toast('Choisis au moins un groupe');
        if (c === 'evenement' && !$('mn-e').value) return toast('Choisis la séance');
        if (!t || !x) return toast('Écris un objet et un message');
        if (c === 'tous' && !confirm('Envoyer ce message à tout le club ?')) return;
        $('mn-ok').disabled = true;
        diffuser({ titre: t, texte: x, cible: c, groupes: c === 'groupes' ? gs : null, evt: c === 'evenement' ? $('mn-e').value : null, repondre: $('mn-r').value || null, expediteur: $('mn-de').value,
          lien: c === 'evenement' ? '#/evenement/' + $('mn-e').value : null }).then(function (res) { if (res) { fermer(); charger(); } else $('mn-ok').disabled = false; });
      };
    });
  };
  var charger = function () {
    Promise.all([q(sb.from('adresses_reponse').select('*').order('ordre').order('libelle')), q(sb.from('evenements').select('id, titre, debut').order('debut')), chargerGroupes(),
      MSF.vue === 'envoyes' ? q(sb.from('messages').select('*, message_destinataires(lu_le)').order('created_at', { ascending: false }).limit(150)) : Promise.resolve([])]).then(function (r) {
      AD = r[0] || []; EV = r[1] || [];
      var h = '';
      if (MSF.vue === 'envoyes') {
        var L = r[3] || [];
        h = L.length ? '<div class="card stack" style="gap:0;padding:4px 0">' + L.map(function (x, i) {
          var ds = x.message_destinataires || [], lus2 = ds.filter(function (d) { return d.lu_le; }).length;
          return '<details style="padding:12px 16px;' + (i ? 'border-top:1px solid var(--bd)' : '') + '"><summary style="cursor:pointer;list-style:none;display:flex;gap:10px;flex-wrap:wrap;align-items:baseline">' +
            '<span class="mut xs" style="min-width:92px">' + esc(fmtJ(new Date(x.created_at))) + ' ' + esc(fmtH(new Date(x.created_at))) + '</span><span class="badge">' + SOURCES_MSG[x.source] + '</span>' +
            '<span style="flex:1;min-width:200px"><b class="small">' + esc(x.titre) + '</b><br><span class="xs mut">' + esc(x.expediteur) + ' → ' + esc(nomCible(x)) + '</span></span>' +
            '<span class="xs"><b>' + lus2 + '</b> / ' + ds.length + ' lu' + (lus2 > 1 ? 's' : '') + '</span></summary>' +
            '<div class="stack" style="gap:8px;margin-top:10px;padding-left:102px"><div class="small" style="white-space:pre-line">' + esc(x.texte) + '</div>' +
            (x.repondre_a ? '<span class="xs mut">Réponses à : ' + esc((x.repondre_libelle ? x.repondre_libelle + ' · ' : '') + x.repondre_a) + '</span>' : '') +
            '<button class="btn sm ko" data-msx="' + x.id + '" style="align-self:flex-start">Retirer de la messagerie</button></div></details>';
        }).join('') + '</div>' : '<div class="card empty">Aucun message envoyé pour le moment.</div>';
      } else {
        h = '<p class="mut small">Ces adresses sont proposées quand on écrit un message. Indique le prénom du coach (comme dans « Accès et rôles ») pour que ses messages répondent à son adresse par défaut.</p>' +
          '<div class="tw"><table class="t"><thead><tr><th>Nom affiché</th><th>Adresse mail</th><th>Coach (prénom)</th><th>Active</th><th></th></tr></thead><tbody>' + AD.map(function (a) {
            return '<tr><td><input class="f" data-arl="' + a.id + '" value="' + esc(a.libelle) + '"></td><td><input class="f" type="email" data-are="' + a.id + '" value="' + esc(a.email) + '"></td><td><input class="f" data-arc="' + a.id + '" value="' + esc(a.nom_coach) + '" placeholder="—" style="width:110px"></td>' +
              '<td><input type="checkbox" data-ara="' + a.id + '"' + (a.actif ? ' checked' : '') + '></td><td class="act"><button class="btn sm" data-ars="' + a.id + '">Enregistrer</button> <button class="btn sm ko" data-arx="' + a.id + '">Supprimer</button></td></tr>';
          }).join('') + '</tbody></table></div>' +
          '<div class="card stack" style="margin-top:14px"><b>Ajouter une adresse</b><div style="display:flex;gap:8px;flex-wrap:wrap"><input class="f" id="ar-l" placeholder="Ex. Accueil du club" style="flex:1;min-width:160px"><input class="f" type="email" id="ar-e" placeholder="accueil@clocatennis.fr" style="flex:1;min-width:200px"><input class="f" id="ar-c" placeholder="Prénom coach (facultatif)" style="width:180px"><button class="btn" id="ar-ok">Ajouter</button></div></div>';
      }
      $('ms-l').innerHTML = h;
      all('[data-msx]').forEach(function (b) { b.onclick = function () { if (confirm('Retirer ce message de la messagerie des familles ?')) q(sb.from('messages').delete().eq('id', b.dataset.msx)).then(function () { toast('Message retiré'); charger(); }); }; });
      var mailOk = function (e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); };
      all('[data-ars]').forEach(function (b) { b.onclick = function () {
        var id = b.dataset.ars, v = function (k) { return document.querySelector('[data-' + k + '="' + id + '"]'); };
        if (!v('arl').value.trim() || !mailOk(v('are').value.trim())) return toast('Nom ou adresse invalide');
        q(sb.from('adresses_reponse').update({ libelle: v('arl').value.trim(), email: v('are').value.trim().toLowerCase(), nom_coach: v('arc').value.trim() || null, actif: v('ara').checked }).eq('id', id)).then(function () { toast('Adresse enregistrée'); charger(); }).catch(function () { toast('Réservé à la direction'); });
      }; });
      all('[data-arx]').forEach(function (b) { b.onclick = function () { if (confirm('Supprimer cette adresse ?')) q(sb.from('adresses_reponse').delete().eq('id', b.dataset.arx)).then(function () { toast('Adresse supprimée'); charger(); }).catch(function () { toast('Réservé à la direction'); }); }; });
      if ($('ar-ok')) $('ar-ok').onclick = function () {
        var l = $('ar-l').value.trim(), e = $('ar-e').value.trim().toLowerCase(); if (!l || !mailOk(e)) return toast('Indique un nom et une adresse valide');
        q(sb.from('adresses_reponse').insert({ libelle: l, email: e, nom_coach: $('ar-c').value.trim() || null, ordre: AD.length + 1 })).then(function () { toast('Adresse ajoutée'); charger(); }).catch(function () { toast('Réservé à la direction'); });
      };
    }).catch(function () { $('ms-l').innerHTML = '<div class="card empty">Impossible de charger la messagerie.</div>'; });
  };
  all('[data-msv]').forEach(function (b) { b.onclick = function () { MSF.vue = b.dataset.msv; vueMessages(m); }; });
  $('ms-new').onclick = function () { if (!AD.length) return toast('Patiente une seconde…'); formMsg(); };
  charger();
}

// ---------- Historique : tout ce qui change dans l'appli, regroupé par jour, par personne et par type
var HIF = { periode: 7, cat: '', txt: '' };
var JCAT = {
  inscriptions: ['Inscriptions', 'inscription', 'inscriptions', 1], participations: ['Inscriptions', 'réponse présent/absent', 'réponses présent/absent', 1],
  evenements: ['Agenda', 'événement / séance', 'événements / séances'], evenement_groupes: ['Agenda', 'groupe d\'événement', 'groupes d\'événements'], evenement_quotas: ['Agenda', 'quota de places', 'quotas de places'],
  creneaux: ['Agenda', 'créneau de cours', 'créneaux de cours'], periodes_sans_cours: ['Agenda', 'période sans cours', 'périodes sans cours', 1],
  personnes: ['Adhérents', 'adhérent', 'adhérents'], foyers: ['Adhérents', 'famille', 'familles', 1], groupe_membres: ['Adhérents', 'joueur dans un groupe', 'joueurs dans des groupes'], creneaux_en_attente: ['Adhérents', 'élève à placer', 'élèves à placer'],
  groupes: ['Groupes', 'groupe', 'groupes'],
  arena_matchs: ['Scores CLOC\'ARENA', 'match', 'matchs'], arena_match_joueurs: ['Scores CLOC\'ARENA', 'joueur de match', 'joueurs de matchs'], arena_points: ['Scores CLOC\'ARENA', 'ligne de points', 'lignes de points', 1], arena_participations: ['Scores CLOC\'ARENA', 'participation', 'participations', 1], arena_formats: ['Scores CLOC\'ARENA', 'format', 'formats'],
  double_resultats: ['Double interne', 'score', 'scores'], double_equipes: ['Double interne', 'équipe', 'équipes', 1], double_dispos: ['Double interne', 'disponibilité', 'disponibilités', 1],
  publications: ['Actus', 'actu', 'actus', 1], publication_groupes: ['Actus', 'destinataire d\'actu', 'destinataires d\'actus'], mises_en_avant: ['Réseaux sociaux', 'publication mise en avant', 'publications mises en avant', 1],
  annonces: ['Petites annonces', 'annonce', 'annonces', 1],
  cordage_demandes: ['Cordage', 'demande de cordage', 'demandes de cordage', 1], cordages: ['Cordage', 'cordage', 'cordages'], cordage_tarifs: ['Cordage', 'tarif', 'tarifs'],
  boutique_ventes: ['Boutique', 'vente', 'ventes', 1], boutique_articles: ['Boutique', 'article', 'articles'], boutique_mouvements: ['Boutique', 'mouvement de stock', 'mouvements de stock'],
  coach_missions: ['Coachs', 'mission', 'missions', 1], notes_coach: ['Coachs', 'note de coach', 'notes de coach', 1],
  nextgen: ['Next Gen', 'jeune Next Gen', 'jeunes Next Gen'], nextgen_absences: ['Next Gen', 'absence', 'absences', 1],
  club_presence: ['Présence au club', 'changement', 'changements'],
  messages: ['Messagerie', 'message', 'messages'], adresses_reponse: ['Messagerie', 'adresse de réponse', 'adresses de réponse', 1],
  equipe: ['Comptes et accès', 'membre de l\'équipe', 'membres de l\'équipe'], comptes: ['Comptes et accès', 'nouveau compte', 'nouveaux comptes'], acces_emails: ['Comptes et accès', 'adresse autorisée', 'adresses autorisées', 1], responsabilites: ['Comptes et accès', 'rôle', 'rôles']
};
var JACT = { ajout: ['ajouté', 'ajoutés', 'b-ok', 'ajoutée', 'ajoutées'], modif: ['modifié', 'modifiés', '', 'modifiée', 'modifiées'], suppr: ['supprimé', 'supprimés', 'b-ko', 'supprimée', 'supprimées'] };
function jValeur(v) {
  if (v === null || v === undefined || v === '') return '(vide)';
  if (v === true) return 'oui'; if (v === false) return 'non';
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 120);
  var s2 = String(v);
  if (/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(s2)) { var d = new Date(s2); return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
  if (/^\d{4}-\d\d-\d\d$/.test(s2)) return new Date(s2 + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(s2)) return '…';
  return s2.length > 120 ? s2.slice(0, 120) + '…' : s2;
}
function jChamp(k) { return k.replace(/_id$/, '').replace(/_/g, ' '); }
function vueHistorique(m) {
  m.innerHTML = entete('Historique', 'Tout ce qui est ajouté, modifié ou supprimé dans l\'appli et la gestion : qui, quand, quoi. Clique sur une ligne pour voir le détail.') +
    '<div class="toolbar"><div class="chips">' + [[1, 'Aujourd\'hui'], [7, '7 jours'], [30, '30 jours'], [400, 'Tout']].map(function (x) { return '<button class="chip' + (HIF.periode === x[0] ? ' on' : '') + '" data-hip="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<select class="f" id="hi-cat" style="max-width:220px"><option value="">Toutes les catégories</option>' + Object.keys(Object.keys(JCAT).reduce(function (o, t) { o[JCAT[t][0]] = 1; return o; }, {})).sort().map(function (c) { return '<option' + (HIF.cat === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' +
    '<input class="f" id="hi-q" placeholder="Chercher une personne, un nom…" value="' + esc(HIF.txt) + '" style="max-width:260px"></div><div id="hi-l"><div class="skel"></div></div>';
  var depuis = new Date(); depuis.setHours(0, 0, 0, 0); depuis.setDate(depuis.getDate() - (HIF.periode - 1));
  var L = [];
  var afficher = function () {
    var t = norm(HIF.txt).trim();
    var l = L.filter(function (x) { var c = JCAT[x.table_nom]; return (!HIF.cat || (c ? c[0] : 'Autre') === HIF.cat) && (!t || norm((x.auteur || '') + ' ' + (x.objet || '')).indexOf(t) >= 0); });
    if (!l.length) { $('hi-l').innerHTML = '<div class="card empty">Rien sur cette période.</div>'; return; }
    var jours = {}, ordreJ = [];
    l.forEach(function (x) {
      if (!jours[x.jour]) { jours[x.jour] = { paq: {}, ordre: [] }; ordreJ.push(x.jour); }
      var J = jours[x.jour], k = (x.auteur || 'Système') + '|' + x.table_nom + '|' + x.action;
      if (!J.paq[k]) { J.paq[k] = []; J.ordre.push(k); } J.paq[k].push(x);
    });
    $('hi-l').innerHTML = ordreJ.map(function (j) {
      var J = jours[j];
      return '<h3 style="margin:22px 0 8px;text-transform:capitalize">' + esc(new Date(j + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })) + '</h3><div class="card stack" style="gap:0;padding:4px 0">' + J.ordre.map(function (k, i) {
        var p = J.paq[k], x0 = p[0], c = JCAT[x0.table_nom] || ['Autre', x0.table_nom, x0.table_nom], a = JACT[x0.action];
        var ts = p.map(function (x) { return new Date(x.created_at).getTime(); }), hm = function (n) { return new Date(n).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); };
        var plage = hm(Math.min.apply(null, ts)) === hm(Math.max.apply(null, ts)) ? hm(ts[0]) : hm(Math.min.apply(null, ts)) + ' – ' + hm(Math.max.apply(null, ts));
        var resume = p.length === 1 ? c[1].charAt(0).toUpperCase() + c[1].slice(1) + ' ' + a[c[3] ? 3 : 0] + (x0.objet ? ' : <b>' + esc(x0.objet) + '</b>' : '') : '<b>' + p.length + ' ' + c[2] + '</b> ' + a[c[3] ? 4 : 1];
        var detail = p.map(function (x) {
          var champs = '';
          if (x.action === 'modif' && x.apres) champs = Object.keys(x.apres).map(function (f) { return '<div class="xs"><span class="mut">' + esc(jChamp(f)) + ' :</span> <s class="mut">' + esc(jValeur(x.avant && x.avant[f])) + '</s> → <b>' + esc(jValeur(x.apres[f])) + '</b></div>'; }).join('');
          else { var o = x.apres || x.avant || {}; champs = '<div class="xs mut">' + Object.keys(o).filter(function (f) { return o[f] !== null && o[f] !== '' && !/^(id|ordre|cree_par|created_by|maj_par|saisi_par|faite_par|auteur|user_id|legacy_id)$/.test(f) && !/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(String(o[f])); }).map(function (f) { return esc(jChamp(f)) + ' : ' + esc(jValeur(o[f])); }).join(' · ') + '</div>'; }
          return '<div style="padding:8px 0;border-top:1px solid var(--bd)"><div class="small"><span class="mut">' + esc(new Date(x.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })) + '</span> · ' + esc(x.objet || c[1]) + '</div>' + champs + '</div>';
        }).join('');
        return '<details style="padding:10px 16px;' + (i ? 'border-top:1px solid var(--bd)' : '') + '"><summary style="cursor:pointer;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;list-style:none"><span class="mut xs" style="min-width:86px">' + plage + '</span><span class="badge ' + a[2] + '">' + esc(c[0]) + '</span><span class="small" style="flex:1;min-width:200px">' + resume + '</span><span class="xs mut">par <b>' + esc(x0.auteur || 'Système') + '</b></span></summary><div style="margin-top:6px;padding-left:96px">' + detail + '</div></details>';
      }).join('') + '</div>';
    }).join('') + (L.length >= 3000 ? '<p class="mut xs">Seules les 3 000 dernières actions sont affichées : réduis la période.</p>' : '');
  };
  q(sb.from('journal').select('*').gte('created_at', depuis.toISOString()).order('created_at', { ascending: false }).limit(3000)).then(function (r) { L = r || []; afficher(); })
    .catch(function () { $('hi-l').innerHTML = '<div class="card empty">Historique indisponible pour le moment.</div>'; });
  all('[data-hip]').forEach(function (b) { b.onclick = function () { HIF.periode = +b.dataset.hip; vueHistorique(m); }; });
  $('hi-cat').onchange = function () { HIF.cat = this.value; afficher(); };
  $('hi-q').oninput = function () { HIF.txt = this.value; afficher(); };
}

var VUES = { messages: vueMessages, adoc: vueAdoc, accueil: vueAccueil, actus: vueActus, evenements: vueEvenements, inscriptions: vueInscriptions, adherents: vueAdherents, groupes: vueGroupes, annonces: vueAnnonces, cordage: vueCordage, arena: vueArena, nextgen: vueNextGen, missions: vueMissions, boutique: vueBoutique, double: vueDouble, reseaux: vueReseaux, presence: vuePresence, equipe: vueEquipe, acces: vueAcces, historique: vueHistorique };
function router() {
  if (!A.user) return;
  fermer();
  var parts = (location.hash || '#/accueil').replace(/^#\/?/, '').split('/'), v = parts[0] || 'accueil';
  A.rub = null;
  if (v === 'r') {
    var rr = RUBRIQUES.filter(function (x) { return x[2] === parts[1] && x[1].some(peut); })[0];
    if (rr) { A.rub = rr[2]; A.view = 'r'; cadre('<div class="skel"></div>'); vueRubrique($('main'), rr[2]); window.scrollTo(0, 0); return; }
    v = 'accueil';
  }
  if (!peut(v)) v = A.mods[0];
  A.view = v;
  cadre('<div class="skel"></div>');
  VUES[v]($('main'), parts[1]);
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', router);
function demarrer(session) {
  A.user = session ? session.user : null;
  if (!A.user) return pageConnexion();
  q(sb.from('responsabilites').select('role, groupe_id').eq('user_id', A.user.id)).then(function (r) {
    A.roles = r || [];
    A.mods = MODULES.filter(function (m) { return A.roles.some(function (x) { return !x.groupe_id && m[2].indexOf(x.role) >= 0; }); }).map(function (m) { return m[0]; });
    if (!A.mods.length) {
      $('root').innerHTML = '<div class="login"><div class="card stack"><b>Accès réservé à l\'équipe du club</b><span class="mut">Tu es connecté avec ' + esc(A.user.email) + ', mais cette adresse n\'a pas de rôle de gestion. Demande à la direction sportive de t\'en donner un.</span>' +
        (A.roles.some(function (x) { return x.role === 'coach' || x.role === 'responsable'; }) ? '<a class="btn" href="../#/gestion">Saisir des scores dans l\'appli</a>' : '') + '<a class="btn line" href="../">Ouvrir l\'appli</a><button class="btn ghost" id="lo">Changer de compte</button></div></div>';
      $('lo').onclick = function () { sb.auth.signOut().then(function () { location.reload(); }); };
      return;
    }
    router();
  }).catch(function () { pageConnexion('Connexion au club impossible pour le moment.'); });
}
if (!sb) { $('root').innerHTML = '<div class="login card">Connexion impossible : vérifie ta connexion internet.</div>'; return; }
sb.auth.getSession().then(function (r) { demarrer(r.data && r.data.session); });
sb.auth.onAuthStateChange(function (ev, session) { if (ev === 'SIGNED_IN' && (!A.user || A.user.id !== session.user.id)) demarrer(session); });
})();
