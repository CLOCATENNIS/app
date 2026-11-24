// Cartes joueurs CLOC'ARENA Tweener (Gestion → CLOC'ARENA → Tweener → Cartes joueurs)
// Carte à collectionner 63 x 88 mm : trame du niveau (filles ou garçons) + photo + stats du joueur.
// Stats et rangs du jour, meilleur classement et sa date : rpc arena_tweener_carte (historique arena_tweener_hist).
// admin.js passe ses outils (sb, q, chargerPers…) à window.arCartes(box, outils).
(function () {
'use strict';
var sb, q, chargerPers, esc, all, toast, $;
var W = 1060, H = 1484; // taille des trames (cartes/recto-<niveau>-<f|g>.jpg)
var NIV = ['Blanc', 'Violet', 'Rouge', 'Orange', 'Vert', 'Jaune'];
var Z = { // zones mesurées sur les trames
  meilleur: [113, 129, 326, 297], meilleurDate: [113, 408, 325, 469],
  photo: [373, 96, 940, 683, 38], nom: [86, 724, 974, 840],
  ligne1: { y: 870, h: 106, x0: 66, w: 222, gap: 14, part: 0.47 },
  ligne2: { y: 990, h: 128, x0: 66, w: 300.67, gap: 14, part: 0.36 },
  date: [640, 1366, 812, 1418], logo: [838, 1246, 987, 1402]
};
var C = { joueur: null, d: null, par: null, photo: null, zoom: 1, dx: 0, dy: 0, planche: [], img: {}, mode: 'carte', pz: {}, fond: '', teinte: true, fonds: {} };
var S = {}, M = {};
// Fonds derrière le joueur détouré (cartes et affiche MAG). Images néons blanc / bleu, teintées à la couleur du niveau.
// Pour en ajouter un : déposer l'image dans cartes/fonds/ (format 4:5) et l'ajouter ici.
var FONDS = [
  { id: 'arene', nom: 'Arène', src: 'cartes/fonds/arene.jpg?v=1' }
];

function img(src) {
  if (C.img[src]) return C.img[src];
  C.img[src] = new Promise(function (ok, ko) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { delete C.img[src]; ko(); }; i.src = src; });
  return C.img[src];
}
function polices() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.all(['italic 900 40px Inter', 'italic 800 40px Inter'].map(function (f) { return document.fonts.load(f).catch(function () { }); }));
}
function trame() { return 'cartes/recto-' + String(S.niveau || 'Rouge').toLowerCase() + '-' + (S.sexe === 'F' ? 'f' : 'g') + '.jpg?v=1'; }
function dateFr(iso) { if (!iso) return ''; var p = String(iso).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(iso); }
function joliPrenom(t) { return String(t || '').split('-').map(function (x) { return x.charAt(0).toUpperCase() + x.slice(1).toLowerCase(); }).join('-'); }
function nombre(v) { if (v === '' || v === null || v === undefined) return ''; var n = Number(String(v).replace(',', '.')); if (isNaN(n)) return String(v); return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10).replace('.', ','); }

