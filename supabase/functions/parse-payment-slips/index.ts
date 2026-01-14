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
  const pages = fullText.split(/## Page \d+/);
  const slips: string[] = [];
  let currentSlip = '';
  
  for (const page of pages) {
    if (page.includes('SĄSKAITA - FAKTŪRA') || page.includes('Serija:')) {
      if (currentSlip && currentSlip.includes('SĄSKAITA - FAKTŪRA')) {
        slips.push(currentSlip);
      }
      currentSlip = page;
    } else if (currentSlip) {
      currentSlip += '\n' + page;
    }
  }
  
  if (currentSlip && currentSlip.includes('SĄSKAITA - FAKTŪRA')) {
    slips.push(currentSlip);
  }
  
  return slips;
}

// Parse Excel data from rows
function parseExcelData(rows: any[]): ParsedSlip[] {
  const slips: ParsedSlip[] = [];
  
  // Try to find header row and map columns
  let headerRowIndex = -1;
  let columnMap: Record<string, number> = {};
  
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    if (!row) continue;
    
    const headers = Object.values(row).map(v => String(v || '').toLowerCase());
    
    // Look for common column names
    const hasInvoice = headers.some(h => h.includes('sąskait') || h.includes('nr') || h.includes('invoice'));
    const hasAmount = headers.some(h => h.includes('suma') || h.includes('amount') || h.includes('mokėti'));
    const hasApartment = headers.some(h => h.includes('but') || h.includes('adres') || h.includes('apart'));
    
    if (hasInvoice || hasAmount || hasApartment) {
      headerRowIndex = i;
      
      // Map columns
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
  
  // Parse data rows
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

// Use AI to parse complex documents
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
    
    // Try to extract JSON from response
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

    const { parsedText, excelData, periodMonth, pdfFileName, pdfUrl, useAI } = await req.json();

    let parsedSlips: ParsedSlip[] = [];

    // Parse based on input type
    if (excelData && Array.isArray(excelData)) {
      // Excel data provided
      console.log(`Parsing Excel data with ${excelData.length} rows`);
      parsedSlips = parseExcelData(excelData);
    } else if (parsedText) {
      // Try AI parsing first if enabled
      if (useAI) {
        parsedSlips = await parseWithAI(parsedText, supabaseUrl, supabaseKey);
      }
      
      // Fallback to regex parsing
      if (parsedSlips.length === 0) {
        const slipTexts = splitIntoSlips(parsedText);
        console.log(`Found ${slipTexts.length} payment slips in document`);
        
        for (const slipText of slipTexts) {
          const parsed = parseSlipFromText(slipText);
          if (parsed) {
            parsedSlips.push(parsed);
          }
        }
      }
    } else {
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
    const results: Array<{
      slip: ParsedSlip;
      resident: any;
      matchType: string;
    }> = [];

    for (const parsed of parsedSlips) {
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

      results.push({
        slip: parsed,
        resident: matchedResident,
        matchType
      });
    }

    // Insert all slips into database
    const slipsToInsert = results.map(({ slip, resident, matchType }) => ({
      invoice_number: slip.invoiceNumber,
      invoice_date: slip.invoiceDate || new Date().toISOString().split('T')[0],
      due_date: slip.dueDate || new Date().toISOString().split('T')[0],
      period_month: periodMonth || new Date().toISOString().split('T')[0].slice(0, 7) + '-01',
      buyer_name: slip.buyerName,
      apartment_address: slip.apartmentAddress,
      apartment_number: slip.apartmentNumber,
      payment_code: slip.paymentCode,
      previous_amount: slip.previousAmount,
      payments_received: slip.paymentsReceived,
      balance: slip.balance,
      accrued_amount: slip.accruedAmount,
      total_due: slip.totalDue,
      line_items: slip.lineItems,
      utility_readings: slip.utilityReadings,
      pdf_url: pdfUrl,
      pdf_file_name: pdfFileName,
      resident_id: resident?.id || null,
      profile_id: resident?.linked_profile_id || null,
      assignment_status: resident ? 'auto_matched' : 'pending',
      matched_by: matchType !== 'none' ? matchType : null,
      upload_batch_id: batchId,
      uploaded_by: user.id
    }));

    if (slipsToInsert.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        stats: { total: 0, matched: 0, pending: 0 },
        message: "Nepavyko rasti mokėjimo lapelių duomenyse"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: insertedSlips, error: insertError } = await supabase
      .from("payment_slips")
      .insert(slipsToInsert)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const stats = {
      total: results.length,
      matched: results.filter(r => r.resident).length,
      pending: results.filter(r => !r.resident).length,
      batchId
    };

    return new Response(JSON.stringify({ 
      success: true, 
      stats,
      slips: insertedSlips 
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
