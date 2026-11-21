// MEB32 — Création des tâches depuis un compte rendu de RDV (script d'automatisation Airtable)
// Déclencheur : Comptes rendus, quand « Créer les tâches » est cochée.
// Entrée : recordId (ID du compte rendu).
// Format attendu dans « Actions extraites » : une action par ligne
//     Action | Responsable | Échéance (JJ/MM/AAAA)      (responsable et échéance facultatifs)
// Anti-doublon :
//   - un compte rendu déjà « Traité » ne recrée jamais de tâches ;
//   - un autre compte rendu traité avec le même « ID événement Google Calendar » → celui-ci est marqué « Ignoré » ;
//   - une tâche de même intitulé déjà rattachée à l'affaire n'est pas recréée.

const { recordId } = input.config();
const CR = base.getTable('Comptes rendus'), TA = base.getTable('Tâches');
const ids = (v) => (v || []).map((x) => x.id);
const sel = (r, f) => (r.getCellValue(f) ? r.getCellValue(f).name : '');
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
const cr = await CR.selectRecordAsync(recordId);
if (!cr) throw new Error('Compte rendu introuvable');
const now = new Date();
const finish = async (fields, msg) => { await CR.updateRecordAsync(recordId, { ...fields, 'Créer les tâches': false, 'Message traitement': msg }); output.set('message', msg); };

async function main() {
if (sel(cr, 'Statut traitement') === 'Traité') { await finish({}, 'Déjà traité : aucune tâche recréée.'); return; }
const eventId = cr.getCellValueAsString('ID événement Google Calendar').trim();
if (eventId) {
  const all = await CR.selectRecordsAsync({ fields: ['ID événement Google Calendar', 'Statut traitement'] });
  const twin = all.records.find((r) => r.id !== recordId && sel(r, 'Statut traitement') === 'Traité' &&
    r.getCellValueAsString('ID événement Google Calendar').trim() === eventId);
  if (twin) { await finish({ 'Statut traitement': { name: 'Ignoré' } }, `Doublon : l'événement ${eventId} a déjà un compte rendu (${twin.id}). Aucune tâche créée.`); return; }
}
const affaireId = ids(cr.getCellValue('Affaire'))[0];
if (!affaireId) { await finish({}, 'Rattacher d’abord le compte rendu à une affaire.'); return; }

const RESP = { thibaud: 'Thibaud', cedric: 'Cédric' };
const parseDate = (s) => {
  s = (s || '').trim();
  let m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? s : null;
};
const lignes = cr.getCellValueAsString('Actions extraites').split('\n')
  .map((l) => l.replace(/^\s*[-•*\d.)]+\s*/, '').trim()).filter(Boolean);

const tq = await TA.selectRecordsAsync({ fields: ['Intitulé', 'Affaire'] });
const deja = new Set(tq.records.filter((r) => ids(r.getCellValue('Affaire')).includes(affaireId)).map((r) => norm(r.getCellValueAsString('Intitulé'))));
const toCreate = []; let ignorees = 0;
for (const l of lignes) {
  const [titre, resp, ech] = l.split('|').map((x) => (x || '').trim());
  if (!titre) continue;
  if (deja.has(norm(titre))) { ignorees++; continue; }
  deja.add(norm(titre));
  const f = { 'Intitulé': titre, 'Affaire': [{ id: affaireId }], 'Comptes rendus': [{ id: recordId }], 'État': { name: 'À faire' }, 'Source': { name: 'Compte rendu RDV' } };
  f['Responsable'] = { name: RESP[norm(resp || '')] || (resp ? 'Autre' : 'Thibaud') };
  if (resp && !RESP[norm(resp)]) f['Commentaire'] = `Responsable indiqué : ${resp}`;
  const d = parseDate(ech); if (d) f['Échéance'] = d;
  toCreate.push({ fields: f });
}
for (let i = 0; i < toCreate.length; i += 50) await TA.createRecordsAsync(toCreate.slice(i, i + 50));
await finish({ 'Statut traitement': { name: 'Traité' }, 'Traité le': now.toISOString() },
  `${toCreate.length} tâche(s) créée(s)${ignorees ? `, ${ignorees} ignorée(s) car déjà existante(s)` : ''}.`);
}
await main();
