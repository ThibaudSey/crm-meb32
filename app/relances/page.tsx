"use client"

import { useState, useEffect, useCallback } from "react"
import { AlertTriangle, Phone, Mail, X, Copy, Check } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"
import LoadingSpinner from "@/components/LoadingSpinner"
import ErrorMessage from "@/components/ErrorMessage"
import { supabase } from "@/lib/supabase"
import type { Devis } from "@/lib/types"

// ─── Types ────────────────────────────────────────────────────────────────────

type Priorite = "Urgent" | "Moyen" | "Attention" | "Faible"

interface RelanceItem {
  id: string
  structure: string
  contexte: string
  joursDepuis: number
  devisRef: string
  concurrent: string | null
  priorite: Priorite
  aRelancerLe: string
}

interface PromptPanel { titre: string; contenu: string }

// ─── Config styles ────────────────────────────────────────────────────────────

const PRIORITE_CONFIG: Record<Priorite, { badge: string; row: string; dotColor: string; label: string }> = {
  Urgent:    { badge: "bg-red-500/20 border border-red-500/40 text-red-300",       row: "bg-red-500/5",    dotColor: "#ef4444", label: "Urgent"    },
  Moyen:     { badge: "bg-orange-500/20 border border-orange-500/40 text-orange-300", row: "bg-orange-500/5", dotColor: "#f97316", label: "Moyen"     },
  Attention: { badge: "bg-amber-500/20 border border-amber-500/40 text-amber-300",  row: "bg-amber-500/5",  dotColor: "#f59e0b", label: "Attention" },
  Faible:    { badge: "bg-white/10 border border-white/15 text-white/50",           row: "",                dotColor: "rgba(255,255,255,0.3)", label: "Faible"    },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR")
}

function isDepasse(d: string) {
  const cible = new Date(d); cible.setHours(0, 0, 0, 0)
  const today = new Date();  today.setHours(0, 0, 0, 0)
  return cible < today
}

