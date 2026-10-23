// Mon espace : connexion par code mail et agenda personnel (base Supabase du club)
(function(){
var SUPA_URL="https://ccvfdsriogqerdcopuuv.supabase.co";
var SUPA_KEY="sb_publishable_01H1gmGMH3t4XLqD1EeTeg_ErdW1VvM"; // clé publique : les droits sont appliqués par la base
var sb=null, EMAIL="";
var JOURS=["","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
function $(id){return document.getElementById(id)}
function e(v){return window.esc?window.esc(v):String(v==null?"":v)}
function msg(t,err){var m=$("m_msg");m.textContent=t||"";m.style.color=err?"#c62f2f":"var(--mut)"}

function client(){
  if(sb)return sb;
  if(!window.supabase){return null}
  sb=window.supabase.createClient(SUPA_URL,SUPA_KEY,{auth:{persistSession:true,detectSessionInUrl:true,flowType:"implicit"}});
  sb.auth.onAuthStateChange(function(ev){if(ev==="SIGNED_IN"||ev==="SIGNED_OUT")refresh()});
  return sb;
}

window.espaceEnvoyer=function(){
  var c=client(); if(!c){msg("Connexion impossible pour le moment, réessaie plus tard.",true);return}
  EMAIL=($("m_email").value||"").trim().toLowerCase();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(EMAIL)){msg("Vérifie ton adresse mail.",true);return}
  $("m_send").disabled=true; msg("Envoi en cours…");
  c.auth.signInWithOtp({email:EMAIL,options:{emailRedirectTo:location.origin+location.pathname}}).then(function(r){
    $("m_send").disabled=false;
    if(r.error){msg(r.error.status===429?"Trop de demandes d'affilée : attends quelques minutes, ou utilise le dernier mail reçu.":"L'envoi a échoué : "+r.error.message,true);return}
    $("m_step1").style.display="none"; $("m_step2").style.display="block";
    msg("Un mail vient de partir vers "+EMAIL+". Tape le code reçu, ou clique sur le lien du mail.");
  });
};
window.espaceValider=function(){
  var c=client(), code=($("m_code").value||"").replace(/\s/g,"");
  if(!/^\d{6,10}$/.test(code)){msg("Le code contient uniquement des chiffres.",true);return}
  $("m_ok").disabled=true; msg("Vérification…");
  c.auth.verifyOtp({email:EMAIL,token:code,type:"email"}).then(function(r){
    $("m_ok").disabled=false;
    if(r.error){msg("Code incorrect ou expiré. Redemande un code si besoin.",true);return}
    msg("");
  });
};
window.espaceRetour=function(){$("m_step2").style.display="none";$("m_step1").style.display="block";msg("")};
window.espaceDeconnexion=function(){var c=client();if(c)c.auth.signOut()};

function setTile(nom){
  var t=$("m_tile_sub"); if(t)t.textContent=nom?"Bonjour "+nom+" · ton agenda, tes inscriptions":"Se connecter · agenda, inscriptions";
}

function refresh(){
  var c=client();
  if(!c){$("m_login").style.display="block";$("m_espace").style.display="none";return}
  c.auth.getSession().then(function(r){
    var s=r.data&&r.data.session;
    if(!s){$("m_login").style.display="block";$("m_espace").style.display="none";setTile("");return}
    $("m_login").style.display="none";$("m_espace").style.display="block";
    charger(c,s.user);
  });
}

function charger(c,user){
  var box=$("m_contenu"); box.innerHTML='<p class="mut">Chargement…</p>';
  var debut=new Date(); debut.setHours(0,0,0,0);
  var fin=new Date(debut); fin.setDate(fin.getDate()+28);
  Promise.all([
    c.from("comptes").select("foyer_id,personne_id,email").eq("user_id",user.id).maybeSingle(),
    c.from("personnes").select("id,prenom,nom,profil,niveau_arena,groupe_membres(groupe_id,groupes(nom,couleur,type))").order("prenom"),
    c.from("evenements").select("id,titre,description,debut,fin,lieu,encadrant,statut,groupe_id,inscription_ouverte,places_max,groupes(nom,couleur)").gte("debut",debut.toISOString()).lte("debut",fin.toISOString()).order("debut"),
    c.from("creneaux").select("id,groupe_id,jour_semaine,heure_debut,heure_fin,lieu,encadrant,du,au,groupes(nom,couleur)"),
    c.from("inscriptions").select("evenement_id,personne_id,statut,paye"),
    c.from("responsabilites").select("role,groupe_id").eq("user_id",user.id)
  ]).then(function(res){
    var err=res.filter(function(x){return x.error})[0];
    if(err){box.innerHTML='<div class="card">Impossible de charger ton espace pour le moment.</div>';return}
    var compte=res[0].data, pers=res[1].data||[], evts=res[2].data||[], cren=res[3].data||[], insc=res[4].data||[], roles=res[5].data||[];
    var moi=pers.filter(function(p){return compte&&p.id===compte.personne_id})[0];
    setTile(moi?moi.prenom:(pers[0]?"famille "+pers[0].nom:""));
    if(!compte||(!compte.foyer_id&&!compte.personne_id)){
      box.innerHTML='<div class="card"><div class="wk">Adresse pas encore reconnue</div><p class="mut">Tu es bien connecté avec '+e(user.email)+', mais cette adresse n\'est pas encore rattachée à un adhérent. Contacte le club pour qu\'il l\'ajoute à ta fiche.</p></div>';
      return;
    }
    var mesGroupes={}, couleurPers={};
    var palette=["#1f5a85","#b85c33","#2e8b57","#7b4fa0","#c62f2f","#e07a1f"];
    pers.forEach(function(p,i){couleurPers[p.id]=palette[i%palette.length];(p.groupe_membres||[]).forEach(function(g){(mesGroupes[g.groupe_id]=mesGroupes[g.groupe_id]||[]).push(p)})});
    var h='';
    // La famille
    h+='<div class="card"><div class="wk">'+(pers.length>1?"Ma famille":"Mon profil")+'</div>';
    pers.forEach(function(p){
      h+='<div class="row"><span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+couleurPers[p.id]+';margin-right:8px"></span>'+e(p.prenom)+' '+e(p.nom)+'</span><span>';
      (p.groupe_membres||[]).forEach(function(g){if(g.groupes)h+='<span class="badge" style="background:'+(g.groupes.couleur||"#667068")+';color:#fff;margin-left:4px">'+e(g.groupes.nom.replace("CLOC'ARENA ",""))+'</span>'});
      h+='</span></div>';
    });
    if(roles.length){h+='<p class="mut" style="margin:8px 0 0">Responsabilités : '+e(roles.map(function(r){return r.role}).join(", "))+'</p>'}
    h+='</div>';
    // Mon agenda : séances des groupes, événements inscrits, créneaux de cours
    var items=[];
    evts.forEach(function(ev){
      var qui=[];
      if(ev.groupe_id&&mesGroupes[ev.groupe_id])qui=mesGroupes[ev.groupe_id];
      insc.forEach(function(i){if(i.evenement_id===ev.id){var p=pers.filter(function(x){return x.id===i.personne_id})[0];if(p&&qui.indexOf(p)<0)qui.push(p)}});
      if(qui.length)items.push({d:new Date(ev.debut),f:ev.fin?new Date(ev.fin):null,titre:ev.titre,lieu:ev.lieu,enc:ev.encadrant,statut:ev.statut,groupe:ev.groupes,qui:qui,ev:ev});
    });
    for(var k=0;k<28;k++){
      var j=new Date(debut); j.setDate(j.getDate()+k);
      var js=j.getDay()===0?7:j.getDay(), iso=j.getFullYear()+"-"+("0"+(j.getMonth()+1)).slice(-2)+"-"+("0"+j.getDate()).slice(-2);
      cren.forEach(function(cr){
        if(cr.jour_semaine!==js)return;
        if(cr.du&&iso<cr.du)return; if(cr.au&&iso>cr.au)return;
        var hd=cr.heure_debut.split(":"), hf=cr.heure_fin.split(":");
        var d=new Date(j); d.setHours(+hd[0],+hd[1]); var f=new Date(j); f.setHours(+hf[0],+hf[1]);
        items.push({d:d,f:f,titre:cr.groupes?cr.groupes.nom:"Cours",lieu:cr.lieu,enc:cr.encadrant,statut:"prevu",groupe:cr.groupes,qui:mesGroupes[cr.groupe_id]||[]});
      });
    }
    items.sort(function(a,b){return a.d-b.d});
    h+='<div class="card"><div class="wk">📅 Mon agenda · 4 prochaines semaines</div>';
    if(!items.length){h+='<p class="mut">Rien de prévu pour l\'instant.</p>'}
    var jour="";
    items.forEach(function(it){
      var jl=it.d.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
      if(jl!==jour){jour=jl;h+='<div class="mrow" style="font-weight:600">'+e(jl.charAt(0).toUpperCase()+jl.slice(1))+'</div>'}
      var hh=it.d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})+(it.f?" – "+it.f.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}):"");
      var annule=it.statut==="annule";
      h+='<div class="mrow"'+(annule?' style="opacity:.6"':'')+'><div><b>'+hh+'</b> · '+e(it.titre)+(annule?' <span class="badge" style="background:#c62f2f">Annulé</span>':it.statut==="deplace"?' <span class="badge" style="background:#e07a1f">Déplacé</span>':'')+'</div>';
      var det=[]; if(it.lieu)det.push("📍 "+e(it.lieu)); if(it.enc)det.push("👤 "+e(it.enc));
      if(pers.length>1&&it.qui.length)det.push(it.qui.map(function(p){return '<span style="color:'+couleurPers[p.id]+';font-weight:600">'+e(p.prenom)+'</span>'}).join(", "));
      if(det.length)h+='<div class="sc">'+det.join(" · ")+'</div>';
      h+='</div>';
    });
    h+='</div>';
    // Inscriptions ouvertes
    var ouverts=evts.filter(function(ev){return ev.inscription_ouverte&&ev.statut!=="annule"});
    if(ouverts.length){
      h+='<div class="card"><div class="wk">✍️ Inscriptions ouvertes</div>';
      ouverts.forEach(function(ev){
        h+='<div class="mrow"><div><b>'+e(ev.titre)+'</b></div><div class="sc">'+e(new Date(ev.debut).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"}))+(ev.lieu?" · "+e(ev.lieu):"")+'</div><div class="chips">';
        pers.forEach(function(p){
          var i=insc.filter(function(x){return x.evenement_id===ev.id&&x.personne_id===p.id})[0];
          var lab=i?(i.statut==="attente"?"⏳ ":"✅ ")+e(p.prenom):"+ "+e(p.prenom);
          h+='<button class="'+(i?"on":"")+'" onclick="espaceInscrire(\''+ev.id+'\',\''+p.id+'\','+(i?"true":"false")+','+(i&&i.paye?"true":"false")+')">'+lab+'</button>';
        });
        h+='</div></div>';
      });
      h+='<p class="mut" style="margin:6px 0 0">✅ inscrit · ⏳ liste d\'attente. Touche un prénom pour inscrire ou désinscrire.</p></div>';
    }
    box.innerHTML=h;
  });
}

window.espaceInscrire=function(evt,pid,deja,paye){
  var c=client(); if(!c)return;
  if(deja&&paye){alert("Inscription déjà réglée : contacte le club pour l'annuler.");return}
  var q=deja?c.from("inscriptions").delete().eq("evenement_id",evt).eq("personne_id",pid):c.from("inscriptions").insert({evenement_id:evt,personne_id:pid});
  q.then(function(r){if(r.error){alert("L'opération n'a pas pu être faite.")}refresh()});
};

window.espaceOuvrir=function(){refresh()};
if(document.readyState!=="loading"){refresh()}else{document.addEventListener("DOMContentLoaded",refresh)}
})();
