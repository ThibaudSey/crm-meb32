"use client"

import { useState, useRef, useEffect } from "react"
import {
  ChevronDown, ChevronUp, Plus, X, AlertTriangle,
  CheckSquare, Square, Copy, Check, Save, Camera,
  Sparkles, Loader2, Calendar, Printer,
} from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"
import { supabase } from "@/lib/supabase"
import type { Affaire } from "@/lib/types"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Concurrent {
  id: number; nom: string; point_fort: string; point_faible: string
}
interface PointBloquant {
  id: number; description: string; risque: "faible" | "moyen" | "éliminatoire"; action: string
}
interface TodoBilan {
  action: string; responsable: string; delai: string; fait: boolean
}
interface BilanData {
  synthese: string
  analyse_soncas: string
  soncas_dominant: string
  points_vigilance: string[]
  todo: TodoBilan[]
  date_r2: string
  date_r2_justification: string
  strategie_r2: string
  questions_restantes: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SONCAS_CONFIG = [
  { key: "Sécurité",  icon: "🔒", desc: "Veut être rassuré, références, SAV",         active: "bg-blue-500/30 border-blue-500/50 text-blue-200",     inactive: "border-blue-500/20 text-blue-400/60 hover:bg-blue-500/10"     },
  { key: "Orgueil",   icon: "👑", desc: "Veut le meilleur, image, prestige",           active: "bg-violet-500/30 border-violet-500/50 text-violet-200", inactive: "border-violet-500/20 text-violet-400/60 hover:bg-violet-500/10" },
  { key: "Nouveauté", icon: "✨", desc: "Veut innover, technologie, modernité",        active: "bg-cyan-500/30 border-cyan-500/50 text-cyan-200",     inactive: "border-cyan-500/20 text-cyan-400/60 hover:bg-cyan-500/10"     },
  { key: "Confort",   icon: "😌", desc: "Veut simplicité, accompagnement, zéro friction", active: "bg-emerald-500/30 border-emerald-500/50 text-emerald-200", inactive: "border-emerald-500/20 text-emerald-400/60 hover:bg-emerald-500/10" },
  { key: "Argent",    icon: "💰", desc: "Veut ROI, économies, rentabilité",            active: "bg-yellow-500/30 border-yellow-500/50 text-yellow-200", inactive: "border-yellow-500/20 text-yellow-400/60 hover:bg-yellow-500/10" },
  { key: "Sympathie", icon: "🤝", desc: "Relation humaine, confiance, valeurs",        active: "bg-pink-500/30 border-pink-500/50 text-pink-200",     inactive: "border-pink-500/20 text-pink-400/60 hover:bg-pink-500/10"     },
]

const FORM_INIT = {
  // Section 1
  decideur_nom: "", decideur_fonction: "", decideur_telephone: "",
  conjoint_implique: false, conjoint_nom: "",
  financeur_nom: "", financeur_conseiller: "",
  integrateur_impose: false, integrateur_nom: "",
  autres_influenceurs: "", circuit_decision: "",
  // Section 2
  type_projet: "", espece: "",
  nb_places: "", surface: "", nb_batiments: "",
  localisation: "", description_projet: "",
  attentes_specifiques: "",
  plans_disponibles: null as boolean | null,
  etat_sol: "", acces_chantier: "",
  // Section 3
  budget_estime: "",
  sources_financement: [] as string[],
  dossier_financement: "", conditionne_financement: "",
  chiffrage_concurrent: null as boolean | null,
  montant_concurrent: "", nom_concurrent_budget: "",
  remarques_budget: "",
  // Section 4
  date_demarrage: "", date_imperative: "",
  permis_construire: "", declaration_icpe: "",
  contraintes_reglementaires: "", echeance_critique: "",
  // Section 5
  fournisseur_actuel: "", raison_changement: "",
  criteres_choix: "", ce_qui_ferait_signer: "",
  // Section 6
  soncas_actifs: [] as string[],
  observations_comportementales: "",
  // Section 7
  autres_observations: "",
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function ToggleGroup({ options, value, onChange, multi = false }: {
  options: string[]
  value: string | string[]
  onChange: (v: string | string[]) => void
  multi?: boolean
}) {
  function toggle(opt: string) {
    if (!multi) {
      onChange(value === opt ? "" : opt)
    } else {
      const arr = value as string[]
      onChange(arr.includes(opt) ? arr.filter(a => a !== opt) : [...arr, opt])
    }
  }
  const isActive = (opt: string) => multi ? (value as string[]).includes(opt) : value === opt
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => toggle(opt)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
            isActive(opt)
              ? "bg-indigo-500/30 border-indigo-500/50 text-indigo-200"
              : "border-white/15 text-white/50 hover:border-white/30 hover:text-white/70"
          }`}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div className="flex gap-2">
      {([true, false] as const).map(v => (
        <button key={String(v)} type="button" onClick={() => onChange(value === v ? null : v)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
            value === v
              ? v ? "bg-emerald-500/30 border-emerald-500/50 text-emerald-200" : "bg-red-500/20 border-red-500/40 text-red-300"
              : "border-white/15 text-white/50 hover:border-white/30"
          }`}>
          {v ? "Oui" : "Non"}
        </button>
      ))}
    </div>
  )
}

