# CRM MEB32 — CLAUDE.md

## DÉMARRAGE DE SESSION
1. Lire tasks/lessons.md — leçons du projet
2. Lire tasks/todo.md — tâches en cours
3. Si bug Supabase : consulter les logs avant de coder

## STACK
- Next.js 14 + Supabase + Vercel
- Tailwind CSS + Glassmorphism design
- Deployment: Vercel (auto from GitHub)

## SUPABASE TABLES (NOMS EXACTS — CRITIQUE!)
- "Affaires" (sales pipeline)
- "Devis MEB" (quotes)
- "Prospects" (leads)
- "Relances" (follow-ups)
- "Planning" (calendar)
- "Dépenses" (expenses/mileage)

⚠️ CRITICAL: Table names have accents/spaces
→ Must match EXACTLY in .from() calls
→ Use: SELECT * FROM information_schema.tables to verify

## MARGIN FORMULA
(PV - PA) / PA * 100
(Sales Price - Purchase Price) / Purchase Price

## WORKFLOW

### 1. Planifier d'abord
- Toute tâche non-triviale = écrire dans tasks/todo.md
- Si bug : d'abord logs, puis root cause

### 2. Vérifier avant d'implémenter
- Code compiles? `npm run build`
- Tests pass? (si applicable)
- Responsive? (375px, 768px, 1024px, 1440px)

### 3. Dépannage Supabase
- Bug = chercher dans logs Supabase
- RLS permissions OK?
- Table name exact?

### 4. Marquer terminé
- Tester RÉELLEMENT (pas juste "compile")
- Vérifier sur Vercel preview avant merge

### 5. Apprendre
- Après chaque correction:
  [date] | problème | cause | solution

## LEÇONS APPRISES
(Claude remplit au fil du temps)

[2026-03-21] | Supabase table names | Accents/spaces ne sont PAS auto-converti | Copier le NOM EXACT de information_schema.tables
[2026-03-21] | Margin formula | (PV-PA)/PA pas (PV-PA)/PV | Toujours vérifier la logique métier d'abord