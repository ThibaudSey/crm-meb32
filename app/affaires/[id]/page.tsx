"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Pencil, Plus, X, Copy, Check,
  CheckSquare, Square, AlertCircle, Phone, MapPin, Calendar,
} from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"

// ─── Types ────────────────────────────────────────────────────────────────────

type Influence = "Fort" | "Moyen" | "Faible"
type NoteType  = "RDV" | "Visite" | "Appel"
type TodoCat   = "Relance" | "Admin" | "Technique" | "Urgence"

interface Prenante  { id: number; nom: string; role: string; influence: Influence }
interface Todo      { id: number; texte: string; date: string; fait: boolean; categorie: TodoCat; urgent: boolean }
interface Note      { id: number; type: NoteType; date: string; contenu: string; structure?: string }
interface PromptPanel { titre: string; contenu: string }

// ─── Données EARL Morin (id=1) ────────────────────────────────────────────────

const AFFAIRE_1 = {
  id: 1,
  structure:   "EARL Morin",
  typeProjet:  "Neuf",
  espece:      "Poulet chair",
  nbPlaces:    22000,
  montant:     48000,
  marge:       34,
  etape:       "R2 Proposition",
  typeInter:   "Éleveur",
  dateDecision:"2026-04-15",
  concurrent:  "Bâtivolaille",
  notesConcurrence: "Bâtivolaille propose un bâtiment standard moins cher (~42 k€) mais sans gestion d'ambiance connectée ni garantie 10 ans sur charpente. Notre point fort : système d'abreuvement nipple intégré et ventilation dynamique.",
}

const PRENANTES_INIT: Prenante[] = [
  { id: 1, nom: "Jean-Pierre Morin", role: "Gérant – décideur final",    influence: "Fort"  },
  { id: 2, nom: "Marie Morin",       role: "Conjointe – DAF de l'EARL",  influence: "Moyen" },
  { id: 3, nom: "Cédric Vasseur",    role: "Conseiller coopérative",     influence: "Moyen" },
  { id: 4, nom: "Banque Crédit Agri",role: "Financement projet",         influence: "Fort"  },
]

const TODOS_INIT: Todo[] = [
  { id: 1, texte: "Appeler Jean-Pierre pour suivi devis J+9",          date: "2026-03-16", fait: false, categorie: "Relance",   urgent: true  },
  { id: 2, texte: "Envoyer plan masse bâtiment 22 000 places",         date: "2026-03-18", fait: false, categorie: "Technique", urgent: false },
  { id: 3, texte: "Préparer simulation financement avec CA",           date: "2026-03-20", fait: false, categorie: "Admin",     urgent: false },
  { id: 4, texte: "Visite de site EARL Morin – voir orientation bât.", date: "2026-03-25", fait: false, categorie: "Technique", urgent: false },
  { id: 5, texte: "Récupérer référence chantier similaire 20 000 pl.", date: "2026-03-14", fait: true,  categorie: "Admin",     urgent: false },
]

const NOTES_INIT: Note[] = [
  {
    id: 1, type: "Appel", date: "2026-03-06",
    contenu: "JP Morin demande à comparer avec Bâtivolaille. Dit que leur offre est moins chère de ~6 k€. Semble sensible au prix mais insiste sur la durabilité. Marie est plus convaincue par nos arguments qualité.",
  },
  {
    id: 2, type: "Visite", date: "2026-02-18",
    contenu: "Première visite terrain. Bâtiment à implanter sur une parcelle argileuse – prévoir fondations renforcées (+2 à 3 k€). JP Morin très intéressé par la gestion d'ambiance connectée. 2 anciens bâtiments vétustes à démolir (hors périmètre).",
  },
  {
    id: 3, type: "RDV", date: "2026-01-30",
    contenu: "R1 Découverte réalisée. Projet validé : 1 bâtiment neuf poulet chair 22 000 places, label Rouge possible à terme. Budget annoncé entre 40 et 55 k€. Concurrent : Bâtivolaille déjà venu sur site.",
  },
]

