import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegistrationNotificationRequest {
  userName: string;
  userEmail: string;
}

async function sendEmail(to: string[], subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Taurakalnio Namai <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received request to send-registration-notification");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userName, userEmail }: RegistrationNotificationRequest = await req.json();

    console.log("Processing registration notification for:", userEmail);

    const currentDate = new Date().toLocaleDateString("lt-LT");
    const currentTime = new Date().toLocaleTimeString("lt-LT");

    // Send email to admin
    const adminEmailResponse = await sendEmail(
      ["taurakalnionamai@gmail.com"],
      `Nauja registracija: ${userName}`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0d9488, #0891b2); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
            .value { margin-top: 4px; font-size: 14px; }
            .action-btn { display: inline-block; background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
            .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 20px;">👤 Nauja vartotojo registracija</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Taurakalnio Namai gyventojų portalas</p>
            </div>
            <div class="content">
              <p>Gautas naujas prašymas prisijungti prie gyventojų portalo.</p>
              
              <div class="field">
                <div class="label">Vardas, Pavardė</div>
                <div class="value"><strong>${userName}</strong></div>
              </div>
              <div class="field">
                <div class="label">El. paštas</div>
                <div class="value">${userEmail}</div>
              </div>
              <div class="field">
                <div class="label">Registracijos data</div>
                <div class="value">${currentDate} ${currentTime}</div>
              </div>
              
              <p style="margin-top: 20px;">Prisijunkite prie administravimo skydelio, kad patvirtintumėte arba atmestumėte šią registraciją.</p>
              
              <div class="footer">
                <p>Šis pranešimas automatiškai sugeneruotas iš Taurakalnio Namų gyventojų portalo.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    );

    console.log("Admin notification email sent successfully:", adminEmailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        adminEmail: adminEmailResponse,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-registration-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
