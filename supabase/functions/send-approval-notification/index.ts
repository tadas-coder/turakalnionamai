import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalNotificationRequest {
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
  console.log("Received request to send-approval-notification");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userName, userEmail }: ApprovalNotificationRequest = await req.json();

    console.log("Processing approval notification for:", userEmail);

    // Send email to admin about approved user (temporary - until domain is verified in Resend)
    const ADMIN_EMAIL = "taurakalnionamai@gmail.com";
    
    const adminEmailResponse = await sendEmail(
      [ADMIN_EMAIL],
      `Vartotojas patvirtintas: ${userName || userEmail}`,
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
            .info-box { background: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 20px;">✅ Vartotojas patvirtintas</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Taurakalnio Namai gyventojų portalas</p>
            </div>
            <div class="content">
              <p>Šis vartotojas buvo sėkmingai patvirtintas ir dabar gali prisijungti prie portalo:</p>
              <div class="info-box">
                <p style="margin: 0;"><strong>Vardas:</strong> ${userName || "Nenurodyta"}</p>
                <p style="margin: 5px 0 0 0;"><strong>El. paštas:</strong> ${userEmail}</p>
              </div>
              <p style="font-size: 13px; color: #6b7280;">
                <em>Pastaba: Šis laiškas siunčiamas administratoriui, nes Resend domenas dar nepatvirtintas. 
                Patvirtinus domeną, laiškai bus siunčiami tiesiogiai vartotojams.</em>
              </p>
              <div class="footer">
                <p>Taurakalnio Namų administracija</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    );

    console.log("Approval notification email sent to admin:", adminEmailResponse);

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
    console.error("Error in send-approval-notification function:", error);
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
