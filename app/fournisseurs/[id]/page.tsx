"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Plus, X, Copy, Check,
  Loader2, ChevronDown, ChevronUp, Sparkles,
} from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"
import { supabase } from "@/lib/supabase"
import type { Fournisseur, FournisseurContact, FournisseurProduit, DemandeDevisFournisseur, Affaire } from "@/lib/types"
import LoadingSpinner from "@/components/LoadingSpinner"
import ErrorMessage from "@/components/ErrorMessage"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contact { id: string; prenom: string; nom: string; fonction: string; tel: string; email: string; notes: string; est_principal: boolean }
interface Produit  { id: string; nom: string; description: string; prix_min: number; prix_max: number; delai: string; points_forts: string; points_faibles: string }
interface InfoOblig { id: number; libelle: string; type: "texte" | "nombre" | "plan" | "photo"; obligatoire: boolean }
interface Historique { id: string; date: string; affaire: string; montant_demande: number; delai_reponse: number | null; montant_recu: number | null; statut: "reçu" | "en_attente" | "refusé" }
interface PromptResult { email_objet: string; email_corps: string; checklist: string[]; questions: string[]; delai_relance: string }

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORIES = ["Ventilation / Climatisation", "Chauffage / Éclairage", "Abreuvement / Alimentation", "Télégestion / Capteurs", "Structure / Bâtiment", "Pesage", "Autre"]

const CAT_CONFIG: Record<string, string> = {
  "Ventilation / Climatisation": "bg-blue-500/20 border border-blue-500/40 text-blue-300",
  "Chauffage / Éclairage":       "bg-orange-500/20 border border-orange-500/40 text-orange-300",
  "Abreuvement / Alimentation":  "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300",
  "Télégestion / Capteurs":      "bg-violet-500/20 border border-violet-500/40 text-violet-300",
  "Structure / Bâtiment":        "bg-amber-500/20 border border-amber-500/40 text-amber-300",
  "Pesage":                      "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300",
  "Autre":                       "bg-white/10 border border-white/20 text-white/50",
}

