"use client"

import { useRouter } from "next/navigation"
import { Plus, AlertTriangle, ChevronRight, Download } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"
import { exportToCSV, fmtDateExport } from "@/lib/export"

// ─── Types & données ──────────────────────────────────────────────────────────

type Statut = "brouillon" | "envoye" | "accepte" | "refuse" | "expire"

interface Devis {
  id: number
  ref: string
  client: string
  typeProjet: string
  totalHT: number
  marge: number
  statut: Statut
  dateEnvoi: string | null
  affaireId: number | null
  concurrent?: string
}

const DEVIS: Devis[] = [
  { id: 1, ref: "DEV-2026-001", client: "EARL Morin",          typeProjet: "Neuf",         totalHT: 48000, marge: 34, statut: "envoye",   dateEnvoi: "2026-03-06", affaireId: 1, concurrent: "Bâtivolaille"  },
  { id: 2, ref: "DEV-2026-002", client: "Gauthier Volailles",  typeProjet: "Extension",    totalHT: 32500, marge: 31, statut: "envoye",   dateEnvoi: "2026-03-07", affaireId: 2, concurrent: undefined         },
  { id: 3, ref: "DEV-2026-003", client: "SAS Lefèvre Avicole", typeProjet: "Rénovation",   totalHT: 21000, marge: 38, statut: "accepte",  dateEnvoi: "2026-02-20", affaireId: 3                               },
  { id: 4, ref: "DEV-2026-004", client: "GAEC du Bocage",      typeProjet: "Neuf",         totalHT: 67000, marge: 36, statut: "brouillon",dateEnvoi: null,          affaireId: 4                               },
  { id: 5, ref: "DEV-2026-005", client: "Coopérative Arvor",   typeProjet: "Extension",    totalHT: 53000, marge: 33, statut: "envoye",   dateEnvoi: "2026-03-12", affaireId: 6                               },
  { id: 6, ref: "DEV-2026-006", client: "Élevages Martin",     typeProjet: "Rénovation",   totalHT: 27500, marge: 30, statut: "refuse",   dateEnvoi: "2026-02-28", affaireId: 8, concurrent: "Volaferm"        },
  { id: 7, ref: "DEV-2026-007", client: "Ferme Dupont",        typeProjet: "Remplacement", totalHT: 14200, marge: 22, statut: "expire",   dateEnvoi: "2026-02-01", affaireId: 5                               },
  { id: 8, ref: "DEV-2026-008", client: "SCEA Bretagne Plumes",typeProjet: "Neuf",         totalHT: 89000, marge: 40, statut: "brouillon",dateEnvoi: null,          affaireId: 7                               },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function joursSansRetour(dateEnvoi: string | null): number | null {
  if (!dateEnvoi) return null
  return Math.floor((Date.now() - new Date(dateEnvoi).getTime()) / 86400000)
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €"
}

function exportDevis() {
  const today = Date.now()
  exportToCSV(
    DEVIS.map(d => {
      const margeEur   = Math.round(d.totalHT * d.marge / 100)
      const coutRevient = d.totalHT - margeEur
      const jours = d.dateEnvoi
        ? Math.floor((today - new Date(d.dateEnvoi).getTime()) / 86400000)
        : null
      return {
        ref:          d.ref,
        client:       d.client,
        typeProjet:   d.typeProjet,
        totalHT:      d.totalHT,
        coutRevient,
        margeEur,
        margePct:     d.marge,
        statut:       d.statut,
        dateCreation: "",
        dateEnvoi:    fmtDateExport(d.dateEnvoi),
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

const STATUT_STYLE: Record<Statut, { badge: string; label: string }> = {
  brouillon: { badge: "bg-white/10 border border-white/20 text-white/60",               label: "Brouillon" },
  envoye:    { badge: "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300",   label: "Envoyé"    },
  accepte:   { badge: "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",label: "Accepté"   },
  refuse:    { badge: "bg-red-500/20 border border-red-500/40 text-red-300",            label: "Refusé"    },
  expire:    { badge: "bg-orange-500/20 border border-orange-500/40 text-orange-300",   label: "Expiré"    },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DevisPage() {
  const router = useRouter()

  const devisAvecJours = DEVIS.map((d) => ({
    ...d,
    jours: joursSansRetour(d.dateEnvoi),
  }))

  const devisARelancer = devisAvecJours.filter(
    (d) => d.statut === "envoye" && (d.jours ?? 0) > 7
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title="Devis" actions={
          <button
            onClick={exportDevis}
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
                      {d.ref}
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
                {fmt(devisAvecJours.reduce((s, d) => s + d.totalHT, 0))} total HT
              </span>
            </p>
            <button className="btn-primary rounded-xl flex items-center gap-2 text-sm font-semibold px-4 py-2.5">
              <Plus size={16} />
              <span className="hidden sm:inline">Nouveau devis</span>
              <span className="sm:hidden">Nouveau</span>
            </button>
          </div>

          {/* ── Vue mobile : Cards ── */}
          <div className="md:hidden space-y-3">
            {devisAvecJours.map((d) => {
              const relance = d.statut === "envoye" && (d.jours ?? 0) > 7
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
                      <p className="text-xs font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{d.ref}</p>
                    </div>
                    <span className="text-base font-bold whitespace-nowrap" style={{ color: "#10b981" }}>
                      {fmt(d.totalHT)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${STATUT_STYLE[d.statut].badge}`}>
                      {STATUT_STYLE[d.statut].label}
                    </span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{d.typeProjet}</span>
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
                    return (
                      <tr
                        key={d.id}
                        onClick={() => router.push(`/devis/${d.id}`)}
                        className="cursor-pointer transition-colors group hover:bg-white/[0.04]"
                        style={relance ? { background: "rgba(249,115,22,0.05)" } : undefined}
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs font-semibold" style={{ color: "#f1f5f9" }}>{d.ref}</span>
                        </td>
                        <td className="px-4 py-3.5 font-medium" style={{ color: "#f1f5f9" }}>{d.client}</td>
                        <td className="px-4 py-3.5 hidden sm:table-cell text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{d.typeProjet}</td>
                        <td className="px-4 py-3.5 text-right font-bold whitespace-nowrap" style={{ color: "#10b981" }}>
                          {fmt(d.totalHT)}
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
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${STATUT_STYLE[d.statut].badge}`}>
                              {STATUT_STYLE[d.statut].label}
                            </span>
                            {relance && (
                              <span className="flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-orange-500/20 border border-orange-500/40 text-orange-300">
                                <AlertTriangle size={9} /> Relancer !
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {d.dateEnvoi
                            ? new Date(d.dateEnvoi).toLocaleDateString("fr-FR")
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
    </div>
  )
}
