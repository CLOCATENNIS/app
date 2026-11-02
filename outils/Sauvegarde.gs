/**
 * Sauvegarde automatique de l'appli CLOCA Tennis vers Google Drive.
 *
 * Chaque nuit vers 3h : un fichier .zip (données de l'appli + photos des annonces)
 * dans le dossier « Sauvegardes appli CLOCA » (environ 0,5 Mo chacun). Le Drive garde au plus :
 *   - les 3 dernières sauvegardes journalières (jour_…)
 *   - les 2 dernières sauvegardes hebdomadaires (semaine_…) : toujours une d'au moins 1 semaine
 *   - les 2 dernières sauvegardes mensuelles (mois_…) : toujours une d'au moins 1 mois
 * Les plus anciennes s'effacent toutes seules (corbeille du Drive).
 *
 * INSTALLATION (une seule fois) :
 *   1. Choisir la fonction « installer » en haut, puis ▶ Exécuter, et autoriser.
 *   2. Ouvrir le « Journal d'exécution » : copier la ligne EMPREINTE et l'envoyer à Claude.
 *      (L'empreinte n'est pas secrète. La clé, elle, reste dans ce script et n'est jamais affichée.)
 *   3. Quand Claude a enregistré l'empreinte : exécuter « sauvegarderMaintenant » pour tester.
 */

const SUPABASE_URL = 'https://ccvfdsriogqerdcopuuv.supabase.co';
const SUPABASE_CLE_PUBLIQUE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjdmZkc3Jpb2dxZXJkY29wdXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NzQ4NzgsImV4cCI6MjEwODM1MDg3OH0.sB8Eb4x2radwuE4YT87vjza_rc0RMZHa3DlTVdEGqwI';
const DOSSIER = 'Sauvegardes appli CLOCA';
const GARDER = { jour: 3, semaine: 2, mois: 2 }; // 2 de chaque : il y en a toujours une d'au moins 1 semaine / 1 mois

function installer() {
  const props = PropertiesService.getScriptProperties();
  let cle = props.getProperty('cle_sauvegarde');
  if (!cle) {
    cle = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty('cle_sauvegarde', cle);
  }
  // Déclencheur chaque nuit vers 3h (un seul)
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'sauvegardeNocturne').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sauvegardeNocturne').timeBased().everyDays(1).atHour(3).inTimezone('Europe/Paris').create();
  dossier_();
  const empreinte = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, cle, Utilities.Charset.UTF_8)
    .map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
  Logger.log('EMPREINTE : ' + empreinte);
  Logger.log('Envoie cette empreinte à Claude. Sauvegarde programmée chaque nuit vers 3h.');
}

function sauvegarderMaintenant() { sauvegardeNocturne(); }

function sauvegardeNocturne() {
  try {
    const cle = PropertiesService.getScriptProperties().getProperty('cle_sauvegarde');
    if (!cle) throw new Error('Script non installé : exécute « installer ».');
    const rep = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/rpc/export_sauvegarde', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { apikey: SUPABASE_CLE_PUBLIQUE, Authorization: 'Bearer ' + SUPABASE_CLE_PUBLIQUE },
      payload: JSON.stringify({ cle: cle })
    });
    if (rep.getResponseCode() !== 200) throw new Error('Supabase a répondu ' + rep.getResponseCode() + ' : ' + rep.getContentText().slice(0, 300));
    const texte = rep.getContentText();
    const donnees = JSON.parse(texte);
    const blobs = [Utilities.newBlob(texte, 'application/json', 'donnees.json')];
    // Photos (dossiers publics de l'appli)
    (donnees.fichiers || []).forEach(f => {
      try {
        const r = UrlFetchApp.fetch(SUPABASE_URL + '/storage/v1/object/public/' + f.bucket + '/' + encodeURI(f.name), { muteHttpExceptions: true });
        if (r.getResponseCode() === 200) blobs.push(r.getBlob().setName('fichiers/' + f.bucket + '/' + f.name));
      } catch (e) { }
    });
    const jour = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
    const zip = Utilities.zip(blobs, 'jour_' + jour + '_CLOCA.zip');
    const d = dossier_();
    d.getFilesByName(zip.getName()).hasNext() || d.createFile(zip);
    rotation_(d, jour);
  } catch (e) {
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '⚠️ Sauvegarde appli CLOCA échouée', 'La sauvegarde de cette nuit n\'a pas pu se faire.\n\n' + e.message + '\n\nDis-le à Claude pour qu\'il regarde.');
    throw e;
  }
}

function dossier_() {
  const it = DriveApp.getFoldersByName(DOSSIER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(DOSSIER);
}

function fichiers_(d, type) {
  const l = [], it = d.getFiles();
  while (it.hasNext()) { const f = it.next(); if (f.getName().indexOf(type + '_') === 0) l.push(f); }
  return l.sort((a, b) => b.getName() < a.getName() ? -1 : 1); // plus récent d'abord
}

function dateDe_(f) { return new Date(f.getName().split('_')[1] + 'T12:00:00'); }

function rotation_(d, jour) {
  const jours = fichiers_(d, 'jour');
  const recent = jours[0];
  const age = (f) => (new Date(jour + 'T12:00:00') - dateDe_(f)) / 864e5;
  // Une nouvelle sauvegarde de semaine si la dernière a 7 jours ou plus (ou s'il n'y en a pas)
  const sem = fichiers_(d, 'semaine');
  if (recent && (!sem.length || age(sem[0]) >= 7)) recent.makeCopy('semaine_' + jour + '_CLOCA.zip', d);
  // Une sauvegarde du mois si la dernière a 30 jours ou plus
  const mois = fichiers_(d, 'mois');
  if (recent && (!mois.length || age(mois[0]) >= 30)) recent.makeCopy('mois_' + jour + '_CLOCA.zip', d);
  // On ne garde que les plus récentes de chaque type
  Object.keys(GARDER).forEach(type => fichiers_(d, type).slice(GARDER[type]).forEach(f => f.setTrashed(true)));
}
