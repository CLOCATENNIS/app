/* CLOCA Tennis — moteur du module « Réservation des terrains » (consultation seule).
   Partagé par l'appli (adhérents) et l'espace gestion : lecture des données, calcul du planning, dessin de la grille,
   données de démonstration, lecture d'un fichier à importer. ADOC / Ten'Up restent l'outil officiel de réservation.
   Règle d'or : un créneau dont on ne connaît pas l'état n'est JAMAIS présenté comme disponible. */
(function (G) {
'use strict';

var TERRAINS_DEF = [
  { id: 'couvert-1', nom: 'Couvert 1', surface: 'couvert', ordre: 1 }, { id: 'couvert-2', nom: 'Couvert 2', surface: 'couvert', ordre: 2 },
  { id: 'terre-3', nom: 'Terre 3', surface: 'terre', ordre: 3 }, { id: 'terre-4', nom: 'Terre 4', surface: 'terre', ordre: 4 },
  { id: 'quick-5', nom: 'Quick 5', surface: 'quick', ordre: 5 }, { id: 'quick-6', nom: 'Quick 6', surface: 'quick', ordre: 6 }, { id: 'quick-7', nom: 'Quick 7', surface: 'quick', ordre: 7 }
];
var SURFACES = { couvert: ['Couverts', '#0B3547'], terre: ['Terre battue', '#CD6839'], quick: ['Quick', '#2a7d4f'], autre: ['Autres', '#667068'] };
// Statuts d'un créneau. « inconnu » et « passe » ne sont pas des catégories d'occupation : ils viennent du calcul.
var CATS = {
  libre: { nom: 'Disponible', court: 'Libre', bg: '#dcf2e4', bd: '#1f8a4c', fg: '#0f4d2a' },
  adherents: { nom: 'Réservé par des adhérents', court: 'Réservé', bg: '#fde3c8', bd: '#d9822b', fg: '#6d3504' },
  cours: { nom: 'Cours collectif', court: 'Cours', bg: '#d8e6f6', bd: '#2563a8', fg: '#0f3561' },
  animation: { nom: 'Animation ou CLOC\'ARENA', court: 'Animation', bg: '#e9dcf4', bd: '#7b4fa0', fg: '#3e1f59' },
  competition: { nom: 'Compétition ou tournoi', court: 'Compétition', bg: '#f7d9d9', bd: '#c62f2f', fg: '#661010' },
  ferme: { nom: 'Terrain fermé ou indisponible', court: 'Fermé', bg: '#e3e6e8', bd: '#8a949c', fg: '#384148' },
  occupe: { nom: 'Occupé (type non précisé)', court: 'Occupé', bg: '#dfe5ea', bd: '#4f6475', fg: '#22323f' },
  inconnu: { nom: 'État non connu : à vérifier sur Ten\'Up', court: 'À vérifier', bg: '#ffffff', bd: '#b9c2c9', fg: '#5d6b78' },
  passe: { nom: 'Créneau passé', court: '', bg: '#f1f1ef', bd: '#e2e2de', fg: '#9aa1a6' }
};
var PRIO = { ferme: 6, competition: 5, animation: 4, cours: 3, adherents: 2, occupe: 1 };
var PRIO_SRC = { adoc: 3, app: 2, import: 2, local: 1, demo: 2 };
var SOURCES = { adoc: 'Réservation ADOC', app: 'Demande faite dans l\'appli du club', import: 'Fichier importé', local: 'Info du club (non confirmée par ADOC)', demo: 'Donnée fictive (démonstration)' };
var HORAIRES_DEF = [{ terrain_id: null, jours: [1, 2, 3, 4, 5, 6, 7], ouverture: '08:30', fermeture: '22:30' }];
var MODULE_DEF = { actif: false, tenup_url: 'https://tenup.fft.fr/club/57780019/reservations', frequence_min: 30, seuil_min: 120 };

// ---------- Outils ----------
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function pad(n) { return ('0' + n).slice(-2); }
function min(hhmm) { var m = String(hhmm || '').match(/^(\d{1,2})[:h](\d{2})?/); return m ? (+m[1]) * 60 + (+(m[2] || 0)) : null; }
function hh(m) { return Math.floor(m / 60) + 'h' + pad(m % 60); }
function hhmm(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
function isoJour(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function dateDe(jour) { var p = jour.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
function decaler(jour, n) { var d = dateDe(jour); d.setDate(d.getDate() + n); return isoJour(d); }
function jourSemaine(jour) { return ((dateDe(jour).getDay() + 6) % 7) + 1; } // 1 = lundi … 7 = dimanche
var FMT_PARIS = (function () { try { return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); } catch (e) { return null; } })();
// Jour et minute (heure de Paris) d'un horodatage
function parisDe(ts) {
  var d = ts instanceof Date ? ts : new Date(ts);
  if (!FMT_PARIS) return { jour: isoJour(d), m: d.getHours() * 60 + d.getMinutes() };
  var p = {}; FMT_PARIS.formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
  return { jour: p.year + '-' + p.month + '-' + p.day, m: (+p.hour % 24) * 60 + (+p.minute) };
}
// « 2026-11-25 » + « 18:30 » (heure de Paris) → horodatage ISO avec le bon décalage (hiver / été)
function horodatage(jour, h) {
  var m = min(h); var essai = new Date(jour + 'T' + hhmm(m) + ':00Z');
  var vu = parisDe(essai), ecart = (vu.jour === jour ? vu.m : vu.jour > jour ? vu.m + 1440 : vu.m - 1440) - m; // décalage Paris − UTC, en minutes
  var s = ecart >= 0 ? '+' : '-', a = Math.abs(ecart);
  return jour + 'T' + hhmm(m) + ':00' + s + pad(Math.floor(a / 60)) + ':' + pad(a % 60);
}
function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

// ---------- Horaires ----------
// La règle la plus précise l'emporte : un terrain précis avant « tous les terrains », une période avant « toute l'année »
function horairesDu(jour, terrainId, regles) {
  var js = jourSemaine(jour), l = (regles && regles.length ? regles : HORAIRES_DEF).filter(function (r) {
    return (!r.terrain_id || r.terrain_id === terrainId) && (r.jours || []).map(Number).indexOf(js) >= 0 && (!r.du || r.du <= jour) && (!r.au || r.au >= jour);
  });
  if (!l.length) return { o: null, f: null }; // fermé ce jour-là
  l.sort(function (a, b) { return ((b.terrain_id ? 2 : 0) + (b.du || b.au ? 1 : 0)) - ((a.terrain_id ? 2 : 0) + (a.du || a.au ? 1 : 0)); });
  return { o: min(l[0].ouverture), f: min(l[0].fermeture), defaut: !(regles && regles.length) };
}

// ---------- Fraîcheur des données ----------
// Le planning d'un jour est « connu » seulement si une source donne l'état complet de ce jour et qu'elle est à jour.
function couverture(D, jour, maintenant) {
  var now = maintenant ? new Date(maintenant) : new Date(), seuil = +((D.module || {}).seuil_min || MODULE_DEF.seuil_min);
  var l = (D.synchro || []).filter(function (s) { return s.actif && s.statut === 'ok' && s.couverture_debut && s.couverture_fin; });
  var dernier = (D.synchro || []).map(function (s) { return s.derniere_reussite ? new Date(s.derniere_reussite) : null; }).filter(Boolean).sort(function (a, b) { return b - a; })[0] || null;
  var c = l.filter(function (s) { return s.couverture_debut <= jour && s.couverture_fin >= jour; })[0];
  if (!c) return { connu: false, raison: l.length ? 'hors_periode' : 'aucune_source', dernier: dernier };
  var age = (now - new Date(c.derniere_reussite)) / 60000;
  if (age > seuil) return { connu: false, raison: 'obsolete', dernier: new Date(c.derniere_reussite), source: c.source };
  return { connu: true, dernier: new Date(c.derniere_reussite), source: c.source };
}

// ---------- Calcul du planning d'un jour ----------
function calculer(D, jour, maintenant) {
  var now = maintenant ? new Date(maintenant) : new Date(), ici = parisDe(now), auj = ici.jour === jour, avant = jour < ici.jour;
  var couv = couverture(D, jour, now);
  var terrains = (D.terrains && D.terrains.length ? D.terrains : TERRAINS_DEF).slice().sort(function (a, b) { return (a.ordre || 0) - (b.ordre || 0); });
  var res = { jour: jour, auj: auj, nowM: auj ? ici.m : null, couv: couv, terrains: [], gD: null, gF: null, demo: !!D.demo, horairesDefaut: false };
  terrains.forEach(function (t) {
    var h = horairesDu(jour, t.id, D.horaires); if (h.defaut) res.horairesDefaut = true;
    var col = { t: t, o: h.o, f: h.f, blocs: [] };
    if (h.o != null) { res.gD = res.gD == null ? h.o : Math.min(res.gD, h.o); res.gF = res.gF == null ? h.f : Math.max(res.gF, h.f); }
    res.terrains.push(col);
  });
  if (res.gD == null) return res; // tout est fermé ce jour-là
  res.terrains.forEach(function (col) {
    if (col.o == null) { col.blocs.push({ d: res.gD, f: res.gF, cat: 'ferme', hors: true, libelle: 'Fermé ce jour' }); return; }
    // Occupations de ce terrain (ou de tous les terrains), ramenées en minutes du jour
    var occs = (D.occupations || []).filter(function (o) { return !o.annule && (!o.terrain_id || o.terrain_id === col.t.id); }).map(function (o) {
      var a = parisDe(o.debut), b = parisDe(o.fin);
      var d = a.jour < jour ? 0 : a.jour > jour ? 1440 : a.m, f = b.jour < jour ? 0 : b.jour > jour ? 1440 : b.m;
      return { o: o, d: Math.max(d, col.o), f: Math.min(f, col.f) };
    }).filter(function (x) { return x.f > x.d; });
    // Découpage : à chaque instant, l'occupation la plus importante gagne (fermeture > compétition > animation > cours > réservation)
    var bornes = [col.o, col.f]; occs.forEach(function (x) { bornes.push(x.d, x.f); });
    bornes = bornes.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
    var segs = [];
    for (var i = 0; i < bornes.length - 1; i++) {
      var a = bornes[i], b = bornes[i + 1], top = null;
      occs.forEach(function (x) {
        if (x.d <= a && x.f >= b && (!top || (PRIO[x.o.categorie] || 0) * 10 + (PRIO_SRC[x.o.source] || 0) > (PRIO[top.o.categorie] || 0) * 10 + (PRIO_SRC[top.o.source] || 0))) top = x;
      });
      var der = segs[segs.length - 1];
      if (der && der.occ === (top && top.o)) der.f = b; else segs.push({ d: a, f: b, occ: top ? top.o : null });
    }
    // Trous : libres seulement si le jour est connu ; découpés sur les créneaux du club (toutes les heures depuis l'ouverture)
    segs.forEach(function (s) {
      if (s.occ) { col.blocs.push({ d: s.d, f: s.f, cat: PRIO[s.occ.categorie] ? s.occ.categorie : 'occupe', occ: s.occ, libelle: s.occ.libelle || '', source: s.occ.source }); return; }
      var x = s.d;
      while (x < s.f) {
        var suiv = col.o + Math.ceil((x - col.o + 1) / 60) * 60, y = Math.min(suiv, s.f);
        var passe = avant || (auj && x < ici.m);
        col.blocs.push({ d: x, f: y, cat: passe ? 'passe' : couv.connu ? 'libre' : 'inconnu' });
        x = y;
      }
    });
    // Hors des horaires de ce terrain (quand d'autres terrains ouvrent plus tôt ou ferment plus tard)
    if (col.o > res.gD) col.blocs.unshift({ d: res.gD, f: col.o, cat: 'ferme', hors: true, libelle: 'Hors horaires' });
    if (col.f < res.gF) col.blocs.push({ d: col.f, f: res.gF, cat: 'ferme', hors: true, libelle: 'Hors horaires' });
  });
  return res;
}

// ---------- Dessin ----------
function libBloc(b) {
  if (b.cat === 'passe') return '';
  if (b.libelle) return b.libelle;
  return CATS[b.cat].court;
}
// Grille du jour : une colonne par terrain. opts : { filtre: [ids], h: px par heure, cliquable: true }
function htmlGrille(R, opts) {
  opts = opts || {};
  if (R.gD == null) return '<div class="tp-vide">Tous les terrains sont fermés ce jour-là.</div>';
  var H = opts.h || 54, haut = (R.gF - R.gD) / 60 * H;
  var cols = R.terrains.map(function (c, i) { return { c: c, i: i }; }).filter(function (x) { return !opts.filtre || opts.filtre.indexOf(x.c.t.id) >= 0; });
  if (!cols.length) return '<div class="tp-vide">Aucun terrain pour ce filtre.</div>';
  var y = function (m) { return ((m - R.gD) / 60 * H).toFixed(1); };
  // Repères horaires : les créneaux du club (à partir de la première ouverture), toutes les heures
  var marques = []; for (var m = R.gD; m <= R.gF; m += 60) marques.push(m);
  var h = '<div class="tp-scroll" tabindex="0" aria-label="Planning des terrains, faire défiler pour voir tous les terrains"><div class="tp-grille" style="--n:' + cols.length + '">' +
    '<div class="tp-coin"></div>' + cols.map(function (x) {
      var s = SURFACES[x.c.t.surface] || SURFACES.autre;
      return '<button class="tp-th" data-tpt="' + esc(x.c.t.id) + '" title="Voir le ' + esc(x.c.t.nom) + ' seul"><span class="tp-dot" style="background:' + s[1] + '"></span><b>' + esc(x.c.t.nom) + '</b><span class="tp-surf">' + esc(s[0]) + '</span></button>';
    }).join('') +
    '<div class="tp-axe" style="height:' + haut + 'px">' + marques.map(function (m) { return '<span style="top:' + y(m) + 'px">' + hh(m) + '</span>'; }).join('') +
    (R.nowM != null && R.nowM >= R.gD && R.nowM <= R.gF ? '<span class="tp-now-h" style="top:' + y(R.nowM) + 'px">' + hh(R.nowM) + '</span>' : '') + '</div>' +
    cols.map(function (x) {
      return '<div class="tp-col" style="height:' + haut + 'px">' + marques.map(function (m) { return '<i class="tp-l" style="top:' + y(m) + 'px"></i>'; }).join('') +
        x.c.blocs.map(function (b, j) {
          var ht = (b.f - b.d) / 60 * H, C = CATS[b.cat], cls = 'tp-b c-' + b.cat + (b.source === 'local' ? ' local' : '') + (b.hors ? ' hors' : '') + (ht < 30 ? ' mini' : '');
          var lib = libBloc(b);
          return '<button class="' + cls + '" style="top:' + y(b.d) + 'px;height:' + (ht - 2).toFixed(1) + 'px" data-tpb="' + x.i + '|' + j + '" aria-label="' + esc(x.c.t.nom + ', ' + hh(b.d) + ' à ' + hh(b.f) + ' : ' + C.nom + (b.libelle ? ', ' + b.libelle : '')) + '">' +
            (lib ? '<b>' + esc(lib) + '</b>' : '') + (ht >= 40 && b.cat !== 'passe' ? '<span>' + hh(b.d) + '–' + hh(b.f) + '</span>' : '') + (b.source === 'local' ? '<em>Info club</em>' : '') + '</button>';
        }).join('') + (R.nowM != null && R.nowM >= R.gD && R.nowM <= R.gF ? '<i class="tp-now" style="top:' + y(R.nowM) + 'px"></i>' : '') + '</div>';
    }).join('') + '</div></div>';
  return h;
}
// Un seul terrain : la liste de ses créneaux du jour
function htmlTerrain(R, id) {
  var c = R.terrains.filter(function (x) { return x.t.id === id; })[0];
  if (!c) return '<div class="tp-vide">Terrain introuvable.</div>';
  var i = R.terrains.indexOf(c);
  if (c.o == null) return '<div class="tp-vide">' + esc(c.t.nom) + ' : fermé ce jour-là.</div>';
  var fini = function (b) { return b.cat === 'passe' || (R.nowM != null && b.f <= R.nowM); };
  var l = c.blocs.filter(function (b) { return !b.hors; }), passes = l.filter(fini).length;
  if (passes && passes < l.length) l = l.filter(function (b) { return !fini(b); }); // aujourd'hui : on ne garde que ce qui reste à venir
  return '<div class="tp-liste">' + (passes && l.length && !fini(l[0]) ? '<span class="tp-passes">' + passes + ' créneau' + (passes > 1 ? 'x' : '') + ' déjà passé' + (passes > 1 ? 's' : '') + ' (masqué' + (passes > 1 ? 's' : '') + ')</span>' : '') + l.map(function (b, j) {
    var C = CATS[b.cat];
    return '<button class="tp-ligne c-' + b.cat + (b.source === 'local' ? ' local' : '') + '" data-tpb="' + i + '|' + c.blocs.indexOf(b) + '">' +
      '<span class="tp-lh">' + hh(b.d) + '<small>' + hh(b.f) + '</small></span><span class="tp-lt"><b>' + esc(b.cat === 'passe' ? 'Passé' : C.court) + '</b>' + (b.libelle && b.libelle !== C.court ? '<span>' + esc(b.libelle) + '</span>' : '') +
      (b.source === 'local' ? '<em>Info du club, non confirmée par ADOC</em>' : '') + '</span></button>';
  }).join('') + '</div>';
}
function htmlLegende(R) {
  var vus = {}; R.terrains.forEach(function (c) { c.blocs.forEach(function (b) { if (!b.hors) vus[b.cat] = 1; }); });
  var l = ['libre', 'adherents', 'cours', 'animation', 'competition', 'ferme', 'occupe', 'inconnu'].filter(function (k) { return vus[k] || k === 'libre' || k === 'inconnu'; });
  return '<div class="tp-leg">' + l.map(function (k) { return '<span><i class="c-' + k + '"></i>' + esc(CATS[k].nom) + '</span>'; }).join('') +
    (R.terrains.some(function (c) { return c.blocs.some(function (b) { return b.source === 'local'; }); }) ? '<span><i class="c-occupe local"></i>Info du club, non confirmée par ADOC</span>' : '') + '</div>';
}
// Détail d'un créneau (fenêtre ouverte au toucher)
function detailBloc(R, ref) {
  var p = String(ref).split('|'), c = R.terrains[+p[0]], b = c && c.blocs[+p[1]];
  if (!b) return null;
  var C = CATS[b.cat];
  return { terrain: c.t, bloc: b, titre: c.t.nom + ' · ' + hh(b.d) + ' – ' + hh(b.f), statut: b.cat === 'passe' ? 'Créneau passé' : C.nom, libelle: b.libelle && b.libelle !== C.court ? b.libelle : '',
    source: b.occ ? (R.demo ? SOURCES.demo : SOURCES[b.source] || '') : b.cat === 'libre' ? (R.demo ? SOURCES.demo : 'Aucune réservation connue sur ce créneau') : b.cat === 'inconnu' ? 'Le club ne reçoit pas encore les réservations de ce jour : vérifie sur Ten\'Up avant de venir.' : '',
    reserver: b.cat === 'libre' || b.cat === 'inconnu' };
}

// ---------- Un créneau précis sur tous les terrains (encart « terrains à cette heure ») ----------
// État d'un terrain entre d et f (minutes) : une occupation connue l'emporte, puis « à vérifier », puis « libre ».
function etatCreneau(R, terrainId, d, f) {
  var c = R.terrains.filter(function (x) { return x.t.id === terrainId; })[0];
  if (!c || c.o == null || d < c.o || f > c.f) return { cat: 'ferme', libelle: c && c.o != null ? 'Hors horaires' : 'Fermé' };
  var l = c.blocs.filter(function (b) { return b.d < f && b.f > d && !b.hors; }), occ = null;
  l.forEach(function (b) { if (b.occ && (!occ || (PRIO[b.cat] || 0) > (PRIO[occ.cat] || 0))) occ = b; });
  if (occ) return { cat: occ.cat, libelle: occ.libelle || CATS[occ.cat].court, source: occ.source, occ: occ.occ };
  if (l.some(function (b) { return b.cat === 'passe'; })) return { cat: 'passe', libelle: 'Passé' };
  if (l.some(function (b) { return b.cat === 'inconnu'; }) || !l.length) return { cat: 'inconnu', libelle: 'À vérifier' };
  return { cat: 'libre', libelle: 'Libre' };
}
// Petite grille des terrains pour un créneau ; sel = terrain choisi (mis en avant), filtre = noms ou ids proposés
function htmlDispo(R, d, f, sel, filtre) {
  var l = R.terrains.filter(function (c) { return !filtre || filtre.some(function (x) { return norm(x) === norm(c.t.nom) || x === c.t.id; }); });
  return '<div class="tp-dispo">' + l.map(function (c) {
    var e = etatCreneau(R, c.t.id, d, f), lib = { libre: 'Libre', inconnu: 'À vérifier', passe: 'Passé', ferme: 'Fermé', cours: 'Cours' }[e.cat] || (e.occ && e.occ.source === 'app' && e.cat === 'occupe' ? 'Demandé' : 'Réservé'); // simple : libre, réservé, à vérifier
    return '<button type="button" class="tp-d c-' + e.cat + (e.source === 'local' ? ' local' : '') + (sel && (sel === c.t.id || norm(sel) === norm(c.t.nom)) ? ' sel' : '') + '" data-tpd="' + esc(c.t.id) + '" data-nom="' + esc(c.t.nom) + '" data-cat="' + e.cat + '"><b>' + esc(c.t.nom) + '</b><span>' + esc(lib) + '</span></button>';
  }).join('') + '</div>';
}
// Demandes de terrain du double interne → occupations (utilisé en démonstration ; en vrai, la base les renvoie déjà)
function depuisDemandesDouble(liste, terrains) {
  terrains = terrains && terrains.length ? terrains : TERRAINS_DEF;
  var parNom = {}; terrains.forEach(function (t) { parNom[norm(t.nom)] = t.id; });
  return (liste || []).filter(function (r) { return (r.statut === 'demande' || r.statut === 'confirmee') && r.jour && r.heure && parNom[norm(r.terrain)]; }).map(function (r) {
    var h = min(r.heure); return { id: 'dbl-' + r.id, terrain_id: parNom[norm(r.terrain)], debut: horodatage(r.jour, hhmm(h)), fin: horodatage(r.jour, hhmm(h + 120)),
      categorie: r.statut === 'confirmee' ? 'competition' : 'occupe', source: 'app', libelle: r.statut === 'confirmee' ? 'Double interne' : 'Demande en cours' };
  });
}

// ---------- Démonstration (données fictives, clairement signalées) ----------
var DEMO_LOCAL = []; // occupations ajoutées pendant la démo dans la gestion (gardées en mémoire, jamais enregistrées)
var DEMO_HOR = null, DEMO_MOD = null, DEMO_TER = null;
function alea(graine) { var a = 0; for (var i = 0; i < graine.length; i++) a = (a * 31 + graine.charCodeAt(i)) | 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function demoJour(jour) {
  var r = alea('cloca-' + jour), js = jourSemaine(jour), l = [], n = 0;
  var ajout = function (t, d, f, cat, lib) { l.push({ id: 'demo-' + jour + '-' + (n++), terrain_id: t, debut: horodatage(jour, d), fin: horodatage(jour, f), categorie: cat, source: 'adoc', libelle: lib ? lib + ' (démo)' : null }); };
  var mois = dateDe(jour).getMonth();
  if (mois >= 10 || mois <= 2) ajout('terre-4', '08:30', '22:30', 'ferme', 'Hors saison');
  if (r() < 0.4) ajout('terre-3', '08:30', '13:30', 'ferme', 'Terrain gelé');
  if (js <= 5 && js !== 3) { ['couvert-1', 'couvert-2'].forEach(function (t) { ajout(t, '17:30', '19:30', 'cours', 'Cours collectif'); ajout(t, '19:30', '21:30', 'cours', 'Cours adultes'); }); }
  if (js === 3) ['couvert-1', 'couvert-2', 'quick-5'].forEach(function (t) { ajout(t, '13:30', '18:30', 'cours', 'École de tennis'); });
  if (js === 1 || js === 5) ajout('quick-6', '17:30', '18:30', 'animation', 'CLOC\'ARENA');
  if (js === 6) { ajout('quick-5', '14:30', '16:00', 'animation', 'CLOC\'ARENA'); ajout('quick-6', '14:30', '16:00', 'animation', 'CLOC\'ARENA'); }
  if (js === 7) { ajout('couvert-1', '08:30', '13:30', 'competition', 'Rencontre par équipes'); ajout('couvert-2', '08:30', '13:30', 'competition', 'Rencontre par équipes'); }
  if (js === 4) l.push({ id: 'demo-' + jour + '-local', terrain_id: 'quick-7', debut: horodatage(jour, '12:30'), fin: horodatage(jour, '13:30'), categorie: 'ferme', source: 'local', libelle: 'Entretien (démo)' });
  // Réservations d'adhérents au hasard sur les créneaux restants (plus le soir et le week-end)
  TERRAINS_DEF.forEach(function (t) {
    for (var m = 8 * 60 + 30; m < 22 * 60 + 30; m += 60) {
      var pris = l.some(function (o) { if (o.terrain_id !== t.id) return false; var a = parisDe(o.debut).m, b = parisDe(o.fin).m; return a < m + 60 && b > m; });
      var p = js >= 6 ? 0.45 : m >= 18 * 60 ? 0.4 : m >= 12 * 60 && m < 14 * 60 ? 0.35 : 0.15;
      if (!pris && r() < p) ajout(t.id, hhmm(m), hhmm(m + 60), 'adherents', null);
    }
  });
  return l;
}
function demo(du, au, maintenant) {
  var now = maintenant ? new Date(maintenant) : new Date(), occ = [];
  for (var j = du; j <= (au || du); j = decaler(j, 1)) occ = occ.concat(demoJour(j));
  var auj = parisDe(now).jour;
  return {
    demo: true, module: Object.assign({}, MODULE_DEF, DEMO_MOD || {}, { actif: true }),
    terrains: DEMO_TER || TERRAINS_DEF.slice(), horaires: DEMO_HOR || HORAIRES_DEF.slice(),
    occupations: occ.concat(DEMO_LOCAL.filter(function (o) { return o.debut.slice(0, 10) <= (au || du) && o.fin.slice(0, 10) >= du; })),
    synchro: [{ source: 'adoc', actif: true, statut: 'ok', message: 'Synchronisation SIMULÉE pour la démonstration', derniere_reussite: new Date(now - 6 * 60000).toISOString(), couverture_debut: decaler(auj, -1), couverture_fin: decaler(auj, 6) }],
    maintenant: now.toISOString()
  };
}
var demoStore = {
  ajouter: function (o) { o.id = 'demo-local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6); o.source = 'local'; DEMO_LOCAL.push(o); return o; },
  retirer: function (id) { DEMO_LOCAL = DEMO_LOCAL.filter(function (o) { return o.id !== id; }); },
  locales: function () { return DEMO_LOCAL.slice(); },
  horaires: function (l) { if (l) DEMO_HOR = l; return DEMO_HOR || HORAIRES_DEF.slice(); },
  terrains: function (l) { if (l) DEMO_TER = l; return DEMO_TER || TERRAINS_DEF.slice(); },
  module: function (m) { if (m) DEMO_MOD = m; return Object.assign({}, MODULE_DEF, DEMO_MOD || {}); }
};

// ---------- Lecture des données ----------
// Planning lu par la base (fonction terrains_planning). Tant que la base du module n'est pas installée, on passe en démonstration.
function charger(sb, du, au) {
  if (!sb) return Promise.resolve(demo(du, au));
  return sb.rpc('terrains_planning', { p_du: du, p_au: au || du }).then(function (r) {
    var d = r && r.data;
    if (r && r.error) {
      var msg = String(r.error.message || '') + ' ' + String(r.error.code || '');
      if (/réservé aux adhérents/.test(msg)) return { interdit: true };
      if (/PGRST202|42883|Could not find|does not exist|schema cache/i.test(msg)) return demo(du, au);
      throw r.error;
    }
    if (d && d.ferme) return { ferme: true, module: Object.assign({}, MODULE_DEF, d.module || {}) };
    if (!d || !Array.isArray(d.terrains)) return demo(du, au);
    d.module = Object.assign({}, MODULE_DEF, d.module || {});
    return d;
  });
}
// Copie locale des dernières données reçues (pour l'affichage hors connexion), dans ce navigateur seulement
function garder(jour, D) { try { if (!D.demo) localStorage.setItem('cloca-terrains-' + jour, JSON.stringify({ le: new Date().toISOString(), D: D })); } catch (e) { } }
function reprendre(jour) { try { var x = JSON.parse(localStorage.getItem('cloca-terrains-' + jour) || 'null'); return x && x.D ? x : null; } catch (e) { return null; } }

// ---------- Import d'un fichier ----------
// Colonnes attendues (titres sur la 1re ligne, séparateur ; ou , ou tabulation) : date, début, fin, terrain, type, libellé, référence
function categorieDe(t) {
  var s = norm(t);
  if (!s) return 'occupe';
  if (/ferm|indispo|travaux|entretien|gel|pluie/.test(s)) return 'ferme';
  if (/tournoi|compet|interclub|championnat|equipe|match/.test(s)) return 'competition';
  if (/anim|arena|fete|stage/.test(s)) return 'animation';
  if (/cours|ecole|entrain|lecon|collectif/.test(s)) return 'cours';
  if (/adher|reserv|locat|membre|libre|joueur/.test(s)) return 'adherents';
  return 'occupe';
}
function lireFichier(texte, terrains) {
  terrains = terrains && terrains.length ? terrains : TERRAINS_DEF;
  var lignes = String(texte || '').replace(/^﻿/, '').split(/\r?\n/).filter(function (l) { return l.trim(); });
  if (lignes.length < 2) return { lignes: [], erreurs: ['Le fichier est vide ou n\'a pas de ligne de titres.'] };
  var sep = [';', '\t', ','].sort(function (a, b) { return lignes[0].split(b).length - lignes[0].split(a).length; })[0];
  var cut = function (l) { var out = [], cur = '', q = false; for (var i = 0; i < l.length; i++) { var ch = l[i]; if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (ch === sep && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(function (x) { return x.trim(); }); };
  var tete = cut(lignes[0]).map(norm), col = function (noms) { for (var i = 0; i < tete.length; i++) if (noms.some(function (n) { return tete[i].indexOf(n) === 0; })) return i; return -1; };
  var C = { date: col(['date', 'jour']), d: col(['debut', 'heuredebut', 'de', 'start']), f: col(['fin', 'heurefin', 'a', 'end']), t: col(['terrain', 'court', 'equipement']), ty: col(['type', 'categorie', 'nature']), lib: col(['libelle', 'intitule', 'objet', 'commentaire']), ref: col(['ref', 'id', 'numero']) };
  var manque = ['date', 'd', 'f', 't'].filter(function (k) { return C[k] < 0; });
  if (manque.length) return { lignes: [], erreurs: ['Colonnes introuvables : ' + manque.map(function (k) { return { date: 'date', d: 'début', f: 'fin', t: 'terrain' }[k]; }).join(', ') + '. Titres attendus : date ; début ; fin ; terrain ; type ; libellé.'] };
  var parNom = {}; terrains.forEach(function (t) { parNom[norm(t.nom)] = t.id; parNom[norm(t.id)] = t.id; });
  var out = [], err = [], du = null, au = null;
  lignes.slice(1).forEach(function (l, i) {
    var c = cut(l), n = i + 2;
    var dt = c[C.date] || '', m = dt.match(/^(\d{4})-(\d{2})-(\d{2})/) || dt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return err.push('Ligne ' + n + ' : date illisible (« ' + dt + ' »)');
    var jour = m[0].indexOf('/') > 0 ? (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + pad(m[2]) + '-' + pad(m[1]) : m[1] + '-' + m[2] + '-' + m[3];
    var a = min(c[C.d]), b = min(c[C.f]);
    if (a == null || b == null || b <= a) return err.push('Ligne ' + n + ' : heures illisibles');
    var tid = parNom[norm(c[C.t])];
    if (!tid) return err.push('Ligne ' + n + ' : terrain inconnu (« ' + c[C.t] + ' »)');
    var lib = C.lib >= 0 ? c[C.lib] : '', ty = C.ty >= 0 ? c[C.ty] : '';
    out.push({ terrain_id: tid, debut: horodatage(jour, hhmm(a)), fin: horodatage(jour, hhmm(b)), categorie: categorieDe(ty || lib), libelle: /adher|reserv|locat|membre/.test(norm(ty)) ? '' : lib.slice(0, 60), ref: C.ref >= 0 && c[C.ref] ? 'f-' + c[C.ref] : 'f-' + jour + '-' + tid + '-' + hhmm(a) });
    if (!du || jour < du) du = jour; if (!au || jour > au) au = jour;
  });
  return { lignes: out, erreurs: err, du: du, au: au };
}

// ---------- Styles (communs à l'appli et à la gestion) ----------
var CSS = [
  '.tp-scroll{overflow:auto;max-height:max(440px,calc(100dvh - 300px));border:1px solid var(--bd,#e7e1d7);border-radius:16px;background:var(--card,#fff);scroll-snap-type:x proximity;scroll-padding-left:54px;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}',
  '.tp-grille{display:grid;grid-template-columns:54px repeat(var(--n),minmax(var(--tp-col,118px),1fr));position:relative;min-width:min-content}',
  '.tp-coin,.tp-th{position:sticky;top:0;z-index:3;background:var(--card,#fff);border-bottom:1px solid var(--bd,#e7e1d7)}',
  '.tp-coin{left:0;z-index:4}',
  '.tp-th{display:flex;flex-direction:column;align-items:flex-start;gap:0;padding:8px 8px 7px;border:0;border-bottom:1px solid var(--bd,#e7e1d7);border-left:1px solid var(--line,#efe9df);cursor:pointer;text-align:left;font:inherit;color:var(--tx,#12304a);scroll-snap-align:start}',
  '.tp-th b{font-size:14px;line-height:1.15;display:flex;align-items:center;gap:6px}.tp-th .tp-surf{font-size:11px;color:var(--mut,#5d6b78)}.tp-th:hover b{text-decoration:underline}',
  '.tp-th .tp-dot{width:8px;height:8px;border-radius:50%;margin-bottom:3px}',
  '.tp-axe{position:sticky;left:0;z-index:2;background:var(--card,#fff);border-right:1px solid var(--line,#efe9df)}',
  '.tp-axe span{position:absolute;right:6px;transform:translateY(-50%);font-size:11px;font-weight:600;color:var(--mut,#5d6b78);font-variant-numeric:tabular-nums}.tp-axe span:first-child{transform:none}',
  '.tp-axe .tp-now-h{right:3px;background:#d4321c;color:#fff;border-radius:6px;padding:1px 4px;z-index:2}',
  '.tp-col{position:relative;border-left:1px solid var(--line,#efe9df)}',
  '.tp-l{position:absolute;left:0;right:0;border-top:1px dashed var(--line,#efe9df)}',
  '.tp-b{position:absolute;left:3px;right:3px;border-radius:8px;border:1px solid;border-left-width:4px;padding:3px 6px;display:flex;flex-direction:column;align-items:flex-start;gap:0;overflow:hidden;text-align:left;font:inherit;cursor:pointer;line-height:1.2}',
  '.tp-b b{font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}.tp-b span{font-size:11px;opacity:.85;font-variant-numeric:tabular-nums}.tp-b em{font-style:normal;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;opacity:.8}',
  '.tp-b.long b,.tp-b.long span,.tp-b.long em{position:sticky;top:64px}',
  '.tp-b.mini{padding:1px 6px;justify-content:center}.tp-b.mini span,.tp-b.mini em{display:none}',
  '.tp-b:focus-visible,.tp-th:focus-visible,.tp-ligne:focus-visible{outline:3px solid var(--balle,#DDF901);outline-offset:1px}',
  '.tp-b.local,.tp-ligne.local{border-style:dashed}',
  '.tp-b.hors{cursor:default;background:repeating-linear-gradient(135deg,#eef0f1 0 6px,#e3e6e8 6px 12px)!important;border-color:#d5d9dc!important;color:#737d84!important;border-left-width:1px}',
  '.tp-now{position:absolute;left:0;right:0;height:0;border-top:2px solid #d4321c;z-index:2;pointer-events:none}.tp-col .tp-now::before{content:"";position:absolute;left:-4px;top:-5px;width:8px;height:8px;border-radius:50%;background:#d4321c}',
  Object.keys(CATS).map(function (k) { var c = CATS[k]; return '.c-' + k + '{background:' + c.bg + ';border-color:' + c.bd + ';color:' + c.fg + '}'; }).join(''),
  '.tp-b.c-inconnu,.tp-ligne.c-inconnu{background:repeating-linear-gradient(135deg,#fff 0 7px,#f2f4f5 7px 14px);border-left-width:1px;border-style:dashed}',
  '.tp-b.c-passe{border-left-width:1px;cursor:default}.tp-b.c-libre b{font-weight:700}',
  '.tp-leg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--mut,#5d6b78)}.tp-leg span{display:inline-flex;align-items:center;gap:6px}.tp-leg i{width:14px;height:14px;border-radius:4px;border:1px solid;border-left-width:3px;display:inline-block}',
  '.tp-leg i.c-inconnu{background:repeating-linear-gradient(135deg,#fff 0 3px,#e8ecee 3px 6px);border-style:dashed;border-left-width:1px}.tp-leg i.local{border-style:dashed}',
  '.tp-liste{display:flex;flex-direction:column;gap:6px}',
  '.tp-ligne{display:flex;gap:12px;align-items:center;width:100%;min-height:52px;border-radius:12px;border:1px solid;border-left-width:5px;padding:8px 12px;font:inherit;text-align:left;cursor:pointer}',
  '.tp-ligne .tp-lh{display:flex;flex-direction:column;font-weight:700;font-size:15px;font-variant-numeric:tabular-nums;min-width:48px}.tp-ligne .tp-lh small{font-weight:500;font-size:12px;opacity:.75}',
  '.tp-ligne .tp-lt{display:flex;flex-direction:column;gap:1px}.tp-ligne .tp-lt span{font-size:13px}.tp-ligne .tp-lt em{font-style:normal;font-size:11px;font-weight:600;opacity:.8}',
  '.tp-passes{font-size:12px;color:var(--mut,#5d6b78);padding:0 2px 2px}',
  '.tp-dispo{display:grid;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:6px}',
  '.tp-d{display:flex;flex-direction:column;align-items:flex-start;gap:1px;border:1px solid;border-left-width:4px;border-radius:10px;padding:6px 8px;font:inherit;text-align:left;cursor:pointer;min-height:48px}',
  '.tp-d b{font-size:13px}.tp-d span{font-size:12px;font-weight:600}.tp-d.local{border-style:dashed}',
  '.tp-d.c-inconnu{background:repeating-linear-gradient(135deg,#fff 0 7px,#f2f4f5 7px 14px);border-left-width:1px;border-style:dashed}',
  '.tp-d.sel{outline:3px solid var(--navy,#0B3547);outline-offset:1px}',
  '.tp-vide{padding:28px 12px;text-align:center;color:var(--mut,#5d6b78)}',
  '@media (max-width:767px){.tp-grille{--tp-col:calc((100vw - 32px - 56px) / 2.35)}}',
  '@media (prefers-reduced-motion:reduce){.tp-scroll{scroll-behavior:auto}}'
].join('\n');
function poserStyles() { if (typeof document === 'undefined' || document.getElementById('tp-css')) return; var s = document.createElement('style'); s.id = 'tp-css'; s.textContent = CSS; document.head.appendChild(s); }

G.CLOCATerrains = {
  TERRAINS_DEF: TERRAINS_DEF, SURFACES: SURFACES, CATS: CATS, SOURCES: SOURCES, MODULE_DEF: MODULE_DEF, HORAIRES_DEF: HORAIRES_DEF,
  charger: charger, calculer: calculer, etatCreneau: etatCreneau, htmlDispo: htmlDispo, depuisDemandesDouble: depuisDemandesDouble, couverture: couverture, horairesDu: horairesDu, demo: demo, demoStore: demoStore,
  htmlGrille: htmlGrille, htmlTerrain: htmlTerrain, htmlLegende: htmlLegende, detailBloc: detailBloc, poserStyles: poserStyles,
  garder: garder, reprendre: reprendre, lireFichier: lireFichier, categorieDe: categorieDe,
  outils: { isoJour: isoJour, decaler: decaler, jourSemaine: jourSemaine, horodatage: horodatage, parisDe: parisDe, hh: hh, hhmm: hhmm, min: min, dateDe: dateDe }
};
})(typeof window !== 'undefined' ? window : globalThis);
