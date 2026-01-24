import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, fileContent, vendorHint } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch cost categories and segments for context
    let categoriesContext = "";
    let segmentsContext = "";
    let patternsContext = "";

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Fetch cost categories
      const { data: categories } = await supabase
        .from("cost_categories")
        .select("id, name, code, description")
        .eq("is_active", true)
        .order("name");

      if (categories && categories.length > 0) {
        categoriesContext = categories.map(c => 
          `- ID: ${c.id}, Pavadinimas: "${c.name}"${c.code ? ` (${c.code})` : ""}${c.description ? `: ${c.description}` : ""}`
        ).join("\n");
      }

      // Fetch segments
      const { data: segments } = await supabase
        .from("segments")
        .select("id, name, description")
        .order("name");

      if (segments && segments.length > 0) {
        segmentsContext = segments.map(s => 
          `- ID: ${s.id}, Pavadinimas: "${s.name}"${s.description ? `: ${s.description}` : ""}`
        ).join("\n");
      }

      // Fetch known patterns for similar invoices
      const { data: patterns } = await supabase
        .from("invoice_patterns")
        .select("vendor_name, cost_category_id, invoice_status, needs_distribution, distribution_segment_ids")
        .order("recognition_count", { ascending: false })
        .limit(20);

      if (patterns && patterns.length > 0) {
        patternsContext = patterns.map(p => 
          `- Tiekėjas: "${p.vendor_name}", Kategorija ID: ${p.cost_category_id || "nenustatyta"}, Būsena: ${p.invoice_status}, Išdalinti: ${p.needs_distribution ? "taip" : "ne"}`
        ).join("\n");
      }
    }

    console.log("Analyzing invoice:", fileName);

    const systemPrompt = `Esi DNSB "Taurakalnio Namai" buhalterijos asistentas. Tavo užduotis - analizuoti įkeltas sąskaitas faktūras ir padėti jas teisingai priskirti.

Analizuodamas sąskaitą, tu turi:
1. Nustatyti tiekėjo pavadinimą iš dokumento
2. Pasiūlyti tinkamiausią sąnaudų kategoriją
3. Nustatyti ar sąskaita apmokėta ar ne (pagal dokumento turinį, jei įmanoma)
4. Nustatyti ar reikia išdalinti į lapelius gyventojams
5. Jei reikia dalinti - pasiūlyti tinkamus segmentus

### Galimos sąnaudų kategorijos:
${categoriesContext || "Kategorijos nepateiktos"}

### Galimi gyventojų segmentai:
${segmentsContext || "Segmentai nepateikti"}

### Žinomi tiekėjų šablonai (ankstesnės sąskaitos):
${patternsContext || "Šablonų nėra"}

Atsakyk JSON formatu su šiais laukais:
{
  "vendor_name": "Tiekėjo pavadinimas",
  "suggested_category_id": "kategorijos UUID arba null",
  "suggested_category_name": "kategorijos pavadinimas",
  "invoice_status": "paid" arba "unpaid",
  "needs_distribution": true arba false,
  "distribution_reason": "Paaiškinimas kodėl reikia/nereikia dalinti",
  "suggested_segment_ids": ["segment UUID1", "segment UUID2"],
  "suggested_segment_names": ["segmento pavadinimas1"],
  "confidence": 0-100,
  "analysis_notes": "Papildoma informacija apie sąskaitą",
  "is_recurring": true/false,
  "pattern_match": "Ar atitinka žinomą šabloną"
}

Jei negali nustatyti kokio nors lauko - palik null. Visada bandyk rasti artimiausią atitikimą kategorijoms.`;

    const userMessage = `Analizuok šią sąskaitą faktūrą:

Failo pavadinimas: ${fileName}
${vendorHint ? `Tiekėjo užuomina: ${vendorHint}` : ""}

Dokumento turinys (arba meta informacija):
${fileContent || "Turinys nepateiktas - analizuok pagal failo pavadinimą"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_invoice",
              description: "Grąžina sąskaitos analizės rezultatus",
              parameters: {
                type: "object",
                properties: {
                  vendor_name: { type: "string", description: "Tiekėjo pavadinimas" },
                  suggested_category_id: { type: "string", nullable: true },
                  suggested_category_name: { type: "string", nullable: true },
                  invoice_status: { type: "string", enum: ["paid", "unpaid", "partially_paid"] },
                  needs_distribution: { type: "boolean" },
                  distribution_reason: { type: "string" },
                  suggested_segment_ids: { type: "array", items: { type: "string" } },
                  suggested_segment_names: { type: "array", items: { type: "string" } },
                  confidence: { type: "number", minimum: 0, maximum: 100 },
                  analysis_notes: { type: "string" },
                  is_recurring: { type: "boolean" },
                  pattern_match: { type: "string", nullable: true }
                },
                required: ["vendor_name", "invoice_status", "needs_distribution", "confidence"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_invoice" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Per daug užklausų. Palaukite ir bandykite vėliau." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Reikia papildyti kreditų balansą." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI paslauga laikinai nepasiekiama" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    console.log("AI response received");

    // Extract the tool call result
    let analysisResult = null;
    if (aiResponse.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      try {
        analysisResult = JSON.parse(aiResponse.choices[0].message.tool_calls[0].function.arguments);
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    if (!analysisResult) {
      // Fallback: try to extract from content
      const content = aiResponse.choices?.[0]?.message?.content;
      if (content) {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysisResult = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error("Failed to parse content as JSON:", e);
        }
      }
    }

    if (!analysisResult) {
      analysisResult = {
        vendor_name: fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
        suggested_category_id: null,
        suggested_category_name: null,
        invoice_status: "unpaid",
        needs_distribution: false,
        distribution_reason: "Nepavyko automatiškai nustatyti",
        suggested_segment_ids: [],
        suggested_segment_names: [],
        confidence: 20,
        analysis_notes: "Automatinė analizė nepavyko. Prašome pasirinkti rankiniu būdu.",
        is_recurring: false,
        pattern_match: null
      };
    }

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Invoice analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Nežinoma klaida" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
