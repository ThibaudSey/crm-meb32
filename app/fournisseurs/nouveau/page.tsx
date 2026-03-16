"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"
import { supabase } from "@/lib/supabase"

const CATEGORIES = [
  "Ventilation / Climatisation", "Chauffage / Éclairage", "Abreuvement / Alimentation",
  "Télégestion / Capteurs", "Structure / Bâtiment", "Pesage", "Autre",
]

const CANAUX = ["Email", "Téléphone", "Portail web", "PDF"]

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

function Stars({ note, onChange }: { note: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" onClick={() => onChange(i)}
          className="text-2xl transition-colors cursor-pointer hover:scale-110"
          style={{ color: i <= note ? "#f59e0b" : "rgba(255,255,255,0.15)" }}>
          ★
        </button>
      ))}
    </div>
  )
}

export default function NouveauFournisseurPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    nom: "", categorie: "Abreuvement / Alimentation",
    site_web: "", adresse: "", statut: "actif",
    note: 3, commentaire: "",
    contact_prenom: "", contact_nom: "", contact_fonction: "",
    contact_tel: "", contact_email: "",
    canal_devis: "Email", email_devis: "",
    delai_reponse: "48h", procedure: "",
  })

  function setF(k: string, v: string | number) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom) return

    const { data: four } = await supabase
      .from("fournisseurs")
      .insert({
        nom: form.nom,
        categorie: form.categorie,
        site_web: form.site_web || null,
        adresse: form.adresse || null,
        statut: form.statut,
        note_fiabilite: form.note,
        commentaire: form.commentaire || null,
        canal_devis_prefere: form.canal_devis,
        email_devis: form.email_devis || null,
        delai_reponse_habituel: form.delai_reponse || null,
        procedure_speciale: form.procedure || null,
        infos_obligatoires: [],
      })
      .select("id")
      .single()

    if (four?.id && (form.contact_nom || form.contact_prenom)) {
      await supabase.from("fournisseurs_contacts").insert({
        fournisseur_id: four.id,
        prenom: form.contact_prenom || null,
        nom: form.contact_nom || null,
        fonction: form.contact_fonction || null,
        telephone: form.contact_tel || null,
        email: form.contact_email || null,
        est_principal: true,
      })
    }

    router.push(four?.id ? `/fournisseurs/${four.id}` : "/fournisseurs")
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title="Nouveau fournisseur" />

        <main className="flex-1 p-5 md:p-6 pb-20 md:pb-8">
          <button onClick={() => router.push("/fournisseurs")}
            className="flex items-center gap-1.5 text-sm mb-5"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}>
            <ArrowLeft size={14} /> Fournisseurs
          </button>

          <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">

            {/* Identité */}
            <div className="glass p-5 space-y-4">
              <h2 className="font-semibold text-sm" style={{ color: "#f1f5f9" }}>🏢 Identité du fournisseur</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nom de la société" required>
                  <input className="input-glass" placeholder="Big Dutchman France…" required
                    value={form.nom} onChange={e => setF("nom", e.target.value)} />
                </Field>
                <Field label="Catégorie">
                  <select className="select-glass w-full" value={form.categorie} onChange={e => setF("categorie", e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Site web">
                  <input className="input-glass" placeholder="www.example.fr"
                    value={form.site_web} onChange={e => setF("site_web", e.target.value)} />
                </Field>
                <Field label="Adresse / Région">
                  <input className="input-glass" placeholder="Ville, département"
                    value={form.adresse} onChange={e => setF("adresse", e.target.value)} />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <Field label="Statut initial">
                  <div className="flex gap-2">
                    {[{ v: "actif", label: "Actif" }, { v: "en_test", label: "En test" }, { v: "inactif", label: "Inactif" }].map(s => (
                      <button key={s.v} type="button" onClick={() => setF("statut", s.v)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          form.statut === s.v
                            ? s.v === "actif" ? "bg-emerald-500/30 border-emerald-500/50 text-emerald-200"
                              : s.v === "en_test" ? "bg-amber-500/30 border-amber-500/50 text-amber-200"
                              : "bg-white/10 border-white/25 text-white/60"
                            : "border-white/15 text-white/50 hover:border-white/30"
                        }`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Note de fiabilité initiale">
                  <Stars note={form.note} onChange={n => setF("note", n)} />
                </Field>
              </div>

              <Field label="Commentaire général">
                <textarea className="textarea-glass" rows={3} placeholder="Première impression, contexte de la relation…"
                  value={form.commentaire} onChange={e => setF("commentaire", e.target.value)} />
              </Field>
            </div>

            {/* Contact principal */}
            <div className="glass p-5 space-y-4">
              <h2 className="font-semibold text-sm" style={{ color: "#f1f5f9" }}>👤 Contact principal</h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Prénom">
                  <input className="input-glass" placeholder="Pierre" value={form.contact_prenom} onChange={e => setF("contact_prenom", e.target.value)} />
                </Field>
                <Field label="Nom">
                  <input className="input-glass" placeholder="Leclerc" value={form.contact_nom} onChange={e => setF("contact_nom", e.target.value)} />
                </Field>
                <Field label="Fonction">
                  <input className="input-glass" placeholder="Commercial" value={form.contact_fonction} onChange={e => setF("contact_fonction", e.target.value)} />
                </Field>
                <Field label="Téléphone">
                  <input className="input-glass" placeholder="06 …" value={form.contact_tel} onChange={e => setF("contact_tel", e.target.value)} />
                </Field>
                <Field label="Email" >
                  <input className="input-glass" type="email" placeholder="contact@…" value={form.contact_email} onChange={e => setF("contact_email", e.target.value)} />
                </Field>
              </div>
            </div>

            {/* Méthode devis */}
            <div className="glass p-5 space-y-4">
              <h2 className="font-semibold text-sm" style={{ color: "#f1f5f9" }}>🎯 Méthode de demande de devis</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Canal préféré">
                  <div className="flex flex-wrap gap-1.5">
                    {CANAUX.map(c => (
                      <button key={c} type="button" onClick={() => setF("canal_devis", c)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          form.canal_devis === c
                            ? "bg-indigo-500/30 border-indigo-500/50 text-indigo-200"
                            : "border-white/15 text-white/50 hover:border-white/30"
                        }`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Délai de réponse habituel">
                  <select className="select-glass w-full" value={form.delai_reponse} onChange={e => setF("delai_reponse", e.target.value)}>
                    {["24h", "48h", "1 semaine", "2 semaines", "+2 semaines"].map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Email de contact devis">
                <input className="input-glass" type="email" placeholder="devis@fournisseur.fr"
                  value={form.email_devis} onChange={e => setF("email_devis", e.target.value)} />
              </Field>

              <Field label="Procédure spéciale (optionnel)">
                <textarea className="textarea-glass" rows={2}
                  placeholder="Ex: appeler avant d'envoyer un devis, portail client à utiliser…"
                  value={form.procedure} onChange={e => setF("procedure", e.target.value)} />
              </Field>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button type="button" onClick={() => router.push("/fournisseurs")} className="btn-secondary rounded-xl flex-1 py-3 text-sm font-medium">
                Annuler
              </button>
              <button type="submit" className="btn-primary rounded-xl flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2">
                <Save size={15} /> Créer le fournisseur
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}
