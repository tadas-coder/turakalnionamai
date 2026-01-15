import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  residentId: string;
  residentName: string;
  residentEmail: string;
  portalUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { residentId, residentName, residentEmail, portalUrl }: InvitationRequest = await req.json();

    console.log("Sending invitation to:", residentEmail);

    if (!residentEmail) {
      return new Response(
        JSON.stringify({ error: "El. pašto adresas nenurodytas" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate a unique invitation token
    const invitationToken = crypto.randomUUID();

    // Update the resident record with invitation info
    const { error: updateError } = await supabase
      .from("residents")
      .update({
        invitation_sent_at: new Date().toISOString(),
        invitation_token: invitationToken,
      })
      .eq("id", residentId);

    if (updateError) {
      console.error("Error updating resident:", updateError);
      throw updateError;
    }

    // Send the invitation email using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "DNSB Taurakalnio namai <info@taurakalnionamai.lt>",
        to: [residentEmail],
        subject: "Kvietimas prisijungti prie DNSB Taurakalnio namai savitarnos portalo",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #1a5f2a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background-color: #1a5f2a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>DNSB Taurakalnio namai</h1>
              </div>
              <div class="content">
                <p>Sveiki, <strong>${residentName || "Gerbiamas savininke"}</strong>!</p>
                
                <p>Kviečiame Jus prisijungti prie DNSB Taurakalnio namai savitarnos portalo, kuriame galėsite:</p>
                
                <ul>
                  <li>Peržiūrėti bendrijos naujienas ir pranešimus</li>
                  <li>Teikti pranešimus apie gedimus ar problemas</li>
                  <li>Dalyvauti balsavimuose</li>
                  <li>Peržiūrėti finansines ataskaitas</li>
                  <li>Matyti budėjimo grafikus</li>
                </ul>
                
                <p style="text-align: center;">
                  <a href="${portalUrl}/auth" class="button">Registruotis portale</a>
                </p>
                
                <p><strong>Svarbu:</strong> Registruodamiesi naudokite šį el. pašto adresą: <strong>${residentEmail}</strong></p>
                
                <p>Jei turite klausimų, susisiekite su bendrijos pirmininku.</p>
                
                <p>Pagarbiai,<br>DNSB Taurakalnio namai</p>
              </div>
              <div class="footer">
                <p>V. Mykolaičio-Putino g. 10, Vilnius</p>
                <p>El. paštas: taurakalnionamai@gmail.com</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    if (!emailResponse.ok) {
      throw new Error(emailResult.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-resident-invitation function:", error);
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
