"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, AlertTriangle, ChevronRight, Download, X, Loader2 } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"
import LoadingSpinner from "@/components/LoadingSpinner"
import ErrorMessage from "@/components/ErrorMessage"
import { supabase } from "@/lib/supabase"
import type { Devis, Affaire } from "@/lib/types"
import { exportToCSV, fmtDateExport } from "@/lib/export"

// ─── Types locaux ─────────────────────────────────────────────────────────────

type Statut = "brouillon" | "envoye" | "accepte" | "refuse" | "expire"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function joursSansRetour(dateEnvoi: string | null): number | null {
  if (!dateEnvoi) return null
  return Math.floor((Date.now() - new Date(dateEnvoi).getTime()) / 86400000)
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €"
}

const STATUT_STYLE: Record<Statut, { badge: string; label: string }> = {
  brouillon: { badge: "bg-white/10 border border-white/20 text-white/60",               label: "Brouillon" },
  envoye:    { badge: "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300",   label: "Envoyé"    },
  accepte:   { badge: "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",label: "Accepté"   },
  refuse:    { badge: "bg-red-500/20 border border-red-500/40 text-red-300",            label: "Refusé"    },
  expire:    { badge: "bg-orange-500/20 border border-orange-500/40 text-orange-300",   label: "Expiré"    },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Modal Nouveau Devis ──────────────────────────────────────────────────────

const TYPE_PROJETS = ["Neuf", "Rénovation", "Extension", "Remplacement"]

function ModalNouveauDevis({
  affaires,
  onClose,
  onCreated,
}: {
  affaires: Pick<Affaire, "id" | "nom">[]
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    client: "",
    type_projet: "Neuf",
    affaire_id: "",
    concurrent: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setF(k: keyof typeof form, v: string) {
    setForm(p => ({ ...p, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client) { setError("Le nom du client est obligatoire"); return }
    setSubmitting(true)
    setError(null)
    try {
      const year = new Date().getFullYear()
      const ref = `DEV-${year}-${String(Date.now()).slice(-4)}`
      const { error: insertError } = await supabase.from("devis").insert({
        reference:   ref,
        client:      form.client,
        type_projet: form.type_projet,
        affaire_id:  form.affaire_id || null,
        concurrent:  form.concurrent || null,
        total_ht:    0,
        marge:       0,
        statut:      "brouillon",
        date_envoi:  null,
      })
      if (insertError) throw insertError
      onCreated()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <h2 className="font-semibold text-[#f1f5f9] text-base">Nouveau devis</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "rgba(255,255,255,0.5)" }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">
              Client <span className="text-red-400">*</span>
            </label>
            <input
              type="text" value={form.client}
              onChange={e => setF("client", e.target.value)}
              placeholder="EARL Morin…" required
              className="input-glass w-full"
              style={{ fontSize: "16px" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Type projet</label>
              <select value={form.type_projet} onChange={e => setF("type_projet", e.target.value)} className="select-glass w-full">
                {TYPE_PROJETS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Concurrent</label>
              <input
                type="text" value={form.concurrent}
                onChange={e => setF("concurrent", e.target.value)}
                placeholder="Bâtivolaille…"
                className="input-glass w-full"
                style={{ fontSize: "16px" }}
              />
            </div>
          </div>
          {affaires.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Affaire liée (optionnel)</label>
              <select value={form.affaire_id} onChange={e => setF("affaire_id", e.target.value)} className="select-glass w-full">
                <option value="">— Aucune affaire —</option>
                {affaires.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary rounded-xl flex-1 py-2.5 text-sm font-medium">
              Annuler
            </button>
            <button
              type="submit" disabled={submitting}
              className="btn-primary rounded-xl flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Création…</> : "Créer le devis"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DevisPage() {
  const router = useRouter()
  const [devis, setDevis] = useState<Devis[]>([])
  const [affaires, setAffaires] = useState<Pick<Affaire, "id" | "nom">[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewDevis, setShowNewDevis] = useState(false)

  useEffect(() => { fetchDevis(); fetchAffaires() }, [])

  async function fetchAffaires() {
    const { data } = await supabase.from("affaires").select("id, nom").order("nom")
    setAffaires(data || [])
  }

  async function fetchDevis() {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from("devis")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      setDevis(data || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement des devis")
    } finally {
      setLoading(false)
    }
  }

  const devisAvecJours = devis.map((d) => ({
    ...d,
    jours: joursSansRetour(d.date_envoi),
  }))

  const devisARelancer = devisAvecJours.filter(
    (d) => d.statut === "envoye" && (d.jours ?? 0) > 7
  )

  function exportDevisData() {
    const today = Date.now()
    exportToCSV(
      devis.map((d) => {
        const margeEur    = Math.round(d.total_ht * d.marge / 100)
        const coutRevient = d.total_ht - margeEur
        const jours = d.date_envoi
          ? Math.floor((today - new Date(d.date_envoi).getTime()) / 86400000)
          : null
        return {
          ref:          d.reference,
          client:       d.client,
          typeProjet:   d.type_projet,
          totalHT:      d.total_ht,
          coutRevient,
          margeEur,
          margePct:     d.marge,
          statut:       d.statut,
          dateCreation: "",
          dateEnvoi:    fmtDateExport(d.date_envoi),
          jours:        jours ?? "",
        }
      }),
      `devis-MEB32-${new Date().toISOString().slice(0, 7)}.csv`,
      [
        { key: "ref",          label: "Référence"           },
        { key: "client",       label: "Client"              },
        { key: "typeProjet",   label: "Type projet"         },
        { key: "totalHT",      label: "Total HT €"          },
        { key: "coutRevient",  label: "Coût revient €"      },
        { key: "margeEur",     label: "Marge €"             },
        { key: "margePct",     label: "Marge %"             },
        { key: "statut",       label: "Statut"              },
        { key: "dateCreation", label: "Date création"       },
        { key: "dateEnvoi",    label: "Date envoi"          },
        { key: "jours",        label: "Jours sans retour"   },
      ]
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
          <TopBar title="Devis" />
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
          <TopBar title="Devis" />
          <div className="flex-1 p-6">
            <ErrorMessage message={error} onRetry={fetchDevis} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title="Devis" actions={
          <button
            onClick={exportDevisData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.25)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(99,102,241,0.15)")}
          >
            <Download size={13} /> Exporter
          </button>
        } />

        <main className="flex-1 p-5 md:p-6 pb-20 md:pb-6 space-y-4">

          {/* ── Alerte devis sans retour ── */}
          {devisARelancer.length > 0 && (
            <div className="alert-amber">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div className="text-sm">
                <span className="font-semibold">
                  {devisARelancer.length} devis sans retour depuis + 7 jours :
                </span>{" "}
                {devisARelancer.map((d, i) => (
                  <span key={d.id}>
                    <button
                      onClick={() => router.push(`/devis/${d.id}`)}
                      className="font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
                    >
                      {d.reference}
                    </button>{" "}
                    ({d.client}, J+{d.jours})
                    {i < devisARelancer.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Header actions ── */}
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              {devisAvecJours.length} devis ·{" "}
              <span className="font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                {fmt(devisAvecJours.reduce((s, d) => s + d.total_ht, 0))} total HT
              </span>
            </p>
            <button
              onClick={() => setShowNewDevis(true)}
              className="btn-primary rounded-xl flex items-center gap-2 text-sm font-semibold px-4 py-2.5"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Nouveau devis</span>
              <span className="sm:hidden">Nouveau</span>
            </button>
          </div>

          {/* ── Vue mobile : Cards ── */}
          <div className="md:hidden space-y-3">
            {devisAvecJours.map((d) => {
              const relance = d.statut === "envoye" && (d.jours ?? 0) > 7
              const statutKey = d.statut as Statut
              return (
                <div
                  key={d.id}
                  onClick={() => router.push(`/devis/${d.id}`)}
                  className="glass p-4 cursor-pointer active:opacity-80 transition-opacity"
                  style={relance ? { border: "1px solid rgba(249,115,22,0.4)" } : undefined}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-bold text-sm" style={{ color: "#f1f5f9" }}>{d.client}</p>
                      <p className="text-xs font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{d.reference}</p>
                    </div>
                    <span className="text-base font-bold whitespace-nowrap" style={{ color: "#10b981" }}>
                      {fmt(d.total_ht)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${STATUT_STYLE[statutKey]?.badge ?? "bg-white/10 text-white/50"}`}>
                      {STATUT_STYLE[statutKey]?.label ?? d.statut}
                    </span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{d.type_projet}</span>
                    <span className="text-xs font-semibold ml-auto" style={{
                      color: d.marge >= 32 ? "#10b981" : d.marge >= 25 ? "#f59e0b" : "#ef4444"
                    }}>
                      Marge {d.marge}%
                    </span>
                  </div>
                  {relance && (
                    <div className="flex items-center gap-1 mt-2 text-xs font-medium" style={{ color: "#fb923c" }}>
                      <AlertTriangle size={12} /> Relancer — J+{d.jours} sans retour
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Vue desktop : Tableau ── */}
          <div className="hidden md:block glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-glass w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-5 py-3">Référence</th>
                    <th className="text-left px-4 py-3">Client</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Type projet</th>
                    <th className="text-right px-4 py-3">Total HT</th>
                    <th className="text-right px-4 py-3 hidden md:table-cell">Marge</th>
                    <th className="text-left px-4 py-3">Statut</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Date envoi</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Sans retour</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {devisAvecJours.map((d) => {
                    const relance = d.statut === "envoye" && (d.jours ?? 0) > 7
                    const statutKey = d.statut as Statut
                    return (
                      <tr
                        key={d.id}
                        onClick={() => router.push(`/devis/${d.id}`)}
                        className="cursor-pointer transition-colors group hover:bg-white/[0.04]"
                        style={relance ? { background: "rgba(249,115,22,0.05)" } : undefined}
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs font-semibold" style={{ color: "#f1f5f9" }}>{d.reference}</span>
                        </td>
                        <td className="px-4 py-3.5 font-medium" style={{ color: "#f1f5f9" }}>{d.client}</td>
                        <td className="px-4 py-3.5 hidden sm:table-cell text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{d.type_projet}</td>
                        <td className="px-4 py-3.5 text-right font-bold whitespace-nowrap" style={{ color: "#10b981" }}>
                          {fmt(d.total_ht)}
                        </td>
                        <td className="px-4 py-3.5 text-right hidden md:table-cell">
                          <span className="font-semibold" style={{
                            color: d.marge >= 32 ? "#10b981" : d.marge >= 25 ? "#f59e0b" : "#ef4444"
                          }}>
                            {d.marge}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${STATUT_STYLE[statutKey]?.badge ?? "bg-white/10 text-white/50"}`}>
                              {STATUT_STYLE[statutKey]?.label ?? d.statut}
                            </span>
                            {relance && (
                              <span className="flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-orange-500/20 border border-orange-500/40 text-orange-300">
                                <AlertTriangle size={9} /> Relancer !
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {d.date_envoi
                            ? new Date(d.date_envoi).toLocaleDateString("fr-FR")
                            : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          {d.jours !== null ? (
                            <span className="text-xs font-semibold" style={{
                              color: (d.jours) > 7 ? "#ef4444" : "rgba(255,255,255,0.4)"
                            }}>
                              J+{d.jours}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <ChevronRight size={16} className="inline-block transition-colors text-white/25 group-hover:text-[#a5b4fc]" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>

      {showNewDevis && (
        <ModalNouveauDevis
          affaires={affaires}
          onClose={() => setShowNewDevis(false)}
          onCreated={fetchDevis}
        />
      )}
    </div>
  )
}
