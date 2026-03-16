"use client"

import { useState, useRef } from "react"
import {
  Receipt, Car, Plus, Eye, Pencil, Trash2, Download,
  Printer, ChevronLeft, ChevronRight, Settings, X,
  Camera, Loader2, Check, BarChart3,
} from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"
import { exportToCSV, fmtDateExport } from "@/lib/export"

// ─── Types ────────────────────────────────────────────────────────────────────

interface FraisEntry {
  id: string
  date: string
  categorie: string
  description: string
  affaire_id: string | null
  montant_ttc: number
  montant_ht: number | null
  tva: number | null
  justificatif_url: string | null
}

interface KmEntry {
  id: string
  date: string
  depart: string
  arrivee: string
  km: number
  aller_retour: boolean
  motif: string
  affaire_id: string | null
  vehicule: string
  puissance_fiscale: number
  taux_ik: number
  indemnite: number
}

interface Vehicule {
  id: string
  nom: string
  immatriculation: string
  puissance_fiscale: number
  type_vehicule: string
  est_defaut: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "Repas/Restaurant", label: "Repas",      icon: "🍽️" },
  { value: "Carburant",        label: "Carburant",  icon: "⛽" },
  { value: "Péage",            label: "Péage",      icon: "🛣️" },
  { value: "Parking",          label: "Parking",    icon: "🅿️" },
  { value: "Hôtel",            label: "Hôtel",      icon: "🏨" },
  { value: "Matériel",         label: "Matériel",   icon: "📦" },
  { value: "Autre",            label: "Autre",      icon: "❓" },
]

const AFFAIRES_MOCK = [
  { id: "AF-001", nom: "Ferme Martin – Poulailler 4000" },
  { id: "AF-002", nom: "GAEC Dubois – Extension bâtiment" },
  { id: "AF-003", nom: "Earl Lefebvre – Télégestion" },
]

const IK_RATES: Record<number, number> = {
  3: 0.529, 4: 0.606, 5: 0.636, 6: 0.665, 7: 0.697,
}

const BAREME_IK_2025 = [
  { cv: "3 CV",  t1: 0.529, t2: "d × 0,316 + 1 065", t3: 0.374 },
  { cv: "4 CV",  t1: 0.606, t2: "d × 0,340 + 1 330", t3: 0.407 },
  { cv: "5 CV",  t1: 0.636, t2: "d × 0,357 + 1 395", t3: 0.427 },
  { cv: "6 CV",  t1: 0.665, t2: "d × 0,374 + 1 457", t3: 0.449 },
  { cv: "7 CV+", t1: 0.697, t2: "d × 0,394 + 1 515", t3: 0.470 },
]

const MONTHS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
]

// ─── Mock data ────────────────────────────────────────────────────────────────

const INIT_FRAIS: FraisEntry[] = [
  { id: "f1", date: "2026-03-14", categorie: "Repas/Restaurant", description: "Déjeuner client – Ferme Martin", affaire_id: "AF-001", montant_ttc: 45.80, montant_ht: 38.17, tva: 7.63, justificatif_url: null },
  { id: "f2", date: "2026-03-12", categorie: "Carburant",        description: "Station Total A64",             affaire_id: null,     montant_ttc: 82.50, montant_ht: 68.75, tva: 13.75, justificatif_url: null },
  { id: "f3", date: "2026-03-10", categorie: "Péage",            description: "Autoroute A62 Bordeaux",        affaire_id: "AF-003", montant_ttc: 12.40, montant_ht: 12.40, tva: 0,     justificatif_url: null },
  { id: "f4", date: "2026-03-08", categorie: "Parking",          description: "Parking Mérignac",              affaire_id: null,     montant_ttc: 8.00,  montant_ht: 8.00,  tva: 0,     justificatif_url: null },
  { id: "f5", date: "2026-03-05", categorie: "Repas/Restaurant", description: "Déjeuner visite chantier",      affaire_id: "AF-002", montant_ttc: 28.40, montant_ht: 23.67, tva: 4.73,  justificatif_url: null },
]

const INIT_KM: KmEntry[] = [
  { id: "k1", date: "2026-03-14", depart: "Auch (32)", arrivee: "Agen (47)",      km: 90,  aller_retour: true, motif: "Visite client Ferme Martin",  affaire_id: "AF-001", vehicule: "Peugeot 308", puissance_fiscale: 5, taux_ik: 0.636, indemnite: 57.24  },
  { id: "k2", date: "2026-03-10", depart: "Auch (32)", arrivee: "Bordeaux (33)",  km: 180, aller_retour: true, motif: "Démonstration matériel",       affaire_id: "AF-003", vehicule: "Peugeot 308", puissance_fiscale: 5, taux_ik: 0.636, indemnite: 114.48 },
  { id: "k3", date: "2026-03-05", depart: "Auch (32)", arrivee: "Toulouse (31)",  km: 120, aller_retour: true, motif: "Réunion fournisseur SKOV",     affaire_id: null,     vehicule: "Peugeot 308", puissance_fiscale: 5, taux_ik: 0.636, indemnite: 76.32  },
]

const INIT_VEHICULES: Vehicule[] = [
  { id: "v1", nom: "Peugeot 308", immatriculation: "AB-123-CD", puissance_fiscale: 5, type_vehicule: "thermique", est_defaut: true },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toFixed(2).replace(".", ",") + " €"
}

function catConfig(cat: string) {
  return CATEGORIES.find(c => c.value === cat) ?? { value: cat, label: cat, icon: "❓" }
}

