/* CLOCA Tennis — moteur des jeux d'animation (One Point Slam, roi du terrain, montante-descendante, défis à points)
   Partagé par l'espace gestion (qui pilote) et l'écran du club (qui affiche). Aucune donnée réseau ici : que des calculs. */
(function (G) {
'use strict';

var FORMATS = {
  ops2: { nom: 'One Point Slam en double', court: 'OPS double', desc: 'Équipes de deux, un seul point par duel. Les gagnants restent. Dans l\'équipe qui perd, un seul joueur sort : le plus ancien sur le terrain (tirage au sort quand ils sont arrivés ensemble), remplacé par le suivant de la file.', serie: true, double: true },
  ops: { nom: 'One Point Slam', court: 'One Point Slam', desc: 'Un seul point par duel. Le gagnant reste sur le terrain, le perdant est éliminé. Le dernier debout gagne.', serie: true },
  roi: { nom: 'Roi du terrain', court: 'Roi du terrain', desc: 'Le gagnant du point reste, le perdant repasse en fin de file. On joue au temps : celui qui a gagné le plus de points l\'emporte.', serie: true },
  montante: { nom: 'Montante-descendante', court: 'Montante', desc: 'Plusieurs terrains. À chaque tour, le gagnant monte d\'un terrain, le perdant descend. Les victoires font le classement.', terrains: true },
  defis: { nom: 'Défis à points', court: 'Défis', desc: 'Cible, service, précision… chaque joueur marque des points à chaque défi. Le meilleur total gagne.', defis: true }
};

function melange(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function copie(o) { return JSON.parse(JSON.stringify(o)); }
function sauver(e) { var s = copie(e); delete s.hist; e.hist = (e.hist || []).concat([JSON.stringify(s)]).slice(-60); }

// Lancer une manche : tirage au sort de l'ordre de passage
function demarrer(fmt, cles, cfg, mode) {
  cfg = cfg || {};
  var o = melange(cles), e = { fmt: fmt, statut: 'en_cours', ordre: o, hist: [], debut: new Date().toISOString(), mode: mode === 'surprise' ? 'surprise' : 'liste' };
  if (fmt === 'ops' || fmt === 'roi') {
    e.champ = o[0]; e.file = o.slice(1); e.serie = 0; e.best = null; e.out = []; e.pts = {};
    if (e.mode === 'surprise') e.file = melange(e.file);
    o.forEach(function (k) { e.pts[k] = 0; });
  } else if (fmt === 'ops2') {
    // A = l'équipe sur le terrain (tenante), B = les challengers ; arr = ordre d'arrivée sur le terrain (même valeur = arrivés ensemble)
    e.eqA = o.slice(0, 2); e.eqB = o.slice(2, 4); e.file = o.slice(4); e.serie = 0; e.best = null; e.out = []; e.pts = {}; e.arr = {}; e.tick = 0;
    if (e.mode === 'surprise') e.file = melange(e.file);
    o.forEach(function (k) { e.pts[k] = 0; }); o.slice(0, 4).forEach(function (k) { e.arr[k] = 0; });
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
function point(e, qui, R) {
  if (e.fmt === 'ops2') return pointDouble(e, qui, R);
  if (e.statut !== 'en_cours' || !e.file || !e.file.length) return e;
  sauver(e); delete e.dernierAcc;
  var ch = e.file.shift(), perdant;
  if (qui === 'chal') { perdant = e.champ; e.champ = ch; e.serie = 1; } else { perdant = ch; e.serie++; }
  e.pts[e.champ] = (e.pts[e.champ] || 0) + 1;
  if (!e.best || e.serie > e.best.n) e.best = { k: e.champ, n: e.serie };
  accGagne(e, e.champ, e.pts[e.champ], R);
  if (e.fmt === 'ops') { e.out.push(perdant); if (!e.file.length) { e.statut = 'finie'; e.gagnant = e.champ; e.fin = new Date().toISOString(); } }
  else e.file.push(perdant);
  // Mode surprise : le prochain adversaire est tiré au sort parmi ceux qui attendent
  if (e.mode === 'surprise' && e.file.length > 1) { var r = Math.floor(Math.random() * (e.file.length - (e.fmt === 'roi' ? 1 : 0))), t = e.file[0]; e.file[0] = e.file[r]; e.file[r] = t; }
  return e;
}

// Montante-descendante : choisir le gagnant d'un terrain, puis valider le tour
function choisir(e, i, k) { if (e.statut !== 'en_cours') return e; e.choix = e.choix || {}; e.choix[i] = k; return e; }
// Double : l'équipe gagnante reste ; dans l'équipe perdante, le plus ancien sur le terrain sort (tirage au sort s'ils sont arrivés ensemble)
function pointDouble(e, qui, R) {
  if (e.statut !== 'en_cours' || !e.eqB || e.eqB.length < 2) return e;
  sauver(e); delete e.dernierAcc; delete e.sortie;
  var W = qui === 'chal' ? e.eqB : e.eqA, L = qui === 'chal' ? e.eqA : e.eqB;
  e.serie = qui === 'chal' ? 1 : e.serie + 1;
  W.forEach(function (k) { e.pts[k] = (e.pts[k] || 0) + 1; accGagne(e, k, e.pts[k], R); });
  if (!e.best || e.serie > e.best.n) e.best = { k: W[0], k2: W[1], n: e.serie };
  var a0 = e.arr[L[0]] || 0, a1 = e.arr[L[1]] || 0, egal = a0 === a1, i = egal ? Math.floor(Math.random() * 2) : (a0 < a1 ? 0 : 1);
  var sortant = L[i], reste = L[1 - i];
  e.out.push(sortant); e.sortie = { k: sortant, tirage: egal };
  if (e.file.length) {
    var j = e.mode === 'surprise' ? Math.floor(Math.random() * e.file.length) : 0, nv = e.file.splice(j, 1)[0];
    e.arr[nv] = ++e.tick; e.eqA = W.slice(); e.eqB = [reste, nv];
  } else { e.eqA = W.slice(); e.eqB = [reste]; e.statut = 'finie'; e.gagnant = W[0]; e.gagnants = W.slice(); e.fin = new Date().toISOString(); }
  return e;
}
function tourPret(e) { return e.terrains && e.terrains.every(function (t, i) { return e.choix && e.choix[i]; }); }
function validerTour(e, R) {
  if (!tourPret(e)) return e;
  sauver(e); delete e.dernierAcc;
  var n = e.terrains.length, W = [], L = [];
  e.terrains.forEach(function (t, i) { var w = e.choix[i]; W.push(w); L.push(t[0] === w ? t[1] : t[0]); e.vic[w] = (e.vic[w] || 0) + 1; accGagne(e, w, e.vic[w], R); });
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
  if (e.fmt === 'ops2') {
    var top = (e.eqA || []).concat(e.eqB || []).concat((e.out || []).slice().reverse());
    L = top.map(function (k) { return { k: k, val: e.pts[k] || 0, txt: (e.pts[k] || 0) + ' pt' + ((e.pts[k] || 0) > 1 ? 's' : '') }; });
    (e.file || []).forEach(function (k) { L.push({ k: k, val: 0, txt: 'à jouer' }); });
    return L;
  }
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
  if (e.fmt === 'ops2' && e.eqA) { e.gagnant = e.eqA[0]; e.gagnants = e.eqA.slice(); }
  return e;
}
function annuler(e) {
  if (!e.hist || !e.hist.length) return e;
  var h = e.hist.slice(0, -1), prec = JSON.parse(e.hist[e.hist.length - 1]);
  prec.hist = h; return prec;
}

// Victoires gagnées avant la manche i (pour les malus)
function victoiresAvant(manches, k, i) {
  var n = 0; for (var j = 0; j < i; j++) { var e = manches[j] && manches[j].etat; if (e && e.statut === 'finie' && (e.gagnant === k || (e.gagnants && e.gagnants.indexOf(k) >= 0))) n++; }
  return n;
}
// Paliers de malus : [{ n, t }] = à partir de n (manches gagnées ou points d'affilée), malus t. Le palier atteint le plus haut gagne.
function palier(l, v) {
  var best = ''; (l || []).slice().sort(function (a, b) { return a.n - b.n; }).forEach(function (x) { if (v >= x.n && x.t) best = x.t; });
  return best;
}
function paliersManche(cfg) {
  if (!cfg) return [];
  if (Array.isArray(cfg)) return cfg.map(function (t, i) { return { n: i + 1, t: t }; });
  if (cfg.malus_manche_on === false) return [];
  if (cfg.paliers_manche) return cfg.paliers_manche;
  return (cfg.malus || []).map(function (t, i) { return { n: i + 1, t: t }; }); // anciens jeux
}
// Règles d'une manche : celles réglées pour la manche, sinon celles du jeu (anciens jeux)
function regles(M, cfg) {
  var r = (M && M.regles) || cfg || {};
  return { manche: Array.isArray(r) || r.malus_manche_on !== false ? paliersManche(r) : [], serie: !Array.isArray(r) && r.malus_serie_on ? (r.paliers_serie || []) : [],
    acc: !Array.isArray(r) && r.acc_on ? (r.acc_lot || []).filter(Boolean) : [], accTous: Math.max(1, (r && r.acc_tous) || 1), accMode: (r && r.acc_mode) || 'hasard' };
}
function resumeRegles(R) {
  var l = [];
  if (R.manche.length) l.push('Malus de manche gagnée : ' + R.manche.map(function (x) { return 'dès ' + x.n + ' → ' + x.t; }).join(', '));
  if (R.serie.length) l.push('Malus de série : ' + R.serie.map(function (x) { return 'dès ' + x.n + ' d\'affilée → ' + x.t; }).join(', '));
  if (R.acc.length) l.push('Un accessoire obligatoire ' + (R.accTous > 1 ? 'tous les ' + R.accTous + ' points gagnés' : 'à chaque point gagné') + ' (lot de ' + R.acc.length + ')');
  return l;
}
// Accessoires (déguisements) : un de plus tous les N points gagnés, tiré dans le lot sans doublon pour le joueur tant que c'est possible
function accGagne(e, k, n, R) {
  if (!R || !R.acc || !R.acc.length || !n || n % R.accTous) return;
  e.acc = e.acc || {}; var a = e.acc[k] = (e.acc[k] || []).slice();
  var dispo = R.acc.filter(function (x) { return a.indexOf(x) < 0; }), src = dispo.length ? dispo : R.acc;
  var x = R.accMode === 'ordre' ? src[0] : src[Math.floor(Math.random() * src.length)];
  a.push(x); e.dernierAcc = { k: k, t: x, n: a.length };
}
function accDe(e, k) { return (e && e.acc && e.acc[k]) || []; }
// cfg = config du jeu ; le malus de manche dépend des règles de la manche jouée (i)
function malusDe(manches, cfg, k, i) { var v = victoiresAvant(manches, k, i); return v ? palier(regles(manches[i], cfg).manche, v) : ''; }
// Série : R = regles(...) (ou ancienne config) ; le joueur sur le terrain prend le malus dès n points d'affilée, il le perd en perdant un point
function malusSerie(R, serie) { if (!R || !serie) return ''; var l = Array.isArray(R.serie) ? R.serie : (R.malus_serie_on ? R.paliers_serie : []); return palier(l, serie); }
function nomManche(M, i) { var t = M && M.titre ? String(M.titre).trim() : ''; return t || 'Manche ' + (i + 1); }
G.JEUX = { FORMATS: FORMATS, nomManche: nomManche, regles: regles, resumeRegles: resumeRegles, accDe: accDe, malusSerie: malusSerie, demarrer: demarrer, point: point, choisir: choisir, tourPret: tourPret, validerTour: validerTour, noter: noter, total: total, classement: classement, terminer: terminer, annuler: annuler, victoiresAvant: victoiresAvant, malusDe: malusDe, melange: melange };
})(typeof window !== 'undefined' ? window : globalThis);
