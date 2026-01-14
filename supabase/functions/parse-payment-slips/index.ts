import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedSlip {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  buyerName: string;
  apartmentAddress: string;
  apartmentNumber: string;
  paymentCode: string;
  previousAmount: number;
  paymentsReceived: number;
  balance: number;
  accruedAmount: number;
  totalDue: number;
  lineItems: Array<{
    code: string;
    name: string;
    unit: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  utilityReadings: {
    hotWater?: { from: number; to: number; difference: number };
    coldWater?: { meterNumber: string };
    electricityDay?: { from: number; to: number; difference: number };
    electricityNight?: { from: number; to: number; difference: number };
  };
}

function parseNumber(str: string | undefined): number {
  if (!str) return 0;
  const cleaned = str.replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Try to repair and parse potentially malformed JSON
function repairAndParseJSON(text: string): { slips: any[] } | null {
  // First try to find the main JSON object
  let jsonStr = text;
  
  // Try to extract JSON from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }
  
  // Try to find the { "slips": [ ... ] } structure
  const slipsMatch = text.match(/\{\s*"slips"\s*:\s*\[/);
  if (slipsMatch) {
    const startIdx = text.indexOf(slipsMatch[0]);
    jsonStr = text.substring(startIdx);
  }
  
  // Try direct parse first
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.slips && Array.isArray(parsed.slips)) {
      return parsed;
    }
  } catch (e) {
    // Continue to repair attempts
  }
  
  // Try to fix common JSON issues
  try {
    // Find where the slips array starts
    const slipsStart = jsonStr.indexOf('"slips"');
    if (slipsStart === -1) return null;
    
    const arrayStart = jsonStr.indexOf('[', slipsStart);
    if (arrayStart === -1) return null;
    
    // Find valid objects in the array
    let depth = 0;
    let inString = false;
    let escaped = false;
    let objectStart = -1;
    const objects: string[] = [];
    
    for (let i = arrayStart; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\') {
        escaped = true;
        continue;
      }
      
      if (char === '"' && !escaped) {
        inString = !inString;
        continue;
      }
      
      if (inString) continue;
      
      if (char === '{') {
        if (depth === 0) objectStart = i;
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && objectStart !== -1) {
          const objStr = jsonStr.substring(objectStart, i + 1);
          try {
            JSON.parse(objStr); // Validate it's valid JSON
            objects.push(objStr);
          } catch (e) {
            // Skip invalid objects
            console.log("Skipping invalid object in JSON array");
          }
          objectStart = -1;
        }
      }
    }
    
    if (objects.length > 0) {
      const repairedJson = `{"slips": [${objects.join(',')}]}`;
      const parsed = JSON.parse(repairedJson);
      console.log(`Repaired JSON: extracted ${parsed.slips.length} valid objects`);
      return parsed;
    }
  } catch (e) {
    console.error("JSON repair failed:", e);
  }
  
  return null;
}

function extractApartmentNumber(address: string): string {
  const match = address.match(/(\d+)\s*-\s*(\d+)/);
  if (match) {
    return match[2].padStart(2, '0');
  }
  return '';
}

