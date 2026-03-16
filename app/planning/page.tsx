"use client"

import { useState, useMemo } from "react"
import {
  ChevronLeft, ChevronRight, Plus, X, Copy, Check,
  ChevronDown, MapPin, Clock, CheckSquare, Square, Download,
} from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"
import { exportToCSV, fmtDateExport } from "@/lib/export"

// ─── Types ────────────────────────────────────────────────────────────────────

type TypeRDV = "Prospection" | "R1 Découverte" | "Visite terrain" | "R2 Proposition" | "Négociation" | "Suivi client"

interface RDV {
  id: number; titre: string; affaire: string; type: TypeRDV
  date: string; heure: string; duree: string; lieu: string; notes?: string
}

interface PromptPanel { titre: string; contenu: string }

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<TypeRDV, { block: string; borderColor: string; badge: string; dot: string }> = {
  "Prospection":    { block: "glass border-l-0", borderColor: "#94a3b8", badge: "bg-white/10 border border-white/20 text-white/60",               dot: "bg-slate-400"   },
  "R1 Découverte":  { block: "glass border-l-0", borderColor: "#6366f1", badge: "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300",   dot: "bg-indigo-500"  },
  "Visite terrain": { block: "glass border-l-0", borderColor: "#10b981", badge: "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300", dot: "bg-emerald-500" },
  "R2 Proposition": { block: "glass border-l-0", borderColor: "#f59e0b", badge: "bg-amber-500/20 border border-amber-500/40 text-amber-300",       dot: "bg-amber-500"   },
  "Négociation":    { block: "glass border-l-0", borderColor: "#8b5cf6", badge: "bg-violet-500/20 border border-violet-500/40 text-violet-300",   dot: "bg-violet-500"  },
  "Suivi client":   { block: "glass border-l-0", borderColor: "#06b6d4", badge: "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300",          dot: "bg-cyan-500"    },
}

const JOURS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]
const MOIS_FR  = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."]

const AFFAIRES_LISTE = [
  "EARL Morin – Neuf 22 000 pl.", "Gauthier Volailles – Extension",
  "SAS Lefèvre Avicole – Rénovation", "GAEC du Bocage – Neuf dinde",
  "Ferme Dupont – Remplacement", "Coopérative Arvor – Extension canard",
  "SCEA Bretagne Plumes – Neuf bio", "Élevages Martin – Rénovation",
]

const DUREES = ["30min", "1h", "1h30", "2h", "3h"]

// ─── Données fictives ─────────────────────────────────────────────────────────

const RDVS_INIT: RDV[] = [
  { id: 1, titre: "Visite terrain EARL Morin",       affaire: "EARL Morin – Neuf 22 000 pl.",  type: "Visite terrain", date: "2026-03-09", heure: "09:00", duree: "2h",    lieu: "La Ferrière, 44110",   notes: "Vérifier orientation bâtiment et nature du sol (argileux). Emmener photos de références chantiers similaires." },
  { id: 2, titre: "R1 Découverte GAEC du Bocage",    affaire: "GAEC du Bocage – Neuf dinde",   type: "R1 Découverte",  date: "2026-03-10", heure: "14:00", duree: "1h30",  lieu: "Bocage Normand, 61210", notes: "Premier RDV. Préparer plaquette dindes + références chantiers. Qualifier le budget." },
  { id: 3, titre: "R2 Proposition Gauthier Volailles",affaire: "Gauthier Volailles – Extension",type: "R2 Proposition", date: "2026-03-11", heure: "10:00", duree: "1h30",  lieu: "Loué, 72540",           notes: "Apporter 2 exemplaires devis DEV-2026-002. Ne pas lâcher sur le prix, insister sur la garantie 10 ans." },
  { id: 4, titre: "Prospection Ferme Bertrand",       affaire: "—",                             type: "Prospection",    date: "2026-03-12", heure: "15:00", duree: "30min", lieu: "Téléphone",             notes: "" },
]

function exportRDVs() {
  exportToCSV(
    RDVS_INIT.map(r => ({
      date:    fmtDateExport(r.date),
      heure:   r.heure,
      titre:   r.titre,
      type:    r.type,
      affaire: r.affaire,
      lieu:    r.lieu,
      fait:    "non",
    })),
    `planning-MEB32-${new Date().toISOString().slice(0, 7)}.csv`,
    [
      { key: "date",    label: "Date"         },
      { key: "heure",   label: "Heure"        },
      { key: "titre",   label: "Titre"        },
      { key: "type",    label: "Type RDV"     },
      { key: "affaire", label: "Affaire liée" },
      { key: "lieu",    label: "Lieu"         },
      { key: "fait",    label: "Fait (oui/non)" },
    ]
  )
}

