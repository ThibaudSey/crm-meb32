"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, GitMerge, Percent, AlertTriangle, CheckSquare, Square, Euro } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"

// ─── Données ─────────────────────────────────────────────────────────────────

const metriques = {
  caSigne: 142000, caObjectif: 400000, caDelta: +12,
  pipelineTotal: 387500, affairesActives: 12, pipelineDelta: +3,
  margeMoyenne: 34.2, margeDelta: +1.8,
  relancesUrgentes: 3,
}

const dernieresAffaires = [
  { id: 1, structure: "EARL Morin",          type: "Poulailler neuf",    montant: 48000,  etape: "Devis envoyé",  typeKey: "neuf"   },
  { id: 2, structure: "Gauthier Volailles",   type: "Extension bâtiment", montant: 32500,  etape: "Négociation",   typeKey: "ext"    },
  { id: 3, structure: "SAS Lefèvre Avicole",  type: "Rénovation",         montant: 21000,  etape: "Gagné",         typeKey: "renov"  },
  { id: 4, structure: "GAEC du Bocage",       type: "Poulailler neuf",    montant: 67000,  etape: "Qualification", typeKey: "neuf"   },
  { id: 5, structure: "Ferme Dupont",         type: "Équipement seul",    montant: 14200,  etape: "Perdu",         typeKey: "rempl"  },
]

const ETAPE_BADGE: Record<string, string> = {
  "Devis envoyé":  "bg-blue-500/20 border border-blue-500/40 text-blue-300",
  "Négociation":   "bg-violet-500/20 border border-violet-500/40 text-violet-300",
  "Gagné":         "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",
  "Qualification": "bg-amber-500/20 border border-amber-500/40 text-amber-300",
  "Perdu":         "bg-red-500/20 border border-red-500/40 text-red-300",
}

const TYPE_BADGE: Record<string, string> = {
  neuf:  "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300",
  renov: "bg-amber-500/20 border border-amber-500/40 text-amber-300",
  ext:   "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",
  rempl: "bg-red-500/20 border border-red-500/40 text-red-300",
}

const devisEnAttente = [
  { client: "Gauthier Volailles", jours: 9 },
  { client: "EARL Morin",         jours: 8 },
]

const pipeline = [
  { etape: "Prospect",      affaires: 5, ca: 82000  },
  { etape: "Qualification", affaires: 3, ca: 94500  },
  { etape: "Devis envoyé",  affaires: 4, ca: 112000 },
  { etape: "Négociation",   affaires: 2, ca: 65500  },
  { etape: "Gagné",         affaires: 3, ca: 33500  },
]

