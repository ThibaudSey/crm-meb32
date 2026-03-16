"use client"

import { useState } from "react"
import { Plus, X, ArrowRight, AlertTriangle, ChevronDown } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"

// ─── Types ────────────────────────────────────────────────────────────────────

type Etape = "Prospection" | "R1 Découverte" | "R2 Proposition" | "Négociation" | "Signé"
type TypeProjet = "Neuf" | "Rénovation" | "Extension" | "Remplacement"
type TypeInter = "Éleveur" | "Coopérative" | "Intégrateur"
type Espece = "Poulet chair" | "Poulet label/bio" | "Dinde" | "Canard" | "Poule pondeuse"

interface Affaire {
  id: number
  structure: string
  typeProjet: TypeProjet
  espece: Espece
  montant: number
  typeInter: TypeInter
  etape: Etape
  nbPlaces: number
  dateDecision: string
  concurrent?: string
  joursDevisSansRetour?: number
}

// ─── Données fictives ─────────────────────────────────────────────────────────

const AFFAIRES_INIT: Affaire[] = [
  {
    id: 1,
    structure: "EARL Morin",
    typeProjet: "Neuf",
    espece: "Poulet chair",
    montant: 48000,
    typeInter: "Éleveur",
    etape: "R2 Proposition",
    nbPlaces: 22000,
    dateDecision: "2026-04-15",
    concurrent: "Bâtivolaille",
    joursDevisSansRetour: 9,
  },
  {
    id: 2,
    structure: "Gauthier Volailles",
    typeProjet: "Extension",
    espece: "Poulet label/bio",
    montant: 32500,
    typeInter: "Éleveur",
    etape: "Négociation",
    nbPlaces: 11000,
    dateDecision: "2026-03-28",
    joursDevisSansRetour: 8,
  },
  {
    id: 3,
    structure: "SAS Lefèvre Avicole",
    typeProjet: "Rénovation",
    espece: "Poule pondeuse",
    montant: 21000,
    typeInter: "Coopérative",
    etape: "Signé",
    nbPlaces: 30000,
    dateDecision: "2026-03-10",
  },
  {
    id: 4,
    structure: "GAEC du Bocage",
    typeProjet: "Neuf",
    espece: "Dinde",
    montant: 67000,
    typeInter: "Intégrateur",
    etape: "R1 Découverte",
    nbPlaces: 8000,
    dateDecision: "2026-05-20",
    concurrent: "Agri-Concept",
  },
  {
    id: 5,
    structure: "Ferme Dupont",
    typeProjet: "Remplacement",
    espece: "Poulet chair",
    montant: 14200,
    typeInter: "Éleveur",
    etape: "Prospection",
    nbPlaces: 18000,
    dateDecision: "2026-06-01",
  },
  {
    id: 6,
    structure: "Coopérative Arvor",
    typeProjet: "Extension",
    espece: "Canard",
    montant: 53000,
    typeInter: "Coopérative",
    etape: "R2 Proposition",
    nbPlaces: 6000,
    dateDecision: "2026-04-30",
    joursDevisSansRetour: 3,
  },
  {
    id: 7,
    structure: "SCEA Bretagne Plumes",
    typeProjet: "Neuf",
    espece: "Poulet label/bio",
    montant: 89000,
    typeInter: "Éleveur",
    etape: "R1 Découverte",
    nbPlaces: 4500,
    dateDecision: "2026-07-10",
  },
  {
    id: 8,
    structure: "Élevages Martin",
    typeProjet: "Rénovation",
    espece: "Poule pondeuse",
    montant: 27500,
    typeInter: "Éleveur",
    etape: "Négociation",
    nbPlaces: 40000,
    dateDecision: "2026-03-25",
    concurrent: "Volaferm",
  },
  {
    id: 9,
    structure: "EARL Renard & Fils",
    typeProjet: "Neuf",
    espece: "Dinde",
    montant: 74000,
    typeInter: "Intégrateur",
    etape: "Prospection",
    nbPlaces: 10000,
    dateDecision: "2026-08-01",
  },
  {
    id: 10,
    structure: "GFA des Charentes",
    typeProjet: "Extension",
    espece: "Canard",
    montant: 38000,
    typeInter: "Coopérative",
    etape: "R1 Découverte",
    nbPlaces: 7500,
    dateDecision: "2026-05-05",
  },
]

// ─── Config colonnes ──────────────────────────────────────────────────────────

const ETAPES: { label: Etape; dot: string }[] = [
  { label: "Prospection",    dot: "bg-white/40"    },
  { label: "R1 Découverte",  dot: "bg-indigo-400"  },
  { label: "R2 Proposition", dot: "bg-amber-400"   },
  { label: "Négociation",    dot: "bg-violet-400"  },
  { label: "Signé",          dot: "bg-emerald-400" },
]

