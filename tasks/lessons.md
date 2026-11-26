# Leçons apprises — CRM MEB32

## Supabase
[2026-03-21] | Table names exact | "Devis MEB" not "devis_meb" | Always copy from information_schema

## Design/UX
[2026-03-21] | Glassmorphism on dark | Looks premium but needs good contrast | Use white text on semi-transparent backdrop
## Données métier
[2026-11-26] | Source des données CRM | Supposé Supabase (stack du repo), mais le CRM réellement utilisé est la base Airtable « MEB32 – Gestion commerciale et chantiers » (appdLfACDzwzveC6H) ; le projet Supabase est en pause | Toujours vérifier la base Airtable avant de lire/écrire des données métier
[2026-11-26] | Planning chantiers | Le calendrier semestriel Excel (formes dessinées) n'était pas exploitable | Chantiers saisis dans Airtable (table Chantiers), raisonner en semaines ISO (S1…S52) ; page « Planning chantiers » dans l'interface Cédric
