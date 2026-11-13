/* CLOCA Tennis — moteur des jeux d'animation (One Point Slam, roi du terrain, montante-descendante, défis à points)
   Partagé par l'espace gestion (qui pilote) et l'écran du club (qui affiche). Aucune donnée réseau ici : que des calculs. */
(function (G) {
'use strict';

var FORMATS = {
  ops: { nom: 'One Point Slam', court: 'One Point Slam', desc: 'Un seul point par duel. Le gagnant reste sur le terrain, le perdant est éliminé. Le dernier debout gagne.', serie: true },
  roi: { nom: 'Roi du terrain', court: 'Roi du terrain', desc: 'Le gagnant du point reste, le perdant repasse en fin de file. On joue au temps : celui qui a gagné le plus de points l\'emporte.', serie: true },
  montante: { nom: 'Montante-descendante', court: 'Montante', desc: 'Plusieurs terrains. À chaque tour, le gagnant monte d\'un terrain, le perdant descend. Les victoires font le classement.', terrains: true },
  defis: { nom: 'Défis à points', court: 'Défis', desc: 'Cible, service, précision… chaque joueur marque des points à chaque défi. Le meilleur total gagne.', defis: true }
};

function melange(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function copie(o) { return JSON.parse(JSON.stringify(o)); }
function sauver(e) { var s = copie(e); delete s.hist; e.hist = (e.hist || []).concat([JSON.stringify(s)]).slice(-60); }

// Lancer une manche : tirage au sort de l'ordre de passage
function demarrer(fmt, cles, cfg) {
  cfg = cfg || {};
  var o = melange(cles), e = { fmt: fmt, statut: 'en_cours', ordre: o, hist: [], debut: new Date().toISOString() };
  if (fmt === 'ops' || fmt === 'roi') {
    e.champ = o[0]; e.file = o.slice(1); e.serie = 0; e.best = null; e.out = []; e.pts = {};
    o.forEach(function (k) { e.pts[k] = 0; });
  } else if (fmt === 'montante') {
    var n = Math.max(1, Math.min(cfg.terrains || 2, Math.floor(o.length / 2)));
    e.terrains = []; for (var i = 0; i < n; i++) e.terrains.push([o[2 * i], o[2 * i + 1]]);
    e.banc = o.slice(2 * n); e.tour = 1; e.choix = {}; e.vic = {};
    o.forEach(function (k) { e.vic[k] = 0; });
  } else if (fmt === 'defis') {
    e.defis = (cfg.defis && cfg.defis.length ? cfg.defis : ['Cible', 'Service', 'Précision']).slice();
    e.scores = {}; o.forEach(function (k) { e.scores[k] = {}; });
  }
  return e;
}

// One Point Slam et roi du terrain : qui gagne le point ('champ' ou 'chal')
function point(e, qui) {
  if (e.statut !== 'en_cours' || !e.file || !e.file.length) return e;
  sauver(e);
  var ch = e.file.shift(), perdant;
  if (qui === 'chal') { perdant = e.champ; e.champ = ch; e.serie = 1; } else { perdant = ch; e.serie++; }
  e.pts[e.champ] = (e.pts[e.champ] || 0) + 1;
  if (!e.best || e.serie > e.best.n) e.best = { k: e.champ, n: e.serie };
  if (e.fmt === 'ops') { e.out.push(perdant); if (!e.file.length) { e.statut = 'finie'; e.gagnant = e.champ; e.fin = new Date().toISOString(); } }
  else e.file.push(perdant);
  return e;
}

// Montante-descendante : choisir le gagnant d'un terrain, puis valider le tour
function choisir(e, i, k) { if (e.statut !== 'en_cours') return e; e.choix = e.choix || {}; e.choix[i] = k; return e; }
function tourPret(e) { return e.terrains && e.terrains.every(function (t, i) { return e.choix && e.choix[i]; }); }
function validerTour(e) {
  if (!tourPret(e)) return e;
  sauver(e);
  var n = e.terrains.length, W = [], L = [];
  e.terrains.forEach(function (t, i) { var w = e.choix[i]; W.push(w); L.push(t[0] === w ? t[1] : t[0]); e.vic[w] = (e.vic[w] || 0) + 1; });
  var T = [];
  if (n === 1) { T.push([W[0], L[0]]); }
  else for (var i = 0; i < n; i++) T.push([i === 0 ? W[0] : L[i - 1], i === n - 1 ? L[n - 1] : W[i + 1]]);
  // Le perdant du dernier terrain laisse sa place au premier du banc
  if (e.banc.length) { var bas = T[n - 1], sortant = bas[1]; bas[1] = e.banc.shift(); e.banc.push(sortant); }
  e.terrains = T; e.choix = {}; e.tour++;
  return e;
}

// Défis à points : noter un score
function noter(e, k, d, v) {
  if (e.statut !== 'en_cours') return e;
  var n = v === '' || v == null ? null : Math.max(-999, Math.min(9999, Number(v)));
  if (n === null || isNaN(n)) delete e.scores[k][d]; else e.scores[k][d] = n;
  return e;
}
function total(e, k) { var s = e.scores[k] || {}, t = 0; Object.keys(s).forEach(function (d) { t += s[d]; }); return t; }

// Classement d'une manche : [{ k, val, txt }]
function classement(e) {
  if (!e) return [];
  var pos = {}; (e.ordre || []).forEach(function (k, i) { pos[k] = i; });
  var L;
  if (e.fmt === 'ops') {
    var rang = (e.out || []).slice(); if (e.champ) rang.push(e.champ);
    L = rang.reverse().map(function (k, i) { return { k: k, val: e.pts[k] || 0, txt: (e.pts[k] || 0) + ' pt' + ((e.pts[k] || 0) > 1 ? 's' : '') }; });
    (e.file || []).forEach(function (k) { L.push({ k: k, val: 0, txt: 'à jouer' }); });
    return L;
  }
  if (e.fmt === 'roi') L = e.ordre.map(function (k) { return { k: k, val: e.pts[k] || 0, txt: (e.pts[k] || 0) + ' pt' + ((e.pts[k] || 0) > 1 ? 's' : '') }; });
  else if (e.fmt === 'montante') {
    var place = {}; (e.terrains || []).forEach(function (t, i) { place[t[0]] = place[t[1]] = i; }); (e.banc || []).forEach(function (k, i) { place[k] = 100 + i; });
    L = e.ordre.map(function (k) { return { k: k, val: e.vic[k] || 0, p: place[k], txt: (e.vic[k] || 0) + ' victoire' + ((e.vic[k] || 0) > 1 ? 's' : '') }; });
    return L.sort(function (a, b) { return b.val - a.val || a.p - b.p; });
  }
  else if (e.fmt === 'defis') L = e.ordre.map(function (k) { var t = total(e, k); return { k: k, val: t, txt: t + ' pt' + (Math.abs(t) > 1 ? 's' : '') }; });
  return L.sort(function (a, b) { return b.val - a.val || pos[a.k] - pos[b.k]; });
}

// Terminer une manche jouée au temps (roi, montante, défis)
function terminer(e) {
  if (e.statut !== 'en_cours') return e;
  sauver(e);
  var c = classement(e);
  e.statut = 'finie'; e.gagnant = c.length ? c[0].k : null; e.fin = new Date().toISOString();
  if (e.fmt === 'ops' && e.champ) e.gagnant = e.champ;
  return e;
}
function annuler(e) {
  if (!e.hist || !e.hist.length) return e;
  var h = e.hist.slice(0, -1), prec = JSON.parse(e.hist[e.hist.length - 1]);
  prec.hist = h; return prec;
}

// Victoires gagnées avant la manche i (pour les malus)
function victoiresAvant(manches, k, i) {
  var n = 0; for (var j = 0; j < i; j++) { var e = manches[j] && manches[j].etat; if (e && e.statut === 'finie' && e.gagnant === k) n++; }
  return n;
}
function malusDe(manches, malus, k, i) {
  var v = victoiresAvant(manches, k, i); if (!v || !malus || !malus.length) return '';
  return malus[Math.min(v, malus.length) - 1] || '';
}

G.JEUX = { FORMATS: FORMATS, demarrer: demarrer, point: point, choisir: choisir, tourPret: tourPret, validerTour: validerTour, noter: noter, total: total, classement: classement, terminer: terminer, annuler: annuler, victoiresAvant: victoiresAvant, malusDe: malusDe, melange: melange };
})(typeof window !== 'undefined' ? window : globalThis);
