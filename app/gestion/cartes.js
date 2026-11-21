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
var C = { joueur: null, d: null, photo: null, zoom: 1, dx: 0, dy: 0, planche: [], img: {} };
var S = {};

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
function cadrePhoto() {
  var z = Z.photo, bw = z[2] - z[0], bh = z[3] - z[1], p = C.photo;
  if (!p) return null;
  var base = Math.max(bw / p.width, bh / p.height), sc = base * C.zoom, w = p.width * sc, h = p.height * sc;
  var maxX = Math.max(0, (w - bw) / 2), maxY = Math.max(0, (h - bh) / 2);
  C.dx = Math.max(-maxX, Math.min(maxX, C.dx)); C.dy = Math.max(-maxY, Math.min(maxY, C.dy));
  return { x: z[0] + (bw - w) / 2 + C.dx, y: z[1] + (bh - h) / 2 + C.dy, w: w, h: h };
}
function dessiner(cv) {
  return Promise.all([img(trame()), img('../logo.png').catch(function () { return null; }), polices()]).then(function (r) {
    cv.width = W; cv.height = H;
    var c = cv.getContext('2d');
    c.drawImage(r[0], 0, 0, W, H);
    // photo
    var f = cadrePhoto(), z = Z.photo;
    if (f) { c.save(); rond(c, z[0], z[1], z[2] - z[0], z[3] - z[1], z[4]); c.clip(); c.drawImage(C.photo, f.x, f.y, f.w, f.h); c.restore(); }
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
      '<span class="small mut">Choisis un joueur : la trame de son niveau se charge et les stats se remplissent toutes seules (classement du jour, meilleur classement depuis la rentrée). ' +
      'Tout reste modifiable avant l\'export. Carte 63 x 88 mm : image ou PDF taille réelle, ou planche A4 de 9 cartes à découper.</span>' +
      '<label class="l">Joueur<select id="ca-j"><option value="">Choisir un joueur…</option>' + J.map(function (p) { return '<option value="' + p.id + '">' + esc(joliPrenom(p.prenom) + ' ' + String(p.nom || '').toUpperCase()) + (p.niveau_arena ? ' · ' + esc(p.niveau_arena) : '') + '</option>'; }).join('') + '</select></label></div>' +
      '<div id="ca-z" style="display:none">' +
      '<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start">' +
      '<div class="card stack" style="flex:0 1 330px;align-items:center"><canvas id="ca-cv" style="width:100%;max-width:300px;height:auto;border-radius:12px;touch-action:none;cursor:grab;box-shadow:0 6px 24px rgba(0,0,0,.25)"></canvas>' +
      '<span class="mut xs" id="ca-aide">Ajoute une photo, puis fais-la glisser sur la carte pour la placer.</span>' +
      '<div class="toolbar" style="margin:0;flex-wrap:wrap;justify-content:center"><button class="btn sm" id="ca-png">Image</button><button class="btn sm ghost" id="ca-pdf">PDF carte</button><button class="btn sm ghost" id="ca-sh">Partager</button></div>' +
      '<div class="toolbar" style="margin:0;flex-wrap:wrap;justify-content:center"><button class="btn sm ghost" id="ca-add">Ajouter à la planche</button><button class="btn sm" id="ca-pl" disabled>Planche A4 (0)</button><button class="btn sm ghost" id="ca-vide" disabled>Vider</button></div></div>' +
      '<div class="card stack" style="flex:1 1 320px">' +
      '<div class="sect">Photo</div>' +
      '<div class="toolbar" style="margin:0;flex-wrap:wrap"><button class="btn sm ghost" id="ca-pp" style="display:none">Photo du profil</button><label class="btn sm ghost" style="cursor:pointer">Prendre ou choisir une photo<input id="ca-f" type="file" accept="image/*" style="display:none"></label><button class="btn sm ghost" id="ca-px" style="display:none">Retirer</button></div>' +
      '<label class="l" id="ca-zl" style="display:none">Zoom<input id="ca-zoom" type="range" min="1" max="3" step="0.01" value="1"></label>' +
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
      champ('ca-date', 'Date de la carte', 'text', ' placeholder="jj/mm/aaaa"') +
      '<span class="mut xs" id="ca-note"></span>' +
      '</div></div></div>';

    var cv = $('ca-cv'), enCours = null;
    var rendu = function () {
      if (enCours) { enCours.encore = true; return; }
      enCours = {};
      dessiner(cv).catch(function () { toast('Trame introuvable'); }).then(function () { var e = enCours; enCours = null; if (e && e.encore) rendu(); });
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
      var a = !!C.photo; $('ca-zl').style.display = a ? '' : 'none'; $('ca-px').style.display = a ? '' : 'none';
      $('ca-aide').textContent = a ? 'Fais glisser la photo sur la carte pour la placer, et zoome si besoin.' : 'Ajoute une photo, puis fais-la glisser sur la carte pour la placer.';
    };
    var chargerPhoto = function (src) { return img(src).then(function (i) { C.photo = i; C.zoom = 1; C.dx = 0; C.dy = 0; $('ca-zoom').value = 1; majPhoto(); rendu(); }); };

    $('ca-j').onchange = function () {
      var id = this.value; if (!id) { $('ca-z').style.display = 'none'; return; }
      var p = J.filter(function (x) { return x.id === id; })[0] || {};
      C.joueur = p; C.photo = null; majPhoto();
      $('ca-note').textContent = 'Chargement des stats…';
      q(sb.rpc('arena_tweener_carte', { p: id })).then(function (d) {
        C.d = d || {};
        var niv = C.d.niveau || p.niveau_arena;
        S = {
          prenom: p.prenom || '', nom: p.nom || '', niveau: NIV.indexOf(niv) >= 0 ? niv : 'Rouge', sexe: (C.d.sexe || p.sexe) === 'F' ? 'F' : 'M',
          matchs: C.d.matchs || 0, victoires: C.d.victoires || 0, points: C.d.points || 0,
          rangGeneral: C.d.rang_general || '', rangNiveau: C.d.rang_niveau || '', rangSexe: C.d.rang_sexe || '',
          dateCarte: dateFr(C.d.jour || new Date().toISOString())
        };
        $('ca-z').style.display = '';
        $('ca-mtype').value = 'niveau'; remplir(); meilleur(); pct();
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

    // photo : profil (espace privé « photos »), appareil ou galerie
    $('ca-pp').onclick = function () {
      var p = C.joueur; if (!p || !p.photo_path) return;
      sb.storage.from('photos').download(p.photo_path).then(function (r) { if (r.error || !r.data) throw r.error; return chargerPhoto(URL.createObjectURL(r.data)); }).catch(function () { toast('Photo du profil introuvable'); });
    };
    $('ca-f').onchange = function () { var f = this.files && this.files[0]; if (f) chargerPhoto(URL.createObjectURL(f)).catch(function () { toast('Image illisible'); }); this.value = ''; };
    $('ca-px').onclick = function () { C.photo = null; majPhoto(); rendu(); };
    $('ca-zoom').oninput = function () { C.zoom = +this.value; rendu(); };
    var glisse = null;
    cv.onpointerdown = function (e) { if (!C.photo) return; glisse = { x: e.clientX, y: e.clientY, dx: C.dx, dy: C.dy }; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; };
    cv.onpointermove = function (e) { if (!glisse) return; var k = W / cv.getBoundingClientRect().width; C.dx = glisse.dx + (e.clientX - glisse.x) * k; C.dy = glisse.dy + (e.clientY - glisse.y) * k; rendu(); };
    cv.onpointerup = cv.onpointercancel = function () { glisse = null; cv.style.cursor = 'grab'; };

    // exports
    var toile = function () { var t = document.createElement('canvas'); return dessiner(t); };
    var majPlanche = function () { var n = C.planche.length; $('ca-pl').textContent = 'Planche A4 (' + n + ')'; $('ca-pl').disabled = !n; $('ca-vide').disabled = !n; };
    $('ca-png').onclick = function () { toile().then(function (t) { return blob(t); }).then(function (b) { telecharger(b, nomFichier('png')); }); };
    $('ca-pdf').onclick = function () {
      Promise.all([toile(), jsPDF()]).then(function (r) { var doc = new r[1]({ unit: 'mm', format: [63, 88], orientation: 'portrait' }); doc.addImage(r[0].toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 63, 88); doc.save(nomFichier('pdf')); }).catch(function () { toast('PDF impossible'); });
    };
    $('ca-sh').onclick = function () {
      toile().then(function (t) { return blob(t, 'image/jpeg', 0.92); }).then(function (b) {
        var f = new File([b], nomFichier('jpg'), { type: 'image/jpeg' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: 'Carte CLOC\'ARENA Tweener' }).catch(function () { });
        telecharger(f, f.name); toast('Partage indisponible ici : image téléchargée');
      });
    };
    $('ca-add').onclick = function () { toile().then(function (t) { C.planche.push(t.toDataURL('image/jpeg', 0.95)); majPlanche(); toast('Carte ajoutée à la planche (' + C.planche.length + ')'); }); };
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
