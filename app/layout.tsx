import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "CRM MEB32",
  description: "CRM commercial MEB32 pour équipement d'élevage volaille",
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        {/* Lueur violette — haut gauche */}
        <div
          aria-hidden="true"
          style={{
            position: "fixed", top: "-200px", left: "-200px",
            width: "600px", height: "600px",
            background: "radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)",
            pointerEvents: "none", zIndex: 0,
          }}
        />
        {/* Lueur verte — bas droite */}
        <div
          aria-hidden="true"
          style={{
            position: "fixed", bottom: "-200px", right: "-200px",
            width: "600px", height: "600px",
            background: "radial-gradient(circle, rgba(16,185,129,0.08), transparent 70%)",
            pointerEvents: "none", zIndex: 0,
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  )
}
