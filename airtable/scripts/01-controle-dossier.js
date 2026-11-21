// MEB32 — Contrôle de complétude d'une affaire (script d'automatisation Airtable)
// Déclencheur : Affaires, quand « Lancer le contrôle » est coché.
// Entrée : recordId (ID de l'affaire).
// Ce script :
//   1. crée les critères applicables (catalogue « Modèles de critères » × familles d'équipements),
//      sans jamais recréer un critère déjà présent ;
//   2. repère les informations déjà saisies dans Airtable et passe le critère à
//      « Présent – à confirmer » (jamais « Validé » : la validation reste humaine) ;
//   3. rédige la synthèse et met à jour le statut du contrôle.
// Il ne supprime rien et ne touche jamais un critère Validé / Non applicable / Ambigu.

const cfg = input.config();
const recordId = cfg.recordId;
const T = (n) => base.getTable(n);
const A = T('Affaires'), CRIT = T('Critères dossier'), MOD = T('Modèles de critères');
const CL = T('Clients'), CT = T('Contacts'), DOC = T('Documents');
const ids = (v) => (v || []).map((x) => x.id);
const sel = (r, f) => (r.getCellValue(f) ? r.getCellValue(f).name : '');
const AUTO = 'Donnée Airtable';

const a = await A.selectRecordAsync(recordId);
if (!a) throw new Error('Affaire introuvable : ' + recordId);
const familles = (a.getCellValue('Familles d’équipements') || []).map((x) => x.name);

// 1. Instanciation des critères ------------------------------------------------
const modQ = await MOD.selectRecordsAsync({ fields: ['Critère', 'Catégorie', 'Obligatoire', 'S’applique à', 'Question à poser', 'Ordre'] });
const critFields = ['Critère', 'Affaire', 'Modèle', 'Statut', 'Obligatoire', 'Source (document, page)', 'Réponse / valeur', 'Question à poser', 'Ordre'];
const byOrdre = (x, y) => (x.getCellValue('Ordre') || 999) - (y.getCellValue('Ordre') || 999);
let critQ = await CRIT.selectRecordsAsync({ fields: critFields });
let mine = critQ.records.filter((r) => ids(r.getCellValue('Affaire')).includes(recordId));
const usedMods = new Set(mine.flatMap((r) => ids(r.getCellValue('Modèle'))));
const applicable = modQ.records.filter((m) => {
  const app = (m.getCellValue('S’applique à') || []).map((x) => x.name);
  return app.includes('Toutes affaires') || app.some((x) => familles.includes(x));
});
const toCreate = applicable.filter((m) => !usedMods.has(m.id)).map((m) => ({
  fields: {
    'Critère': m.getCellValueAsString('Critère'),
    'Catégorie': m.getCellValue('Catégorie') ? { name: m.getCellValue('Catégorie').name } : null,
    'Obligatoire': !!m.getCellValue('Obligatoire'),
    'Question à poser': m.getCellValueAsString('Question à poser'),
    'Ordre': m.getCellValue('Ordre'),
    'Statut': { name: 'Manquant' },
    'Affaire': [{ id: recordId }],
    'Modèle': [{ id: m.id }],
  },
}));
for (let i = 0; i < toCreate.length; i += 50) await CRIT.createRecordsAsync(toCreate.slice(i, i + 50));
critQ = await CRIT.selectRecordsAsync({ fields: critFields });
mine = critQ.records.filter((r) => ids(r.getCellValue('Affaire')).includes(recordId));

// 2. Recherche des informations déjà présentes dans Airtable -------------------
const clientId = ids(a.getCellValue('Client'))[0];
const client = clientId ? await CL.selectRecordAsync(clientId) : null;
const ctQ = await CT.selectRecordsAsync({ fields: ['Nom', 'Rôle', 'Téléphone', 'Client'] });
const principal = ids(a.getCellValue('Contact principal'));
const surPlace = ctQ.records.filter((c) => sel(c, 'Rôle') === 'Contact sur place' && c.getCellValueAsString('Téléphone') &&
  (principal.includes(c.id) || (clientId && ids(c.getCellValue('Client')).includes(clientId))));
const docQ = await DOC.selectRecordsAsync({ fields: ['Nom', 'Type', 'Fichier', 'Lien OneDrive', 'Affaire'] });
const plans = docQ.records.filter((d) => ids(d.getCellValue('Affaire')).includes(recordId) && sel(d, 'Type') === 'Plan' &&
  ((d.getCellValue('Fichier') || []).length || d.getCellValueAsString('Lien OneDrive')));
const adresse = a.getCellValueAsString('Adresse du bâtiment');
const signes = a.getCellValue('Devis signés valides') || 0;