// ---------- dessin ----------
function rond(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function texte(c, t, cx, cy, poids, taille, maxw, couleur, ombre) {
  do { c.font = 'italic ' + poids + ' ' + taille + 'px Inter'; taille -= 1; } while (c.measureText(t).width > maxw && taille > 10);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = couleur;
  if (ombre) { c.save(); c.shadowColor = 'rgba(0,0,0,.75)'; c.shadowBlur = 10; c.shadowOffsetY = 3; c.fillText(t, cx, cy); c.restore(); }
  else c.fillText(t, cx, cy);
}
// « 1er » / « 1re » / « 12e » : le nombre en grand, le suffixe en exposant
function rang(c, n, cx, cy, taille, maxw) {
  n = parseInt(n, 10);
  if (!n) { texte(c, '–', cx, cy, 900, taille, maxw, '#fff', true); return; }
  var suf = n === 1 ? (S.sexe === 'F' ? 're' : 'er') : 'e', b = String(n), wb, ws;
  do {
    c.font = 'italic 900 ' + taille + 'px Inter'; wb = c.measureText(b).width;
    c.font = 'italic 900 ' + Math.round(taille * 0.46) + 'px Inter'; ws = c.measureText(suf).width;
    taille -= 1;
  } while (wb + ws + 4 > maxw && taille > 12);
  taille += 1;
  var x = cx - (wb + ws + 4) / 2;
  c.save(); c.shadowColor = 'rgba(0,0,0,.75)'; c.shadowBlur = 10; c.shadowOffsetY = 3; c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.textAlign = 'left';
  c.font = 'italic 900 ' + taille + 'px Inter'; c.fillText(b, x, cy);
  c.font = 'italic 900 ' + Math.round(taille * 0.46) + 'px Inter'; c.fillText(suf, x + wb + 4, cy - taille * 0.24);
  c.restore();
}
// Fond choisi, teinté à la couleur du niveau (mis en cache) ; null si « Aucun »
function fondPret() {
  var f = FONDS.filter(function (x) { return x.id === C.fond; })[0];
  if (!f) return Promise.resolve(null);
  var niv = S.niveau || 'Rouge', cle = f.id + '|' + (C.teinte ? niv : '-');
  if (C.fonds[cle]) return Promise.resolve(C.fonds[cle]);
  return img(f.src).then(function (i) {
    var t = document.createElement('canvas'); t.width = i.width; t.height = i.height;
    var c = t.getContext('2d'); c.drawImage(i, 0, 0);
    if (C.teinte) {
      // « hue » garde la lumière des néons et prend la couleur du niveau ; Blanc : néons argentés
      c.globalCompositeOperation = niv === 'Blanc' ? 'saturation' : 'hue';
      c.fillStyle = niv === 'Blanc' ? '#808080' : (MACC[niv] || MACC.Rouge); c.fillRect(0, 0, t.width, t.height);
      if (niv === 'Blanc') { c.globalCompositeOperation = 'soft-light'; c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(0, 0, t.width, t.height); }
      c.globalCompositeOperation = 'source-over';
    }
    C.fonds[cle] = t; return t;
  }).catch(function () { return null; });
}
// Image « cover » dans une zone ; py = position verticale du recadrage (0 haut, 1 bas)
function couvrir(c, im, x, y, w, h, py) {
  var sc = Math.max(w / im.width, h / im.height), iw = im.width * sc, ih = im.height * sc;
  c.drawImage(im, x + (w - iw) / 2, y + (h - ih) * (py === undefined ? 0.5 : py), iw, ih);
}
function cadrePhoto() { return cadre(Z.photo); }
function cadre(z) {
  var bw = z[2] - z[0], bh = z[3] - z[1], p = C.photo;
  if (!p) return null;
  var base = Math.max(bw / p.width, bh / p.height), sc = base * C.zoom, w = p.width * sc, h = p.height * sc;
  var maxX = Math.max(0, (w - bw) / 2), maxY = Math.max(0, (h - bh) / 2);
  // avec un fond, le joueur détouré peut être réduit et placé librement (pieds sur le sol)
  if (C.fond) { maxX = Math.max(maxX, (bw + w) * 0.4); maxY = Math.max(maxY, (bh + h) * 0.4); }
  C.dx = Math.max(-maxX, Math.min(maxX, C.dx)); C.dy = Math.max(-maxY, Math.min(maxY, C.dy));
  return { x: z[0] + (bw - w) / 2 + C.dx, y: z[1] + (bh - h) / 2 + C.dy, w: w, h: h };
}
function dessiner(cv) {
  return Promise.all([img(trame()), img('../logo.png').catch(function () { return null; }), polices(), fondPret()]).then(function (r) {
    cv.width = W; cv.height = H;
    var c = cv.getContext('2d'); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(r[0], 0, 0, W, H);
    // fond puis photo
    var f = cadrePhoto(), z = Z.photo;
    if (f || r[3]) {
      c.save(); rond(c, z[0], z[1], z[2] - z[0], z[3] - z[1], z[4]); c.clip();
      if (r[3]) couvrir(c, r[3], z[0], z[1], z[2] - z[0], z[3] - z[1], 0.55);
      if (f) c.drawImage(C.photo, f.x, f.y, f.w, f.h);
      c.restore();
    }
    // meilleur classement et sa date
    var m = Z.meilleur, md = Z.meilleurDate;
    if (S.meilleur) rang(c, S.meilleur, (m[0] + m[2]) / 2, (m[1] + m[3]) / 2 + 4, 120, m[2] - m[0] - 24);
    if (S.meilleurDate) texte(c, S.meilleurDate, (md[0] + md[2]) / 2, (md[1] + md[3]) / 2 + 1, 800, 36, md[2] - md[0] - 20, '#fff', true);
    // prénom NOM dans le bandeau
    var n = Z.nom, nom = (joliPrenom(S.prenom) + ' ' + String(S.nom || '').toUpperCase()).trim();
    if (nom) texte(c, nom, (n[0] + n[2]) / 2, (n[1] + n[3]) / 2 + 2, 900, 76, n[2] - n[0] - 40, (S.niveau === 'Jaune' || S.niveau === 'Blanc') ? '#0e1726' : '#fff', !(S.niveau === 'Jaune' || S.niveau === 'Blanc'));
    // ligne 1 : MAT, VIC, PTS, % V
    var L1 = Z.ligne1;
    [S.matchs, S.victoires, S.points, S.pct].forEach(function (v, i) {
      var t = nombre(v); if (i === 3 && t !== '' && t !== '–') t += '%';
      if (t === '') return;
      var x0 = L1.x0 + i * (L1.w + L1.gap), zw = L1.w * L1.part;
      texte(c, t, x0 + zw / 2 + 2, L1.y + L1.h / 2 + 2, 900, 54, zw - 18, '#fff', true);
    });
    // ligne 2 : rangs général, niveau, filles / garçons
    var L2 = Z.ligne2;
    [S.rangGeneral, S.rangNiveau, S.rangSexe].forEach(function (v, i) {
      var x0 = L2.x0 + i * (L2.w + L2.gap), zw = L2.w * L2.part;
      if (v !== '' && v !== null && v !== undefined) rang(c, v, x0 + zw / 2 + 2, L2.y + L2.h / 2 + 4, 60, zw - 16);
    });
    // date de la carte
    var d = Z.date;
    if (S.dateCarte) texte(c, S.dateCarte, (d[0] + d[2]) / 2, (d[1] + d[3]) / 2 + 1, 800, 30, d[2] - d[0] - 16, '#fff', false);
    // logo du club (fichier officiel de l'appli, tel quel)
    if (r[1]) { var lz = Z.logo, bw = lz[2] - lz[0], bh = lz[3] - lz[1], sc = Math.min(bw / r[1].width, bh / r[1].height), lw = r[1].width * sc, lh = r[1].height * sc; c.drawImage(r[1], lz[0] + (bw - lw) / 2, lz[1] + (bh - lh) / 2, lw, lh); }
    return cv;
  });
}

// ---------- CLOC'ARENA MAG : affiche couverture de magazine (A4 ou A3, même proportion) ----------
var MW = 2480, MH = 3508, SAFE = 177; // A4 à 300 dpi ; 1,5 cm de marge pour les cadres avec passe-partout
var MACC = { Blanc: '#e9eef6', Violet: '#a35cff', Rouge: '#f0313f', Orange: '#ff8a1f', Vert: '#2ed15a', Jaune: '#e4f53a' };
function sombreSur(niv) { return niv === 'Blanc' || niv === 'Jaune' || niv === 'Vert' || niv === 'Orange'; }
function ordinal(n) { n = parseInt(n, 10); if (!n) return ''; return n === 1 ? (S.sexe === 'F' ? '1re' : '1er') : n + 'e'; }
function police(poids, taille) { return 'italic ' + poids + ' ' + Math.round(taille) + 'px Inter'; }
function ajuste(c, t, poids, taille, maxw) { do { c.font = police(poids, taille); taille -= 2; } while (c.measureText(t).width > maxw && taille > 20); return taille + 2; }
function lignes(c, t, maxw) {
  var mots = String(t || '').split(/\s+/), l = [], cur = '';
  mots.forEach(function (m) { var e = cur ? cur + ' ' + m : m; if (c.measureText(e).width > maxw && cur) { l.push(cur); cur = m; } else cur = e; });
  if (cur) l.push(cur); return l;
}
function ombre(c, on, flou) { if (on) { c.shadowColor = 'rgba(0,0,0,.65)'; c.shadowBlur = flou || 24; c.shadowOffsetY = 6; } else { c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0; } }
// « 1re », « 12e » : nombre + exposant ; autre texte : tel quel. Renvoie la largeur.
function ecrireOrd(c, t, x, y, taille, couleur) {
  var m = /^(\d+)(er|re|e)$/.exec(String(t).trim()); c.fillStyle = couleur; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  c.font = police(900, taille);
  if (!m) { c.fillText(t, x, y); return c.measureText(t).width; }
  c.fillText(m[1], x, y); var w = c.measureText(m[1]).width;
  c.font = police(900, taille * 0.45); c.fillText(m[2], x + w + taille * 0.04, y - taille * 0.42);
  return w + taille * 0.04 + c.measureText(m[2]).width;
}
function codeBarre(c, x, y, w, h, graine) {
  var g = 0; for (var i = 0; i < graine.length; i++) g = (g * 31 + graine.charCodeAt(i)) >>> 0;
  c.fillStyle = '#fff'; c.fillRect(x, y, w, h); c.fillStyle = '#0b0f1e';
  var cx = x + 18;
  while (cx < x + w - 18) { g = (g * 1103515245 + 12345) >>> 0; var bw = 3 + (g % 4) * 3; c.fillRect(cx, y + 14, bw, h - 64); cx += bw + 4 + ((g >> 8) % 3) * 3; }
}
function courbe(c, x, y, w, h, serie, acc) {
  rond(c, x, y, w, h, 34); c.fillStyle = 'rgba(6,10,24,.78)'; c.fill(); c.lineWidth = 5; c.strokeStyle = acc; c.stroke();
  c.font = police(900, 58); c.fillStyle = acc; c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.fillText('SA PROGRESSION', x + 44, y + 92);
  c.font = police(700, 38); c.fillStyle = '#c9d1dc'; c.fillText('Rang dans son niveau, journée après journée', x + 44, y + 142);
  var pts = (serie || []).filter(function (r) { return r.rang_niveau; });
  if (pts.length < 2) { c.font = police(700, 44); c.fillStyle = '#c9d1dc'; c.fillText('La courbe arrive après quelques journées', x + 44, y + h / 2 + 40); return; }
  var px = x + 110, py = y + 190, pw = w - 170, ph = h - 280, max = Math.max(3, Math.max.apply(null, pts.map(function (r) { return r.rang_niveau; })));
  var X = function (i) { return px + pw * i / (pts.length - 1); }, Y = function (r) { return py + ph * (r - 1) / (max - 1); };
  c.setLineDash([10, 14]); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(px, Y(1)); c.lineTo(px + pw, Y(1)); c.stroke(); c.setLineDash([]);
  c.font = police(800, 36); c.fillStyle = '#c9d1dc'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(ordinal(1), px - 22, Y(1)); c.fillText(max + 'e', px - 22, Y(max));
  c.lineWidth = 12; c.lineJoin = 'round'; c.strokeStyle = acc; c.beginPath();
  pts.forEach(function (r, i) { if (i) c.lineTo(X(i), Y(r.rang_niveau)); else c.moveTo(X(i), Y(r.rang_niveau)); }); c.stroke();
  var best = 0; pts.forEach(function (r, i) { if (r.rang_niveau <= pts[best].rang_niveau) best = i; });
  c.beginPath(); c.arc(X(best), Y(pts[best].rang_niveau), 26, 0, 7); c.fillStyle = acc; c.fill(); c.lineWidth = 6; c.strokeStyle = '#fff'; c.stroke();
  c.beginPath(); c.arc(X(pts.length - 1), Y(pts[pts.length - 1].rang_niveau), 16, 0, 7); c.fillStyle = '#fff'; c.fill();
  c.font = police(700, 34); c.fillStyle = '#c9d1dc'; c.textBaseline = 'alphabetic';
  c.textAlign = 'left'; c.fillText(dateFr(pts[0].jour).slice(0, 5), px, y + h - 40);
  c.textAlign = 'right'; c.fillText(dateFr(pts[pts.length - 1].jour).slice(0, 5), px + pw, y + h - 40);
}
// k : échelle de sortie (0,5 pour l'aperçu, 1 = A4 300 dpi, 1,38 = A3 ≈ 290 dpi, limite des téléphones)
function dessinerMag(cv, k) {
  k = k || 1;
  var niv = S.niveau || 'Rouge', acc = MACC[niv] || MACC.Rouge, surAcc = sombreSur(niv) ? '#0b0f1e' : '#fff';
  // mascottes HD (2000 px) pour l'impression, petite version de l'appli en secours
  var bal = niv.toLowerCase();
  return Promise.all([img('../balles/hd/' + bal + '.webp?v=1').catch(function () { return img('../balles/' + bal + '.webp').catch(function () { return null; }); }), img('../logo.png').catch(function () { return null; }), polices(), fondPret()]).then(function (r) {
    cv.width = Math.round(MW * k); cv.height = Math.round(MH * k);
    var c = cv.getContext('2d'), masc = r[0], logo = r[1], g;
    c.scale(k, k); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    // fond : image choisie (pleine page) ou dégradés d'origine
    c.fillStyle = '#060a18'; c.fillRect(0, 0, MW, MH);
    if (r[3]) couvrir(c, r[3], 0, 0, MW, MH, 0.5);
    else {
      g = c.createRadialGradient(MW * 0.72, MH * 0.42, 60, MW * 0.72, MH * 0.42, MW * 0.9); g.addColorStop(0, affRgba(acc, 0.55)); g.addColorStop(1, 'rgba(6,10,24,0)'); c.fillStyle = g; c.fillRect(0, 0, MW, MH);
      g = c.createRadialGradient(0, MH, 60, 0, MH, MW); g.addColorStop(0, 'rgba(40,70,160,.45)'); g.addColorStop(1, 'rgba(6,10,24,0)'); c.fillStyle = g; c.fillRect(0, 0, MW, MH);
    }
    var avecPhoto = C.photo && M.photoOn !== false, pleine = avecPhoto && M.style === 'photo', polaroid = avecPhoto && !pleine;
    var f = pleine ? cadre([0, 0, MW, MH]) : null;
    if (f) c.drawImage(C.photo, f.x, f.y, f.w, f.h);
    else if (masc) {
      var mh = polaroid ? 1550 : 1700, mw = mh * masc.width / masc.height, mcx = polaroid ? 1470 : 1640; if (mw > (polaroid ? 1350 : 1500)) { mw = polaroid ? 1350 : 1500; mh = mw * masc.height / masc.width; }
      c.save(); c.shadowColor = acc; c.shadowBlur = 120; c.drawImage(masc, mcx - mw / 2, 1650 - mh / 2, mw, mh); c.restore();
    }
    // voiles pour la lisibilité des textes
    g = c.createLinearGradient(0, 0, 0, 1150); g.addColorStop(0, 'rgba(4,7,18,.92)'); g.addColorStop(1, 'rgba(4,7,18,0)'); c.fillStyle = g; c.fillRect(0, 0, MW, 1150);
    g = c.createLinearGradient(0, MH - 1650, 0, MH); g.addColorStop(0, 'rgba(4,7,18,0)'); g.addColorStop(0.45, 'rgba(4,7,18,.78)'); g.addColorStop(1, 'rgba(4,7,18,.97)'); c.fillStyle = g; c.fillRect(0, MH - 1650, MW, 1650);
    c.save(); c.scale(1, 1.5); g = c.createRadialGradient(0, 1550 / 1.5, 50, 0, 1550 / 1.5, 1500); g.addColorStop(0, 'rgba(4,7,18,.68)'); g.addColorStop(1, 'rgba(4,7,18,0)'); c.fillStyle = g; c.fillRect(0, 0, 1600, MH / 1.5); c.restore();
    // bandeau du haut
    c.textBaseline = 'alphabetic'; ombre(c, false);
    c.font = police(800, 54); c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(String(M.numero || '').toUpperCase(), SAFE, SAFE + 60);
    c.textAlign = 'right'; c.fillText('SAISON 2026-2027 · CLOCA TENNIS ACHÈRES', MW - SAFE, SAFE + 60);
    c.fillStyle = acc; c.fillRect(SAFE, SAFE + 92, MW - 2 * SAFE, 8);
    // titre du magazine
    var tt = 'CLOC\'ARENA', ts = ajuste(c, tt, 900, 460, MW - 2 * SAFE + 30);
    c.save(); ombre(c, true, 30); c.font = police(900, ts); c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(tt, SAFE - 14, SAFE + 120 + ts * 0.76); c.restore();
    var yMag = SAFE + 150 + ts * 0.76;
    c.font = police(900, 150); var wm = c.measureText('MAG').width + 90;
    rond(c, MW - SAFE - wm, yMag, wm, 190, 26); c.fillStyle = acc; c.fill();
    c.fillStyle = surAcc; c.textAlign = 'center'; c.fillText('MAG', MW - SAFE - wm / 2, yMag + 152);
    c.font = police(800, 64); c.fillStyle = '#fff'; c.textAlign = 'right'; c.fillText('ÉDITION TWEENER', MW - SAFE - wm - 36, yMag + 122);
    // pastille : rang du jour dans son niveau
    if (S.rangNiveau) {
      var sx = MW - SAFE - 250, sy = yMag + 520;
      c.save(); c.translate(sx, sy); c.rotate(-0.17); ombre(c, true, 40);
      c.beginPath(); c.arc(0, 0, 250, 0, 7); c.fillStyle = acc; c.fill(); ombre(c, false);
      c.lineWidth = 8; c.strokeStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(0, 0, 222, 0, 7); c.stroke();
      c.textAlign = 'center'; c.fillStyle = surAcc; c.font = police(800, 54); c.fillText('RANG', 0, -96);
      c.font = police(900, 190); var o = ordinal(S.rangNiveau), mo = /^(\d+)(er|re|e)$/.exec(o), w0 = c.measureText(mo[1]).width; c.font = police(900, 86); var w1 = c.measureText(mo[2]).width;
      ecrireOrd(c, o, -(w0 + w1 + 8) / 2, 70, 190, surAcc);
      c.textAlign = 'center'; c.font = police(800, 44); c.fillStyle = surAcc; c.fillText(niv.toUpperCase() + ' · ' + String(S.dateCarte || '').slice(0, 5), 0, 140);
      c.restore();
    }
    // titres de la une (colonne de gauche)
    var x = SAFE, y = yMag + 420, maxw = 1300;
    c.save(); ombre(c, true, 20);
    c.shadowColor = 'transparent'; c.font = police(900, 50); var wu = c.measureText('À LA UNE').width + 56;
    c.save(); c.translate(x, y - 40); c.rotate(-0.04); rond(c, 0, 0, wu, 78, 14); c.fillStyle = '#ffd400'; c.fill(); c.fillStyle = '#0b0f1e'; c.textAlign = 'left'; c.fillText('À LA UNE', 28, 58); c.restore();
    y += 60; ombre(c, true, 20);
    if (M.h1a) { var w = ecrireOrd(c, M.h1a, x, y + 230, 300, acc); if (M.h1c) { c.font = police(900, 92); c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(M.h1c.toUpperCase(), x + w + 50, y + 225); } y += 250; }
    if (M.h1b) { c.font = police(900, 84); c.fillStyle = '#fff'; c.textAlign = 'left'; lignes(c, M.h1b.toUpperCase(), maxw).forEach(function (l) { c.fillText(l, x, y + 80); y += 92; }); y += 30; }
    c.shadowColor = 'transparent'; c.fillStyle = acc; c.fillRect(x, y, 180, 14); y += 50; ombre(c, true, 20);
    [[M.h2a, M.h2b, 150, '#fff'], [M.h3a, M.h3b, 92, acc], [M.h4a, M.h4b, 92, acc]].forEach(function (t) {
      if (!t[0] && !t[1]) return;
      if (t[0]) { c.font = police(900, ajuste(c, t[0].toUpperCase(), 900, t[2], maxw)); c.fillStyle = t[3]; c.fillText(t[0].toUpperCase(), x, y + t[2] * 0.8); y += t[2] * 0.95; }
      if (t[1]) { c.font = police(700, 58); c.fillStyle = '#fff'; lignes(c, t[1], maxw).forEach(function (l) { c.fillText(l, x, y + 52); y += 66; }); }
      y += 44;
    });
    c.restore();
    // photo du joueur en polaroïd (la mascotte reste en couverture)
    if (polaroid) {
      var pw = 540, ph = 650, ins = 30, zp = pw - 2 * ins;
      c.save(); c.translate(2015, 1790); c.rotate(0.07);
      ombre(c, true, 50); c.fillStyle = '#fbfaf6'; c.fillRect(-pw / 2, -ph / 2, pw, ph); ombre(c, false);
      var fp = cadre([0, 0, zp, zp]);
      c.save(); c.beginPath(); c.rect(-pw / 2 + ins, -ph / 2 + ins, zp, zp); c.clip(); if (r[3]) couvrir(c, r[3], -pw / 2 + ins, -ph / 2 + ins, zp, zp, 0.55); c.drawImage(C.photo, -pw / 2 + ins + fp.x, -ph / 2 + ins + fp.y, fp.w, fp.h); c.restore();
      var lg = String(M.legende || '').trim();
      if (lg) { c.font = police(800, ajuste(c, lg, 800, 50, zp - 10)); c.fillStyle = '#0b0f1e'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText(lg, 0, ph / 2 - 40); }
      c.save(); c.translate(0, -ph / 2 + 6); c.rotate(-0.09); c.fillStyle = 'rgba(255,212,0,.78)'; c.fillRect(-120, -34, 240, 68); c.restore();
      c.restore();
    }
    // progression + mot du coach
    var yb = Math.max(y + 20, 2140), hb = 2590 - yb;
    if (hb > 360) {
      var coach = M.coachOn && String(M.coachTxt || '').trim();
      courbe(c, SAFE, yb, coach ? 1150 : 1400, hb, (C.par && C.par.serie) || [], acc);
      if (coach) {
        var bx = SAFE + 1190, bw = MW - SAFE - bx;
        rond(c, bx, yb, bw, hb, 34); c.fillStyle = 'rgba(6,10,24,.78)'; c.fill();
        c.font = police(900, 52); c.fillStyle = acc; c.textAlign = 'left'; c.fillText('« LE MOT DU COACH »', bx + 44, yb + 92);
        var tl, tz = 60; do { c.font = police(700, tz); tl = lignes(c, coach, bw - 100); tz -= 2; } while (tl.length * tz * 1.3 > hb - 260 && tz > 34);
        c.fillStyle = '#fff'; tl.forEach(function (l, i) { c.fillText(l, bx + 44, yb + 190 + i * tz * 1.3); });
        if (M.coachSig) { c.font = police(800, 48); c.fillStyle = acc; c.textAlign = 'right'; c.fillText('— ' + M.coachSig, bx + bw - 44, yb + hb - 44); }
      }
    }
    // mascotte (quand la photo prend la page) + nom
    if (f && masc) { var mh2 = 470, mw2 = mh2 * masc.width / masc.height; if (mw2 > 640) { mw2 = 640; mh2 = mw2 * masc.height / masc.width; } c.save(); c.shadowColor = acc; c.shadowBlur = 60; c.drawImage(masc, MW - SAFE - mw2, 3080 - mh2, mw2, mh2); c.restore(); }
    c.save(); ombre(c, true, 26); c.textAlign = 'left';
    var pre = joliPrenom(S.prenom), nom = String(S.nom || '').toUpperCase(), nmax = f && masc ? 1500 : MW - 2 * SAFE;
    c.font = police(800, 130); c.fillStyle = acc; c.fillText(pre, SAFE, 2820);
    var ns = ajuste(c, nom, 900, 270, nmax); c.font = police(900, ns); c.fillStyle = '#fff'; c.fillText(nom, SAFE - 8, 2830 + ns * 0.82);
    c.restore();
    // pied de page : logo, slogan, code-barres
    var fy = MH - SAFE - 160;
    if (logo) { var lh = 160, lw = lh * logo.width / logo.height; c.save(); c.beginPath(); c.arc(SAFE + lh / 2, fy + lh / 2, lh / 2 + 8, 0, 7); c.fillStyle = '#fff'; c.fill(); c.restore(); c.drawImage(logo, SAFE + (lh - Math.min(lw, lh)) / 2, fy, Math.min(lw, lh), lh * Math.min(lw, lh) / lw); }
    c.font = police(900, 76); c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText('VAMOS HR', MW / 2, fy + 108);
    c.font = police(900, 40); c.fillStyle = '#ffd400'; c.textAlign = 'right'; c.fillText('PRIX : 1 SOURIRE', MW - SAFE, fy - 22);
    codeBarre(c, MW - SAFE - 470, fy, 470, 160, pre + nom);
    c.font = police(800, 32); c.fillStyle = '#0b0f1e'; c.textAlign = 'center'; c.fillText('STATS AU ' + (S.dateCarte || ''), MW - SAFE - 235, fy + 146);
    return cv;
  });
}
function affRgba(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
// Titres de la une proposés à partir des stats (tous modifiables)
function titresMag() {
  var d = C.d || {}, p = C.par || {}, mn = d.meilleur_niveau, niv = (S.niveau || '').toUpperCase();
  M.h1a = mn && mn.rang ? ordinal(mn.rang) : S.rangNiveau ? ordinal(S.rangNiveau) : '';
  M.h1b = mn && mn.rang || S.rangNiveau ? 'du classement ' + (S.niveau || '') : '';
  M.h1c = mn && mn.rang ? 'le ' + dateFr(mn.jour).slice(0, 5) : '';
  var v = parseInt(S.victoires, 10) || 0, m = parseInt(S.matchs, 10) || 0;
  M.h2a = v ? v + (v > 1 ? ' victoires' : ' victoire') : m ? m + ' matchs joués' : '';
  M.h2b = v && m ? 'en ' + m + ' matchs · ' + S.pct + ' % de victoires' : '';
  var sr = p.meilleure_serie || 0;
  M.h3a = sr >= 2 ? 'Série de feu' : ''; M.h3b = sr >= 2 ? sr + ' victoires d\'affilée' : '';
  var j = p.meilleure_journee;
  M.h4a = j && j.points ? 'Journée record' : ''; M.h4b = j && j.points ? '+' + nombre(j.points) + ' points le ' + dateFr(j.jour).slice(0, 5) : '';
  if (niv && !M.h1a) M.h1a = niv;
  M.legende = joliPrenom(S.prenom) + ' en action !';
}
var MOIS = ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'];

// ---------- export ----------
function blob(cv, type, qual) { return new Promise(function (ok) { cv.toBlob(ok, type || 'image/png', qual); }); }
function telecharger(b, nom) { var u = URL.createObjectURL(b), l = document.createElement('a'); l.href = u; l.download = nom; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); }
function jsPDF() {
  if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
  return new Promise(function (ok, ko) { var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'; s.onload = function () { ok(window.jspdf.jsPDF); }; s.onerror = ko; document.head.appendChild(s); });
}
function nomFichier(ext) { return ('Carte_' + joliPrenom(S.prenom) + '_' + String(S.nom || '').toUpperCase()).replace(/[^A-Za-z0-9À-ÿ_-]+/g, '_') + '.' + ext; }
// Planche A4 : 9 cartes 63 x 88 mm, traits de coupe aux coins
function pdfPlanche(cartes) {
  return jsPDF().then(function (PDF) {
    var doc = new PDF({ unit: 'mm', format: 'a4', orientation: 'portrait' }), cw = 63, ch = 88, x0 = (210 - 3 * cw) / 2, y0 = (297 - 3 * ch) / 2;
    cartes.forEach(function (u, k) {
      var i = k % 9; if (k && !i) doc.addPage('a4', 'portrait');
      var x = x0 + (i % 3) * cw, y = y0 + Math.floor(i / 3) * ch;
      doc.addImage(u, 'JPEG', x, y, cw, ch);
      if (i === 8 || k === cartes.length - 1) {
        doc.setDrawColor(120); doc.setLineWidth(0.2);
        for (var a = 0; a <= 3; a++) { doc.line(x0 + a * cw, y0 - 6, x0 + a * cw, y0 - 1.5); doc.line(x0 + a * cw, y0 + 3 * ch + 1.5, x0 + a * cw, y0 + 3 * ch + 6); doc.line(x0 - 6, y0 + a * ch, x0 - 1.5, y0 + a * ch); doc.line(x0 + 3 * cw + 1.5, y0 + a * ch, x0 + 3 * cw + 6, y0 + a * ch); }
      }
    });
    doc.save('Planche_cartes_Tweener.pdf');
  });
}

// ---------- page ----------
function champ(id, label, type, extra) {
  return '<label class="l">' + label + '<input id="' + id + '" type="' + (type || 'text') + '"' + (extra || '') + '></label>';
}
function arCartesPage(box) {
  box.innerHTML = '<div class="card"><div class="skel" style="height:120px"></div></div>';
  chargerPers().then(function (pers) {
    var J = (pers || []).filter(function (p) { return p.arena_id && p.actif !== false; }).sort(function (a, b) { return (a.prenom + a.nom).localeCompare(b.prenom + b.nom, 'fr'); });
    box.innerHTML =
      '<div class="card stack" style="margin-bottom:12px"><b>Cartes joueurs Tweener</b>' +
      '<span class="small mut">Choisis un joueur : les stats se remplissent toutes seules (classement du jour, meilleur classement et progression depuis la rentrée). Tout reste modifiable avant l\'export.<br>' +
      '<b>Carte</b> 63 x 88 mm à plastifier (image, PDF taille réelle ou planche A4 de 9 cartes) · <b>Affiche MAG</b> couverture de magazine à encadrer, en A4 ou A3.</span>' +
      '<label class="l">Joueur<select id="ca-j"><option value="">Choisir un joueur…</option>' + J.map(function (p) { return '<option value="' + p.id + '">' + esc(joliPrenom(p.prenom) + ' ' + String(p.nom || '').toUpperCase()) + (p.niveau_arena ? ' · ' + esc(p.niveau_arena) : '') + '</option>'; }).join('') + '</select></label></div>' +
      '<div id="ca-z" style="display:none">' +
      '<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start">' +
      '<div class="card stack" style="flex:0 1 330px;align-items:center"><div class="chips" style="justify-content:center;margin:0"><button class="chip on" data-camode="carte">Carte</button><button class="chip" data-camode="mag">Affiche MAG</button></div><canvas id="ca-cv" style="width:100%;max-width:300px;height:auto;border-radius:12px;touch-action:none;cursor:grab;box-shadow:0 6px 24px rgba(0,0,0,.25)"></canvas>' +
      '<span class="mut xs" id="ca-aide">Ajoute une photo, puis fais-la glisser sur la carte pour la placer.</span>' +
      '<div class="toolbar" style="margin:0;flex-wrap:wrap;justify-content:center"><button class="btn sm" id="ca-png">Image</button><button class="btn sm ghost" id="ca-pdf">PDF carte</button><button class="btn sm ghost" id="ca-sh">Partager</button></div>' +
      '<div class="toolbar" id="ca-plr" style="margin:0;flex-wrap:wrap;justify-content:center"><button class="btn sm ghost" id="ca-add">Ajouter à la planche</button><button class="btn sm" id="ca-pl" disabled>Planche A4 (0)</button><button class="btn sm ghost" id="ca-vide" disabled>Vider</button></div></div>' +
      '<div class="card stack" style="flex:1 1 320px">' +
      '<div class="sect">Photo</div>' +
      '<div class="toolbar" style="margin:0;flex-wrap:wrap"><button class="btn sm ghost" id="ca-pp" style="display:none">Photo du profil</button><label class="btn sm ghost" style="cursor:pointer">Prendre ou choisir une photo<input id="ca-f" type="file" accept="image/*" style="display:none"></label><button class="btn sm ghost" id="ca-px" style="display:none">Retirer</button></div>' +
      '<label class="l" id="ca-zl" style="display:none">Zoom<input id="ca-zoom" type="range" min="1" max="3" step="0.01" value="1"></label>' +
      '<div class="sect">Fond derrière le joueur</div>' +
      '<div class="chips" id="ca-fonds" style="margin:0"><button class="chip on" data-cafond="">Aucun</button>' + FONDS.map(function (f) { return '<button class="chip" data-cafond="' + f.id + '">' + esc(f.nom) + '</button>'; }).join('') + '</div>' +
      '<label class="c" id="ca-tl" style="display:none"><input type="checkbox" id="ca-teinte" checked> Néons à la couleur du niveau</label>' +
      '<span class="mut xs">Pour une photo détourée (sans fond). Avec un fond, tu peux dézoomer et descendre le joueur pour poser ses pieds sur le sol.</span>' +
      '<div class="sect">Joueur</div>' +
      '<div class="row3">' + champ('ca-prenom', 'Prénom') + champ('ca-nom', 'Nom') +
      '<label class="l">Niveau<select id="ca-niveau">' + NIV.map(function (n) { return '<option>' + n + '</option>'; }).join('') + '</select></label>' +
      '<label class="l">Carte<select id="ca-sexe"><option value="F">Filles</option><option value="M">Garçons</option></select></label></div>' +
      '<div class="sect">Meilleur classement</div>' +
      '<div class="row3"><label class="l">Classement<select id="ca-mtype"><option value="niveau">Dans son niveau</option><option value="general">Général</option><option value="sexe">Filles / garçons</option></select></label>' +
      champ('ca-meilleur', 'Rang', 'number', ' min="1" inputmode="numeric"') + champ('ca-mdate', 'Date', 'text', ' placeholder="jj/mm/aaaa"') + '</div>' +
      '<div class="sect">Stats</div>' +
      '<div class="row3">' + champ('ca-matchs', 'Matchs', 'number', ' min="0" inputmode="numeric"') + champ('ca-victoires', 'Victoires', 'number', ' min="0" inputmode="numeric"') + champ('ca-points', 'Points', 'text', ' inputmode="decimal"') + champ('ca-pct', '% victoires', 'text', ' inputmode="numeric"') + '</div>' +
      '<div class="sect">Rangs du jour</div>' +
      '<div class="row3">' + champ('ca-rg', 'Général', 'number', ' min="1" inputmode="numeric"') + champ('ca-rn', 'Niveau', 'number', ' min="1" inputmode="numeric"') + champ('ca-rs', '<span id="ca-rsl">Filles</span>', 'number', ' min="1" inputmode="numeric"') + '</div>' +
      champ('ca-date', 'Stats au (date de la carte)', 'text', ' placeholder="jj/mm/aaaa"') +
      '<div id="ca-magf" style="display:none"><div class="sect">Affiche MAG</div>' +
      '<div class="row3"><label class="l">Format du PDF<select id="ca-fmt"><option value="A4">A4 (21 x 29,7 cm)</option><option value="A3">A3 (29,7 x 42 cm)</option></select></label>' + champ('ca-num', 'Numéro (en haut à gauche)') + '</div>' +
      '<div class="sect">Options</div><label class="c"><input type="checkbox" id="ca-pon" checked> Mettre la photo du joueur <span class="mut xs">(décoché : la mascotte seule en couverture)</span></label>' +
      '<div class="row3" id="ca-pz"><label class="l">Place de la photo<select id="ca-style"><option value="mascotte">Mascotte en couverture + photo en polaroïd</option><option value="photo">Photo en pleine page</option></select></label>' + champ('ca-leg', 'Légende du polaroïd') + '</div>' +
      '<label class="c" style="margin-top:6px"><input type="checkbox" id="ca-con"> Ajouter le mot du coach</label>' +
      '<div id="ca-cz" style="display:none"><label class="l">Mot du coach (220 caractères max)<textarea class="f" id="ca-ctx" rows="3" maxlength="220" placeholder="Ex. Une saison pleine d\'envie : tu ne lâches rien et ça se voit sur le court !"></textarea></label>' + champ('ca-csig', 'Signature', 'text', ' placeholder="Ex. David, ton coach"') + '</div>' +
      '<div class="sect">Titres de la une <button class="btn sm ghost" id="ca-retitre" style="margin-left:8px">Reproposer</button></div>' +
      '<div class="row3">' + champ('ca-h1a', 'Gros titre') + champ('ca-h1c', 'À côté (date)') + champ('ca-h1b', 'Sous le gros titre') + '</div>' +
      '<div class="row3">' + champ('ca-h2a', 'Titre 2') + champ('ca-h2b', 'Détail 2') + '</div>' +
      '<div class="row3">' + champ('ca-h3a', 'Titre 3') + champ('ca-h3b', 'Détail 3') + '</div>' +
      '<div class="row3">' + champ('ca-h4a', 'Titre 4') + champ('ca-h4b', 'Détail 4') + '</div>' +
      '<span class="mut xs">Sans photo, la mascotte du niveau prend la couverture. 1,5 cm restent libres sur les bords pour les cadres avec passe-partout.</span></div>' +
      '<span class="mut xs" id="ca-note"></span>' +
      '</div></div></div>';

    var cv = $('ca-cv'), enCours = null;
    var rendu = function () {
      if (enCours) { enCours.encore = true; return; }
      enCours = {};
      (C.mode === 'mag' ? dessinerMag(cv, 0.5) : dessiner(cv)).catch(function () { toast('Dessin impossible'); }).then(function () { var e = enCours; enCours = null; if (e && e.encore) rendu(); });
    };
    var lier = function (id, cle, apres) { var el = $(id); el.oninput = el.onchange = function () { S[cle] = el.value; if (apres) apres(); rendu(); }; };
    var remplir = function () {
      $('ca-prenom').value = S.prenom || ''; $('ca-nom').value = S.nom || ''; $('ca-niveau').value = S.niveau || 'Rouge'; $('ca-sexe').value = S.sexe === 'F' ? 'F' : 'M';
      $('ca-meilleur').value = S.meilleur || ''; $('ca-mdate').value = S.meilleurDate || '';
      $('ca-matchs').value = S.matchs; $('ca-victoires').value = S.victoires; $('ca-points').value = nombre(S.points); $('ca-pct').value = S.pct;
      $('ca-rg').value = S.rangGeneral || ''; $('ca-rn').value = S.rangNiveau || ''; $('ca-rs').value = S.rangSexe || ''; $('ca-date').value = S.dateCarte || '';
      $('ca-rsl').textContent = S.sexe === 'F' ? 'Filles' : 'Garçons';
    };
    var meilleur = function () {
      var d = C.d || {}, m = d['meilleur_' + $('ca-mtype').value];
      S.meilleur = m && m.rang ? m.rang : ''; S.meilleurDate = m && m.jour ? dateFr(m.jour) : '';
      $('ca-meilleur').value = S.meilleur; $('ca-mdate').value = S.meilleurDate;
    };
    var pct = function () { var m = parseInt(S.matchs, 10), v = parseInt(S.victoires, 10); S.pct = m > 0 && v >= 0 ? String(Math.round(v * 100 / m)) : '–'; $('ca-pct').value = S.pct; };
    var majPhoto = function () {
      var a = !!C.photo, ou = C.mode === 'mag' ? 'l\'affiche' : 'la carte'; $('ca-zl').style.display = a ? '' : 'none'; $('ca-px').style.display = a ? '' : 'none';
      $('ca-aide').textContent = a ? 'Fais glisser la photo sur ' + ou + ' pour la placer, et zoome si besoin.' : 'Ajoute une photo, puis fais-la glisser sur ' + ou + ' pour la placer.';
      // Photo trop petite pour une impression nette : on prévient (pleine page A4 ≈ 1700 px, polaroïd ≈ 500 px, carte ≈ 600 px)
      if (a) {
        var cote = Math.min(C.photo.naturalWidth || C.photo.width, C.photo.naturalHeight || C.photo.height);
        var besoin = C.mode !== 'mag' ? 600 : M.photoOn === false ? 0 : M.style === 'photo' ? 1700 : 500;
        if (besoin && cote < besoin) $('ca-aide').textContent = '⚠️ Photo un peu petite (' + cote + ' px) : elle risque d\'être floue à l\'impression. Prends-la plutôt directement avec le téléphone, en pleine résolution.';
      }
    };
    var chargerPhoto = function (src) { return img(src).then(function (i) { C.photo = i; C.zoom = 1; C.dx = 0; C.dy = 0; C.pz = {}; $('ca-zoom').value = 1; majPhoto(); rendu(); }); };

    $('ca-j').onchange = function () {
      var id = this.value; if (!id) { $('ca-z').style.display = 'none'; return; }
      var p = J.filter(function (x) { return x.id === id; })[0] || {};
      C.joueur = p; C.photo = null; majPhoto();
      $('ca-note').textContent = 'Chargement des stats…';
      Promise.all([q(sb.rpc('arena_tweener_carte', { p: id })), q(sb.rpc('arena_tweener_parcours', { p: id })).catch(function () { return null; })]).then(function (rr) {
        var d = rr[0]; C.d = d || {}; C.par = rr[1] || {};
        var niv = C.d.niveau || p.niveau_arena;
        S = {
          prenom: p.prenom || '', nom: p.nom || '', niveau: NIV.indexOf(niv) >= 0 ? niv : 'Rouge', sexe: (C.d.sexe || p.sexe) === 'F' ? 'F' : 'M',
          matchs: C.d.matchs || 0, victoires: C.d.victoires || 0, points: C.d.points || 0,
          rangGeneral: C.d.rang_general || '', rangNiveau: C.d.rang_niveau || '', rangSexe: C.d.rang_sexe || '',
          dateCarte: dateFr(C.d.jour || new Date().toISOString())
        };
        $('ca-z').style.display = '';
        $('ca-mtype').value = 'niveau'; remplir(); meilleur(); pct();
        var now = new Date(); M = { photoOn: true, style: 'mascotte', format: $('ca-fmt').value || 'A4', numero: MOIS[now.getMonth()] + ' ' + now.getFullYear(), coachOn: false, coachTxt: '', coachSig: '' };
        titresMag(); remplirMag(); $('ca-con').checked = false; $('ca-cz').style.display = 'none'; $('ca-ctx').value = ''; $('ca-csig').value = '';
        $('ca-note').textContent = C.d.rang_general ? 'Stats au ' + dateFr(C.d.jour) + '. Meilleurs rangs calculés sur toutes les journées depuis la rentrée.' : 'Ce joueur n\'a pas encore de points au classement Tweener.';
        $('ca-pp').style.display = p.photo_path ? '' : 'none';
        rendu();
      }).catch(function () { $('ca-note').textContent = ''; toast('Stats impossibles à charger'); });
    };
    lier('ca-prenom', 'prenom'); lier('ca-nom', 'nom'); lier('ca-niveau', 'niveau');
    lier('ca-sexe', 'sexe', function () { $('ca-rsl').textContent = S.sexe === 'F' ? 'Filles' : 'Garçons'; });
    lier('ca-meilleur', 'meilleur'); lier('ca-mdate', 'meilleurDate');
    lier('ca-matchs', 'matchs', pct); lier('ca-victoires', 'victoires', pct); lier('ca-points', 'points'); lier('ca-pct', 'pct');
    lier('ca-rg', 'rangGeneral'); lier('ca-rn', 'rangNiveau'); lier('ca-rs', 'rangSexe'); lier('ca-date', 'dateCarte');
    $('ca-mtype').onchange = function () { meilleur(); rendu(); };

    // Affiche MAG : champs et mode
    var remplirMag = function () { $('ca-pon').checked = M.photoOn !== false; $('ca-pz').style.display = M.photoOn !== false ? '' : 'none'; $('ca-leg').value = M.legende || ''; $('ca-style').value = M.style || 'mascotte'; ['h1a', 'h1b', 'h1c', 'h2a', 'h2b', 'h3a', 'h3b', 'h4a', 'h4b'].forEach(function (k) { $('ca-' + k).value = M[k] || ''; }); $('ca-num').value = M.numero || ''; };
    ['h1a', 'h1b', 'h1c', 'h2a', 'h2b', 'h3a', 'h3b', 'h4a', 'h4b'].forEach(function (k) { var el = $('ca-' + k); el.oninput = function () { M[k] = el.value; rendu(); }; });
    $('ca-num').oninput = function () { M.numero = this.value; rendu(); };
    $('ca-style').onchange = function () { M.style = this.value; C.zoom = 1; C.dx = 0; C.dy = 0; $('ca-zoom').value = 1; majPhoto(); rendu(); };
    $('ca-leg').oninput = function () { M.legende = this.value; rendu(); };
    $('ca-pon').onchange = function () { M.photoOn = this.checked; $('ca-pz').style.display = this.checked ? '' : 'none'; majPhoto(); rendu(); };
    $('ca-fmt').onchange = function () { M.format = this.value; };
    $('ca-retitre').onclick = function () { titresMag(); remplirMag(); rendu(); };
    $('ca-con').onchange = function () { M.coachOn = this.checked; $('ca-cz').style.display = this.checked ? '' : 'none'; rendu(); };
    $('ca-ctx').oninput = function () { M.coachTxt = this.value; rendu(); };
    $('ca-csig').oninput = function () { M.coachSig = this.value; rendu(); };
    var modeAff = function () {
      var mag = C.mode === 'mag';
      all('[data-camode]', box).forEach(function (b) { b.classList.toggle('on', b.dataset.camode === C.mode); });
      $('ca-magf').style.display = mag ? '' : 'none'; $('ca-plr').style.display = mag ? 'none' : '';
      $('ca-pdf').textContent = mag ? 'PDF à imprimer' : 'PDF carte';
      $('ca-zoom').value = C.zoom; majPhoto();
    };
    all('[data-camode]', box).forEach(function (b) {
      b.onclick = function () {
        if (C.mode === b.dataset.camode) return;
        C.pz[C.mode] = { zoom: C.zoom, dx: C.dx, dy: C.dy };
        C.mode = b.dataset.camode; var z = C.pz[C.mode] || { zoom: 1, dx: 0, dy: 0 }; C.zoom = z.zoom; C.dx = z.dx; C.dy = z.dy;
        modeAff(); rendu();
      };
    });

    // photo : profil (espace privé « photos »), appareil ou galerie
    $('ca-pp').onclick = function () {
      var p = C.joueur; if (!p || !p.photo_path) return;
      sb.storage.from('photos').download(p.photo_path).then(function (r) { if (r.error || !r.data) throw r.error; return chargerPhoto(URL.createObjectURL(r.data)); }).catch(function () { toast('Photo du profil introuvable'); });
    };
    $('ca-f').onchange = function () { var f = this.files && this.files[0]; if (f) chargerPhoto(URL.createObjectURL(f)).catch(function () { toast('Image illisible'); }); this.value = ''; };
    $('ca-px').onclick = function () { C.photo = null; majPhoto(); rendu(); };
    $('ca-zoom').oninput = function () { C.zoom = +this.value; rendu(); };
    // fond derrière le joueur
    var majFond = function () {
      all('[data-cafond]', box).forEach(function (b) { b.classList.toggle('on', b.dataset.cafond === C.fond); });
      $('ca-tl').style.display = C.fond ? '' : 'none';
      $('ca-zoom').min = C.fond ? '0.4' : '1';
      if (!C.fond && C.zoom < 1) { C.zoom = 1; $('ca-zoom').value = 1; }
    };
    all('[data-cafond]', box).forEach(function (b) { b.onclick = function () { C.fond = b.dataset.cafond; majFond(); rendu(); }; });
    $('ca-teinte').onchange = function () { C.teinte = this.checked; rendu(); };
    majFond();
    var glisse = null;
    cv.onpointerdown = function (e) { if (!C.photo) return; glisse = { x: e.clientX, y: e.clientY, dx: C.dx, dy: C.dy }; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; };
    cv.onpointermove = function (e) { if (!glisse) return; var k = (C.mode === 'mag' ? MW : W) / cv.getBoundingClientRect().width; C.dx = glisse.dx + (e.clientX - glisse.x) * k; C.dy = glisse.dy + (e.clientY - glisse.y) * k; rendu(); };
    cv.onpointerup = cv.onpointercancel = function () { glisse = null; cv.style.cursor = 'grab'; };

    // exports
    var toile = function () { var t = document.createElement('canvas'); return C.mode === 'mag' ? dessinerMag(t, M.format === 'A3' ? 1.38 : 1) : dessiner(t); };
    var majPlanche = function () { var n = C.planche.length; $('ca-pl').textContent = 'Planche A4 (' + n + ')'; $('ca-pl').disabled = !n; $('ca-vide').disabled = !n; };
    $('ca-png').onclick = function () { toile().then(function (t) { return C.mode === 'mag' ? blob(t, 'image/jpeg', 0.97) : blob(t); }).then(function (b) { telecharger(b, C.mode === 'mag' ? nomFichier('jpg').replace('Carte_', 'MAG_') : nomFichier('png')); }); };
    $('ca-pdf').onclick = function () {
      Promise.all([toile(), jsPDF()]).then(function (r) {
        var mag = C.mode === 'mag', dim = mag ? (M.format === 'A3' ? [297, 420] : [210, 297]) : [63, 88];
        var doc = new r[1]({ unit: 'mm', format: dim, orientation: 'portrait' }); doc.addImage(r[0].toDataURL('image/jpeg', 0.97), 'JPEG', 0, 0, dim[0], dim[1]);
        doc.save(mag ? nomFichier('pdf').replace('Carte_', 'MAG_' + M.format + '_') : nomFichier('pdf'));
      }).catch(function () { toast('PDF impossible'); });
    };
    $('ca-sh').onclick = function () {
      toile().then(function (t) { return blob(t, 'image/jpeg', 0.92); }).then(function (b) {
        var f = new File([b], nomFichier('jpg'), { type: 'image/jpeg' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: C.mode === 'mag' ? 'CLOC\'ARENA MAG' : 'Carte CLOC\'ARENA Tweener' }).catch(function () { });
        telecharger(f, f.name); toast('Partage indisponible ici : image téléchargée');
      });
    };
    $('ca-add').onclick = function () { toile().then(function (t) { C.planche.push(t.toDataURL('image/jpeg', 0.97)); majPlanche(); toast('Carte ajoutée à la planche (' + C.planche.length + ')'); }); };
    $('ca-pl').onclick = function () { pdfPlanche(C.planche).catch(function () { toast('PDF impossible'); }); };
    $('ca-vide').onclick = function () { C.planche = []; majPlanche(); };
    majPlanche();
  }).catch(function () { box.innerHTML = '<div class="card empty">Impossible de charger les joueurs.</div>'; });
}

window.arCartes = function (box, o) {
  sb = o.sb; q = o.q; chargerPers = o.chargerPers; esc = o.esc; all = o.all; toast = o.toast; $ = o.$;
  return arCartesPage(box);
};
})();
