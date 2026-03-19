-- =============================================================================
-- SEED DE DONNÉES DE TEST — CRM MEB32 (secteur avicole)
-- À coller dans Supabase > SQL Editor > New query
-- =============================================================================

DO $$
DECLARE
  -- Contacts
  c_durant     uuid := gen_random_uuid();
  c_martin     uuid := gen_random_uuid();
  c_dupont     uuid := gen_random_uuid();
  c_lefebvre   uuid := gen_random_uuid();
  c_moreau     uuid := gen_random_uuid();
  c_girard     uuid := gen_random_uuid();
  c_chevalier  uuid := gen_random_uuid();
  c_bernard    uuid := gen_random_uuid();

  -- Affaires
  a_durant     uuid := gen_random_uuid();
  a_martin     uuid := gen_random_uuid();
  a_dupont     uuid := gen_random_uuid();
  a_collines   uuid := gen_random_uuid();
  a_lecomte    uuid := gen_random_uuid();

  -- Devis
  d_dupont     uuid := gen_random_uuid();
  d_collines   uuid := gen_random_uuid();
  d_lecomte    uuid := gen_random_uuid();

  -- Lots devis Dupont
  l_dupont_1   uuid := gen_random_uuid();
  l_dupont_2   uuid := gen_random_uuid();
  l_dupont_3   uuid := gen_random_uuid();
  l_dupont_4   uuid := gen_random_uuid();

  -- Lots devis Collines
  l_col_1      uuid := gen_random_uuid();
  l_col_2      uuid := gen_random_uuid();
  l_col_3      uuid := gen_random_uuid();

  -- Lots devis Lecomte
  l_lec_1      uuid := gen_random_uuid();
  l_lec_2      uuid := gen_random_uuid();
  l_lec_3      uuid := gen_random_uuid();

  -- Fournisseurs (récupérés depuis la table existante)
  f_skov       uuid;
  f_roxell     uuid;
  f_fancom     uuid;

