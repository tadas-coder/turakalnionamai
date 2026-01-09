import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const workTypeLabels: Record<string, string> = {
  maintenance: "Priežiūra",
  repair: "Remontas",
  water_shutoff: "Vandens atjungimas",
  electricity_shutoff: "Elektros atjungimas",
  other: "Kita",
};

const workTypeEmoji: Record<string, string> = {
  maintenance: "🔧",
  repair: "🛠️",
  water_shutoff: "💧",
  electricity_shutoff: "⚡",
  other: "📋",
};

interface WorkNotificationRequest {
  title: string;
  description: string | null;
  work_type: string;
  start_date: string;
  end_date: string | null;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  };
  return date.toLocaleDateString("lt-LT", options);
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
  console.log("send-work-notification function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { title, description, work_type, start_date, end_date }: WorkNotificationRequest = await req.json();

    console.log("Work notification request:", { title, work_type, start_date, end_date });

    // Get all approved users' emails
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("approved", true);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw new Error("Failed to fetch user profiles");
    }

    if (!profiles || profiles.length === 0) {
      console.log("No approved users found to notify");
      return new Response(
        JSON.stringify({ message: "No users to notify", successful: 0, failed: 0 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Found ${profiles.length} approved users to notify`);

    const emoji = workTypeEmoji[work_type] || "📋";
    const typeLabel = workTypeLabels[work_type] || work_type;
    
    const dateInfo = end_date && end_date !== start_date
      ? `${formatDate(start_date)} – ${formatDate(end_date)}`
      : formatDate(start_date);

    let successful = 0;
    let failed = 0;
    const results: { email: string; success: boolean; error?: string }[] = [];

    // Send email to each user
    for (const profile of profiles) {
      try {
        let warningBlock = "";
        
        if (work_type === "water_shutoff") {
          warningBlock = `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;">
                <strong>⚠️ Dėmesio:</strong> Planuojamas vandens tiekimo pertraukimas. Rekomenduojame iš anksto pasirūpinti vandens atsargomis.
              </p>
            </div>
          `;
        } else if (work_type === "electricity_shutoff") {
          warningBlock = `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;">
                <strong>⚠️ Dėmesio:</strong> Planuojamas elektros tiekimo pertraukimas. Rekomenduojame iš anksto pasirūpinti ir išjungti jautrius elektros prietaisus.
              </p>
            </div>
          `;
        }

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Naujas planuojamas darbas</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${emoji} Planuojamas darbas</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="margin-top: 0;">Sveiki${profile.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!</p>
              
              <p>Informuojame apie naują planuojamą darbą jūsų name:</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
                <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 20px;">${title}</h2>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; width: 100px;">Tipas:</td>
                    <td style="padding: 8px 0; font-weight: 500;">${emoji} ${typeLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Data:</td>
                    <td style="padding: 8px 0; font-weight: 500;">${dateInfo}</td>
                  </tr>
                  ${description ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">Aprašymas:</td>
                    <td style="padding: 8px 0;">${description}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              ${warningBlock}
              
              <p style="margin-bottom: 0; color: #6b7280; font-size: 14px;">
                Daugiau informacijos rasite prisijungę prie bendrijos portalo.
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">Taurakalnio Namai</p>
              <p style="margin: 5px 0 0 0;">Šis laiškas sugeneruotas automatiškai.</p>
            </div>
          </body>
          </html>
        `;

        await sendEmail([profile.email], `${emoji} Naujas planuojamas darbas: ${title}`, html);
        
        console.log(`Email sent to ${profile.email}`);
        successful++;
        results.push({ email: profile.email, success: true });
      } catch (error: any) {
        console.error(`Failed to send email to ${profile.email}:`, error);
        failed++;
        results.push({ email: profile.email, success: false, error: error.message });
      }
    }

    console.log(`Notification complete: ${successful} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        message: `Pranešimai išsiųsti ${successful} gyventojams`,
        successful,
        failed,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-work-notification function:", error);
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