function Section({ title, open, onToggle, children }: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="glass overflow-hidden">
      <button onClick={onToggle} type="button"
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        style={{ borderBottom: open ? "1px solid rgba(255,255,255,0.07)" : "none" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <span className="font-semibold text-sm" style={{ color: "#f1f5f9" }}>{title}</span>
        {open
          ? <ChevronUp size={16} style={{ color: "rgba(255,255,255,0.4)" }} />
          : <ChevronDown size={16} style={{ color: "rgba(255,255,255,0.4)" }} />
        }
      </button>
      {open && <div className="p-5 space-y-4">{children}</div>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DecouvertePage() {
  const [affaires, setAffaires] = useState<{ id: string; label: string }[]>([])

  useEffect(() => {
    supabase
      .from("affaires")
      .select("id, nom, type_projet, espece, nb_places")
      .order("nom")
      .then(({ data }) => {
        if (data) {
          setAffaires((data as Affaire[]).map(a => ({
            id: a.id,
            label: `${a.nom} – ${a.type_projet} ${a.nb_places || ""} pl.`,
          })))
        }
      })
  }, [])

  const [selectedAffaire, setSelectedAffaire] = useState("")
  const [dateRdv, setDateRdv] = useState(new Date().toISOString().split("T")[0])
  const [openSections, setOpenSections] = useState<number[]>([0, 1, 2, 3, 4, 5, 6, 7])
  const [form, setForm] = useState(FORM_INIT)
  const [concurrents, setConcurrents] = useState<Concurrent[]>([])
  const [pointsBloquants, setPointsBloquants] = useState<PointBloquant[]>([])
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedImageType, setUploadedImageType] = useState("image/jpeg")
  const [uploadedImageName, setUploadedImageName] = useState("")
  const [mode, setMode] = useState<"saisie" | "loading" | "bilan">("saisie")
  const [bilan, setBilan] = useState<BilanData | null>(null)
  const [bilanTodos, setBilanTodos] = useState<TodoBilan[]>([])
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function setF(k: string, v: any) { setForm(p => ({ ...p, [k]: v })) }

  function toggleSection(i: number) {
    setOpenSections(p => p.includes(i) ? p.filter(n => n !== i) : [...p, i])
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadedImageType(file.type || "image/jpeg")
    setUploadedImageName(file.name)
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      setUploadedImage(result.split(",")[1])
    }
    reader.readAsDataURL(file)
  }

  function addConcurrent() {
    setConcurrents(p => [...p, { id: Date.now(), nom: "", point_fort: "", point_faible: "" }])
  }
  function updateConcurrent(id: number, k: keyof Concurrent, v: string) {
    setConcurrents(p => p.map(c => c.id === id ? { ...c, [k]: v } : c))
  }
  function removeConcurrent(id: number) {
    setConcurrents(p => p.filter(c => c.id !== id))
  }

  function addBloquant() {
    setPointsBloquants(p => [...p, { id: Date.now(), description: "", risque: "moyen", action: "" }])
  }
  function updateBloquant(id: number, k: keyof PointBloquant, v: string) {
    setPointsBloquants(p => p.map(b => b.id === id ? { ...b, [k]: v } : b))
  }
  function removeBloquant(id: number) {
    setPointsBloquants(p => p.filter(b => b.id !== id))
  }

  // ── Build prompt ─────────────────────────────────────────────────────────────

  function buildPrompt(): string {
    const affaireLabel = affaires.find(a => a.id === selectedAffaire)?.label || "non précisée"
    const srcFin = form.sources_financement.join(", ") || "non précisé"
    const soncas = form.soncas_actifs.join(", ") || "non renseigné"
    const concurrentsText = concurrents.length
      ? concurrents.map(c => `${c.nom || "?"}  (point fort: ${c.point_fort || "?"}, point faible: ${c.point_faible || "?"})`).join("; ")
      : "aucun identifié"
    const bloquantsText = pointsBloquants.length
      ? pointsBloquants.map(b => `- ${b.description} [risque: ${b.risque}] → ${b.action}`).join("\n")
      : "aucun identifié"

    return `Voici les informations recueillies lors du R1 avec ${affaireLabel} (RDV du ${new Date(dateRdv).toLocaleDateString("fr-FR")}) :

PARTIES PRENANTES :
- Décideur : ${form.decideur_nom || "?"} (${form.decideur_fonction || "?"}, tél: ${form.decideur_telephone || "?"})
- Conjoint/associé impliqué : ${form.conjoint_implique ? "Oui — " + (form.conjoint_nom || "nom non renseigné") : "Non"}
- Financeur : ${form.financeur_nom || "non précisé"}${form.financeur_conseiller ? ", conseiller: " + form.financeur_conseiller : ""}
- Intégrateur imposé : ${form.integrateur_impose ? "Oui — " + (form.integrateur_nom || "nom non renseigné") : "Non"}
- Autres influenceurs : ${form.autres_influenceurs || "aucun"}
- Circuit de décision : ${form.circuit_decision || "non précisé"}

PROJET :
- Type : ${form.type_projet || "non précisé"}
- Espèce : ${form.espece || "non précisée"}
- Nombre de places : ${form.nb_places || "?"}
- Surface : ${form.surface ? form.surface + " m²" : "?"}
- Nombre de bâtiments : ${form.nb_batiments || "?"}
- Localisation : ${form.localisation || "non précisée"}
- Description : ${form.description_projet || "non précisée"}
- Attentes spécifiques : ${form.attentes_specifiques || "aucune"}
- Plans disponibles : ${form.plans_disponibles === true ? "Oui" : form.plans_disponibles === false ? "Non" : "?"}
- État du sol : ${form.etat_sol || "?"}
- Accès chantier : ${form.acces_chantier || "?"}

BUDGET & FINANCEMENT :
- Budget estimé : ${form.budget_estime ? form.budget_estime + " €" : "non communiqué"}
- Sources financement : ${srcFin}
- Dossier financement : ${form.dossier_financement || "?"}
- Conditionné au financement : ${form.conditionne_financement || "?"}
- Chiffrage concurrent : ${form.chiffrage_concurrent === true ? "Oui — " + (form.nom_concurrent_budget || "?") + (form.montant_concurrent ? " à " + form.montant_concurrent + " €" : "") : form.chiffrage_concurrent === false ? "Non" : "?"}
- Remarques : ${form.remarques_budget || "aucune"}

DÉLAIS & RÉGLEMENTATION :
- Démarrage souhaité : ${form.date_demarrage || "?"}
- Date impérative (mise en place animaux) : ${form.date_imperative || "?"}
- Permis de construire : ${form.permis_construire || "?"}
- Déclaration ICPE : ${form.declaration_icpe || "?"}
- Contraintes réglementaires : ${form.contraintes_reglementaires || "aucune"}
- Échéance critique : ${form.echeance_critique || "aucune"}

CONCURRENCE :
- Fournisseurs consultés : ${concurrentsText}
- Fournisseur actuel : ${form.fournisseur_actuel || "aucun"}${form.raison_changement ? " — raison: " + form.raison_changement : ""}
- Critères de choix annoncés : ${form.criteres_choix || "non précisés"}
- Ce qui ferait signer immédiatement : ${form.ce_qui_ferait_signer || "non précisé"}

PROFIL SONCAS :
- Motivations identifiées : ${soncas}
- Observations comportementales : ${form.observations_comportementales || "aucune"}

POINTS BLOQUANTS :
${bloquantsText}
- Autres observations : ${form.autres_observations || "aucune"}
${uploadedImage ? "\nJ'ai joint une photo de mes notes manuscrites prises pendant ce RDV. Analyse-la et intègre les informations supplémentaires au bilan." : ""}
Génère un bilan R1 complet. Réponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de texte avant/après) avec cette structure exacte :
{
  "synthese": "5-6 lignes résumant l'essentiel du projet et du profil client",
  "analyse_soncas": "analyse du profil comportemental et stratégie d'argumentation adaptée pour le R2",
  "soncas_dominant": "UN seul mot parmi: Sécurité, Orgueil, Nouveauté, Confort, Argent, Sympathie",
  "points_vigilance": ["point 1", "point 2", "point 3"],
  "todo": [{"action": "...", "responsable": "Thibaud ou Client ou Autre", "delai": "ex: avant le 25/03"}],
  "date_r2": "JJ/MM/AAAA",
  "date_r2_justification": "pourquoi cette date est idéale",
  "strategie_r2": "comment présenter l'offre, angle d'attaque, arguments clés à mettre en avant (5-8 lignes)",
  "questions_restantes": ["question 1", "question 2"]
}`
  }

  // ── API call ─────────────────────────────────────────────────────────────────

  async function genererBilan() {
    setMode("loading")
    try {
      const content: unknown[] = uploadedImage
        ? [
            { type: "image", source: { type: "base64", media_type: uploadedImageType, data: uploadedImage } },
            { type: "text", text: buildPrompt() },
          ]
        : [{ type: "text", text: buildPrompt() }]

      const res = await fetch("/api/analyse-decouverte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 4000,
          system: "Tu es un expert commercial B2B en équipement d'élevage avicole. Analyse les informations de cette découverte R1 et génère un bilan structuré complet. Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte autour.",
          messages: [{ role: "user", content }],
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erreur API")
      }

      const data = await res.json()
      const text: string = data.content?.[0]?.text || ""
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("Format de réponse invalide")

      const parsed = JSON.parse(jsonMatch[0])
      const bilanData: BilanData = {
        synthese: parsed.synthese || "",
        analyse_soncas: parsed.analyse_soncas || "",
        soncas_dominant: parsed.soncas_dominant || "",
        points_vigilance: Array.isArray(parsed.points_vigilance) ? parsed.points_vigilance : [],
        todo: (Array.isArray(parsed.todo) ? parsed.todo : []).map((t: { action?: string; responsable?: string; delai?: string }) => ({
          action: t.action || "", responsable: t.responsable || "", delai: t.delai || "", fait: false,
        })),
        date_r2: parsed.date_r2 || "",
        date_r2_justification: parsed.date_r2_justification || "",
        strategie_r2: parsed.strategie_r2 || "",
        questions_restantes: Array.isArray(parsed.questions_restantes) ? parsed.questions_restantes : [],
      }
      setBilan(bilanData)
      setBilanTodos(bilanData.todo)
      setMode("bilan")
    } catch (err) {
      console.error(err)
      setMode("saisie")
      alert(`Erreur : ${err instanceof Error ? err.message : "Erreur inconnue"}`)
    }
  }

  // ── Copy bilan ───────────────────────────────────────────────────────────────

  async function copierBilan() {
    if (!bilan) return
    const affaireLabel = affaires.find(a => a.id === selectedAffaire)?.label || "?"
    const text = `BILAN R1 — ${affaireLabel} (${new Date(dateRdv).toLocaleDateString("fr-FR")})

SYNTHÈSE
${bilan.synthese}

PROFIL SONCAS — ${bilan.soncas_dominant}
${bilan.analyse_soncas}

POINTS DE VIGILANCE
${bilan.points_vigilance.map(p => `• ${p}`).join("\n")}

TO-DO AVANT R2
${bilanTodos.map(t => `☐ ${t.action} — ${t.responsable} — ${t.delai}`).join("\n")}

DATE R2 SUGGÉRÉE : ${bilan.date_r2}
${bilan.date_r2_justification}

STRATÉGIE R2
${bilan.strategie_r2}

QUESTIONS RESTANTES
${bilan.questions_restantes.map(q => `• ${q}`).join("\n")}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const affaireLabel = affaires.find(a => a.id === selectedAffaire)?.label || "—"

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title="Fiche Découverte R1" />

        <main className="flex-1 p-5 md:p-6 pb-20 md:pb-8 space-y-4 max-w-4xl">

          {/* ── En-tête ── */}
          <div className="glass p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Affaire liée
                </label>
                <select
                  value={selectedAffaire}
                  onChange={e => setSelectedAffaire(e.target.value)}
                  className="select-glass w-full"
                >
                  <option value="">Sélectionner une affaire…</option>
                  {affaires.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Date du RDV
                </label>
                <input
                  type="date"
                  value={dateRdv}
                  onChange={e => setDateRdv(e.target.value)}
                  className="input-glass w-full"
                />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn-secondary rounded-xl text-xs flex items-center gap-2 px-3 py-2.5 w-full justify-center"
                >
                  <Camera size={14} />
                  {uploadedImageName ? uploadedImageName.substring(0, 12) + "…" : "📸 Analyser photo"}
                </button>
                <button
                  type="button"
                  className="btn-secondary rounded-xl text-xs flex items-center gap-2 px-3 py-2.5 w-full justify-center"
                >
                  <Save size={14} /> Sauvegarder
                </button>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            {uploadedImage && (
              <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                <Check size={13} style={{ color: "#10b981" }} />
                Image chargée : {uploadedImageName}
                <button onClick={() => { setUploadedImage(null); setUploadedImageName("") }}
                  className="ml-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              MODE SAISIE
          ══════════════════════════════════════════════════════════════════════ */}
          {(mode === "saisie" || mode === "loading") && (
            <>
              {/* Section 1 – Parties prenantes */}
              <Section title="👥 Parties prenantes — Qui influence ? Qui paie ? Qui décide ?"
                open={openSections.includes(0)} onToggle={() => toggleSection(0)}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Décideur principal — Nom">
                    <input className="input-glass" placeholder="Jean-Pierre Morin" value={form.decideur_nom} onChange={e => setF("decideur_nom", e.target.value)} />
                  </Field>
                  <Field label="Fonction">
                    <input className="input-glass" placeholder="Gérant EARL" value={form.decideur_fonction} onChange={e => setF("decideur_fonction", e.target.value)} />
                  </Field>
                  <Field label="Téléphone">
                    <input className="input-glass" placeholder="06 …" value={form.decideur_telephone} onChange={e => setF("decideur_telephone", e.target.value)} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Field label="Conjoint / associé impliqué">
                      <YesNo value={form.conjoint_implique ? true : false} onChange={v => setF("conjoint_implique", v ?? false)} />
                    </Field>
                    {form.conjoint_implique && (
                      <input className="input-glass mt-2" placeholder="Nom du conjoint/associé" value={form.conjoint_nom} onChange={e => setF("conjoint_nom", e.target.value)} />
                    )}
                  </div>
                  <div>
                    <Field label="Intégrateur imposé">
                      <YesNo value={form.integrateur_impose ? true : false} onChange={v => setF("integrateur_impose", v ?? false)} />
                    </Field>
                    {form.integrateur_impose && (
                      <input className="input-glass mt-2" placeholder="Nom de l'intégrateur" value={form.integrateur_nom} onChange={e => setF("integrateur_nom", e.target.value)} />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Financeur (banque / CA) — Nom">
                    <input className="input-glass" placeholder="Crédit Agricole…" value={form.financeur_nom} onChange={e => setF("financeur_nom", e.target.value)} />
                  </Field>
                  <Field label="Conseiller référent">
                    <input className="input-glass" placeholder="Nom du conseiller" value={form.financeur_conseiller} onChange={e => setF("financeur_conseiller", e.target.value)} />
                  </Field>
                </div>

                <Field label="Autres influenceurs">
                  <input className="input-glass" placeholder="Ex: voisin éleveur, technicien coop…" value={form.autres_influenceurs} onChange={e => setF("autres_influenceurs", e.target.value)} />
                </Field>
                <Field label="Circuit de décision — comment ça se passe chez eux ?">
                  <textarea className="textarea-glass" rows={2} placeholder="Ex: JP décide seul mais consulte Marie pour les gros investissements. La banque donne son accord avant signature…" value={form.circuit_decision} onChange={e => setF("circuit_decision", e.target.value)} />
                </Field>
              </Section>

              {/* Section 2 – Le Projet */}
              <Section title="🏗️ Le Projet"
                open={openSections.includes(1)} onToggle={() => toggleSection(1)}>
                <Field label="Type de projet">
                  <ToggleGroup options={["Neuf", "Rénovation", "Extension", "Remplacement"]}
                    value={form.type_projet} onChange={v => setF("type_projet", v)} />
                </Field>
                <Field label="Espèce élevée">
                  <ToggleGroup options={["Poulet chair", "Poulet label", "Dinde", "Canard", "Poule pondeuse", "Autre"]}
                    value={form.espece} onChange={v => setF("espece", v)} />
                </Field>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Field label="Nombre de places">
                    <input className="input-glass" type="number" placeholder="22 000" value={form.nb_places} onChange={e => setF("nb_places", e.target.value)} />
                  </Field>
                  <Field label="Surface (m²)">
                    <input className="input-glass" type="number" placeholder="1 200" value={form.surface} onChange={e => setF("surface", e.target.value)} />
                  </Field>
                  <Field label="Nb bâtiments">
                    <input className="input-glass" type="number" placeholder="1" value={form.nb_batiments} onChange={e => setF("nb_batiments", e.target.value)} />
                  </Field>
                  <Field label="Plans disponibles">
                    <YesNo value={form.plans_disponibles} onChange={v => setF("plans_disponibles", v)} />
                  </Field>
                </div>

                <Field label="Localisation du site">
                  <input className="input-glass" placeholder="Commune, département" value={form.localisation} onChange={e => setF("localisation", e.target.value)} />
                </Field>
                <Field label="Description du projet">
                  <textarea className="textarea-glass" rows={3} placeholder="Décrivez librement le projet tel que le client vous l'a présenté…" value={form.description_projet} onChange={e => setF("description_projet", e.target.value)} />
                </Field>
                <Field label="Attentes spécifiques">
                  <textarea className="textarea-glass" rows={2} placeholder="Ex: télégestion obligatoire, marque imposée par intégrateur, certification HVE…" value={form.attentes_specifiques} onChange={e => setF("attentes_specifiques", e.target.value)} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="État du sol existant">
                    <ToggleGroup options={["Béton", "Terre", "Dalle à faire"]}
                      value={form.etat_sol} onChange={v => setF("etat_sol", v)} />
                  </Field>
                  <Field label="Accès chantier">
                    <ToggleGroup options={["Facile", "Moyen", "Difficile"]}
                      value={form.acces_chantier} onChange={v => setF("acces_chantier", v)} />
                  </Field>
                </div>
              </Section>

              {/* Section 3 – Budget */}
              <Section title="💰 Budget & Financement"
                open={openSections.includes(2)} onToggle={() => toggleSection(2)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Budget global estimé par le client (€)">
                    <input className="input-glass" type="number" placeholder="50 000" value={form.budget_estime} onChange={e => setF("budget_estime", e.target.value)} />
                  </Field>
                  <Field label="Dossier de financement">
                    <ToggleGroup options={["Déposé", "En cours", "Pas commencé"]}
                      value={form.dossier_financement} onChange={v => setF("dossier_financement", v)} />
                  </Field>
                </div>

                <Field label="Sources de financement (plusieurs possibles)">
                  <ToggleGroup multi options={["Emprunt bancaire", "Apport personnel", "Subvention AREA", "PAC", "Autre"]}
                    value={form.sources_financement} onChange={v => setF("sources_financement", v)} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Décision conditionnée au financement">
                    <ToggleGroup options={["Oui", "Non", "Peut-être"]}
                      value={form.conditionne_financement} onChange={v => setF("conditionne_financement", v)} />
                  </Field>
                  <Field label="Le client a un chiffrage concurrent">
                    <YesNo value={form.chiffrage_concurrent} onChange={v => setF("chiffrage_concurrent", v)} />
                  </Field>
                </div>

                {form.chiffrage_concurrent && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Nom du concurrent">
                      <input className="input-glass" placeholder="Bâtivolaille…" value={form.nom_concurrent_budget} onChange={e => setF("nom_concurrent_budget", e.target.value)} />
                    </Field>
                    <Field label="Montant chiffré (€)">
                      <input className="input-glass" type="number" placeholder="42 000" value={form.montant_concurrent} onChange={e => setF("montant_concurrent", e.target.value)} />
                    </Field>
                  </div>
                )}

                <Field label="Remarques budget">
                  <textarea className="textarea-glass" rows={2} placeholder="Observations sur la situation financière du client…" value={form.remarques_budget} onChange={e => setF("remarques_budget", e.target.value)} />
                </Field>
              </Section>

              {/* Section 4 – Délais */}
              <Section title="⏱️ Délais & Réglementation"
                open={openSections.includes(3)} onToggle={() => toggleSection(3)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Date souhaitée de démarrage travaux">
                    <input className="input-glass" type="date" value={form.date_demarrage} onChange={e => setF("date_demarrage", e.target.value)} />
                  </Field>
                  <Field label="Date impérative (mise en place animaux)">
                    <input className="input-glass" type="date" value={form.date_imperative} onChange={e => setF("date_imperative", e.target.value)} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Permis de construire">
                    <ToggleGroup options={["Obtenu", "Déposé", "Pas commencé"]}
                      value={form.permis_construire} onChange={v => setF("permis_construire", v)} />
                  </Field>
                  <Field label="Déclaration ICPE">
                    <ToggleGroup options={["Faite", "En cours", "Non concerné"]}
                      value={form.declaration_icpe} onChange={v => setF("declaration_icpe", v)} />
                  </Field>
                </div>

                <Field label="Contraintes réglementaires spécifiques">
                  <input className="input-glass" placeholder="Zone Natura 2000, contraintes architecturales…" value={form.contraintes_reglementaires} onChange={e => setF("contraintes_reglementaires", e.target.value)} />
                </Field>
                <Field label="Échéance critique (ex: subvention à valider avant…)">
                  <input className="input-glass" placeholder="Ex: dossier AREA à déposer avant fin avril" value={form.echeance_critique} onChange={e => setF("echeance_critique", e.target.value)} />
                </Field>
              </Section>

              {/* Section 5 – Concurrence */}
              <Section title="⚔️ Concurrence"
                open={openSections.includes(4)} onToggle={() => toggleSection(4)}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Autres fournisseurs consultés</label>
                    <button type="button" onClick={addConcurrent}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
                      style={{ color: "#a5b4fc" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.1)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <Plus size={13} /> Ajouter concurrent
                    </button>
                  </div>
                  {concurrents.length === 0 && (
                    <p className="text-xs italic py-2" style={{ color: "rgba(255,255,255,0.25)" }}>Aucun concurrent ajouté</p>
                  )}
                  <div className="space-y-2">
                    {concurrents.map(c => (
                      <div key={c.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <input className="input-glass text-xs py-2" placeholder="Nom du concurrent" value={c.nom} onChange={e => updateConcurrent(c.id, "nom", e.target.value)} />
                        <input className="input-glass text-xs py-2" placeholder="Point fort perçu" value={c.point_fort} onChange={e => updateConcurrent(c.id, "point_fort", e.target.value)} />
                        <div className="flex gap-2">
                          <input className="input-glass text-xs py-2 flex-1" placeholder="Point faible" value={c.point_faible} onChange={e => updateConcurrent(c.id, "point_faible", e.target.value)} />
                          <button type="button" onClick={() => removeConcurrent(c.id)}
                            className="p-2 rounded-lg shrink-0 transition-colors"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Fournisseur actuel (si remplacement)">
                    <input className="input-glass" placeholder="Nom du fournisseur en place" value={form.fournisseur_actuel} onChange={e => setF("fournisseur_actuel", e.target.value)} />
                  </Field>
                  <Field label="Raison du changement">
                    <input className="input-glass" placeholder="SAV défaillant, prix, qualité…" value={form.raison_changement} onChange={e => setF("raison_changement", e.target.value)} />
                  </Field>
                </div>
                <Field label="Critères de choix annoncés par le client">
                  <textarea className="textarea-glass" rows={2} placeholder="Prix, délais, garantie, SAV local, réputation…" value={form.criteres_choix} onChange={e => setF("criteres_choix", e.target.value)} />
                </Field>
                <Field label="Ce qui ferait signer immédiatement">
                  <textarea className="textarea-glass" rows={2} placeholder="Ex: garantie 10 ans sur charpente, démonstration télégestion, visite client référence…" value={form.ce_qui_ferait_signer} onChange={e => setF("ce_qui_ferait_signer", e.target.value)} />
                </Field>
              </Section>

              {/* Section 6 – SONCAS */}
              <Section title="🧠 Profil SONCAS"
                open={openSections.includes(5)} onToggle={() => toggleSection(5)}>
                <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Cochez les motivations identifiées. Le premier coché = dominant.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {SONCAS_CONFIG.map(s => {
                    const isActive = form.soncas_actifs.includes(s.key)
                    const index = form.soncas_actifs.indexOf(s.key)
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => {
                          const arr = form.soncas_actifs
                          setF("soncas_actifs", arr.includes(s.key) ? arr.filter(k => k !== s.key) : [...arr, s.key])
                        }}
                        className={`relative flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${isActive ? s.active : s.inactive}`}
                      >
                        {isActive && index === 0 && (
                          <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
                            Dominant
                          </span>
                        )}
                        <span className="text-xl leading-none">{s.icon}</span>
                        <span className="font-semibold text-sm">{s.key}</span>
                        <span className="text-[11px] leading-tight opacity-70">{s.desc}</span>
                      </button>
                    )
                  })}
                </div>
                <Field label="Observations comportementales">
                  <textarea className="textarea-glass" rows={3} placeholder="Notez les signaux verbaux et non-verbaux observés pendant le RDV (hésitations, enthousiasmes, questions posées…)" value={form.observations_comportementales} onChange={e => setF("observations_comportementales", e.target.value)} />
                </Field>
              </Section>

              {/* Section 7 – Points bloquants */}
              <Section title="🚧 Points bloquants"
                open={openSections.includes(6)} onToggle={() => toggleSection(6)}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Points bloquants identifiés</label>
                    <button type="button" onClick={addBloquant}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium"
                      style={{ color: "#a5b4fc" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.1)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <Plus size={13} /> Ajouter
                    </button>
                  </div>
                  {pointsBloquants.length === 0 && (
                    <p className="text-xs italic py-2" style={{ color: "rgba(255,255,255,0.25)" }}>Aucun point bloquant ajouté</p>
                  )}
                  <div className="space-y-2">
                    {pointsBloquants.map(b => (
                      <div key={b.id} className="p-3 rounded-xl space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="flex gap-2 items-start">
                          <input className="input-glass text-xs py-2 flex-1" placeholder="Description du point bloquant" value={b.description} onChange={e => updateBloquant(b.id, "description", e.target.value)} />
                          <select
                            value={b.risque}
                            onChange={e => updateBloquant(b.id, "risque", e.target.value)}
                            className="select-glass text-xs py-2 w-36 shrink-0"
                          >
                            <option value="faible">Faible</option>
                            <option value="moyen">Moyen</option>
                            <option value="éliminatoire">Éliminatoire</option>
                          </select>
                          <button type="button" onClick={() => removeBloquant(b.id)}
                            className="p-2 rounded-lg shrink-0 mt-0.5"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <X size={14} />
                          </button>
                        </div>
                        <input className="input-glass text-xs py-2 w-full" placeholder="Action pour lever ce blocage" value={b.action} onChange={e => updateBloquant(b.id, "action", e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>
                <Field label="Autres observations importantes">
                  <textarea className="textarea-glass" rows={3} placeholder="Tout ce qui vous a semblé important et qui ne rentre pas dans les cases ci-dessus…" value={form.autres_observations} onChange={e => setF("autres_observations", e.target.value)} />
                </Field>
              </Section>

              {/* Section 8 – Upload photo */}
              <Section title="📸 Notes manuscrites — Analyse par IA"
                open={openSections.includes(7)} onToggle={() => toggleSection(7)}>
                <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Uploadez une photo de vos notes papier prises pendant le RDV. Claude les analysera et les intégrera automatiquement au bilan.
                </p>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center py-10 gap-3 transition-all"
                  style={{
                    borderColor: uploadedImage ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.15)",
                    background: uploadedImage ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.02)",
                  }}
                  onMouseEnter={e => !uploadedImage && (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  onMouseLeave={e => !uploadedImage && (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                >
                  {uploadedImage ? (
                    <>
                      <Check size={28} style={{ color: "#10b981" }} />
                      <p className="text-sm font-medium" style={{ color: "#10b981" }}>Image chargée</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{uploadedImageName}</p>
                      <button type="button" onClick={e => { e.stopPropagation(); setUploadedImage(null); setUploadedImageName("") }}
                        className="text-xs px-3 py-1 rounded-lg"
                        style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.06)" }}>
                        Supprimer
                      </button>
                    </>
                  ) : (
                    <>
                      <Camera size={28} style={{ color: "rgba(255,255,255,0.25)" }} />
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Cliquez pour uploader une photo</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>JPG, PNG, HEIC — max 5 Mo</p>
                    </>
                  )}
                </div>
              </Section>

              {/* ── Bouton Générer ── */}
              <button
                type="button"
                onClick={genererBilan}
                disabled={mode === "loading"}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-base transition-all"
                style={{
                  background: mode === "loading"
                    ? "rgba(99,102,241,0.3)"
                    : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color: "#fff",
                  boxShadow: mode === "loading" ? "none" : "0 8px 30px rgba(99,102,241,0.4)",
                }}
              >
                {mode === "loading" ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Analyse en cours avec Claude…
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Générer le Bilan R1 avec Claude
                  </>
                )}
              </button>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              MODE BILAN
          ══════════════════════════════════════════════════════════════════════ */}
          {mode === "bilan" && bilan && (
            <>
              {/* Header bilan */}
              <div className="glass p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: "rgba(99,102,241,0.7)" }}>Bilan R1 généré</p>
                  <h2 className="font-bold text-lg" style={{ color: "#f1f5f9" }}>{affaireLabel}</h2>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                    RDV du {new Date(dateRdv).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMode("saisie")}
                  className="btn-secondary text-xs px-3 py-2 rounded-xl shrink-0"
                >
                  ← Modifier la fiche
                </button>
              </div>

              {/* Card Synthèse */}
              <div className="glass p-5" style={{ borderLeft: "3px solid #6366f1" }}>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#a5b4fc" }}>
                  📋 Synthèse du projet
                </h3>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#f1f5f9" }}>{bilan.synthese}</p>
              </div>

              {/* Card SONCAS */}
              <div className="glass p-5" style={{ borderLeft: "3px solid #8b5cf6" }}>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#c4b5fd" }}>
                  🧠 Analyse SONCAS
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {SONCAS_CONFIG.map(s => {
                    const isDominant = bilan.soncas_dominant === s.key
                    const isActif = form.soncas_actifs.includes(s.key) || isDominant
                    if (!isActif) return null
                    return (
                      <span key={s.key}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${isDominant ? s.active : s.inactive}`}>
                        {s.icon} {s.key}
                        {isDominant && <span className="text-[10px] opacity-70 font-normal ml-0.5">(dominant)</span>}
                      </span>
                    )
                  })}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "rgba(255,255,255,0.8)" }}>{bilan.analyse_soncas}</p>
              </div>

              {/* Card Vigilance */}
              <div className="glass p-5" style={{ borderLeft: "3px solid #f59e0b" }}>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#fcd34d" }}>
                  ⚠️ Points de vigilance
                </h3>
                <ul className="space-y-2">
                  {bilan.points_vigilance.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Card To-do */}
              <div className="glass p-5" style={{ borderLeft: "3px solid #10b981" }}>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#6ee7b7" }}>
                  ✅ To-do avant le R2
                </h3>
                <div className="space-y-2">
                  {bilanTodos.map((todo, i) => (
                    <div key={i}
                      onClick={() => setBilanTodos(p => p.map((t, j) => j === i ? { ...t, fait: !t.fait } : t))}
                      className="flex items-start gap-3 cursor-pointer group p-2 rounded-xl transition-all"
                      style={{ background: todo.fait ? "rgba(16,185,129,0.06)" : "transparent" }}
                      onMouseEnter={e => !todo.fait && (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={e => !todo.fait && (e.currentTarget.style.background = "transparent")}
                    >
                      {todo.fait
                        ? <CheckSquare size={16} className="shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                        : <Square size={16} className="shrink-0 mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm" style={{ color: todo.fait ? "rgba(255,255,255,0.35)" : "#f1f5f9", textDecoration: todo.fait ? "line-through" : "none" }}>
                          {todo.action}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                          {todo.responsable} · {todo.delai}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Date R2 */}
              <div className="glass p-5" style={{ borderLeft: "3px solid #06b6d4" }}>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#67e8f9" }}>
                  📅 Date R2 suggérée
                </h3>
                <p className="text-2xl font-bold mb-2" style={{ color: "#f1f5f9" }}>{bilan.date_r2}</p>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{bilan.date_r2_justification}</p>
                <button
                  type="button"
                  className="mt-3 flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-medium"
                  style={{ background: "rgba(6,182,212,0.15)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.3)" }}
                >
                  <Calendar size={13} /> Ajouter au planning
                </button>
              </div>

              {/* Card Stratégie R2 */}
              <div className="glass p-5" style={{ borderLeft: "3px solid #6366f1" }}>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#a5b4fc" }}>
                  🎯 Stratégie R2 recommandée
                </h3>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#f1f5f9" }}>{bilan.strategie_r2}</p>
              </div>

              {/* Card Questions restantes */}
              <div className="glass p-5" style={{ borderLeft: "3px solid rgba(255,255,255,0.3)" }}>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>
                  ❓ Questions restantes à clarifier
                </h3>
                <ul className="space-y-2">
                  {bilan.questions_restantes.map((q, i) => (
                    <li key={i} className="text-sm flex items-start gap-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                      <span style={{ color: "rgba(255,255,255,0.3)" }} className="shrink-0 mt-0.5">?</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions bilan */}
              <div className="glass p-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="btn-primary rounded-xl flex items-center gap-2 text-sm font-semibold px-5 py-2.5"
                >
                  <Save size={15} /> Valider et sauvegarder dans l&apos;affaire
                </button>
                <button
                  type="button"
                  onClick={copierBilan}
                  className="btn-secondary rounded-xl flex items-center gap-2 text-sm px-4 py-2.5"
                >
                  {copied ? <Check size={15} style={{ color: "#10b981" }} /> : <Copy size={15} />}
                  {copied ? "Copié !" : "Copier le bilan"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="btn-secondary rounded-xl flex items-center gap-2 text-sm px-4 py-2.5"
                >
                  <Printer size={15} /> Version imprimable
                </button>
              </div>
            </>
          )}
        </main>
      </div>

      {/* ══ MODALE IMPRESSION ══ */}
      {showPrintModal && bilan && (
        <>
          <div className="modal-overlay" onClick={() => setShowPrintModal(false)} />
          <div
            className="modal-box fixed inset-4 sm:inset-8 lg:inset-16 z-50 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <h2 className="font-bold" style={{ color: "#f1f5f9" }}>Bilan R1 — {affaireLabel}</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-primary text-xs px-3 py-2 rounded-xl flex items-center gap-1.5"
                >
                  <Printer size={13} /> Imprimer
                </button>
                <button type="button" onClick={() => setShowPrintModal(false)}
                  className="p-2 rounded-lg" style={{ color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {[
                { titre: "Synthèse du projet", contenu: bilan.synthese },
                { titre: `Profil SONCAS — ${bilan.soncas_dominant}`, contenu: bilan.analyse_soncas },
                { titre: "Stratégie R2", contenu: bilan.strategie_r2 },
              ].map(({ titre, contenu }) => (
                <div key={titre}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#a5b4fc" }}>{titre}</p>
                  <pre className="prompt-pre text-xs">{contenu}</pre>
                </div>
              ))}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#fcd34d" }}>Points de vigilance</p>
                <ul className="space-y-1">
                  {bilan.points_vigilance.map((p, i) => (
                    <li key={i} className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>• {p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#6ee7b7" }}>To-do avant R2</p>
                <ul className="space-y-1">
                  {bilanTodos.map((t, i) => (
                    <li key={i} className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                      ☐ {t.action} — {t.responsable} — {t.delai}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#67e8f9" }}>Date R2 suggérée</p>
                <p className="text-sm font-bold" style={{ color: "#f1f5f9" }}>{bilan.date_r2}</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>{bilan.date_r2_justification}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Questions restantes</p>
                <ul className="space-y-1">
                  {bilan.questions_restantes.map((q, i) => (
                    <li key={i} className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>? {q}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
