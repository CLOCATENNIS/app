// Affiches des classements CLOC'ARENA Tweener (Gestion → CLOC'ARENA → Affiches classement)
// admin.js est dans une fonction fermée : il passe ses outils (sb, q, chargerPers…) à window.arAffiches(box, outils).
(function () {
'use strict';
var sb, q, chargerPers, esc, all, toast, $;
// Classement en direct (arena_classement_v2 : points + 1 par participation ; départage victoires, matchs, niveau),
// dessiné sur les fonds du dossier affiches/. Sans fond, l'appli dessine un fond simple aux bonnes couleurs.
var AFF = {
  W: 1024, H: 1536, K: 2, // gabarit 1024 x 1536, sortie 2048 x 3072
  MAX: 40, // joueurs maximum par panneau (au-delà : page suivante)
  NIV: ['Blanc', 'Violet', 'Rouge', 'Orange', 'Vert', 'Jaune'],
  PILL: { Vert: ['#18be56', '#fff'], Violet: ['#7c3ce6', '#fff'], Rouge: ['#e82c38', '#fff'], Orange: ['#f58028', '#fff'], Jaune: ['#ffdc14', '#141414'], Blanc: ['#ececee', '#19191e'] },
  ACC: { Vert: '#46eb5a', Jaune: '#ffe228', Rouge: '#f53c4b', Orange: '#fa9632', Violet: '#b464ff', Blanc: '#ebeef5', 'Garçons': '#32beff', Filles: '#ff46c8', 'Général': '#ff46c8' },
  // Mise en page par défaut (fond simple), coordonnées 1024 x 1536. Chaque fond GPT a sa propre « lay » (panneaux mesurés sur l'image).
  BOX_L: [42, 260, 484, 1315], BOX_R: [539, 262, 982, 1314],
  LAY: { L: [42, 260, 484, 1315], R: [539, 262, 982, 1314], logo: [512, 118, 200], date: [512, 1392, 18] },
  LISTE: [
    { id: 'general', titre: 'Général', gauche: 'Général', droite: 'Général', fond: 'affiches/fond-general.jpg', niveau: true, lay: { L: [50, 263, 478, 1311], R: [547, 263, 975, 1311], logo: [112, 112, 170], date: [912, 112, 15, 'bloc'], acc: '#ff9a3c' } },
    { id: 'gf', titre: 'Garçons / Filles', gauche: 'Garçons', droite: 'Filles', fond: null, niveau: true },
    { id: 'bv', titre: 'Blanc / Violet', gauche: 'Blanc', droite: 'Violet', fond: 'affiches/fond-blanc-violet.jpg', lay: { L: [45, 259, 486, 1314], R: [542, 260, 982, 1314], logo: [512, 122, 190], date: [512, 1392, 18] } },
    { id: 'ro', titre: 'Rouge / Orange', gauche: 'Rouge', droite: 'Orange', fond: 'affiches/fond-rouge-orange.jpg', lay: { L: [41, 229, 478, 1399], R: [544, 232, 980, 1396], logo: [512, 92, 175], date: [512, 191, 15] } },
    { id: 'vj', titre: 'Vert / Jaune', gauche: 'Vert', droite: 'Jaune', fond: 'affiches/fond-vert-jaune.jpg', lay: { L: [42, 234, 476, 1396], R: [543, 234, 980, 1397], logo: [512, 92, 175], date: [512, 191, 15] } }
  ],
  img: {}, data: null
};

function affNom(p) {
  var pr = String(p.prenom || '').split('-').map(function (x) { return x.charAt(0).toUpperCase() + x.slice(1).toLowerCase(); }).join('-');
  return (pr + ' ' + String(p.nom || '').toUpperCase()).trim();
}
function affImage(src) {
  if (AFF.img[src]) return AFF.img[src];
  AFF.img[src] = new Promise(function (ok, ko) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = ko; i.src = src; });
  return AFF.img[src];
}
function affPolices() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.all(['600 20px Inter', '700 20px Inter', '800 20px Inter', 'italic 900 20px Inter', 'italic 700 20px Inter'].map(function (f) { return document.fonts.load(f).catch(function () { }); }));
}
function affCharger() {
  return Promise.all([q(sb.rpc('arena_classement_v2')), chargerPers()]).then(function (r) {
    var P = {}; (r[1] || []).forEach(function (p) { P[p.id] = p; });
    AFF.data = (r[0] || []).map(function (c) { var p = P[c.personne_id] || {}; return { nom: p.nom ? affNom(p) : c.joueur, sexe: c.sexe, niveau: c.niveau, pts: +c.points }; });
    return AFF.data;
  });
}
// Pages d'une affiche : [{ g: [...], d: [...], debut_g, debut_d }]
function affPages(a) {
  var D = AFF.data || [], M = AFF.MAX, pages = [];
  if (a.id === 'general') {
    // pages équilibrées (ex. 121 joueurs : 61 + 60 plutôt que 80 + 41)
    var np = Math.max(1, Math.ceil(D.length / (2 * M))), parPage = Math.ceil(D.length / np);
    for (var i = 0; i < D.length; i += parPage) {
      var c = D.slice(i, i + parPage), h = Math.ceil(c.length / 2);
      pages.push({ g: c.slice(0, h), d: c.slice(h), dg: i + 1, dd: i + 1 + h, de: i + 1, a: i + c.length });
    }
    return pages.length ? pages : [{ g: [], d: [], dg: 1, dd: 1 }];
  }
  var filtre = function (n) { return D.filter(function (r) { return n === 'Garçons' ? r.sexe === 'M' : n === 'Filles' ? r.sexe === 'F' : r.niveau === n; }); };
  var G = filtre(a.gauche), Dr = filtre(a.droite), n = Math.max(1, Math.ceil(Math.max(G.length, Dr.length) / M));
  var pg = Math.ceil(G.length / n) || 1, pd = Math.ceil(Dr.length / n) || 1; // pages équilibrées de chaque côté
  for (var k = 0; k < n; k++) pages.push({ g: G.slice(k * pg, (k + 1) * pg), d: Dr.slice(k * pd, (k + 1) * pd), dg: k * pg + 1, dd: k * pd + 1 });
  return pages;
}

