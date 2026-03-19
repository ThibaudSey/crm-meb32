"use client"

import { useState, useEffect } from "react"
import { CheckSquare, Square, CheckCircle, XCircle, Loader2, Bot, AlertTriangle, CalendarDays, Clock } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"
import LoadingSpinner from "@/components/LoadingSpinner"
import { supabase } from "@/lib/supabase"
import type { Todo } from "@/lib/types"

// ─── Types Agenda ─────────────────────────────────────────────────────────────

interface Evenement {
  id: string
  titre: string
  date_debut: string
  type_evenement?: string | null
  affaire_id?: string | null
  affaire_nom?: string | null
}

const TYPE_EVT_BADGE: Record<string, string> = {
  rdv:        "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300",
  appel:      "bg-sky-500/20 border border-sky-500/40 text-sky-300",
  visite:     "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",
  livraison:  "bg-amber-500/20 border border-amber-500/40 text-amber-300",
  autre:      "bg-slate-500/20 border border-slate-500/40 text-slate-300",
}

function labelJour(dateStr: string, todayStr: string): string {
  const d = dateStr.slice(0, 10)
  if (d === todayStr) return "Aujourd'hui"
  const tomorrow = new Date(todayStr); tomorrow.setDate(tomorrow.getDate() + 1)
  if (d === tomorrow.toISOString().slice(0, 10)) return "Demain"
  return "Après-demain"
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiSuggestionPayload {
  route?: string; titre?: string; description?: string; priorite?: string
  contexte?: string; date_echeance?: string; contact_nom?: string; contact_telephone?: string
}

interface AiSuggestion {
  id: string; inbox_entry_id?: string; affaire_id?: string | null
  type_suggestion: string; payload: AiSuggestionPayload
  score_confiance?: number; statut: string
  date_creation: string; date_validation?: string | null; processed?: boolean
}

const SUGGESTION_TYPE_BADGE: Record<string, string> = {
  task:    "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300",
  note:    "bg-sky-500/20 border border-sky-500/40 text-sky-300",
  contact: "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",
  event:   "bg-violet-500/20 border border-violet-500/40 text-violet-300",
}

const PRIORITE_BADGE: Record<string, string> = {
  haute:  "bg-red-500/20 border border-red-500/40 text-red-300",
  moyenne:"bg-amber-500/20 border border-amber-500/40 text-amber-300",
  basse:  "bg-slate-500/20 border border-slate-500/40 text-slate-300",
}

async function validerSuggestion(s: AiSuggestion) {
  const res = await fetch("/api/ai-suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "valider",
      id: s.id,
      type_suggestion: s.type_suggestion,
      payload: s.payload,
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    console.error("[validerSuggestion] erreur:", err)
  }
}

async function rejeterSuggestion(id: string) {
  await fetch("/api/ai-suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "rejeter", id }),
  })
}

// ─── SectionAValider ──────────────────────────────────────────────────────────

