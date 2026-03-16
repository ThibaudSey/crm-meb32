"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"

export default function ErrorMessage({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div
      className="glass rounded-2xl p-6 flex flex-col items-center gap-4 max-w-md mx-auto"
      style={{ border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)" }}
    >
      <AlertTriangle size={32} style={{ color: "#ef4444" }} />
      <div className="text-center">
        <p className="font-semibold text-sm mb-1" style={{ color: "#fca5a5" }}>Une erreur s&apos;est produite</p>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
        >
          <RefreshCw size={14} /> Réessayer
        </button>
      )}
    </div>
  )
}
