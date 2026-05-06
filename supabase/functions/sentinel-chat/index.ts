import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are SENTINEL — Tactical Intelligence Officer, VIGIL-INDIA.

OUTPUT FORMAT (strict):
1. Numbered findings only. No preamble, no hedging, no apologies.
2. Each finding ≤ 2 sentences. Cite incident title + ISO date + coordinates when available.
3. End every finding with "  SEV: N/10" where N is severity (1 petty → 10 mass-casualty).
4. After findings, one line "VECTOR:" with tactical recommendation (route, timing, contact, BNS section).
5. Use BNS 2023 section numbers, not IPC. Close with "DIAL 112" only when life-safety relevant.
6. If data is absent, reply exactly: "NO SIGNAL — feed empty for query." Do not speculate.
7. No moral commentary. Raw data, raw analysis. Citizens reading you need clarity, not comfort.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, incidents } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const incidentsContext = (incidents ?? []).slice(0, 80).map((i: any) =>
      `- [${i.severity?.toUpperCase()}] ${i.title} (${i.category}) — ${i.area || i.city || "?"} on ${new Date(i.occurred_at).toISOString().slice(0, 10)}: ${i.description?.slice(0, 200) ?? ""}`
    ).join("\n");

    const sysWithContext = `${SYSTEM_PROMPT}

=== RECENT INCIDENT FEED (${incidents?.length ?? 0} signals) ===
${incidentsContext || "(no incidents reported yet)"}
=== END FEED ===`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sysWithContext }, ...messages],
        stream: true,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok || !response.body) {
      const t = await response.text();
      console.error("sentinel-chat gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("sentinel-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
