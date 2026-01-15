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

interface NotificationRequest {
  newsId: string;
  newsTitle: string;
  newsContent: string;
  recipients: Recipient[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { newsId, newsTitle, newsContent, recipients }: NotificationRequest = await req.json();

    console.log(`Sending news notification for "${newsTitle}" to ${recipients.length} recipients`);

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "Gavėjų sąrašas tuščias" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const portalUrl = "https://taurakalnionamai.lt";
    const truncatedContent = newsContent.length > 500 
      ? newsContent.substring(0, 500) + "..." 
      : newsContent;

    // Send emails in batches to avoid rate limiting
    const batchSize = 10;
    const results = [];

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const emailPromises = batch.map(async (recipient) => {
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
              subject: `Naujiena: ${newsTitle}`,
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
                    .news-title { color: #1a5f2a; font-size: 20px; margin-bottom: 15px; }
                    .news-content { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1a5f2a; }
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
                      <p>Sveiki, <strong>${recipient.name || "Gerbiamas gyventojau"}</strong>!</p>
                      
                      <p>Norime Jus informuoti apie naują pranešimą:</p>
                      
                      <h2 class="news-title">${newsTitle}</h2>
                      
                      <div class="news-content">
                        <p>${truncatedContent.replace(/\n/g, '<br>')}</p>
                      </div>
                      
                      <p style="text-align: center;">
                        <a href="${portalUrl}/news" class="button">Skaityti daugiau portale</a>
                      </p>
                      
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

          const result = await emailResponse.json();
          
          if (!emailResponse.ok) {
            console.error(`Failed to send to ${recipient.email}:`, result);
            return { email: recipient.email, success: false, error: result.message };
          }
          
          console.log(`Email sent to ${recipient.email}:`, result);
          return { email: recipient.email, success: true, id: result.id };
        } catch (error: any) {
          console.error(`Error sending to ${recipient.email}:`, error);
          return { email: recipient.email, success: false, error: error.message };
        }
      });

      const batchResults = await Promise.all(emailPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Notification complete: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-news-notification function:", error);
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
