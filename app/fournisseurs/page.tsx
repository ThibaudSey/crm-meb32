"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Star, Sparkles, ArrowRight } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Fournisseur {
  id: string
  nom: string
  categorie: string
  ville: string
  contact: { nom: string; tel: string }
  delai: string
  note: number
  statut: "actif" | "en_test" | "inactif"
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
function cat(c: string) { return CAT_CONFIG[c] ?? DEFAULT_CAT }

const STATUT_CONFIG = {
  actif:    { badge: "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300", label: "Actif" },
  en_test:  { badge: "bg-amber-500/20 border border-amber-500/40 text-amber-300",       label: "En test" },
  inactif:  { badge: "bg-white/10 border border-white/20 text-white/40",                label: "Inactif" },
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const FOURNISSEURS: Fournisseur[] = [
  { id: "1", nom: "Big Dutchman France",   categorie: "Abreuvement / Alimentation",  ville: "Châteaubourg (35)", contact: { nom: "Pierre Leclerc",   tel: "06 78 45 12 30" }, delai: "48h",       note: 4, statut: "actif"   },
  { id: "2", nom: "Fancom France",         categorie: "Télégestion / Capteurs",       ville: "Vendée (85)",       contact: { nom: "Sophie Martin",    tel: "06 23 45 67 89" }, delai: "1 semaine", note: 5, statut: "actif"   },
  { id: "3", nom: "SKOV Avicole",          categorie: "Ventilation / Climatisation",  ville: "Lyon (69)",         contact: { nom: "Marc Dupuis",      tel: "04 72 33 44 55" }, delai: "48h",       note: 4, statut: "actif"   },
  { id: "4", nom: "Bâtivolaille",          categorie: "Structure / Bâtiment",         ville: "Nantes (44)",       contact: { nom: "Jean Durand",      tel: "02 40 12 34 56" }, delai: "2 semaines",note: 3, statut: "actif"   },
  { id: "5", nom: "Agri-Concept",          categorie: "Structure / Bâtiment",         ville: "Rennes (35)",       contact: { nom: "Marie Bernard",    tel: "02 99 56 78 90" }, delai: "1 semaine", note: 3, statut: "en_test" },
  { id: "6", nom: "Plasson France",        categorie: "Abreuvement / Alimentation",   ville: "Angers (49)",       contact: { nom: "Antoine Moreau",   tel: "02 41 23 45 67" }, delai: "48h",       note: 4, statut: "actif"   },
  { id: "7", nom: "Aco Funki",             categorie: "Chauffage / Éclairage",        ville: "Loudéac (22)",      contact: { nom: "Isabelle Rousseau",tel: "02 96 45 67 89" }, delai: "1 semaine", note: 4, statut: "actif"   },
  { id: "8", nom: "Sensor Line Avicole",   categorie: "Pesage",                       ville: "Toulouse (31)",     contact: { nom: "Paul Mercier",     tel: "05 61 23 45 67" }, delai: "2 semaines",note: 3, statut: "en_test" },
]

const ALL_CATS = ["Tous", ...Object.keys(CAT_CONFIG)]

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
  const [filtre, setFiltre] = useState("Tous")
  const [recherche, setRecherche] = useState("")

  const filtered = FOURNISSEURS.filter(f => {
    const matchCat = filtre === "Tous" || f.categorie === filtre
    const q = recherche.toLowerCase()
    const matchQ = !q || f.nom.toLowerCase().includes(q) || f.ville.toLowerCase().includes(q) || f.contact.nom.toLowerCase().includes(q)
    return matchCat && matchQ
  })

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title="Fournisseurs & Partenaires" />

        <main className="flex-1 p-5 md:p-6 pb-20 md:pb-8 space-y-5">

          {/* ── Toolbar ── */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Recherche */}
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 flex-1 min-w-[200px] max-w-xs"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <Search size={14} style={{ color: "rgba(255,255,255,0.35)" }} />
              <input
                type="text"
                placeholder="Rechercher…"
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
                className="bg-transparent text-sm text-[#f1f5f9] outline-none w-full"
                style={{ caretColor: "#a5b4fc" }}
              />
            </div>
            <span className="text-sm ml-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              {filtered.length} fournisseur{filtered.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => router.push("/fournisseurs/nouveau")}
              className="ml-auto btn-primary rounded-xl flex items-center gap-2 text-sm font-semibold px-4 py-2.5"
            >
              <Plus size={16} /> Nouveau fournisseur
            </button>
          </div>

          {/* ── Filtres catégorie ── */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap" style={{ scrollbarWidth: "none" }}>
            {ALL_CATS.map(c => (
              <button
                key={c}
                onClick={() => setFiltre(c)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  filtre === c
                    ? c === "Tous"
                      ? "bg-indigo-500/30 border-indigo-500/50 text-indigo-200"
                      : cat(c).badge.replace("bg-", "bg-").replace("/20", "/35") + " font-semibold"
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
            <div className="glass py-16 text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
              Aucun fournisseur correspondant
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(f => {
                const cfg = cat(f.categorie)
                const stCfg = STATUT_CONFIG[f.statut]
                const initials = f.nom.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()
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
                        <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{f.ville}</p>
                      </div>
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${stCfg.badge}`}>
                        {stCfg.label}
                      </span>
                    </div>

                    {/* Catégorie */}
                    <span className={`self-start text-[11px] px-2.5 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                      {f.categorie}
                    </span>

                    {/* Infos */}
                    <div className="space-y-1.5 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>Contact</span>
                        <span style={{ color: "#f1f5f9" }}>{f.contact.nom}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>Tél.</span>
                        <span style={{ color: "rgba(255,255,255,0.7)" }}>{f.contact.tel}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>Délai devis</span>
                        <span style={{ color: "rgba(255,255,255,0.7)" }}>{f.delai}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Fiabilité</span>
                        <Stars note={f.note} />
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
        </main>
      </div>
    </div>
  )
}
