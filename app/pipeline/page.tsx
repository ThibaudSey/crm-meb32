"use client"

import { useState, useEffect } from "react"
import { Plus, X, ArrowRight, Loader2 } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"
import LoadingSpinner from "@/components/LoadingSpinner"
import ErrorMessage from "@/components/ErrorMessage"
import { supabase } from "@/lib/supabase"
import type { Affaire } from "@/lib/types"

// ─── Types locaux ─────────────────────────────────────────────────────────────

type TypeProjet = "Neuf" | "Rénovation" | "Extension" | "Remplacement"
type TypeInter = "Éleveur" | "Coopérative" | "Intégrateur"
type Espece = "Poulet chair" | "Poulet label/bio" | "Dinde" | "Canard" | "Poule pondeuse"

// ─── DB value mappings ────────────────────────────────────────────────────────

const ETAPE_MAP: Record<string, string> = {
  "Prospection":    "prospection",
  "R1 Découverte":  "r1",
  "R2 Proposition": "r2",
  "Négociation":    "negociation",
  "Signé":          "signe",
}

const TYPE_INTER_MAP: Record<string, string> = {
  "Éleveur":     "eleveur",
  "Coopérative": "cooperative",
  "Intégrateur": "integrateur",
}

const TYPE_PROJET_MAP: Record<string, string> = {
  "Neuf":         "neuf",
  "Rénovation":   "renovation",
  "Extension":    "extension",
  "Remplacement": "remplacement",
}

// ─── DB → label mappings (for display) ───────────────────────────────────────

const TYPE_PROJET_LABEL: Record<string, string> = {
  neuf:         "Neuf",
  renovation:   "Rénovation",
  extension:    "Extension",
  remplacement: "Remplacement",
}

const TYPE_INTER_LABEL: Record<string, string> = {
  eleveur:     "Éleveur",
  cooperative: "Coopérative",
  integrateur: "Intégrateur",
}

// ─── Config colonnes ──────────────────────────────────────────────────────────

const ETAPES: { label: string; dbValue: string; dot: string }[] = [
  { label: "Prospection",    dbValue: "prospection", dot: "bg-white/40"    },
  { label: "R1 Découverte",  dbValue: "r1",          dot: "bg-indigo-400"  },
  { label: "R2 Proposition", dbValue: "r2",          dot: "bg-amber-400"   },
  { label: "Négociation",    dbValue: "negociation", dot: "bg-violet-400"  },
  { label: "Signé",          dbValue: "signe",       dot: "bg-emerald-400" },
]

const ETAPE_SUIVANTE: Record<string, string | null> = {
  "prospection": "r1",
  "r1":          "r2",
  "r2":          "negociation",
  "negociation": "signe",
  "signe":       null,
}

// ─── Badge styles ─────────────────────────────────────────────────────────────

const TYPE_PROJET_STYLE: Record<string, string> = {
  neuf:         "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300",
  renovation:   "bg-amber-500/20 border border-amber-500/40 text-amber-300",
  extension:    "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",
  remplacement: "bg-red-500/20 border border-red-500/40 text-red-300",
}

const TYPE_INTER_STYLE: Record<string, string> = {
  eleveur:     "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",
  cooperative: "bg-violet-500/20 border border-violet-500/40 text-violet-300",
  integrateur: "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €"
}

// ─── Formulaire vide ──────────────────────────────────────────────────────────

const FORM_VIDE = {
  structure: "",
  type_inter: "Éleveur" as TypeInter,
  type_projet: "Neuf" as TypeProjet,
  espece: "Poulet chair" as Espece,
  nb_places: "",
  montant_estime: "",
  date_decision: "",
  concurrent: "",
  etape: "Prospection",
}

// ─── Composant Card ───────────────────────────────────────────────────────────