BEGIN

  -- ---------------------------------------------------------------------------
  -- 1. Nettoyage des données de test existantes
  -- ---------------------------------------------------------------------------

  DELETE FROM devis_fournisseurs
    WHERE devis_id IN (
      SELECT d.id FROM devis d
      JOIN affaires a ON a.id = d.affaire_id
      WHERE a.nom ILIKE ANY(ARRAY['%EARL Durant%','%GAEC Martin%','%SCEA Dupont%','%Ferme des Collines%','%GFA Lecomte%'])
    );

  DELETE FROM devis_lots
    WHERE devis_id IN (
      SELECT d.id FROM devis d
      JOIN affaires a ON a.id = d.affaire_id
      WHERE a.nom ILIKE ANY(ARRAY['%EARL Durant%','%GAEC Martin%','%SCEA Dupont%','%Ferme des Collines%','%GFA Lecomte%'])
    );

  DELETE FROM devis
    WHERE affaire_id IN (
      SELECT id FROM affaires
      WHERE nom ILIKE ANY(ARRAY['%EARL Durant%','%GAEC Martin%','%SCEA Dupont%','%Ferme des Collines%','%GFA Lecomte%'])
    );

  DELETE FROM taches
    WHERE affaire_id IN (
      SELECT id FROM affaires
      WHERE nom ILIKE ANY(ARRAY['%EARL Durant%','%GAEC Martin%','%SCEA Dupont%','%Ferme des Collines%','%GFA Lecomte%'])
    );

  DELETE FROM evenements
    WHERE affaire_id IN (
      SELECT id FROM affaires
      WHERE nom ILIKE ANY(ARRAY['%EARL Durant%','%GAEC Martin%','%SCEA Dupont%','%Ferme des Collines%','%GFA Lecomte%'])
    );

  DELETE FROM batiments
    WHERE affaire_id IN (
      SELECT id FROM affaires
      WHERE nom ILIKE ANY(ARRAY['%EARL Durant%','%GAEC Martin%','%SCEA Dupont%','%Ferme des Collines%','%GFA Lecomte%'])
    );

  DELETE FROM affaire_contacts
    WHERE affaire_id IN (
      SELECT id FROM affaires
      WHERE nom ILIKE ANY(ARRAY['%EARL Durant%','%GAEC Martin%','%SCEA Dupont%','%Ferme des Collines%','%GFA Lecomte%'])
    );

  DELETE FROM affaires
    WHERE nom ILIKE ANY(ARRAY['%EARL Durant%','%GAEC Martin%','%SCEA Dupont%','%Ferme des Collines%','%GFA Lecomte%']);

  DELETE FROM contacts
    WHERE societe ILIKE ANY(ARRAY['%SKOV France%','%Roxell%','%Fancom%'])
       OR nom IN ('Durant','Martin','Dupont','Lefebvre','Moreau','Girard','Chevalier','Bernard');

  -- ---------------------------------------------------------------------------
  -- 2. Récupération des IDs fournisseurs existants
  -- ---------------------------------------------------------------------------

  SELECT id INTO f_skov    FROM fournisseurs WHERE nom ILIKE '%SKOV%'    LIMIT 1;
  SELECT id INTO f_roxell  FROM fournisseurs WHERE nom ILIKE '%Roxell%'  LIMIT 1;
  SELECT id INTO f_fancom  FROM fournisseurs WHERE nom ILIKE '%Fancom%'  LIMIT 1;

  -- ---------------------------------------------------------------------------
  -- 3. CONTACTS (8 contacts)
  -- ---------------------------------------------------------------------------

  INSERT INTO contacts (id, type_contact, nom, prenom, societe, telephone, email, fonction, notes) VALUES

  (c_durant, 'client', 'Durant', 'Michel', 'EARL Durant',
    '06 12 34 56 78', 'michel.durant@earl-durant.fr', 'Gérant',
    'Client fidèle. Bâtiment poulet chair existant à rénover. Très sensible au prix, compare systématiquement 3 offres.'),

  (c_martin, 'client', 'Martin', 'Sylvie', 'GAEC Martin & Fils',
    '06 23 45 67 89', 'sylvie.martin@gaec-martin.fr', 'Co-gérante',
    'Projet extension dinde. Son fils Antoine, 28 ans, est fortement impliqué dans les choix techniques.'),

  (c_dupont, 'client', 'Dupont', 'Jean-Pierre', 'SCEA Dupont Aviculture',
    '07 34 56 78 90', 'jp.dupont@scea-dupont.fr', 'Directeur',
    'Profil très technique. Intéressé par ventilation SKOV dernière génération. Concurrent Roxell déjà présent sur le dossier.'),

  (c_lefebvre, 'partenaire', 'Lefebvre', 'François', 'Chambre Agriculture Gers',
    '05 62 61 77 77', 'f.lefebvre@gers.chambagri.fr', 'Conseiller élevage',
    'Apporteur d''affaires fiable. Suit 4 éleveurs en projet. Commission 2% sur affaires apportées. Contact mensuel.'),

  (c_moreau, 'partenaire', 'Moreau', 'Claire', 'Groupement Avicole Sud-Ouest',
    '06 45 67 89 01', 'c.moreau@gaso.fr', 'Directrice technique',
    'Référente technique pour 12 éleveurs adhérents. Très prescriptrice. Invite régulièrement aux journées techniques.'),

  (c_girard, 'fournisseur', 'Girard', 'Thomas', 'SKOV France',
    '01 64 37 29 00', 't.girard@skov.com', 'Commercial Grand-Ouest',
    'Interlocuteur principal SKOV. Délai devis 5 jours ouvrés. Remise habituelle 8%. Très disponible.'),

  (c_chevalier, 'fournisseur', 'Chevalier', 'Marc', 'Roxell',
    '03 21 88 55 30', 'm.chevalier@roxell.com', 'Technico-commercial France',
    'Spécialiste alimentation automatique et cages enrichies. Réactif. Remise max 12% négociée sur gros volumes.'),

  (c_bernard, 'fournisseur', 'Bernard', 'Isabelle', 'Fancom',
    '04 72 53 15 00', 'i.bernard@fancom.com', 'Représentante France',
    'Référente contrôleurs Fancom. Délai installation 6 semaines. Stock parfois limité en haute saison.');

  -- ---------------------------------------------------------------------------
  -- 4. AFFAIRES (5 affaires)
  -- ---------------------------------------------------------------------------

  INSERT INTO affaires (id, nom, statut, sous_statut, type_projet, budget_estime, prochaine_action, risque, date_prochain_rdv) VALUES

  (a_durant,
    'EARL Durant – Rénovation poulet chair',
    'lead', 'a_contacter', 'renovation', 185000,
    'Envoyer plaquette SKOV + relancer sur budget', 'moyen',
    current_date + interval '7 days'),

  (a_martin,
    'GAEC Martin – Extension dinde 18 000 places',
    'decouverte', 'rdv_planifie', 'extension', 320000,
    'Attendre devis SKOV puis planifier R2', 'faible',
    current_date + interval '14 days'),

  (a_dupont,
    'SCEA Dupont – Neuf pondeuses 60 000 places',
    'devis_en_cours', 'devis_envoye', 'neuf', 540000,
    'Répondre contre-offre Roxell avant demain', 'eleve',
    current_date + interval '1 day'),

  (a_collines,
    'Ferme des Collines – Label poulet bio',
    'pret_r2', 'negociation', 'neuf', 210000,
    'Signature contrat prévu aujourd''hui', 'faible',
    current_date),

  (a_lecomte,
    'GFA Lecomte – Remplacement équipement canard',
    'negociation', 'closing', 'remplacement', 97000,
    'Préparer bon de commande pour closing après-demain', 'faible',
    current_date + interval '2 days');

  -- ---------------------------------------------------------------------------
  -- 5. AFFAIRE_CONTACTS
  -- ---------------------------------------------------------------------------

  INSERT INTO affaire_contacts (affaire_id, contact_id, role_dans_affaire, est_principal) VALUES
  (a_durant,   c_durant,    'Décideur',     true),
  (a_durant,   c_lefebvre,  'Apporteur',    false),
  (a_martin,   c_martin,    'Décideur',     true),
  (a_martin,   c_moreau,    'Prescripteur', false),
  (a_dupont,   c_dupont,    'Décideur',     true),
  (a_collines, c_lefebvre,  'Apporteur',    false),
  (a_lecomte,  c_moreau,    'Prescripteur', false);

  -- ---------------------------------------------------------------------------
  -- 6. BÂTIMENTS (2-3 par affaire)
  -- ---------------------------------------------------------------------------

  INSERT INTO batiments (affaire_id, nom, espece, nb_places, surface_m2, longueur_m, largeur_m, type_sol, acces_chantier, plans_disponibles) VALUES

  -- EARL Durant (rénovation – 2 bâtiments)
  (a_durant, 'Bâtiment A', 'poulet chair', 22000, 1440, 120, 12, 'béton', true, true),
  (a_durant, 'Bâtiment B', 'poulet chair', 20000, 1320, 110, 12, 'béton', true, false),

  -- GAEC Martin (extension – 2 bâtiments)
  (a_martin, 'Bâtiment extension Est', 'dinde', 18000, 2220, 148, 15, 'terre compactée', true, false),
  (a_martin, 'Bâtiment existant (référence)', 'dinde', 16000, 1820, 130, 14, 'béton', true, true),

  -- SCEA Dupont (neuf – 3 blocs)
  (a_dupont, 'Bloc A – pondeuses', 'pondeuse', 20000, 2250, 150, 15, 'béton', true, false),
  (a_dupont, 'Bloc B – pondeuses', 'pondeuse', 20000, 2250, 150, 15, 'béton', true, false),
  (a_dupont, 'Bloc C – pondeuses (phase 2)', 'pondeuse', 20000, 2250, 150, 15, 'béton', false, false),

  -- Ferme des Collines (neuf label – 2 bâtiments)
  (a_collines, 'Bâtiment Label 1', 'poulet label/bio', 6000, 1200, 100, 12, 'litière paillée', true, false),
  (a_collines, 'Bâtiment Label 2', 'poulet label/bio', 6000, 1200, 100, 12, 'litière paillée', true, false),

  -- GFA Lecomte (remplacement – 1 bâtiment)
  (a_lecomte, 'Bâtiment canard unique', 'canard', 8500, 1260, 105, 12, 'béton', true, true);

  -- ---------------------------------------------------------------------------
  -- 7. ÉVÉNEMENTS (3 dans J / J+1 / J+2 pour tester le bloc Agenda)
  -- ---------------------------------------------------------------------------

  INSERT INTO evenements (affaire_id, contact_id, type_evenement, titre, date_debut, date_fin, statut, lieu, compte_rendu, source_saisie) VALUES

  -- EARL Durant (2 passés)
  (a_durant, c_durant,
    'contact_initial', 'Appel entrant EARL Durant – rénovation poulet',
    now() - interval '88 days', now() - interval '88 days' + interval '30 minutes',
    'realise', 'Téléphone',
    'Appel suite fiche salon avicole Rennes. Très intéressé mais prudent sur le budget. Mentionne Big Dutchman déjà présent.',
    'manuel'),

  (a_durant, c_durant,
    'rdv_decouverte', 'Visite terrain EARL Durant',
    now() - interval '60 days', now() - interval '60 days' + interval '3 hours',
    'realise', 'EARL Durant – Auterive (31)',
    'Visite 2 bâtiments. Relevé dimensions complet. Michel + son fils présents. Bâtiment A prioritaire car moteurs en fin de vie.',
    'manuel'),

  -- GAEC Martin (2 passés)
  (a_martin, c_martin,
    'rdv_decouverte', 'R1 Découverte GAEC Martin',
    now() - interval '50 days', now() - interval '50 days' + interval '2 hours',
    'realise', 'GAEC Martin – L''Isle-Jourdain (32)',
    'Présentation gamme SKOV dinde. Sylvie et Antoine présents. Terrain disponible côté est. Financement CUMA envisagé.',
    'manuel'),

  (a_martin, c_martin,
    'rdv_offre', 'Point technique – validation plan masse',
    now() - interval '20 days', now() - interval '20 days' + interval '1 hour 30 minutes',
    'realise', 'Visioconférence',
    'Plan masse validé en principe. En attente devis SKOV final. Relancer Thomas Girard.',
    'manuel'),

  -- SCEA Dupont (1 passé + J+1)
  (a_dupont, c_dupont,
    'rdv_offre', 'R2 Présentation offre SCEA Dupont – 3 blocs pondeuses',
    now() - interval '35 days', now() - interval '35 days' + interval '2 hours 30 minutes',
    'realise', 'SCEA Dupont – Auch (32)',
    'Présentation chiffrée 3 blocs. Dupont très technique, demande comparatif conso SKOV vs Roxell. Roxell en embuscade.',
    'manuel'),

  (a_dupont, c_dupont,
    'rdv_offre', 'Réponse contre-offre Roxell – appel SCEA Dupont',
    now() + interval '1 day', now() + interval '1 day' + interval '1 hour',
    'planifie', 'Téléphone',
    null, 'manuel'),

  -- Ferme des Collines (AUJOURD'HUI)
  (a_collines, c_lefebvre,
    'rdv_offre', 'Signature contrat Ferme des Collines',
    now() + interval '2 hours', now() + interval '3 hours',
    'planifie', 'Notaire – Auch (32)',
    null, 'manuel'),

  -- GFA Lecomte (1 passé + J+2)
  (a_lecomte, c_moreau,
    'rdv_decouverte', 'Visite terrain initiale GFA Lecomte',
    now() - interval '105 days', now() - interval '105 days' + interval '2 hours',
    'realise', 'GFA Lecomte – Fleurance (32)',
    'Relevé complet bâtiment existant (2004). Charpente saine. Tout l''équipement à remplacer : ventilateurs, abreuvoirs, contrôleur.',
    'manuel'),

  (a_lecomte, null,
    'rdv_offre', 'Closing GFA Lecomte – signature bon de commande',
    now() + interval '2 days', now() + interval '2 days' + interval '1 hour 30 minutes',
    'planifie', 'GFA Lecomte – Fleurance (32)',
    null, 'manuel');

  -- ---------------------------------------------------------------------------
  -- 8. TÂCHES (urgences + dates dépassées pour tester dashboard)
  -- ---------------------------------------------------------------------------

  INSERT INTO taches (affaire_id, titre, description, type_tache, statut, priorite, contexte, date_echeance, duree_estimee_minutes, auto_planifiable, cree_par) VALUES

  -- EARL Durant
  (a_durant,
    'Envoyer plaquette produits SKOV rénovation',
    'Inclure fiche technique Tunnel 3.0 + référence GAEC Bouchet (40 km).',
    'email', 'a_faire', 'haute',
    'Client attend depuis la visite. Big Dutchman aussi dans la course.',
    current_date - interval '5 days', 20, false, 'Thibaud'),

  (a_durant,
    'Relancer Michel Durant sur retour plaquette',
    'Aucun retour depuis l''envoi. Appeler en début de semaine.',
    'appel', 'a_faire', 'haute',
    'Risque de laisser le terrain à Big Dutchman.',
    current_date - interval '2 days', 15, false, 'Thibaud'),

  (a_durant,
    'Préparer chiffrage préliminaire rénovation 2 bâtiments',
    'Baser sur relevé du 3 mai. Demander prix SKOV rénov moteurs + bardage isolation.',
    'devis', 'en_cours', 'moyenne',
    'Avant-projet à soumettre avant fin juillet.',
    current_date + interval '7 days', 90, true, 'Thibaud'),

  -- GAEC Martin
  (a_martin,
    'Relancer Thomas Girard (SKOV) pour devis extension dinde',
    'Réf devis SKOV-2025-EXT-MAR. Demandé il y a 3 semaines, pas de retour.',
    'fournisseur', 'a_faire', 'haute',
    'Le devis SKOV bloque tout : plan masse, chiffrage final, R2.',
    current_date - interval '3 days', 10, false, 'Thibaud'),

  (a_martin,
    'Préparer plan masse avec géomètre partenaire',
    'Terrain côté est. Dimensions à confirmer avec SKOV.',
    'action', 'bloquee', 'moyenne',
    'Bloqué en attente du devis SKOV.',
    current_date + interval '14 days', 120, false, 'Thibaud'),

  (a_martin,
    'Appel Antoine Martin – point avancement technique',
    'Le fils influence beaucoup la décision. Tenir informé régulièrement.',
    'appel', 'a_faire', 'basse',
    null,
    current_date + interval '3 days', 20, true, 'Thibaud'),

  -- SCEA Dupont (urgences)
  (a_dupont,
    'Finaliser contre-offre face à Roxell – URGENT',
    'Roxell a proposé -10% hier soir. Dupont attend notre réponse avant demain 18h.',
    'devis', 'en_cours', 'critique',
    'Possible concession : garantie 3 ans offerte sur ventilation sans surcoût.',
    current_date + interval '1 day', 60, false, 'Thibaud'),

  (a_dupont,
    'Préparer argumentaire différenciation SKOV vs Roxell',
    'Insister : SAV local, pièces 48h, 12 références dans le Gers.',
    'action', 'a_faire', 'haute',
    'Dupont est technique, les chiffres concrets font la différence.',
    current_date, 45, false, 'Thibaud'),

  (a_dupont,
    'Envoyer références clients pondeuses SKOV',
    'Liste de 5 références visitables dans un rayon de 100 km.',
    'email', 'termine', 'moyenne',
    null,
    current_date - interval '10 days', 15, false, 'Thibaud'),

  (a_dupont,
    'Organiser visite référence chez SCEA Lacombe',
    'Lacombe OK pour accueillir. Caler date post-négociation.',
    'visite', 'a_faire', 'basse',
    null,
    current_date + interval '10 days', 180, false, 'Thibaud'),

  -- Ferme des Collines
  (a_collines,
    'Vérifier conditions paiement avant signature',
    'Confirmer acompte 30% à la commande, 40% à la livraison, 30% à la réception.',
    'action', 'a_faire', 'critique',
    'Signature prévue ce matin chez le notaire.',
    current_date, 30, false, 'Thibaud'),

  (a_collines,
    'Préparer bon de commande label bio',
    'BC signé côté interne. Prêt à présenter.',
    'action', 'termine', 'haute',
    null,
    current_date - interval '2 days', 60, false, 'Thibaud'),

  (a_collines,
    'Envoyer plan de financement crédit-bail',
    'Option crédit-bail Crédit Agricole 7 ans envoyée.',
    'email', 'termine', 'moyenne',
    null,
    current_date - interval '7 days', 20, false, 'Thibaud'),

  -- GFA Lecomte
  (a_lecomte,
    'Préparer bon de commande GFA Lecomte',
    'Inclure délai livraison 14 semaines, garantie 2 ans, acompte 30%.',
    'action', 'a_faire', 'critique',
    'Closing après-demain sur site. BC doit être prêt la veille.',
    current_date + interval '1 day', 45, false, 'Thibaud'),

  (a_lecomte,
    'Confirmer stock contrôleurs Fancom T2 canard',
    'Vérifier disponibilité avant engagement ferme.',
    'fournisseur', 'a_faire', 'haute',
    'Appeler Isabelle Bernard : 04 72 53 15 00.',
    current_date, 15, false, 'Thibaud'),

  (a_lecomte,
    'Validation contrat par direction MEB32',
    'Direction doit relire et valider les conditions particulières.',
    'action', 'en_cours', 'haute',
    null,
    current_date - interval '1 day', 30, false, 'Thibaud');

  -- ---------------------------------------------------------------------------
  -- 9. DEVIS + LOTS + DEVIS_FOURNISSEURS
  -- ---------------------------------------------------------------------------

  -- ── Devis SCEA Dupont ──────────────────────────────────────────────────────

  INSERT INTO devis (id, affaire_id, statut, complet, base_batigest, notes) VALUES
  (d_dupont, a_dupont, 'envoye', false, false,
    'Offre 3 blocs 20 000 places. Option livraison phasée bloc C +6 mois. Concurrent Roxell -10%.');

  INSERT INTO devis_lots (id, devis_id, nom, description, statut, ordre) VALUES
  (l_dupont_1, d_dupont, 'Ventilation Blocs A+B',       'SKOV Tunnel 3.0 – 2 × 20 000 places pondeuses',       'chiffre',    1),
  (l_dupont_2, d_dupont, 'Ventilation Bloc C',           'SKOV Tunnel 3.0 – 20 000 places – phase 2',           'chiffre',    2),
  (l_dupont_3, d_dupont, 'Cages enrichies + alimentation','Roxell 60 000 places + chaîne alimentation auto',    'chiffre',    3),
  (l_dupont_4, d_dupont, 'Contrôle climatique',          'Contrôleurs Fancom T3 × 3 + sondes',                 'en_attente', 4);

  IF f_skov IS NOT NULL THEN
    INSERT INTO devis_fournisseurs (devis_id, fournisseur_id, lot_id, statut, date_demande, date_reception, resume_reponse) VALUES
    (d_dupont, f_skov, l_dupont_1, 'recu',
      current_date - interval '38 days', current_date - interval '30 days',
      'SKOV : 164 000 € HT lots A+B. Délai 16 semaines. Garantie 2 ans pièces/main-d''œuvre.'),
    (d_dupont, f_skov, l_dupont_2, 'recu',
      current_date - interval '38 days', current_date - interval '30 days',
      'SKOV : 82 000 € HT lot C (remise 5%). Phasage +6 mois sans surcoût.');
  END IF;

  IF f_roxell IS NOT NULL THEN
    INSERT INTO devis_fournisseurs (devis_id, fournisseur_id, lot_id, statut, date_demande, date_reception, resume_reponse) VALUES
    (d_dupont, f_roxell, l_dupont_3, 'recu',
      current_date - interval '35 days', current_date - interval '25 days',
      'Roxell : 195 000 € HT cages + alimentation. Contre-proposition -10% reçue hier.');
  END IF;

  IF f_fancom IS NOT NULL THEN
    INSERT INTO devis_fournisseurs (devis_id, fournisseur_id, lot_id, statut, date_demande, date_reception, resume_reponse) VALUES
    (d_dupont, f_fancom, l_dupont_4, 'demande_envoyee',
      current_date - interval '5 days', null, null);
  END IF;

  -- ── Devis Ferme des Collines ───────────────────────────────────────────────

  INSERT INTO devis (id, affaire_id, statut, complet, base_batigest, notes) VALUES
  (d_collines, a_collines, 'accepte', true, false,
    'Devis accepté. Conforme Label Rouge. Signature contrat aujourd''hui.');

  INSERT INTO devis_lots (id, devis_id, nom, description, statut, ordre) VALUES
  (l_col_1, d_collines, 'Ventilation naturelle + extraction', 'Systèmes 2 bâtiments label – trappes automatisées',             'chiffre', 1),
  (l_col_2, d_collines, 'Contrôle climatique label',          'Contrôleurs Fancom T1 Label × 2 – conformes cahier Loué',       'chiffre', 2),
  (l_col_3, d_collines, 'Pose et câblage',                    'Installation complète 2 bâtiments + mise en service',           'chiffre', 3);

  IF f_fancom IS NOT NULL THEN
    INSERT INTO devis_fournisseurs (devis_id, fournisseur_id, lot_id, statut, date_demande, date_reception, resume_reponse) VALUES
    (d_collines, f_fancom, l_col_2, 'recu',
      current_date - interval '28 days', current_date - interval '20 days',
      'Fancom : 6 400 € HT les 2 contrôleurs T1 Label. Délai 4 semaines. Stock disponible.');
  END IF;

  IF f_skov IS NOT NULL THEN
    INSERT INTO devis_fournisseurs (devis_id, fournisseur_id, lot_id, statut, date_demande, date_reception, resume_reponse) VALUES
    (d_collines, f_skov, l_col_1, 'recu',
      current_date - interval '28 days', current_date - interval '22 days',
      'SKOV : 76 000 € HT ventilation 2 bâtiments. Trappes incluses. Délai 10 semaines.');
  END IF;

  -- ── Devis GFA Lecomte ─────────────────────────────────────────────────────

  INSERT INTO devis (id, affaire_id, statut, complet, base_batigest, notes) VALUES
  (d_lecomte, a_lecomte, 'envoye', true, false,
    'Devis complet. Verbalement accepté. Closing après-demain. Délai livraison 14 semaines.');

  INSERT INTO devis_lots (id, devis_id, nom, description, statut, ordre) VALUES
  (l_lec_1, d_lecomte, 'Ventilation extracteurs + entrées d''air', 'Fancom 8 extracteurs + 40 entrées air auto', 'chiffre', 1),
  (l_lec_2, d_lecomte, 'Contrôle climatique canard',              'Fancom T2 canard + sonde CO2 + hygromètre',   'chiffre', 2),
  (l_lec_3, d_lecomte, 'Abreuvement nipple Roxell',               'Ligne nipple inox Roxell – 8 500 places',     'chiffre', 3);

  IF f_fancom IS NOT NULL THEN
    INSERT INTO devis_fournisseurs (devis_id, fournisseur_id, lot_id, statut, date_demande, date_reception, resume_reponse) VALUES
    (d_lecomte, f_fancom, l_lec_1, 'recu',
      current_date - interval '18 days', current_date - interval '12 days',
      'Fancom : 26 400 € HT ventilation complète. Délai 6 semaines. Remise 8% accordée.'),
    (d_lecomte, f_fancom, l_lec_2, 'recu',
      current_date - interval '18 days', current_date - interval '12 days',
      'Fancom : 4 200 € HT contrôleur T2 + capteurs. Stock confirmé.');
  END IF;

  IF f_roxell IS NOT NULL THEN
    INSERT INTO devis_fournisseurs (devis_id, fournisseur_id, lot_id, statut, date_demande, date_reception, resume_reponse) VALUES
    (d_lecomte, f_roxell, l_lec_3, 'recu',
      current_date - interval '15 days', current_date - interval '8 days',
      'Roxell : 19 800 € HT ligne nipple inox complète. Remise 10%. Pose non incluse.');
  END IF;

END $$;

-- =============================================================================
-- Vérifications rapides (à exécuter séparément après le DO block) :
--
--   select count(*) from contacts;             -- 8
--   select count(*) from affaires;             -- >= 5
--   select count(*) from affaire_contacts;     -- 7
--   select count(*) from batiments;            -- 10
--   select count(*) from evenements;           -- 9 (dont 3 futurs J/J+1/J+2)
--   select count(*) from taches;               -- 16
--   select count(*) from devis;                -- 3
--   select count(*) from devis_lots;           -- 10
--   select count(*) from devis_fournisseurs;   -- 2 à 9 selon fournisseurs présents
-- =============================================================================
