"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function TestSupabase() {
  const [result, setResult] = useState("")

  useEffect(() => {
    async function test() {
      // Test 1 : lire entreprises + colonnes réelles
      const { data: readData, error: readError } = await supabase
        .from("entreprises")
        .select("*")
        .limit(1)

      if (readError) {
        setResult(`LECTURE ÉCHOUÉE:\n${JSON.stringify(readError, null, 2)}`)
        return
      }

      const colonnes = readData && readData[0] ? Object.keys(readData[0]) : []
      console.log("colonnes entreprises:", colonnes)

      setResult(`Lecture OK\nColonnes réelles: ${colonnes.join(", ")}\n\nTest insertion...`)

      // Test 2 : insérer minimal
      const { data: insertData, error: insertError } = await supabase
        .from("entreprises")
        .insert([{ nom: "TEST - à supprimer", etape: "prospection" }])
        .select()

      if (insertError) {
        setResult(prev => prev + `\n\nINSERTION ÉCHOUÉE:\n${JSON.stringify(insertError, null, 2)}`)
        return
      }

      setResult(prev => prev + `\n\nINSERTION OK ! ID: ${insertData?.[0]?.id}`)

      // Nettoyer
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
        color: result.includes("OK") ? "#4ade80" : result.includes("ÉCHOUÉE") ? "#f87171" : "#94a3b8"
      }}>
        {result || "Test en cours..."}
      </pre>
    </div>
  )
}
