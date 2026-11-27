# Leçons apprises — CRM MEB32

## Supabase
[2026-03-21] | Table names exact | "Devis MEB" not "devis_meb" | Always copy from information_schema

## Design/UX
[2026-03-21] | Glassmorphism on dark | Looks premium but needs good contrast | Use white text on semi-transparent backdrop
## Airtable
[2026-11-21] | Le connecteur MCP Airtable ne crée ni tables, ni champs, ni enregistrements | Outils absents | Passer par l'API REST avec un jeton (api.airtable.com + content.airtable.com pour les pièces jointes)
[2026-11-21] | create_automation refuse l'action « Exécuter un script » | INVALID_PERMISSIONS | Créer le déclencheur avec une action provisoire qui refuse par défaut, puis coller le script à la main
[2026-11-21] | Automatisations existantes avec une date figée (08/07/2026) | Valeur littérale au lieu de la date du jour | Utiliser getWorkflowExecutionTime / l'heure d'exécution
[2026-11-21] | Retransmission d'un dossier déjà transmis | Aucun contrôle du statut avant d'écrire | Toujours vérifier l'état courant avant une transition
[2026-11-27] | Modification en masse de tâches | Recherche par mot-clé (« Lafforgue ») qui a trouvé 2 tâches au lieu d'une | Lister les enregistrements trouvés avant de modifier
[2026-11-27] | Deux sessions Claude sur la même base | Données créées sans que l'autre session le sache | Une conversation de pilotage unique ; airtable/MODE-EMPLOI.md
