// Se connecter « en tant que » (direction sportive) — 23/11/2026. Chargé juste après supabase-js, dans l'appli ET dans la gestion.
// Une vraie session du compte choisi (fonction Edge « connexion-comme ») : tu vois et fais exactement ce que la personne voit et fait.
// Garde-fous pendant la simulation :
//  - rien n'est marqué comme lu chez la personne (messages, discussions, cloche) ;
//  - ton téléphone n'est pas abonné à ses notifications ;
//  - « Se déconnecter » ramène à ton compte sans déconnecter la personne de son téléphone ;
//  - un bandeau reste affiché, et chaque entrée / sortie est notée au journal de la gestion.
(function () {
'use strict';
var K_SIMU = 'cloca_simu', K_RETOUR = 'cloca_simu_retour';
var LECTURES = ['messages_lus', 'discussion_lu', 'notifs_lues'];
function lire(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
function ecrire(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
function actif() { return !!lire(K_SIMU); }
function racine() { return location.pathname.indexOf('/app/') >= 0 ? location.pathname.slice(0, location.pathname.indexOf('/app/') + 5) : '/app/'; }
var client = null, origSignOut = null;
function vide() { return { data: null, error: null }; }
function faux() {
  var f = { then: function (ok, ko) { return Promise.resolve(vide()).then(ok, ko); }, catch: function () { return f; } };
  ['eq', 'neq', 'in', 'is', 'match', 'select', 'single', 'maybeSingle', 'order', 'limit'].forEach(function (m) { f[m] = function () { return f; }; });
  return f;
}

function garder(c) {
  if (!c || c.__simu) return c;
  c.__simu = true; client = c;
  var rpc = c.rpc.bind(c), from = c.from.bind(c);
  c.rpc = function (n, a, o) { return actif() && LECTURES.indexOf(n) >= 0 ? faux() : rpc(n, a, o); };
  c.from = function (t) {
    var b = from(t);
    if (actif() && t === 'push_abonnements') ['insert', 'upsert', 'delete', 'update'].forEach(function (m) { b[m] = faux; });
    return b;
  };
  origSignOut = c.auth.signOut.bind(c.auth);
  c.auth.signOut = function (o) { return actif() ? quitter() : origSignOut(o); };
  // Simulation oubliée (session changée à la main) : on nettoie
  var s = lire(K_SIMU);
  if (s) c.auth.getSession().then(function (r) { var u = r && r.data && r.data.session && r.data.session.user; if (!u || u.id !== s.user_id) { ecrire(K_SIMU, null); retirerBandeau(); } }).catch(function () { });
  return c;
}

function demarrer(userId, nom) {
  var c = client; if (!c) return Promise.reject(new Error('Appli pas prête'));
  return c.auth.getSession().then(function (r) {
    var s = r && r.data && r.data.session;
    if (!s) throw new Error('Tu n\'es pas connecté');
    if (!actif()) ecrire(K_RETOUR, { access_token: s.access_token, refresh_token: s.refresh_token, email: s.user.email });
    return c.functions.invoke('connexion-comme', { body: { user_id: userId } });
  }).then(function (r) {
    if (r.error || !r.data || !r.data.token_hash) {
      var ctx = r.error && r.error.context;
      return (ctx && ctx.json ? ctx.json().catch(function () { return {}; }) : Promise.resolve(r.data || {})).then(function (d) { throw new Error((d && d.erreur) || (r.error && r.error.message) || 'Connexion impossible'); });
    }
    var th = r.data.token_hash, email = r.data.email;
    return c.auth.verifyOtp({ token_hash: th, type: 'magiclink' }).then(function (v) {
      if (v.error) throw new Error(v.error.message);
      ecrire(K_SIMU, { user_id: userId, email: email, nom: nom || email, depuis: new Date().toISOString() });
      location.href = racine() + '#/accueil'; setTimeout(function () { location.reload(); }, 50);
    });
  });
}

function quitter() {
  var c = client, a = lire(K_RETOUR), s = lire(K_SIMU);
  ecrire(K_SIMU, null);
  var fin = function () { ecrire(K_RETOUR, null); location.href = racine() + 'gestion/'; };
  if (!c) { fin(); return Promise.resolve(vide()); }
  // Ferme seulement cette session-ci (la personne reste connectée sur son téléphone), puis reprend la tienne
  return origSignOut({ scope: 'local' }).catch(function () { }).then(function () {
    if (!a) throw new Error('session absente');
    return c.auth.setSession({ access_token: a.access_token, refresh_token: a.refresh_token });
  }).then(function (r) {
    if (r && r.error) throw r.error;
    if (s) c.functions.invoke('connexion-comme', { body: { fin: true, user_id: s.user_id } }).catch(function () { });
    setTimeout(fin, 300);
    return vide();
  }).catch(function () {
    alert('Ta session a expiré : reconnecte-toi avec ton adresse mail.');
    ecrire(K_RETOUR, null); location.href = racine() + '#/profil'; setTimeout(function () { location.reload(); }, 50);
    return vide();
  });
}

// ---------- Bandeau ----------
function retirerBandeau() { var b = document.getElementById('simu-bandeau'); if (b) b.remove(); }
function bandeau() {
  var s = lire(K_SIMU); if (!s || document.getElementById('simu-bandeau')) return;
  var d = document.createElement('div'); d.id = 'simu-bandeau';
  d.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:max(env(safe-area-inset-top),6px);z-index:2147483000;display:flex;gap:8px;align-items:center;max-width:calc(100vw - 16px);padding:6px 6px 6px 12px;border-radius:999px;background:#d9822b;color:#fff;font:600 12px/1.2 Inter,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.25)';
  var t = document.createElement('span'); t.style.cssText = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
  var mots = String(s.nom || s.email).split(',')[0].trim().split(/\s+/);
  t.textContent = '👤 ' + (mots.length > 1 ? mots[0] + ' ' + mots[1].charAt(0).toUpperCase() + '.' : mots[0]);
  t.title = s.email + ' · depuis ' + new Date(s.depuis).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  var b = document.createElement('button'); b.textContent = 'Revenir à mon compte';
  b.style.cssText = 'flex:none;border:0;border-radius:999px;background:#fff;color:#7a3f0c;font:700 12px Inter,system-ui,sans-serif;padding:6px 10px;cursor:pointer';
  b.onclick = function () { b.disabled = true; b.textContent = 'Retour…'; quitter(); };
  d.appendChild(t); d.appendChild(b); document.body.appendChild(d);
}

// ---------- Choisir un compte (fenêtre commune appli / gestion) ----------
function ouvrirChoix() {
  var c = client; if (!c) return;
  var fond = document.createElement('div');
  fond.style.cssText = 'position:fixed;inset:0;z-index:2147483001;background:rgba(10,20,30,.55);display:flex;align-items:flex-start;justify-content:center;padding:8vh 12px';
  fond.innerHTML = '<div style="background:var(--card,#fff);color:var(--tx,#12304a);border-radius:16px;padding:18px;width:100%;max-width:460px;display:flex;flex-direction:column;gap:10px;font:14px/1.4 Inter,system-ui,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.3)">' +
    '<b style="font-size:17px">Se connecter en tant que…</b>' +
    '<span style="font-size:13px;opacity:.75">Tu deviens ce compte : ses écrans, ses rôles, ses inscriptions, ses messages. Tu peux agir à sa place. Rien n\'est marqué comme lu chez la personne et elle reste connectée sur son téléphone. Chaque connexion est notée dans l\'historique.</span>' +
    '<input id="simu-q" placeholder="Nom, prénom ou adresse mail" autocomplete="off" style="width:100%;min-height:42px;padding:8px 12px;border:1px solid var(--bd,#ddd);border-radius:10px;background:var(--card,#fff);color:inherit;font:inherit">' +
    '<div id="simu-r" style="display:flex;flex-direction:column;gap:6px;max-height:50vh;overflow:auto"></div>' +
    '<button id="simu-x" style="align-self:flex-end;border:1px solid var(--bd,#ddd);background:transparent;color:inherit;border-radius:10px;padding:8px 14px;cursor:pointer;font:inherit">Fermer</button></div>';
  document.body.appendChild(fond);
  var fermer = function () { fond.remove(); };
  fond.onclick = function (e) { if (e.target === fond) fermer(); };
  fond.querySelector('#simu-x').onclick = fermer;
  var inp = fond.querySelector('#simu-q'), res = fond.querySelector('#simu-r'), t;
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]; }); };
  var ROLES = { direction: 'Direction', bureau: 'Bureau', accueil: 'Accueil', enseignant: 'Coach', coach: 'Coach de groupe', responsable: 'Responsable', cordeur: 'Cordeur' };
  inp.focus();
  inp.oninput = function () {
    clearTimeout(t); var v = inp.value.trim(); if (v.length < 2) { res.innerHTML = ''; return; }
    t = setTimeout(function () {
      c.rpc('comptes_chercher', { p_q: v }).then(function (r) {
        var l = (r && r.data) || [];
        res.innerHTML = l.length ? l.map(function (x) {
          var roles = (x.roles || '').split(', ').filter(Boolean).map(function (k) { return ROLES[k] || k; }).filter(function (k, i, a) { return a.indexOf(k) === i; }).join(', ');
          return '<button data-simu="' + x.user_id + '" data-nom="' + esc(x.noms || x.email) + '" style="text-align:left;border:1px solid var(--bd,#ddd);background:var(--card,#fff);color:inherit;border-radius:10px;padding:10px 12px;cursor:pointer;font:inherit"><b>' + esc(x.noms || 'Compte sans fiche') + '</b>' + (roles ? ' <span style="font-size:12px;color:#b4532a">· ' + esc(roles) + '</span>' : '') + '<div style="font-size:12px;opacity:.7;overflow-wrap:anywhere">' + esc(x.email) + '</div></button>';
        }).join('') : '<span style="font-size:13px;opacity:.7">' + (r && r.error ? 'Recherche impossible : ' + esc(r.error.message) : 'Aucun compte trouvé.') + '</span>';
        Array.prototype.forEach.call(res.querySelectorAll('[data-simu]'), function (b) {
          b.onclick = function () {
            var nom = b.getAttribute('data-nom');
            b.disabled = true; b.style.opacity = '.6';
            demarrer(b.getAttribute('data-simu'), nom).catch(function (e) { b.disabled = false; b.style.opacity = ''; alert('Connexion impossible : ' + (e && e.message ? e.message : e)); });
          };
        });
      });
    }, 250);
  };
}

// Tout client Supabase créé sur la page reçoit les garde-fous
if (window.supabase && window.supabase.createClient) {
  var cc = window.supabase.createClient;
  window.supabase.createClient = function () { return garder(cc.apply(this, arguments)); };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bandeau); else bandeau();
window.CLOCASimu = { actif: actif, info: function () { return lire(K_SIMU); }, demarrer: demarrer, quitter: quitter, ouvrirChoix: ouvrirChoix };
})();
