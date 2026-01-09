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

    // Send email to the approved user
    const userEmailResponse = await sendEmail(
      [userEmail],
      "Jūsų paskyra patvirtinta!",
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
            .action-btn { display: inline-block; background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
            .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 20px;">✅ Paskyra patvirtinta!</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Taurakalnio Namai gyventojų portalas</p>
            </div>
            <div class="content">
              <p>Gerbiamas(-a) ${userName},</p>
              <p>Džiaugiamės galėdami pranešti, kad jūsų paskyra <strong>Taurakalnio Namų gyventojų portale</strong> buvo sėkmingai patvirtinta!</p>
              <p>Dabar galite prisijungti ir naudotis visomis portalo funkcijomis:</p>
              <ul>
                <li>Peržiūrėti naujienas ir pranešimus</li>
                <li>Teikti pranešimus apie gedimus</li>
                <li>Dalyvauti balsavimuose</li>
                <li>Peržiūrėti dokumentus</li>
              </ul>
              <div class="footer">
                <p>Pagarbiai,<br>Taurakalnio Namų administracija</p>
                <p style="font-size: 11px; color: #9ca3af;">Jeigu turite klausimų, susisiekite: taurakalnionamai@gmail.com</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    );

    console.log("Approval notification email sent successfully:", userEmailResponse);

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