const ETAPE_SUIVANTE: Record<Etape, Etape | null> = {
  "Prospection":    "R1 Découverte",
  "R1 Découverte":  "R2 Proposition",
  "R2 Proposition": "Négociation",
  "Négociation":    "Signé",
  "Signé":          null,
}

// ─── Badge styles ─────────────────────────────────────────────────────────────

const TYPE_PROJET_STYLE: Record<TypeProjet, string> = {
  Neuf:         "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300",
  Rénovation:   "bg-amber-500/20 border border-amber-500/40 text-amber-300",
  Extension:    "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",
  Remplacement: "bg-red-500/20 border border-red-500/40 text-red-300",
}

const TYPE_INTER_STYLE: Record<TypeInter, string> = {
  Éleveur:      "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",
  Coopérative:  "bg-violet-500/20 border border-violet-500/40 text-violet-300",
  Intégrateur:  "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €"
}

// ─── Formulaire vide ──────────────────────────────────────────────────────────

const FORM_VIDE = {
  structure: "",
  typeInter: "Éleveur" as TypeInter,
  typeProjet: "Neuf" as TypeProjet,
  espece: "Poulet chair" as Espece,
  nbPlaces: "",
  montant: "",
  dateDecision: "",
  concurrent: "",
  etape: "Prospection" as Etape,
}

// ─── Composant Card ───────────────────────────────────────────────────────────

