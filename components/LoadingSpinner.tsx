"use client"

export default function LoadingSpinner({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div
        className="w-10 h-10 rounded-full border-2 animate-spin"
        style={{
          borderColor: "rgba(99,102,241,0.2)",
          borderTopColor: "#6366f1",
        }}
      />
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
    </div>
  )
}
