import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  slipId: string;
  residentId: string;
  profileId?: string;
  periodMonth: string;
  totalDue: number;
  invoiceNumber: string;
  dueDate: string;
  portalUrl?: string;
}

interface BulkNotificationRequest {
  slips: NotificationRequest[];
  portalUrl?: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("lt-LT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("lt-LT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const formatPeriod = (periodMonth: string): string => {
  try {
    const date = new Date(periodMonth);
    return date.toLocaleDateString("lt-LT", {
      year: "numeric",
      month: "long",
    });
  } catch {
    return periodMonth;
  }
};

const PRIMARY_FROM = "DNSB Taurakalnio namai <info@taurakalnionamai.lt>";
const FALLBACK_FROM = "DNSB Taurakalnio namai <onboarding@resend.dev>";

const parseJsonSafely = (raw: string): any => {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { _raw: raw };
  }
};

const isDomainNotVerifiedError = (result: any): boolean => {
  const msg = typeof result?.message === "string" ? result.message : "";
  return msg.toLowerCase().includes("domain is not verified");
};

const sendResendEmail = async (payload: Record<string, unknown>) => {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  const result = parseJsonSafely(text);

  return {
    ok: res.ok,
    status: res.status,
    result,
  };
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Trūksta el. pašto konfigūracijos (RESEND_API_KEY)",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    const body: Partial<BulkNotificationRequest & NotificationRequest> =
      parseJsonSafely(rawBody);

    // Handle both single and bulk requests
    const slips: NotificationRequest[] = (body as any).slips ||
      ((body as any).slipId ? [body as NotificationRequest] : []);
    const portalUrl = (body as any).portalUrl || "https://turakalnionamai.lovable.app";

    if (slips.length === 0) {
      console.log("No slips to notify about");
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          message: "Nėra lapelių pranešimui",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Processing ${slips.length} payment slip notifications`);

    // Get resident details for all slips with profile_id
    const profileIds = slips.filter((s) => s.profileId).map((s) => s.profileId);
    const residentIds = slips.filter((s) => s.residentId).map((s) => s.residentId);

    const residentsWithEmail: Map<string, { email: string; name: string }> =
      new Map();

    // Get emails from profiles (linked users)
    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", profileIds);

      if (profiles) {
        for (const profile of profiles) {
          if (profile.email) {
            residentsWithEmail.set(profile.id, {
              email: profile.email,
              name: profile.full_name || "Gerbiamas savininke",
            });
          }
        }
      }
    }

    // Get emails from residents table for those without profile
    if (residentIds.length > 0) {
      const { data: residents } = await supabase
        .from("residents")
        .select("id, email, full_name, linked_profile_id")
        .in("id", residentIds);

      if (residents) {
        for (const resident of residents) {
          // If resident has linked profile, use profile email (already fetched above)
          if (
            resident.linked_profile_id &&
            residentsWithEmail.has(resident.linked_profile_id)
          ) {
            continue;
          }

          // Otherwise use resident email
          if (resident.email && !residentsWithEmail.has(resident.id)) {
            residentsWithEmail.set(resident.id, {
              email: resident.email,
              name: resident.full_name || "Gerbiamas savininke",
            });
          }
        }
      }
    }

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Send emails for each slip
    for (const slip of slips) {
      const recipientKey = slip.profileId || slip.residentId;
      const recipient = residentsWithEmail.get(recipientKey);

      if (!recipient?.email) {
        console.log(`No email found for slip ${slip.slipId}, skipping`);
        continue;
      }

      try {
        console.log(
          `Sending notification to ${recipient.email} for slip ${slip.slipId}`
        );

        const payload = {
          to: [recipient.email],
          subject: `Naujas mokėjimo lapelis - ${formatPeriod(slip.periodMonth)}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #1a5f2a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                .amount-box { background-color: white; border: 2px solid #1a5f2a; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
                .amount { font-size: 32px; font-weight: bold; color: #1a5f2a; }
                .details { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
                .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                .details-row:last-child { border-bottom: none; }
                .button { display: inline-block; background-color: #1a5f2a; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 6px; margin-top: 15px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">DNSB Taurakalnio namai</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Mokėjimo lapelis</p>
                </div>
                <div class="content">
                  <p>Sveiki, <strong>${recipient.name}</strong>!</p>
                  <p>Jums priskirtas naujas mokėjimo lapelis už <strong>${formatPeriod(slip.periodMonth)}</strong>.</p>

                  <div class="amount-box">
                    <p style="margin: 0 0 10px 0; color: #666;">Mokėtina suma:</p>
                    <div class="amount">${formatCurrency(slip.totalDue)}</div>
                  </div>

                  <div class="details">
                    <div class="details-row">
                      <span>Sąskaitos Nr.:</span>
                      <strong>${slip.invoiceNumber}</strong>
                    </div>
                    <div class="details-row">
                      <span>Apmokėti iki:</span>
                      <strong>${formatDate(slip.dueDate)}</strong>
                    </div>
                    <div class="details-row">
                      <span>Periodas:</span>
                      <strong>${formatPeriod(slip.periodMonth)}</strong>
                    </div>
                  </div>

                  <p style="text-align: center;">
                    <a href="${portalUrl}/profile" class="button">Peržiūrėti detalią informaciją</a>
                  </p>

                  <div class="warning">
                    <strong>⏰ Primename:</strong> Apmokėkite sąskaitą iki ${formatDate(slip.dueDate)}, kad išvengtumėte delspinigių.
                  </div>

                  <p style="margin-top: 25px;">Pagarbiai,<br><strong>DNSB Taurakalnio namai</strong></p>
                </div>
                <div class="footer">
                  <p>V. Mykolaičio-Putino g. 10, Vilnius</p>
                  <p>El. paštas: taurakalnionamai@gmail.com</p>
                  <p style="margin-top: 10px; font-size: 11px; color: #999;">
                    Šis laiškas išsiųstas automatiškai. Jei turite klausimų, kreipkitės į bendrijos pirmininką.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        };

        // 1) Try sending from your custom domain
        let res = await sendResendEmail({ ...payload, from: PRIMARY_FROM });

        // 2) If this API key/account still doesn't have the domain verified, fallback to resend.dev
        if (!res.ok && isDomainNotVerifiedError(res.result)) {
          console.warn(
            "Domain not verified for current API key; retrying with resend.dev sender"
          );
          res = await sendResendEmail({ ...payload, from: FALLBACK_FROM });
        }

        if (res.ok) {
          console.log(`Email sent successfully to ${recipient.email}:`, res.result);
          sentCount++;
        } else {
          console.error(`Failed to send email to ${recipient.email}:`, res.result);
          errors.push(
            `${recipient.email}: ${res.result?.message || `HTTP ${res.status}`}`
          );
          failedCount++;
        }
      } catch (error: any) {
        console.error(`Error sending email for slip ${slip.slipId}:`, error);
        errors.push(`${recipient.email}: ${error.message}`);
        failedCount++;
      }
    }

    console.log(`Notification summary: sent=${sentCount}, failed=${failedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-payment-slip-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
