# Test du parcours complet (21/11/2026)

**Méthode.** Les scripts d'automatisation (`../scripts/*.js`) ont été exécutés par `run-script.mjs`, un petit adaptateur Node qui reproduit l'API de script d'Airtable sur l'API REST, contre la **vraie base**. Les formules, cumuls et automatisations existantes ont été calculés par Airtable lui-même.

**Non testé dans Airtable.** Les nouvelles automatisations, créées éteintes et dont trois attendent leur script, n'ont pas été exécutées par le moteur d'Airtable. L'élément « Revue des tâches » a été compilé et installé, mais pas ouvert dans un navigateur.

Dossier de démonstration : **« DEMO – EARL Exemple – Bâtiment 2 – Rénovation ventilation/chauffage »**. Client, contacts, devis et PDF sont fictifs.

| # | Étape | Résultat |
|---|---|---|
| 1 | Demande → affaire | Affaire créée ; statut `1. Demande reçue`, date et responsable complétés |
| 1b | Tâche « prochaine action » | 1 tâche créée pour Thibaud, échéance reprise de l'affaire |
| 1c | Même demande saisie deux fois | ✅ Alerte « Doublon possible avec … » ; le doublon est passé en `Abandonné` |
| 2 | Compte rendu de RDV (ID événement `DEMO-evt-0001`) | 3 tâches créées (responsables et échéances lus dans le texte) |
| 2b | Relance du même compte rendu | ✅ « Déjà traité : aucune tâche recréée » |
| 2c | Même événement réimporté dans un 2e compte rendu | ✅ Marqué `Ignoré`, aucune tâche créée |
| 3 | Devis v1 envoyé (PDF joint) + attente OP | Priorité `4 ⏳ Attente tiers` |
| 4 | Devis v2 signé (PDF signé joint), v1 → `Remplacé (archive)` | « Devis signés valides » = 1 |
| 5 | Contrôle | 21 critères créés (familles Ventilation, Chauffage, Abreuvement). 3 pré-remplis `Présent – à confirmer` à partir des données Airtable. **0 validé automatiquement** |
| 5b | Lecture IA du PDF signé (téléchargé depuis Airtable) + compte rendu | 18 critères annotés avec extrait et source. Contradictions marquées `Ambigu` (hauteur 2,60 / 2,80 m ; 36 / 40 trappes au même prix ; date des travaux sous réserve) |
| 6 | **Demande de transmission d'un dossier incomplet** | ✅ **Refusée** ; la case se décoche ; le message liste ce qui manque (date travaux, 20 critères, documents) ; statut inchangé |
| 7 | Questionnaire : réponses + validation par Thibaud, plan joint, date confirmée | 20 obligatoires `Validé` ; « Conditions manquantes » vide ; statut → `7. Prêt à transmettre` |
| 8 | Transmission | ✅ Statut `8. Transmis à Cédric`, date, « Transmis par Thibaud » ; **1** tâche « Prendre en charge » pour Cédric |
| 8b | Seconde demande sur un dossier déjà transmis | ✅ Rien n'est modifié (date de transmission inchangée). Défaut trouvé pendant le test, puis corrigé |
| 9 | Prise en charge par Cédric | Statut 9, date, « Pris en charge par Cédric » |
| 10 | Commande fournisseur (MATERLAP, délai 21 j) + 2 lignes + 2 étapes de chantier | Situation `À commander` ; commander au plus tard le 25/01/2027 |
| 10b | Livraison prévue la veille des travaux | ✅ Alerte « Livraison trop proche des travaux » |
| 10c | Case « Commander » (automatisation existante) | Statut `Commandée`. **Défaut trouvé** : la date de commande était figée au 08/07/2026. Brouillon corrigé, à publier |
| 11 | Réception partielle (8/8 extracteurs, 20/40 trappes) | ✅ `Reçue partiellement`, reste 20 ; étape de pose : « Attendu à temps » |
| 11b | Réception du solde | ✅ `Reçue totalement` ; étape de pose : « Tout reçu » |

Pages d'interface vérifiées après publication (lecture des enregistrements affichés) :
- « Mes affaires » montre Tachousin, avec la priorité « Attente tiers » ;
- « Dossiers transmis » montre le dossier DEMO ;
- « Mes tâches (Cédric) » montre la tâche issue du compte rendu.
