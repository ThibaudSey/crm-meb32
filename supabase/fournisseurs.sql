-- ============================================================
-- MODULE FOURNISSEURS — CRM MEB32
-- À coller dans l'éditeur SQL de Supabase (Dashboard > SQL Editor)
-- ============================================================

-- Table principale fournisseurs
create table if not exists fournisseurs (
  id                      uuid default gen_random_uuid() primary key,
  created_at              timestamp default now(),
  nom                     text not null,
  categorie               text,
  site_web                text,
  adresse                 text,
  statut                  text default 'actif',          -- actif | en_test | inactif | blacklisté
  note_fiabilite          integer default 0 check (note_fiabilite between 0 and 5),
  commentaire             text,
  remise_habituelle       numeric,
  delai_paiement          text,
  min_commande            numeric,
  zone_geo                text,
  certifications          text,
  obs_tarifaires          text,
  canal_devis_prefere     text,                           -- Email | Téléphone | Portail web | PDF
  email_devis             text,
  delai_reponse_habituel  text,
  infos_obligatoires      jsonb default '[]'::jsonb,
  infos_optionnelles      text,
  format_reponse          text,
  procedure_speciale      text,
  template_email          text
);

-- Contacts par fournisseur
create table if not exists fournisseurs_contacts (
  id               uuid default gen_random_uuid() primary key,
  fournisseur_id   uuid references fournisseurs(id) on delete cascade,
  prenom           text,
  nom              text,
  fonction         text,
  telephone        text,
  email            text,
  est_principal    boolean default false,
  notes            text
);

-- Gamme de produits par fournisseur
create table if not exists fournisseurs_produits (
  id               uuid default gen_random_uuid() primary key,
  fournisseur_id   uuid references fournisseurs(id) on delete cascade,
  nom              text,
  description      text,
  prix_min         numeric,
  prix_max         numeric,
  delai_livraison  text,
  points_forts     text,
  points_faibles   text
);

-- Historique des demandes de devis
create table if not exists demandes_devis_fournisseur (
  id                   uuid default gen_random_uuid() primary key,
  created_at           timestamp default now(),
  fournisseur_id       uuid references fournisseurs(id),
  affaire_id           uuid,                              -- references affaires(id) une fois la table créée
  date_envoi           date,
  montant_demande      numeric,
  delai_reponse_reel   integer,                           -- en jours
  montant_recu         numeric,
  statut               text default 'en_attente',         -- en_attente | reçu | refusé | annulé
  email_objet          text,
  email_corps          text,
  notes                text
);

-- ── Index pour les requêtes fréquentes ───────────────────────────────────────

create index if not exists idx_fournisseurs_categorie
  on fournisseurs(categorie);

create index if not exists idx_fournisseurs_statut
  on fournisseurs(statut);

create index if not exists idx_fournisseurs_contacts_fid
  on fournisseurs_contacts(fournisseur_id);

create index if not exists idx_fournisseurs_produits_fid
  on fournisseurs_produits(fournisseur_id);

create index if not exists idx_demandes_fid
  on demandes_devis_fournisseur(fournisseur_id);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- À activer si vous souhaitez restreindre l'accès par utilisateur

-- alter table fournisseurs enable row level security;
-- alter table fournisseurs_contacts enable row level security;
-- alter table fournisseurs_produits enable row level security;
-- alter table demandes_devis_fournisseur enable row level security;

-- ── Données de test (optionnel) ───────────────────────────────────────────────

insert into fournisseurs (nom, categorie, adresse, statut, note_fiabilite, email_devis, canal_devis_prefere, delai_reponse_habituel)
values
  ('Big Dutchman France',  'Abreuvement / Alimentation',  'ZI Le Gros Chêne, 35220 Châteaubourg', 'actif',   4, 'devis@bigdutchman.fr',  'Email',     '48h'),
  ('Fancom France',        'Télégestion / Capteurs',       'Vendée (85)',                          'actif',   5, 'france@fancom.com',     'Email',     '1 semaine'),
  ('SKOV Avicole',         'Ventilation / Climatisation',  'Lyon (69)',                            'actif',   4, 'devis@skov.fr',         'Email',     '48h'),
  ('Bâtivolaille',         'Structure / Bâtiment',         'Nantes (44)',                          'actif',   3, 'contact@bativolaille.fr','Téléphone', '2 semaines'),
  ('Agri-Concept',         'Structure / Bâtiment',         'Rennes (35)',                          'en_test', 3, 'devis@agri-concept.fr', 'Email',     '1 semaine'),
  ('Plasson France',       'Abreuvement / Alimentation',   'Angers (49)',                          'actif',   4, 'plasson@plasson.fr',    'Email',     '48h'),
  ('Aco Funki',            'Chauffage / Éclairage',        'Loudéac (22)',                         'actif',   4, 'devis@acofunki.fr',     'Email',     '1 semaine'),
  ('Sensor Line Avicole',  'Pesage',                       'Toulouse (31)',                        'en_test', 3, 'info@sensorline.fr',    'Email',     '2 semaines')
on conflict do nothing;

-- ════════════════════════════════════════════════════════════
-- INSTRUCTIONS D'INSTALLATION
-- ════════════════════════════════════════════════════════════
--
-- 1. Ouvrez votre projet Supabase → Dashboard
-- 2. Cliquez sur "SQL Editor" dans le menu gauche
-- 3. Cliquez sur "+ New query"
-- 4. Copiez-collez tout ce fichier dans l'éditeur
-- 5. Cliquez sur "Run" (bouton vert ou Ctrl+Entrée)
-- 6. Vérifiez dans "Table Editor" que les 4 tables sont créées
--
-- Pour connecter les pages Next.js à Supabase :
-- - Remplacez les mock data par des appels au client Supabase
-- - Exemple : import { supabase } from "@/lib/supabase"
--   const { data } = await supabase.from("fournisseurs").select("*")
--
-- ════════════════════════════════════════════════════════════
