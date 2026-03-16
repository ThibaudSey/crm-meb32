"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, GitMerge, Briefcase, FileText,
  CalendarDays, Users, Bell, LogOut, ClipboardList, Factory, Receipt,
  DatabaseBackup, MoreHorizontal, X,
} from "lucide-react"

// ── Items navigation ─────────────────────────────────────────────────────────

const MAIN_NAV = [
  { label: "Dashboard",  href: "/",         icon: LayoutDashboard },
  { label: "Pipeline",   href: "/pipeline", icon: GitMerge        },
  { label: "Affaires",   href: "/affaires", icon: Briefcase       },
  { label: "Planning",   href: "/planning", icon: CalendarDays    },
]

const EXTRA_NAV = [
  { label: "Découverte R1",  href: "/decouverte",   icon: ClipboardList  },
  { label: "Devis",          href: "/devis",        icon: FileText       },
  { label: "Prospects",      href: "/prospects",    icon: Users          },
  { label: "Fournisseurs",   href: "/fournisseurs", icon: Factory        },
  { label: "Frais",          href: "/frais",        icon: Receipt        },
  { label: "Sauvegarde",     href: "/sauvegarde",   icon: DatabaseBackup },
  { label: "Relances",       href: "/relances",     icon: Bell           },
]

const ALL_NAV = [...MAIN_NAV, ...EXTRA_NAV]

// ─────────────────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname     = usePathname()
  const [drawer, setDrawer] = useState(false)

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  return (
    <>
      {/* ── Sidebar desktop ── */}
      <aside
        className="hidden md:flex flex-col w-60 min-h-screen fixed left-0 top-0 z-30"
        style={{
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 15px rgba(99,102,241,0.35)" }}
          >
            🐔
          </div>
          <div className="leading-tight">
            <p className="text-white font-bold text-base tracking-tight">CRM</p>
            <p className="font-extrabold text-base tracking-tight -mt-0.5" style={{ color: "#a5b4fc" }}>MEB32</p>
          </div>
        </div>

        <div className="mx-4 mb-3" style={{ height: "1px", background: "rgba(255,255,255,0.07)" }} />

        <nav className="flex-1 px-3 py-1 space-y-0.5">
          {ALL_NAV.map(({ label, href, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href} className={active ? "nav-link nav-link-active" : "nav-link"}>
                <Icon size={17} className="shrink-0" style={{ color: active ? "#a5b4fc" : "rgba(255,255,255,0.35)" }} />
                {label}
                {label === "Relances" && (
                  <span className="ml-auto w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: "#ef4444" }}>
                    3
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="mx-4 mt-3 mb-2" style={{ height: "1px", background: "rgba(255,255,255,0.07)" }} />

        <div className="px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            TS
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">Thibaud</p>
            <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>Commercial</p>
          </div>
          <button style={{ color: "rgba(255,255,255,0.3)" }} className="hover:text-white transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* ── Bottom nav mobile ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bottom-nav-safe"
        style={{
          background: "rgba(15,23,42,0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          height: "64px",
        }}
      >
        <div className="flex items-center justify-around h-full px-2">
          {MAIN_NAV.map(({ label, href, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5 py-1 px-3 relative"
                style={{ color: active ? "#6366f1" : "rgba(255,255,255,0.4)" }}
              >
                <Icon size={22} />
                <span className="text-[10px] font-medium">{label}</span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: "#6366f1" }} />
                )}
              </Link>
            )
          })}

          {/* ··· Bouton Plus */}
          <button
            onClick={() => setDrawer(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-3"
            style={{ color: drawer ? "#6366f1" : "rgba(255,255,255,0.4)" }}
          >
            <MoreHorizontal size={22} />
            <span className="text-[10px] font-medium">Plus</span>
          </button>
        </div>
      </nav>

      {/* ── Drawer mobile ── */}
      {drawer && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setDrawer(false)}>
          {/* Fond */}
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />

          {/* Panel */}
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl bottom-nav-safe"
            style={{
              background: "rgba(10,15,35,0.98)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderBottom: "none",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                  🐔
                </div>
                <div className="leading-tight">
                  <p className="text-white font-bold text-sm">CRM MEB32</p>
                  <p className="text-[10px]" style={{ color: "#a5b4fc" }}>Thibaud · Commercial</p>
                </div>
              </div>
              <button onClick={() => setDrawer(false)} className="p-2 rounded-xl" style={{ color: "rgba(255,255,255,0.4)" }}>
                <X size={18} />
              </button>
            </div>

            {/* Nav items */}
            <div className="px-3 py-3 grid grid-cols-2 gap-1.5">
              {EXTRA_NAV.map(({ label, href, icon: Icon }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setDrawer(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                    style={{
                      background:  active ? "rgba(99,102,241,0.2)"    : "rgba(255,255,255,0.04)",
                      border:      `1px solid ${active ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.07)"}`,
                      color:       active ? "#a5b4fc" : "rgba(255,255,255,0.7)",
                    }}
                  >
                    <Icon size={16} className="shrink-0" style={{ color: active ? "#a5b4fc" : "rgba(255,255,255,0.4)" }} />
                    <span className="text-sm font-medium">{label}</span>
                    {label === "Relances" && (
                      <span className="ml-auto w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{ background: "#ef4444" }}>3</span>
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <button className="w-full flex items-center gap-3 py-2.5 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                <LogOut size={15} />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