// ---------- dessin ----------
function affRgba(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
function affRond(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function affTexte(c, t, x, y, font, couleur, align, glow) {
  c.font = font; c.fillStyle = couleur; c.textAlign = align || 'left'; c.textBaseline = 'middle';
  if (glow) { c.save(); c.shadowColor = glow; c.shadowBlur = 14; c.fillText(t, x, y); c.restore(); }
  c.fillText(t, x, y);
}
function affAjuste(c, t, poids, taille, maxw) { do { c.font = poids + ' ' + taille + 'px Inter'; taille -= 1; } while (c.measureText(t).width > maxw && taille > 8); return c.font; }

// Fond de secours (tant qu'il n'y a pas de fond GPT pour cette affiche)
function affFondSimple(c, a) {
  var W = AFF.W, H = AFF.H, cg = AFF.ACC[a.gauche], cd = AFF.ACC[a.droite];
  c.fillStyle = '#04061a'; c.fillRect(0, 0, W, H);
  [[0, cg], [W, cd]].forEach(function (s) {
    var g = c.createRadialGradient(s[0], H * 0.45, 40, s[0], H * 0.45, W * 0.75);
    g.addColorStop(0, affRgba(s[1], 0.45)); g.addColorStop(1, affRgba(s[1], 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  });
  var t = c.createLinearGradient(0, 0, 0, 240); t.addColorStop(0, 'rgba(255,255,255,.10)'); t.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = t; c.fillRect(0, 0, W, 240);
  // titres
  var titre = function (x, nom, coul, align) {
    affTexte(c, 'CLASSEMENT', x, 70, 'italic 900 34px Inter', '#fff', align, 'rgba(0,0,0,.6)');
    var t = 96; do { c.font = 'italic 900 ' + t + 'px Inter'; t -= 2; } while (c.measureText(nom.toUpperCase()).width > 340 && t > 40);
    affTexte(c, nom.toUpperCase(), x, 150, c.font, coul, align, coul);
  };
  if (a.id === 'general') { titre(56, 'Général', cg, 'left'); }
  else { titre(56, a.gauche, cg, 'left'); titre(W - 56, a.droite, cd, 'right'); }
  // panneaux
  [[AFF.BOX_L, cg], [AFF.BOX_R, cd]].forEach(function (p) {
    var b = p[0];
    c.save(); c.shadowColor = p[1]; c.shadowBlur = 22;
    affRond(c, b[0] - 8, b[1] - 8, b[2] - b[0] + 16, b[3] - b[1] + 16, 18); c.strokeStyle = p[1]; c.lineWidth = 4; c.stroke(); c.restore();
    affRond(c, b[0] - 8, b[1] - 8, b[2] - b[0] + 16, b[3] - b[1] + 16, 18); c.fillStyle = '#03061e'; c.fill();
  });
  // bandeau du bas
  c.save(); c.translate(W / 2, 1480); c.rotate(-0.012); c.fillStyle = '#000'; c.fillRect(-500, -34, 1000, 68); c.restore();
  c.font = 'italic 900 30px Inter'; c.textBaseline = 'middle'; c.textAlign = 'left';
  var a1 = 'TENNIS • PROGRESSION • PLAISIR • ', a2 = 'CLOC\'ARENA TWEENER', w1 = c.measureText(a1).width, w2 = c.measureText(a2).width, x = (W - w1 - w2) / 2;
  affTexte(c, a1, x, 1480, 'italic 900 30px Inter', '#fff', 'left');
  affTexte(c, a2, x + w1, 1480, 'italic 900 30px Inter', cg, 'left', cg);
}

function affMedaille(c, cx, cy, r, i) {
  var M = [['#ffd63c', '#be820a'], ['#e1e6ee', '#8c94a0'], ['#eb965a', '#965023']][i];
  c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fillStyle = M[1]; c.fill();
  c.beginPath(); c.arc(cx, cy, r * 0.86, 0, 7); c.fillStyle = M[0]; c.fill();
  c.beginPath(); c.ellipse(cx - r * 0.18, cy - r * 0.4, r * 0.45, r * 0.25, 0, 0, 7); c.fillStyle = 'rgba(255,255,255,.35)'; c.fill();
  affTexte(c, String(i + 1), cx, cy + r * 0.06, '900 ' + Math.round(r * 1.15) + 'px Inter', M[1], 'center');
}

function affTableau(c, b, rows, acc, debut, niveau) {
  var x0 = b[0], y0 = b[1], x1 = b[2], y1 = b[3], n = Math.max(1, rows.length);
  var head = (y1 - y0) / n > 50 ? 50 : 44, pitch = Math.min(84, (y1 - y0 - head - 14) / n), hy = y0 + 26;
  var fh = '700 ' + (pitch > 50 ? 15 : pitch > 30 ? 13 : 11.5) + 'px Inter';
  var cR = x0 + 34, cN = x0 + 66, cP = x1 - 44, cV = x1 - 130;
  affTexte(c, 'RANG', cR, hy, fh, acc, 'center');
  affTexte(c, 'JOUEUR', cN, hy, fh, '#f0f2f8', 'left');
  if (niveau) affTexte(c, 'NIVEAU', cV, hy, fh, '#f0f2f8', 'center');
  c.font = fh; var pw = c.measureText('POINTS').width + 14;
  affRond(c, cP - pw / 2, hy - 11, pw, 22, 4); c.fillStyle = acc; c.fill();
  affTexte(c, 'POINTS', cP, hy, fh, (acc === AFF.ACC.Jaune || acc === AFF.ACC.Blanc) ? '#0f0f19' : '#fff', 'center');
  c.fillStyle = acc; c.fillRect(x0 + 8, y0 + head, x1 - x0 - 16, 1.2);
  var nmax = (niveau ? cV - 46 : cP - 34) - cN;
  rows.forEach(function (r, i) {
    var cy = y0 + head + 8 + pitch * (i + 0.5), rang = debut + i;
    if (i % 2 === 0) { affRond(c, x0 + 8, cy - pitch / 2 + 1.5, x1 - x0 - 16, pitch - 3, 6); c.fillStyle = '#0e1434'; c.fill(); }
    if (rang <= 3) affMedaille(c, cR, cy, Math.min(pitch * 0.36, 22), rang - 1);
    else affTexte(c, String(rang), cR, cy, '800 ' + Math.min(pitch * 0.42, 28) + 'px Inter', '#fafafc', 'center');
    affTexte(c, r.nom, cN, cy, affAjuste(c, r.nom, 600, Math.min(pitch * 0.4, 26), nmax), '#f6f6fa', 'left');
    if (niveau && AFF.PILL[r.niveau]) {
      var ph = Math.min(pitch * 0.7, 24);
      affRond(c, cV - 36, cy - ph / 2, 72, ph, 5); c.fillStyle = AFF.PILL[r.niveau][0]; c.fill();
      affTexte(c, r.niveau, cV, cy, '700 ' + Math.min(pitch * 0.36, 13) + 'px Inter', AFF.PILL[r.niveau][1], 'center');
    }
    affTexte(c, String(r.pts), cP, cy, '800 ' + Math.min(pitch * 0.52, 34) + 'px Inter', acc, 'center', acc);
  });
}

function affDessiner(a, page, idx, total) {
  return Promise.all([a.fond ? affImage(a.fond) : null, affImage('affiches/logo-tweener.png').catch(function () { return null; }), affPolices()]).then(function (r) {
    var cv = document.createElement('canvas'); cv.width = AFF.W * AFF.K; cv.height = AFF.H * AFF.K;
    var c = cv.getContext('2d'); c.scale(AFF.K, AFF.K);
    if (r[0]) c.drawImage(r[0], 0, 0, AFF.W, AFF.H); else affFondSimple(c, a);
    var L = (r[0] && a.lay) || AFF.LAY;
    affTableau(c, L.L, page.g, L.acc || AFF.ACC[a.gauche], page.dg, a.niveau);
    affTableau(c, L.R, page.d, L.acc || AFF.ACC[a.droite], page.dd, a.niveau);
    if (r[1]) { var lw = L.logo[2], lh = lw * r[1].height / r[1].width; c.drawImage(r[1], L.logo[0] - lw / 2, L.logo[1] - lh / 2, lw, lh); }
    var d = new Date(), jour = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), suite = '';
    if (a.id === 'general' && total > 1) suite = 'du ' + page.de + (page.de === 1 ? 'er' : 'e') + ' au ' + page.a + 'e';
    else if (total > 1) suite = 'page ' + (idx + 1) + '/' + total;
    c.save(); c.shadowColor = '#000'; c.shadowBlur = 8;
    if (L.date[3] === 'bloc') { // date sur plusieurs lignes (coin de l'affiche)
      var lignes = ['Classement au', jour].concat(suite ? [suite] : []), h = L.date[2] * 1.5, y0 = L.date[1] - (lignes.length - 1) * h / 2;
      lignes.forEach(function (t, i) { affTexte(c, t, L.date[0], y0 + i * h, 'italic ' + (i === 1 ? 800 : 700) + ' ' + (i === 1 ? L.date[2] + 3 : L.date[2]) + 'px Inter', i === 2 ? (L.acc || '#fff') : '#fff', 'center'); });
    } else affTexte(c, 'Classement au ' + jour + (suite ? '  ·  ' + suite : ''), L.date[0], L.date[1], 'italic 700 ' + L.date[2] + 'px Inter', '#fff', 'center');
    c.restore();
    return cv;
  });
}

// ---------- export ----------
function affNomFichier(a, i, total) { return 'CLOCARENA_Tweener_' + a.titre.replace(/[^A-Za-zéèçÉ]+/g, '_').replace(/_+$/, '') + (total > 1 ? '_' + (i + 1) : '') + '.png'; }
function affBlob(cv, type, qual) { return new Promise(function (ok) { cv.toBlob(ok, type || 'image/png', qual); }); }
function affTelecharger(blob, nom) { var u = URL.createObjectURL(blob), l = document.createElement('a'); l.href = u; l.download = nom; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); }
function affJsPDF() {
  if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
  return new Promise(function (ok, ko) { var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'; s.onload = function () { ok(window.jspdf.jsPDF); }; s.onerror = ko; document.head.appendChild(s); });
}
// PDF : pages 280 x 420 mm (rapport de l'affiche, hauteur A3) — s'imprime en A3 sans déformation
function affPDF(toiles, nom) {
  return affJsPDF().then(function (PDF) {
    var doc = new PDF({ unit: 'mm', format: [280, 420], orientation: 'portrait' });
    toiles.forEach(function (cv, i) { if (i) doc.addPage([280, 420], 'portrait'); doc.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 280, 420); });
    doc.save(nom);
  });
}
function affPartager(toiles, a) {
  return Promise.all(toiles.map(function (cv, i) { return affBlob(cv, 'image/jpeg', 0.92).then(function (b) { return new File([b], affNomFichier(a, i, toiles.length).replace('.png', '.jpg'), { type: 'image/jpeg' }); }); })).then(function (files) {
    if (navigator.canShare && navigator.canShare({ files: files })) return navigator.share({ files: files, title: 'Classement CLOC\'ARENA ' + a.titre }).catch(function () { });
    files.forEach(function (f) { affTelecharger(f, f.name); });
    toast('Partage indisponible ici : images téléchargées');
  });
}

// Agrandir une affiche dans la page (Chrome bloque l'ouverture d'une image data: dans un nouvel onglet)
function affZoom(cv) {
  var f = document.createElement('div');
  f.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(5,8,20,.88);display:flex;align-items:center;justify-content:center;padding:16px;cursor:zoom-out';
  var im = new Image(); im.src = cv.toDataURL('image/jpeg', 0.9);
  im.style.cssText = 'max-width:100%;max-height:100%;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.6)';
  var x = document.createElement('button'); x.textContent = '×'; x.setAttribute('aria-label', 'Fermer');
  x.style.cssText = 'position:fixed;top:12px;right:16px;width:44px;height:44px;border-radius:50%;border:0;background:#fff;color:#102f4a;font-size:28px;line-height:1;cursor:pointer';
  f.appendChild(im); f.appendChild(x);
  var fermer = function () { f.remove(); document.removeEventListener('keydown', esc_); };
  var esc_ = function (e) { if (e.key === 'Escape') fermer(); };
  f.onclick = fermer; document.addEventListener('keydown', esc_);
  document.body.appendChild(f);
}

// ---------- page ----------
function arAffichesPage(box) {
  box.innerHTML = '<div class="card"><div class="skel" style="height:120px"></div></div>';
  affCharger().then(function () {
    box.innerHTML = '<div class="card stack" style="margin-bottom:12px"><b>Affiches des classements Tweener</b>' +
      '<span class="small mut">Toujours à jour : le classement est pris en direct (points + 1 point par participation ; à égalité : victoires, puis matchs, puis niveau). ' +
      'Image pour WhatsApp et les réseaux, PDF pour imprimer en A3.</span>' +
      '<div class="toolbar" style="margin:0"><button class="btn" id="aff-tout">Tout en PDF</button><span class="mut xs" id="aff-etat"></span></div></div>' +
      '<div class="pgrid" id="aff-l">' + AFF.LISTE.map(function (a) {
        return '<div class="card stack" data-aff="' + a.id + '"><b>' + esc(a.titre) + '</b><span class="mut xs">' + (a.fond ? 'Fond arène' : 'Fond simple (le fond arène arrive)') + '</span>' +
          '<div class="aff-prev" style="display:flex;gap:6px;overflow-x:auto"><div class="skel" style="height:180px;width:120px"></div></div>' +
          '<div class="toolbar" style="margin:0"><button class="btn sm" data-affi="' + a.id + '">Image</button><button class="btn sm ghost" data-affp="' + a.id + '">PDF</button><button class="btn sm ghost" data-affs="' + a.id + '">Partager</button></div></div>';
      }).join('') + '</div>';
    var toiles = {};
    var rendu = function (a) {
      if (toiles[a.id]) return toiles[a.id];
      var pages = affPages(a);
      toiles[a.id] = Promise.all(pages.map(function (p, i) { return affDessiner(a, p, i, pages.length); }));
      return toiles[a.id];
    };
    AFF.LISTE.forEach(function (a) {
      rendu(a).then(function (cvs) {
        var z = box.querySelector('[data-aff="' + a.id + '"] .aff-prev'); if (!z) return;
        z.innerHTML = '';
        cvs.forEach(function (cv) { var im = new Image(); im.src = cv.toDataURL('image/jpeg', 0.7); im.style.cssText = 'height:240px;border-radius:8px;cursor:zoom-in'; im.onclick = function () { affZoom(cv); }; z.appendChild(im); });
      }).catch(function () { var z = box.querySelector('[data-aff="' + a.id + '"] .aff-prev'); if (z) z.innerHTML = '<span class="mut small">Affiche impossible à dessiner.</span>'; });
    });
    var trouve = function (id) { return AFF.LISTE.filter(function (x) { return x.id === id; })[0]; };
    all('[data-affi]', box).forEach(function (b) { b.onclick = function () { var a = trouve(b.dataset.affi); rendu(a).then(function (cvs) { cvs.forEach(function (cv, i) { affBlob(cv).then(function (bl) { affTelecharger(bl, affNomFichier(a, i, cvs.length)); }); }); }); }; });
    all('[data-affp]', box).forEach(function (b) { b.onclick = function () { var a = trouve(b.dataset.affp); rendu(a).then(function (cvs) { return affPDF(cvs, affNomFichier(a, 0, 1).replace('.png', '.pdf')); }).catch(function () { toast('PDF impossible'); }); }; });
    all('[data-affs]', box).forEach(function (b) { b.onclick = function () { var a = trouve(b.dataset.affs); rendu(a).then(function (cvs) { return affPartager(cvs, a); }); }; });
    $('aff-tout').onclick = function () {
      $('aff-etat').textContent = 'Préparation…';
      Promise.all(AFF.LISTE.map(rendu)).then(function (l) { return affPDF([].concat.apply([], l), 'CLOCARENA_Tweener_Classements.pdf'); })
        .then(function () { $('aff-etat').textContent = ''; }).catch(function () { $('aff-etat').textContent = ''; toast('PDF impossible'); });
    };
  }).catch(function () { box.innerHTML = '<div class="card empty">Impossible de charger le classement.</div>'; });
}

window.arAffiches = function (box, o) {
  sb = o.sb; q = o.q; chargerPers = o.chargerPers; esc = o.esc; all = o.all; toast = o.toast; $ = o.$;
  return arAffichesPage(box);
};
})();
