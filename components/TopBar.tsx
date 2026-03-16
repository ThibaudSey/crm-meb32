"use client"

import { useState } from "react"
import { Bell, Search, ChevronDown, Settings, User, LogOut } from "lucide-react"

export default function TopBar({ title }: { title: string }) {
  const [avatarOpen, setAvatarOpen] = useState(false)

  return (
    <header
      className="sticky top-0 z-20 px-5 py-3 flex items-center gap-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Titre */}
      <h1 className="text-xl font-bold tracking-tight" style={{ color: "#f1f5f9" }}>{title}</h1>

      <div className="flex-1" />

      {/* Recherche */}
      <div
        className="hidden sm:flex items-center gap-2 rounded-xl px-3 py-2 text-sm min-w-[200px] cursor-text transition-all"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.35)",
        }}
      >
        <Search size={14} className="shrink-0" />
        <span>Rechercher…</span>
      </div>

      {/* Cloche */}
      <button
        className="relative p-2 rounded-xl transition-colors"
        style={{ color: "rgba(255,255,255,0.6)" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <Bell size={18} />
        <span
          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2"
          style={{ background: "#ef4444" }}
        />
      </button>

      {/* Avatar + dropdown */}
      <div className="relative">
        <button
          onClick={() => setAvatarOpen(!avatarOpen)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors"
          style={{ color: "rgba(255,255,255,0.8)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            TS
          </div>
          <span className="hidden sm:block text-sm font-medium">Thibaud</span>
          <ChevronDown
            size={14}
            style={{ color: "rgba(255,255,255,0.4)", transform: avatarOpen ? "rotate(180deg)" : "", transition: "transform 0.2s" }}
          />
        </button>

        {avatarOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setAvatarOpen(false)} />
            <div
              className="absolute right-0 mt-2 w-52 rounded-2xl py-1.5 z-20 overflow-hidden"
              style={{
                background: "rgba(15,23,42,0.92)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              }}
            >
              <div className="px-4 py-3 mb-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-sm font-semibold text-white">Thibaud</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Commercial terrain</p>
              </div>
              {[
                { icon: User,     label: "Mon profil"   },
                { icon: Settings, label: "Paramètres"   },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <Icon size={15} style={{ color: "rgba(255,255,255,0.4)" }} />
                  {label}
                </button>
              ))}
              <div className="mx-3 my-1" style={{ height: "1px", background: "rgba(255,255,255,0.08)" }} />
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors"
                style={{ color: "#fca5a5" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <LogOut size={15} />
                Déconnexion
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
