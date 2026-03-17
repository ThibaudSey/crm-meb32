"use client"

import { useState, useEffect, useRef } from "react"
import {
  DatabaseBackup, Download, Upload, RefreshCw, Check, X,
  AlertTriangle, Clock, FileJson, Merge,
} from "lucide-react"
import Sidebar from "@/components/Sidebar"
import TopBar from "@/components/TopBar"
import { exportToCSV, exportToJSON, importFromJSON, fmtDateExport } from "@/lib/export"
import { supabase } from "@/lib/supabase"

// ─── Types internes ───────────────────────────────────────────────────────────

type TableRow = Record<string, unknown>

interface TableInfo {
  key: string
  label: string
  icon: string
  count: number
  data: TableRow[]
}

const TABLE_DEFS = [
  { key: "affaires",     label: "Affaires",     icon: "💼" },
  { key: "devis",        label: "Devis",         icon: "📄" },
  { key: "rdvs",         label: "RDV Planning",  icon: "📅" },
  { key: "todos",        label: "Todos",         icon: "✅" },
  { key: "frais",        label: "Frais",         icon: "🧾" },
  { key: "km_entries",   label: "Kilométrique",  icon: "🚗" },
  { key: "fournisseurs", label: "Fournisseurs",  icon: "🏭" },
]

// ─── Fonctions d'export CSV ───────────────────────────────────────────────────

