"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, X, Copy, Check, ChevronDown } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"
import LoadingSpinner from "@/components/LoadingSpinner"
import ErrorMessage from "@/components/ErrorMessage"
import { supabase } from "@/lib/supabase"
import type { Devis, DevisLigne, Affaire, Statut } from "@/lib/types"

// ─── Types ────────────────────────────────────────────────────────────────────

interface PromptPanel { titre: string; contenu: string }

// ─── Static config ────────────────────────────────────────────────────────────

const STATUT_BADGE: Record<Statut, string> = {
  brouillon: "bg-white/10 border border-white/20 text-white/60",
  envoye:    "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300",
  accepte:   "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",
  refuse:    "bg-red-500/20 border border-red-500/40 text-red-300",
  expire:    "bg-orange-500/20 border border-orange-500/40 text-orange-300",
}

const STATUT_LABELS: Record<Statut, string> = {
  brouillon: "Brouillon",
  envoye:    "Envoyé",
  accepte:   "Accepté",
  refuse:    "Refusé",
  expire:    "Expiré",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €"
}

function fmtN(n: number, dec = 2) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n)
}

function ligneTotal(l: DevisLigne) {
  return l.quantite * l.prix_unitaire * (1 - l.remise_pct / 100)
}

function ligneRevient(l: DevisLigne) {
  return l.quantite * l.prix_revient
}

// ─── Composant cellule éditable ───────────────────────────────────────────────