const evidence = [
  ['Coordonnées client', client && client.getCellValueAsString('Adresse') && (client.getCellValueAsString('Téléphone') || client.getCellValueAsString('Email')),
    client ? `${client.name} — ${client.getCellValueAsString('Adresse').replace(/\n/g, ', ')} — ${client.getCellValueAsString('Téléphone')} ${client.getCellValueAsString('Email')}` : ''],
  ['Contact sur place', surPlace.length > 0, surPlace.map((c) => `${c.name} ${c.getCellValueAsString('Téléphone')}`).join(' ; ')],
  ['Date de début des travaux', a.getCellValue('Date travaux prévue') && a.getCellValue('Date travaux confirmée'), a.getCellValueAsString('Date travaux prévue')],
  ['Devis signé lisible', signes >= 1, `${signes} devis signé(s) avec PDF joint`],
  ['Plan du bâtiment', plans.length > 0, plans.map((d) => d.name).join(' ; ')],
  ['Adresse de livraison', !!adresse, adresse.replace(/\n/g, ', ')],
];
const updates = [];
for (const r of mine) {
  const name = r.getCellValueAsString('Critère');
  const statut = sel(r, 'Statut') || 'Manquant';
  const ev = evidence.find(([prefix]) => name.startsWith(prefix));
  if (!ev) continue;
  const [, ok, valeur] = ev;
  const autoSourced = r.getCellValueAsString('Source (document, page)').startsWith(AUTO);
  if (ok && statut === 'Manquant') {
    updates.push({ id: r.id, fields: { 'Statut': { name: 'Présent – à confirmer' }, 'Source (document, page)': `${AUTO} (contrôle automatique)`,
      'Réponse / valeur': r.getCellValueAsString('Réponse / valeur') || String(valeur || '') } });
  } else if (!ok && statut === 'Présent – à confirmer' && autoSourced) {
    // l'information a disparu depuis le dernier contrôle
    updates.push({ id: r.id, fields: { 'Statut': { name: 'Manquant' } } });
  }
}
for (let i = 0; i < updates.length; i += 50) await CRIT.updateRecordsAsync(updates.slice(i, i + 50));
critQ = await CRIT.selectRecordsAsync({ fields: critFields });
mine = critQ.records.filter((r) => ids(r.getCellValue('Affaire')).includes(recordId)).sort(byOrdre);

// 3. Synthèse -------------------------------------------------------------------
const count = {};
for (const r of mine) { const s = sel(r, 'Statut') || 'Manquant'; count[s] = (count[s] || 0) + 1; }
const bloquants = mine.filter((r) => r.getCellValue('Obligatoire') && !['Validé', 'Non applicable'].includes(sel(r, 'Statut')));
const aConfirmer = mine.filter((r) => ['Présent – à confirmer', 'Ambigu / contradictoire'].includes(sel(r, 'Statut')));
const manquants = mine.filter((r) => (sel(r, 'Statut') || 'Manquant') === 'Manquant');
const autres = [];
if (signes < 1) autres.push('Aucun devis signé (version acceptée + PDF signé joint)');
if (!(a.getCellValue('Date travaux prévue') && a.getCellValue('Date travaux confirmée'))) autres.push('Date des travaux non fixée ou non confirmée');
if (!a.getCellValue('Documents accessibles (OneDrive)')) autres.push('Documents non confirmés accessibles (case à cocher)');

const now = new Date();
const dateFr = now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
const L = [];
L.push(`Contrôle du ${dateFr} — ${a.name}`);
L.push(`Critères : ${mine.length} — validés ${count['Validé'] || 0}, non applicables ${count['Non applicable'] || 0}, présents à confirmer ${count['Présent – à confirmer'] || 0}, ambigus ${count['Ambigu / contradictoire'] || 0}, manquants ${count['Manquant'] || 0}.`);
if (toCreate.length) L.push(`${toCreate.length} critère(s) ajouté(s) selon les familles : ${familles.join(', ') || 'aucune famille renseignée'}.`);
L.push('');
L.push(bloquants.length || autres.length ? '⛔ TRANSMISSION BLOQUÉE' : '✅ Toutes les conditions sont remplies : la transmission peut être demandée.');
for (const x of autres) L.push(`• ${x}`);
for (const r of bloquants) L.push(`• ${r.getCellValueAsString('Critère')} — ${sel(r, 'Statut') || 'Manquant'}`);
if (manquants.length) { L.push(''); L.push('Questions à poser :'); for (const r of manquants) L.push(`• ${r.getCellValueAsString('Question à poser') || r.getCellValueAsString('Critère')}`); }
if (aConfirmer.length) { L.push(''); L.push('À confirmer par un humain :'); for (const r of aConfirmer) L.push(`• ${r.getCellValueAsString('Critère')} : ${r.getCellValueAsString('Réponse / valeur').slice(0, 160)}`); }
L.push('');
L.push('Rappel : aucun critère n’est validé automatiquement. Le dossier n’est complet que lorsque chaque critère obligatoire est Validé ou Non applicable.');
const synthese = L.join('\n');

let statutControle = 'À compléter';
if (!bloquants.length && !autres.length) statutControle = mine.every((r) => ['Validé', 'Non applicable'].includes(sel(r, 'Statut'))) ? 'Validé' : 'Complet – à valider';
const upd = { 'Synthèse du contrôle': synthese, 'Dernier contrôle': now.toISOString(), 'Statut contrôle dossier': { name: statutControle }, 'Lancer le contrôle': false };
const sc = sel(a, 'Statut commercial');
const pret = !bloquants.length && !autres.length;
if (pret && (/^[1-6]\./.test(sc))) {
  upd['Statut commercial'] = { name: '7. Prêt à transmettre' };
  upd['Prochaine action'] = { name: 'Transmettre à Cédric' };
  if (!a.getCellValue('Date prêt à transmettre')) upd['Date prêt à transmettre'] = now.toISOString();
} else if (!pret && signes >= 1 && (/^[1-5]\./.test(sc) || sc.startsWith('7.'))) {
  upd['Statut commercial'] = { name: '6. Signé – dossier à compléter' };
  upd['Prochaine action'] = { name: 'Compléter dossier' };
}
await A.updateRecordAsync(recordId, upd);

output.set('synthese', synthese);
output.set('sujet', `[MEB32] Contrôle dossier ${a.name} : ${statutControle}${bloquants.length + autres.length ? ` (${bloquants.length + autres.length} point(s) bloquant(s))` : ''}`);
output.set('nbBloquants', bloquants.length + autres.length);
