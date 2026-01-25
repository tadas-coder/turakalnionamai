import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, fileType, vendors, categories, fileBase64 } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract vendor name from filename
    const cleanFileName = fileName
      .replace(/\.[^.]+$/, "") // Remove extension
      .replace(/[-_]/g, " ")
      .toLowerCase();

    // Check for existing pattern
    const { data: patterns } = await supabase
      .from("vendor_invoice_patterns")
      .select("*")
      .order("recognition_count", { ascending: false });

    let patternMatch = null;
    let suggestedVendorId = null;
    let suggestedCategoryId = null;
    let isRecurring = false;

    // Helper function to normalize vendor name - remove quotes and common prefixes
    const normalizeVendorName = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/["'„"]/g, "") // Remove all types of quotes
        .replace(/\s+/g, " ")
        .trim();
    };
    
    // Extract significant word from vendor name (ignoring UAB, AB, etc.)
    const getSignificantWord = (vendorName: string): string | null => {
      const normalized = normalizeVendorName(vendorName);
      const words = normalized.split(" ");
      const prefixes = ["uab", "ab", "mb", "vši", "įį", "ją"];
      
      for (const word of words) {
        if (word.length >= 4 && !prefixes.includes(word)) {
          return word;
        }
      }
      return null;
    };

    // Try to match existing pattern - use more precise matching
    if (patterns && patterns.length > 0) {
      const fileNameNormalized = cleanFileName.replace(/["'„"]/g, "").replace(/\s+/g, "");
      
      for (const pattern of patterns) {
        const significantWord = getSignificantWord(pattern.vendor_name);
        
        console.log(`Pattern check: "${pattern.vendor_name}" -> significant word: "${significantWord}" in filename: "${fileNameNormalized}"`);
        
        if (significantWord && fileNameNormalized.includes(significantWord)) {
          patternMatch = {
            vendor_id: pattern.vendor_id,
            cost_category_id: pattern.cost_category_id,
          };
          suggestedVendorId = pattern.vendor_id;
          suggestedCategoryId = pattern.cost_category_id;
          isRecurring = true;

          // Update pattern usage
          await supabase
            .from("vendor_invoice_patterns")
            .update({
              recognition_count: pattern.recognition_count + 1,
              last_used_at: new Date().toISOString(),
            })
            .eq("id", pattern.id);

          console.log(`Pattern matched! Vendor ID: ${suggestedVendorId}`);
          break;
        }
      }
    }

    // If no pattern match, try to match vendor name from vendor list
    if (!suggestedVendorId && vendors && vendors.length > 0) {
      const fileNameNormalized = cleanFileName.replace(/["'„"]/g, "").replace(/\s+/g, "");
      
      for (const vendor of vendors) {
        const significantWord = getSignificantWord(vendor.name);
        
        console.log(`Vendor check: "${vendor.name}" -> significant word: "${significantWord}"`);
        
        if (significantWord && fileNameNormalized.includes(significantWord)) {
          suggestedVendorId = vendor.id;
          console.log(`Vendor matched! ID: ${suggestedVendorId}`);
          break;
        }
      }
    }

    // Use AI for more detailed analysis with PDF content if available
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    let aiAnalysis: any = {};
    
    if (LOVABLE_API_KEY) {
      try {
        const vendorList = vendors?.map((v: any) => v.name).join(", ") || "";
        const categoryList = categories?.map((c: any) => `${c.code || ""} ${c.name}`.trim()).join(", ") || "";

        // Build messages array - include PDF image if base64 is provided
        const userContent: any[] = [];
        
        // If we have base64 PDF content, include it as an image for vision analysis
        if (fileBase64 && (fileType === "application/pdf" || fileType?.includes("image"))) {
          userContent.push({
            type: "image_url",
            image_url: {
              url: `data:${fileType || "application/pdf"};base64,${fileBase64}`
            }
          });
        }
        
        userContent.push({
          type: "text",
          text: `Analyze this invoice. Filename: "${fileName}"

IMPORTANT: Extract ALL information from the invoice document/image:
- vendor_name: string (full company name, e.g. "UAB Prologika")
- vendor_company_code: string | null (įmonės kodas - 9 digit company code)
- vendor_vat_code: string | null (PVM mokėtojo kodas - starts with LT)
- vendor_category: string | null (vendor business category)
- invoice_number: string | null (sąskaitos serija ir numeris)
- invoice_date: string | null (YYYY-MM-DD format)
- due_date: string | null (apmokėjimo terminas in YYYY-MM-DD format, if not specified assume 14 days from invoice_date)
- description: string (what the invoice is for based on line items)
- suggested_category: string | null (from available cost categories)
- subtotal: number | null (suma be PVM)
- vat_amount: number | null (PVM suma)
- total_amount: number | null (bendra suma / apmokėti)
- confidence: number (0-1)`
        });

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You are an invoice analyzer for Lithuanian companies. Analyze the invoice document/image and extract all financial details. Return JSON only.
Available vendors: ${vendorList}
Available categories: ${categoryList}

CRITICAL: You must extract the TOTAL AMOUNT (Apmokėti/Iš viso/Suma) and DUE DATE from the document. If due date is not explicitly stated, calculate it as 14 days from invoice date.
For Lithuanian invoices, look for: "Apmokėti:", "Iš viso:", "Suma:", "PVM:", "Apmokėti iki:", "Mokėti iki:"`
              },
              {
                role: "user",
                content: userContent
              }
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "analyze_invoice",
                  description: "Analyze invoice and return structured data including financial amounts",
                  parameters: {
                    type: "object",
                    properties: {
                      vendor_name: { type: "string", description: "Full company name" },
                      vendor_company_code: { type: "string", description: "Lithuanian company code (9 digits)" },
                      vendor_vat_code: { type: "string", description: "VAT code starting with LT" },
                      vendor_category: { type: "string", description: "Business category of the vendor" },
                      invoice_number: { type: "string" },
                      invoice_date: { type: "string", description: "Invoice date in YYYY-MM-DD format" },
                      due_date: { type: "string", description: "Payment due date in YYYY-MM-DD format" },
                      description: { type: "string" },
                      suggested_category: { type: "string" },
                      subtotal: { type: "number", description: "Amount without VAT" },
                      vat_amount: { type: "number", description: "VAT amount" },
                      total_amount: { type: "number", description: "Total amount to pay" },
                      confidence: { type: "number" }
                    },
                    required: ["vendor_name", "total_amount", "confidence"]
                  }
                }
              }
            ],
            tool_choice: { type: "function", function: { name: "analyze_invoice" } }
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            aiAnalysis = JSON.parse(toolCall.function.arguments);
          }
        } else {
          console.error("AI response error:", response.status, await response.text());
        }
      } catch (aiError) {
        console.error("AI analysis error:", aiError);
      }
    }

    // Find category ID from AI suggestion
    if (!suggestedCategoryId && aiAnalysis.suggested_category && categories) {
      const suggestedCat = categories.find((c: any) => 
        c.name.toLowerCase().includes(aiAnalysis.suggested_category.toLowerCase()) ||
        aiAnalysis.suggested_category.toLowerCase().includes(c.name.toLowerCase())
      );
      if (suggestedCat) {
        suggestedCategoryId = suggestedCat.id;
      }
    }

    const result = {
      vendor_name: aiAnalysis.vendor_name || extractVendorFromFilename(fileName),
      vendor_company_code: aiAnalysis.vendor_company_code || null,
      vendor_vat_code: aiAnalysis.vendor_vat_code || null,
      vendor_category: aiAnalysis.vendor_category || null,
      suggested_vendor_id: suggestedVendorId,
      invoice_number: aiAnalysis.invoice_number || extractInvoiceNumber(fileName),
      invoice_date: aiAnalysis.invoice_date || extractDate(fileName),
      due_date: aiAnalysis.due_date || null,
      subtotal: null,
      vat_amount: null,
      total_amount: aiAnalysis.total_amount || extractAmount(fileName),
      description: aiAnalysis.description || `Sąskaita: ${fileName}`,
      suggested_category_id: suggestedCategoryId,
      confidence: aiAnalysis.confidence || 0.5,
      is_recurring: isRecurring,
      pattern_match: patternMatch,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractVendorFromFilename(filename: string): string | null {
  const clean = filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
  const words = clean.split(" ").filter(w => w.length > 2);
  if (words.length > 0) {
    return words.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  }
  return null;
}

function extractInvoiceNumber(filename: string): string | null {
  const match = filename.match(/(?:SF|INV|SAS|NR)?[-_]?(\d{4,})/i);
  return match ? match[0].toUpperCase() : null;
}

function extractDate(filename: string): string | null {
  const match = filename.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return null;
}

function extractAmount(filename: string): number | null {
  const match = filename.match(/(\d+)[,.](\d{2})(?:eur|€)?/i);
  if (match) {
    return parseFloat(`${match[1]}.${match[2]}`);
  }
  return null;
}
