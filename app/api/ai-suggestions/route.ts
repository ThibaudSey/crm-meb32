import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Service-role client — bypasses RLS. Never exposed to the browser.
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

// GET /api/ai-suggestions → retourne les suggestions en_attente
export async function GET() {
  const client = getServiceClient()
  if (!client) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local" }, { status: 500 })
  }

  const { data, error } = await client
    .from("ai_suggestions")
    .select("*")
    .eq("statut", "en_attente")
    .order("date_creation", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/ai-suggestions → valider ou rejeter une suggestion
export async function POST(req: NextRequest) {
  const client = getServiceClient()
  if (!client) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local" }, { status: 500 })
  }

  const body = await req.json() as {
    action: "valider" | "rejeter"
    id: string
    type_suggestion?: string
    payload?: Record<string, string>
  }

  const now = new Date().toISOString()

  if (body.action === "valider" && body.type_suggestion && body.payload) {
    const p: Record<string, string> = typeof body.payload === "string"
      ? (JSON.parse(body.payload) as Record<string, string>)
      : body.payload

    let insertError: { message: string; code?: string; details?: string } | null = null

    if (body.type_suggestion === "task") {
      const { error } = await client.from("taches").insert({
        titre: p.titre ?? "",
        description: p.description ?? null,
        priorite: p.priorite ?? "moyenne",
        date_echeance: p.date_echeance ?? null,
        statut: "a_faire",
        type_tache: "action",
        contexte: p.contexte ?? null,
      })
      insertError = error
    } else if (body.type_suggestion === "contact") {
      // Séparer prénom / nom depuis contact_nom ("Prénom Nom")
      const fullName = p.contact_nom ?? ""
      const parts = fullName.trim().split(/\s+/)
      const prenom = parts.length > 1 ? parts.slice(0, -1).join(" ") : null
      const nom    = parts.length > 1 ? parts[parts.length - 1] : fullName

      const { error } = await client.from("contacts").insert({
        nom,
        prenom:       prenom ?? null,
        telephone:    p.contact_telephone ?? null,
        type_contact: "prospect",
        notes:        p.contexte ?? null,
      })
      insertError = error
    } else if (body.type_suggestion === "note") {
      const { error } = await client.from("notes").insert({
        titre: p.titre ?? "", contenu: p.description ?? null,
      })
      insertError = error
    } else if (body.type_suggestion === "event") {
      const { error } = await client.from("evenements").insert({
        titre: p.titre ?? "", description: p.description ?? null,
        date_debut: p.date_echeance ?? null,
      })
      insertError = error
    }

    if (insertError) {
      console.error(`[ai-suggestions] INSERT ${body.type_suggestion} échoué:`, insertError)
      return NextResponse.json(
        { error: `INSERT ${body.type_suggestion} échoué: ${insertError.message}`, code: insertError.code, details: insertError.details },
        { status: 500 }
      )
    }

    await client.from("ai_suggestions")
      .update({ statut: "validee", processed: true, date_validation: now })
      .eq("id", body.id)
  } else if (body.action === "rejeter") {
    await client.from("ai_suggestions")
      .update({ statut: "rejetee", processed: true })
      .eq("id", body.id)
  } else {
    return NextResponse.json({ error: "action invalide" }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
