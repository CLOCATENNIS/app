// Challenge Week CLOC'ARENA Tweener (Gestion → CLOC'ARENA → Tweener → Challenge Week)
// admin.js est dans une fonction fermée : il passe ses outils (sb, q, chargerPers…) à window.arChallenge(box, outils).
// Calculs (paliers, records, classements, tirage des équipes) : ../challenge-moteur.js, partagé avec l'appli des familles.
(function () {
'use strict';
var sb, q, chargerPers, esc, all, toast, $;
var M = function () { return window.ChallengeMoteur; };
var PILL = { Vert: ['#18be56', '#fff'], Violet: ['#7c3ce6', '#fff'], Rouge: ['#e82c38', '#fff'], Orange: ['#f58028', '#fff'], Jaune: ['#ffdc14', '#141414'], Blanc: ['#ececee', '#19191e'] };
var COACH = false;
var CH = { c: null, essais: [], pers: {}, onglet: 'seance', jour: null, defi: null, nivCl: null, nivRg: 'tous', brouillon: {} };

function pill(n) { var c = PILL[n] || ['#ddd', '#222']; return '<span class="badge" style="background:' + c[0] + ';color:' + c[1] + '">' + esc(n) + '</span>'; }
function nom(pid) { var p = CH.pers[pid]; return p ? (p.prenom + ' ' + (p.nom ? p.nom.charAt(0).toUpperCase() + '.' : '')).trim() : '?'; }
function noms(l) { return (l || []).map(nom).join(' / '); }
function niv(pid) { var p = CH.pers[pid]; return p ? p.niveau_arena : null; }
function defi(k) { return (CH.c.defis || []).filter(function (d) { return d.k === k; })[0]; }
function defisActifs() { return (CH.c.defis || []).filter(function (d) { return d.actif !== false; }); }
function seance() { return (CH.c.seances || []).filter(function (s) { return s.jour === CH.jour; })[0] || {}; }
function jourTxt(j) { return new Date(j + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); }
function E() { var e = CH.c.equipes || (CH.c.equipes = {}); return e[CH.jour] || (e[CH.jour] = { presents: null, equipes: [] }); }
function nombre(v) { v = String(v == null ? '' : v).trim().replace(',', '.'); if (v === '') return null; var n = +v; return isNaN(n) || n < 0 ? null : n; }
function err(t) { return function (e) { toast(t + (e && e.message ? ' : ' + e.message : '')); }; }

function sauverEquipes() {
  return q(sb.rpc('challenge_equipes_maj', { p_id: CH.c.id, p_jour: CH.jour, p_val: E() })).catch(err('Pas enregistré'));
}

function charger() {
  return Promise.all([
    q(sb.from('arena_challenges').select('*').eq('archive', false).order('cree_le', { ascending: false }).limit(1)),
    chargerPers()
  ]).then(function (r) {
    CH.c = (r[0] || [])[0] || null;
    CH.pers = {}; (r[1] || []).forEach(function (p) { CH.pers[p.id] = p; });
    if (!CH.c) return;
    if (!CH.jour || !seance().jour) {
      var auj = new Date(), iso = auj.getFullYear() + '-' + ('0' + (auj.getMonth() + 1)).slice(-2) + '-' + ('0' + auj.getDate()).slice(-2);
      var l = (CH.c.seances || []).map(function (s) { return s.jour; });
      CH.jour = l.filter(function (j) { return j >= iso; })[0] || l[l.length - 1] || iso;
    }
    if (!CH.defi || !defi(CH.defi)) CH.defi = (defisActifs()[0] || {}).k;
    return q(sb.from('arena_challenge_essais').select('*').eq('challenge_id', CH.c.id).order('cree_le', { ascending: false })).then(function (l) { CH.essais = l || []; });
  });
}

function vue(box) {
  CH.box = box;
  if (!M()) { box.innerHTML = '<div class="card empty">Le module Challenge n\'a pas pu se charger. Recharge la page.</div>'; return; }
  if (!CH.c) { box.innerHTML = '<div class="card empty">Aucune Challenge Week en cours.</div>'; return; }
  var ong = [['seance', 'Présents et équipes'], ['saisie', 'Saisir les résultats'], ['classements', 'Records et classements']].concat(COACH ? [] : [['reglages', 'Défis et paliers']]);
  if (COACH && CH.onglet === 'reglages') CH.onglet = 'seance';
  box.innerHTML = '<div class="card" style="margin-bottom:12px;padding:12px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b style="font-size:17px">🏆 ' + esc(CH.c.titre) + '</b>' +
    '<span class="badge" style="background:' + (CH.c.en_ligne ? 'var(--ok);color:#fff' : 'var(--sun)') + '">' + (CH.c.en_ligne ? 'Visible dans l\'appli' : 'Pas encore visible dans l\'appli') + '</span>' +
    (COACH ? '' : '<button class="btn sm ' + (CH.c.en_ligne ? 'line' : 'ok') + '" id="ch-ligne" style="margin-left:auto">' + (CH.c.en_ligne ? 'Masquer de l\'appli' : 'Afficher dans l\'appli') + '</button>') + '</div>' +
    '<div class="chips" style="margin-bottom:10px">' + (CH.c.seances || []).map(function (s) {
      return '<button class="chip' + (s.jour === CH.jour ? ' on' : '') + '" data-chj="' + s.jour + '">' + esc(jourTxt(s.jour)) + ' · ' + esc(M().ordreNiveaux(s.niveaux || []).join(', ')) + '</button>';
    }).join('') + '</div>' +
    '<div class="chips" style="margin-bottom:14px">' + ong.map(function (o) { return '<button class="chip' + (CH.onglet === o[0] ? ' on' : '') + '" data-cho="' + o[0] + '" style="font-weight:600">' + o[1] + '</button>'; }).join('') + '</div>' +
    '<div id="ch-c"></div>';
  if ($('ch-ligne')) $('ch-ligne').onclick = function () {
    var v = !CH.c.en_ligne;
    q(sb.from('arena_challenges').update({ en_ligne: v }).eq('id', CH.c.id)).then(function () { CH.c.en_ligne = v; toast(v ? 'La Challenge Week est visible dans l\'appli (CLOC\'ARENA › Tweener › Challenge)' : 'Challenge Week masquée de l\'appli'); vue(box); }).catch(err('Action impossible'));
  };
  all('[data-chj]', box).forEach(function (b) { b.onclick = function () { CH.jour = b.dataset.chj; vue(box); }; });
  all('[data-cho]', box).forEach(function (b) { b.onclick = function () { CH.onglet = b.dataset.cho; vue(box); }; });
  var c = $('ch-c');
  if (CH.onglet === 'saisie') saisie(c); else if (CH.onglet === 'classements') classements(c); else if (CH.onglet === 'reglages') reglages(c); else presents(c);
}

// ---------- Présents et équipes ----------
function presents(c) {
  var S = seance(), e = E(), nivs = M().ordreNiveaux(S.niveaux || []);
  var go = function () {
    var pres = e.presents || [];
    var liste = Object.keys(CH.pers).map(function (k) { return CH.pers[k]; }).filter(function (p) { return p.actif !== false && p.arena_id && (nivs.indexOf(p.niveau_arena) >= 0 || pres.indexOf(p.id) >= 0); })
      .sort(function (a, b) { return M().NIVEAUX.indexOf(a.niveau_arena) - M().NIVEAUX.indexOf(b.niveau_arena) || String(a.prenom).localeCompare(b.prenom, 'fr'); });
    var h = '<div class="two" style="align-items:start"><div class="card stack"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>Présents · ' + pres.length + '</b><span class="mut xs">Coche les joueurs présents</span></div>' +
      '<input class="f" id="ch-rech" placeholder="Ajouter un joueur d\'un autre niveau (prénom)…">' + '<div id="ch-rech-r" class="chips"></div>' +
      nivs.concat(liste.map(function (p) { return p.niveau_arena; }).filter(function (n, i, l) { return nivs.indexOf(n) < 0 && l.indexOf(n) === i; })).map(function (n) {
        var l = liste.filter(function (p) { return p.niveau_arena === n; });
        var np = l.filter(function (p) { return pres.indexOf(p.id) >= 0; }).length;
        return '<div class="sect" style="margin:6px 0 0;display:flex;gap:8px;align-items:center">' + pill(n) + ' ' + np + ' présent' + (np > 1 ? 's' : '') + '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:2px 10px">' + l.map(function (p) {
            return '<label class="c"><input type="checkbox" data-chp="' + p.id + '"' + (pres.indexOf(p.id) >= 0 ? ' checked' : '') + '> ' + esc(p.prenom + ' ' + (p.nom || '').charAt(0) + '.') + '</label>';
          }).join('') + '</div>';
      }).join('') + '</div>' +
      '<div class="card stack" style="gap:8px"><b>🎲 Les équipes</b><span class="small">Elles sont tirées au sort <b>à chaque nouveau défi</b>, dans « Saisir les résultats » : même niveau dans chaque équipe, binômes, et un trio si le nombre est impair. Tu peux refaire le tirage ou déplacer un joueur à tout moment, sans toucher aux résultats déjà saisis.</span>' +
      '<button class="btn sm" id="ch-vers-saisie" style="align-self:flex-start">Aller à la saisie →</button>';
    c.innerHTML = h + '</div></div>';
    all('[data-chp]', c).forEach(function (i) { i.onchange = function () { basculer(i.dataset.chp, i.checked); go(); }; });
    $('ch-vers-saisie').onclick = function () { CH.onglet = 'saisie'; vue(CH.box); };
    var rech = $('ch-rech');
    rech.oninput = function () {
      var t = rech.value.trim().toLowerCase(); var r = $('ch-rech-r');
      if (t.length < 2) { r.innerHTML = ''; return; }
      var l = Object.keys(CH.pers).map(function (k) { return CH.pers[k]; }).filter(function (p) { return p.actif !== false && p.niveau_arena && (e.presents || []).indexOf(p.id) < 0 && (p.prenom + ' ' + (p.nom || '')).toLowerCase().indexOf(t) >= 0; }).slice(0, 8);
      r.innerHTML = l.map(function (p) { return '<button class="chip" data-chadd="' + p.id + '">+ ' + esc(p.prenom + ' ' + (p.nom || '')) + ' · ' + esc(p.niveau_arena) + '</button>'; }).join('') || '<span class="mut xs">Personne avec un niveau CLOC\'ARENA ne correspond.</span>';
      all('[data-chadd]', r).forEach(function (b) { b.onclick = function () { basculer(b.dataset.chadd, true); go(); }; });
    };
  };
  if (e.presents == null && S.evenement_id) {
    c.innerHTML = '<div class="skel"></div>';
    q(sb.rpc('challenge_joueurs', { p_evenement: S.evenement_id })).catch(function () { return []; }).then(function (l) {
      if (e.presents == null) e.presents = (l || []).filter(function (x) { return x.oui; }).map(function (x) { return x.id; });
      go();
    });
  } else { if (e.presents == null) e.presents = []; go(); }
}
// Équipes du défi en cours : tirées au sort à la première ouverture de chaque défi (défi en solo : un joueur par carte)
function parNiv(a, b) { return M().NIVEAUX.indexOf(niv(a)) - M().NIVEAUX.indexOf(niv(b)) || String(nom(a)).localeCompare(nom(b), 'fr'); }
function EQS() {
  var e = E(), d = defi(CH.defi), pres = e.presents || []; e.defis = e.defis || {};
  if (!d) return [];
  if (d.mode === 'solo') return pres.slice().sort(parNiv).map(function (p) { return { k: 'j' + p, niveau: niv(p), joueurs: [p], solo: true }; });
  if (!e.defis[d.k] && pres.length) { e.defis[d.k] = M().tirer(pres, niv); sauverEquipes(); }
  return e.defis[d.k] || [];
}
function depl(pid, k, eqs) {
  return '<select class="f" data-chdep="' + pid + '" style="width:auto;min-height:32px;padding:2px 6px;font-size:12px"><option value="">Déplacer…</option>' +
    eqs.filter(function (x) { return x.k !== k; }).map(function (x) { return '<option value="' + x.k + '">→ ' + esc(noms(x.joueurs)) + '</option>'; }).join('') +
    '<option value="+">→ Nouvelle équipe</option>' + (k ? '<option value="-">Sortir de l\'équipe</option>' : '') + '</select>';
}
function basculer(pid, oui) {
  var e = E(); e.presents = e.presents || [];
  var i = e.presents.indexOf(pid);
  if (oui && i < 0) e.presents.push(pid);
  if (!oui) { if (i >= 0) e.presents.splice(i, 1); retirer(pid); }
  sauverEquipes();
}
function sortir(l, pid) { (l || []).forEach(function (x) { x.joueurs = x.joueurs.filter(function (p) { return p !== pid; }); }); return (l || []).filter(function (x) { return x.joueurs.length; }); }
function retirer(pid) { // un absent sort de toutes les équipes de la séance
  var e = E(); e.defis = e.defis || {};
  e.equipes = sortir(e.equipes, pid);
  Object.keys(e.defis).forEach(function (k) { e.defis[k] = sortir(e.defis[k], pid); });
}
function deplacer(pid, cible) { // dans les équipes du défi en cours
  if (!cible) return;
  var e = E(), k = CH.defi; e.defis = e.defis || {};
  var l = sortir(e.defis[k], pid);
  if (cible === '+') l.push({ k: M().cle(), niveau: niv(pid), joueurs: [pid] });
  else if (cible !== '-') l.forEach(function (x) { if (x.k === cible) x.joueurs.push(pid); });
  l.sort(function (a, b) { return M().NIVEAUX.indexOf(a.niveau) - M().NIVEAUX.indexOf(b.niveau); });
  e.defis[k] = l; sauverEquipes();
}

// ---------- Saisie des résultats ----------
function meilleur(d, n, filtre) {
  var b = null;
  CH.essais.forEach(function (x) { if (!x.annule && x.defi === d.k && x.niveau === n && filtre(x) && (b == null || M().mieux(d, +x.resultat, b))) b = +x.resultat; });
  return b;
}
function saisie(c) {
  var e = E(), d = defi(CH.defi);
  var h = '<div class="chips" style="margin-bottom:10px">' + defisActifs().map(function (x) { return '<button class="chip' + (x.k === CH.defi ? ' on' : '') + '" data-chd="' + x.k + '">' + esc(x.nom) + '</button>'; }).join('') + '</div>';
  if (!d) { c.innerHTML = h + '<div class="card empty">Aucun défi actif.</div>'; lier(c); return; }
  var eqs = EQS(), solo = d.mode === 'solo';
  var nivs = M().ordreNiveaux(eqs.map(function (x) { return x.niveau; }).filter(function (n, i, l) { return l.indexOf(n) === i; }));
  h += '<div class="card small" style="margin-bottom:10px;padding:10px 14px"><b>' + esc(d.nom) + '</b> · ' + (d.mode === 'duo' ? 'score de chaque joueur, le meilleur compte pour le duo' : d.mode === 'equipe' ? 'un score pour l\'équipe' : 'un score par joueur') + (M().chrono(d) ? ' · <b>chrono en secondes</b> (ex. 32,5)' : '') + '<div class="mut xs" style="margin-top:4px">' + esc(d.consigne || '') + '</div>' +
    nivs.filter(function (n) { return d.consignes && d.consignes[n]; }).map(function (n) { return '<div class="xs" style="margin-top:3px">' + pill(n) + ' ' + esc(d.consignes[n]) + '</div>'; }).join('') + '</div>';
  if (!(e.presents || []).length) h += '<div class="card empty">Coche d\'abord les présents dans « Présents et équipes ».</div>';
  else if (!solo) {
    var dans = {}; eqs.forEach(function (x) { x.joueurs.forEach(function (p) { dans[p] = 1; }); });
    var sans = (e.presents || []).filter(function (p) { return !dans[p]; });
    h += '<div class="card stack" style="gap:8px;margin-bottom:10px;padding:10px 14px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b class="small" style="flex:1">🎲 Équipes tirées au sort pour ce défi</b><button class="btn sm" id="ch-retirage">Nouveau tirage</button><button class="btn sm line" id="ch-modif">' + (CH.modif ? 'Fermer' : 'Modifier les équipes') + '</button></div>';
    if (CH.modif) {
      nivs.forEach(function (n) {
        var l = eqs.filter(function (x) { return x.niveau === n; });
        h += '<div class="sect" style="margin:6px 0 0;display:flex;gap:8px;align-items:center">' + pill(n) + '<button class="btn sm line" data-chre="' + esc(n) + '" style="margin-left:auto">🎲 Retirer les ' + esc(n) + '</button></div>' +
          l.map(function (x, i) { return '<div style="border:1px solid ' + (x.joueurs.length === 1 ? 'var(--warn)' : 'var(--bd)') + ';border-radius:12px;padding:6px 10px"><b class="xs">Équipe ' + (i + 1) + (x.joueurs.length === 1 ? ' · ⚠ joueur seul dans son niveau' : '') + '</b>' + x.joueurs.map(function (p) { return '<div style="display:flex;gap:8px;align-items:center"><span class="small" style="flex:1">' + esc(nom(p)) + '</span>' + depl(p, x.k, l) + '</div>'; }).join('') + '</div>'; }).join('');
      });
    }
    if (sans.length) h += '<div class="xs" style="color:var(--warn);font-weight:700">Arrivés après le tirage :</div>' + sans.map(function (p) { return '<div style="display:flex;gap:8px;align-items:center"><span class="small" style="flex:1">' + esc(nom(p)) + ' ' + pill(niv(p) || '?') + '</span>' + depl(p, '', eqs.filter(function (x) { return x.niveau === niv(p); })) + '</div>'; }).join('');
    h += '</div>';
  }
  nivs.forEach(function (n) {
    var rec = meilleur(d, n, function () { return true; });
    h += '<div class="sect" style="display:flex;gap:8px;align-items:center">' + pill(n) + (rec != null ? '<span class="xs" style="text-transform:none;letter-spacing:0">Record du niveau : <b>' + esc(M().fmt(d, rec)) + '</b></span>' : '') + '</div><div class="hub" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">';
    eqs.filter(function (x) { return x.niveau === n; }).forEach(function (x, i) {
      var cle = x.joueurs.slice().sort().join('+');
      var bEq = meilleur(d, n, function (es) { return es.joueurs.slice().sort().join('+') === cle || (d.mode === 'solo' && x.joueurs.indexOf(es.joueurs[0]) >= 0); });
      h += '<div class="card stack" style="gap:8px;padding:12px"><div style="display:flex;justify-content:space-between;gap:6px"><b class="small">' + (x.solo ? esc(nom(x.joueurs[0])) : 'Équipe ' + (i + 1) + (x.joueurs.length === 1 ? ' · ⚠ seul' : '')) + '</b>' + (bEq != null ? '<span class="xs mut">Meilleur : <b style="color:var(--tx)">' + esc(M().fmt(d, bEq)) + '</b> · ' + M().points(d, n, bEq) + ' pt' + (M().points(d, n, bEq) > 1 ? 's' : '') + '</span>' : '') + '</div>';
      if (d.mode === 'equipe') {
        h += '<div class="chips">' + x.joueurs.map(function (p) { return '<label class="chip on" style="cursor:pointer"><input type="checkbox" data-chact="' + x.k + '" value="' + p + '" checked style="display:none">' + esc(nom(p)) + '</label>'; }).join('') + '</div>' +
          '<div style="display:flex;gap:8px"><input class="f" data-chv="' + x.k + '" inputmode="' + (M().chrono(d) ? 'decimal' : 'numeric') + '" placeholder="' + (M().chrono(d) ? 'Temps (s)' : 'Score') + '" style="font-size:18px;text-align:center"><button class="btn ok" data-chok="' + x.k + '">OK</button></div>';
      } else {
        h += x.joueurs.map(function (p) {
          var bj = d.mode === 'solo' ? meilleur(d, n, function (es) { return es.joueurs.length === 1 && es.joueurs[0] === p; }) : null;
          return '<div style="display:flex;gap:8px;align-items:center"><span class="small" style="flex:1">' + (x.solo ? 'Score' : esc(nom(p))) + (bj != null ? ' <span class="xs mut">(' + esc(M().fmt(d, bj)) + ')</span>' : '') + '</span><input class="f" data-chv="' + x.k + '" data-pid="' + p + '" inputmode="' + (M().chrono(d) ? 'decimal' : 'numeric') + '" placeholder="' + (M().chrono(d) ? 's' : '—') + '" style="width:90px;font-size:18px;text-align:center"></div>';
        }).join('') + '<button class="btn ok" data-chok="' + x.k + '">' + (x.solo ? 'Valider' : 'Valider la tentative') + '</button>';
      }
      h += '</div>';
    });
    h += '</div>';
  });
  var der = CH.essais.filter(function (x) { return !x.annule && x.jour === CH.jour; }).slice(0, 15);
  h += '<div class="sect">Dernières tentatives de la séance</div><div class="card tight" style="padding:6px 12px">' + (der.length ? der.map(function (x) {
    var dd = defi(x.defi) || { nom: x.defi };
    return '<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)"><span class="xs mut" style="width:42px">' + new Date(x.cree_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + '</span><span class="small" style="flex:1"><b>' + esc(dd.nom) + '</b> · ' + esc(noms(x.joueurs)) + ' ' + pill(x.niveau) + '</span><b>' + esc(M().fmt(dd, x.resultat)) + '</b><span class="xs mut">' + M().points(dd, x.niveau, +x.resultat) + ' pts</span><button class="btn sm ko" data-chann="' + x.id + '">Annuler</button></div>';
  }).join('') : '<div class="empty small">Rien de saisi pour l\'instant.</div>') + '</div>';
  c.innerHTML = h; lier(c);
  if ($('ch-retirage')) $('ch-retirage').onclick = function () { if (!confirm('Refaire le tirage au sort des équipes pour ce défi ?')) return; E().defis[CH.defi] = M().tirer(E().presents || [], niv); sauverEquipes(); toast('Nouvelles équipes tirées au sort'); saisie(c); };
  if ($('ch-modif')) $('ch-modif').onclick = function () { CH.modif = !CH.modif; saisie(c); };
  all('[data-chdep]', c).forEach(function (sl) { sl.onchange = function () { deplacer(sl.dataset.chdep, sl.value); saisie(c); }; });
  all('[data-chre]', c).forEach(function (b) { b.onclick = function () {
    var n = b.dataset.chre, l = E().defis[CH.defi] || [];
    E().defis[CH.defi] = l.filter(function (x) { return x.niveau !== n; }).concat(M().tirer((E().presents || []).filter(function (p) { return niv(p) === n; }), niv, n)).sort(function (a, b2) { return M().NIVEAUX.indexOf(a.niveau) - M().NIVEAUX.indexOf(b2.niveau); });
    sauverEquipes(); toast('Équipes ' + n + ' retirées au sort'); saisie(c);
  }; });
  all('[data-chact]', c).forEach(function (i) { i.onchange = function () { i.parentNode.classList.toggle('on', i.checked); }; });
  all('[data-chok]', c).forEach(function (b) { b.onclick = function () { valider(c, b.dataset.chok, b); }; });
  all('[data-chv]', c).forEach(function (i) { i.onkeydown = function (ev) { if (ev.key === 'Enter') { var b = c.querySelector('[data-chok="' + i.dataset.chv + '"]'); if (b) b.click(); } }; });
  all('[data-chann]', c).forEach(function (b) { b.onclick = function () {
    if (!confirm('Annuler cette tentative ?')) return;
    q(sb.from('arena_challenge_essais').update({ annule: true }).eq('id', b.dataset.chann)).then(function () { CH.essais.forEach(function (x) { if (x.id === b.dataset.chann) x.annule = true; }); toast('Tentative annulée'); saisie(c); }).catch(err('Annulation impossible'));
  }; });
}
function lier(c) { all('[data-chd]', c).forEach(function (b) { b.onclick = function () { CH.defi = b.dataset.chd; CH.modif = false; saisie(c); }; }); }
function valider(c, k, btn) {
  var d = defi(CH.defi), x = EQS().filter(function (y) { return y.k === k; })[0]; if (!d || !x) return;
  var lignes = [];
  if (d.mode === 'equipe') {
    var v = nombre((c.querySelector('[data-chv="' + k + '"]') || {}).value);
    var act = all('[data-chact="' + k + '"]', c).filter(function (i) { return i.checked; }).map(function (i) { return i.value; });
    if (v == null) return toast('Indique le score');
    if (!act.length) return toast('Coche au moins un joueur');
    lignes.push({ joueurs: act, scores: {}, resultat: v });
  } else {
    var sc = {};
    all('[data-chv="' + k + '"]', c).forEach(function (i) { var n = nombre(i.value); if (n != null) sc[i.dataset.pid] = n; });
    var ids = Object.keys(sc);
    if (!ids.length) return toast('Indique au moins un score');
    if (d.mode === 'duo') {
      var best = null; ids.forEach(function (p) { if (best == null || M().mieux(d, sc[p], best)) best = sc[p]; });
      lignes.push({ joueurs: ids, scores: sc, resultat: best });
    } else ids.forEach(function (p) { var o = {}; o[p] = sc[p]; lignes.push({ joueurs: [p], scores: o, resultat: sc[p] }); });
  }
  var rows = lignes.map(function (l) { return { challenge_id: CH.c.id, jour: CH.jour, defi: d.k, niveau: x.niveau, joueurs: l.joueurs, scores: l.scores, resultat: l.resultat }; });
  btn.disabled = true;
  q(sb.from('arena_challenge_essais').insert(rows).select('*')).then(function (l) {
    CH.essais = (l || []).concat(CH.essais);
    toast(rows.map(function (r) { return (d.mode === 'solo' ? nom(r.joueurs[0]) + ' : ' : '') + M().fmt(d, r.resultat) + ' → ' + M().points(d, x.niveau, r.resultat) + ' pts'; }).join(' · '));
    saisie(c);
  }).catch(function (e) { btn.disabled = false; err('Pas enregistré')(e); });
}

// ---------- Records et classements ----------
function classements(c) {
  var R = M().calcul(defisActifs(), CH.essais.filter(function (x) { return !x.annule; }));
  var nivs = M().ordreNiveaux(Object.keys(R.classement));
  if (!nivs.length) { c.innerHTML = '<div class="card empty">Pas encore de résultat.</div>'; return; }
  if (nivs.indexOf(CH.nivCl) < 0) CH.nivCl = nivs[0];
  var n = CH.nivCl, cl = R.classement[n] || [];
  var h = '<div class="chips" style="margin-bottom:12px">' + nivs.map(function (x) { return '<button class="chip' + (x === n ? ' on' : '') + '" data-chn="' + x + '">' + esc(x) + '</button>'; }).join('') + '</div>';
  h += '<div class="card" style="margin-bottom:12px"><b>Classement aux points · ' + esc(n) + '</b>' + cl.map(function (x) {
    return '<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)"><span style="width:26px;font-weight:700">' + (x.rang === 1 ? '🥇' : x.rang === 2 ? '🥈' : x.rang === 3 ? '🥉' : x.rang) + '</span><div style="flex:1;min-width:0"><b class="small">' + esc(nom(x.pid)) + '</b><div class="xs mut">' +
      defisActifs().filter(function (d) { return x.detail[d.k]; }).map(function (d) { var v = x.detail[d.k]; return esc(d.nom.split(' ')[0]) + ' ' + esc(M().fmt(d, v.val)) + ' (' + v.pts + ')'; }).join(' · ') + '</div></div><b style="font-size:18px">' + x.points + '</b><span class="xs mut">pts</span></div>';
  }).join('') + '</div>';
  h += '<div class="hub">' + defisActifs().map(function (d) {
    var l = ((R.records[d.k] || {})[n] || []).slice(0, 8);
    return '<div class="card stack" style="gap:6px"><b>' + esc(d.nom) + '</b>' + (l.length ? l.map(function (r) { return '<div style="display:flex;gap:8px" class="small"><span style="width:22px">' + (r.rang === 1 ? '🥇' : r.rang === 2 ? '🥈' : r.rang === 3 ? '🥉' : r.rang) + '</span><span style="flex:1">' + esc(noms(r.joueurs)) + '</span><b>' + esc(M().fmt(d, r.resultat)) + '</b></div>'; }).join('') : '<span class="mut small">Pas encore de record.</span>') + '</div>';
  }).join('') + '</div>';
  c.innerHTML = h;
  all('[data-chn]', c).forEach(function (b) { b.onclick = function () { CH.nivCl = b.dataset.chn; classements(c); }; });
}

// ---------- Défis et paliers ----------
function reglages(c) {
  var D = JSON.parse(JSON.stringify(CH.c.defis || [])), nr = CH.nivRg;
  var h = '<div class="card stack" style="margin-bottom:12px"><label class="l">Nom affiché<input class="f" id="ch-titre" value="' + esc(CH.c.titre) + '"></label>' +
    '<div class="sect" style="margin:0">Paliers de points</div><span class="mut xs">Un joueur marque les points du palier le plus haut atteint (le chrono doit être inférieur ou égal pour l\'étoile). Les paliers « Tous niveaux » servent quand un niveau n\'a pas les siens. Changer un palier recalcule tout le classement.</span>' +
    '<div class="chips">' + ['tous'].concat(M().NIVEAUX).map(function (x) { return '<button class="chip' + (x === nr ? ' on' : '') + '" data-chrn="' + x + '">' + (x === 'tous' ? 'Tous niveaux' : esc(x)) + '</button>'; }).join('') + '</div></div><div class="hub">';
  D.forEach(function (d, i) {
    var s = (d.seuils || {})[nr], propre = !!(s && s.length), aff = propre ? s : (nr === 'tous' ? [] : ((d.seuils || {}).tous || []));
    var lignes = aff.concat([['', ''], ['', '']]).slice(0, Math.max(aff.length + 1, 5));
    h += '<div class="card stack" style="gap:8px"><div style="display:flex;gap:8px;align-items:center"><input class="f" data-chnom="' + i + '" value="' + esc(d.nom) + '" style="font-weight:700"><label class="c xs"><input type="checkbox" data-chactif="' + i + '"' + (d.actif !== false ? ' checked' : '') + '> actif</label></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label class="l">Saisie<select class="f" data-chmode="' + i + '">' + [['duo', 'Binôme (meilleur des deux)'], ['equipe', 'Un score par équipe'], ['solo', 'Un score par joueur']].map(function (o) { return '<option value="' + o[0] + '"' + (d.mode === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
      '<label class="l">Mesure<select class="f" data-chun="' + i + '"><option value="nb"' + (d.unite !== 'sec' ? ' selected' : '') + '>Nombre (plus = mieux)</option><option value="sec"' + (d.unite === 'sec' ? ' selected' : '') + '>Chrono (moins = mieux)</option></select></label></div>' +
      '<label class="l">Consigne<textarea class="f" data-chcons="' + i + '" style="min-height:60px">' + esc(d.consigne || '') + '</textarea></label>' +
      '<div class="xs mut">' + (nr === 'tous' ? 'Paliers tous niveaux' : propre ? 'Paliers propres au niveau ' + esc(nr) : 'Le niveau ' + esc(nr) + ' utilise les paliers « Tous niveaux » (modifie une case pour lui en donner des propres)') + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 8px"><span class="xs mut">' + (d.unite === 'sec' ? 'Chrono max (s)' : 'Score mini') + '</span><span class="xs mut">Points</span>' +
      lignes.map(function (l, j) { return '<input class="f" data-chs="' + i + '-' + j + '-0" value="' + esc(l[0]) + '" inputmode="decimal" style="min-height:34px"><input class="f" data-chs="' + i + '-' + j + '-1" value="' + esc(l[1]) + '" inputmode="decimal" style="min-height:34px">'; }).join('') + '</div>' +
      (nr !== 'tous' && propre ? '<button class="btn sm line" data-chraz="' + i + '">Revenir aux paliers tous niveaux</button>' : '') + '</div>';
  });
  h += '</div><div style="position:sticky;bottom:10px;margin-top:12px;display:flex;justify-content:flex-end"><button class="btn" id="ch-sauver">Enregistrer les défis et paliers</button></div>';
  c.innerHTML = h;
  var lire = function () {
    D.forEach(function (d, i) {
      d.nom = c.querySelector('[data-chnom="' + i + '"]').value.trim() || d.nom;
      d.actif = c.querySelector('[data-chactif="' + i + '"]').checked;
      d.mode = c.querySelector('[data-chmode="' + i + '"]').value;
      d.unite = c.querySelector('[data-chun="' + i + '"]').value;
      d.consigne = c.querySelector('[data-chcons="' + i + '"]').value.trim();
      var l = [], touche = false, j = 0, a;
      while ((a = c.querySelector('[data-chs="' + i + '-' + j + '-0"]'))) {
        var b = c.querySelector('[data-chs="' + i + '-' + j + '-1"]');
        if (a.dataset.mod || b.dataset.mod) touche = true;
        var v = nombre(a.value), p = nombre(b.value);
        if (v != null && p != null) l.push([v, p]);
        j++;
      }
      d.seuils = d.seuils || {};
      if (nr === 'tous' || touche || (d.seuils[nr] && d.seuils[nr].length)) d.seuils[nr] = l.sort(function (x, y) { return x[1] - y[1]; });
    });
  };
  all('[data-chs]', c).forEach(function (i) { i.oninput = function () { i.dataset.mod = '1'; }; });
  all('[data-chrn]', c).forEach(function (b) { b.onclick = function () { CH.nivRg = b.dataset.chrn; reglages(c); }; });
  all('[data-chraz]', c).forEach(function (b) { b.onclick = function () { var d = CH.c.defis[+b.dataset.chraz]; if (d.seuils) delete d.seuils[nr]; q(sb.from('arena_challenges').update({ defis: CH.c.defis }).eq('id', CH.c.id)).then(function () { toast('Paliers tous niveaux rétablis'); reglages(c); }).catch(err('Pas enregistré')); }; });
  $('ch-sauver').onclick = function () {
    lire();
    var t = $('ch-titre').value.trim() || CH.c.titre;
    q(sb.from('arena_challenges').update({ defis: D, titre: t }).eq('id', CH.c.id)).then(function () { CH.c.defis = D; CH.c.titre = t; toast('Défis et paliers enregistrés'); reglages(c); }).catch(err('Pas enregistré'));
  };
}

var CSS_APPLI = '.chw .stack{gap:10px}.chw .chips{flex-wrap:wrap;overflow:visible}.chw .hub{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}' +
  '.chw .two{display:grid;gap:12px}@media(min-width:900px){.chw .two{grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)}}' +
  '.chw .sect{font-size:12px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--mut);margin:18px 0 8px}' +
  '.chw label.c{display:flex;gap:8px;align-items:center;font-size:14px;min-height:34px}.chw label.c input{width:20px;height:20px}' +
  '.chw .btn.sm{display:inline-flex;min-height:36px;padding:0 12px;font-size:13px;border-radius:10px}.chw .btn.ok{background:var(--ok)}' +
  '.chw .btn.ko{background:transparent;color:var(--ko);border:1px solid var(--bd)}.chw input.f{min-height:44px}.chw select.f{min-height:34px}';
window.arChallenge = function (box, o) {
  sb = o.sb; q = o.q; chargerPers = o.chargerPers; esc = o.esc; all = o.all; toast = o.toast; $ = o.$;
  COACH = !!o.coach;
  if (COACH) {
    box.classList.add('chw');
    if (!document.getElementById('chw-css')) { var st = document.createElement('style'); st.id = 'chw-css'; st.textContent = CSS_APPLI; document.head.appendChild(st); }
  }
  box.innerHTML = '<div class="skel"></div>';
  charger().then(function () { vue(box); }).catch(function (e) { box.innerHTML = '<div class="card empty">Impossible de charger la Challenge Week' + (e && e.message ? ' : ' + esc(e.message) : '') + '.</div>'; });
};
})();
