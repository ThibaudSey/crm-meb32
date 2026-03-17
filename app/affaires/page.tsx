"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, ChevronRight, Download } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"
import LoadingSpinner from "@/components/LoadingSpinner"
import ErrorMessage from "@/components/ErrorMessage"
import { supabase } from "@/lib/supabase"
import type { Affaire } from "@/lib/types"
import { exportToCSV, fmtDateExport } from "@/lib/export"

// ─── Badge styles ─────────────────────────────────────────────────────────────

// DB → display label mappings
const ETAPE_LABEL: Record<string, string> = {
  prospection: "Prospection",
  r1:          "R1 Découverte",
  r2:          "R2 Proposition",
  negociation: "Négociation",
  signe:       "Signé",
  perdu:       "Perdu",
}

const TYPE_INTER_LABEL: Record<string, string> = {
  eleveur:     "Éleveur",
  cooperative: "Coopérative",
  integrateur: "Intégrateur",
}

const TYPE_PROJET_LABEL: Record<string, string> = {
  neuf:         "Neuf",
  renovation:   "Rénovation",
  extension:    "Extension",
  remplacement: "Remplacement",
}

const ETAPE_STYLE: Record<string, string> = {
  prospection: "bg-white/10 border border-white/20 text-white/60",
  r1:          "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300",
  r2:          "bg-amber-500/20 border border-amber-500/40 text-amber-300",
  negociation: "bg-violet-500/20 border border-violet-500/40 text-violet-300",
  signe:       "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",
  perdu:       "bg-red-500/20 border border-red-500/40 text-red-300",
}

const TYPE_PROJET_STYLE: Record<string, string> = {
  neuf:         "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300",
  renovation:   "bg-amber-500/20 border border-amber-500/40 text-amber-300",
  extension:    "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",
  remplacement: "bg-red-500/20 border border-red-500/40 text-red-300",
}

