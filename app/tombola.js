/* CLOCA Tennis — calcul des tickets de la tombola gratuite d'une soirée.
   Partagé par l'écran des ateliers (ateliers.html) et la page des téléphones (soiree.html). Aucun appel réseau ici.
   Tickets : présence 1 · match d'atelier joué 1 · victoire d'atelier +1 · One Point Slam : 1 par point gagné, 5 par manche gagnée. */
(function (G) {
'use strict';
// hist = matchs des ateliers [{ players, win }] ; manches = manches du jeu (état sans historique)
function stats(k, hist, manches) {
  var s = { played: 0, wins: 0, osp: 0 };
  (hist || []).forEach(function (h) { if (h.players && h.players.indexOf(k) >= 0) { s.played++; if (h.win && h.win.indexOf(k) >= 0) s.wins++; } });
  (manches || []).forEach(function (m) {
    var e = m && m.etat; if (!e) return;
    if (e.pts && e.pts[k]) s.osp += e.pts[k];
    if (e.fmt === 'montante' && e.vic && e.vic[k]) s.osp += e.vic[k];
    if (e.statut === 'finie' && (e.gagnant === k || (e.gagnants && e.gagnants.indexOf(k) >= 0))) s.osp += 5;
  });
  return s;
}
function tickets(k, hist, manches) { var s = stats(k, hist, manches); return 1 + s.played + s.wins + s.osp; }
function detail(k, hist, manches) {
  var s = stats(k, hist, manches);
  return ['Présence 1', s.played ? s.played + ' match' + (s.played > 1 ? 's' : '') : '', s.wins ? s.wins + ' victoire' + (s.wins > 1 ? 's' : '') : '', s.osp ? 'One Point Slam ' + s.osp : ''].filter(Boolean).join(' · ');
}
// Numéros des tickets encore en jeu : ordre alphabétique des noms, sans les gagnants déjà tirés
function ranges(joueurs, winners, hist, manches) {
  var start = 1;
  return (joueurs || []).filter(function (p) { return (winners || []).indexOf(p.k) < 0; }).slice().sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); })
    .map(function (p) { var t = tickets(p.k, hist, manches), r = { p: p, from: start, to: start + t - 1, t: t }; start += t; return r; });
}
// Lots affichés (ou [] s'ils sont désactivés) : le n-ième gagnant tiré remporte le n-ième lot
function lots(L) { return L && L.afficher && Array.isArray(L.liste) ? L.liste.filter(Boolean) : []; }
G.TOMBOLA = { stats: stats, tickets: tickets, detail: detail, ranges: ranges, lots: lots };
})(typeof window !== 'undefined' ? window : globalThis);
