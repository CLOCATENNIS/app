// Faux client Supabase pour tester l'espace gestion sans compte réel :
// une session « direction », des tables vides (ou celles de window.__MOCK) et aucune écriture réelle.
(function () {
  var D = window.__MOCK || {};
  var tables = D.tables || {};
  function reponse(table, single) {
    var data = tables[table] || [];
    return { data: single ? (data[0] || null) : data, error: null, count: data.length };
  }
  function chaine(table) {
    var etat = { single: false };
    var c = new Proxy(function () {}, {
      get: function (t, k) {
        if (k === 'then') return function (ok, ko) { return Promise.resolve(reponse(table, etat.single)).then(ok, ko); };
        if (k === 'catch') return function (ko) { return Promise.resolve(reponse(table, etat.single)).catch(ko); };
        if (k === 'single' || k === 'maybeSingle') return function () { etat.single = true; return c; };
        return function () { return c; };
      }
    });
    return c;
  }
  var session = D.session === undefined ? { user: { id: '00000000-0000-0000-0000-000000000001', email: 'robot@clocatennis.fr' }, access_token: 'test' } : D.session;
  var client = {
    from: chaine,
    rpc: function (n) { var r = (D.rpc || {})[n]; return Promise.resolve({ data: r === undefined ? [] : r, error: null }); },
    auth: {
      getSession: function () { return Promise.resolve({ data: { session: session } }); },
      getUser: function () { return Promise.resolve({ data: { user: session && session.user } }); },
      onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; },
      signOut: function () { return Promise.resolve({}); },
      signInWithOtp: function () { return Promise.resolve({ data: {}, error: null }); },
      verifyOtp: function () { return Promise.resolve({ data: {}, error: null }); }
    },
    functions: { invoke: function () { return Promise.resolve({ data: {}, error: null }); } },
    storage: { from: function () { return { upload: function () { return Promise.resolve({ data: {}, error: null }); }, getPublicUrl: function () { return { data: { publicUrl: '' } }; }, remove: function () { return Promise.resolve({}); } }; } },
    channel: function () { var ch = { on: function () { return ch; }, subscribe: function () { return ch; }, unsubscribe: function () {} }; return ch; },
    removeChannel: function () {}
  };
  window.supabase = { createClient: function () { return client; } };
})();