function AffaireCard({
  affaire,
  onAvancer,
}: {
  affaire: Affaire
  onAvancer: (id: number) => void
}) {
  const relance = (affaire.joursDevisSansRetour ?? 0) >= 7
  const peutAvancer = ETAPE_SUIVANTE[affaire.etape] !== null

  return (
    <div
      className="glass p-4 flex flex-col gap-2.5 transition-shadow hover:shadow-md"
      style={relance ? { border: "1px solid rgba(251,146,60,0.5)" } : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-[#f1f5f9] text-sm leading-tight">{affaire.structure}</p>
        {relance && (
          <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold bg-orange-500/20 border border-orange-500/40 text-orange-300 px-1.5 py-0.5 rounded-full">
            <AlertTriangle size={10} />
            Relance !
          </span>
        )}
      </div>

      {/* Badges type projet + interlocuteur */}
      <div className="flex flex-wrap gap-1">
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_PROJET_STYLE[affaire.typeProjet]}`}>
          {affaire.typeProjet}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_INTER_STYLE[affaire.typeInter]}`}>
          {affaire.typeInter}
        </span>
      </div>

      {/* Espèce */}
      <p className="text-xs text-white/50">{affaire.espece} · {affaire.nbPlaces.toLocaleString("fr-FR")} places</p>

      {/* Montant + bouton */}
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-sm font-bold" style={{ color: "#10b981" }}>{fmt(affaire.montant)}</span>
        {peutAvancer && (
          <button
            onClick={() => onAvancer(affaire.id)}
            title={`Avancer vers ${ETAPE_SUIVANTE[affaire.etape]}`}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* Info décision */}
      <p className="text-[11px] text-white/35 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        Décision : {new Date(affaire.dateDecision).toLocaleDateString("fr-FR")}
        {affaire.concurrent && (
          <span className="ml-1 text-white/35">· {affaire.concurrent}</span>
        )}
      </p>
    </div>
  )
}

// ─── Composant Modal ──────────────────────────────────────────────────────────

function ModalNouvelleAffaire({
  onClose,
  onAjouter,
}: {
  onClose: () => void
  onAjouter: (a: Affaire) => void
}) {
  const [form, setForm] = useState(FORM_VIDE)

  function set(k: keyof typeof FORM_VIDE, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.structure || !form.montant) return
    onAjouter({
      id: Date.now(),
      structure: form.structure,
      typeInter: form.typeInter as TypeInter,
      typeProjet: form.typeProjet as TypeProjet,
      espece: form.espece as Espece,
      nbPlaces: parseInt(form.nbPlaces) || 0,
      montant: parseInt(form.montant) || 0,
      dateDecision: form.dateDecision || "2026-12-31",
      concurrent: form.concurrent || undefined,
      etape: form.etape as Etape,
    })
    onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header modal */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <h2 className="font-semibold text-[#f1f5f9] text-base">Nouvelle affaire</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nom structure */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">
              Nom de la structure <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.structure}
              onChange={(e) => set("structure", e.target.value)}
              placeholder="EARL Morin…"
              required
              className="input-glass w-full"
            />
          </div>

          {/* Ligne type inter + type projet */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Type interlocuteur</label>
              <select
                value={form.typeInter}
                onChange={(e) => set("typeInter", e.target.value)}
                className="select-glass w-full"
              >
                {(["Éleveur", "Coopérative", "Intégrateur"] as TypeInter[]).map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Type projet</label>
              <select
                value={form.typeProjet}
                onChange={(e) => set("typeProjet", e.target.value)}
                className="select-glass w-full"
              >
                {(["Neuf", "Rénovation", "Extension", "Remplacement"] as TypeProjet[]).map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Espèce */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">Espèce élevée</label>
            <select
              value={form.espece}
              onChange={(e) => set("espece", e.target.value)}
              className="select-glass w-full"
            >
              {(["Poulet chair", "Poulet label/bio", "Dinde", "Canard", "Poule pondeuse"] as Espece[]).map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Nb places + Montant */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Nb de places estimé</label>
              <input
                type="number"
                value={form.nbPlaces}
                onChange={(e) => set("nbPlaces", e.target.value)}
                placeholder="22 000"
                min={0}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">
                Montant estimé (€) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={form.montant}
                onChange={(e) => set("montant", e.target.value)}
                placeholder="48 000"
                min={0}
                required
                className="input-glass w-full"
              />
            </div>
          </div>

          {/* Date décision + concurrent */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Date décision prévue</label>
              <input
                type="date"
                value={form.dateDecision}
                onChange={(e) => set("dateDecision", e.target.value)}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Concurrent identifié</label>
              <input
                type="text"
                value={form.concurrent}
                onChange={(e) => set("concurrent", e.target.value)}
                placeholder="Bâtivolaille…"
                className="input-glass w-full"
              />
            </div>
          </div>

          {/* Étape initiale */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">Étape initiale</label>
            <select
              value={form.etape}
              onChange={(e) => set("etape", e.target.value)}
              className="select-glass w-full"
            >
              {ETAPES.map((e) => (
                <option key={e.label}>{e.label}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary rounded-xl flex-1 py-2.5 text-sm font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-primary rounded-xl flex-1 py-2.5 text-sm font-semibold"
            >
              Créer l'affaire
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [affaires, setAffaires] = useState<Affaire[]>(AFFAIRES_INIT)
  const [modalOuvert, setModalOuvert] = useState(false)

  function avancerAffaire(id: number) {
    setAffaires((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a
        const suivante = ETAPE_SUIVANTE[a.etape]
        return suivante ? { ...a, etape: suivante, joursDevisSansRetour: undefined } : a
      })
    )
  }

  function ajouterAffaire(a: Affaire) {
    setAffaires((prev) => [a, ...prev])
  }

  // Totaux par colonne
  function colStats(etape: Etape) {
    const items = affaires.filter((a) => a.etape === etape)
    return {
      items,
      total: items.reduce((s, a) => s + a.montant, 0),
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title="Pipeline" />

        <main className="flex-1 p-5 md:p-6 pb-20 md:pb-6">

          {/* Header actions */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm text-white/70">
                {affaires.length} affaires ·{" "}
                <span className="font-semibold" style={{ color: "#f1f5f9" }}>
                  {fmt(affaires.reduce((s, a) => s + a.montant, 0))} en pipeline
                </span>
              </p>
            </div>
            <button
              onClick={() => setModalOuvert(true)}
              className="btn-primary rounded-xl flex items-center gap-2 text-sm font-semibold px-4 py-2.5"
            >
              <Plus size={16} />
              Nouvelle affaire
            </button>
          </div>

          {/* Kanban board */}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {ETAPES.map(({ label, dot }) => {
              const { items, total } = colStats(label)
              return (
                <div
                  key={label}
                  className="flex-shrink-0 w-64 flex flex-col gap-3"
                >
                  {/* En-tête colonne */}
                  <div className="glass px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                      <span className="font-semibold text-[#f1f5f9] text-sm">{label}</span>
                      <span className="ml-auto text-xs font-bold text-white/70 bg-white/10 px-1.5 py-0.5 rounded-full">
                        {items.length}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 pl-4">{fmt(total)}</p>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-3 min-h-[120px]">
                    {items.length === 0 && (
                      <div className="rounded-2xl border-2 border-dashed border-white/20 py-8 flex items-center justify-center text-xs text-white/30">
                        Aucune affaire
                      </div>
                    )}
                    {items.map((a) => (
                      <AffaireCard key={a.id} affaire={a} onAvancer={avancerAffaire} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </main>
      </div>

      {/* Modal */}
      {modalOuvert && (
        <ModalNouvelleAffaire
          onClose={() => setModalOuvert(false)}
          onAjouter={ajouterAffaire}
        />
      )}
    </div>
  )
}
