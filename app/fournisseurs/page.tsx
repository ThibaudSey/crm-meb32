"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Star, Sparkles, ArrowRight } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"
import LoadingSpinner from "@/components/LoadingSpinner"
import EmptyState from "@/components/EmptyState"
import { supabase } from "@/lib/supabase"
import type { Fournisseur, FournisseurContact } from "@/lib/types"

// ─── Types locaux ─────────────────────────────────────────────────────────────

type FournisseurWithContact = Fournisseur & {
  fournisseurs_contacts: FournisseurContact[]
}

// ─── Config catégories ────────────────────────────────────────────────────────

const CAT_CONFIG: Record<string, { badge: string; gradient: string }> = {
  "Ventilation / Climatisation": { badge: "bg-blue-500/20 border border-blue-500/40 text-blue-300",        gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
  "Chauffage / Éclairage":       { badge: "bg-orange-500/20 border border-orange-500/40 text-orange-300",  gradient: "linear-gradient(135deg,#f97316,#ea580c)" },
  "Abreuvement / Alimentation":  { badge: "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300", gradient: "linear-gradient(135deg,#10b981,#059669)" },
  "Télégestion / Capteurs":      { badge: "bg-violet-500/20 border border-violet-500/40 text-violet-300",  gradient: "linear-gradient(135deg,#8b5cf6,#7c3aed)" },
  "Structure / Bâtiment":        { badge: "bg-amber-500/20 border border-amber-500/40 text-amber-300",     gradient: "linear-gradient(135deg,#f59e0b,#d97706)" },
  "Pesage":                      { badge: "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300",        gradient: "linear-gradient(135deg,#06b6d4,#0891b2)" },
  "Autre":                       { badge: "bg-white/10 border border-white/20 text-white/50",              gradient: "linear-gradient(135deg,#6b7280,#4b5563)" },
}
const DEFAULT_CAT = { badge: "bg-white/10 border border-white/20 text-white/50", gradient: "linear-gradient(135deg,#6b7280,#4b5563)" }
function cat(c: string | null) { return c ? (CAT_CONFIG[c] ?? DEFAULT_CAT) : DEFAULT_CAT }

const STATUT_CONFIG: Record<string, { badge: string; label: string }> = {
  actif:       { badge: "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300", label: "Actif" },
  en_test:     { badge: "bg-amber-500/20 border border-amber-500/40 text-amber-300",       label: "En test" },
  inactif:     { badge: "bg-white/10 border border-white/20 text-white/40",                label: "Inactif" },
  "blacklisté":{ badge: "bg-red-500/20 border border-red-500/40 text-red-300",             label: "Blacklisté" },
}
const DEFAULT_STATUT = { badge: "bg-white/10 border border-white/20 text-white/40", label: "Inconnu" }

// ─── Stars ────────────────────────────────────────────────────────────────────

function Stars({ note }: { note: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className="text-sm" style={{ color: i <= note ? "#f59e0b" : "rgba(255,255,255,0.15)" }}>★</span>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FournisseursPage() {
  const router = useRouter()
  const [fournisseurs, setFournisseurs] = useState<FournisseurWithContact[]>([])
  const [loading, setLoading]           = useState(true)
  const [filtre, setFiltre]             = useState("Tous")
  const [recherche, setRecherche]       = useState("")

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("fournisseurs")
        .select("*, fournisseurs_contacts(*)")
        .order("nom")
      setFournisseurs((data ?? []) as FournisseurWithContact[])
      setLoading(false)
    }
    load()
  }, [])

  const allCats = useMemo(() => {
    const cats = new Set(fournisseurs.map(f => f.categorie).filter(Boolean) as string[])
    return ["Tous", ...Array.from(cats).sort()]
  }, [fournisseurs])

  const filtered = useMemo(() => fournisseurs.filter(f => {
    const matchCat = filtre === "Tous" || f.categorie === filtre
    const q = recherche.toLowerCase()
    const contact = f.fournisseurs_contacts?.find(c => c.est_principal) ?? f.fournisseurs_contacts?.[0]
    const matchQ = !q
      || f.nom.toLowerCase().includes(q)
      || (f.zone_geo ?? "").toLowerCase().includes(q)
      || (contact?.nom ?? "").toLowerCase().includes(q)
      || (contact?.prenom ?? "").toLowerCase().includes(q)
    return matchCat && matchQ
  }), [fournisseurs, filtre, recherche])

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title="Fournisseurs & Partenaires" />

        <main className="flex-1 p-5 md:p-6 pb-20 md:pb-8 space-y-5">

          {/* ── Toolbar ── */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 flex-1 min-w-[200px] max-w-xs"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <Search size={14} style={{ color: "rgba(255,255,255,0.35)" }} />
              <input
                type="text"
                placeholder="Rechercher…"
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
                className="bg-transparent text-sm text-[#f1f5f9] outline-none w-full"
                style={{ caretColor: "#a5b4fc", fontSize: "16px" }}
              />
            </div>
            {!loading && (
              <span className="text-sm ml-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                {filtered.length} fournisseur{filtered.length !== 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={() => router.push("/fournisseurs/nouveau")}
              className="ml-auto btn-primary rounded-xl flex items-center gap-2 text-sm font-semibold px-4 py-2.5"
            >
              <Plus size={16} /> Nouveau fournisseur
            </button>
          </div>

          {loading ? <LoadingSpinner /> : (
            <>
              {/* ── Filtres catégorie ── */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap" style={{ scrollbarWidth: "none" }}>
                {allCats.map(c => (
                  <button
                    key={c}
                    onClick={() => setFiltre(c)}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      filtre === c
                        ? c === "Tous"
                          ? "bg-indigo-500/30 border-indigo-500/50 text-indigo-200"
                          : cat(c).badge.replace("/20", "/35") + " font-semibold"
                        : c === "Tous"
                          ? "border-white/15 text-white/50 hover:border-white/30"
                          : cat(c).badge + " opacity-60 hover:opacity-100"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* ── Grille cards ── */}
              {filtered.length === 0 ? (
                <EmptyState
                  icon="🏭"
                  title="Aucun fournisseur"
                  subtitle={recherche ? "Modifiez votre recherche" : "Ajoutez votre premier fournisseur"}
                  actionLabel="Nouveau fournisseur"
                  onAction={() => router.push("/fournisseurs/nouveau")}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map(f => {
                    const cfg    = cat(f.categorie)
                    const stCfg  = STATUT_CONFIG[f.statut] ?? DEFAULT_STATUT
                    const contact = f.fournisseurs_contacts?.find(c => c.est_principal) ?? f.fournisseurs_contacts?.[0]
                    const contactNom = [contact?.prenom, contact?.nom].filter(Boolean).join(" ") || "—"
                    const initials = f.nom.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase()

                    return (
                      <div key={f.id} className="glass flex flex-col gap-3 p-5 hover:scale-[1.01] transition-transform">

                        {/* Header */}
                        <div className="flex items-start gap-3">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                            style={{ background: cfg.gradient, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
                          >
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate" style={{ color: "#f1f5f9" }}>{f.nom}</p>
                            <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{f.zone_geo ?? f.adresse ?? "—"}</p>
                          </div>
                          <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${stCfg.badge}`}>
                            {stCfg.label}
                          </span>
                        </div>

                        {/* Catégorie */}
                        <span className={`self-start text-[11px] px-2.5 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                          {f.categorie ?? "Autre"}
                        </span>

                        {/* Infos */}
                        <div className="space-y-1.5 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="flex items-center justify-between text-xs">
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>Contact</span>
                            <span style={{ color: "#f1f5f9" }}>{contactNom}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>Tél.</span>
                            <span style={{ color: "rgba(255,255,255,0.7)" }}>{contact?.telephone ?? "—"}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>Délai devis</span>
                            <span style={{ color: "rgba(255,255,255,0.7)" }}>{f.delai_reponse_habituel ?? "—"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Fiabilité</span>
                            <Stars note={f.note_fiabilite ?? 0} />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-auto">
                          <button
                            onClick={() => router.push(`/fournisseurs/${f.id}`)}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl font-medium transition-all"
                            style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.25)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "rgba(99,102,241,0.15)")}
                          >
                            <Sparkles size={11} /> Demander un devis
                          </button>
                          <button
                            onClick={() => router.push(`/fournisseurs/${f.id}`)}
                            className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl transition-all"
                            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                          >
                            Fiche <ArrowRight size={11} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