function exportFraisCSV(frais: FraisEntry[]) {
  exportToCSV(
    frais.map(f => ({
      date:      fmtDateExport(f.date),
      categorie: f.categorie,
      desc:      f.description,
      affaire:   f.affaire_id ?? "",
      ttc:       f.montant_ttc,
      mois:      f.date.split("-")[1],
      annee:     f.date.split("-")[0],
    })),
    `frais-MEB32-${new Date().toISOString().slice(0, 7)}.csv`,
    [
      { key: "date",      label: "Date"           },
      { key: "categorie", label: "Catégorie"      },
      { key: "desc",      label: "Description"    },
      { key: "affaire",   label: "Affaire liée"   },
      { key: "ttc",       label: "Montant TTC €"  },
      { key: "mois",      label: "Mois"           },
      { key: "annee",     label: "Année"          },
    ]
  )
}

function exportKmCSV(km: KmEntry[]) {
  exportToCSV(
    km.map(k => ({
      date:         fmtDateExport(k.date),
      depart:       k.depart,
      arrivee:      k.arrivee,
      km:           k.km,
      allerRetour:  k.aller_retour ? "oui" : "non",
      motif:        k.motif,
      vehicule:     k.vehicule,
      taux:         k.taux_ik,
      indemnite:    k.indemnite,
      mois:         k.date.split("-")[1],
      annee:        k.date.split("-")[0],
    })),
    `kilometrique-MEB32-${new Date().toISOString().slice(0, 7)}.csv`,
    [
      { key: "date",        label: "Date"           },
      { key: "depart",      label: "Départ"         },
      { key: "arrivee",     label: "Arrivée"        },
      { key: "km",          label: "KM"             },
      { key: "allerRetour", label: "Aller-retour"   },
      { key: "motif",       label: "Motif"          },
      { key: "vehicule",    label: "Véhicule"       },
      { key: "taux",        label: "Taux IK €/km"   },
      { key: "indemnite",   label: "Indemnité €"    },
      { key: "mois",        label: "Mois"           },
      { key: "annee",       label: "Année"          },
    ]
  )
}

