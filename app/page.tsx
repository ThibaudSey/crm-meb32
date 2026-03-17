"use client"

import { useState, useEffect, useMemo } from "react"
import { TrendingUp, TrendingDown, GitMerge, Percent, AlertTriangle, CheckSquare, Square, Euro } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"
import LoadingSpinner from "@/components/LoadingSpinner"
import { supabase } from "@/lib/supabase"
import type { Affaire, Todo, Devis } from "@/lib/types"

// ─── Constants ────────────────────────────────────────────────────────────────

const CA_OBJECTIF = 400000

// DB values for pipeline stages
const ETAPES_PIPELINE = [
  { dbValue: "prospection", label: "Prospection"    },
  { dbValue: "r1",          label: "R1 Découverte"  },
  { dbValue: "r2",          label: "R2 Proposition" },
  { dbValue: "negociation", label: "Négociation"    },
  { dbValue: "signe",       label: "Signé"          },
]

const ETAPE_BADGE: Record<string, string> = {
  prospection: "bg-sky-500/20 border border-sky-500/40 text-sky-300",
  r1:          "bg-amber-500/20 border border-amber-500/40 text-amber-300",
  r2:          "bg-blue-500/20 border border-blue-500/40 text-blue-300",
  negociation: "bg-violet-500/20 border border-violet-500/40 text-violet-300",
  signe:       "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",
  perdu:       "bg-red-500/20 border border-red-500/40 text-red-300",
}

const ETAPE_LABEL: Record<string, string> = {
  prospection: "Prospection",
  r1:          "R1 Découverte",
  r2:          "R2 Proposition",
  negociation: "Négociation",
  signe:       "Signé",
  perdu:       "Perdu",
}

const TYPE_BADGE: Record<string, string> = {
  neuf:         "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300",
  renovation:   "bg-amber-500/20 border border-amber-500/40 text-amber-300",
  extension:    "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",
  remplacement: "bg-red-500/20 border border-red-500/40 text-red-300",
}

const TYPE_PROJET_LABEL: Record<string, string> = {
  neuf:         "Neuf",
  renovation:   "Rénovation",
  extension:    "Extension",
  remplacement: "Remplacement",
}

