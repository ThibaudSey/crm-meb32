// ─── Types Supabase CRM MEB32 ─────────────────────────────────────────────────

export type Etape = "Prospection" | "R1 Découverte" | "R2 Proposition" | "Négociation" | "Signé" | "Perdu"
export type TypeProjet = "Neuf" | "Rénovation" | "Extension" | "Remplacement"
export type TypeInter = "Éleveur" | "Coopérative" | "Intégrateur"
export type Espece = "Poulet chair" | "Poulet label/bio" | "Dinde" | "Canard" | "Poule pondeuse"
export type Statut = "brouillon" | "envoye" | "accepte" | "refuse" | "expire"
export type FournisseurStatut = "actif" | "en_test" | "inactif" | "blacklisté"
export type TypeRDV = "Prospection" | "R1 Découverte" | "Visite terrain" | "R2 Proposition" | "Négociation" | "Suivi client"
export type Influence = "Fort" | "Moyen" | "Faible"
export type NoteType = "RDV" | "Visite" | "Appel"
export type TodoCat = "Relance" | "Admin" | "Technique" | "Urgence"

// ─── Affaires ─────────────────────────────────────────────────────────────────

export interface Affaire {
  id: string
  created_at: string
  prospect_id: string | null
  nom: string
  type_projet: string
  espece: string
  nb_places: number
  montant_estime: number
  cout_revient: number | null
  etape: string
  decision_prevue: string | null
  probabilite: number | null
  concurrent: string | null
  notes_concurrence: string | null
  soncas_dominant: string | null
}

// ─── Parties prenantes ────────────────────────────────────────────────────────

export interface PartiePrenante {
  id: string
  affaire_id: string
  nom: string
  role: string
  influence: string
}

// ─── Historique ───────────────────────────────────────────────────────────────

export interface HistoriqueNote {
  id: string
  affaire_id: string
  created_at: string
  type: string
  contenu: string
}

// ─── Todos ────────────────────────────────────────────────────────────────────

export interface Todo {
  id: string
  created_at: string
  texte: string
  date_limite: string
  fait: boolean
  urgent: boolean
  categorie: string
  affaire_id: string | null
}

// ─── Devis ────────────────────────────────────────────────────────────────────

export interface Devis {
  id: string
  created_at: string
  reference: string
  affaire_id: string | null
  total_ht: number
  cout_revient_total: number | null
  statut: Statut
  date_envoi: string | null
  notes: string | null
}

export interface DevisLigne {
  id: string
  devis_id: string
  designation: string
  quantite: number
  prix_unitaire: number
  remise_pct: number
  prix_revient: number
  ordre: number
}

// ─── RDVs ─────────────────────────────────────────────────────────────────────

export interface RDV {
  id: string
  created_at: string
  titre: string
  affaire_id: string | null
  prospect_id: string | null
  type_rdv: string
  date_rdv: string
  duree_min: number | null
  lieu: string
  notes_prep: string | null
  fait: boolean
}

// ─── Frais ────────────────────────────────────────────────────────────────────

export interface FraisEntry {
  id: string
  created_at: string
  date: string
  categorie: string
  description: string
  affaire_id: string | null
  montant_ttc: number
  montant_ht: number | null
  tva: number | null
  justificatif_url: string | null
}

export interface KmEntry {
  id: string
  created_at: string
  date: string
  depart: string
  arrivee: string
  km: number
  aller_retour: boolean
  motif: string
  affaire_id: string | null
  vehicule: string
  puissance_fiscale: number
  taux_ik: number
  indemnite: number
  mois: number | null
  annee: number | null
}

export interface Vehicule {
  id: string
  nom: string
  immatriculation: string
  puissance_fiscale: number
  type_vehicule: string
  est_defaut: boolean
}

// ─── Fournisseurs ─────────────────────────────────────────────────────────────

export interface Fournisseur {
  id: string
  created_at: string
  nom: string
  categorie: string | null
  site_web: string | null
  adresse: string | null
  statut: string
  note_fiabilite: number
  commentaire: string | null
  remise_habituelle: number | null
  delai_paiement: string | null
  min_commande: number | null
  zone_geo: string | null
  certifications: string | null
  obs_tarifaires: string | null
  canal_devis_prefere: string | null
  email_devis: string | null
  delai_reponse_habituel: string | null
  infos_obligatoires: InfoOblig[]
  infos_optionnelles: string | null
  format_reponse: string | null
  procedure_speciale: string | null
  template_email: string | null
}

export interface FournisseurContact {
  id: string
  fournisseur_id: string
  prenom: string | null
  nom: string | null
  fonction: string | null
  telephone: string | null
  email: string | null
  est_principal: boolean
  notes: string | null
}

export interface FournisseurProduit {
  id: string
  fournisseur_id: string
  nom: string
  description: string | null
  prix_min: number | null
  prix_max: number | null
  delai_livraison: string | null
  points_forts: string | null
  points_faibles: string | null
}

export interface DemandeDevisFournisseur {
  id: string
  created_at: string
  fournisseur_id: string
  affaire_id: string | null
  date_envoi: string | null
  montant_demande: number | null
  delai_reponse_reel: number | null
  montant_recu: number | null
  statut: string
  email_objet: string | null
  email_corps: string | null
  notes: string | null
}

export interface InfoOblig {
  id: number
  libelle: string
  type: "texte" | "nombre" | "plan" | "photo"
  obligatoire: boolean
}