function exportCSV(frais: FraisEntry[], km: KmEntry[], month: number, year: number) {
  let csv = "Type,Date,Description,Affaire,Montant TTC,Catégorie / Véhicule,Détail\n"
  frais.forEach(f => {
    const aff = AFFAIRES_MOCK.find(a => a.id === f.affaire_id)?.nom ?? ""
    csv += `Frais,${f.date},"${f.description}","${aff}",${f.montant_ttc},"${f.categorie}",""\n`
  })
  km.forEach(k => {
    const aff = AFFAIRES_MOCK.find(a => a.id === k.affaire_id)?.nom ?? ""
    csv += `Kilométrique,${k.date},"${k.depart} → ${k.arrivee}","${aff}",${k.indemnite},"${k.vehicule} (${k.puissance_fiscale}CV)","${k.km}km × ${k.taux_ik}€/km"\n`
  })
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `frais-${MONTHS_FR[month - 1]}-${year}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FraisPage() {
  const [tab, setTab] = useState<"frais" | "km">("frais")
  const [month, setMonth] = useState(3)
  const [year, setYear] = useState(2026)

  const [fraisList, setFraisList] = useState<FraisEntry[]>(INIT_FRAIS)
  const [kmList, setKmList] = useState<KmEntry[]>(INIT_KM)
  const [vehicules, setVehicules] = useState<Vehicule[]>(INIT_VEHICULES)

  const [showAddFrais, setShowAddFrais] = useState(false)
  const [showAddKm, setShowAddKm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showRecap, setShowRecap] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "frais" | "km"; id: string } | null>(null)
  const [editFrais, setEditFrais] = useState<FraisEntry | null>(null)

  const filteredFrais = fraisList.filter(f => {
    const [y, m] = f.date.split("-").map(Number)
    return y === year && m === month
  })
  const filteredKm = kmList.filter(k => {
    const [y, m] = k.date.split("-").map(Number)
    return y === year && m === month
  })

  const totalFrais = filteredFrais.reduce((s, f) => s + f.montant_ttc, 0)
  const totalKm = filteredKm.reduce((s, k) => s + k.km, 0)
  const totalIndemnites = filteredKm.reduce((s, k) => s + k.indemnite, 0)
  const totalRemboursable = totalFrais + totalIndemnites

  const catBreakdown = CATEGORIES.map(c => ({
    ...c,
    total: filteredFrais.filter(f => f.categorie === c.value).reduce((s, f) => s + f.montant_ttc, 0),
  })).filter(c => c.total > 0)

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function handleSaveFrais(f: FraisEntry) {
    if (editFrais) setFraisList(l => l.map(x => x.id === f.id ? f : x))
    else setFraisList(l => [...l, f])
    setShowAddFrais(false)
    setEditFrais(null)
  }

  function handleDelete() {
    if (!deleteConfirm) return
    if (deleteConfirm.type === "frais") setFraisList(l => l.filter(f => f.id !== deleteConfirm.id))
    else setKmList(l => l.filter(k => k.id !== deleteConfirm.id))
    setDeleteConfirm(null)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title="Frais & Kilométrique" actions={
          <div className="flex gap-1.5">
            <button
              onClick={() => exportFraisCSV(fraisList)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.25)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(99,102,241,0.15)")}
            >
              <Download size={13} /> Frais
            </button>
            <button
              onClick={() => exportKmCSV(kmList)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#6ee7b7" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(16,185,129,0.22)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(16,185,129,0.12)")}
            >
              <Download size={13} /> KM
            </button>
          </div>
        } />

        <main className="flex-1 p-5 md:p-6 pb-20 md:pb-8 space-y-5">

          {/* ── Zone haute : saisie rapide ── */}
          {/* Mobile : 2 gros boutons côte à côte */}
          <div className="grid grid-cols-2 gap-3 md:hidden">
            <button
              onClick={() => { setEditFrais(null); setShowAddFrais(true) }}
              className="rounded-xl flex flex-col items-center justify-center gap-1.5 text-sm font-semibold transition-all"
              style={{ height: "64px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", boxShadow: "0 4px 15px rgba(99,102,241,0.35)" }}
            >
              <Receipt size={20} />
              <span className="text-xs">📸 Ajouter un frais</span>
            </button>
            <button
              onClick={() => setShowAddKm(true)}
              className="rounded-xl flex flex-col items-center justify-center gap-1.5 text-sm font-semibold transition-all"
              style={{ height: "64px", background: "linear-gradient(135deg, #10b981, #059669)", color: "white", boxShadow: "0 4px 15px rgba(16,185,129,0.3)" }}
            >
              <Car size={20} />
              <span className="text-xs">🚗 Ajouter des KM</span>
            </button>
          </div>
          {/* Desktop : boutons en ligne */}
          <div className="hidden md:flex flex-wrap gap-3">
            <button
              onClick={() => { setEditFrais(null); setShowAddFrais(true) }}
              className="rounded-xl flex items-center gap-2.5 px-5 py-3 text-sm font-semibold flex-1 min-w-[200px] justify-center transition-all"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", boxShadow: "0 4px 15px rgba(99,102,241,0.35)" }}
            >
              <Receipt size={17} /> 📸 Ajouter un frais
            </button>
            <button
              onClick={() => setShowAddKm(true)}
              className="rounded-xl flex items-center gap-2.5 px-5 py-3 text-sm font-semibold flex-1 min-w-[200px] justify-center transition-all"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white", boxShadow: "0 4px 15px rgba(16,185,129,0.3)" }}
            >
              <Car size={17} /> 🚗 Ajouter des kilomètres
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-xl flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            >
              <Settings size={16} /> Paramètres
            </button>
          </div>

          {/* ── Zone milieu : tableau du mois ── */}
          <div className="glass p-5 space-y-4">

            {/* Navigation mois */}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: "rgba(255,255,255,0.5)" }}>
                <ChevronLeft size={18} />
              </button>
              <span className="font-bold text-sm w-32 text-center" style={{ color: "#f1f5f9" }}>
                {MONTHS_FR[month - 1]} {year}
              </span>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: "rgba(255,255,255,0.5)" }}>
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => { setMonth(3); setYear(2026) }}
                className="text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              >
                Mois en cours
              </button>
            </div>

            {/* Onglets */}
            <div className="flex gap-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              {(["frais", "km"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="px-4 py-2.5 text-sm font-medium transition-all"
                  style={{
                    color: tab === t ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                    borderBottom: tab === t ? "2px solid #a5b4fc" : "2px solid transparent",
                    marginBottom: -1,
                  }}
                >
                  {t === "frais" ? `📄 Frais (${filteredFrais.length})` : `🚗 Kilométrique (${filteredKm.length})`}
                </button>
              ))}
            </div>

            {/* Tableau frais */}
            {tab === "frais" && (
              <div className="overflow-x-auto">
                {filteredFrais.length === 0 ? (
                  <div className="py-12 text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Aucun frais ce mois — cliquez sur &quot;Ajouter un frais&quot;
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        {["Date", "Catégorie", "Description", "Affaire", "Montant TTC", "Justif.", ""].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...filteredFrais].sort((a, b) => b.date.localeCompare(a.date)).map(f => {
                        const cc = catConfig(f.categorie)
                        return (
                          <tr key={f.id} className="hover:bg-white/[0.03] transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td className="py-2.5 px-3 text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                              {f.date.split("-").reverse().join("/")}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full w-fit"
                                style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.25)" }}>
                                {cc.icon} {cc.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-sm" style={{ color: "#f1f5f9" }}>{f.description}</td>
                            <td className="py-2.5 px-3 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                              {f.affaire_id ? (AFFAIRES_MOCK.find(a => a.id === f.affaire_id)?.nom ?? f.affaire_id) : "—"}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-right" style={{ color: "#f1f5f9" }}>
                              {fmt(f.montant_ttc)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {f.justificatif_url ? (
                                <button onClick={() => setPhotoPreview(f.justificatif_url!)}
                                  className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: "#a5b4fc" }}>
                                  <Eye size={14} />
                                </button>
                              ) : (
                                <span style={{ color: "rgba(255,255,255,0.15)" }}>—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex gap-1">
                                <button onClick={() => { setEditFrais(f); setShowAddFrais(true) }}
                                  className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: "rgba(255,255,255,0.4)" }}>
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => setDeleteConfirm({ type: "frais", id: f.id })}
                                  className="p-1.5 rounded-lg hover:bg-red-500/20 transition-all" style={{ color: "rgba(255,255,255,0.4)" }}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                        <td colSpan={4} className="py-3 px-3 text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
                          Total du mois
                        </td>
                        <td className="py-3 px-3 font-bold text-right text-base" style={{ color: "#a5b4fc" }}>
                          {fmt(totalFrais)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}

            {/* Tableau km */}
            {tab === "km" && (
              <div className="overflow-x-auto">
                {filteredKm.length === 0 ? (
                  <div className="py-12 text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Aucun trajet ce mois — cliquez sur &quot;Ajouter des kilomètres&quot;
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        {["Date", "Trajet", "Affaire", "Km", "Véhicule", "Taux IK", "Indemnité", ""].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...filteredKm].sort((a, b) => b.date.localeCompare(a.date)).map(k => (
                        <tr key={k.id} className="hover:bg-white/[0.03] transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td className="py-2.5 px-3 text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                            {k.date.split("-").reverse().join("/")}
                          </td>
                          <td className="py-2.5 px-3" style={{ color: "#f1f5f9" }}>
                            <span>{k.depart}</span>
                            <span className="mx-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>→</span>
                            <span>{k.arrivee}</span>
                            {k.aller_retour && (
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
                                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
                                A/R
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                            {k.affaire_id ? (AFFAIRES_MOCK.find(a => a.id === k.affaire_id)?.nom ?? k.affaire_id) : "—"}
                          </td>
                          <td className="py-2.5 px-3 font-medium" style={{ color: "#f1f5f9" }}>{k.km} km</td>
                          <td className="py-2.5 px-3 text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>{k.vehicule}</td>
                          <td className="py-2.5 px-3 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{k.taux_ik.toFixed(3)} €/km</td>
                          <td className="py-2.5 px-3 font-semibold text-right" style={{ color: "#10b981" }}>
                            {fmt(k.indemnite)}
                          </td>
                          <td className="py-2.5 px-3">
                            <button onClick={() => setDeleteConfirm({ type: "km", id: k.id })}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 transition-all" style={{ color: "rgba(255,255,255,0.4)" }}>
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                        <td colSpan={3} className="py-3 px-3 text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>Total</td>
                        <td className="py-3 px-3 font-bold" style={{ color: "#f1f5f9" }}>{totalKm} km</td>
                        <td colSpan={2} />
                        <td className="py-3 px-3 font-bold text-right" style={{ color: "#10b981" }}>{fmt(totalIndemnites)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* ── Zone basse : récapitulatif mensuel ── */}
          <div className="space-y-4">

            {/* Cards totaux */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="glass p-4 space-y-1">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Total frais TTC</p>
                <p className="text-xl font-bold" style={{ color: "#f1f5f9" }}>{fmt(totalFrais)}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{filteredFrais.length} justificatif{filteredFrais.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="glass p-4 space-y-1">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Kilomètres</p>
                <p className="text-xl font-bold" style={{ color: "#f1f5f9" }}>{totalKm} km</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{filteredKm.length} trajet{filteredKm.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="glass p-4 space-y-1">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Indemnités IK</p>
                <p className="text-xl font-bold" style={{ color: "#10b981" }}>{fmt(totalIndemnites)}</p>
              </div>
              <div className="glass p-4 space-y-1" style={{ border: "1px solid rgba(99,102,241,0.3)" }}>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Total remboursable</p>
                <p className="text-xl font-bold" style={{ color: "#a5b4fc" }}>{fmt(totalRemboursable)}</p>
              </div>
            </div>

            {/* Répartition catégories */}
            {catBreakdown.length > 0 && (
              <div className="glass p-5">
                <h3 className="text-sm font-semibold mb-3" style={{ color: "#f1f5f9" }}>Répartition par catégorie</h3>
                <div className="space-y-2.5">
                  {catBreakdown.sort((a, b) => b.total - a.total).map(c => (
                    <div key={c.value} className="flex items-center gap-3">
                      <span className="text-base w-6 text-center shrink-0">{c.icon}</span>
                      <span className="text-xs w-24 shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>{c.label}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${totalFrais > 0 ? (c.total / totalFrais) * 100 : 0}%`,
                            background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold shrink-0 w-20 text-right" style={{ color: "#f1f5f9" }}>
                        {fmt(c.total)}
                      </span>
                      <span className="text-xs shrink-0 w-8 text-right" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {totalFrais > 0 ? Math.round((c.total / totalFrais) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowRecap(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.25)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(99,102,241,0.15)")}
              >
                <BarChart3 size={15} /> 📊 Récap mensuel complet
              </button>
              <button
                onClick={() => exportCSV(filteredFrais, filteredKm, month, year)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#6ee7b7" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(16,185,129,0.22)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(16,185,129,0.12)")}
              >
                <Download size={15} /> 📥 Exporter en CSV
              </button>
              <button
                onClick={() => setShowPrint(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              >
                <Printer size={15} /> 🖨️ Note de frais imprimable
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* ── Modals ── */}
      {showAddFrais && (
        <AddFraisModal
          initial={editFrais}
          onClose={() => { setShowAddFrais(false); setEditFrais(null) }}
          onSave={handleSaveFrais}
        />
      )}
      {showAddKm && (
        <AddKmModal
          vehicules={vehicules}
          onClose={() => setShowAddKm(false)}
          onSave={k => { setKmList(l => [...l, k]); setShowAddKm(false) }}
        />
      )}
      {showSettings && (
        <SettingsModal
          vehicules={vehicules}
          onClose={() => setShowSettings(false)}
          onChange={setVehicules}
        />
      )}
      {showRecap && (
        <RecapModal
          frais={filteredFrais} km={filteredKm}
          month={month} year={year}
          totalFrais={totalFrais} totalKm={totalKm} totalIndemnites={totalIndemnites}
          onClose={() => setShowRecap(false)}
        />
      )}
      {showPrint && (
        <PrintModal
          frais={filteredFrais} km={filteredKm}
          month={month} year={year}
          totalFrais={totalFrais} totalKm={totalKm} totalIndemnites={totalIndemnites}
          onClose={() => setShowPrint(false)}
        />
      )}
      {photoPreview && (
        <div className="modal-overlay" onClick={() => setPhotoPreview(null)}>
          <div className="modal-box max-w-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold" style={{ color: "#f1f5f9" }}>Justificatif</span>
              <button onClick={() => setPhotoPreview(null)} style={{ color: "rgba(255,255,255,0.4)" }}><X size={18} /></button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="justificatif" className="w-full rounded-xl" />
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-2" style={{ color: "#f1f5f9" }}>Confirmer la suppression</h3>
            <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.5)" }}>Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary rounded-xl flex-1 py-2.5 text-sm">Annuler</button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5" }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Modal : Ajouter un frais ─────────────────────────────────────────────────

function AddFraisModal({
  initial,
  onClose,
  onSave,
}: {
  initial: FraisEntry | null
  onClose: () => void
  onSave: (f: FraisEntry) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [imageData, setImageData] = useState<string | null>(initial?.justificatif_url ?? null)
  const [analyzing, setAnalyzing] = useState(false)
  const [form, setForm] = useState({
    date:        initial?.date ?? new Date().toISOString().split("T")[0],
    categorie:   initial?.categorie ?? "Repas/Restaurant",
    description: initial?.description ?? "",
    affaire_id:  initial?.affaire_id ?? "",
    montant_ttc: initial?.montant_ttc?.toString() ?? "",
    montant_ht:  initial?.montant_ht?.toString() ?? "",
    tva:         initial?.tva?.toString() ?? "",
  })

  function setF(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => setImageData(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function analyzeWithClaude() {
    if (!imageData) return
    setAnalyzing(true)
    try {
      const base64 = imageData.replace(/^data:image\/[^;]+;base64,/, "")
      const mediaType = (imageData.match(/^data:(image\/[^;]+);/)?.[1] ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/webp"
      const res = await fetch("/api/analyse-decouverte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              {
                type: "text",
                text: `Analyse ce justificatif de frais. Extrait et retourne UNIQUEMENT en JSON valide (sans markdown, sans texte avant ou après) :
{"montant_ttc": nombre ou null, "montant_ht": nombre ou null, "tva": nombre ou null, "date": "YYYY-MM-DD" ou null, "lieu": "texte" ou null, "description": "texte court" ou null, "categorie": "Repas/Restaurant" ou "Carburant" ou "Péage" ou "Parking" ou "Hôtel" ou "Matériel" ou "Autre"}`,
              },
            ],
          }],
        }),
      })
      const data = await res.json()
      const text: string = data.content?.[0]?.text ?? ""
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        const json = JSON.parse(match[0])
        setForm(p => ({
          ...p,
          date:        json.date ?? p.date,
          montant_ttc: json.montant_ttc != null ? String(json.montant_ttc) : p.montant_ttc,
          montant_ht:  json.montant_ht  != null ? String(json.montant_ht)  : p.montant_ht,
          tva:         json.tva         != null ? String(json.tva)         : p.tva,
          description: json.description ?? (json.lieu ?? p.description),
          categorie:   CATEGORIES.some(c => c.value === json.categorie) ? json.categorie : p.categorie,
        }))
      }
    } catch (e) {
      console.error("Claude analyse error", e)
    } finally {
      setAnalyzing(false)
    }
  }

  function handleSave() {
    if (!form.montant_ttc || !form.date) return
    onSave({
      id:             initial?.id ?? `f${Date.now()}`,
      date:           form.date,
      categorie:      form.categorie,
      description:    form.description,
      affaire_id:     form.affaire_id || null,
      montant_ttc:    parseFloat(form.montant_ttc),
      montant_ht:     form.montant_ht ? parseFloat(form.montant_ht) : null,
      tva:            form.tva ? parseFloat(form.tva) : null,
      justificatif_url: imageData,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-base" style={{ color: "#f1f5f9" }}>
            {initial ? "Modifier le frais" : "📸 Ajouter un frais"}
          </h2>
          <button onClick={onClose} style={{ color: "rgba(255,255,255,0.4)" }}><X size={18} /></button>
        </div>

        {/* Zone upload */}
        <div
          className="rounded-xl border-2 border-dashed p-5 text-center mb-4 cursor-pointer transition-all"
          style={{
            borderColor: imageData ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)",
            background:  imageData ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)",
          }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        >
          {imageData ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageData} alt="aperçu" className="w-16 h-16 object-cover rounded-lg shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium" style={{ color: "#a5b4fc" }}>Justificatif chargé ✓</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Cliquer pour changer</p>
              </div>
            </div>
          ) : (
            <>
              <Camera size={24} className="mx-auto mb-2" style={{ color: "rgba(255,255,255,0.25)" }} />
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Glisser-déposer ou cliquer pour choisir</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>📷 Caméra disponible sur mobile</p>
            </>
          )}
          <input
            ref={fileRef} type="file" accept="image/*" capture="environment"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>

        {imageData && (
          <button
            onClick={analyzeWithClaude}
            disabled={analyzing}
            className="w-full py-2.5 rounded-xl text-sm font-semibold mb-4 flex items-center justify-center gap-2 transition-all"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "white",
              opacity: analyzing ? 0.7 : 1,
            }}
          >
            {analyzing ? <Loader2 size={15} className="animate-spin" /> : "🤖"}
            {analyzing ? "Analyse en cours…" : "Analyser avec Claude"}
          </button>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Date *</label>
              <input type="date" className="input-glass" value={form.date} onChange={e => setF("date", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Montant TTC *</label>
              <input type="number" step="0.01" min="0" className="input-glass" placeholder="0.00"
                value={form.montant_ttc} onChange={e => setF("montant_ttc", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Catégorie</label>
            <select className="select-glass w-full" value={form.categorie} onChange={e => setF("categorie", e.target.value)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Affaire liée (optionnel)</label>
            <select className="select-glass w-full" value={form.affaire_id} onChange={e => setF("affaire_id", e.target.value)}>
              <option value="">— Aucune affaire —</option>
              {AFFAIRES_MOCK.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Description</label>
            <input className="input-glass" placeholder="Lieu, contexte, raison…"
              value={form.description} onChange={e => setF("description", e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-secondary rounded-xl flex-1 py-2.5 text-sm">Annuler</button>
          <button
            onClick={handleSave}
            disabled={!form.montant_ttc || !form.date}
            className="btn-primary rounded-xl flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
            style={{ opacity: !form.montant_ttc || !form.date ? 0.5 : 1 }}
          >
            <Check size={15} /> ✅ Valider et enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal : Ajouter des kilomètres ──────────────────────────────────────────

function AddKmModal({
  vehicules,
  onClose,
  onSave,
}: {
  vehicules: Vehicule[]
  onClose: () => void
  onSave: (k: KmEntry) => void
}) {
  const defaultV = vehicules.find(v => v.est_defaut) ?? vehicules[0]
  const [form, setForm] = useState({
    date:          new Date().toISOString().split("T")[0],
    depart:        "",
    arrivee:       "",
    km:            "",
    aller_retour:  false,
    affaire_id:    "",
    motif:         "",
    vehicule_id:   defaultV?.id ?? "",
  })

  function setF(k: string, v: string | boolean) { setForm(p => ({ ...p, [k]: v })) }

  const selectedV    = vehicules.find(v => v.id === form.vehicule_id)
  const cv           = selectedV?.puissance_fiscale ?? 5
  const rate         = IK_RATES[Math.min(cv, 7)] ?? 0.697
  const kmBase       = parseFloat(form.km) || 0
  const kmTotal      = form.aller_retour ? kmBase * 2 : kmBase
  const indemnite    = Math.round(kmTotal * rate * 100) / 100
  const canSave      = !!form.km && !!form.depart && !!form.arrivee

  function handleSave() {
    if (!canSave) return
    onSave({
      id:               `k${Date.now()}`,
      date:             form.date,
      depart:           form.depart,
      arrivee:          form.arrivee,
      km:               kmTotal,
      aller_retour:     form.aller_retour,
      motif:            form.motif,
      affaire_id:       form.affaire_id || null,
      vehicule:         selectedV?.nom ?? "",
      puissance_fiscale: cv,
      taux_ik:          rate,
      indemnite,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-base" style={{ color: "#f1f5f9" }}>🚗 Ajouter des kilomètres</h2>
          <button onClick={onClose} style={{ color: "rgba(255,255,255,0.4)" }}><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Départ *</label>
              <input className="input-glass" placeholder="Auch (32)" value={form.depart} onChange={e => setF("depart", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Arrivée *</label>
              <input className="input-glass" placeholder="Agen (47)" value={form.arrivee} onChange={e => setF("arrivee", e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Kilomètres (sens simple) *</label>
              <input type="number" min="1" className="input-glass" placeholder="150" value={form.km} onChange={e => setF("km", e.target.value)} />
            </div>
            <button
              type="button"
              onClick={() => setF("aller_retour", !form.aller_retour)}
              className="px-3 py-2.5 rounded-xl text-xs font-medium border transition-all shrink-0"
              style={{
                background:   form.aller_retour ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
                borderColor:  form.aller_retour ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)",
                color:        form.aller_retour ? "#a5b4fc" : "rgba(255,255,255,0.5)",
              }}
            >
              ↔️ Aller-retour
            </button>
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Véhicule</label>
            <select className="select-glass w-full" value={form.vehicule_id} onChange={e => setF("vehicule_id", e.target.value)}>
              {vehicules.length === 0 && <option value="">— Aucun véhicule configuré —</option>}
              {vehicules.map(v => (
                <option key={v.id} value={v.id}>{v.nom} ({v.puissance_fiscale}CV){v.est_defaut ? " ★" : ""}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Affaire liée (optionnel)</label>
            <select className="select-glass w-full" value={form.affaire_id} onChange={e => setF("affaire_id", e.target.value)}>
              <option value="">— Aucune affaire —</option>
              {AFFAIRES_MOCK.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Motif</label>
              <input className="input-glass" placeholder="Visite client…" value={form.motif} onChange={e => setF("motif", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Date</label>
              <input type="date" className="input-glass" value={form.date} onChange={e => setF("date", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Indemnité calculée en temps réel */}
        {kmBase > 0 && (
          <div className="mt-4 p-4 rounded-xl" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                  {kmTotal} km × {rate.toFixed(3)} €/km ({cv}{cv >= 7 ? "+" : ""} CV)
                </p>
                {form.aller_retour && (
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Aller-retour : {kmBase} km × 2 = {kmTotal} km
                  </p>
                )}
              </div>
              <p className="text-xl font-bold" style={{ color: "#10b981" }}>{fmt(indemnite)}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-secondary rounded-xl flex-1 py-2.5 text-sm">Annuler</button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="btn-primary rounded-xl flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
            style={{ opacity: canSave ? 1 : 0.5 }}
          >
            <Check size={15} /> ✅ Valider
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal : Paramètres ───────────────────────────────────────────────────────

function SettingsModal({
  vehicules,
  onClose,
  onChange,
}: {
  vehicules: Vehicule[]
  onClose: () => void
  onChange: (v: Vehicule[]) => void
}) {
  const [list, setList] = useState<Vehicule[]>(vehicules)
  const [showAdd, setShowAdd] = useState(false)
  const [newV, setNewV] = useState({ nom: "", immatriculation: "", puissance_fiscale: 5, type_vehicule: "thermique" })

  function updateList(updated: Vehicule[]) {
    setList(updated)
    onChange(updated)
  }

  function addVehicule() {
    if (!newV.nom) return
    const v: Vehicule = { ...newV, id: `v${Date.now()}`, est_defaut: list.length === 0 }
    updateList([...list, v])
    setShowAdd(false)
    setNewV({ nom: "", immatriculation: "", puissance_fiscale: 5, type_vehicule: "thermique" })
  }

  function setDefault(id: string) {
    updateList(list.map(v => ({ ...v, est_defaut: v.id === id })))
  }

  function removeVehicule(id: string) {
    updateList(list.filter(v => v.id !== id))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-base" style={{ color: "#f1f5f9" }}>⚙️ Paramètres Frais & IK</h2>
          <button onClick={onClose} style={{ color: "rgba(255,255,255,0.4)" }}><X size={18} /></button>
        </div>

        {/* Véhicules */}
        <div className="mb-6 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>🚗 Mes véhicules</h3>
            <button onClick={() => setShowAdd(true)} className="btn-primary rounded-xl text-xs px-3 py-1.5 flex items-center gap-1.5">
              <Plus size={12} /> Ajouter
            </button>
          </div>

          {list.length === 0 && !showAdd && (
            <p className="text-sm py-3" style={{ color: "rgba(255,255,255,0.3)" }}>Aucun véhicule configuré</p>
          )}

          {list.map(v => (
            <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#f1f5f9" }}>{v.nom}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {v.immatriculation} · {v.puissance_fiscale}{v.puissance_fiscale >= 7 ? "+" : ""} CV · {v.type_vehicule}
                </p>
              </div>
              <button
                onClick={() => setDefault(v.id)}
                className="text-xs px-2.5 py-1 rounded-lg border transition-all shrink-0"
                style={{
                  background:  v.est_defaut ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                  borderColor: v.est_defaut ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.1)",
                  color:       v.est_defaut ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                }}
              >
                {v.est_defaut ? "★ Par défaut" : "Définir défaut"}
              </button>
              <button
                onClick={() => removeVehicule(v.id)}
                className="p-1.5 rounded-lg hover:bg-red-500/20 transition-all shrink-0"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {showAdd && (
            <div className="p-4 rounded-xl space-y-3"
              style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Nom / Modèle *</label>
                  <input className="input-glass" placeholder="Peugeot 308…" value={newV.nom}
                    onChange={e => setNewV(p => ({ ...p, nom: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Immatriculation</label>
                  <input className="input-glass" placeholder="AB-123-CD" value={newV.immatriculation}
                    onChange={e => setNewV(p => ({ ...p, immatriculation: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Puissance fiscale</label>
                  <select className="select-glass w-full" value={newV.puissance_fiscale}
                    onChange={e => setNewV(p => ({ ...p, puissance_fiscale: parseInt(e.target.value) }))}>
                    {[3, 4, 5, 6, 7].map(cv => <option key={cv} value={cv}>{cv}{cv === 7 ? "+" : ""} CV</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Type</label>
                  <select className="select-glass w-full" value={newV.type_vehicule}
                    onChange={e => setNewV(p => ({ ...p, type_vehicule: e.target.value }))}>
                    <option value="thermique">Thermique</option>
                    <option value="hybride">Hybride</option>
                    <option value="electrique">Électrique</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdd(false)} className="btn-secondary rounded-xl flex-1 py-2 text-xs">Annuler</button>
                <button onClick={addVehicule} disabled={!newV.nom}
                  className="btn-primary rounded-xl flex-1 py-2 text-xs font-semibold"
                  style={{ opacity: newV.nom ? 1 : 0.5 }}>
                  Ajouter le véhicule
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Barème IK 2025 */}
        <div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: "#f1f5f9" }}>📋 Barème IK 2025 — référence officielle</h3>
          <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
            d = distance annuelle totale en km · source : Bulletin officiel des finances publiques 2025
          </p>
          <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["Puissance", "≤ 5 000 km", "5 001 – 20 000 km", "> 20 000 km"].map(h => (
                    <th key={h} className="text-left py-2.5 px-4 font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BAREME_IK_2025.map((b, i) => (
                  <tr key={b.cv} style={{ borderBottom: i < BAREME_IK_2025.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <td className="py-2.5 px-4 font-semibold" style={{ color: "#a5b4fc" }}>{b.cv}</td>
                    <td className="py-2.5 px-4 font-semibold" style={{ color: "#10b981" }}>{b.t1.toFixed(3)} €/km</td>
                    <td className="py-2.5 px-4" style={{ color: "rgba(255,255,255,0.6)" }}>{b.t2}</td>
                    <td className="py-2.5 px-4" style={{ color: "rgba(255,255,255,0.5)" }}>{b.t3.toFixed(3)} €/km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5">
          <button onClick={onClose} className="btn-primary rounded-xl w-full py-2.5 text-sm font-semibold">Fermer</button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal : Récap mensuel complet ────────────────────────────────────────────

function RecapModal({
  frais, km, month, year, totalFrais, totalKm, totalIndemnites, onClose,
}: {
  frais: FraisEntry[]; km: KmEntry[]
  month: number; year: number
  totalFrais: number; totalKm: number; totalIndemnites: number
  onClose: () => void
}) {
  const catBreakdown = CATEGORIES.map(c => ({
    ...c,
    entries: frais.filter(f => f.categorie === c.value),
    total:   frais.filter(f => f.categorie === c.value).reduce((s, f) => s + f.montant_ttc, 0),
  })).filter(c => c.entries.length > 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-base" style={{ color: "#f1f5f9" }}>
            📊 Récap {MONTHS_FR[month - 1]} {year}
          </h2>
          <button onClick={onClose} style={{ color: "rgba(255,255,255,0.4)" }}><X size={18} /></button>
        </div>

        {/* Cards totaux */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3 rounded-xl text-center" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Total frais</p>
            <p className="font-bold text-lg" style={{ color: "#a5b4fc" }}>{fmt(totalFrais)}</p>
          </div>
          <div className="p-3 rounded-xl text-center" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Indemnités IK</p>
            <p className="font-bold text-lg" style={{ color: "#10b981" }}>{fmt(totalIndemnites)}</p>
          </div>
          <div className="p-3 rounded-xl text-center" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Total remboursable</p>
            <p className="font-bold text-lg" style={{ color: "#fbbf24" }}>{fmt(totalFrais + totalIndemnites)}</p>
          </div>
        </div>

        {/* Frais par catégorie */}
        {catBreakdown.length > 0 && (
          <div className="mb-5 space-y-4">
            <h3 className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>Frais par catégorie</h3>
            {catBreakdown.map(c => (
              <div key={c.value}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium" style={{ color: "#f1f5f9" }}>{c.icon} {c.label}</span>
                  <span className="text-sm font-bold" style={{ color: "#a5b4fc" }}>{fmt(c.total)}</span>
                </div>
                {c.entries.map(f => (
                  <div key={f.id} className="flex justify-between text-xs ml-6 py-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>
                      {f.date.split("-").reverse().join("/")} — {f.description}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.7)" }}>{fmt(f.montant_ttc)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Kilométrique */}
        {km.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#f1f5f9" }}>Kilométrique</h3>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["Date", "Trajet", "Km", "Indemnité"].map(h => (
                    <th key={h} className="text-left py-2 px-2 font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {km.map(k => (
                  <tr key={k.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td className="py-2 px-2" style={{ color: "rgba(255,255,255,0.5)" }}>{k.date.split("-").reverse().join("/")}</td>
                    <td className="py-2 px-2" style={{ color: "#f1f5f9" }}>{k.depart} → {k.arrivee}</td>
                    <td className="py-2 px-2" style={{ color: "rgba(255,255,255,0.6)" }}>{k.km} km</td>
                    <td className="py-2 px-2 font-semibold" style={{ color: "#10b981" }}>{fmt(k.indemnite)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  <td colSpan={2} className="py-2.5 px-2 font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>Total</td>
                  <td className="py-2.5 px-2 font-bold" style={{ color: "#f1f5f9" }}>{totalKm} km</td>
                  <td className="py-2.5 px-2 font-bold" style={{ color: "#10b981" }}>{fmt(totalIndemnites)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5">
          <button onClick={onClose} className="btn-secondary rounded-xl w-full py-2.5 text-sm">Fermer</button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal : Note de frais imprimable ────────────────────────────────────────

function PrintModal({
  frais, km, month, year, totalFrais, totalKm, totalIndemnites, onClose,
}: {
  frais: FraisEntry[]; km: KmEntry[]
  month: number; year: number
  totalFrais: number; totalKm: number; totalIndemnites: number
  onClose: () => void
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-base" style={{ color: "#f1f5f9" }}>
            🖨️ Note de frais — {MONTHS_FR[month - 1]} {year}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="btn-primary rounded-xl px-4 py-2 text-sm flex items-center gap-2"
            >
              <Printer size={14} /> Imprimer / PDF
            </button>
            <button onClick={onClose} style={{ color: "rgba(255,255,255,0.4)" }}><X size={18} /></button>
          </div>
        </div>

        <div className="p-5 rounded-xl space-y-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {/* En-tête */}
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#f1f5f9" }}>Note de frais — {MONTHS_FR[month - 1]} {year}</h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
              CRM MEB32 · Thibaud · Commercial · Générée le {new Date().toLocaleDateString("fr-FR")}
            </p>
          </div>

          {/* Tableau frais */}
          {frais.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-2" style={{ color: "#f1f5f9" }}>Frais de déplacement et de représentation</h2>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.06)" }}>
                    {["Date", "Catégorie", "Description", "Affaire", "Montant TTC"].map(h => (
                      <th key={h} className="text-left p-2 border font-medium" style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...frais].sort((a, b) => a.date.localeCompare(b.date)).map(f => (
                    <tr key={f.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td className="p-2 border" style={{ borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>{f.date.split("-").reverse().join("/")}</td>
                      <td className="p-2 border" style={{ borderColor: "rgba(255,255,255,0.07)", color: "#f1f5f9" }}>{catConfig(f.categorie).icon} {catConfig(f.categorie).label}</td>
                      <td className="p-2 border" style={{ borderColor: "rgba(255,255,255,0.07)", color: "#f1f5f9" }}>{f.description}</td>
                      <td className="p-2 border" style={{ borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>{AFFAIRES_MOCK.find(a => a.id === f.affaire_id)?.nom ?? "—"}</td>
                      <td className="p-2 border text-right font-semibold" style={{ borderColor: "rgba(255,255,255,0.07)", color: "#f1f5f9" }}>{fmt(f.montant_ttc)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: "rgba(99,102,241,0.1)" }}>
                    <td colSpan={4} className="p-2 border font-bold" style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>Sous-total frais</td>
                    <td className="p-2 border text-right font-bold" style={{ borderColor: "rgba(255,255,255,0.1)", color: "#a5b4fc" }}>{fmt(totalFrais)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Tableau km */}
          {km.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-2" style={{ color: "#f1f5f9" }}>Indemnités kilométriques</h2>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.06)" }}>
                    {["Date", "Trajet", "Motif", "Km", "Taux", "Indemnité"].map(h => (
                      <th key={h} className="text-left p-2 border font-medium" style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...km].sort((a, b) => a.date.localeCompare(b.date)).map(k => (
                    <tr key={k.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td className="p-2 border" style={{ borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>{k.date.split("-").reverse().join("/")}</td>
                      <td className="p-2 border" style={{ borderColor: "rgba(255,255,255,0.07)", color: "#f1f5f9" }}>{k.depart} → {k.arrivee}</td>
                      <td className="p-2 border" style={{ borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>{k.motif}</td>
                      <td className="p-2 border" style={{ borderColor: "rgba(255,255,255,0.07)", color: "#f1f5f9" }}>{k.km} km</td>
                      <td className="p-2 border" style={{ borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>{k.taux_ik.toFixed(3)} €/km</td>
                      <td className="p-2 border text-right font-semibold" style={{ borderColor: "rgba(255,255,255,0.07)", color: "#10b981" }}>{fmt(k.indemnite)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: "rgba(16,185,129,0.08)" }}>
                    <td colSpan={5} className="p-2 border font-bold" style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                      Sous-total kilométrique ({totalKm} km)
                    </td>
                    <td className="p-2 border text-right font-bold" style={{ borderColor: "rgba(255,255,255,0.1)", color: "#10b981" }}>{fmt(totalIndemnites)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Total général */}
          <div className="flex justify-end">
            <div className="p-4 rounded-xl" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
              <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>TOTAL REMBOURSABLE</p>
              <p className="text-2xl font-bold" style={{ color: "#a5b4fc" }}>{fmt(totalFrais + totalIndemnites)}</p>
            </div>
          </div>

          <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            Document généré par CRM MEB32 · {new Date().toLocaleString("fr-FR")}
          </p>
        </div>
      </div>
    </div>
  )
}
