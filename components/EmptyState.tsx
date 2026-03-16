"use client"

import { Plus } from "lucide-react"

export default function EmptyState({
  title = "Aucune donnée",
  subtitle,
  actionLabel,
  onAction,
  icon = "📭",
}: {
  title?: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
  icon?: string
}) {
  return (
    <div className="glass rounded-2xl py-16 flex flex-col items-center gap-4">
      <div className="text-5xl">{icon}</div>
      <div className="text-center">
        <p className="font-semibold text-sm" style={{ color: "#f1f5f9" }}>{title}</p>
        {subtitle && (
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{subtitle}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-primary rounded-xl flex items-center gap-2 text-sm font-semibold px-4 py-2.5 mt-2"
        >
          <Plus size={16} /> {actionLabel}
        </button>
      )}
    </div>
  )
}