const todoInitial = [
  { id: 1, texte: "Appeler GAEC du Bocage pour suivi devis",          fait: false },
  { id: 2, texte: "Envoyer plan bâtiment à Ferme Bertrand",           fait: false },
  { id: 3, texte: "Relancer Gauthier Volailles (devis J+9)",          fait: false },
  { id: 4, texte: "Mettre à jour fiche SAS Lefèvre après signature",  fait: true  },
  { id: 5, texte: "Préparer visite terrain EARL Morin – jeudi",       fait: false },
]

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €"
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, icon: Icon, iconGradient,
  delta, deltaLabel, progress,
}: {
  label: string; value: string; sub?: string
  icon: React.ElementType; iconGradient: string
  delta?: number; deltaLabel?: string
  progress?: { value: number; max: number }
}) {
  const pct = progress ? Math.round((progress.value / progress.max) * 100) : null
  const up  = delta !== undefined && delta > 0

  return (
    <div className="glass glow-violet p-5 flex flex-col gap-3 hover:scale-[1.01] transition-transform">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: "11px", letterSpacing: "0.08em", color: "rgba(255,255,255,0.45)", fontWeight: 600 }} className="uppercase">
          {label}
        </span>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: iconGradient, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
        >
          <Icon size={18} className="text-white" />
        </div>
      </div>

      <p style={{ fontSize: "28px", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>
        {value}
      </p>

      <div className="flex items-center justify-between gap-2">
        {sub && <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{sub}</p>}
        {delta !== undefined && (
          <div
            className="flex items-center gap-0.5 text-xs font-semibold ml-auto"
            style={{ color: up ? "#10b981" : "#ef4444" }}
          >
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {up ? "+" : ""}{delta}{deltaLabel ?? "%"}
          </div>
        )}
      </div>

      {pct !== null && (
        <div>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            <span>Objectif {fmt(progress!.max)}</span>
            <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{pct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg, #6366f1, #10b981)" }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [todos, setTodos] = useState(todoInitial)

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title="Dashboard" />

        <main className="flex-1 p-5 md:p-6 pb-20 md:pb-8 space-y-6">

          {/* ── Alerte devis ── */}
          {devisEnAttente.length > 0 && (
            <div className="alert-amber">
              <AlertTriangle size={17} className="shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
              <div className="text-sm">
                <span className="font-semibold">Devis sans retour :</span>{" "}
                {devisEnAttente.map((d, i) => (
                  <span key={d.client}>
                    {d.client} <span className="font-bold">({d.jours}j)</span>
                    {i < devisEnAttente.length - 1 ? ", " : ""}
                  </span>
                ))}
                {" "}— pensez à relancer.
              </div>
            </div>
          )}

          {/* ── 4 cartes métriques ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="CA Signé" value={fmt(metriques.caSigne)}
              icon={Euro} iconGradient="linear-gradient(135deg,#10b981,#059669)"
              delta={metriques.caDelta} deltaLabel="%"
              progress={{ value: metriques.caSigne, max: metriques.caObjectif }}
            />
            <MetricCard
              label="Pipeline Total" value={fmt(metriques.pipelineTotal)}
              sub={`${metriques.affairesActives} affaires actives`}
              icon={GitMerge} iconGradient="linear-gradient(135deg,#6366f1,#8b5cf6)"
              delta={metriques.pipelineDelta} deltaLabel=" aff."
            />
            <MetricCard
              label="Marge Moyenne" value={`${metriques.margeMoyenne}%`}
              sub="Sur affaires signées"
              icon={Percent} iconGradient="linear-gradient(135deg,#8b5cf6,#c084fc)"
              delta={metriques.margeDelta} deltaLabel=" pts"
            />
            <MetricCard
              label="Relances urgentes" value={String(metriques.relancesUrgentes)}
              sub="À traiter aujourd'hui"
              icon={AlertTriangle} iconGradient="linear-gradient(135deg,#f59e0b,#ef4444)"
            />
          </div>

          {/* ── Tableau + Todo ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Tableau affaires */}
            <div className="lg:col-span-2 glass overflow-hidden">
              <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <h2 className="font-semibold" style={{ color: "#f1f5f9" }}>5 dernières affaires</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="table-glass">
                  <thead>
                    <tr>
                      <th>Structure</th>
                      <th className="hidden sm:table-cell">Type projet</th>
                      <th className="right">Montant</th>
                      <th>Étape</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dernieresAffaires.map((a) => (
                      <tr key={a.id} className="cursor-pointer">
                        <td style={{ fontWeight: 600 }}>{a.structure}</td>
                        <td className="hidden sm:table-cell">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${TYPE_BADGE[a.typeKey]}`}>
                            {a.type}
                          </span>
                        </td>
                        <td className="amount">{fmt(a.montant)}</td>
                        <td>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${ETAPE_BADGE[a.etape]}`}>
                            {a.etape}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* To-do du jour */}
            <div className="glass overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <h2 className="font-semibold" style={{ color: "#f1f5f9" }}>To-do du jour</h2>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                >
                  {todos.filter((t) => t.fait).length}/{todos.length}
                </span>
              </div>
              <ul className="p-5 space-y-3">
                {todos.map((todo) => (
                  <li
                    key={todo.id}
                    onClick={() => setTodos((p) => p.map((t) => t.id === todo.id ? { ...t, fait: !t.fait } : t))}
                    className="flex items-start gap-3 cursor-pointer group"
                  >
                    {todo.fait
                      ? <CheckSquare size={17} className="shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                      : <Square size={17} className="shrink-0 mt-0.5 transition-colors" style={{ color: "rgba(255,255,255,0.25)" }} />
                    }
                    <span
                      className="text-sm leading-snug"
                      style={{ color: todo.fait ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.75)", textDecoration: todo.fait ? "line-through" : "none" }}
                    >
                      {todo.texte}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Mini pipeline ── */}
          <div className="glass overflow-hidden">
            <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <h2 className="font-semibold" style={{ color: "#f1f5f9" }}>Pipeline par étape</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" style={{ borderTop: "none" }}>
              {pipeline.map((p, i) => {
                const pct = Math.round((p.ca / metriques.pipelineTotal) * 100)
                const gradients = [
                  "from-sky-400 to-sky-600",
                  "from-amber-400 to-amber-600",
                  "from-blue-400 to-blue-600",
                  "from-violet-400 to-violet-600",
                  "from-emerald-400 to-emerald-600",
                ]
                return (
                  <div
                    key={p.etape}
                    className="px-5 py-5 flex flex-col gap-2"
                    style={{ borderRight: i < 4 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                  >
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {p.etape}
                    </span>
                    <p style={{ fontSize: "24px", fontWeight: 800, color: "#f1f5f9" }}>{p.affaires}</p>
                    <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>{fmt(p.ca)}</p>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${gradients[i]} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{pct}% du pipe</span>
                  </div>
                )
              })}
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