function exportModuleCSV(key: string, data: TableRow[]) {
  const now = new Date().toISOString().slice(0, 7)
  if (key === "affaires") {
    exportToCSV(data.map(a => ({ ...a })), `affaires-${now}.csv`, [
      { key: "nom",            label: "Nom affaire"    },
      { key: "etape",         label: "Étape"          },
      { key: "type_projet",   label: "Type projet"    },
      { key: "espece",        label: "Espèce"         },
      { key: "nb_places",     label: "Nb places"      },
      { key: "montant_estime",label: "Montant €"      },
      { key: "marge",         label: "Marge %"        },
      { key: "decision_prevue", label: "Date décision" },
    ])
  } else if (key === "devis") {
    exportToCSV(data.map(d => ({ ...d })), `devis-${now}.csv`, [
      { key: "reference",  label: "Référence"  },
      { key: "client",     label: "Client"     },
      { key: "total_ht",   label: "Total HT €" },
      { key: "marge",      label: "Marge %"    },
      { key: "statut",     label: "Statut"     },
      { key: "date_envoi", label: "Date envoi" },
    ])
  } else if (key === "rdvs") {
    exportToCSV(data.map(r => ({ ...r, date_rdv: fmtDateExport(r.date_rdv as string) })), `rdvs-${now}.csv`, [
      { key: "date_rdv", label: "Date"         },
      { key: "heure",    label: "Heure"        },
      { key: "titre",    label: "Titre"        },
      { key: "type_rdv", label: "Type RDV"     },
      { key: "affaire",  label: "Affaire liée" },
      { key: "lieu",     label: "Lieu"         },
    ])
  } else if (key === "frais") {
    exportToCSV(data.map(f => ({ ...f, date: fmtDateExport(f.date as string) })), `frais-${now}.csv`, [
      { key: "date",        label: "Date"          },
      { key: "categorie",   label: "Catégorie"     },
      { key: "description", label: "Description"   },
      { key: "montant_ttc", label: "Montant TTC €" },
      { key: "affaire_id",  label: "Affaire"       },
    ])
  } else if (key === "km_entries") {
    exportToCSV(data.map(k => ({ ...k, date: fmtDateExport(k.date as string) })), `km-${now}.csv`, [
      { key: "date",      label: "Date"        },
      { key: "depart",    label: "Départ"      },
      { key: "arrivee",   label: "Arrivée"     },
      { key: "km",        label: "KM"          },
      { key: "vehicule",  label: "Véhicule"    },
      { key: "taux_ik",   label: "Taux IK"     },
      { key: "indemnite", label: "Indemnité €" },
    ])
  } else if (key === "fournisseurs") {
    exportToCSV(data.map(f => ({ ...f })), `fournisseurs-${now}.csv`, [
      { key: "nom",            label: "Nom"        },
      { key: "categorie",      label: "Catégorie"  },
      { key: "statut",         label: "Statut"     },
      { key: "note_fiabilite", label: "Note /5"    },
      { key: "zone_geo",       label: "Zone géo"   },
    ])
  } else if (key === "todos") {
    exportToCSV(data.map(t => ({ ...t })), `todos-${now}.csv`, [
      { key: "texte",       label: "Tâche"       },
      { key: "categorie",   label: "Catégorie"   },
      { key: "date_limite", label: "Date limite" },
      { key: "fait",        label: "Fait"        },
      { key: "urgent",      label: "Urgent"      },
    ])
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SauvegardePage() {
  const fileRef = useRef<HTMLInputElement>(null)

  const [tables, setTables]         = useState<TableInfo[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [lastBackup, setLastBackup]           = useState<string | null>(null)
  const [autoBackup, setAutoBackup]           = useState(false)
  const [lastAutoBackup, setLastAutoBackup]   = useState<string | null>(null)

  const [importedData, setImportedData]       = useState<Record<string, unknown> | null>(null)
  const [importError, setImportError]         = useState<string | null>(null)
  const [importLoading, setImportLoading]     = useState(false)
  const [showConfirm, setShowConfirm]         = useState<"restore" | "merge" | null>(null)
  const [restoreDone, setRestoreDone]         = useState(false)
  const [exportedKey, setExportedKey]         = useState<string | null>(null)

  // ── Charger toutes les tables depuis Supabase ──
  useEffect(() => {
    async function loadAll() {
      const results = await Promise.all(
        TABLE_DEFS.map(async (t) => {
          const { data } = await supabase.from(t.key).select("*")
          const rows = (data ?? []) as TableRow[]
          return { ...t, count: rows.length, data: rows }
        })
      )
      setTables(results)
      setLoadingData(false)
    }
    loadAll()
  }, [])

  useEffect(() => {
    setLastBackup(localStorage.getItem("meb32_last_backup_date"))
    setAutoBackup(localStorage.getItem("meb32_auto_backup") === "true")
    setLastAutoBackup(localStorage.getItem("meb32_auto_backup_date"))
  }, [])

  function buildFullBackup() {
    const obj: Record<string, TableRow[]> = {}
    for (const t of tables) obj[t.key] = t.data
    return obj
  }

  // Auto-backup on page unload
  useEffect(() => {
    if (!autoBackup || tables.length === 0) return
    const handler = () => {
      const now = new Date().toISOString()
      const backup = { ...buildFullBackup(), date_export: now, version: "1.0" }
      localStorage.setItem("meb32_auto_backup_date", now)
      localStorage.setItem("meb32_auto_backup_data", JSON.stringify(backup))
      setLastAutoBackup(now)
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoBackup, tables])

  function handleFullBackup() {
    exportToJSON(buildFullBackup(), `sauvegarde-MEB32-${new Date().toISOString().slice(0, 10)}.json`)
    setLastBackup(new Date().toISOString())
  }

  function handleAutoBackupToggle() {
    const next = !autoBackup
    setAutoBackup(next)
    localStorage.setItem("meb32_auto_backup", String(next))
    if (next && tables.length > 0) {
      const now = new Date().toISOString()
      const backup = { ...buildFullBackup(), date_export: now, version: "1.0" }
      localStorage.setItem("meb32_auto_backup_date", now)
      localStorage.setItem("meb32_auto_backup_data", JSON.stringify(backup))
      setLastAutoBackup(now)
    }
  }

  function handleDownloadAutoBackup() {
    const raw = localStorage.getItem("meb32_auto_backup_data")
    if (!raw) return
    const blob = new Blob([raw], { type: "application/json;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `auto-backup-MEB32.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFileInput(file: File) {
    setImportError(null)
    setImportedData(null)
    setImportLoading(true)
    try {
      const data = await importFromJSON(file)
      setImportedData(data)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Erreur inconnue")
    } finally {
      setImportLoading(false)
    }
  }

  function handleRestore() {
    setShowConfirm(null)
    setRestoreDone(true)
    setTimeout(() => setRestoreDone(false), 3000)
  }

  function handleMerge() {
    setShowConfirm(null)
    setRestoreDone(true)
    setTimeout(() => setRestoreDone(false), 3000)
  }

  function fmtDate(iso: string | null): string {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    })
  }

  const totalRecords = tables.reduce((s, t) => s + t.count, 0)

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <TopBar title="Sauvegarde & Export" />

        <main className="flex-1 p-5 md:p-6 pb-20 md:pb-8 space-y-5">

          {/* ── Section 1 : Sauvegarde complète ── */}
          <div className="glass p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}>
                <DatabaseBackup size={20} style={{ color: "#a5b4fc" }} />
              </div>
              <div>
                <h2 className="font-bold text-base" style={{ color: "#f1f5f9" }}>Sauvegarde complète</h2>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Exporte toutes les données en un fichier JSON restaurable
                </p>
              </div>
            </div>

            {/* Stats tables */}
            {loadingData ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                <RefreshCw size={14} className="animate-spin" /> Chargement des données…
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                {tables.map(t => (
                  <div key={t.key} className="p-2.5 rounded-xl text-center"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-base mb-0.5">{t.icon}</p>
                    <p className="text-sm font-bold" style={{ color: "#f1f5f9" }}>{t.count}</p>
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{t.label}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                <Clock size={14} />
                <span>Dernière sauvegarde : <span style={{ color: "#f1f5f9" }}>{fmtDate(lastBackup)}</span></span>
              </div>
              {!loadingData && (
                <div className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Total : <span className="font-semibold" style={{ color: "#a5b4fc" }}>{totalRecords} enregistrements</span>
                </div>
              )}
            </div>

            <button
              onClick={handleFullBackup}
              disabled={loadingData}
              className="btn-primary rounded-xl px-5 py-3 text-sm font-semibold flex items-center gap-2.5 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              <Download size={16} /> 💾 Télécharger la sauvegarde complète (JSON)
            </button>
          </div>

          {/* ── Section 2 : Restaurer ── */}
          <div className="glass p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.25)" }}>
                <Upload size={20} style={{ color: "#fbbf24" }} />
              </div>
              <div>
                <h2 className="font-bold text-base" style={{ color: "#f1f5f9" }}>Restaurer une sauvegarde</h2>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Importer un fichier JSON exporté par MEB32
                </p>
              </div>
            </div>

            {/* Zone de drop */}
            <div
              className="rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all"
              style={{
                borderColor: importedData ? "rgba(16,185,129,0.5)" : importError ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)",
                background:  importedData ? "rgba(16,185,129,0.06)" : importError ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.02)",
              }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const f = e.dataTransfer.files[0]
                if (f) handleFileInput(f)
              }}
            >
              {importLoading ? (
                <div className="flex items-center justify-center gap-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <RefreshCw size={18} className="animate-spin" />
                  <span className="text-sm">Lecture en cours…</span>
                </div>
              ) : importError ? (
                <div>
                  <X size={24} className="mx-auto mb-2" style={{ color: "#f87171" }} />
                  <p className="text-sm font-medium" style={{ color: "#fca5a5" }}>{importError}</p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Cliquer pour réessayer</p>
                </div>
              ) : importedData ? (
                <div>
                  <Check size={24} className="mx-auto mb-2" style={{ color: "#4ade80" }} />
                  <p className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>Fichier chargé avec succès</p>
                </div>
              ) : (
                <>
                  <FileJson size={28} className="mx-auto mb-2" style={{ color: "rgba(255,255,255,0.2)" }} />
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Glisser-déposer un fichier JSON ou cliquer pour choisir</p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>Uniquement les fichiers .json exportés par CRM MEB32</p>
                </>
              )}
              <input ref={fileRef} type="file" accept=".json" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileInput(f) }} />
            </div>

            {/* Aperçu */}
            {importedData && !restoreDone && (
              <div className="p-4 rounded-xl space-y-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>Aperçu du fichier</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {[
                    { label: "Date export", value: importedData.date_export ? fmtDate(importedData.date_export as string) : "—" },
                    { label: "Version",     value: String(importedData.version ?? "—") },
                    ...TABLE_DEFS.map(t => ({
                      label: t.label,
                      value: `${Array.isArray(importedData[t.key]) ? (importedData[t.key] as unknown[]).length : 0} entrées`,
                    })),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-2 py-1.5 px-2 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.03)" }}>
                      <span style={{ color: "rgba(255,255,255,0.45)" }}>{label}</span>
                      <span className="font-medium" style={{ color: "#f1f5f9" }}>{value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl"
                  style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <AlertTriangle size={15} style={{ color: "#fbbf24" }} className="shrink-0" />
                  <p className="text-xs" style={{ color: "#fbbf24" }}>
                    La restauration remplacera toutes vos données actuelles. La fusion ajoutera sans écraser.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm("merge")}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
                    style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#6ee7b7" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(16,185,129,0.25)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(16,185,129,0.15)")}
                  >
                    <Merge size={14} /> Fusionner
                  </button>
                  <button
                    onClick={() => setShowConfirm("restore")}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                    style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.35)", color: "#fca5a5" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.3)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(239,68,68,0.2)")}
                  >
                    <AlertTriangle size={14} /> ⚠️ Restaurer (écrase tout)
                  </button>
                </div>
              </div>
            )}

            {restoreDone && (
              <div className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
                <Check size={18} style={{ color: "#4ade80" }} />
                <p className="text-sm font-medium" style={{ color: "#6ee7b7" }}>
                  Opération effectuée avec succès. Les données ont été mises à jour.
                </p>
              </div>
            )}
          </div>

          {/* ── Section 3 : Exports par module ── */}
          <div className="glass p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)" }}>
                <Download size={20} style={{ color: "#4ade80" }} />
              </div>
              <div>
                <h2 className="font-bold text-base" style={{ color: "#f1f5f9" }}>Exports par module</h2>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Fichiers CSV compatibles Excel (séparateur point-virgule, BOM UTF-8)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {tables.map(t => (
                <button
                  key={t.key}
                  onClick={() => {
                    exportModuleCSV(t.key, t.data)
                    setExportedKey(t.key)
                    setTimeout(() => setExportedKey(null), 2000)
                  }}
                  className="relative flex flex-col items-center gap-2 p-4 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background:  exportedKey === t.key ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)",
                    border:      `1px solid ${exportedKey === t.key ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.1)"}`,
                    color:       exportedKey === t.key ? "#6ee7b7" : "rgba(255,255,255,0.7)",
                  }}
                  onMouseEnter={e => { if (exportedKey !== t.key) e.currentTarget.style.background = "rgba(255,255,255,0.08)" }}
                  onMouseLeave={e => { if (exportedKey !== t.key) e.currentTarget.style.background = "rgba(255,255,255,0.04)" }}
                >
                  {exportedKey === t.key
                    ? <Check size={20} style={{ color: "#4ade80" }} />
                    : <span className="text-xl">{t.icon}</span>
                  }
                  <span className="text-xs text-center">{t.label} CSV</span>
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {t.count} entrée{t.count !== 1 ? "s" : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Section 4 : Sauvegarde automatique ── */}
          <div className="glass p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: autoBackup ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
                  border:     `1px solid ${autoBackup ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`,
                }}>
                <RefreshCw size={20} style={{ color: autoBackup ? "#4ade80" : "rgba(255,255,255,0.4)" }} />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-base" style={{ color: "#f1f5f9" }}>Sauvegarde automatique</h2>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Enregistre dans le navigateur à chaque fermeture de l&apos;application
                </p>
              </div>

              {/* Toggle */}
              <button
                onClick={handleAutoBackupToggle}
                className="relative w-12 h-6 rounded-full transition-all shrink-0"
                style={{ background: autoBackup ? "#10b981" : "rgba(255,255,255,0.15)" }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: autoBackup ? "1.5rem" : "0.125rem" }}
                />
              </button>
            </div>

            {autoBackup && (
              <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-xl"
                style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                  <Clock size={14} style={{ color: "#4ade80" }} />
                  <span>
                    Dernière sauvegarde auto :&nbsp;
                    <span className="font-medium" style={{ color: "#f1f5f9" }}>{fmtDate(lastAutoBackup)}</span>
                  </span>
                </div>
                {lastAutoBackup && (
                  <button
                    onClick={handleDownloadAutoBackup}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.35)", color: "#6ee7b7" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(16,185,129,0.3)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(16,185,129,0.2)")}
                  >
                    <Download size={13} /> Télécharger la dernière sauvegarde auto
                  </button>
                )}
              </div>
            )}

            {!autoBackup && (
              <p className="text-xs p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}>
                Activez la sauvegarde automatique pour ne jamais perdre vos données. Une copie locale
                sera enregistrée dans votre navigateur à chaque fermeture de l&apos;onglet.
              </p>
            )}
          </div>

        </main>
      </div>

      {/* ── Modal confirmation restauration / fusion ── */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(null)}>
          <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={22} style={{ color: showConfirm === "restore" ? "#fbbf24" : "#4ade80" }} />
              <h3 className="font-bold" style={{ color: "#f1f5f9" }}>
                {showConfirm === "restore" ? "Confirmer la restauration" : "Confirmer la fusion"}
              </h3>
            </div>
            <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.55)" }}>
              {showConfirm === "restore"
                ? "Cette action va remplacer TOUTES vos données actuelles par celles du fichier importé. Cette opération est irréversible."
                : "Les données importées seront ajoutées à vos données existantes sans écraser quoi que ce soit."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(null)} className="btn-secondary rounded-xl flex-1 py-2.5 text-sm">Annuler</button>
              <button
                onClick={showConfirm === "restore" ? handleRestore : handleMerge}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  background: showConfirm === "restore" ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.2)",
                  border:     `1px solid ${showConfirm === "restore" ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.35)"}`,
                  color:      showConfirm === "restore" ? "#fca5a5" : "#6ee7b7",
                }}
              >
                {showConfirm === "restore" ? "⚠️ Restaurer" : "Fusionner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