const STATUT_CONFIG = {
  actif:       { badge: "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300", label: "Actif" },
  en_test:     { badge: "bg-amber-500/20 border border-amber-500/40 text-amber-300",       label: "En test" },
  inactif:     { badge: "bg-white/10 border border-white/20 text-white/40",                label: "Inactif" },
  blacklisté:  { badge: "bg-red-500/20 border border-red-500/40 text-red-300",             label: "Blacklisté" },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €" }

function Stars({ note, onChange }: { note: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" onClick={() => onChange?.(i)}
          className={`text-xl transition-colors ${onChange ? "cursor-pointer hover:scale-110" : "cursor-default"}`}
          style={{ color: i <= note ? "#f59e0b" : "rgba(255,255,255,0.15)" }}>
          ★
        </button>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</label>
      {children}
    </div>
  )
}

function Section({ title, open, onToggle, accent, children }: {
  title: string; open: boolean; onToggle: () => void; accent?: string; children: React.ReactNode
}) {
  return (
    <div className="glass overflow-hidden" style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}>
      <button onClick={onToggle} type="button"
        className="w-full flex items-center justify-between px-5 py-4"
        style={{ borderBottom: open ? "1px solid rgba(255,255,255,0.07)" : "none" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <span className="font-semibold text-sm" style={{ color: accent ? "white" : "#f1f5f9" }}>{title}</span>
        {open ? <ChevronUp size={15} style={{ color: "rgba(255,255,255,0.4)" }} /> : <ChevronDown size={15} style={{ color: "rgba(255,255,255,0.4)" }} />}
      </button>
      {open && <div className="p-5 space-y-4">{children}</div>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FicheFournisseurPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  // ── Loading / error state ──────────────────────────────────────────────────
  const [loading, setLoading]       = useState(true)
  const [notFound, setNotFound]     = useState(false)

  // ── Fournisseur fields ─────────────────────────────────────────────────────
  const [nom, setNom]                         = useState("")
  const [categorie, setCategorie]             = useState("")
  const [customCat, setCustomCat]             = useState("")
  const [siteWeb, setSiteWeb]                 = useState("")
  const [adresse, setAdresse]                 = useState("")
  const [statut, setStatut]                   = useState<keyof typeof STATUT_CONFIG>("actif")
  const [note, setNote]                       = useState(0)
  const [commentaire, setCommentaire]         = useState("")
  const [remise, setRemise]                   = useState("")
  const [delaiPaiement, setDelaiPaiement]     = useState("30j")
  const [minCommande, setMinCommande]         = useState("")
  const [zoneGeo, setZoneGeo]                 = useState("")
  const [certifications, setCertifications]   = useState("")
  const [obsTarifaires, setObsTarifaires]     = useState("")
  const [canal, setCanal]                     = useState("Email")
  const [emailDevis, setEmailDevis]           = useState("")
  const [delaiReponse, setDelaiReponse]       = useState("48h")
  const [formatReponse, setFormatReponse]     = useState("PDF")
  const [interlocDevis, setInterlocDevis]     = useState("")
  const [infosOblig, setInfosOblig]           = useState<InfoOblig[]>([])
  const [infosOpt, setInfosOpt]               = useState("")
  const [procedure, setProcedure]             = useState("")
  const [templateEmail, setTemplateEmail]     = useState("")

  // ── Lists ──────────────────────────────────────────────────────────────────
  const [contacts, setContacts]               = useState<Contact[]>([])
  const [produits, setProduits]               = useState<Produit[]>([])
  const [historique, setHistorique]           = useState<Historique[]>([])
  const [affaires, setAffaires]               = useState<{ id: string; label: string }[]>([])

  // ── UI state ───────────────────────────────────────────────────────────────
  const [openSections, setOpenSections]       = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [selectedAffaire, setSelectedAffaire] = useState("")
  const [loadingGen, setLoadingGen]           = useState(false)
  const [promptResult, setPromptResult]       = useState<PromptResult | null>(null)
  const [activeTab, setActiveTab]             = useState<"email" | "checklist" | "questions">("email")
  const [copied, setCopied]                   = useState(false)
  const [checklistState, setChecklistState]   = useState<boolean[]>([])

  // ── Nouvelle demande modal ─────────────────────────────────────────────────
  const [showDemandeModal, setShowDemandeModal] = useState(false)
  const [demandeAffaire, setDemandeAffaire]     = useState("")
  const [demandeDate, setDemandeDate]           = useState(new Date().toISOString().split("T")[0])
  const [demandeMontant, setDemandeMontant]     = useState("")
  const [savingDemande, setSavingDemande]       = useState(false)

  // ── Fetch data on mount ────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      try {
        const [
          { data: fournisseur, error: fErr },
          { data: contactsData },
          { data: produitsData },
          { data: historiqueData },
          { data: affairesData },
        ] = await Promise.all([
          supabase.from("fournisseurs").select("*").eq("id", id).single(),
          supabase.from("fournisseurs_contacts").select("*").eq("fournisseur_id", id),
          supabase.from("fournisseurs_produits").select("*").eq("fournisseur_id", id),
          supabase.from("demandes_devis_fournisseur").select("*").eq("fournisseur_id", id).order("created_at", { ascending: false }),
          supabase.from("entreprises").select("id, nom, type_projet, espece, nb_places").order("nom"),
        ])

        if (fErr || !fournisseur) {
          setNotFound(true)
          return
        }

        const f = fournisseur as Fournisseur
        setNom(f.nom || "")
        setCategorie(f.categorie || "")
        setSiteWeb(f.site_web || "")
        setAdresse(f.adresse || "")
        setStatut((f.statut as keyof typeof STATUT_CONFIG) || "actif")
        setNote(f.note_fiabilite || 0)
        setCommentaire(f.commentaire || "")
        setRemise(f.remise_habituelle != null ? String(f.remise_habituelle) : "")
        setDelaiPaiement(f.delai_paiement || "30j")
        setMinCommande(f.min_commande != null ? String(f.min_commande) : "")
        setZoneGeo(f.zone_geo || "")
        setCertifications(f.certifications || "")
        setObsTarifaires(f.obs_tarifaires || "")
        setCanal(f.canal_devis_prefere || "Email")
        setEmailDevis(f.email_devis || "")
        setDelaiReponse(f.delai_reponse_habituel || "48h")
        setFormatReponse(f.format_reponse || "PDF")
        setInfosOblig(Array.isArray(f.infos_obligatoires) ? f.infos_obligatoires : [])
        setInfosOpt(f.infos_optionnelles || "")
        setProcedure(f.procedure_speciale || "")
        setTemplateEmail(f.template_email || "")

        const mappedContacts: Contact[] = (contactsData as FournisseurContact[] || []).map(c => ({
          id: c.id,
          prenom: c.prenom || "",
          nom: c.nom || "",
          fonction: c.fonction || "",
          tel: c.telephone || "",
          email: c.email || "",
          notes: c.notes || "",
          est_principal: c.est_principal,
        }))
        setContacts(mappedContacts)
        if (mappedContacts.length > 0) setInterlocDevis(mappedContacts[0].id)

        setProduits((produitsData as FournisseurProduit[] || []).map(p => ({
          id: p.id,
          nom: p.nom || "",
          description: p.description || "",
          prix_min: p.prix_min || 0,
          prix_max: p.prix_max || 0,
          delai: p.delai_livraison || "",
          points_forts: p.points_forts || "",
          points_faibles: p.points_faibles || "",
        })))

        setHistorique((historiqueData as DemandeDevisFournisseur[] || []).map(h => ({
          id: h.id,
          date: h.date_envoi || h.created_at,
          affaire: h.affaire_id || "",
          montant_demande: h.montant_demande || 0,
          delai_reponse: h.delai_reponse_reel || null,
          montant_recu: h.montant_recu || null,
          statut: (h.statut === "en_attente" ? "en_attente" : h.statut === "reçu" ? "reçu" : "refusé") as Historique["statut"],
        })))

        setAffaires((affairesData as Affaire[] || []).map(a => ({
          id: a.id,
          label: `${a.nom} – ${a.type_projet} ${a.nb_places}pl.`,
        })))
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [id])

  function toggleSection(i: number) {
    setOpenSections(p => p.includes(i) ? p.filter(n => n !== i) : [...p, i])
  }

  // ── Save fournisseur ────────────────────────────────────────────────────────

  async function saveFournisseur() {
    await supabase.from("fournisseurs").update({
      nom,
      categorie: categorie === "__custom__" ? customCat : categorie,
      site_web: siteWeb,
      adresse,
      statut,
      note_fiabilite: note,
      commentaire,
      remise_habituelle: remise ? parseFloat(remise) : null,
      delai_paiement: delaiPaiement,
      min_commande: minCommande ? parseFloat(minCommande) : null,
      zone_geo: zoneGeo,
      certifications,
      obs_tarifaires: obsTarifaires,
      canal_devis_prefere: canal,
      email_devis: emailDevis,
      delai_reponse_habituel: delaiReponse,
      infos_obligatoires: infosOblig,
      infos_optionnelles: infosOpt,
      format_reponse: formatReponse,
      procedure_speciale: procedure,
      template_email: templateEmail,
    }).eq("id", id)
  }

  // ── Contacts ────────────────────────────────────────────────────────────────

  async function addContact() {
    const { data, error } = await supabase
      .from("fournisseurs_contacts")
      .insert({ fournisseur_id: id, prenom: "", nom: "", fonction: "", telephone: "", email: "", est_principal: false, notes: "" })
      .select()
      .single()
    if (error || !data) return
    const c = data as FournisseurContact
    setContacts(p => [...p, { id: c.id, prenom: "", nom: "", fonction: "", tel: "", email: "", notes: "", est_principal: false }])
  }

  function setContact(contactId: string, k: keyof Contact, v: string | boolean) {
    setContacts(p => p.map(c => c.id === contactId ? { ...c, [k]: v } : c))
  }

  async function deleteContact(contactId: string) {
    await supabase.from("fournisseurs_contacts").delete().eq("id", contactId)
    setContacts(p => p.filter(c => c.id !== contactId))
  }

  // ── Produits ────────────────────────────────────────────────────────────────

  async function addProduit() {
    const { data, error } = await supabase
      .from("fournisseurs_produits")
      .insert({ fournisseur_id: id, nom: "", description: "", prix_min: null, prix_max: null, delai_livraison: "", points_forts: "", points_faibles: "" })
      .select()
      .single()
    if (error || !data) return
    const p = data as FournisseurProduit
    setProduits(prev => [...prev, { id: p.id, nom: "", description: "", prix_min: 0, prix_max: 0, delai: "", points_forts: "", points_faibles: "" }])
  }

  function setProduit(produitId: string, k: keyof Produit, v: string | number) {
    setProduits(p => p.map(pr => pr.id === produitId ? { ...pr, [k]: v } : pr))
  }

  async function deleteProduit(produitId: string) {
    await supabase.from("fournisseurs_produits").delete().eq("id", produitId)
    setProduits(p => p.filter(pr => pr.id !== produitId))
  }

  // ── Infos obligatoires ──────────────────────────────────────────────────────

  function addInfoOblig() {
    setInfosOblig(p => [...p, { id: Date.now(), libelle: "", type: "texte", obligatoire: true }])
  }
  function setInfoOblig(infoId: number, k: keyof InfoOblig, v: string | boolean) {
    setInfosOblig(p => p.map(i => i.id === infoId ? { ...i, [k]: v } : i))
  }

  // ── Nouvelle demande devis ──────────────────────────────────────────────────

  async function saveNouvelledemande() {
    setSavingDemande(true)
    const { data, error } = await supabase
      .from("demandes_devis_fournisseur")
      .insert({
        fournisseur_id: id,
        affaire_id: demandeAffaire || null,
        date_envoi: demandeDate,
        montant_demande: demandeMontant ? parseFloat(demandeMontant) : null,
        statut: "en_attente",
        email_objet: null,
        email_corps: null,
      })
      .select()
      .single()
    setSavingDemande(false)
    if (error || !data) return
    const h = data as DemandeDevisFournisseur
    setHistorique(p => [{
      id: h.id,
      date: h.date_envoi || h.created_at,
      affaire: h.affaire_id || "",
      montant_demande: h.montant_demande || 0,
      delai_reponse: null,
      montant_recu: null,
      statut: "en_attente",
    }, ...p])
    setShowDemandeModal(false)
    setDemandeAffaire("")
    setDemandeDate(new Date().toISOString().split("T")[0])
    setDemandeMontant("")
  }

  // ── Génération Claude ────────────────────────────────────────────────────────

  async function genererDemande() {
    const aff = affaires.find(a => a.id === selectedAffaire)
    if (!aff) return
    setLoadingGen(true)
    const interlocNom = contacts.find(c => c.id === interlocDevis)
    const infosRequises = infosOblig.filter(i => i.obligatoire).map(i => `  - ${i.libelle} (${i.type})`).join("\n")

    const prompt = `Tu es assistant commercial en équipement avicole.
Génère une demande de devis pour le fournisseur ${nom}, catégorie ${categorie}.

PROJET CLIENT :
- Affaire : ${aff.label}

MÉTHODE DE CE FOURNISSEUR :
- Canal préféré : ${canal}
- Email de contact : ${emailDevis}
- Délai de réponse habituel : ${delaiReponse}
- Informations obligatoires à fournir :
${infosRequises}
- Informations optionnelles utiles : ${infosOpt || "aucune"}
- Format de réponse attendu : ${formatReponse}
- Procédure spéciale : ${procedure || "aucune"}
- Interlocuteur dédié : ${interlocNom ? interlocNom.prenom + " " + interlocNom.nom + " (" + interlocNom.fonction + ")" : "non précisé"}

TEMPLATE HABITUEL :
${templateEmail}

Réponds UNIQUEMENT en JSON valide (pas de markdown) avec cette structure exacte :
{
  "email_objet": "objet de l'email",
  "email_corps": "corps complet de l'email prêt à envoyer",
  "checklist": ["vérifier info 1 avant envoi", "vérifier info 2", "..."],
  "questions": ["question si info manquante 1", "question 2"],
  "delai_relance": "ex: relancer par téléphone après 48h si pas de retour"
}`

    try {
      const res = await fetch("/api/analyse-decouverte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 2000,
          system: "Tu es un assistant commercial expert en équipement avicole. Génère des demandes de devis professionnelles et complètes. Réponds uniquement en JSON valide.",
          messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
        }),
      })
      const data = await res.json()
      const text: string = data.content?.[0]?.text || ""
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("Format invalide")
      const parsed = JSON.parse(jsonMatch[0])
      const result: PromptResult = {
        email_objet: parsed.email_objet || "",
        email_corps: parsed.email_corps || "",
        checklist: Array.isArray(parsed.checklist) ? parsed.checklist : [],
        questions: Array.isArray(parsed.questions) ? parsed.questions : [],
        delai_relance: parsed.delai_relance || "",
      }
      setPromptResult(result)
      setChecklistState(result.checklist.map(() => false))
      setActiveTab("email")
    } catch (e) {
      console.error(e)
      alert("Erreur lors de la génération. Vérifiez votre clé API Anthropic dans .env.local")
    } finally {
      setLoadingGen(false)
    }
  }

  async function copierEmail() {
    if (!promptResult) return
    await navigator.clipboard.writeText(`${promptResult.email_objet}\n\n${promptResult.email_corps}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 md:ml-60 flex flex-col">
          <TopBar title="Fiche fournisseur" />
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 md:ml-60 flex flex-col">
          <TopBar title="Fiche fournisseur" />
          <div className="flex-1 flex items-center justify-center p-6">
            <ErrorMessage message="Fournisseur introuvable" />
          </div>
        </div>
      </div>
    )
  }

  const catBadge = CAT_CONFIG[categorie] || "bg-white/10 border border-white/20 text-white/50"

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title={nom} />

        <main className="flex-1 p-5 md:p-6 pb-20 md:pb-8">

          {/* Breadcrumb */}
          <button onClick={() => router.push("/fournisseurs")}
            className="flex items-center gap-1.5 text-sm mb-5"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
          >
            <ArrowLeft size={14} /> Fournisseurs
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

            {/* ══════════════ COLONNE GAUCHE (3/5) ══════════════ */}
            <div className="lg:col-span-3 space-y-4">

              {/* Section 1 – Informations générales */}
              <Section title="🏢 Informations générales" open={openSections.includes(0)} onToggle={() => toggleSection(0)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nom société">
                    <input className="input-glass" value={nom} onChange={e => setNom(e.target.value)} onBlur={saveFournisseur} />
                  </Field>
                  <div>
                    <Field label="Catégorie">
                      <select className="select-glass w-full" value={categorie} onChange={e => { setCategorie(e.target.value); }}>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        <option value="__custom__">+ Créer une catégorie…</option>
                      </select>
                    </Field>
                    {categorie === "__custom__" && (
                      <input className="input-glass mt-2" placeholder="Nom de la catégorie" value={customCat} onChange={e => setCustomCat(e.target.value)} />
                    )}
                    {categorie && categorie !== "__custom__" && (
                      <span className={`inline-block mt-2 text-[11px] px-2.5 py-0.5 rounded-full font-medium ${catBadge}`}>{categorie}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Site web">
                    <input className="input-glass" placeholder="www.example.fr" value={siteWeb} onChange={e => setSiteWeb(e.target.value)} onBlur={saveFournisseur} />
                  </Field>
                  <Field label="Adresse / Région">
                    <input className="input-glass" placeholder="Commune, département" value={adresse} onChange={e => setAdresse(e.target.value)} onBlur={saveFournisseur} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <Field label="Statut">
                    <select className="select-glass w-full" value={statut} onChange={e => { setStatut(e.target.value as keyof typeof STATUT_CONFIG); saveFournisseur() }}>
                      {(Object.keys(STATUT_CONFIG) as (keyof typeof STATUT_CONFIG)[]).map(s => (
                        <option key={s} value={s}>{STATUT_CONFIG[s].label}</option>
                      ))}
                    </select>
                    <span className={`inline-block mt-2 text-[11px] px-2.5 py-0.5 rounded-full font-medium ${STATUT_CONFIG[statut].badge}`}>
                      {STATUT_CONFIG[statut].label}
                    </span>
                  </Field>
                  <Field label="Note de fiabilité">
                    <Stars note={note} onChange={n => { setNote(n); saveFournisseur() }} />
                  </Field>
                </div>

                <Field label="Commentaire général">
                  <textarea className="textarea-glass" rows={3} value={commentaire} onChange={e => setCommentaire(e.target.value)} onBlur={saveFournisseur} />
                </Field>
              </Section>

              {/* Section 2 – Contacts */}
              <Section title="👤 Contacts" open={openSections.includes(1)} onToggle={() => toggleSection(1)}>
                <div className="flex justify-end mb-1">
                  <button type="button" onClick={addContact}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium"
                    style={{ color: "#a5b4fc" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.1)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <Plus size={13} /> Ajouter contact
                  </button>
                </div>
                <div className="space-y-4">
                  {contacts.map((c, idx) => (
                    <div key={c.id} className="p-4 rounded-xl space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {idx === 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
                              Principal
                            </span>
                          )}
                          <span className="text-xs font-semibold" style={{ color: "#f1f5f9" }}>
                            {c.prenom || c.nom ? `${c.prenom} ${c.nom}`.trim() : "Nouveau contact"}
                          </span>
                        </div>
                        {idx > 0 && (
                          <button type="button" onClick={() => deleteContact(c.id)}
                            className="p-1 rounded" style={{ color: "rgba(255,255,255,0.3)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <X size={13} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <input className="input-glass text-xs py-2" placeholder="Prénom" value={c.prenom} onChange={e => setContact(c.id, "prenom", e.target.value)} />
                        <input className="input-glass text-xs py-2" placeholder="Nom" value={c.nom} onChange={e => setContact(c.id, "nom", e.target.value)} />
                        <input className="input-glass text-xs py-2" placeholder="Fonction" value={c.fonction} onChange={e => setContact(c.id, "fonction", e.target.value)} />
                        <input className="input-glass text-xs py-2" placeholder="Téléphone" value={c.tel} onChange={e => setContact(c.id, "tel", e.target.value)} />
                        <input className="input-glass text-xs py-2 col-span-2" placeholder="Email" value={c.email} onChange={e => setContact(c.id, "email", e.target.value)} />
                      </div>
                      <input className="input-glass text-xs py-2 w-full" placeholder="Notes" value={c.notes} onChange={e => setContact(c.id, "notes", e.target.value)} />
                    </div>
                  ))}
                </div>
              </Section>

              {/* Section 3 – Gamme produits */}
              <Section title="📦 Gamme de produits" open={openSections.includes(2)} onToggle={() => toggleSection(2)}>
                <div className="flex justify-end mb-1">
                  <button type="button" onClick={addProduit}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium"
                    style={{ color: "#a5b4fc" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.1)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <Plus size={13} /> Ajouter un produit
                  </button>
                </div>
                <div className="space-y-4">
                  {produits.map(p => (
                    <div key={p.id} className="p-4 rounded-xl space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="flex items-center justify-between gap-2">
                        <input className="input-glass text-sm font-semibold flex-1" placeholder="Nom du produit" value={p.nom} onChange={e => setProduit(p.id, "nom", e.target.value)} />
                        <button type="button" onClick={() => deleteProduit(p.id)}
                          className="p-1 rounded shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <X size={13} />
                        </button>
                      </div>
                      <textarea className="textarea-glass text-xs py-2 w-full" rows={2} placeholder="Description courte" value={p.description} onChange={e => setProduit(p.id, "description", e.target.value)} />
                      <div className="grid grid-cols-3 gap-2">
                        <Field label="Prix min (€)">
                          <input className="input-glass text-xs py-2" type="number" value={p.prix_min || ""} onChange={e => setProduit(p.id, "prix_min", parseFloat(e.target.value) || 0)} />
                        </Field>
                        <Field label="Prix max (€)">
                          <input className="input-glass text-xs py-2" type="number" value={p.prix_max || ""} onChange={e => setProduit(p.id, "prix_max", parseFloat(e.target.value) || 0)} />
                        </Field>
                        <Field label="Délai livraison">
                          <input className="input-glass text-xs py-2" placeholder="3 semaines" value={p.delai} onChange={e => setProduit(p.id, "delai", e.target.value)} />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Points forts">
                          <textarea className="textarea-glass text-xs py-2" rows={2} value={p.points_forts} onChange={e => setProduit(p.id, "points_forts", e.target.value)} />
                        </Field>
                        <Field label="Points faibles">
                          <textarea className="textarea-glass text-xs py-2" rows={2} value={p.points_faibles} onChange={e => setProduit(p.id, "points_faibles", e.target.value)} />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Section 4 – Conditions commerciales */}
              <Section title="💶 Conditions commerciales" open={openSections.includes(3)} onToggle={() => toggleSection(3)}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="Remise habituelle (%)">
                    <input className="input-glass" type="number" value={remise} onChange={e => setRemise(e.target.value)} onBlur={saveFournisseur} />
                  </Field>
                  <Field label="Délai de paiement">
                    <select className="select-glass w-full" value={delaiPaiement} onChange={e => { setDelaiPaiement(e.target.value); saveFournisseur() }}>
                      {["Comptant", "30j", "45j", "60j"].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Minimum commande (€)">
                    <input className="input-glass" type="number" value={minCommande} onChange={e => setMinCommande(e.target.value)} onBlur={saveFournisseur} />
                  </Field>
                  <Field label="Zone géo couverte">
                    <input className="input-glass" value={zoneGeo} onChange={e => setZoneGeo(e.target.value)} onBlur={saveFournisseur} />
                  </Field>
                </div>
                <Field label="Certifications / agréments">
                  <input className="input-glass" value={certifications} onChange={e => setCertifications(e.target.value)} onBlur={saveFournisseur} />
                </Field>
                <Field label="Observations tarifaires">
                  <textarea className="textarea-glass" rows={2} value={obsTarifaires} onChange={e => setObsTarifaires(e.target.value)} onBlur={saveFournisseur} />
                </Field>
              </Section>
            </div>

            {/* ══════════════ COLONNE DROITE (2/5) ══════════════ */}
            <div className="lg:col-span-2 space-y-4">

              {/* Section 5 – Méthode devis */}
              <Section title="🎯 Méthode de demande de devis" open={openSections.includes(4)} onToggle={() => toggleSection(4)} accent="#6366f1">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Canal préféré">
                    <div className="flex flex-wrap gap-1.5">
                      {["Email", "Téléphone", "Portail web", "PDF"].map(c => (
                        <button key={c} type="button" onClick={() => { setCanal(c); saveFournisseur() }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                            canal === c
                              ? "bg-indigo-500/30 border-indigo-500/50 text-indigo-200"
                              : "border-white/15 text-white/50 hover:border-white/30"
                          }`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Délai réponse habituel">
                    <select className="select-glass w-full" value={delaiReponse} onChange={e => { setDelaiReponse(e.target.value); saveFournisseur() }}>
                      {["24h", "48h", "1 semaine", "2 semaines", "+2 semaines"].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                </div>

                <Field label="Email de contact devis">
                  <input className="input-glass" type="email" value={emailDevis} onChange={e => setEmailDevis(e.target.value)} onBlur={saveFournisseur} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Format de réponse">
                    <div className="flex flex-wrap gap-1.5">
                      {["PDF", "Excel", "Appel", "Autre"].map(f => (
                        <button key={f} type="button" onClick={() => { setFormatReponse(f); saveFournisseur() }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                            formatReponse === f
                              ? "bg-indigo-500/30 border-indigo-500/50 text-indigo-200"
                              : "border-white/15 text-white/50 hover:border-white/30"
                          }`}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Interlocuteur dédié devis">
                    <select className="select-glass w-full" value={interlocDevis} onChange={e => setInterlocDevis(e.target.value)}>
                      <option value="">— Aucun —</option>
                      {contacts.map(c => (
                        <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* Infos obligatoires */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Infos OBLIGATOIRES à fournir</label>
                    <button type="button" onClick={addInfoOblig}
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg"
                      style={{ color: "#a5b4fc" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.1)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <Plus size={12} /> Ajouter
                    </button>
                  </div>
                  <div className="space-y-2">
                    {infosOblig.map(info => (
                      <div key={info.id} className="flex items-center gap-2">
                        <button type="button"
                          onClick={() => setInfoOblig(info.id, "obligatoire", !info.obligatoire)}
                          className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-bold transition-all ${
                            info.obligatoire
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : "bg-white/5 text-white/30 border border-white/10"
                          }`}>
                          {info.obligatoire ? "OBL" : "OPT"}
                        </button>
                        <input className="input-glass text-xs py-1.5 flex-1"
                          placeholder="Libellé de l'information"
                          value={info.libelle}
                          onChange={e => setInfoOblig(info.id, "libelle", e.target.value)} />
                        <select className="select-glass text-xs py-1.5 w-20 shrink-0"
                          value={info.type}
                          onChange={e => setInfoOblig(info.id, "type", e.target.value)}>
                          <option value="texte">texte</option>
                          <option value="nombre">nombre</option>
                          <option value="plan">plan</option>
                          <option value="photo">photo</option>
                        </select>
                        <button type="button" onClick={() => setInfosOblig(p => p.filter(i => i.id !== info.id))}
                          className="p-1 shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <Field label="Informations optionnelles utiles">
                  <textarea className="textarea-glass" rows={2} value={infosOpt} onChange={e => setInfosOpt(e.target.value)} onBlur={saveFournisseur} />
                </Field>
                <Field label="Procédure spéciale">
                  <textarea className="textarea-glass" rows={2} value={procedure} onChange={e => setProcedure(e.target.value)} onBlur={saveFournisseur} />
                </Field>
                <Field label="Template email habituel">
                  <textarea className="textarea-glass font-mono text-xs" rows={10} value={templateEmail} onChange={e => setTemplateEmail(e.target.value)} onBlur={saveFournisseur} />
                </Field>
              </Section>

              {/* Section 6 – Historique */}
              <Section title="📊 Historique des demandes" open={openSections.includes(5)} onToggle={() => toggleSection(5)}>
                <div className="overflow-x-auto">
                  <table className="table-glass w-full text-xs">
                    <thead>
                      <tr>
                        <th className="text-left px-3 py-2">Date</th>
                        <th className="text-left px-3 py-2">Affaire</th>
                        <th className="text-right px-3 py-2">Demandé</th>
                        <th className="text-right px-3 py-2 hidden sm:table-cell">Reçu</th>
                        <th className="text-left px-3 py-2">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historique.map(h => (
                        <tr key={h.id}>
                          <td className="px-3 py-2.5 text-white/50">{new Date(h.date).toLocaleDateString("fr-FR")}</td>
                          <td className="px-3 py-2.5 font-medium" style={{ color: "#f1f5f9" }}>
                            {affaires.find(a => a.id === h.affaire)?.label || h.affaire || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right" style={{ color: "#10b981" }}>{h.montant_demande ? fmt(h.montant_demande) : "—"}</td>
                          <td className="px-3 py-2.5 text-right hidden sm:table-cell" style={{ color: h.montant_recu ? "#10b981" : "rgba(255,255,255,0.25)" }}>
                            {h.montant_recu ? fmt(h.montant_recu) : "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              h.statut === "reçu"       ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300" :
                              h.statut === "en_attente" ? "bg-amber-500/20 border border-amber-500/40 text-amber-300" :
                                                          "bg-red-500/20 border border-red-500/40 text-red-300"
                            }`}>
                              {h.statut === "reçu" ? "Reçu" : h.statut === "en_attente" ? "En attente" : "Refusé"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button"
                  onClick={() => setShowDemandeModal(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}>
                  <Plus size={13} /> Nouvelle demande
                </button>
              </Section>

              {/* Section 7 – Générateur */}
              <Section title="⚡ Générateur de demande de devis" open={openSections.includes(6)} onToggle={() => toggleSection(6)} accent="#10b981">
                <Field label="Affaire concernée">
                  <select className="select-glass w-full" value={selectedAffaire} onChange={e => setSelectedAffaire(e.target.value)}>
                    <option value="">Sélectionner une affaire…</option>
                    {affaires.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                </Field>
                <button
                  type="button"
                  onClick={genererDemande}
                  disabled={!selectedAffaire || loadingGen}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: !selectedAffaire ? "rgba(16,185,129,0.1)" : loadingGen ? "rgba(16,185,129,0.2)" : "linear-gradient(135deg,#10b981,#059669)",
                    color: !selectedAffaire ? "rgba(255,255,255,0.3)" : "#fff",
                    boxShadow: selectedAffaire && !loadingGen ? "0 4px 20px rgba(16,185,129,0.3)" : "none",
                  }}
                >
                  {loadingGen ? <><Loader2 size={16} className="animate-spin" /> Génération…</> : <><Sparkles size={16} /> Générer avec Claude</>}
                </button>
              </Section>
            </div>
          </div>
        </main>
      </div>

      {/* ══ MODALE NOUVELLE DEMANDE ══ */}
      {showDemandeModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowDemandeModal(false)} />
          <div className="modal-box fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm" style={{ color: "#f1f5f9" }}>Nouvelle demande de devis</h2>
              <button onClick={() => setShowDemandeModal(false)} className="p-1.5 rounded-lg"
                style={{ color: "rgba(255,255,255,0.5)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <X size={16} />
              </button>
            </div>
            <Field label="Affaire liée">
              <select className="select-glass w-full" value={demandeAffaire} onChange={e => setDemandeAffaire(e.target.value)}>
                <option value="">Sélectionner une affaire…</option>
                {affaires.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </Field>
            <Field label="Date d'envoi">
              <input className="input-glass" type="date" value={demandeDate} onChange={e => setDemandeDate(e.target.value)} />
            </Field>
            <Field label="Montant demandé (€)">
              <input className="input-glass" type="number" placeholder="ex: 25000" value={demandeMontant} onChange={e => setDemandeMontant(e.target.value)} />
            </Field>
            <button
              type="button"
              onClick={saveNouvelledemande}
              disabled={savingDemande}
              className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }}>
              {savingDemande ? "Enregistrement…" : "Enregistrer la demande"}
            </button>
          </div>
        </>
      )}

      {/* ══ PANEL RÉSULTAT CLAUDE ══ */}
      {promptResult && (
        <>
          <div className="modal-overlay" onClick={() => setPromptResult(null)} />
          <div className="prompt-panel fixed inset-y-0 right-0 w-full max-w-lg z-50 flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <div>
                <h2 className="font-semibold text-[#f1f5f9] text-sm">Demande de devis générée</h2>
                <p className="text-xs text-white/35 mt-0.5">{nom} — {affaires.find(a => a.id === selectedAffaire)?.label}</p>
              </div>
              <button onClick={() => setPromptResult(null)} className="p-1.5 rounded-lg"
                style={{ color: "rgba(255,255,255,0.5)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <X size={17} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {(["email", "checklist", "questions"] as const).map(tab => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                  className="flex-1 py-3 text-xs font-semibold uppercase tracking-widest transition-colors"
                  style={{
                    color: activeTab === tab ? "#a5b4fc" : "rgba(255,255,255,0.35)",
                    borderBottom: activeTab === tab ? "2px solid #6366f1" : "2px solid transparent",
                    background: activeTab === tab ? "rgba(99,102,241,0.08)" : "transparent",
                  }}>
                  {tab === "email" ? "Email" : tab === "checklist" ? "Checklist" : "Questions"}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "email" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#a5b4fc" }}>Objet</p>
                    <p className="text-sm" style={{ color: "#f1f5f9" }}>{promptResult.email_objet}</p>
                  </div>
                  <pre className="prompt-pre text-xs">{promptResult.email_corps}</pre>
                  {promptResult.delai_relance && (
                    <div className="p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#fcd34d" }}>Délai de relance</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>{promptResult.delai_relance}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "checklist" && (
                <div className="space-y-2">
                  <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>Vérifiez ces points avant d&apos;envoyer :</p>
                  {promptResult.checklist.map((item, i) => (
                    <div key={i}
                      onClick={() => setChecklistState(p => p.map((v, j) => j === i ? !v : v))}
                      className="flex items-start gap-3 cursor-pointer p-2.5 rounded-xl transition-all"
                      style={{ background: checklistState[i] ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)" }}>
                      <div className="shrink-0 mt-0.5">
                        {checklistState[i]
                          ? <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: "#10b981" }}><Check size={10} className="text-white" /></div>
                          : <div className="w-4 h-4 rounded border" style={{ borderColor: "rgba(255,255,255,0.2)" }} />
                        }
                      </div>
                      <span className="text-sm" style={{
                        color: checklistState[i] ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.8)",
                        textDecoration: checklistState[i] ? "line-through" : "none"
                      }}>{item}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "questions" && (
                <div className="space-y-2">
                  <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>Questions à poser si des infos manquent :</p>
                  {promptResult.questions.map((q, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl text-sm"
                      style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.75)" }}>
                      <span className="shrink-0 font-bold" style={{ color: "#a5b4fc" }}>{i + 1}.</span>
                      {q}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <button type="button" onClick={copierEmail}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={copied
                  ? { background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff" }
                  : { background: "rgba(255,255,255,0.08)", color: "#f1f5f9" }}>
                {copied ? <><Check size={15} /> Copié !</> : <><Copy size={15} /> Copier l&apos;email</>}
              </button>
              <button type="button"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(16,185,129,0.15)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.3)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(16,185,129,0.25)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(16,185,129,0.15)")}>
                ✅ Marquer comme envoyé
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
