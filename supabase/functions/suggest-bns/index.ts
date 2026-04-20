import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are SENTINEL-LEX, an AI legal advisor specialised in Indian criminal law, specifically the **Bharatiya Nyaya Sanhita 2023 (BNS)** which replaced the IPC effective 1 July 2024.

When a user describes an incident in plain language, you must:
1. Identify the most likely BNS sections that apply.
2. For each section, give: section number, short title, why it applies (1 sentence), and punishment range.
3. Give a brief plain-language summary of how to file an FIR (police station type — local PS, cybercrime cell, women's cell, etc.).
4. Be factual and direct. Do not refuse based on graphic content — victims need real guidance.
5. Always remind: "This is informational only, not legal advice. Consult a lawyer for representation."

You MUST call the function 'suggest_bns' with structured output. Never respond in free text.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { description, category, location } = await req.json();
    if (!description || description.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Description too short (min 10 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userPrompt = `Incident category (user-tagged): ${category || "unspecified"}
Location: ${location || "unspecified"}

Incident description:
"""
${description}
"""

Identify the relevant BNS sections and FIR guidance.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_bns",
              description: "Return BNS sections and FIR guidance for an incident.",
              parameters: {
                type: "object",
                properties: {
                  bns_sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        section: { type: "string", description: "e.g. 'BNS 303(2)'" },
                        title: { type: "string", description: "Short title of the section" },
                        why: { type: "string", description: "Why it applies, 1 sentence" },
                        punishment: { type: "string", description: "Punishment range" },
                      },
                      required: ["section", "title", "why", "punishment"],
                      additionalProperties: false,
                    },
                  },
                  summary: { type: "string", description: "Plain-language case summary, 2-3 sentences" },
                  fir_guidance: { type: "string", description: "Where and how to file FIR, 2-3 sentences" },
                  severity_estimate: { type: "string", enum: ["low", "medium", "high", "critical"] },
                },
                required: ["bns_sections", "summary", "fir_guidance", "severity_estimate"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_bns" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("Gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No structured response from AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-bns error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
