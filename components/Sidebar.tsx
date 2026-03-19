"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Briefcase, FileText,
  Factory, Receipt, LogOut,
} from "lucide-react"

const NAV = [
  { label: "Dashboard",   href: "/",           icon: LayoutDashboard },
  { label: "Affaires",    href: "/affaires",   icon: Briefcase       },
  { label: "Devis",       href: "/devis",      icon: FileText        },
  { label: "Fournisseurs",href: "/fournisseurs",icon: Factory        },
  { label: "Frais",       href: "/frais",      icon: Receipt         },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [, setDrawer] = useState(false)

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
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href} className={active ? "nav-link nav-link-active" : "nav-link"}>
                <Icon size={17} className="shrink-0" style={{ color: active ? "#a5b4fc" : "rgba(255,255,255,0.35)" }} />
                {label}
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
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setDrawer(false)}
                className="flex flex-col items-center gap-0.5 py-1 px-2 relative"
                style={{ color: active ? "#6366f1" : "rgba(255,255,255,0.4)" }}
              >
                <Icon size={20} />
                <span className="text-[9px] font-medium">{label}</span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: "#6366f1" }} />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