function joursDepuisDate(dateStr: string): number {
  const date  = new Date(dateStr); date.setHours(0, 0, 0, 0)
  const today = new Date();        today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

function computePriorite(jours: number): Priorite {
  if (jours >= 14) return "Urgent"
  if (jours >= 10) return "Moyen"
  if (jours >= 7)  return "Attention"
  return "Faible"
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

function devisToRelance(d: Devis): RelanceItem {
  const jours = joursDepuisDate(d.date_envoi!)
  // d.client et d.concurrent n'existent pas dans le schéma — on utilise reference et notes
  const dAny = d as unknown as Record<string, string | null>
  const structure = dAny.client ?? dAny.affaire_nom ?? d.reference ?? "—"
  return {
    id:          d.id,
    structure,
    contexte:    `Devis ${d.reference} envoyé il y a ${jours} jours sans retour`,
    joursDepuis: jours,
    devisRef:    d.reference,
    concurrent:  dAny.concurrent ?? null,
    priorite:    computePriorite(jours),
    aRelancerLe: addDays(d.date_envoi!, 7),
  }
}

// ─── Constructeurs de prompts ─────────────────────────────────────────────────

function buildScriptPrompt(r: RelanceItem): string {
  return `Tu es un commercial expert en relance téléphonique, spécialisé en équipement avicole.

Client à relancer : ${r.structure}
Contexte : ${r.contexte}
Concurrent identifié : ${r.concurrent ?? "inconnu"}
Devis en attente : ${r.devisRef}

Génère un script de relance téléphonique complet :
1. Accroche d'ouverture (référencer le dernier contact, créer un pont naturel)
2. Vérification de la situation actuelle du client (questions ouvertes)
3. Relance sur la décision — sans pression mais avec urgence créée
4. Traitement de l'objection la plus probable
5. Proposition de prochaine étape concrète (RDV, visite, appel de signature)
6. Closing et confirmation de l'engagement

Ton : chaleureux, professionnel, adapté à la culture agricole. Durée cible : 4-5 minutes.`
}

function buildEmailPrompt(r: RelanceItem): string {
  return `Tu es un commercial expert en relance email, spécialisé en équipement avicole.

Client : ${r.structure}
Contexte : ${r.contexte}
J+${r.joursDepuis} depuis l'envoi du devis
Devis concerné : ${r.devisRef}
Concurrent : ${r.concurrent ?? "inconnu"}

Génère un email de relance J+${r.joursDepuis} :
1. Objet percutant (< 50 caractères, taux d'ouverture prioritaire)
2. Accroche personnalisée (référence au devis, actualité sectorielle avicole si possible)
3. Valeur ajoutée rappelée en 2-3 lignes max
4. Appel à l'action unique et clair
5. Corps : maximum 100 mots
6. Signature professionnelle

Format : objet + corps complet + signature, prêt à envoyer.`
}

// ─── Prompts générateurs ──────────────────────────────────────────────────────

const GENERATEURS = [
  {
    label: "Séquence complète post-devis (J+2 à J+45)",
    icon: "📅",
    cardStyle: { background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" },
    textColor: "#a5b4fc",
    contenu: `Tu es un expert en stratégie commerciale pour l'équipement avicole.

Génère une séquence complète de relances post-envoi de devis, de J+2 à J+45.

Pour chaque étape, fournis :
- Le timing exact (J+X)
- Le canal recommandé (téléphone / email / SMS / visite)
- L'objectif de l'étape
- Un exemple de message ou script (2-3 phrases clés)
- Le déclencheur pour passer à l'étape suivante

La séquence doit inclure :
✓ J+2 : Premier suivi de bonne réception (email court)
✓ J+5 : Appel de qualification (questions ouvertes)
✓ J+7 : Si pas de retour — relance valeur ajoutée
✓ J+10 : Email de preuve sociale (témoignage client similaire)
✓ J+14 : Appel urgence / date limite offre
✓ J+21 : Email alternatif (réduction périmètre ?)
✓ J+30 : Appel de rupture douce
✓ J+45 : Email de rupture définitif (breakup email)

Adapte chaque message à la culture agricole et au profil d'un éleveur avicole indépendant.`,
  },
  {
    label: "Email de rupture J+45",
    icon: "💔",
    cardStyle: { background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)" },
    textColor: "#fca5a5",
    contenu: `Tu es un expert en copywriting commercial B2B agricole.

Génère un "email de rupture" (breakup email) à envoyer à J+45 sans retour d'un client sur un devis avicole.

L'objectif de cet email est contre-intuitif : provoquer une réponse en annonçant qu'on ferme le dossier.

L'email doit :
1. Avoir un objet qui provoque l'ouverture (ex: "Je ferme votre dossier ce vendredi")
2. Être bref (70 mots maximum)
3. Annoncer clairement qu'on arrête de relancer
4. Laisser une porte ouverte sans ramper (formule de sortie élégante)
5. Créer une légère urgence de décision (prix ou stock)
6. Ne pas être agressif ni désespéré — garder la dignité commerciale

Format : objet + corps + signature. Ton : professionnel, légèrement détaché, confiant.`,
  },
  {
    label: "Relancer un intégrateur volaille",
    icon: "🏭",
    cardStyle: { background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" },
    textColor: "#c4b5fd",
    contenu: `Tu es un commercial expert en vente B2B dans la filière avicole intégrée.

Je dois relancer un intégrateur volaille (type LDC, Terrena, Duc, Avril...) avec qui on a eu des contacts mais pas de suite concrète.

Contexte : les intégrateurs ont des enjeux spécifiques (normalisation des bâtiments de leurs éleveurs adhérents, coût total d'élevage, conformité bien-être animal, ROI pour leurs éleveurs).

Génère :
1. Un email de relance adapté à une direction technique d'intégrateur (ton corporate, données chiffrées)
2. Un script téléphonique pour contacter le responsable développement élevage
3. Les 3 arguments différenciants à mettre en avant face aux achats d'un intégrateur (vs fournisseur en place)
4. La proposition de valeur pour le programme "solutions clés en main" pour leurs éleveurs
5. Une suggestion de format de collaboration (convention cadre, appel d'offres, test pilote sur 3 élevages)`,
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RelancesPage() {
  const [relances, setRelances]       = useState<RelanceItem[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [promptPanel, setPromptPanel] = useState<PromptPanel | null>(null)
  const [copied, setCopied]           = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('devis')
        .select('*')
        .order('date_envoi', { ascending: true })

      if (fetchError) {
        console.error("[relances] table 'devis':", fetchError)
        // Table absente ou erreur réseau → liste vide, pas d'écran rouge
        setRelances([])
        return
      }

      const devisList: Devis[] = data ?? []
      const items = devisList
        .filter(d => d.statut === 'envoye' && d.date_envoi != null && joursDepuisDate(d.date_envoi) >= 7)
        .map(devisToRelance)
      setRelances(items)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("[relances] fetchData exception:", msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const enRetard = relances.filter((r) => isDepasse(r.aRelancerLe))

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

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title="Relances" />

        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 space-y-5">

          {loading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} />}

          {!loading && !error && (
            <>
              {/* ── Alerte en retard ── */}
              {enRetard.length > 0 && (
                <div className="alert-red">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <span className="font-semibold">
                      {enRetard.length} relance{enRetard.length > 1 ? "s" : ""} en retard :
                    </span>{" "}
                    {enRetard.map((r, i) => (
                      <span key={r.id}>
                        <span className="font-semibold">{r.structure}</span>
                        {" "}(prévu le {fmtDate(r.aRelancerLe)})
                        {i < enRetard.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Compteur ── */}
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm text-white/50">
                  {relances.length} relances à gérer ·{" "}
                  <span className="font-semibold" style={{ color: "#ef4444" }}>{enRetard.length} en retard</span>
                </p>
                <div className="flex gap-2 ml-auto flex-wrap">
                  {(["Urgent", "Moyen", "Attention", "Faible"] as Priorite[]).map((p) => {
                    const count = relances.filter((r) => r.priorite === p).length
                    if (!count) return null
                    return (
                      <span key={p} className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${PRIORITE_CONFIG[p].badge}`}>
                        {PRIORITE_CONFIG[p].label} · {count}
                      </span>
                    )
                  })}
                </div>
              </div>

              {relances.length === 0 && (
                <div className="glass p-10 text-center">
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Aucun devis en attente de relance (7 jours sans retour).
                  </p>
                </div>
              )}

              {/* ── Vue mobile : Cards relances ── */}
              {relances.length > 0 && (
                <div className="md:hidden space-y-3">
                  {relances.map((r) => {
                    const cfg = PRIORITE_CONFIG[r.priorite]
                    const retard = isDepasse(r.aRelancerLe)
                    return (
                      <div
                        key={r.id}
                        className="glass p-4 rounded-2xl"
                        style={{ borderLeft: `4px solid ${cfg.dotColor}` }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="font-bold text-sm" style={{ color: "#f1f5f9" }}>{r.structure}</p>
                            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>J+{r.joursDepuis} · {r.devisRef}</p>
                          </div>
                          <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs mb-2 line-clamp-2" style={{ color: "rgba(255,255,255,0.5)" }}>{r.contexte}</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold" style={retard ? { color: "#ef4444" } : { color: "rgba(255,255,255,0.6)" }}>
                            {retard && <AlertTriangle size={10} className="inline mr-0.5 mb-0.5" />}
                            {fmtDate(r.aRelancerLe)}{retard && " · En retard"}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => ouvrirPrompt(`Script — ${r.structure}`, buildScriptPrompt(r))}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium bg-indigo-500/20 border border-indigo-500/30 text-indigo-300"
                            >
                              <Phone size={12} /> Script
                            </button>
                            <button
                              onClick={() => ouvrirPrompt(`Email J+${r.joursDepuis} — ${r.structure}`, buildEmailPrompt(r))}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
                            >
                              <Mail size={12} /> Email
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── Vue desktop : Tableau relances ── */}
              {relances.length > 0 && (
                <div className="hidden md:block glass overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="table-glass w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left px-5 py-3">Structure</th>
                          <th className="text-left px-4 py-3 hidden md:table-cell">Contexte</th>
                          <th className="text-left px-4 py-3 hidden lg:table-cell">Devis</th>
                          <th className="text-left px-4 py-3">À relancer le</th>
                          <th className="text-left px-4 py-3">Priorité</th>
                          <th className="text-right px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relances.map((r) => {
                          const cfg    = PRIORITE_CONFIG[r.priorite]
                          const retard = isDepasse(r.aRelancerLe)
                          return (
                            <tr key={r.id} className={`transition-colors hover:opacity-90 ${cfg.row}`}>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ background: cfg.dotColor }}
                                  />
                                  <div>
                                    <p className="font-semibold text-[#f1f5f9]">{r.structure}</p>
                                    <p className="text-xs text-white/50">J+{r.joursDepuis}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 hidden md:table-cell text-xs text-white/50 max-w-[220px]">
                                <span className="line-clamp-2">{r.contexte}</span>
                                {r.concurrent && (
                                  <span className="text-white/35 block mt-0.5">Concurrent : {r.concurrent}</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-white/50">
                                {r.devisRef}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`text-xs font-semibold ${retard ? "" : "text-white/70"}`}
                                  style={retard ? { color: "#ef4444" } : undefined}
                                >
                                  {retard && <AlertTriangle size={10} className="inline mr-0.5 mb-0.5" />}
                                  {fmtDate(r.aRelancerLe)}
                                  {retard && (
                                    <span className="block text-[10px] font-normal" style={{ color: "#ef4444", opacity: 0.7 }}>
                                      En retard
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${cfg.badge}`}>
                                  {cfg.label}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-1.5 justify-end">
                                  <button
                                    onClick={() => ouvrirPrompt(`Script téléphonique — ${r.structure}`, buildScriptPrompt(r))}
                                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30"
                                  >
                                    <Phone size={12} /> Script
                                  </button>
                                  <button
                                    onClick={() => ouvrirPrompt(`Email relance J+${r.joursDepuis} — ${r.structure}`, buildEmailPrompt(r))}
                                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30"
                                  >
                                    <Mail size={12} /> Email
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Générateur de relances ── */}
          <div className="glass p-5">
            <div className="mb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "1rem" }}>
              <h2 className="font-semibold" style={{ color: "#f1f5f9" }}>Générateur de relances avicole</h2>
              <p className="text-xs text-white/35 mt-0.5">Prompts prêts à copier dans Claude.ai</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {GENERATEURS.map((g) => (
                <button
                  key={g.label}
                  onClick={() => ouvrirPrompt(g.label, g.contenu)}
                  className="flex items-start gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all text-left"
                  style={g.cardStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <span className="text-xl shrink-0 leading-none mt-0.5">{g.icon}</span>
                  <span className="leading-snug" style={{ color: g.textColor }}>{g.label}</span>
                </button>
              ))}
            </div>
          </div>

        </main>
      </div>

      {/* ══ PANEL PROMPT ══ */}
      {promptPanel && (
        <>
          <div className="modal-overlay" onClick={() => setPromptPanel(null)} />
          <div className="prompt-panel fixed inset-y-0 right-0 w-full max-w-lg z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <div>
                <h2 className="font-semibold text-[#f1f5f9] text-sm">{promptPanel.titre}</h2>
                <p className="text-xs text-white/35 mt-0.5">Copiez ce prompt → collez dans Claude.ai</p>
              </div>
              <button
                onClick={() => setPromptPanel(null)}
                className="p-1.5 rounded-lg ml-4 transition-colors"
                style={{ color: "rgba(255,255,255,0.5)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <X size={17} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="prompt-pre">
                {promptPanel.contenu}
              </pre>
            </div>
            <div className="px-6 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <button
                onClick={copierPrompt}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
                style={
                  copied
                    ? { background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff" }
                    : { background: "rgba(255,255,255,0.08)", color: "#f1f5f9" }
                }
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copié !" : "Copier le prompt"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
