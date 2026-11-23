// Challenge Week CLOC'ARENA : calculs partagés par l'appli des familles (app.js) et l'espace gestion (gestion/challenge.js).
// Une tentative = { defi, niveau, joueurs: [pid], resultat }. Points par paliers : seuils { tous: [[valeur, points]], <Niveau>: [...] }.
// Pour un défi au chrono (unite « sec »), plus petit = meilleur : un palier est atteint quand le temps est inférieur ou égal.
(function () {
'use strict';
var NIVEAUX = ['Blanc', 'Violet', 'Rouge', 'Orange', 'Vert', 'Jaune'];

function chrono(d) { return d && d.unite === 'sec'; }
function mieux(d, a, b) { return chrono(d) ? a < b : a > b; } // a bat b ?
function seuils(d, niveau) {
  var s = (d && d.seuils) || {};
  return (s[niveau] && s[niveau].length ? s[niveau] : s.tous) || [];
}
function points(d, niveau, val) {
  if (val == null || isNaN(val)) return 0;
  var best = 0;
  seuils(d, niveau).forEach(function (x) {
    var v = +x[0], p = +x[1];
    if ((chrono(d) ? val <= v : val >= v) && p > best) best = p;
  });
  return best;
}
function fmt(d, val) {
  if (val == null || val === '') return '—';
  if (chrono(d)) { var s = +val; return s >= 60 ? Math.floor(s / 60) + ' min ' + String(Math.round((s % 60) * 10) / 10).replace('.', ',') + ' s' : String(Math.round(s * 10) / 10).replace('.', ',') + ' s'; }
  return String(+val);
}
function unite(d) { return chrono(d) ? 'secondes' : d && d.k === 'jongles' ? 'jongles' : d && d.k === 'etoile' ? 'secondes' : d && /service/.test(d.k) ? 'services' : d && d.k === 'deuxballes' ? 'échanges' : d && d.k === 'volees' ? 'volées' : 'frappes'; }

// Records par défi et par niveau : une ligne par composition (le meilleur résultat de chaque duo ou joueur), triées.
// Classement par niveau : pour chaque joueur, la somme des points de son meilleur résultat dans chaque défi.
function calcul(defis, essais) {
  var D = {}; (defis || []).forEach(function (d) { D[d.k] = d; });
  var rec = {}, best = {}; // best[niveau][pid][defi] = { pts, val }
  (essais || []).forEach(function (e) {
    var d = D[e.defi]; if (!d) return;
    var val = +e.resultat, pts = points(d, e.niveau, val);
    var cle = (e.joueurs || []).slice().sort().join('+');
    var R = ((rec[e.defi] = rec[e.defi] || {})[e.niveau] = rec[e.defi][e.niveau] || {});
    if (!R[cle] || mieux(d, val, R[cle].resultat)) R[cle] = { joueurs: e.joueurs, resultat: val, jour: e.jour, points: pts };
    (e.joueurs || []).forEach(function (pid) {
      var B = ((best[e.niveau] = best[e.niveau] || {})[pid] = best[e.niveau][pid] || {});
      if (!B[e.defi] || pts > B[e.defi].pts || (pts === B[e.defi].pts && mieux(d, val, B[e.defi].val))) B[e.defi] = { pts: pts, val: val };
    });
  });
  var records = {};
  Object.keys(rec).forEach(function (k) {
    records[k] = {};
    Object.keys(rec[k]).forEach(function (n) {
      var d = D[k];
      records[k][n] = Object.keys(rec[k][n]).map(function (c) { return rec[k][n][c]; }).sort(function (a, b) { return mieux(d, a.resultat, b.resultat) ? -1 : mieux(d, b.resultat, a.resultat) ? 1 : 0; });
      var r = 0; records[k][n].forEach(function (x, i, l) { if (!i || l[i - 1].resultat !== x.resultat) r = i + 1; x.rang = r; });
    });
  });
  var classement = {};
  Object.keys(best).forEach(function (n) {
    classement[n] = Object.keys(best[n]).map(function (pid) {
      var B = best[n][pid], tot = 0, nb = 0, det = {};
      Object.keys(B).forEach(function (k) { tot += B[k].pts; nb++; det[k] = B[k]; });
      return { pid: pid, points: tot, defis: nb, detail: det };
    }).sort(function (a, b) { return b.points - a.points || b.defis - a.defis; });
    var r = 0; classement[n].forEach(function (x, i, l) { if (!i || l[i - 1].points !== x.points || l[i - 1].defis !== x.defis) r = i + 1; x.rang = r; });
  });
  return { records: records, classement: classement };
}

// Tirage des équipes : niveau strictement identique, binômes ; effectif impair (≥ 3) → un trio ; joueur seul → signalé.
function melanger(l) { l = l.slice(); for (var i = l.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = l[i]; l[i] = l[j]; l[j] = t; } return l; }
function tirerNiveau(niveau, pids) {
  var l = melanger(pids), eq = [];
  if (l.length === 1) return [{ niveau: niveau, joueurs: l }];
  while (l.length) {
    if (l.length === 3) { eq.push({ niveau: niveau, joueurs: l.splice(0, 3) }); break; }
    eq.push({ niveau: niveau, joueurs: l.splice(0, 2) });
  }
  return eq;
}
function cle() { return 'e' + Math.random().toString(36).slice(2, 9); }
function tirer(presents, niveauDe, seulement) {
  var par = {};
  presents.forEach(function (pid) { var n = niveauDe(pid) || '?'; (par[n] = par[n] || []).push(pid); });
  var out = [];
  ordreNiveaux(Object.keys(par)).forEach(function (n) {
    if (seulement && n !== seulement) return;
    tirerNiveau(n, par[n]).forEach(function (e) { e.k = cle(); out.push(e); });
  });
  return out;
}
// Nouvelle manche : nouveau tirage qui évite au maximum de remettre ensemble des joueurs déjà associés sur ce défi
function cleP(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
function tirerNouveaux(presents, niveauDe, deja) {
  deja = deja || {};
  var par = {}, out = [];
  presents.forEach(function (pid) { var n = niveauDe(pid) || '?'; (par[n] = par[n] || []).push(pid); });
  ordreNiveaux(Object.keys(par)).forEach(function (n) {
    var best = null, bestScore = 1e9;
    for (var essai = 0; essai < 80 && bestScore > 0; essai++) {
      var eq = tirerNiveau(n, par[n]), sc = 0;
      eq.forEach(function (e) { for (var i = 0; i < e.joueurs.length; i++) for (var j = i + 1; j < e.joueurs.length; j++) if (deja[cleP(e.joueurs[i], e.joueurs[j])]) sc++; });
      if (sc < bestScore) { bestScore = sc; best = eq; }
    }
    best.forEach(function (e) { e.k = cle(); out.push(e); });
  });
  return out;
}
function paires(listes) { var d = {}; (listes || []).forEach(function (l) { for (var i = 0; i < l.length; i++) for (var j = i + 1; j < l.length; j++) d[cleP(l[i], l[j])] = 1; }); return d; }
function ordreNiveaux(l) { return l.slice().sort(function (a, b) { var x = NIVEAUX.indexOf(a), y = NIVEAUX.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); }); }

window.ChallengeMoteur = { NIVEAUX: NIVEAUX, chrono: chrono, mieux: mieux, seuils: seuils, points: points, fmt: fmt, unite: unite, calcul: calcul, tirer: tirer, tirerNiveau: tirerNiveau, tirerNouveaux: tirerNouveaux, paires: paires, cle: cle, ordreNiveaux: ordreNiveaux };
})();