const PIPELINE_GRADIENTS = [
  "from-sky-400 to-sky-600",
  "from-amber-400 to-amber-600",
  "from-blue-400 to-blue-600",
  "from-violet-400 to-violet-600",
  "from-emerald-400 to-emerald-600",
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
              style={{ width: `${Math.min(pct, 100)}%`, background: "linear-gradient(90deg, #6366f1, #10b981)" }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [affaires, setAffaires] = useState<Affaire[]>([])
  const [todos, setTodos]       = useState<Todo[]>([])
  const [devis, setDevis]       = useState<Devis[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: aff }, { data: td }, { data: dv }] = await Promise.all([
        supabase.from("affaires").select("*").order("created_at", { ascending: false }),
        supabase.from("todos").select("*").order("date_limite", { ascending: true }).limit(20),
        supabase.from("devis").select("*").eq("statut", "envoye"),
      ])
      setAffaires(aff ?? [])
      setTodos(td ?? [])
      setDevis(dv ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // ── Computed metrics ──
  const affairesSignees  = useMemo(() => affaires.filter(a => a.etape === "signe"), [affaires])
  const affairesActives  = useMemo(() => affaires.filter(a => a.etape !== "perdu"), [affaires])
  const caSigne          = useMemo(() => affairesSignees.reduce((s, a) => s + (a.montant_estime ?? 0), 0), [affairesSignees])
  const pipelineTotal    = useMemo(() => affairesActives.reduce((s, a) => s + (a.montant_estime ?? 0), 0), [affairesActives])
  const margeMoyenne     = useMemo(() => {
    if (affairesSignees.length === 0) return 0
    return affairesSignees.reduce((s, a) => s + (a.marge ?? 0), 0) / affairesSignees.length
  }, [affairesSignees])

  const devisEnAttente = useMemo(() => devis.map(d => ({
    client: d.client,
    jours: d.date_envoi
      ? Math.floor((Date.now() - new Date(d.date_envoi).getTime()) / 86400000)
      : 0,
  })).filter(d => d.jours > 0).sort((a, b) => b.jours - a.jours), [devis])

  const pipeline = useMemo(() => ETAPES_PIPELINE.map(({ dbValue, label }) => {
    const aff = affaires.filter(a => a.etape === dbValue)
    return {
      etape: label,
      affaires: aff.length,
      ca: aff.reduce((s, a) => s + (a.montant_estime ?? 0), 0),
    }
  }), [affaires])

  const dernieresAffaires = affaires.slice(0, 5)

  async function toggleTodo(id: string, fait: boolean) {
    await supabase.from("todos").update({ fait: !fait }).eq("id", id)
    setTodos(p => p.map(t => t.id === id ? { ...t, fait: !fait } : t))
  }

  if (loading) return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title="Dashboard" />
        <main className="flex-1 p-5 md:p-6"><LoadingSpinner /></main>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title="Dashboard" />

        <main className="flex-1 p-5 md:p-6 pb-20 md:pb-8 space-y-6">

          {/* ── Alerte devis sans retour ── */}
          {devisEnAttente.length > 0 && (
            <div className="alert-amber">
              <AlertTriangle size={17} className="shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
              <div className="text-sm">
                <span className="font-semibold">Devis sans retour :</span>{" "}
                {devisEnAttente.slice(0, 3).map((d, i) => (
                  <span key={d.client}>
                    {d.client} <span className="font-bold">({d.jours}j)</span>
                    {i < Math.min(devisEnAttente.length, 3) - 1 ? ", " : ""}
                  </span>
                ))}
                {devisEnAttente.length > 3 && ` +${devisEnAttente.length - 3} autres`}
                {" "}— pensez à relancer.
              </div>
            </div>
          )}

          {/* ── 4 cartes métriques ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="CA Signé" value={fmt(caSigne)}
              icon={Euro} iconGradient="linear-gradient(135deg,#10b981,#059669)"
              progress={{ value: caSigne, max: CA_OBJECTIF }}
            />
            <MetricCard
              label="Pipeline Total" value={fmt(pipelineTotal)}
              sub={`${affairesActives.length} affaires actives`}
              icon={GitMerge} iconGradient="linear-gradient(135deg,#6366f1,#8b5cf6)"
            />
            <MetricCard
              label="Marge Moyenne" value={`${margeMoyenne.toFixed(1)}%`}
              sub="Sur affaires signées"
              icon={Percent} iconGradient="linear-gradient(135deg,#8b5cf6,#c084fc)"
            />
            <MetricCard
              label="Relances urgentes" value={String(devis.length)}
              sub="Devis en attente de retour"
              icon={AlertTriangle} iconGradient="linear-gradient(135deg,#f59e0b,#ef4444)"
            />
          </div>

          {/* ── Tableau affaires + Todos ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Tableau 5 dernières affaires */}
            <div className="lg:col-span-2 glass overflow-hidden">
              <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <h2 className="font-semibold" style={{ color: "#f1f5f9" }}>5 dernières affaires</h2>
              </div>
              {dernieresAffaires.length === 0 ? (
                <p className="p-6 text-sm text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Aucune affaire pour l&apos;instant
                </p>
              ) : (
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
                          <td style={{ fontWeight: 600 }}>{a.nom}</td>
                          <td className="hidden sm:table-cell">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${TYPE_BADGE[a.type_projet] ?? ""}`}>
                              {TYPE_PROJET_LABEL[a.type_projet] ?? a.type_projet}
                            </span>
                          </td>
                          <td className="amount">{fmt(a.montant_estime ?? 0)}</td>
                          <td>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${ETAPE_BADGE[a.etape] ?? ""}`}>
                              {ETAPE_LABEL[a.etape] ?? a.etape}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* To-do du jour */}
            <div className="glass overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <h2 className="font-semibold" style={{ color: "#f1f5f9" }}>To-do</h2>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                >
                  {todos.filter(t => t.fait).length}/{todos.length}
                </span>
              </div>
              {todos.length === 0 ? (
                <p className="p-6 text-sm text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Aucune tâche
                </p>
              ) : (
                <ul className="p-5 space-y-3">
                  {todos.map((todo) => (
                    <li
                      key={todo.id}
                      onClick={() => toggleTodo(todo.id, todo.fait)}
                      className="flex items-start gap-3 cursor-pointer group"
                    >
                      {todo.fait
                        ? <CheckSquare size={17} className="shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                        : <Square size={17} className="shrink-0 mt-0.5 transition-colors" style={{ color: "rgba(255,255,255,0.25)" }} />
                      }
                      <span
                        className="text-sm leading-snug"
                        style={{
                          color: todo.fait ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.75)",
                          textDecoration: todo.fait ? "line-through" : "none",
                        }}
                      >
                        {todo.texte}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ── Mini pipeline ── */}
          <div className="glass overflow-hidden">
            <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <h2 className="font-semibold" style={{ color: "#f1f5f9" }}>Pipeline par étape</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" style={{ borderTop: "none" }}>
              {pipeline.map((p, i) => {
                const pct = pipelineTotal > 0 ? Math.round((p.ca / pipelineTotal) * 100) : 0
                return (
                  <div
                    key={p.etape}
                    className="px-5 py-5 flex flex-col gap-2"
                    style={{ borderRight: i < ETAPES_PIPELINE.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                  >
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {p.etape}
                    </span>
                    <p style={{ fontSize: "24px", fontWeight: 800, color: "#f1f5f9" }}>{p.affaires}</p>
                    <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>{fmt(p.ca)}</p>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${PIPELINE_GRADIENTS[i]} transition-all duration-700`}
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
