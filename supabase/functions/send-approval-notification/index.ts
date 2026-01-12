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
      from: "Taurakalnio Namai <info@taurakalnionamai.lt>",
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

    // Send email directly to the approved user
    const userEmailResponse = await sendEmail(
      [userEmail],
      `Jūsų paskyra patvirtinta - Taurakalnio Namai`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .success-box { background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .button { display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 15px; }
            .footer { background: #f9fafb; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">🎉 Sveikiname!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Jūsų paskyra patvirtinta</p>
            </div>
            <div class="content">
              <p>Gerb. ${userName || "Gyventojau"},</p>
              <p>Džiaugiamės galėdami pranešti, kad Jūsų paskyra Taurakalnio Namų gyventojų portale buvo sėkmingai patvirtinta.</p>
              
              <div class="success-box">
                <p style="margin: 0; font-size: 18px; color: #22c55e;">✅ Paskyra aktyvuota</p>
                <p style="margin: 10px 0 0 0; color: #6b7280;">Dabar galite naudotis visomis portalo funkcijomis</p>
              </div>

              <p>Portale galite:</p>
              <ul>
                <li>Peržiūrėti ir teikti pranešimus apie gedimus</li>
                <li>Skaityti naujienas ir pranešimus</li>
                <li>Dalyvauti balsavimuose</li>
                <li>Peržiūrėti dokumentus ir tvarkaraščius</li>
              </ul>

              <p style="margin-top: 20px; color: #6b7280;">
                Jei turite klausimų, susisiekite su administracija el. paštu 
                <a href="mailto:taurakalnionamai@gmail.com">taurakalnionamai@gmail.com</a>
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">DNSB „Taurakalnio Namai"</p>
              <p style="margin: 5px 0 0 0;">Automatinis pranešimas</p>
            </div>
          </div>
        </body>
        </html>
      `
    );

    console.log("Approval notification email sent to user:", userEmailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        userEmail: userEmailResponse,
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