const SONCAS_CONFIG = [
  { key: "Sécurité",  active: "bg-blue-500/30 text-blue-200 border-blue-500/50",   inactive: "border-blue-500/20 text-blue-400/60 hover:bg-blue-500/10"   },
  { key: "Orgueil",   active: "bg-violet-500/30 text-violet-200 border-violet-500/50", inactive: "border-violet-500/20 text-violet-400/60 hover:bg-violet-500/10" },
  { key: "Nouveauté", active: "bg-cyan-500/30 text-cyan-200 border-cyan-500/50",   inactive: "border-cyan-500/20 text-cyan-400/60 hover:bg-cyan-500/10"   },
  { key: "Confort",   active: "bg-emerald-500/30 text-emerald-200 border-emerald-500/50", inactive: "border-emerald-500/20 text-emerald-400/60 hover:bg-emerald-500/10" },
  { key: "Argent",    active: "bg-yellow-500/30 text-yellow-200 border-yellow-500/50", inactive: "border-yellow-500/20 text-yellow-400/60 hover:bg-yellow-500/10" },
  { key: "Sympathie", active: "bg-pink-500/30 text-pink-200 border-pink-500/50",   inactive: "border-pink-500/20 text-pink-400/60 hover:bg-pink-500/10"   },
]

const INFLUENCE_STYLE: Record<Influence, string> = {
  Fort:   "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",
  Moyen:  "bg-amber-500/20 border border-amber-500/40 text-amber-300",
  Faible: "bg-white/10 border border-white/20 text-white/60",
}

const NOTE_TYPE_STYLE: Record<NoteType, { dot: string; badge: string }> = {
  RDV:    { dot: "bg-blue-500",   badge: "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300" },
  Visite: { dot: "bg-emerald-500",badge: "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300" },
  Appel:  { dot: "bg-amber-500",  badge: "bg-amber-500/20 border border-amber-500/40 text-amber-300" },
}

const TODO_CAT_STYLE: Record<TodoCat, string> = {
  Relance:   "bg-red-500/20 border border-red-500/40 text-red-300",
  Admin:     "bg-white/10 border border-white/20 text-white/50",
  Technique: "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300",
  Urgence:   "bg-orange-500/20 border border-orange-500/40 text-orange-300",
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €"
}

function isDepasse(date: string) {
  return new Date(date) < new Date()
}

// ─── Prompts IA ───────────────────────────────────────────────────────────────