function Cell({
  value,
  onChange,
  type = "text",
  className = "",
  placeholder = "",
}: {
  value: string | number
  onChange: (v: string) => void
  type?: string
  className?: string
  placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-transparent border-0 outline-none text-sm transition-all focus:bg-white/5 focus:ring-1 focus:ring-indigo-500/40 rounded px-1 py-0.5 ${className}`}
    />
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DevisEditorPage() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()

  // ── Remote state ─────────────────────────────────────────────────────────────
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [devis, setDevis]               = useState<Devis | null>(null)
  const [lignes, setLignes]             = useState<DevisLigne[]>([])
  const [affairesList, setAffairesList] = useState<Pick<Affaire, "id" | "nom">[]>([])

  // ── Form state (mirrors devis fields) ────────────────────────────────────────
  const [statut, setStatut]               = useState<Statut>("brouillon")
  const [affaireId, setAffaireId]         = useState<string>("")
  const [dateEnvoi, setDateEnvoi]         = useState("")
  const [notes, setNotes]                 = useState("")
  const [showStatutMenu, setShowStatutMenu] = useState(false)

  const [promptPanel, setPromptPanel] = useState<PromptPanel | null>(null)
  const [copied, setCopied]           = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [devisRes, lignesRes, affairesRes] = await Promise.all([
        supabase.from("devis").select("*").eq("id", id).single(),
        supabase.from("lignes_devis").select("*").eq("devis_id", id).order("ordre"),
        supabase.from("entreprises").select("id, nom").order("nom"),
      ])

      if (devisRes.error || !devisRes.data) {
        setError("Devis introuvable")
        return
      }

      const d = devisRes.data as Devis
      setDevis(d)
      setStatut(d.statut)
      setAffaireId(d.affaire_id ?? "")
      setDateEnvoi(d.date_envoi ?? "")
      // notes field is not in Devis type — use concurrent as fallback memo or leave empty
      setNotes("")

      setLignes((lignesRes.data ?? []) as DevisLigne[])
      setAffairesList((affairesRes.data ?? []) as Pick<Affaire, "id" | "nom">[])
    } catch {
      setError("Erreur lors du chargement du devis")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // ── Calculs temps réel ────────────────────────────────────────────────────────
  const totalHT      = lignes.reduce((s, l) => s + ligneTotal(l), 0)
  const coutRevient  = lignes.reduce((s, l) => s + ligneRevient(l), 0)
  const margeBrute   = totalHT - coutRevient
  const margePct     = totalHT > 0 ? (margeBrute / totalHT) * 100 : 0

  const margeGradient =
    margePct < 25 ? "linear-gradient(90deg,#ef4444,#dc2626)" :
    margePct < 32 ? "linear-gradient(90deg,#f59e0b,#d97706)" :
                    "linear-gradient(90deg,#10b981,#059669)"

  const margeTextColor =
    margePct < 25 ? "#ef4444" :
    margePct < 32 ? "#f59e0b" :
                    "#10b981"

  // ── Save devis header ─────────────────────────────────────────────────────────

  async function sauvegarderDevis() {
    if (!devis) return
    const { error } = await supabase
      .from("devis")
      .update({
        statut,
        affaire_id: affaireId || null,
        date_envoi: dateEnvoi || null,
      })
      .eq("id", devis.id)
    if (!error) {
      setDevis((prev) => prev ? { ...prev, statut, affaire_id: affaireId || null, date_envoi: dateEnvoi || null } : prev)
    }
  }

  // ── Handlers lignes ───────────────────────────────────────────────────────────

  async function updateLigne(ligneId: string, field: keyof DevisLigne, raw: string) {
    const val = field === "designation" ? raw : (parseFloat(raw) || 0)
    // Update local state immediately for responsive feel
    setLignes((prev) =>
      prev.map((l) => (l.id === ligneId ? { ...l, [field]: val } : l))
    )
    // Persist to DB
    await supabase
      .from("lignes_devis")
      .update({ [field]: val })
      .eq("id", ligneId)
  }

  async function ajouterLigne() {
    const ordre = lignes.length > 0 ? Math.max(...lignes.map((l) => l.ordre)) + 1 : 1
    const payload = {
      devis_id: id,
      designation: "",
      quantite: 1,
      prix_unitaire: 0,
      remise_pct: 0,
      prix_revient: 0,
      ordre,
    }
    const { data, error } = await supabase
      .from("lignes_devis")
      .insert(payload)
      .select()
      .single()
    if (!error && data) {
      setLignes((prev) => [...prev, data as DevisLigne])
    }
  }

  async function supprimerLigne(ligneId: string) {
    const { error } = await supabase.from("lignes_devis").delete().eq("id", ligneId)
    if (!error) {
      setLignes((prev) => prev.filter((l) => l.id !== ligneId))
    }
  }

  // ── Prompts IA ────────────────────────────────────────────────────────────────
  const affaireLabel = affairesList.find((a) => a.id === affaireId)?.nom ?? "inconnue"
  const ref = devis?.reference ?? `DEV-${id}`

  function buildPromptMarge() {
    const detail = lignes
      .map((l) => {
        const tot = ligneTotal(l)
        const rev = ligneRevient(l)
        const m   = tot > 0 ? ((tot - rev) / tot * 100).toFixed(1) : "—"
        return `  • ${l.designation || "(sans titre)"} : ${l.quantite} × ${fmtN(l.prix_unitaire, 0)} €${l.remise_pct > 0 ? ` -${l.remise_pct}%` : ""} = ${fmtN(tot, 0)} € HT (revient ${fmtN(rev, 0)} €, marge ${m}%)`
      })
      .join("\n")
    return `Tu es un expert en pricing équipement avicole.

Devis ${ref} — Affaire : ${affaireLabel}

Lignes du devis :
${detail}

Totaux :
  • Total HT : ${fmtN(totalHT, 0)} €
  • Coût de revient : ${fmtN(coutRevient, 0)} €
  • Marge brute : ${fmtN(margeBrute, 0)} € (${fmtN(margePct, 1)}%)

Analyse pour moi :
1. Les 2-3 lignes avec la meilleure et la moins bonne marge, et pourquoi
2. Des pistes concrètes pour améliorer la marge globale sans perdre le deal
3. Un argumentaire de valeur pour justifier ce niveau de prix face au client
4. Si la marge est < 25%, des recommandations urgentes pour recadrer l'offre`
  }

  function buildPromptPrix() {
    return `Tu es un commercial expert en négociation, spécialisé équipement avicole.

Devis ${ref} — ${affaireLabel}
Montant : ${fmtN(totalHT, 0)} € HT
Marge : ${fmtN(margePct, 1)}%
Notes internes : ${notes || "aucune"}

Le client cherche à négocier le prix. Il compare probablement avec un concurrent moins cher.

Prépare-moi :
1. Les 3 arguments clés pour défendre ce prix (en lien avec la valeur, pas le coût)
2. Des questions à poser au client pour recadrer la conversation sur le ROI à long terme
3. Un tableau comparatif synthétique (notre offre vs concurrent générique) sur les points différenciants : garantie, SAV, connectivité, performances zootechniques
4. Une offre de repli acceptable (ce qu'on peut concéder sans trop dégrader la marge)
5. Le seuil plancher de prix à ne pas franchir pour rester rentable`
  }

  function ouvrirPrompt(titre: string, contenu: string) {
    setPromptPanel({ titre, contenu })
    setCopied(false)
  }

  async function copierPrompt() {
    if (!promptPanel) return
    await navigator.clipboard.writeText(promptPanel.contenu)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Render guards ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 md:ml-60 flex flex-col">
          <TopBar title="Devis" />
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    )
  }

  if (error || !devis) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 md:ml-60 flex flex-col">
          <TopBar title="Devis" />
          <div className="flex-1 flex items-center justify-center p-8">
            <ErrorMessage message={error ?? "Devis introuvable"} onRetry={fetchAll} />
          </div>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title={`Devis ${ref}`} />

        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 space-y-5">

          {/* Retour */}
          <button
            onClick={() => router.push("/devis")}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
          >
            <ArrowLeft size={15} /> Retour aux devis
          </button>

          {/* ══════════ ZONE HAUTE — En-tête ══════════ */}
          <div className="glass p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Référence */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Référence</label>
                <p className="font-mono font-bold text-base" style={{ color: "#f1f5f9" }}>{ref}</p>
              </div>

              {/* Affaire liée */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Affaire liée</label>
                <div className="relative">
                  <select
                    value={affaireId}
                    onChange={(e) => { setAffaireId(e.target.value); setTimeout(sauvegarderDevis, 0) }}
                    className="select-glass w-full pr-8 appearance-none"
                  >
                    <option value="">— Aucune —</option>
                    {affairesList.map((a) => (
                      <option key={a.id} value={a.id}>{a.nom}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "rgba(255,255,255,0.4)" }} />
                </div>
              </div>

              {/* Statut */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Statut</label>
                <div className="relative">
                  <button
                    onClick={() => setShowStatutMenu(!showStatutMenu)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium w-full justify-between ${STATUT_BADGE[statut]}`}
                  >
                    {STATUT_LABELS[statut]}
                    <ChevronDown size={13} />
                  </button>
                  {showStatutMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowStatutMenu(false)} />
                      <div className="absolute top-full mt-1 left-0 rounded-xl py-1 z-20 w-full min-w-[140px]"
                        style={{ background: "rgba(15,15,30,0.95)", backdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {(Object.keys(STATUT_LABELS) as Statut[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              setStatut(s)
                              setShowStatutMenu(false)
                              supabase.from("devis").update({ statut: s }).eq("id", devis.id)
                            }}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-white/[0.06] ${statut === s ? "font-semibold" : ""}`}
                          >
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${STATUT_BADGE[s]}`}>
                              {STATUT_LABELS[s]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Date envoi */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Date d&apos;envoi</label>
                <input
                  type="date"
                  value={dateEnvoi}
                  onChange={(e) => { setDateEnvoi(e.target.value); setTimeout(sauvegarderDevis, 0) }}
                  className="input-glass w-full"
                />
              </div>
            </div>

            {/* Notes internes */}
            <div className="mt-4">
              <label className="block text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Notes internes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Contexte, observations, stratégie tarifaire…"
                className="textarea-glass w-full"
              />
            </div>
          </div>

          {/* ══════════ TABLEAU DE LIGNES ══════════ */}
          <div className="glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <th className="text-left px-4 py-3 min-w-[200px] text-[11px] text-white/35 uppercase tracking-widest font-semibold">Désignation</th>
                    <th className="text-right px-3 py-3 w-16 text-[11px] text-white/35 uppercase tracking-widest font-semibold">Qté</th>
                    <th className="text-right px-3 py-3 w-32 text-[11px] text-white/35 uppercase tracking-widest font-semibold">Prix unit. HT</th>
                    <th className="text-right px-3 py-3 w-20 text-[11px] text-white/35 uppercase tracking-widest font-semibold">Remise %</th>
                    <th className="text-right px-3 py-3 w-32 text-[11px] text-white/35 uppercase tracking-widest font-semibold">Coût revient</th>
                    <th className="text-right px-3 py-3 w-32 text-[11px] text-white/35 uppercase tracking-widest font-semibold">Total HT</th>
                    <th className="text-right px-3 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l) => {
                    const total = ligneTotal(l)
                    const rev   = ligneRevient(l)
                    const m     = total > 0 ? (total - rev) / total * 100 : 0
                    return (
                      <tr key={l.id} className="group transition-colors hover:bg-white/[0.04]" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <td className="px-4 py-2" style={{ color: "#f1f5f9" }}>
                          <Cell
                            value={l.designation}
                            onChange={(v) => updateLigne(l.id, "designation", v)}
                            placeholder="Désignation de la ligne…"
                            className="font-medium"
                          />
                        </td>
                        <td className="px-3 py-2" style={{ color: "#f1f5f9" }}>
                          <Cell
                            value={l.quantite}
                            onChange={(v) => updateLigne(l.id, "quantite", v)}
                            type="number"
                            className="text-right"
                          />
                        </td>
                        <td className="px-3 py-2" style={{ color: "#f1f5f9" }}>
                          <Cell
                            value={l.prix_unitaire}
                            onChange={(v) => updateLigne(l.id, "prix_unitaire", v)}
                            type="number"
                            className="text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Cell
                            value={l.remise_pct}
                            onChange={(v) => updateLigne(l.id, "remise_pct", v)}
                            type="number"
                            className={`text-right ${l.remise_pct > 0 ? "text-orange-300 font-semibold" : "text-white/40"}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-white/40">
                          <Cell
                            value={l.prix_revient}
                            onChange={(v) => updateLigne(l.id, "prix_revient", v)}
                            type="number"
                            className="text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-bold" style={{ color: "#10b981" }}>{fmtN(total, 0)} €</span>
                            <span className="text-[10px] font-medium" style={{
                              color: m < 25 ? "#ef4444" : m < 32 ? "#f59e0b" : "#10b981"
                            }}>
                              {fmtN(m, 1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => supprimerLigne(l.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all text-white/20 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Ajouter ligne */}
            <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button
                onClick={ajouterLigne}
                className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors font-medium text-[#a5b4fc] hover:bg-indigo-500/10"
              >
                <Plus size={15} /> Ajouter une ligne
              </button>
            </div>
          </div>

          {/* ══════════ CARTES TOTAUX + JAUGE ══════════ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Total HT */}
            <div className="glass glow-violet p-5">
              <p className="text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Total HT</p>
              <p className="text-2xl font-bold" style={{ color: "#10b981" }}>{fmt(totalHT)}</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{lignes.length} ligne{lignes.length > 1 ? "s" : ""}</p>
            </div>

            {/* Coût de revient */}
            <div className="glass glow-violet p-5">
              <p className="text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Coût de revient</p>
              <p className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>{fmt(coutRevient)}</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>Marge brute : {fmt(margeBrute)}</p>
            </div>

            {/* Marge % + jauge */}
            <div className="glass glow-violet p-5">
              <p className="text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Marge</p>
              <p className="text-2xl font-bold" style={{ color: margeTextColor }}>
                {fmtN(margePct, 1)}%
              </p>

              {/* Jauge */}
              <div className="mt-2 mb-1">
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(margePct, 100)}%`, background: margeGradient }}
                  />
                </div>
                <div className="flex justify-between text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  <span>0%</span>
                  <span style={{ color: "#ef4444" }}>25%</span>
                  <span style={{ color: "#f59e0b" }}>32%</span>
                  <span style={{ color: "#10b981" }}>50%+</span>
                </div>
              </div>

              {margePct < 25 && (
                <p className="text-xs font-semibold mt-1" style={{ color: "#ef4444" }}>
                  ⚠ Attention : marge insuffisante
                </p>
              )}
              {margePct >= 25 && margePct < 32 && (
                <p className="text-xs mt-1" style={{ color: "#f59e0b" }}>Marge limite — à surveiller</p>
              )}
              {margePct >= 32 && (
                <p className="text-xs mt-1" style={{ color: "#10b981" }}>Marge satisfaisante</p>
              )}
            </div>
          </div>

          {/* ══════════ BOUTONS IA ══════════ */}
          <div className="glass p-5">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#f1f5f9" }}>Analyse avec Claude</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => ouvrirPrompt("Analyser la marge", buildPromptMarge())}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-sm font-semibold transition-colors"
              >
                <span>📊</span> Analyser la marge avec Claude
              </button>
              <button
                onClick={() => ouvrirPrompt("Défendre le prix face au concurrent", buildPromptPrix())}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm font-semibold transition-colors"
              >
                <span>🛡️</span> Défendre le prix face au concurrent
              </button>
            </div>
          </div>

        </main>
      </div>

      {/* ══════════ PANEL PROMPT ══════════ */}
      {promptPanel && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setPromptPanel(null)} />
          <div className="prompt-panel fixed inset-y-0 right-0 w-full max-w-lg z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <h2 className="font-semibold text-sm" style={{ color: "#f1f5f9" }}>{promptPanel.titre}</h2>
              <button onClick={() => setPromptPanel(null)} className="p-1.5 rounded-lg transition-colors hover:bg-white/10">
                <X size={18} style={{ color: "rgba(255,255,255,0.5)" }} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>Copiez ce prompt et collez-le dans Claude.ai :</p>
              <pre className="prompt-pre">
                {promptPanel.contenu}
              </pre>
            </div>
            <div className="px-6 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <button
                onClick={copierPrompt}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
                style={copied
                  ? { background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", borderRadius: "12px" }
                  : { background: "rgba(255,255,255,0.08)", color: "#f1f5f9", borderRadius: "12px" }
                }
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copié !" : "Copier le prompt"}
              </button>
              <p className="text-center text-xs mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                Ouvrez Claude.ai et collez le prompt pour obtenir votre réponse.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
