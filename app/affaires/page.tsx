"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, ChevronRight, ChevronDown } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"

// ─── Types ────────────────────────────────────────────────────────────────────

type Etape = "Prospection" | "R1 Découverte" | "R2 Proposition" | "Négociation" | "Signé"
type TypeProjet = "Neuf" | "Rénovation" | "Extension" | "Remplacement"
type TypeInter = "Éleveur" | "Coopérative" | "Intégrateur"
type Espece = "Poulet chair" | "Poulet label/bio" | "Dinde" | "Canard" | "Poule pondeuse"

interface Affaire {
  id: number
  structure: string
  etape: Etape
  typeProjet: TypeProjet
  espece: Espece
  nbPlaces: number
  montant: number
  marge: number
  prochaineAction: string
  typeInter: TypeInter
  dateDecision: string
}

// ─── Données fictives ─────────────────────────────────────────────────────────

const AFFAIRES: Affaire[] = [
  { id: 1,  structure: "EARL Morin",           etape: "R2 Proposition", typeProjet: "Neuf",         espece: "Poulet chair",     nbPlaces: 22000, montant: 48000, marge: 34, prochaineAction: "Relancer sur devis (J+9)",       typeInter: "Éleveur",     dateDecision: "2026-04-15" },
  { id: 2,  structure: "Gauthier Volailles",    etape: "Négociation",    typeProjet: "Extension",    espece: "Poulet label/bio", nbPlaces: 11000, montant: 32500, marge: 31, prochaineAction: "RDV négociation finale",          typeInter: "Éleveur",     dateDecision: "2026-03-28" },
  { id: 3,  structure: "SAS Lefèvre Avicole",   etape: "Signé",          typeProjet: "Rénovation",   espece: "Poule pondeuse",   nbPlaces: 30000, montant: 21000, marge: 38, prochaineAction: "Suivi démarrage chantier",        typeInter: "Coopérative", dateDecision: "2026-03-10" },
  { id: 4,  structure: "GAEC du Bocage",        etape: "R1 Découverte",  typeProjet: "Neuf",         espece: "Dinde",            nbPlaces:  8000, montant: 67000, marge: 36, prochaineAction: "Envoyer plaquette technique",     typeInter: "Intégrateur", dateDecision: "2026-05-20" },
  { id: 5,  structure: "Ferme Dupont",          etape: "Prospection",    typeProjet: "Remplacement", espece: "Poulet chair",     nbPlaces: 18000, montant: 14200, marge: 29, prochaineAction: "Qualifier le projet par téléphone",typeInter: "Éleveur",     dateDecision: "2026-06-01" },
  { id: 6,  structure: "Coopérative Arvor",     etape: "R2 Proposition", typeProjet: "Extension",    espece: "Canard",           nbPlaces:  6000, montant: 53000, marge: 33, prochaineAction: "Relance devis (J+3)",             typeInter: "Coopérative", dateDecision: "2026-04-30" },
  { id: 7,  structure: "SCEA Bretagne Plumes",  etape: "R1 Découverte",  typeProjet: "Neuf",         espece: "Poulet label/bio", nbPlaces:  4500, montant: 89000, marge: 40, prochaineAction: "Visite de site prévue",           typeInter: "Éleveur",     dateDecision: "2026-07-10" },
  { id: 8,  structure: "Élevages Martin",       etape: "Négociation",    typeProjet: "Rénovation",   espece: "Poule pondeuse",   nbPlaces: 40000, montant: 27500, marge: 30, prochaineAction: "Retravailler offre prix",          typeInter: "Éleveur",     dateDecision: "2026-03-25" },
  { id: 9,  structure: "EARL Renard & Fils",    etape: "Prospection",    typeProjet: "Neuf",         espece: "Dinde",            nbPlaces: 10000, montant: 74000, marge: 37, prochaineAction: "Premier appel de prise de contact", typeInter: "Intégrateur", dateDecision: "2026-08-01" },
  { id: 10, structure: "GFA des Charentes",     etape: "R1 Découverte",  typeProjet: "Extension",    espece: "Canard",           nbPlaces:  7500, montant: 38000, marge: 32, prochaineAction: "Envoyer références chantiers",    typeInter: "Coopérative", dateDecision: "2026-05-05" },
]

// ─── Badge styles ─────────────────────────────────────────────────────────────

const ETAPE_STYLE: Record<Etape, string> = {
  "Prospection":    "bg-white/10 border border-white/20 text-white/60",
  "R1 Découverte":  "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300",
  "R2 Proposition": "bg-amber-500/20 border border-amber-500/40 text-amber-300",
  "Négociation":    "bg-violet-500/20 border border-violet-500/40 text-violet-300",
  "Signé":          "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",
}

const TYPE_PROJET_STYLE: Record<TypeProjet, string> = {
  Neuf:         "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300",
  Rénovation:   "bg-amber-500/20 border border-amber-500/40 text-amber-300",
  Extension:    "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",
  Remplacement: "bg-red-500/20 border border-red-500/40 text-red-300",
}

const ETAPES_OPTIONS: ("Toutes" | Etape)[] = [
  "Toutes", "Prospection", "R1 Découverte", "R2 Proposition", "Négociation", "Signé",
]

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €"
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AffairesPage() {
  const router = useRouter()
  const [filtreEtape, setFiltreEtape] = useState<"Toutes" | Etape>("Toutes")
  const [recherche, setRecherche]     = useState("")
  const [navigueVers, setNavigueVers] = useState("")

  const affairesFiltrees = AFFAIRES.filter((a) => {
    const matchEtape = filtreEtape === "Toutes" || a.etape === filtreEtape
    const matchRecherche =
      a.structure.toLowerCase().includes(recherche.toLowerCase()) ||
      a.espece.toLowerCase().includes(recherche.toLowerCase())
    return matchEtape && matchRecherche
  })

  function handleSelectNavigate(id: string) {
    setNavigueVers(id)
    if (id) router.push(`/affaires/${id}`)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title="Affaires" />

        <main className="flex-1 p-5 md:p-6 pb-20 md:pb-6 space-y-4">

          {/* Barre d'outils */}
          <div className="flex flex-wrap items-center gap-3">

            {/* Sélecteur navigation rapide */}
            <select
              value={navigueVers}
              onChange={(e) => handleSelectNavigate(e.target.value)}
              className="select-glass min-w-[220px]"
            >
              <option value="">Accéder à une affaire…</option>
              {AFFAIRES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.structure}
                </option>
              ))}
            </select>

            {/* Filtre étape */}
            <select
              value={filtreEtape}
              onChange={(e) => setFiltreEtape(e.target.value as typeof filtreEtape)}
              className="select-glass"
            >
              {ETAPES_OPTIONS.map((e) => (
                <option key={e}>{e}</option>
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
              {fmt(affairesFiltrees.reduce((s, a) => s + a.montant, 0))} total
            </span>
          </p>

          {/* Tableau */}
          <div className="glass overflow-hidden">
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
                        <div className="font-semibold text-[#f1f5f9]">{a.structure}</div>
                        <div className="text-xs text-white/50">{a.typeInter}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${ETAPE_STYLE[a.etape]}`}>
                          {a.etape}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${TYPE_PROJET_STYLE[a.typeProjet]}`}>
                          {a.typeProjet}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell text-white/50 text-xs">
                        {a.espece}
                        <div className="text-white/35">{a.nbPlaces.toLocaleString("fr-FR")} pl.</div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold whitespace-nowrap amount">
                        {fmt(a.montant)}
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
                        {a.prochaineAction}
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