// Filter options use DB values (prefixed "Toutes" for no filter)
const ETAPES_OPTIONS: string[] = [
  "Toutes", "prospection", "r1", "r2", "negociation", "signe", "perdu",
]

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €"
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AffairesPage() {
  const router = useRouter()
  const [affaires, setAffaires] = useState<Affaire[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtreEtape, setFiltreEtape] = useState<string>("Toutes")
  const [recherche, setRecherche]     = useState("")
  const [navigueVers, setNavigueVers] = useState("")

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

  const affairesFiltrees = affaires.filter((a) => {
    const matchEtape = filtreEtape === "Toutes" || a.etape === filtreEtape
    const matchRecherche =
      a.nom.toLowerCase().includes(recherche.toLowerCase()) ||
      a.espece.toLowerCase().includes(recherche.toLowerCase())
    return matchEtape && matchRecherche
  })

  function handleSelectNavigate(id: string) {
    setNavigueVers(id)
    if (id) router.push(`/affaires/${id}`)
  }

  function exportAffaires() {
    exportToCSV(
      affaires.map((a) => ({
        structure:    a.nom,
        typeInter:    TYPE_INTER_LABEL[a.type_interlocuteur] ?? a.type_interlocuteur,
        typeProjet:   TYPE_PROJET_LABEL[a.type_projet] ?? a.type_projet,
        espece:       a.espece,
        nbPlaces:     a.nb_places,
        montant:      a.montant_estime,
        marge:        a.marge,
        etape:        ETAPE_LABEL[a.etape] ?? a.etape,
        concurrent:   a.concurrent ?? "",
        dateDecision: fmtDateExport(a.decision_prevue ?? ""),
        probabilite:  "",
        soncas:       a.soncas ?? "",
      })),
      `affaires-MEB32-${new Date().toISOString().slice(0, 7)}.csv`,
      [
        { key: "structure",    label: "Nom affaire"       },
        { key: "typeInter",    label: "Prospect"          },
        { key: "typeProjet",   label: "Type projet"       },
        { key: "espece",       label: "Espèce"            },
        { key: "nbPlaces",     label: "Nb places"         },
        { key: "montant",      label: "Montant estimé €"  },
        { key: "marge",        label: "Marge %"           },
        { key: "etape",        label: "Étape"             },
        { key: "concurrent",   label: "Concurrent"        },
        { key: "dateDecision", label: "Date décision"     },
        { key: "probabilite",  label: "Probabilité %"     },
        { key: "soncas",       label: "SONCAS dominant"   },
      ]
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
          <TopBar title="Affaires" />
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
          <TopBar title="Affaires" />
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
        <TopBar title="Affaires" actions={
          <button
            onClick={exportAffaires}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.25)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(99,102,241,0.15)")}
          >
            <Download size={13} /> Exporter
          </button>
        } />

        <main className="flex-1 p-5 md:p-6 pb-20 md:pb-6 space-y-4">

          {/* Barre d'outils */}
          {/* Mobile : recherche + bouton créer */}
          <div className="flex items-center gap-2 md:hidden">
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 flex-1"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <Search size={15} className="shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} />
              <input
                type="text"
                placeholder="Rechercher…"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="bg-transparent text-sm text-[#f1f5f9] outline-none w-full"
                style={{ caretColor: "#a5b4fc" }}
              />
            </div>
            <button className="btn-primary rounded-xl flex items-center gap-1.5 text-sm font-semibold px-3 py-2.5 shrink-0">
              <Plus size={16} />
            </button>
          </div>
          {/* Mobile : pills filtre étape */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:hidden" style={{ scrollbarWidth: "none" }}>
            {ETAPES_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setFiltreEtape(e)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={filtreEtape === e
                  ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }
                  : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }
                }
              >
                {e === "Toutes" ? "Toutes" : (ETAPE_LABEL[e] ?? e)}
              </button>
            ))}
          </div>
          {/* Desktop : barre complète */}
          <div className="hidden md:flex flex-wrap items-center gap-3">

            {/* Sélecteur navigation rapide */}
            <select
              value={navigueVers}
              onChange={(e) => handleSelectNavigate(e.target.value)}
              className="select-glass min-w-[220px]"
            >
              <option value="">Accéder à une affaire…</option>
              {affaires.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom}
                </option>
              ))}
            </select>

            {/* Filtre étape */}
            <select
              value={filtreEtape}
              onChange={(e) => setFiltreEtape(e.target.value)}
              className="select-glass"
            >
              {ETAPES_OPTIONS.map((e) => (
                <option key={e} value={e}>{e === "Toutes" ? "Toutes" : (ETAPE_LABEL[e] ?? e)}</option>
              ))}
            </select>

            {/* Recherche */}
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 flex-1 min-w-[180px] max-w-xs"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <Search size={15} className="shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} />
              <input
                type="text"
                placeholder="Rechercher une structure…"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="bg-transparent text-sm text-[#f1f5f9] outline-none w-full"
                style={{ caretColor: "#a5b4fc" }}
              />
            </div>

            {/* Bouton créer */}
            <button className="btn-primary rounded-xl ml-auto flex items-center gap-2 text-sm font-semibold px-4 py-2.5">
              <Plus size={16} />
              Nouvelle affaire
            </button>
          </div>

          {/* Compteur */}
          <p className="text-sm text-white/50">
            {affairesFiltrees.length} affaire{affairesFiltrees.length !== 1 ? "s" : ""} ·{" "}
            <span className="font-medium" style={{ color: "#f1f5f9" }}>
              {fmt(affairesFiltrees.reduce((s, a) => s + (a.montant_estime ?? 0), 0))} total
            </span>
          </p>

          {/* ── Vue mobile : Cards ── */}
          <div className="md:hidden space-y-3">
            {affairesFiltrees.length === 0 && (
              <div className="glass rounded-2xl py-12 text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                Aucune affaire ne correspond à ces filtres.
              </div>
            )}
            {affairesFiltrees.map((a) => (
              <div
                key={a.id}
                onClick={() => router.push(`/affaires/${a.id}`)}
                className="glass p-4 cursor-pointer active:opacity-80 transition-opacity"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-bold text-sm" style={{ color: "#f1f5f9" }}>{a.nom}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{TYPE_INTER_LABEL[a.type_interlocuteur] ?? a.type_interlocuteur}</p>
                  </div>
                  <span className="text-base font-bold whitespace-nowrap" style={{ color: "#10b981" }}>
                    {fmt(a.montant_estime ?? 0)}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${ETAPE_STYLE[a.etape] ?? "bg-white/10 text-white/50"}`}>
                    {ETAPE_LABEL[a.etape] ?? a.etape}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${TYPE_PROJET_STYLE[a.type_projet] ?? "bg-white/10 text-white/50"}`}>
                    {TYPE_PROJET_LABEL[a.type_projet] ?? a.type_projet}
                  </span>
                  <span className="text-xs ml-auto font-semibold" style={{
                    color: a.marge >= 35 ? "#10b981" : a.marge >= 30 ? "#f59e0b" : "#ef4444"
                  }}>
                    {a.marge}%
                  </span>
                </div>
                <p className="text-xs mt-2 pt-2" style={{ color: "rgba(255,255,255,0.4)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  → {a.prochaine_action ?? "—"}
                </p>
              </div>
            ))}
          </div>

          {/* ── Vue desktop : Tableau ── */}
          <div className="hidden md:block glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-glass w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-5 py-3">Structure</th>
                    <th className="text-left px-4 py-3">Étape</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Type projet</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Espèce</th>
                    <th className="text-right px-4 py-3">Montant</th>
                    <th className="text-right px-4 py-3 hidden lg:table-cell">Marge</th>
                    <th className="text-left px-4 py-3 hidden xl:table-cell">Prochaine action</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {affairesFiltrees.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => router.push(`/affaires/${a.id}`)}
                      className="cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-[#f1f5f9]">{a.nom}</div>
                        <div className="text-xs text-white/50">{TYPE_INTER_LABEL[a.type_interlocuteur] ?? a.type_interlocuteur}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${ETAPE_STYLE[a.etape] ?? "bg-white/10 text-white/50"}`}>
                          {ETAPE_LABEL[a.etape] ?? a.etape}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${TYPE_PROJET_STYLE[a.type_projet] ?? "bg-white/10 text-white/50"}`}>
                          {TYPE_PROJET_LABEL[a.type_projet] ?? a.type_projet}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell text-white/50 text-xs">
                        {a.espece}
                        <div className="text-white/35">{(a.nb_places ?? 0).toLocaleString("fr-FR")} pl.</div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold whitespace-nowrap amount">
                        {fmt(a.montant_estime ?? 0)}
                      </td>
                      <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                        <span
                          className="font-semibold"
                          style={{
                            color: a.marge >= 35 ? "#10b981" : a.marge >= 30 ? "#f59e0b" : "#ef4444",
                          }}
                        >
                          {a.marge}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-white/50 hidden xl:table-cell max-w-[200px]">
                        {a.prochaine_action ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <ChevronRight
                          size={16}
                          className="inline-block transition-colors text-white/30 group-hover:text-[#a5b4fc]"
                        />
                      </td>
                    </tr>
                  ))}

                  {affairesFiltrees.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-sm text-white/35">
                        Aucune affaire ne correspond à ces filtres.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
