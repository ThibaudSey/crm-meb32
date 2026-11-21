// MEB32 — Initialisation d'une nouvelle affaire (script d'automatisation Airtable)
// Déclencheur : Affaires, quand « Nom affaire » et « Client » sont renseignés et qu'aucune tâche n'est rattachée.
// Entrée : recordId.
//   1. Contrôle des doublons : signale (sans bloquer) une affaire active du même client sur le même site / code postal.
//   2. Crée la tâche « prochaine action » (une seule fois : l'automatisation ne se déclenche que si l'affaire n'a aucune tâche).

const { recordId } = input.config();
const A = base.getTable('Affaires'), TA = base.getTable('Tâches');
const ids = (v) => (v || []).map((x) => x.id);
const sel = (r, f) => (r.getCellValue(f) ? r.getCellValue(f).name : '');
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const a = await A.selectRecordAsync(recordId);
if (!a) throw new Error('Affaire introuvable');

const all = await A.selectRecordsAsync({ fields: ['Nom affaire', 'Client', 'Site / bâtiment', 'Code postal', 'Commune', 'Statut commercial'] });
const clientIds = ids(a.getCellValue('Client'));
const site = norm(a.getCellValueAsString('Site / bâtiment')), cp = norm(a.getCellValueAsString('Code postal')), commune = norm(a.getCellValueAsString('Commune'));
const proches = all.records.filter((r) => r.id !== recordId && !['Perdu', 'Abandonné'].includes(sel(r, 'Statut commercial')) &&
  ids(r.getCellValue('Client')).some((c) => clientIds.includes(c)) &&
  ((site && norm(r.getCellValueAsString('Site / bâtiment')) === site) || (cp && norm(r.getCellValueAsString('Code postal')) === cp) ||
   (commune && norm(r.getCellValueAsString('Commune')) === commune) || (!site && !cp && !commune)));
const alerte = proches.length ? `⚠ Doublon possible avec : ${proches.map((r) => `${r.name} (${sel(r, 'Statut commercial') || 'sans statut'})`).join(' ; ')}. Vérifier avant de continuer.` : '';

const action = sel(a, 'Prochaine action');
const detail = a.getCellValueAsString('Prochaine action – détail');
const titre = `${detail || (action && action !== 'Aucune' ? action : 'Qualifier la demande et fixer la prochaine action')} – ${a.name}`;
const f = { 'Intitulé': titre, 'Affaire': [{ id: recordId }], 'Responsable': { name: sel(a, 'Responsable') || 'Thibaud' }, 'État': { name: 'À faire' }, 'Source': { name: 'Automatique' } };
const ech = a.getCellValue('Échéance prochaine action'); if (ech) f['Échéance'] = ech;
await TA.createRecordAsync(f);

const upd = { 'Alerte doublon': alerte };
if (!a.getCellValue('Statut commercial')) upd['Statut commercial'] = { name: '1. Demande reçue' };
if (!a.getCellValue('Date demande')) upd['Date demande'] = new Date().toISOString().slice(0, 10);
if (!a.getCellValue('Responsable')) upd['Responsable'] = { name: 'Thibaud' };
await A.updateRecordAsync(recordId, upd);
output.set('alerte', alerte);