const TODOS_INIT = [
  { id: 1, texte: "Préparer devis SCEA Bretagne Plumes",         fait: false },
  { id: 2, texte: "Envoyer plan masse EARL Morin post-visite",   fait: false },
  { id: 3, texte: "Relancer Gauthier Volailles (devis J+8)",     fait: false },
  { id: 4, texte: "Mettre à jour fiche GAEC du Bocage après R1", fait: true  },
  { id: 5, texte: "Contacter CA pour simulation financement",    fait: false },
]

const TRAMES = [
  {
    label: "Trame R1 éleveur avicole",
    icon:  "🔍",
    contenu: `Tu es un commercial spécialisé en équipement d'élevage avicole.

Génère une trame complète de rendez-vous R1 (Découverte) adaptée à un éleveur de volailles.

La trame doit inclure :
1. Introduction et présentation (2-3 min) — ton à adopter pour mettre à l'aise un éleveur
2. Questions de découverte SPIN :
   - Situation : espèce, capacité, bâtiment actuel, coopérative, ancienneté
   - Problème : difficultés actuelles (ambiance, mortalité, coût énergie, main d'œuvre)
   - Implication : conséquences si le problème n'est pas résolu
   - Need-payoff : qu'est-ce que ça changerait si c'était résolu ?
3. Questions financières à aborder délicatement (budget, financement, délai de décision)
4. Conclusion : engagement sur R2 ou visite, résumé des points clés
5. Liste des documents/infos à récupérer avant de partir`,
  },
  {
    label: "Trame R2 avec devis",
    icon:  "📋",
    contenu: `Tu es un expert commercial en équipement d'élevage avicole.

Génère une trame complète de présentation R2 (Proposition commerciale + Devis).

La trame doit couvrir :
1. Rappel des enjeux identifiés en R1 — reformulation pour valider la compréhension
2. Présentation de la solution en 3 niveaux (CAB) :
   - Caractéristiques techniques (ventilation, abreuvement, alimentation, télégestion)
   - Avantages par rapport à la concurrence
   - Bénéfices concrets pour l'éleveur (performances, économies, bien-être animal)
3. Présentation du devis ligne par ligne avec ancrage de valeur avant chaque prix
4. Traitement des 3 objections fréquentes (prix, délai, concurrent moins cher)
5. Techniques de closing adaptées à la culture agricole (urgence, ancrage, engagement progressif)
6. Plan d'action post-R2 (délai réflexion, visite de référence, financement)`,
  },
  {
    label: "Script cold call éleveur",
    icon:  "📞",
    contenu: `Génère un script de cold call téléphonique pour prospecter un éleveur avicole qui ne connaît pas encore notre société.
Nous vendons des équipements d'élevage (ventilation dynamique, abreuvement nipple, alimentation automatique, télégestion connectée).

Le script doit inclure :
1. Accroche en 10 secondes avec demande de permission de continuer
2. Proposition de valeur différenciante en 1 phrase (résultat concret mesurable)
3. Questions de qualification rapide (type d'élevage, projet en cours, décisionnaire)
4. Demande de rendez-vous R1 sur site — formule non-négociable
5. Réponses aux 3 objections les plus fréquentes :
   - "Pas intéressé / pas le moment"
   - "On a déjà un fournisseur attitré"
   - "Appelez dans 6 mois"
6. Closing sur la prise de RDV avec date proposée

Ton : direct, professionnel, adapté à la culture rurale. Durée cible : 3-4 minutes.`,
  },
  {
    label: "Email prospection coopérative",
    icon:  "✉️",
    contenu: `Génère un email de prospection B2B destiné au responsable technique ou directeur d'élevage d'une coopérative avicole.
Objectif : obtenir un rendez-vous R1 pour présenter nos solutions aux éleveurs de leur réseau.

Contraintes :
1. Objet accrocheur de moins de 50 caractères (taux d'ouverture prioritaire)
2. Accroche personnalisée sur leurs enjeux : performance adhérents, conformité bien-être animal, coûts de production
3. Valeur ajoutée pour la coopérative : accompagnement réseau, conditions cadre, financement groupé
4. Appel à l'action clair : 2 créneaux de RDV proposés ou lien de prise de RDV
5. Corps de l'email : maximum 120 mots
6. Signature professionnelle complète

Format final : objet + corps + signature, prêt à envoyer.`,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekMonday(offset: number): Date {
  const today = new Date()
  const dow   = today.getDay()
  const diff  = dow === 0 ? -6 : 1 - dow
  const mon   = new Date(today)
  mon.setDate(today.getDate() + diff + offset * 7)
  mon.setHours(0, 0, 0, 0)
  return mon
}

function dateStr(d: Date) {
  return d.toISOString().split("T")[0]
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

function isToday(d: Date) {
  return isSameDay(d, new Date())
}

// ─── Formulaire vide ──────────────────────────────────────────────────────────

const FORM_VIDE = {
  titre: "", affaire: "", type: "R1 Découverte" as TypeRDV,
  date: "", heure: "09:00", duree: "1h", lieu: "", notes: "",
}

function SelectField({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</label>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className="select-glass w-full pr-8 appearance-none">
          {children}
        </select>
        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "rgba(255,255,255,0.4)" }} />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanningPage() {
  const [weekOffset, setWeekOffset]   = useState(0)
  const [rdvs, setRdvs]               = useState<RDV[]>(RDVS_INIT)
  const [todos, setTodos]             = useState(TODOS_INIT)
  const [selectedRdv, setSelectedRdv] = useState<RDV | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [form, setForm]               = useState(FORM_VIDE)
  const [promptPanel, setPromptPanel] = useState<PromptPanel | null>(null)
  const [copied, setCopied]           = useState(false)
  // Mobile : offset en jours depuis aujourd'hui
  const [dayOffset, setDayOffset] = useState(0)

  // ── Semaine ───────────────────────────────────────────────────────────────
  const monday = useMemo(() => getWeekMonday(weekOffset), [weekOffset])

  const days = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      return d
    }), [monday]
  )

  const rangeLabel = `${days[0].getDate()} – ${days[4].getDate()} ${MOIS_FR[days[4].getMonth()]} ${days[4].getFullYear()}`

  function rdvsForDay(day: Date) {
    const ds = dateStr(day)
    return rdvs.filter((r) => r.date === ds).sort((a, b) => a.heure.localeCompare(b.heure))
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  function setF(k: keyof typeof FORM_VIDE, v: string) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function ajouterRdv(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titre || !form.date) return
    setRdvs((p) => [...p, { id: Date.now(), ...form }])
    setForm(FORM_VIDE)
    setShowNewForm(false)
  }

  function ouvrirPrompt(titre: string, contenu: string) {
    setPromptPanel({ titre, contenu })
    setCopied(false)
  }

  function prepRdvPrompt(rdv: RDV) {
    return `Tu es un commercial spécialisé en équipement avicole.

Je prépare le RDV suivant :
- Type : ${rdv.type}
- Affaire : ${rdv.affaire}
- Date : ${new Date(rdv.date).toLocaleDateString("fr-FR")} à ${rdv.heure} (${rdv.duree})
- Lieu : ${rdv.lieu}
- Notes de préparation : ${rdv.notes || "aucune"}

Aide-moi à préparer ce rendez-vous :
1. Les 3 objectifs prioritaires à atteindre durant ce RDV
2. Les questions clés à poser (adaptées au type ${rdv.type})
3. Les points différenciants à mettre en avant
4. Les documents et supports à apporter
5. Le closing idéal pour terminer ce RDV (prochaine étape concrète)`
  }

  async function copierPrompt() {
    if (!promptPanel) return
    await navigator.clipboard.writeText(promptPanel.contenu)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Jour mobile ──────────────────────────────────────────────────────────
  const mobileDay = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + dayOffset)
    d.setHours(0, 0, 0, 0)
    return d
  }, [dayOffset])

  const mobileDayLabel = useMemo(() => {
    const opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }
    return mobileDay.toLocaleDateString("fr-FR", opts)
  }, [mobileDay])

  const mobileDayRdvs = useMemo(() => rdvsForDay(mobileDay), [mobileDay, rdvs]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title="Planning" actions={
          <button
            onClick={exportRDVs}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.25)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(99,102,241,0.15)")}
          >
            <Download size={13} /> Exporter
          </button>
        } />

        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">

          {/* ── Vue mobile : Jour ── */}
          <div className="md:hidden">
            {/* Nav jour */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setDayOffset(o => o - 1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)" }}
              >
                <ChevronLeft size={20} />
              </button>

              <div className="text-center flex-1 mx-3">
                <p className="text-sm font-semibold capitalize" style={{ color: "#f1f5f9" }}>
                  {mobileDayLabel}
                </p>
                {isToday(mobileDay) && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>
                    Aujourd&apos;hui
                  </span>
                )}
              </div>

              <button
                onClick={() => setDayOffset(o => o + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)" }}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {dayOffset !== 0 && (
              <button
                onClick={() => setDayOffset(0)}
                className="w-full mb-3 py-2 rounded-xl text-xs font-medium"
                style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}
              >
                Revenir à aujourd&apos;hui
              </button>
            )}

            {/* RDVs du jour */}
            {mobileDayRdvs.length === 0 ? (
              <div
                onClick={() => { setForm(f => ({ ...f, date: dateStr(mobileDay) })); setShowNewForm(true) }}
                className="rounded-2xl py-12 flex flex-col items-center justify-center gap-2 cursor-pointer"
                style={{ border: "2px dashed rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.3)" }}
              >
                <Plus size={24} />
                <span className="text-sm">Aucun RDV — Ajouter</span>
              </div>
            ) : (
              <div className="space-y-3">
                {mobileDayRdvs.map((rdv) => {
                  const cfg = TYPE_CONFIG[rdv.type]
                  return (
                    <button
                      key={rdv.id}
                      onClick={() => setSelectedRdv(rdv)}
                      className="w-full text-left glass rounded-2xl px-4 py-4 hover:opacity-80 transition-opacity"
                      style={{ borderLeft: `4px solid ${cfg.borderColor}` }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${cfg.badge}`}>
                          {rdv.type}
                        </span>
                        <span className="text-xs font-semibold ml-auto" style={{ color: "rgba(255,255,255,0.6)" }}>
                          {rdv.heure} · {rdv.duree}
                        </span>
                      </div>
                      <p className="font-semibold text-sm" style={{ color: "#f1f5f9" }}>{rdv.titre}</p>
                      {rdv.lieu && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin size={11} style={{ color: "rgba(255,255,255,0.35)" }} />
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{rdv.lieu}</p>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Vue desktop : Nav semaine + grille ── */}
          <div className="hidden md:block">
          {/* ── Nav semaine ── */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <button onClick={() => setWeekOffset((o) => o - 1)}
              className="btn-secondary rounded-xl px-3 py-2 text-sm flex items-center gap-1">
              <ChevronLeft size={15} /> Semaine précédente
            </button>
            <span className="font-semibold text-sm px-2" style={{ color: "#f1f5f9" }}>{rangeLabel}</span>
            <button onClick={() => setWeekOffset(0)}
              className={`rounded-xl px-3 py-2 text-sm ${weekOffset === 0 ? "btn-primary" : "btn-secondary"}`}>
              Aujourd&apos;hui
            </button>
            <button onClick={() => setWeekOffset((o) => o + 1)}
              className="btn-secondary rounded-xl px-3 py-2 text-sm flex items-center gap-1">
              Semaine suivante <ChevronRight size={15} />
            </button>
            <button onClick={() => setShowNewForm(true)}
              className="ml-auto btn-primary rounded-xl flex items-center gap-2 text-sm font-semibold px-4 py-2.5">
              <Plus size={16} /> RDV
            </button>
          </div>

          {/* ── Grille calendrier + panneau droit ── */}
          <div className="flex gap-5 items-start">

            {/* Calendrier 5 colonnes */}
            <div className="flex-1 min-w-0 grid grid-cols-5 gap-2">
              {days.map((day) => {
                const rdvsDay = rdvsForDay(day)
                const today   = isToday(day)
                return (
                  <div key={dateStr(day)} className="flex flex-col gap-2 min-w-0">
                    {/* En-tête colonne */}
                    <div
                      className="rounded-2xl px-2 py-2 text-center"
                      style={today
                        ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }
                        : undefined}
                    >
                      {!today && (
                        <div className="glass rounded-2xl px-2 py-2 text-center -m-2">
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>
                            {JOURS_FR[day.getDay()]}
                          </p>
                          <p className="text-lg font-bold leading-tight" style={{ color: "#f1f5f9" }}>
                            {day.getDate()}
                          </p>
                          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {MOIS_FR[day.getMonth()]}
                          </p>
                        </div>
                      )}
                      {today && (
                        <>
                          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
                            {JOURS_FR[day.getDay()]}
                          </p>
                          <p className="text-lg font-bold leading-tight text-white">
                            {day.getDate()}
                          </p>
                          <p className="text-[10px] text-white/60">
                            {MOIS_FR[day.getMonth()]}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Blocs RDV */}
                    <div className="flex flex-col gap-2 min-h-[200px]">
                      {rdvsDay.length === 0 && (
                        <div
                          onClick={() => { setForm((f) => ({ ...f, date: dateStr(day) })); setShowNewForm(true) }}
                          className="flex-1 min-h-[80px] rounded-2xl flex items-center justify-center cursor-pointer transition-colors text-xs hover:border-indigo-500/30 hover:text-indigo-400"
                          style={{ border: "2px dashed rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.2)" }}
                        >
                          <Plus size={14} />
                        </div>
                      )}
                      {rdvsDay.map((rdv) => {
                        const cfg = TYPE_CONFIG[rdv.type]
                        return (
                          <button
                            key={rdv.id}
                            onClick={() => setSelectedRdv(rdv)}
                            className={`text-left rounded-2xl px-2.5 py-2 ${cfg.block} hover:opacity-80 transition-opacity w-full`}
                            style={{ borderLeft: `3px solid ${cfg.borderColor}` }}
                          >
                            <div className="flex items-center gap-1 mb-0.5">
                              <Clock size={10} className="shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
                              <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>{rdv.heure}</span>
                              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>· {rdv.duree}</span>
                            </div>
                            <p className="text-[11px] font-semibold leading-tight line-clamp-2" style={{ color: "#f1f5f9" }}>{rdv.titre}</p>
                            {rdv.lieu && (
                              <div className="flex items-center gap-0.5 mt-0.5">
                                <MapPin size={9} className="shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} />
                                <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{rdv.lieu}</p>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Panneau droit ── */}
            <div className="hidden xl:flex flex-col gap-4 w-72 shrink-0">

              {/* To-do de la semaine */}
              <div className="glass">
                <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <h3 className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>
                    To-do de la semaine
                    <span className="ml-2 text-xs font-normal" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {todos.filter((t) => t.fait).length}/{todos.length}
                    </span>
                  </h3>
                </div>
                <ul className="p-3 space-y-1">
                  {todos.map((todo) => (
                    <li key={todo.id}
                      onClick={() => setTodos((p) => p.map((t) => t.id === todo.id ? { ...t, fait: !t.fait } : t))}
                      className="flex items-start gap-2 cursor-pointer p-1.5 rounded-lg transition-colors hover:bg-white/[0.04] group">
                      {todo.fait
                        ? <CheckSquare size={15} className="mt-0.5 shrink-0" style={{ color: "#10b981" }} />
                        : <Square size={15} className="mt-0.5 shrink-0 transition-colors group-hover:text-indigo-400" style={{ color: "rgba(255,255,255,0.25)" }} />}
                      <span className="text-xs leading-snug" style={{
                        color: todo.fait ? "rgba(255,255,255,0.35)" : "#f1f5f9",
                        textDecoration: todo.fait ? "line-through" : "none"
                      }}>
                        {todo.texte}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trames disponibles */}
              <div className="glass">
                <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <h3 className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>Trames disponibles</h3>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Prompts à copier dans Claude.ai</p>
                </div>
                <div className="p-3 space-y-2">
                  {TRAMES.map((t) => (
                    <button key={t.label}
                      onClick={() => ouvrirPrompt(t.label, t.contenu)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left"
                      style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.15)"; e.currentTarget.style.color = "#a5b4fc" }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)" }}
                    >
                      <span className="text-base shrink-0">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </div>{/* fin div desktop */}
        </main>
      </div>

      {/* FAB mobile */}
      <button
        onClick={() => setShowNewForm(true)}
        className="fab md:hidden"
        aria-label="Nouveau RDV"
      >
        <Plus size={24} />
      </button>

      {/* ══ MODAL DÉTAIL RDV ══ */}
      {selectedRdv && (() => {
        const cfg = TYPE_CONFIG[selectedRdv.type]
        return (
          <>
            <div className="modal-overlay" onClick={() => setSelectedRdv(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="modal-box w-full max-w-md">
                <div className="flex items-start justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium mb-1 ${cfg.badge}`}>
                      {selectedRdv.type}
                    </span>
                    <h2 className="font-bold text-base" style={{ color: "#f1f5f9" }}>{selectedRdv.titre}</h2>
                  </div>
                  <button onClick={() => setSelectedRdv(null)} className="p-1.5 rounded-lg transition-colors hover:bg-white/10 ml-3">
                    <X size={17} style={{ color: "rgba(255,255,255,0.5)" }} />
                  </button>
                </div>
                <div className="px-6 py-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Affaire",  value: selectedRdv.affaire },
                      { label: "Lieu",     value: selectedRdv.lieu },
                      { label: "Date",     value: new Date(selectedRdv.date).toLocaleDateString("fr-FR") },
                      { label: "Heure",    value: `${selectedRdv.heure} · ${selectedRdv.duree}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
                        <p className="text-sm font-medium" style={{ color: "#f1f5f9" }}>{value || "—"}</p>
                      </div>
                    ))}
                  </div>
                  {selectedRdv.notes && (
                    <div className="rounded-xl px-4 py-3" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                      <p className="text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: "rgba(165,180,252,0.7)" }}>Notes de préparation</p>
                      <p className="text-sm" style={{ color: "#f1f5f9" }}>{selectedRdv.notes}</p>
                    </div>
                  )}
                </div>
                <div className="px-6 pb-5">
                  <button
                    onClick={() => { ouvrirPrompt(`Préparer : ${selectedRdv.titre}`, prepRdvPrompt(selectedRdv)); setSelectedRdv(null) }}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold">
                    ✦ Préparer avec Claude
                  </button>
                </div>
              </div>
            </div>
          </>
        )
      })()}

      {/* ══ MODAL NOUVEAU RDV ══ */}
      {showNewForm && (
        <>
          <div className="modal-overlay" onClick={() => setShowNewForm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="modal-box w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <h2 className="font-semibold" style={{ color: "#f1f5f9" }}>Nouveau rendez-vous</h2>
                <button onClick={() => setShowNewForm(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <X size={17} style={{ color: "rgba(255,255,255,0.5)" }} />
                </button>
              </div>
              <form onSubmit={ajouterRdv} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Titre <span className="text-red-400">*</span>
                  </label>
                  <input type="text" value={form.titre} onChange={(e) => setF("titre", e.target.value)}
                    placeholder="Visite terrain EARL Morin…" required
                    className="input-glass w-full" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="Affaire liée" value={form.affaire} onChange={(v) => setF("affaire", v)}>
                    <option value="">— Aucune —</option>
                    {AFFAIRES_LISTE.map((a) => <option key={a}>{a}</option>)}
                  </SelectField>
                  <SelectField label="Type RDV" value={form.type} onChange={(v) => setF("type", v as TypeRDV)}>
                    {(Object.keys(TYPE_CONFIG) as TypeRDV[]).map((t) => <option key={t}>{t}</option>)}
                  </SelectField>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Date <span className="text-red-400">*</span>
                    </label>
                    <input type="date" value={form.date} onChange={(e) => setF("date", e.target.value)} required
                      className="input-glass w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Heure</label>
                    <input type="time" value={form.heure} onChange={(e) => setF("heure", e.target.value)}
                      className="input-glass w-full" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="Durée" value={form.duree} onChange={(v) => setF("duree", v)}>
                    {DUREES.map((d) => <option key={d}>{d}</option>)}
                  </SelectField>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Lieu</label>
                    <input type="text" value={form.lieu} onChange={(e) => setF("lieu", e.target.value)} placeholder="Adresse ou Téléphone"
                      className="input-glass w-full" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Notes de préparation</label>
                  <textarea value={form.notes} onChange={(e) => setF("notes", e.target.value)} rows={2}
                    className="textarea-glass w-full" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowNewForm(false)}
                    className="flex-1 btn-secondary py-2.5 rounded-xl text-sm font-medium">Annuler</button>
                  <button type="submit"
                    className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold">Créer le RDV</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ══ PANEL PROMPT ══ */}
      {promptPanel && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setPromptPanel(null)} />
          <div className="prompt-panel fixed inset-y-0 right-0 w-full max-w-lg z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <h2 className="font-semibold text-sm" style={{ color: "#f1f5f9" }}>{promptPanel.titre}</h2>
              <button onClick={() => setPromptPanel(null)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X size={17} style={{ color: "rgba(255,255,255,0.5)" }} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>Copiez ce prompt et collez-le dans Claude.ai :</p>
              <pre className="prompt-pre">
                {promptPanel.contenu}
              </pre>
            </div>
            <div className="px-6 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <button onClick={copierPrompt}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
                style={copied
                  ? { background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", borderRadius: "12px" }
                  : { background: "rgba(255,255,255,0.08)", color: "#f1f5f9", borderRadius: "12px" }
                }>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copié !" : "Copier le prompt"}
              </button>
              <p className="text-center text-xs mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>Ouvrez Claude.ai et collez le prompt.</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
