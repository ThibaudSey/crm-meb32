// ─── Utilitaire d'export/import pour CRM MEB32 ─────────────────────────────

/**
 * Export CSV avec BOM UTF-8 (compatible Excel français)
 * Séparateur point-virgule, valeurs avec guillemets si nécessaire
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  headers: { key: string; label: string }[]
) {
  const BOM = "\uFEFF"
  const sep = ";"

  const headerRow = headers.map(h => h.label).join(sep)

  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h.key] ?? ""
      const str = String(val).replace(/"/g, '""')
      const needsQuote = str.includes(sep) || str.includes("\n") || str.includes('"')
      return needsQuote ? `"${str}"` : str
    }).join(sep)
  )

  const csv = BOM + [headerRow, ...rows].join("\r\n")
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename)
}

/**
 * Export JSON complet (sauvegarde)
 * Ajoute automatiquement date_export et version
 */
export function exportToJSON(data: object, filename: string) {
  const payload = {
    date_export: new Date().toISOString(),
    version: "1.0",
    ...data,
  }
  const json = JSON.stringify(payload, null, 2)
  triggerDownload(new Blob([json], { type: "application/json;charset=utf-8;" }), filename)

  // Mémorise la date de la dernière sauvegarde
  if (typeof window !== "undefined") {
    localStorage.setItem("meb32_last_backup_date", new Date().toISOString())
  }
}

/**
 * Import JSON (restauration)
 * Lit le fichier, valide la structure, retourne les données
 */
export function importFromJSON(file: File): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith(".json")) {
      reject(new Error("Le fichier doit être au format .json"))
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const text = e.target?.result as string
        const data = JSON.parse(text)
        if (!data || typeof data !== "object") {
          reject(new Error("Fichier JSON invalide"))
          return
        }
        resolve(data as Record<string, unknown>)
      } catch {
        reject(new Error("Erreur de parsing — fichier JSON corrompu"))
      }
    }
    reader.onerror = () => reject(new Error("Erreur de lecture du fichier"))
    reader.readAsText(file, "utf-8")
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Formate une date ISO en JJ/MM/AAAA pour les exports
 */
export function fmtDateExport(date: string | null | undefined): string {
  if (!date) return ""
  try {
    return date.split("-").reverse().join("/")
  } catch {
    return date
  }
}