function parseSlipFromText(text: string): ParsedSlip | null {
  try {
    const invoiceMatch = text.match(/Serija:\s*(\w+)\s*Nr\.\s*(\d+)/);
    const invoiceNumber = invoiceMatch ? `${invoiceMatch[1]}-${invoiceMatch[2]}` : '';
    
    const dateMatch = text.match(/(\d{4})\s*m\.\s*(\w+)\s*(\d+)\s*d\./);
    let invoiceDate = '';
    if (dateMatch) {
      const months: Record<string, string> = {
        'sausio': '01', 'vasario': '02', 'kovo': '03', 'balandžio': '04',
        'gegužės': '05', 'birželio': '06', 'liepos': '07', 'rugpjūčio': '08',
        'rugsėjo': '09', 'spalio': '10', 'lapkričio': '11', 'gruodžio': '12'
      };
      const month = months[dateMatch[2].toLowerCase()] || '01';
      invoiceDate = `${dateMatch[1]}-${month}-${dateMatch[3].padStart(2, '0')}`;
    }
    
    const dueDateMatch = text.match(/Apmokėti iki:\s*(\d{4}-\d{2}-\d{2})/);
    const dueDate = dueDateMatch ? dueDateMatch[1] : '';
    
    const buyerMatch = text.match(/Pirkėjas:\s*\n\s*(.+?)(?:\n|$)/);
    const buyerName = buyerMatch ? buyerMatch[1].trim() : '';
    
    const objAddressMatch = text.match(/Obj\.adresas:\s*\n\s*(.+?)(?:\n|$)/);
    const apartmentAddress = objAddressMatch ? objAddressMatch[1].trim() : '';
    const apartmentNumber = extractApartmentNumber(apartmentAddress);
    
    const paymentCodeMatch = text.match(/mokėtojo kodą:\s*(\d+)/);
    const paymentCode = paymentCodeMatch ? paymentCodeMatch[1] : '';
    
    const previousMatch = text.match(/Paskutinė mokėtina suma buvo,?\s*€?:\s*([\d\s,.-]+)/);
    const previousAmount = parseNumber(previousMatch?.[1]);
    
    const receivedMatch = text.match(/Gautos įmokos,?\s*€?:\s*([\d\s,.-]+)/);
    const paymentsReceived = parseNumber(receivedMatch?.[1]);
    
    const balanceMatch = text.match(/Skola \(\+\) \/ Permoka \(-\),?\s*€?:\s*([\d\s,.-]+)/);
    const balance = parseNumber(balanceMatch?.[1]);
    
    const accruedMatch = text.match(/Priskaityta suma,?\s*€?:\s*([\d\s,.-]+)/);
    const accruedAmount = parseNumber(accruedMatch?.[1]);
    
    const totalMatch = text.match(/MOKĖTINA SUMA,?\s*€?:\s*([\d\s,.-]+)/);
    const totalDue = parseNumber(totalMatch?.[1]);
    
    const lineItems: ParsedSlip['lineItems'] = [];
    const tableMatch = text.match(/\| Pavadinimas[\s\S]*?\n([\s\S]*?)(?=\n\nPaskutinė|\n\n#)/);
    if (tableMatch) {
      const rows = tableMatch[1].split('\n').filter(row => row.includes('|') && !row.includes('---'));
      for (const row of rows) {
        const cells = row.split('|').map(c => c.trim()).filter(c => c);
        if (cells.length >= 5) {
          const nameWithCode = cells[0];
          const codeMatch = nameWithCode.match(/^(T\d+)\|?\s*(.+)/);
          if (codeMatch) {
            lineItems.push({
              code: codeMatch[1],
              name: codeMatch[2].trim(),
              unit: cells[1] || 'vnt.',
              quantity: parseNumber(cells[2]),
              rate: parseNumber(cells[3]),
              amount: parseNumber(cells[4])
            });
          }
        }
      }
    }
    
    const utilityReadings: ParsedSlip['utilityReadings'] = {};
    
    const hotWaterMatch = text.match(/# Karštas vanduo[\s\S]*?\|\s*[\d.]+\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/);
    if (hotWaterMatch) {
      utilityReadings.hotWater = {
        from: parseNumber(hotWaterMatch[1]),
        to: parseNumber(hotWaterMatch[2]),
        difference: parseNumber(hotWaterMatch[3])
      };
    }
    
    const coldWaterMatch = text.match(/# Šaltas vanduo[\s\S]*?Sk\.Nr\.\s*\|\s*\n\|\s*\|\s*(\d+)\s*\|/);
    if (coldWaterMatch) {
      utilityReadings.coldWater = { meterNumber: coldWaterMatch[1] };
    }
    
    if (!invoiceNumber || !apartmentNumber) {
      return null;
    }
    
    return {
      invoiceNumber,
      invoiceDate,
      dueDate,
      buyerName,
      apartmentAddress,
      apartmentNumber,
      paymentCode,
      previousAmount,
      paymentsReceived,
      balance,
      accruedAmount,
      totalDue,
      lineItems,
      utilityReadings
    };
  } catch (error) {
    console.error('Error parsing slip:', error);
    return null;
  }
}

function splitIntoSlips(fullText: string): string[] {
  const slips: string[] = [];
  
  const invoiceSplits = fullText.split(/(?=# SĄSKAITA - FAKTŪRA|(?<=\n)SĄSKAITA - FAKTŪRA)/);
  
  for (const section of invoiceSplits) {
    if (section.includes('SĄSKAITA - FAKTŪRA') && section.includes('Serija:')) {
      slips.push(section.trim());
    }
  }
  
  if (slips.length === 0) {
    const serijaSpits = fullText.split(/(?=Serija:\s*\w+\s*Nr\.)/);
    for (const section of serijaSpits) {
      if (section.includes('Serija:') && (section.includes('MOKĖTINA SUMA') || section.includes('mokėtojo kod'))) {
        slips.push(section.trim());
      }
    }
  }
  
  console.log(`Split document into ${slips.length} potential slips`);
  return slips;
}

function parseExcelData(rows: any[]): ParsedSlip[] {
  const slips: ParsedSlip[] = [];
  
  let headerRowIndex = -1;
  let columnMap: Record<string, number> = {};
  
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    if (!row) continue;
    
    const headers = Object.values(row).map(v => String(v || '').toLowerCase());
    
    const hasInvoice = headers.some(h => h.includes('sąskait') || h.includes('nr') || h.includes('invoice'));
    const hasAmount = headers.some(h => h.includes('suma') || h.includes('amount') || h.includes('mokėti'));
    const hasApartment = headers.some(h => h.includes('but') || h.includes('adres') || h.includes('apart'));
    
    if (hasInvoice || hasAmount || hasApartment) {
      headerRowIndex = i;
      
      Object.entries(row).forEach(([key, value], idx) => {
        const val = String(value || '').toLowerCase();
        if (val.includes('sąskait') || val.includes('nr') || val.includes('invoice')) {
          columnMap['invoice'] = idx;
        }
        if (val.includes('suma') || val.includes('mokėti') || val.includes('amount')) {
          columnMap['amount'] = idx;
        }
        if (val.includes('but') || val.includes('apart')) {
          columnMap['apartment'] = idx;
        }
        if (val.includes('adres')) {
          columnMap['address'] = idx;
        }
        if (val.includes('pirk') || val.includes('vard') || val.includes('name')) {
          columnMap['buyer'] = idx;
        }
        if (val.includes('data') || val.includes('date')) {
          if (!columnMap['invoiceDate']) {
            columnMap['invoiceDate'] = idx;
          } else {
            columnMap['dueDate'] = idx;
          }
        }
        if (val.includes('termin') || val.includes('iki') || val.includes('due')) {
          columnMap['dueDate'] = idx;
        }
        if (val.includes('kod') || val.includes('code')) {
          columnMap['paymentCode'] = idx;
        }
      });
      break;
    }
  }
  
  const dataStartIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  const keys = Object.keys(rows[0] || {});
  
  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    
    const values = Object.values(row);
    
    const getValue = (colName: string) => {
      const idx = columnMap[colName];
      if (idx !== undefined && values[idx] !== undefined) {
        return String(values[idx] || '');
      }
      return '';
    };
    
    const invoiceNumber = getValue('invoice') || `EXCEL-${i}`;
    const apartmentNumber = getValue('apartment') || extractApartmentNumber(getValue('address'));
    const totalDue = parseNumber(getValue('amount'));
    
    if (!apartmentNumber && !getValue('buyer')) continue;
    
    slips.push({
      invoiceNumber,
      invoiceDate: getValue('invoiceDate') || new Date().toISOString().split('T')[0],
      dueDate: getValue('dueDate') || new Date().toISOString().split('T')[0],
      buyerName: getValue('buyer'),
      apartmentAddress: getValue('address'),
      apartmentNumber,
      paymentCode: getValue('paymentCode'),
      previousAmount: 0,
      paymentsReceived: 0,
      balance: 0,
      accruedAmount: totalDue,
      totalDue,
      lineItems: [],
      utilityReadings: {}
    });
  }
  
  return slips;
}

async function parseWithAI(text: string, supabaseUrl: string, supabaseKey: string): Promise<ParsedSlip[]> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/chat-assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        message: `Išanalizuok šį mokėjimo lapelių dokumentą ir ištrauk visus mokėjimo lapelius. Kiekvienam lapeliui grąžink JSON formatu:
{
  "slips": [
    {
      "invoiceNumber": "sąskaitos numeris",
      "invoiceDate": "data YYYY-MM-DD",
      "dueDate": "mokėjimo terminas YYYY-MM-DD", 
      "buyerName": "pirkėjo vardas",
      "apartmentAddress": "adresas",
      "apartmentNumber": "buto numeris (du skaitmenys, pvz. 01, 02)",
      "paymentCode": "mokėtojo kodas",
      "totalDue": numeris,
      "accruedAmount": numeris,
      "lineItems": [{"name": "paslaugos pavadinimas", "amount": numeris}]
    }
  ]
}

Dokumentas:
${text.substring(0, 15000)}`,
        systemPrompt: "Tu esi dokumentų analizavimo asistentas. Grąžink TIK JSON formatą, be jokio papildomo teksto."
      }),
    });

    if (!response.ok) {
      console.log('AI parsing not available, falling back to regex');
      return [];
    }

    const result = await response.json();
    const aiResponse = result.response || '';
    
    const jsonMatch = aiResponse.match(/\{[\s\S]*"slips"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return (parsed.slips || []).map((s: any) => ({
        invoiceNumber: s.invoiceNumber || '',
        invoiceDate: s.invoiceDate || new Date().toISOString().split('T')[0],
        dueDate: s.dueDate || new Date().toISOString().split('T')[0],
        buyerName: s.buyerName || '',
        apartmentAddress: s.apartmentAddress || '',
        apartmentNumber: s.apartmentNumber || '',
        paymentCode: s.paymentCode || '',
        previousAmount: s.previousAmount || 0,
        paymentsReceived: s.paymentsReceived || 0,
        balance: s.balance || 0,
        accruedAmount: s.accruedAmount || s.totalDue || 0,
        totalDue: s.totalDue || 0,
        lineItems: s.lineItems || [],
        utilityReadings: s.utilityReadings || {}
      }));
    }
  } catch (error) {
    console.error('AI parsing error:', error);
  }
  
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { 
      parsedText, 
      excelData, 
      pdfBase64, 
      periodMonth, 
      pdfFileName, 
      pdfUrl, 
      useAI,
      action,
      slipsToSave
    } = await req.json();

    // SAVE action - save confirmed slips to database
    if (action === 'save' && slipsToSave) {
      console.log(`Saving ${slipsToSave.length} confirmed slips`);
      
      const { data: insertedSlips, error: insertError } = await supabase
        .from("payment_slips")
        .insert(slipsToSave)
        .select();

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const stats = {
        total: insertedSlips?.length || 0,
        matched: slipsToSave.filter((s: any) => s.resident_id).length,
        pending: slipsToSave.filter((s: any) => !s.resident_id).length
      };

      return new Response(JSON.stringify({ 
        success: true, 
        stats,
        slips: insertedSlips 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // PARSE action - parse and return for preview (default)
    let parsedSlips: ParsedSlip[] = [];
    let textToParse = parsedText || '';

    // If PDF base64 is provided, use AI to extract text
    if (pdfBase64 && !parsedText) {
      console.log("Processing PDF with AI...");
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        
        if (!LOVABLE_API_KEY) {
          console.log("LOVABLE_API_KEY not set, skipping AI parsing");
        } else {
          console.log("Calling Lovable AI for PDF parsing...");
          
          // Use larger chunk of PDF for better parsing - up to 200KB base64
          const pdfChunk = pdfBase64.substring(0, 200000);
          console.log(`Sending PDF chunk of ${pdfChunk.length} characters to AI`);
          
          const pdfTextPrompt = `Išanalizuok šį PDF mokėjimo lapelių dokumentą base64 formatu ir ištrauk VISUS mokėjimo lapelius. Dokumentas gali turėti daug puslapių su skirtingais lapeliais.

SVARBU: Ištrauk VISUS lapelius iš dokumento, ne tik pirmuosius!

Kiekvienam lapeliui grąžink JSON formatu:
{
  "slips": [
    {
      "invoiceNumber": "Serija-Numeris (pvz. TAUR-000582)",
      "invoiceDate": "YYYY-MM-DD",
      "dueDate": "YYYY-MM-DD", 
      "buyerName": "pirkėjo vardas/įmonė",
      "apartmentAddress": "pilnas adresas su butu",
      "apartmentNumber": "buto numeris (pvz. 01, 02, 10)",
      "paymentCode": "mokėtojo kodas",
      "previousAmount": 0,
      "paymentsReceived": 0,
      "balance": 0,
      "accruedAmount": priskaityta_suma,
      "totalDue": mokėtina_suma,
      "lineItems": [{"code": "T1", "name": "pavadinimas", "amount": suma}]
    }
  ]
}

PDF base64: ${pdfChunk}

Grąžink TIK JSON su VISAIS lapeliais!`;

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            },
              body: JSON.stringify({
                model: "google/gemini-2.5-pro",
                messages: [
                  { role: "system", content: "Tu esi dokumentų analizavimo asistentas. Ištrauk VISUS mokėjimo lapelius iš PDF dokumento. Grąžink TIK JSON formatą, be jokio papildomo teksto." },
                  { role: "user", content: pdfTextPrompt }
                ],
                max_tokens: 64000
              }),
          });

          if (aiResponse.ok) {
            const aiResult = await aiResponse.json();
            const aiText = aiResult.choices?.[0]?.message?.content || '';
            console.log("AI response received, length:", aiText.length);
            
            // Use the repair function to handle potentially malformed JSON
            const parsed = repairAndParseJSON(aiText);
            
            if (parsed && parsed.slips && parsed.slips.length > 0) {
              parsedSlips = parsed.slips.map((s: any) => ({
                invoiceNumber: s.invoiceNumber || '',
                invoiceDate: s.invoiceDate || new Date().toISOString().split('T')[0],
                dueDate: s.dueDate || new Date().toISOString().split('T')[0],
                buyerName: s.buyerName || '',
                apartmentAddress: s.apartmentAddress || '',
                apartmentNumber: String(s.apartmentNumber || '').padStart(2, '0'),
                paymentCode: s.paymentCode || '',
                previousAmount: parseNumber(String(s.previousAmount || 0)),
                paymentsReceived: parseNumber(String(s.paymentsReceived || 0)),
                balance: parseNumber(String(s.balance || 0)),
                accruedAmount: parseNumber(String(s.accruedAmount || s.totalDue || 0)),
                totalDue: parseNumber(String(s.totalDue || 0)),
                lineItems: (s.lineItems || []).map((item: any) => ({
                  code: item.code || '',
                  name: item.name || '',
                  unit: item.unit || 'vnt.',
                  quantity: item.quantity || 1,
                  rate: item.rate || 0,
                  amount: parseNumber(String(item.amount || 0))
                })),
                utilityReadings: s.utilityReadings || {}
              }));
              console.log(`AI parsed ${parsedSlips.length} slips successfully`);
            } else {
              console.log("No valid slips found in AI response, trying with smaller chunks...");
            }
          } else {
            const errorText = await aiResponse.text();
            console.log("AI parsing failed:", aiResponse.status, errorText);
          }
        }
      } catch (aiError) {
        console.error("AI PDF parsing error:", aiError);
      }
    }

    // Parse based on input type
    if (parsedSlips.length === 0 && excelData && Array.isArray(excelData)) {
      console.log(`Parsing Excel data with ${excelData.length} rows`);
      parsedSlips = parseExcelData(excelData);
    } else if (parsedSlips.length === 0 && textToParse) {
      if (useAI) {
        parsedSlips = await parseWithAI(textToParse, supabaseUrl, supabaseKey);
      }
      
      if (parsedSlips.length === 0) {
        console.log('AI parsing not available, falling back to regex');
        const slipTexts = splitIntoSlips(textToParse);
        console.log(`Split document into ${slipTexts.length} potential slips`);
        
        for (const slipText of slipTexts) {
          const parsed = parseSlipFromText(slipText);
          if (parsed) {
            parsedSlips.push(parsed);
          }
        }
      }
    }
    
    if (parsedSlips.length === 0 && !pdfBase64 && !excelData && !parsedText) {
      return new Response(JSON.stringify({ error: "No data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Successfully parsed ${parsedSlips.length} slips`);

    // Get all residents for matching
    const { data: residents } = await supabase
      .from("residents")
      .select("id, apartment_number, full_name, payment_code, linked_profile_id");

    const batchId = crypto.randomUUID();
    
    // Prepare slips with matching info for preview
    const previewSlips = parsedSlips.map((parsed, index) => {
      let matchedResident = null;
      let matchType = 'none';

      // First try apartment number
      if (parsed.apartmentNumber && residents) {
        matchedResident = residents.find(r => 
          r.apartment_number === parsed.apartmentNumber ||
          r.apartment_number === parsed.apartmentNumber.replace(/^0+/, '')
        );
        if (matchedResident) matchType = 'apartment_number';
      }

      // Then try payment code
      if (!matchedResident && parsed.paymentCode && residents) {
        matchedResident = residents.find(r => r.payment_code === parsed.paymentCode);
        if (matchedResident) matchType = 'payment_code';
      }

      // Then try name match
      if (!matchedResident && parsed.buyerName && residents) {
        const normalizedBuyer = parsed.buyerName.toLowerCase().trim();
        matchedResident = residents.find(r => 
          r.full_name?.toLowerCase().trim() === normalizedBuyer
        );
        if (matchedResident) matchType = 'name';
      }

      return {
        tempId: `temp-${index}`,
        slip: parsed,
        matchedResident: matchedResident ? {
          id: matchedResident.id,
          full_name: matchedResident.full_name,
          apartment_number: matchedResident.apartment_number
        } : null,
        matchType,
        // Pre-prepared data for saving
        dataForSave: {
          invoice_number: parsed.invoiceNumber,
          invoice_date: parsed.invoiceDate || new Date().toISOString().split('T')[0],
          due_date: parsed.dueDate || new Date().toISOString().split('T')[0],
          period_month: periodMonth || new Date().toISOString().split('T')[0].slice(0, 7) + '-01',
          buyer_name: parsed.buyerName,
          apartment_address: parsed.apartmentAddress,
          apartment_number: parsed.apartmentNumber,
          payment_code: parsed.paymentCode,
          previous_amount: parsed.previousAmount,
          payments_received: parsed.paymentsReceived,
          balance: parsed.balance,
          accrued_amount: parsed.accruedAmount,
          total_due: parsed.totalDue,
          line_items: parsed.lineItems,
          utility_readings: parsed.utilityReadings,
          pdf_url: pdfUrl,
          pdf_file_name: pdfFileName,
          resident_id: matchedResident?.id || null,
          profile_id: matchedResident?.linked_profile_id || null,
          assignment_status: matchedResident ? 'auto_matched' : 'pending',
          matched_by: matchType !== 'none' ? matchType : null,
          upload_batch_id: batchId,
          uploaded_by: user.id
        }
      };
    });

    if (previewSlips.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        preview: [],
        residents: [],
        stats: { total: 0, matched: 0, pending: 0 },
        message: "Nepavyko rasti mokėjimo lapelių duomenyse"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const stats = {
      total: previewSlips.length,
      matched: previewSlips.filter(r => r.matchedResident).length,
      pending: previewSlips.filter(r => !r.matchedResident).length,
      batchId
    };

    // Return preview data instead of saving immediately
    return new Response(JSON.stringify({ 
      success: true, 
      preview: previewSlips,
      residents: residents || [],
      stats,
      batchId
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Error in parse-payment-slips:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
