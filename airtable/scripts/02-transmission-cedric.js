// MEB32 — Transmission d'un dossier à Cédric (script d'automatisation Airtable)
// Déclencheur : Affaires, quand « Demande de transmission » est cochée.
// Entrée : recordId (ID de l'affaire).
// Vérifie les conditions de transmission (formule « Conditions manquantes », calculée par Airtable).
//   - Conditions remplies : statut « 8. Transmis à Cédric », dates, auteur, et une tâche « Prendre en charge »
//     pour Cédric (créée une seule fois).
//   - Sinon : la demande est refusée, la case est décochée et le message liste ce qui manque.

const { recordId } = input.config();
const A = base.getTable('Affaires'), TA = base.getTable('Tâches');
const ids = (v) => (v || []).map((x) => x.id);
const a = await A.selectRecordAsync(recordId);
if (!a) throw new Error('Affaire introuvable : ' + recordId);

const statut = a.getCellValue('Statut commercial') ? a.getCellValue('Statut commercial').name : '';
if (statut.startsWith('8.') || statut.startsWith('9.')) {
  // déjà transmis : on ne retransmet pas, on ne réécrit pas les dates
  await A.updateRecordAsync(recordId, { 'Demande de transmission': false });
  output.set('transmis', false);
  output.set('message', `Dossier ${a.name} déjà transmis (${statut}) : rien n'a été modifié.`);
} else {
const manque = a.getCellValueAsString('Conditions manquantes').trim();
const ok = a.getCellValue('Transmissible') === 1 && manque === '';
const now = new Date();
const nowFr = now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

if (ok) {
  await A.updateRecordAsync(recordId, {
    'Statut commercial': { name: '8. Transmis à Cédric' },
    'Date prêt à transmettre': a.getCellValue('Date prêt à transmettre') || now.toISOString(),
    'Date transmission': now.toISOString(),
    'Transmis par': { name: 'Thibaud' },
    'Prochaine action': { name: 'Aucune' },
    'Demande de transmission': false,
    'Message transmission': `✅ Transmis à Cédric le ${nowFr}.`,
  });
  const titre = `Prendre en charge le dossier : ${a.name}`;
  const tq = await TA.selectRecordsAsync({ fields: ['Intitulé', 'Affaire'] });
  const existe = tq.records.some((r) => r.getCellValueAsString('Intitulé') === titre && ids(r.getCellValue('Affaire')).includes(recordId));
  if (!existe) {
    const due = new Date(now.getTime() + 2 * 86400000).toISOString().slice(0, 10);
    await TA.createRecordAsync({
      'Intitulé': titre, 'Affaire': [{ id: recordId }], 'Responsable': { name: 'Cédric' },
      'État': { name: 'À faire' }, 'Source': { name: 'Automatique' }, 'Échéance': due,
    });
  }
} else {
  await A.updateRecordAsync(recordId, {
    'Demande de transmission': false,
    'Message transmission': `⛔ Transmission refusée le ${nowFr}. À régler avant de redemander :\n${manque || '• Conditions non remplies'}`,
  });
}
output.set('transmis', ok);
output.set('message', ok ? `Dossier ${a.name} transmis à Cédric.` : `Transmission refusée pour ${a.name} :\n${manque}`);
}
