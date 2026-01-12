import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-INVOICE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get request body
    const { invoiceId, invoiceIds } = await req.json();
    logStep("Request body", { invoiceId, invoiceIds });

    // Determine which invoices to pay
    let invoicesToPay: string[] = [];
    if (invoiceIds && Array.isArray(invoiceIds)) {
      invoicesToPay = invoiceIds;
    } else if (invoiceId && invoiceId !== "all") {
      invoicesToPay = [invoiceId];
    }

    // Fetch invoices from database
    let query = supabaseClient
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "paid");

    if (invoicesToPay.length > 0 && invoiceId !== "all") {
      query = query.in("id", invoicesToPay);
    }

    const { data: invoices, error: invoicesError } = await query;
    if (invoicesError) throw new Error(`Error fetching invoices: ${invoicesError.message}`);
    if (!invoices || invoices.length === 0) throw new Error("No unpaid invoices found");
    
    logStep("Invoices fetched", { count: invoices.length, total: invoices.reduce((s, i) => s + Number(i.amount), 0) });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // Create line items for each invoice
    const lineItems = invoices.map((invoice) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: invoice.title,
          description: `Sąskaita: ${invoice.title} (ID: ${invoice.id.slice(0, 8)})`,
        },
        unit_amount: Math.round(Number(invoice.amount) * 100), // Convert to cents
      },
      quantity: 1,
    }));

    // Create checkout session
    const origin = req.headers.get("origin") || "https://turakalnionamai.lovable.app";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/saskaitos?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/saskaitos?payment=cancelled`,
      metadata: {
        invoice_ids: invoices.map(i => i.id).join(","),
        user_id: user.id,
      },
      locale: "lt",
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
