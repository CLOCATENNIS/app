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
  ['actus', 'Actus', ['direction', 'bureau', 'accueil']],
  ['evenements', 'Événements et séances', ['direction', 'bureau']],
  ['inscriptions', 'Inscriptions', ['direction', 'bureau', 'accueil']],
  ['adherents', 'Adhérents', ['direction', 'bureau', 'accueil']],
  ['adoc', 'Mise à jour ADOC', ['direction', 'bureau']],
  ['groupes', 'Groupes', ['direction', 'bureau']],
  ['annonces', 'Petites annonces', ['direction', 'bureau', 'accueil']],
  ['cordage', 'Cordage', ['direction', 'accueil', 'cordeur']],
  ['arena', 'CLOC\'ARENA', ['direction']],
  ['presence', 'Présence au club', ['direction', 'bureau', 'accueil', 'cordeur']],
  ['acces', 'Accès et rôles', ['direction']]
];
var NOM_ROLE = { direction: 'Direction sportive', bureau: 'Bureau', accueil: 'Accueil', cordeur: 'Cordeur', coach: 'Coach', responsable: 'Responsable' };
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
  ov.onclick = function (e) { if (e.target === ov) fermer(); };
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
  if (peut('arena')) p.push(nb(sb.from('arena_matchs').select('id', { count: 'exact', head: true }).eq('statut', 'propose')).then(function (n) { c.arena = n; }).catch(function () { }));
  return Promise.all(p).then(function () { return c; });
}
function cadre(contenu) {
  var moi = A.user.email;
  $('root').innerHTML = '<div class="layout"><aside><div class="brand"><img src="../logo.png" alt=""><div><b>CLOCA Tennis</b><br><span>ESPACE GESTION</span></div></div>' +
    '<nav class="nav" aria-label="Gestion">' + MODULES.filter(function (m) { return peut(m[0]); }).map(function (m) {
      return '<a href="#/' + m[0] + '" class="' + (A.view === m[0] ? 'on' : '') + '">' + m[1] + '<span class="n" data-cpt="' + m[0] + '" hidden></span></a>';
    }).join('') + '</nav>' +
    '<div class="side-foot">' + esc(moi) + '<br>' + A.roles.filter(function (r) { return !r.groupe_id; }).map(function (r) { return NOM_ROLE[r.role]; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).join(', ') +
    '<br><br><a href="../">Ouvrir l\'appli</a> · <a href="#" id="logout">Se déconnecter</a></div></aside><main id="main">' + contenu + '</main></div>';
  $('logout').onclick = function (e) { e.preventDefault(); sb.auth.signOut().then(function () { location.reload(); }); };
  compteurs().then(function (c) { Object.keys(c).forEach(function (k) { var e = document.querySelector('[data-cpt="' + k + '"]'); if (e && c[k]) { e.textContent = c[k]; e.hidden = false; } }); });
}
function entete(titre, sous, actions) {
  return '<div class="head"><div><h1>' + esc(titre) + '</h1>' + (sous ? '<p>' + sous + '</p>' : '') + '</div><div class="chips">' + (actions || '') + '</div></div>';
}

// ---------- Tableau de bord ----------
function vueAccueil(m) {
  var dans14 = new Date(Date.now() + 14 * 864e5);
  m.innerHTML = entete('Bonjour', 'Ce qui demande ton attention aujourd\'hui.') + '<div class="kpis" id="kpis"><div class="skel"></div></div><div class="two"><div class="card"><div class="sect" style="margin-top:0">Les 14 prochains jours</div><div id="dash-evts" class="list"><div class="skel"></div></div></div><div class="grid"><div id="presence"></div><div class="card" id="dash-liens"></div></div></div>';
  var k = [];
  var P = [];
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
      '<label class="c"><input type="checkbox" id="p-n">Envoyer aussi en notification sur les téléphones</label>' +
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
        save.then(function (r2) {
          return q(sb.from('publication_groupes').delete().eq('publication_id', r2.id)).then(function () {
            return vis === 'groupes' ? q(sb.from('publication_groupes').insert(gs.map(function (g) { return { publication_id: r2.id, groupe_id: g }; }))) : null;
          });
        }).then(function () {
          if ($('p-n').checked) notifier({ titre: (row.urgent ? '⚠️ ' : '') + titre, texte: row.texte || '', groupes: vis === 'groupes' ? gs : null, url: '/app/#/club/actus' });
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
    var r = sb.from('evenements').select('*, evenement_groupes(groupe_id), inscriptions(count)');
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
          '<td class="small">' + (e.inscription_ouverte || n ? '<a href="#/inscriptions/' + e.id + '">' + n + (e.places_max ? ' / ' + e.places_max : '') + '</a>' : '—') + '</td>' +
          '<td>' + (e.statut === 'annule' ? '<span class="badge b-ko">Annulé</span>' : e.statut === 'deplace' ? '<span class="badge b-warn">Déplacé</span>' : '<span class="badge b-ok">Prévu</span>') + '</td>' +
          '<td class="act"><button class="btn sm line" data-edup="' + e.id + '" title="Copier à la même heure la semaine suivante">+ 7 jours</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="card empty">Aucun événement.</div>';
      all('[data-e]').forEach(function (tr) { tr.onclick = function (ev) { if (ev.target.closest('[data-edup],a')) return; formEvt(EV.filter(function (x) { return x.id === tr.dataset.e; })[0]); }; });
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
      '<div class="row2"><label class="l">Nombre de places (vide = illimité)<input class="f" type="number" min="1" id="v-pl" value="' + esc(e.places_max) + '"></label><label class="l">Prix en € (facultatif)<input class="f" inputmode="decimal" id="v-pr" value="' + esc(e.prix_euros == null ? '' : String(e.prix_euros).replace('.', ',')) + '"></label></div>' +
      '<label class="c"><input type="checkbox" id="v-n">Prévenir les familles concernées par notification</label><input class="f" id="v-nm" placeholder="Message de la notification" hidden>' +
      '<div class="chips"><button class="btn" id="v-ok">Enregistrer</button><button class="btn line" id="v-an">Annuler</button>' + (nouveau ? '' : '<button class="btn ko" id="v-sup">Supprimer</button>') + '</div></div>', function (r) {
      lierChips(r);
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
          if ($('v-n').checked) notifier({ titre: row.statut === 'annule' ? 'Séance annulée' : row.statut === 'deplace' ? 'Changement de programme' : 'CLOCA Tennis', texte: $('v-nm').value, evenement_id: id, groupes: gs, url: '/app/#/evenement/' + id });
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
  Promise.all([q(sb.from('evenements').select('id, titre, debut, places_max, prix_euros, inscription_ouverte, inscriptions(count)').gte('debut', new Date(Date.now() - 60 * 864e5).toISOString()).order('debut')), chargerPers()]).then(function (r) {
    var l = r[0].filter(function (e) { return e.inscription_ouverte || (e.inscriptions[0] && e.inscriptions[0].count); });
    var sel = arg || (l.filter(function (e) { return new Date(e.debut) > new Date(); })[0] || l[l.length - 1] || {}).id;
    $('i-ev').innerHTML = l.length ? l.map(function (e) { var n = e.inscriptions[0] ? e.inscriptions[0].count : 0; return '<option value="' + e.id + '"' + (e.id === sel ? ' selected' : '') + '>' + esc(fmtJ(new Date(e.debut)) + ' · ' + e.titre + ' (' + n + (e.places_max ? '/' + e.places_max : '') + ')') + '</option>'; }).join('') : '<option value="">Aucun événement avec inscriptions</option>';
    $('i-ev').onchange = function () { location.hash = '#/inscriptions/' + this.value; };
    if (sel) liste(l.filter(function (e) { return e.id === sel; })[0] || r[0].filter(function (e) { return e.id === sel; })[0]);
  }).catch(function () { $('i-l').innerHTML = '<div class="card empty">Impossible de charger les inscriptions.</div>'; });
  var liste = function (ev) {
    if (!ev) return;
    q(sb.from('inscriptions').select('personne_id, statut, paye, created_at').eq('evenement_id', ev.id).order('created_at')).then(function (ins) {
      var pp = function (id) { return A.pers.filter(function (p) { return p.id === id; })[0] || { prenom: '?', nom: '' }; };
      var actifs = ins.filter(function (i) { return i.statut !== 'annule'; }), payes = actifs.filter(function (i) { return i.paye; }).length;
      $('i-l').innerHTML = '<div class="kpis"><div class="kpi"><b>' + actifs.length + (ev.places_max ? ' / ' + ev.places_max : '') + '</b><span>inscrits</span></div><div class="kpi"><b>' + payes + '</b><span>ont payé</span></div>' +
        (ev.prix_euros ? '<div class="kpi"><b>' + euros(payes * ev.prix_euros) + '</b><span>encaissé sur ' + euros(actifs.length * ev.prix_euros) + '</span></div>' : '') + '</div>' +
        '<div class="two"><div>' + (ins.length ? '<div class="tw"><table class="t"><thead><tr><th>Nom</th><th>Âge</th><th>État</th><th>Paiement</th><th></th></tr></thead><tbody>' + ins.map(function (i) {
          var p = pp(i.personne_id);
          return '<tr><td><b>' + esc(p.prenom + ' ' + p.nom) + '</b></td><td class="small">' + age(p.date_naissance) + '</td><td>' + (i.statut === 'attente' ? '<span class="badge b-warn">Liste d\'attente</span>' : i.statut === 'annule' ? '<span class="badge">Annulé</span>' : '<span class="badge b-ok">Inscrit</span>') + '</td>' +
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
function vueAdherents(m, arg) {
  if (arg === 'impayes') ADF.impayes = true;
  m.innerHTML = entete('Adhérents', 'Fiches, familles, groupes et cotisations.', '<button class="btn line" id="ad-csv">Exporter</button>' + (aRole(['direction', 'bureau', 'accueil']) ? '<button class="btn" id="ad-new">Nouvel adhérent</button>' : '')) +
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
function vueGroupes(m) {
  m.innerHTML = entete('Groupes', 'Les groupes servent à cibler l\'agenda, les actus et les notifications.', '<button class="btn" id="g-new">Nouveau groupe</button>') + '<div id="g-l"><div class="skel"></div></div>';
  var dessiner = function () {
    var cpt = {}; A.pers.forEach(function (p) { (p.groupe_membres || []).forEach(function (g) { cpt[g.groupe_id] = (cpt[g.groupe_id] || 0) + 1; }); });
    $('g-l').innerHTML = Object.keys(TYPES_GRP).map(function (t) {
      var l = A.groupes.filter(function (g) { return g.type === t; }); if (!l.length) return '';
      return '<div class="sect">' + TYPES_GRP[t] + '</div><div class="tw"><table class="t"><tbody>' + l.map(function (g) {
        return '<tr class="click" data-g="' + g.id + '"><td><span class="dot" style="background:' + esc(g.couleur || '#1f5a85') + ';margin-right:8px"></span><b>' + esc(g.nom) + '</b>' + (g.actif === false ? ' <span class="badge">Archivé</span>' : '') + '</td><td class="act small">' + (cpt[g.id] || 0) + ' membre' + ((cpt[g.id] || 0) > 1 ? 's' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    }).join('');
    all('[data-g]').forEach(function (tr) { tr.onclick = function () { fiche(A.groupes.filter(function (g) { return g.id === tr.dataset.g; })[0]); }; });
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
    });
  };
  $('g-new').onclick = function () { fiche(null); };
  Promise.all([chargerGroupes(true), chargerPers()]).then(dessiner).catch(function () { $('g-l').innerHTML = '<div class="card empty">Impossible de charger les groupes.</div>'; });
}

// ---------- Petites annonces ----------
function vueAnnonces(m) {
  m.innerHTML = entete('Petites annonces', 'Rien n\'est publié sans validation. Les numéros ne sont jamais affichés aux adhérents.') + '<div id="an-l"><div class="skel"></div></div>';
  var charger = function () {
    q(sb.from('annonces').select('id, num, type, created_at, prenom, titre, niveau, dispo, prix, description, image_path, statut, expire_le').in('statut', ['attente', 'publiee']).order('created_at', { ascending: false })).then(function (l) {
      var bloc = function (titre, liste, attente) {
        return '<div class="sect">' + titre + ' (' + liste.length + ')</div>' + (liste.length ? '<div class="tw"><table class="t"><tbody>' + liste.map(function (a) {
          return '<tr><td style="width:46%"><b>' + esc(a.type === 'vente' ? a.titre : a.prenom + ' · ' + a.niveau) + '</b> ' + (a.prix ? '<span class="badge b-ac">' + esc(a.prix) + '</span>' : '') + '<div class="mut xs">' + esc(a.type === 'vente' ? 'Vente' : 'Partenaire : ' + a.dispo) + ' · n°' + a.num + ' · ' + esc(fmtJour(new Date(a.created_at))) + '</div>' + (a.description ? '<div class="small">' + esc(a.description) + '</div>' : '') +
            (a.image_path ? '<a class="xs" target="_blank" rel="noopener" href="' + SUPA_URL + '/storage/v1/object/public/annonces/' + esc(a.image_path) + '">Voir la photo</a>' : '') + '</td>' +
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
var ETATS = { ouvert: ['#1f8a4c', 'Club house ouvert'], coach: ['#d9822b', 'Un coach est au club'], ferme: ['#c62f2f', 'Personne au club'] };
function aHeure(j, hm) { var x = new Date(j), t = hm.split(':'); x.setHours(+t[0], +t[1], 0, 0); return x; }
function creneau(type) { var n = new Date(), js = n.getDay() || 7; return (HORAIRES[type][js] || []).map(function (c) { return { d: aHeure(n, c[0]), f: aHeure(n, c[1]) }; }).filter(function (c) { return n >= c.d && n < c.f; })[0] || null; }
function presenceWidget(box) {
  if (!box) return;
  q(sb.from('club_presence').select('etat, jusqua, message, maj_le').eq('id', 1).maybeSingle()).then(function (p) {
    var now = new Date(), manuel = p && p.jusqua && new Date(p.jusqua) > now, c = creneau('coach'), ch = creneau('clubhouse');
    var etat = manuel ? p.etat : c ? 'coach' : 'ferme', fin = manuel ? new Date(p.jusqua) : c ? c.f : null;
    box.innerHTML = '<div class="card stack"><div class="sect" style="margin:0">Présence au club</div><div style="display:flex;gap:10px;align-items:center"><span class="dot" style="width:14px;height:14px;background:' + ETATS[etat][0] + '"></span><b>' + ETATS[etat][1] + (fin ? ' jusqu\'à ' + fmtH(fin) : '') + '</b></div>' +
      (manuel && p.message ? '<span class="small">' + esc(p.message) + '</span>' : '') + '<span class="mut xs">' + (manuel ? 'Mis à jour à ' + fmtH(new Date(p.maj_le)) : 'D\'après les horaires habituels') + '</span>' +
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
function vueAcces(m) {
  m.innerHTML = entete('Accès et rôles', 'Qui peut faire quoi. La personne doit s\'être connectée une fois à l\'appli avant de recevoir un rôle.') +
    '<div class="two"><div id="ac-l"><div class="skel"></div></div><div class="card stack"><b>Donner un rôle</b><label class="l">Adresse mail<input class="f" id="ac-m" type="email"></label>' +
    '<label class="l">Rôle<select class="f" id="ac-r"><option value="bureau">Bureau / président (adhérents, actus, événements, annonces)</option><option value="accueil">Accueil (club house, annonces, cordage, inscriptions, actus)</option><option value="cordeur">Cordeur</option><option value="coach">Coach d\'un groupe (propose les scores, voit ses joueurs)</option><option value="responsable">Responsable d\'un groupe</option><option value="direction">Direction sportive (tout)</option></select></label>' +
    '<label class="l" id="ac-gl" hidden>Groupe<select class="f" id="ac-g"></select></label><button class="btn" id="ac-ok">Ajouter</button>' +
    '<div class="sect">Ce que voit chaque rôle</div><div class="small list">' + ['direction', 'bureau', 'accueil', 'cordeur'].map(function (r) { return '<div class="it"><b>' + NOM_ROLE[r] + '</b><span class="mut xs" style="text-align:right">' + MODULES.filter(function (x) { return x[2].indexOf(r) >= 0; }).map(function (x) { return x[1]; }).join(', ') + '</span></div>'; }).join('') + '</div></div></div>';
  var charger = function () {
    q(sb.rpc('roles_liste')).then(function (l) {
      $('ac-l').innerHTML = '<div class="tw"><table class="t"><thead><tr><th>Personne</th><th>Rôle</th><th></th></tr></thead><tbody>' + l.map(function (r) {
        return '<tr><td>' + esc(r.email) + '</td><td>' + esc(NOM_ROLE[r.role] || r.role) + (r.groupe ? ' · ' + esc(r.groupe) : '') + '</td><td class="act"><button class="btn sm ko" data-acr="' + r.id + '">Retirer</button></td></tr>';
      }).join('') + '</tbody></table></div>';
      all('[data-acr]').forEach(function (b) { b.onclick = function () { if (confirm('Retirer ce rôle ?')) q(sb.rpc('role_retirer', { r: b.dataset.acr })).then(function () { toast('Rôle retiré'); charger(); }).catch(function (e) { toast(String(e.message || 'Action impossible').indexOf('direction') >= 0 ? 'Il faut garder au moins une personne à la direction' : 'Action impossible'); }); }; });
    }).catch(function () { $('ac-l').innerHTML = '<div class="card empty">Impossible de charger les rôles.</div>'; });
  };
  chargerGroupes().then(function () { $('ac-g').innerHTML = A.groupes.map(function (g) { return '<option value="' + g.id + '">' + esc(g.nom) + '</option>'; }).join(''); });
  $('ac-r').onchange = function () { $('ac-gl').hidden = ['coach', 'responsable'].indexOf(this.value) < 0; };
  $('ac-ok').onclick = function () {
    var mail = $('ac-m').value.trim(), role = $('ac-r').value; if (!mail) return toast('Indique une adresse');
    q(sb.rpc('role_ajouter', { mail: mail, le_role: role, groupe: ['coach', 'responsable'].indexOf(role) >= 0 ? $('ac-g').value : null })).then(function (r) {
      if (r === 'inconnu') toast('Cette personne doit d\'abord se connecter une fois à l\'appli'); else { toast('Rôle ajouté'); $('ac-m').value = ''; charger(); }
    }).catch(function () { toast('Action impossible'); });
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
var VUES = { adoc: vueAdoc, accueil: vueAccueil, actus: vueActus, evenements: vueEvenements, inscriptions: vueInscriptions, adherents: vueAdherents, groupes: vueGroupes, annonces: vueAnnonces, cordage: vueCordage, arena: vueArena, presence: vuePresence, acces: vueAcces };
function router() {
  if (!A.user) return;
  fermer();
  var parts = (location.hash || '#/accueil').replace(/^#\/?/, '').split('/'), v = parts[0] || 'accueil';
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
