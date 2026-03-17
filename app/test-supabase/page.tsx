"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function TestSupabase() {
  const [result, setResult] = useState("")

  useEffect(() => {
    async function test() {
      // Test 1 : lire les affaires
      const { data: readData, error: readError } = await supabase
        .from("entreprises")
        .select("*")
        .limit(1)

      if (readError) {
        setResult(`LECTURE ÉCHOUÉE: ${JSON.stringify(readError)}`)
        return
      }

      setResult(`Lecture OK (${readData?.length ?? 0} ligne). Test insertion...`)

      // Test 2 : insérer une affaire minimale
      const { data: insertData, error: insertError } = await supabase
        .from("entreprises")
        .insert([{ nom: "TEST - à supprimer" }])
        .select()

      if (insertError) {
        setResult(`INSERTION ÉCHOUÉE: ${JSON.stringify(insertError, null, 2)}`)
        return
      }

      setResult(`SUCCÈS ! ID créé: ${insertData?.[0]?.id}`)

      // Nettoyer le test
      await supabase.from("entreprises").delete().eq("nom", "TEST - à supprimer")
    }
    test()
  }, [])

  return (
    <div style={{ padding: 32, fontFamily: "monospace", background: "#0f172a", minHeight: "100vh", color: "#f1f5f9" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Test Supabase — entreprises</h1>
      <pre style={{
        background: "#1e293b", padding: 20, borderRadius: 8,
        whiteSpace: "pre-wrap", wordBreak: "break-all",
        color: result.startsWith("SUCCÈS") ? "#4ade80" : result.startsWith("LECTURE") || result.startsWith("INSERTION") ? "#f87171" : "#94a3b8"
      }}>
        {result || "Test en cours..."}
      </pre>
    </div>
  )
}