function SectionAValider({
  suggestions, onRefresh,
}: { suggestions: AiSuggestion[]; onRefresh: () => void }) {
  const [busy, setBusy] = useState<string | null>(null)

  async function handleValider(s: AiSuggestion) {
    setBusy(s.id)
    await validerSuggestion(s)
    setBusy(null)
    onRefresh()
  }

  async function handleRejeter(s: AiSuggestion) {
    setBusy(s.id)
    await rejeterSuggestion(s.id)
    setBusy(null)
    onRefresh()
  }

  if (suggestions.length === 0) return null

  return (
    <div className="glass overflow-hidden">
      <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <Bot size={17} style={{ color: "#a78bfa" }} />
        <h2 className="font-semibold" style={{ color: "#f1f5f9" }}>À valider</h2>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium ml-1"
          style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }}
        >
          {suggestions.length}
        </span>
      </div>

      <ul className="divide-y" style={{ "--tw-divide-opacity": 1 } as React.CSSProperties}>
        {suggestions.map((s) => {
          const isBusy = busy === s.id
          const p: AiSuggestionPayload = typeof s.payload === "string"
            ? (JSON.parse(s.payload) as AiSuggestionPayload)
            : (s.payload ?? {})
          const type = s.type_suggestion
          return (
            <li
              key={s.id}
              className="px-6 py-4 flex items-start gap-4"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${SUGGESTION_TYPE_BADGE[type] ?? "bg-slate-500/20 text-slate-300 border-slate-500/40"}`}>
                    {type}
                  </span>
                  {p.priorite && (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${PRIORITE_BADGE[p.priorite] ?? ""}`}>
                      {p.priorite}
                    </span>
                  )}
                  {s.score_confiance !== undefined && s.score_confiance > 0 && (
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                      Confiance {Math.round(s.score_confiance * 100)}%
                    </span>
                  )}
                </div>
                {p.titre && (
                  <p className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>{p.titre}</p>
                )}
                {p.description && (
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {p.description.length > 80 ? p.description.slice(0, 80) + "…" : p.description}
                  </p>
                )}
                {type === "contact" && p.contact_nom && (
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {p.contact_nom}{p.contact_telephone ? ` — ${p.contact_telephone}` : ""}
                  </p>
                )}
                {p.date_echeance && (
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Échéance : {new Date(p.date_echeance).toLocaleDateString("fr-FR")}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isBusy ? (
                  <Loader2 size={18} className="animate-spin" style={{ color: "rgba(255,255,255,0.4)" }} />
                ) : (
                  <>
                    <button
                      onClick={() => handleValider(s)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                      style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
                    >
                      <CheckCircle size={13} /> Valider
                    </button>
                    <button
                      onClick={() => handleRejeter(s)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                      style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}
                    >
                      <XCircle size={13} /> Rejeter
                    </button>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [todos, setTodos]             = useState<Todo[]>([])
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([])
  const [evenements, setEvenements]   = useState<Evenement[]>([])
  const [loading, setLoading]         = useState(true)

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const j2 = new Date(today); j2.setDate(j2.getDate() + 2)
  const j2Str = j2.toISOString().slice(0, 10)

  async function loadSuggestions() {
    const res = await fetch("/api/ai-suggestions")
    const json = await res.json() as { data?: AiSuggestion[]; error?: string }
    console.log("[ai_suggestions] réponse API:", json)
    console.log("[ai_suggestions] count:", (json.data ?? []).length)
    setSuggestions(json.data ?? [])
  }

  useEffect(() => {
    async function load() {
      const [{ data: td }, { data: evts }] = await Promise.all([
        supabase
          .from("taches")
          .select("*")
          .neq("statut", "termine")
          .order("date_echeance", { ascending: true }),
        supabase
          .from("evenements")
          .select("id, titre, date_debut, type_evenement, affaire_id, entreprises(nom)")
          .gte("date_debut", todayStr)
          .lte("date_debut", j2Str + "T23:59:59")
          .order("date_debut", { ascending: true }),
      ])
      setTodos((td ?? []) as unknown as Todo[])
      // Aplatir la jointure entreprises(nom) → affaire_nom
      const evtsFlat: Evenement[] = (evts ?? []).map((e: Record<string, unknown>) => ({
        id:             e.id as string,
        titre:          e.titre as string,
        date_debut:     e.date_debut as string,
        type_evenement: e.type_evenement as string | null,
        affaire_id:     e.affaire_id as string | null,
        affaire_nom:    (e.entreprises as { nom?: string } | null)?.nom ?? null,
      }))
      setEvenements(evtsFlat)
      await loadSuggestions()
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function toggleTodo(id: string, fait: boolean) {
    await supabase.from("taches").update({ statut: fait ? "a_faire" : "termine" }).eq("id", id)
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

  const todosUrgents = todos.filter(t => {
    const echeance = (t as unknown as { date_echeance?: string }).date_echeance
    const depasse = echeance && echeance < todayStr
    const hauteP  = (t as unknown as { priorite?: string }).priorite === "haute"
    return depasse || hauteP
  })

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title="Dashboard" />

        <main className="flex-1 p-5 md:p-6 pb-20 md:pb-8 space-y-6">

          {/* ── À valider ── */}
          <SectionAValider suggestions={suggestions} onRefresh={loadSuggestions} />

          {/* ── Urgences + To-do du jour ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Urgences */}
            <div className="glass overflow-hidden">
              <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
                <h2 className="font-semibold" style={{ color: "#f1f5f9" }}>Urgences</h2>
                {todosUrgents.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-1"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                    {todosUrgents.length}
                  </span>
                )}
              </div>
              {todosUrgents.length === 0 ? (
                <p className="p-6 text-sm text-center" style={{ color: "rgba(255,255,255,0.3)" }}>Aucune urgence 🎉</p>
              ) : (
                <ul className="p-5 space-y-3">
                  {todosUrgents.map((todo) => {
                    const t = todo as unknown as { id: string; titre?: string; texte?: string; date_echeance?: string; priorite?: string; statut?: string }
                    const fait = t.statut === "termine"
                    const depasse = t.date_echeance && t.date_echeance < todayStr
                    return (
                      <li key={t.id} onClick={() => toggleTodo(t.id, fait)} className="flex items-start gap-3 cursor-pointer group">
                        {fait
                          ? <CheckSquare size={17} className="shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                          : <Square size={17} className="shrink-0 mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }} />
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug" style={{
                            color: fait ? "rgba(255,255,255,0.3)" : "#f1f5f9",
                            textDecoration: fait ? "line-through" : "none",
                          }}>
                            {t.titre ?? t.texte}
                          </p>
                          {t.date_echeance && (
                            <p className="text-xs mt-0.5" style={{ color: depasse ? "#ef4444" : "rgba(255,255,255,0.35)" }}>
                              {depasse ? "⚠ " : ""}
                              {new Date(t.date_echeance).toLocaleDateString("fr-FR")}
                            </p>
                          )}
                        </div>
                        {t.priorite === "haute" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0"
                            style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                            haute
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Agenda proche */}
            <div className="glass overflow-hidden">
              <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <CalendarDays size={16} style={{ color: "#6366f1" }} />
                <h2 className="font-semibold" style={{ color: "#f1f5f9" }}>Agenda proche</h2>
                <span className="text-xs ml-1" style={{ color: "rgba(255,255,255,0.3)" }}>J · J+1 · J+2</span>
              </div>
              {evenements.length === 0 ? (
                <p className="p-6 text-sm text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Aucun RDV à venir
                </p>
              ) : (
                <ul className="divide-y" style={{ "--tw-divide-opacity": 1 } as React.CSSProperties}>
                  {evenements.map((evt) => {
                    const dateObj = new Date(evt.date_debut)
                    const heure   = dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                    const jour    = labelJour(evt.date_debut, todayStr)
                    const type    = evt.type_evenement?.toLowerCase() ?? "autre"
                    return (
                      <li key={evt.id} className="px-6 py-4 flex items-start gap-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        {/* Heure + jour */}
                        <div className="shrink-0 w-20 text-right">
                          <p className="text-xs font-semibold" style={{ color: "#a5b4fc" }}>{jour}</p>
                          <p className="text-xs flex items-center justify-end gap-1 mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                            <Clock size={10} /> {heure}
                          </p>
                        </div>
                        {/* Contenu */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-snug" style={{ color: "#f1f5f9" }}>{evt.titre}</p>
                          {evt.affaire_nom && (
                            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{evt.affaire_nom}</p>
                          )}
                        </div>
                        {/* Badge type */}
                        {evt.type_evenement && (
                          <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border font-medium ${TYPE_EVT_BADGE[type] ?? TYPE_EVT_BADGE.autre}`}>
                            {evt.type_evenement}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