function AffaireCard({
  affaire,
  onAvancer,
}: {
  affaire: Affaire
  onAvancer: (id: string) => void
}) {
  const peutAvancer = ETAPE_SUIVANTE[affaire.etape] !== null
  const etapeConfig = ETAPES.find(e => e.dbValue === affaire.etape)

  return (
    <div
      className="glass p-4 flex flex-col gap-2.5 transition-shadow hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-[#f1f5f9] text-sm leading-tight">{affaire.nom}</p>
      </div>

      {/* Badges type projet + interlocuteur */}
      <div className="flex flex-wrap gap-1">
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_PROJET_STYLE[affaire.type_projet] ?? "bg-white/10 text-white/50"}`}>
          {TYPE_PROJET_LABEL[affaire.type_projet] ?? affaire.type_projet}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_INTER_STYLE[affaire.type_interlocuteur] ?? "bg-white/10 text-white/50"}`}>
          {TYPE_INTER_LABEL[affaire.type_interlocuteur] ?? affaire.type_interlocuteur}
        </span>
      </div>

      {/* Espèce */}
      <p className="text-xs text-white/50">{affaire.espece} · {(affaire.nb_places ?? 0).toLocaleString("fr-FR")} places</p>

      {/* Montant + bouton */}
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-sm font-bold" style={{ color: "#10b981" }}>{fmt(affaire.montant_estime ?? 0)}</span>
        {peutAvancer && (
          <button
            onClick={() => onAvancer(affaire.id)}
            title={`Avancer vers ${etapeConfig ? ETAPES[ETAPES.indexOf(etapeConfig) + 1]?.label : ""}`}
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
        Décision : {affaire.decision_prevue ? new Date(affaire.decision_prevue).toLocaleDateString("fr-FR") : "—"}
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
  onAjouter: (a: Omit<Affaire, "id" | "created_at" | "notes_concurrence" | "soncas">) => Promise<void>
}) {
  const [form, setForm] = useState(FORM_VIDE)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function set(k: keyof typeof FORM_VIDE, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.structure || !form.montant_estime) return
    setSubmitting(true)
    setFormError(null)
    try {
      await onAjouter({
        nom:                form.structure,
        type_interlocuteur: TYPE_INTER_MAP[form.type_inter] ?? "eleveur",
        type_projet:        TYPE_PROJET_MAP[form.type_projet] ?? "neuf",
        espece:             form.espece,
        nb_places:          parseInt(form.nb_places) || 0,
        montant_estime:     parseInt(form.montant_estime) || 0,
        marge:              0,
        decision_prevue:    form.date_decision || null,
        concurrent:         form.concurrent || null,
        etape:              ETAPE_MAP[form.etape] ?? "prospection",
        prochaine_action:   null,
      })
      onClose()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur lors de la création")
    } finally {
      setSubmitting(false)
    }
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
          {formError && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
              {formError}
            </div>
          )}
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
                value={form.type_inter}
                onChange={(e) => set("type_inter", e.target.value)}
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
                value={form.type_projet}
                onChange={(e) => set("type_projet", e.target.value)}
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
                value={form.nb_places}
                onChange={(e) => set("nb_places", e.target.value)}
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
                value={form.montant_estime}
                onChange={(e) => set("montant_estime", e.target.value)}
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
                value={form.date_decision}
                onChange={(e) => set("date_decision", e.target.value)}
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
                <option key={e.label} value={e.label}>{e.label}</option>
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
              disabled={submitting}
              className="btn-primary rounded-xl flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Création…</> : "Créer l'affaire"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [affaires, setAffaires] = useState<Affaire[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOuvert, setModalOuvert] = useState(false)
  const [filtreEtapeMobile, setFiltreEtapeMobile] = useState<string>("Toutes")

  useEffect(() => { fetchAffaires() }, [])

  async function fetchAffaires() {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from("affaires")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      setAffaires(data || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement des affaires")
    } finally {
      setLoading(false)
    }
  }

  async function avancerAffaire(id: string) {
    const affaire = affaires.find((a) => a.id === id)
    if (!affaire) return
    const suivante = ETAPE_SUIVANTE[affaire.etape]
    if (!suivante) return
    await supabase.from("affaires").update({ etape: suivante }).eq("id", id)
    setAffaires((prev) =>
      prev.map((a) => (a.id === id ? { ...a, etape: suivante } : a))
    )
  }

  async function ajouterAffaire(
    data: Omit<Affaire, "id" | "created_at" | "notes_concurrence" | "soncas">
  ) {
    const { error } = await supabase.from("affaires").insert([data])
    if (error) {
      console.error("Supabase error details:", error)
      throw error
    }
    await fetchAffaires()
  }

  // Totaux par colonne
  function colStats(dbValue: string) {
    const items = affaires.filter((a) => a.etape === dbValue)
    return {
      items,
      total: items.reduce((s, a) => s + (a.montant_estime ?? 0), 0),
    }
  }

  const affairesMobileFiltrees =
    filtreEtapeMobile === "Toutes"
      ? affaires
      : affaires.filter((a) => {
          const etapeConfig = ETAPES.find(e => e.label === filtreEtapeMobile)
          return a.etape === etapeConfig?.dbValue
        })

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
          <TopBar title="Pipeline" />
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
          <TopBar title="Pipeline" />
          <div className="flex-1 p-6">
            <ErrorMessage message={error} onRetry={fetchAffaires} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title="Pipeline" />

        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">

          {/* Header actions – desktop uniquement */}
          <div className="hidden md:flex items-center justify-between mb-5">
            <div>
              <p className="text-sm text-white/70">
                {affaires.length} affaires ·{" "}
                <span className="font-semibold" style={{ color: "#f1f5f9" }}>
                  {fmt(affaires.reduce((s, a) => s + (a.montant_estime ?? 0), 0))} en pipeline
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

          {/* ── Vue mobile : pills + liste ── */}
          <div className="md:hidden">
            {/* Résumé */}
            <p className="text-xs text-white/50 mb-3">
              {affaires.length} affaires ·{" "}
              <span className="text-white/70 font-medium">
                {fmt(affaires.reduce((s, a) => s + (a.montant_estime ?? 0), 0))}
              </span>
            </p>

            {/* Pills filtre scrollables */}
            <div
              className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4"
              style={{ scrollbarWidth: "none" }}
            >
              {(["Toutes", ...ETAPES.map((e) => e.label)]).map((etapeLabel) => {
                const active = filtreEtapeMobile === etapeLabel
                const count =
                  etapeLabel === "Toutes"
                    ? affaires.length
                    : affaires.filter((a) => {
                        const cfg = ETAPES.find(e => e.label === etapeLabel)
                        return a.etape === cfg?.dbValue
                      }).length
                return (
                  <button
                    key={etapeLabel}
                    onClick={() => setFiltreEtapeMobile(etapeLabel)}
                    className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all"
                    style={
                      active
                        ? {
                            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                            color: "#fff",
                            boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
                          }
                        : {
                            background: "rgba(255,255,255,0.07)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "rgba(255,255,255,0.6)",
                          }
                    }
                  >
                    {etapeLabel}
                    <span className="text-[11px] font-bold opacity-70">({count})</span>
                  </button>
                )
              })}
            </div>

            {/* Liste des affaires filtrées */}
            <div className="space-y-3">
              {affairesMobileFiltrees.length === 0 && (
                <div className="glass rounded-2xl py-12 flex items-center justify-center text-sm text-white/30">
                  Aucune affaire
                </div>
              )}
              {affairesMobileFiltrees.map((a) => (
                <AffaireCard key={a.id} affaire={a} onAvancer={avancerAffaire} />
              ))}
            </div>
          </div>

          {/* ── Vue desktop : Kanban board ── */}
          <div className="hidden md:flex gap-4 overflow-x-auto pb-4">
            {ETAPES.map(({ label, dbValue, dot }) => {
              const { items, total } = colStats(dbValue)
              return (
                <div key={dbValue} className="flex-shrink-0 w-64 flex flex-col gap-3">
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

      {/* FAB mobile */}
      <button
        onClick={() => setModalOuvert(true)}
        className="fab md:hidden"
        aria-label="Nouvelle affaire"
      >
        <Plus size={24} />
      </button>

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
