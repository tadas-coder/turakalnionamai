import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Recipient {
  name: string;
  email: string;
}

interface PollNotificationRequest {
  pollId: string;
  pollTitle: string;
  pollDescription: string | null;
  pollOptions: string[];
  endsAt: string | null;
  recipients: Recipient[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pollId, pollTitle, pollDescription, pollOptions, endsAt, recipients }: PollNotificationRequest = await req.json();

    console.log(`Sending poll notification for poll ${pollId} to ${recipients.length} recipients`);

    if (!recipients || recipients.length === 0) {
      console.log("No recipients provided");
      return new Response(
        JSON.stringify({ message: "No recipients to notify" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const portalUrl = "https://taurakalnionamai.lt";
    
    // Format end date if provided
    const endDateStr = endsAt 
      ? new Date(endsAt).toLocaleDateString("lt-LT", { year: 'numeric', month: 'long', day: 'numeric' })
      : null;

    // Build options list HTML
    const optionsHtml = pollOptions
      .map((opt, idx) => `<li style="margin: 8px 0; padding: 8px 12px; background: #f3f4f6; border-radius: 6px;">${idx + 1}. ${opt}</li>`)
      .join("");

    const results: { success: boolean; email: string; error?: string }[] = [];

    // Send emails in batches of 10 to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (recipient) => {
        try {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "DNSB Taurakalnio namai <info@taurakalnionamai.lt>",
              to: [recipient.email],
              subject: `Nauja apklausa: ${pollTitle}`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #1a5f2a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .poll-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
                    .poll-title { color: #1f2937; font-size: 18px; margin: 0 0 12px 0; font-weight: bold; }
                    .poll-description { color: #6b7280; margin: 0; }
                    .options-list { list-style: none; padding: 0; margin: 0; }
                    .deadline { color: #dc2626; font-weight: 500; margin: 15px 0; }
                    .button { display: inline-block; background-color: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                  </style>
                </head>
                <body>
                  <div class="header">
                    <h1 style="margin: 0;">📊 Nauja Apklausa</h1>
                  </div>
                  
                  <div class="content">
                    <p>Sveiki, <strong>${recipient.name || "Gerbiamas gyventojau"}</strong>!</p>
                    
                    <p>Jums skirta nauja apklausa:</p>
                    
                    <div class="poll-box">
                      <h2 class="poll-title">${pollTitle}</h2>
                      ${pollDescription ? `<p class="poll-description">${pollDescription}</p>` : ''}
                    </div>
                    
                    <p style="font-weight: 600; margin-bottom: 8px;">Atsakymo variantai:</p>
                    <ul class="options-list">
                      ${optionsHtml}
                    </ul>
                    
                    ${endDateStr ? `
                      <p class="deadline">
                        ⏰ Apklausa baigiasi: ${endDateStr}
                      </p>
                    ` : ''}
                    
                    <p style="text-align: center; margin-top: 25px;">
                      <a href="${portalUrl}/voting" class="button">
                        Balsuoti dabar
                      </a>
                    </p>
                    
                    <p>Pagarbiai,<br>DNSB Taurakalnio namai</p>
                  </div>
                  
                  <div class="footer">
                    <p>V. Mykolaičio-Putino g. 10, Vilnius</p>
                    <p>El. paštas: taurakalnionamai@gmail.com</p>
                  </div>
                </body>
                </html>
              `,
            }),
          });

          const result = await emailResponse.json();
          
          if (!emailResponse.ok) {
            console.error(`Failed to send to ${recipient.email}:`, result);
            return { success: false, email: recipient.email, error: result.message };
          }

          console.log(`Email sent to ${recipient.email}:`, result);
          return { success: true, email: recipient.email };
        } catch (error: any) {
          console.error(`Failed to send email to ${recipient.email}:`, error);
          return { success: false, email: recipient.email, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`Poll notification complete: ${successCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        message: `Sent ${successCount} emails, ${failedCount} failed`,
        sent: successCount,
        failed: failedCount,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-poll-notification function:", error);
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