function buildPrompts(a: typeof AFFAIRE_1, soncasActifs: string[]) {
  const soncas = soncasActifs.length ? soncasActifs.join(", ") : "non renseigné"
  return {
    r1: `Tu es un commercial spécialisé en équipement d'élevage avicole.
Je prépare ma première visite (R1 Découverte) chez ${a.structure}.

Profil du client :
- Type : ${a.typeInter}
- Projet : ${a.typeProjet} de bâtiment ${a.espece}
- Capacité estimée : ${a.nbPlaces.toLocaleString("fr-FR")} places
- Concurrent identifié : ${a.concurrent ?? "inconnu"}

Génère pour moi :
1. Les 5 questions ouvertes clés à poser en R1 pour bien qualifier le projet
2. Les points de douleur typiques pour ce profil d'éleveur
3. Les informations indispensables à collecter pendant cette visite
4. Les éléments différenciants à mettre en avant dès ce premier rendez-vous`,

    r2: `Tu es un expert commercial en équipement avicole.
Je prépare ma proposition commerciale (R2) pour ${a.structure}.

Projet : ${a.typeProjet} ${a.espece}, ${a.nbPlaces.toLocaleString("fr-FR")} places
Budget estimé : ${fmt(a.montant)}
Concurrent : ${a.concurrent ?? "inconnu"}
Profil SONCAS activé : ${soncas}

Génère :
1. Une structure de présentation en 5 étapes (situation → enjeux → solution → preuves → prix)
2. Les 3 arguments BAC (Bénéfice / Avantage / Caractéristique) les plus percutants pour ce projet
3. Les questions de confirmation de valeur à poser avant d'annoncer le prix
4. Le wording recommandé pour l'annonce du prix en ancrant la valeur`,

    prix: `Un client (${a.structure}) en négociation pour un projet ${a.typeProjet} ${a.espece} (${a.nbPlaces.toLocaleString("fr-FR")} places) me dit que notre offre à ${fmt(a.montant)} est trop chère par rapport à ${a.concurrent ?? "la concurrence"}.

Profil SONCAS activé : ${soncas}

Génère :
1. La réponse à l'objection prix avec la méthode CAB (Caractéristique → Avantage → Bénéfice)
2. 3 arguments de valeur ajoutée spécifiques à notre offre vs ${a.concurrent ?? "la concurrence"}
3. Des éléments de recadrage ROI (retour sur investissement sur 10 ans, coût par place, économies d'énergie…)
4. Une proposition de contrepartie acceptable si une réduction est inévitable`,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AffaireDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  if (id !== "1") {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 md:ml-60 flex flex-col">
          <TopBar title="Fiche affaire" />
          <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            Affaire #{id} non trouvée.
          </div>
        </div>
      </div>
    )
  }

  const affaire = AFFAIRE_1

  // ── State ────────────────────────────────────────────────────────────────────
  const [prenantes, setPrenantes]         = useState<Prenante[]>(PRENANTES_INIT)
  const [todos, setTodos]                 = useState<Todo[]>(TODOS_INIT)
  const [notes, setNotes]                 = useState<Note[]>(NOTES_INIT)
  const [soncasActifs, setSoncasActifs]   = useState<string[]>(["Sécurité", "Argent"])
  const [promptPanel, setPromptPanel]     = useState<PromptPanel | null>(null)
  const [copied, setCopied]               = useState(false)
  const [notesConcurrence, setNotesConcurrence] = useState(affaire.notesConcurrence)

  const [showAddTodo, setShowAddTodo]     = useState(false)
  const [newTodoTexte, setNewTodoTexte]   = useState("")
  const [newTodoDate, setNewTodoDate]     = useState("")
  const [newTodoUrgent, setNewTodoUrgent] = useState(false)

  const [showAddNote, setShowAddNote]     = useState(false)
  const [newNoteType, setNewNoteType]     = useState<NoteType>("Appel")
  const [newNoteContenu, setNewNoteContenu] = useState("")
  const [newNoteDate, setNewNoteDate]     = useState(new Date().toISOString().split("T")[0])

  const [showAddPrenante, setShowAddPrenante] = useState(false)
  const [newPrenante, setNewPrenante]     = useState({ nom: "", role: "", influence: "Moyen" as Influence })

  const prompts = buildPrompts(affaire, soncasActifs)

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function toggleSoncas(key: string) {
    setSoncasActifs((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  function toggleTodo(id: number) {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, fait: !t.fait } : t))
  }

  function ajouterTodo() {
    if (!newTodoTexte) return
    setTodos((prev) => [
      { id: Date.now(), texte: newTodoTexte, date: newTodoDate || "2026-12-31",
        fait: false, categorie: newTodoUrgent ? "Urgence" : "Admin", urgent: newTodoUrgent },
      ...prev,
    ])
    setNewTodoTexte(""); setNewTodoDate(""); setNewTodoUrgent(false)
    setShowAddTodo(false)
  }

  function ajouterNote() {
    if (!newNoteContenu) return
    setNotes((prev) => [
      { id: Date.now(), type: newNoteType, date: newNoteDate, contenu: newNoteContenu },
      ...prev,
    ])
    setNewNoteContenu(""); setNewNoteType("Appel")
    setNewNoteDate(new Date().toISOString().split("T")[0])
    setShowAddNote(false)
  }

  function ajouterPrenante() {
    if (!newPrenante.nom) return
    setPrenantes((prev) => [...prev, { id: Date.now(), ...newPrenante }])
    setNewPrenante({ nom: "", role: "", influence: "Moyen" })
    setShowAddPrenante(false)
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

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title={affaire.structure} />

        <main className="flex-1 p-5 md:p-6 pb-20 md:pb-6">

          {/* Retour */}
          <button
            onClick={() => router.push("/affaires")}
            className="flex items-center gap-1.5 text-sm mb-4 transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
          >
            <ArrowLeft size={15} /> Retour aux affaires
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* ══════════════ COLONNE GAUCHE (3/5) ══════════════ */}
            <div className="lg:col-span-3 space-y-4">

              {/* ── En-tête ── */}
              <div className="glass p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: "#f1f5f9" }}>{affaire.structure}</h2>
                    <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{affaire.typeInter}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/20 border border-amber-500/40 text-amber-300">
                      {affaire.etape}
                    </span>
                    <button className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
                      <Pencil size={13} /> Modifier
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Infos clés ── */}
              <div className="glass p-5">
                <h3 className="text-sm font-semibold mb-3" style={{ color: "#f1f5f9" }}>Infos clés</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Type projet",    value: affaire.typeProjet },
                    { label: "Espèce",         value: affaire.espece },
                    { label: "Nb de places",   value: affaire.nbPlaces.toLocaleString("fr-FR") },
                    { label: "Montant estimé", value: fmt(affaire.montant), green: true },
                    { label: "Marge estimée",  value: `${affaire.marge}%`, marge: true },
                    { label: "Date décision",  value: new Date(affaire.dateDecision).toLocaleDateString("fr-FR") },
                  ].map(({ label, value, green, marge }) => (
                    <div key={label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: "12px" }} className="px-3 py-2.5">
                      <p className="text-xs mb-0.5 text-white/40">{label}</p>
                      <p className="text-sm font-medium" style={{
                        color: green ? "#10b981" : marge ? (affaire.marge >= 35 ? "#10b981" : "#f59e0b") : "#f1f5f9"
                      }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Parties prenantes ── */}
              <div className="glass p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>Parties prenantes</h3>
                  <button
                    onClick={() => setShowAddPrenante(!showAddPrenante)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors font-medium"
                    style={{ color: "#a5b4fc" }}
                  >
                    <Plus size={13} /> Ajouter
                  </button>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      <th className="text-left pb-2 text-[11px] uppercase tracking-widest text-white/35">Nom</th>
                      <th className="text-left pb-2 text-[11px] uppercase tracking-widest text-white/35">Rôle</th>
                      <th className="text-left pb-2 text-[11px] uppercase tracking-widest text-white/35">Influence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prenantes.map((p) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <td className="py-2.5 font-medium pr-3" style={{ color: "#f1f5f9" }}>{p.nom}</td>
                        <td className="py-2.5 text-xs pr-3" style={{ color: "rgba(255,255,255,0.5)" }}>{p.role}</td>
                        <td className="py-2.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${INFLUENCE_STYLE[p.influence]}`}>
                            {p.influence}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {showAddPrenante && (
                  <div className="mt-3 pt-3 grid grid-cols-3 gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <input type="text" placeholder="Nom" value={newPrenante.nom}
                      onChange={(e) => setNewPrenante((p) => ({ ...p, nom: e.target.value }))}
                      className="input-glass text-xs px-2 py-1.5" />
                    <input type="text" placeholder="Rôle" value={newPrenante.role}
                      onChange={(e) => setNewPrenante((p) => ({ ...p, role: e.target.value }))}
                      className="input-glass text-xs px-2 py-1.5" />
                    <select value={newPrenante.influence}
                      onChange={(e) => setNewPrenante((p) => ({ ...p, influence: e.target.value as Influence }))}
                      className="select-glass text-xs px-2 py-1.5">
                      {(["Fort", "Moyen", "Faible"] as Influence[]).map((v) => <option key={v}>{v}</option>)}
                    </select>
                    <div className="col-span-3 flex gap-2 mt-1">
                      <button onClick={ajouterPrenante} className="flex-1 btn-primary text-xs py-1.5 rounded-xl">Ajouter</button>
                      <button onClick={() => setShowAddPrenante(false)} className="flex-1 btn-secondary text-xs py-1.5 rounded-xl">Annuler</button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Profil SONCAS ── */}
              <div className="glass p-5">
                <h3 className="text-sm font-semibold mb-3" style={{ color: "#f1f5f9" }}>Profil SONCAS</h3>
                <div className="flex flex-wrap gap-2">
                  {SONCAS_CONFIG.map(({ key, active, inactive }) => {
                    const isOn = soncasActifs.includes(key)
                    return (
                      <button
                        key={key}
                        onClick={() => toggleSoncas(key)}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-all ${isOn ? active : inactive}`}
                      >
                        {key}
                      </button>
                    )
                  })}
                </div>
                {soncasActifs.length > 0 && (
                  <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Activés : <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{soncasActifs.join(", ")}</span>
                  </p>
                )}
              </div>

              {/* ── Concurrence ── */}
              <div className="glass p-5">
                <h3 className="text-sm font-semibold mb-3" style={{ color: "#f1f5f9" }}>Concurrence</h3>
                <div className="mb-3">
                  <label className="text-xs block mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Concurrent identifié</label>
                  <input
                    type="text"
                    defaultValue={affaire.concurrent}
                    className="input-glass w-full"
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Notes sur la concurrence</label>
                  <textarea
                    value={notesConcurrence}
                    onChange={(e) => setNotesConcurrence(e.target.value)}
                    rows={3}
                    className="textarea-glass w-full"
                  />
                </div>
              </div>

              {/* ── Boutons IA ── */}
              <div className="glass p-5">
                <h3 className="text-sm font-semibold mb-3" style={{ color: "#f1f5f9" }}>Préparer avec Claude</h3>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => ouvrirPrompt("Préparer R1 Découverte", prompts.r1)}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300"
                  >
                    <span className="text-base">🔍</span> Préparer R1 avec Claude
                  </button>
                  <button
                    onClick={() => ouvrirPrompt("Préparer R2 + Arguments BAC", prompts.r2)}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300"
                  >
                    <span className="text-base">📋</span> Préparer R2 + Arguments BAC
                  </button>
                  <button
                    onClick={() => ouvrirPrompt("Traiter objection prix", prompts.prix)}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left bg-amber-500/20 hover:bg-amber-500/30 text-amber-300"
                  >
                    <span className="text-base">💬</span> Traiter objection prix
                  </button>
                </div>
              </div>
            </div>

            {/* ══════════════ COLONNE DROITE (2/5) ══════════════ */}
            <div className="lg:col-span-2 space-y-4">

              {/* ── To-do liste ── */}
              <div className="glass">
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <h3 className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>
                    To-do
                    <span className="ml-2 text-xs font-normal" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {todos.filter((t) => t.fait).length}/{todos.length}
                    </span>
                  </h3>
                  <button
                    onClick={() => setShowAddTodo(!showAddTodo)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors font-medium"
                    style={{ color: "#a5b4fc" }}
                  >
                    <Plus size={13} /> Ajouter
                  </button>
                </div>

                {showAddTodo && (
                  <div className="px-5 py-3 space-y-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                    <input type="text" placeholder="Tâche à faire…" value={newTodoTexte}
                      onChange={(e) => setNewTodoTexte(e.target.value)}
                      className="input-glass w-full" />
                    <div className="flex gap-2 items-center">
                      <input type="date" value={newTodoDate}
                        onChange={(e) => setNewTodoDate(e.target.value)}
                        className="input-glass flex-1" />
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "#f59e0b" }}>
                        <input type="checkbox" checked={newTodoUrgent}
                          onChange={(e) => setNewTodoUrgent(e.target.checked)}
                          className="rounded" />
                        Urgent
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={ajouterTodo} className="flex-1 btn-primary text-xs py-1.5 rounded-xl">Ajouter</button>
                      <button onClick={() => setShowAddTodo(false)} className="flex-1 btn-secondary text-xs py-1.5 rounded-xl">Annuler</button>
                    </div>
                  </div>
                )}

                <ul className="p-4 space-y-1">
                  {todos.map((todo) => {
                    const depasse = !todo.fait && isDepasse(todo.date)
                    return (
                      <li
                        key={todo.id}
                        onClick={() => toggleTodo(todo.id)}
                        className="flex items-start gap-2.5 cursor-pointer group p-2.5 rounded-xl transition-colors hover:bg-white/[0.04]"
                      >
                        {todo.fait ? (
                          <CheckSquare size={17} className="mt-0.5 shrink-0" style={{ color: "#10b981" }} />
                        ) : (
                          <Square size={17} className={`mt-0.5 shrink-0 transition-colors ${depasse ? "text-red-400" : "group-hover:text-indigo-400"}`} style={{ color: depasse ? "#f87171" : "rgba(255,255,255,0.25)" }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug" style={{
                            color: todo.fait ? "rgba(255,255,255,0.35)" : "#f1f5f9",
                            textDecoration: todo.fait ? "line-through" : "none"
                          }}>
                            {todo.texte}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs" style={{ color: depasse ? "#ef4444" : "rgba(255,255,255,0.35)", fontWeight: depasse ? 600 : 400 }}>
                              {depasse && <AlertCircle size={10} className="inline mr-0.5" />}
                              {new Date(todo.date).toLocaleDateString("fr-FR")}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TODO_CAT_STYLE[todo.categorie]}`}>
                              {todo.categorie}
                            </span>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>

              {/* ── Notes de terrain ── */}
              <div className="glass">
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <h3 className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>Notes de terrain</h3>
                  <button
                    onClick={() => setShowAddNote(!showAddNote)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors font-medium"
                    style={{ color: "#a5b4fc" }}
                  >
                    <Plus size={13} /> Note rapide
                  </button>
                </div>

                {showAddNote && (
                  <div className="px-5 py-3 space-y-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex gap-2">
                      <select value={newNoteType} onChange={(e) => setNewNoteType(e.target.value as NoteType)}
                        className="select-glass">
                        {(["Appel", "RDV", "Visite"] as NoteType[]).map((v) => <option key={v}>{v}</option>)}
                      </select>
                      <input type="date" value={newNoteDate} onChange={(e) => setNewNoteDate(e.target.value)}
                        className="input-glass flex-1" />
                    </div>
                    <textarea placeholder="Contenu de la note…" value={newNoteContenu}
                      onChange={(e) => setNewNoteContenu(e.target.value)} rows={3}
                      className="textarea-glass w-full" />
                    <div className="flex gap-2">
                      <button onClick={ajouterNote} className="flex-1 btn-primary text-xs py-1.5 rounded-xl">Ajouter</button>
                      <button onClick={() => setShowAddNote(false)} className="flex-1 btn-secondary text-xs py-1.5 rounded-xl">Annuler</button>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="p-5 space-y-0">
                  {notes.map((note, i) => {
                    const { dot, badge } = NOTE_TYPE_STYLE[note.type]
                    const isLast = i === notes.length - 1
                    return (
                      <div key={note.id} className="flex gap-3">
                        <div className="flex flex-col items-center shrink-0 w-4">
                          <div className={`w-3 h-3 rounded-full ${dot} shrink-0 mt-1`} />
                          {!isLast && <div className="w-px flex-1 mt-1 mb-0" style={{ background: "rgba(255,255,255,0.1)" }} />}
                        </div>

                        <div className={`flex-1 ${!isLast ? "pb-5" : ""}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badge}`}>{note.type}</span>
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                              {new Date(note.date).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>{note.contenu}</p>
                          <button
                            onClick={() => ouvrirPrompt(
                              "Structurer cette note avec Claude",
                              `Tu es un assistant CRM commercial avicole.\n\nVoici une note brute prise lors d'un ${note.type.toLowerCase()} avec ${affaire.structure} le ${new Date(note.date).toLocaleDateString("fr-FR")} :\n\n"${note.contenu}"\n\nStructure cette note en :\n1. Résumé en 2 phrases\n2. Points clés identifiés (besoins, objections, opportunités)\n3. Actions recommandées suite à ce ${note.type.toLowerCase()}\n4. Signaux d'achat détectés`
                            )}
                            className="mt-1.5 text-xs flex items-center gap-1 transition-colors"
                            style={{ color: "rgba(255,255,255,0.35)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#a5b4fc")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
                          >
                            ✦ Structurer avec Claude
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
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
