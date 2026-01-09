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
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch news and polls from database
    let newsContext = "";
    let pollsContext = "";
    let worksContext = "";

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Fetch published news
      const { data: news } = await supabase
        .from("news")
        .select("title, content, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (news && news.length > 0) {
        newsContext = "\n\n### Naujausios naujienos:\n" + news.map((n, i) => 
          `${i + 1}. "${n.title}" (${new Date(n.created_at).toLocaleDateString("lt-LT")}): ${n.content.substring(0, 200)}${n.content.length > 200 ? "..." : ""}`
        ).join("\n");
      }

      // Fetch active polls
      const { data: polls } = await supabase
        .from("polls")
        .select("title, description, options, ends_at, active")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(5);

      if (polls && polls.length > 0) {
        pollsContext = "\n\n### Aktyvios apklausos:\n" + polls.map((p, i) => {
          const options = Array.isArray(p.options) ? p.options.join(", ") : "";
          const endsAt = p.ends_at ? ` (baigiasi ${new Date(p.ends_at).toLocaleDateString("lt-LT")})` : "";
          return `${i + 1}. "${p.title}"${endsAt}: ${p.description || ""}. Pasirinkimai: ${options}`;
        }).join("\n");
      }

      // Fetch planned works
      const { data: works } = await supabase
        .from("planned_works")
        .select("title, description, start_date, end_date, work_type")
        .gte("end_date", new Date().toISOString().split("T")[0])
        .order("start_date", { ascending: true })
        .limit(5);

      if (works && works.length > 0) {
        worksContext = "\n\n### Planuojami darbai:\n" + works.map((w, i) => {
          const dates = w.end_date 
            ? `${new Date(w.start_date).toLocaleDateString("lt-LT")} - ${new Date(w.end_date).toLocaleDateString("lt-LT")}`
            : new Date(w.start_date).toLocaleDateString("lt-LT");
          return `${i + 1}. "${w.title}" (${dates}): ${w.description || ""}`;
        }).join("\n");
      }
    }

    console.log("Starting chat request with", messages.length, "messages");
    console.log("Context loaded - News:", newsContext ? "yes" : "no", "Polls:", pollsContext ? "yes" : "no", "Works:", worksContext ? "yes" : "no");

    const systemPrompt = `Esi draugiškas ir naudingas DNSB "Taurakalnio Namai" virtualus asistentas. Tu padedi gyventojams atsakyti į klausimus apie:
- Namo valdymą ir administravimą
- Pranešimų apie gedimus teikimą
- Balsavimą ir apklausas
- Sąskaitų ir mokėjimų klausimus
- Bendrų erdvių naudojimą
- Taisykles ir dokumentus
- Kontaktinius duomenis
- Planuojamus darbus

Atsakyk trumpai, aiškiai ir draugiškai lietuvių kalba. Jei nežinai atsakymo, nukreipk gyventoją kreiptis į administratorių.

### Dabartinė informacija iš sistemos:
${newsContext || "\nŠiuo metu nėra naujų naujienų."}
${pollsContext || "\nŠiuo metu nėra aktyvių apklausų."}
${worksContext || "\nŠiuo metu nėra planuojamų darbų."}

Kai vartotojas klausia apie naujienas, apklausas ar planuojamus darbus, naudok šią informaciją atsakydamas. Jei klausia apie konkrečią temą, kurią randi sąraše - pateik išsamią informaciją.`;

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
          ...messages,
        ],
        stream: true,
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

    console.log("Successfully connected to AI gateway, streaming response");

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Nežinoma klaida" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
