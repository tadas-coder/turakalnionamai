import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketNotificationRequest {
  ticketId: string;
  title: string;
  description: string;
  category: string;
  location: string;
  reporterName: string;
  reporterEmail: string;
}

const categoryLabels: { [key: string]: string } = {
  doors: "Durų problemos",
  water: "Vandentiekio/kanalizacijos problemos",
  walls: "Sienų/lubų pažeidimai",
  electricity: "Elektros problemos",
  heating: "Šildymo problemos",
  elevator: "Lifto problemos",
  security: "Saugumo problemos",
  cleanliness: "Švaros problemos",
  other: "Kita",
};

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
  console.log("Received request to send-ticket-notification");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      ticketId,
      title,
      description,
      category,
      location,
      reporterName,
      reporterEmail,
    }: TicketNotificationRequest = await req.json();

    console.log("Processing ticket notification for:", ticketId);

    const categoryLabel = categoryLabels[category] || category;
    const currentDate = new Date().toLocaleDateString("lt-LT");

    // Send email to admin
    const adminEmailResponse = await sendEmail(
      ["taurakalnionamai@gmail.com"],
      `Naujas pranešimas: ${title}`,
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
            .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 20px;">🔔 Naujas pranešimas apie gedimą</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Taurakalnio Namai gyventojų portalas</p>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Pranešimo pavadinimas</div>
                <div class="value"><strong>${title}</strong></div>
              </div>
              <div class="field">
                <div class="label">Kategorija</div>
                <div class="value">${categoryLabel}</div>
              </div>
              <div class="field">
                <div class="label">Buto numeris</div>
                <div class="value">${location}</div>
              </div>
              <div class="field">
                <div class="label">Aprašymas</div>
                <div class="value">${description}</div>
              </div>
              <div class="field">
                <div class="label">Pranešėjas</div>
                <div class="value">${reporterName} (${reporterEmail})</div>
              </div>
              <div class="field">
                <div class="label">Data</div>
                <div class="value">${currentDate}</div>
              </div>
              <div class="footer">
                <p>Šis pranešimas automatiškai sugeneruotas iš Taurakalnio Namų gyventojų portalo.</p>
                <p>Pranešimo ID: ${ticketId}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    );

    console.log("Admin email sent successfully:", adminEmailResponse);

    // Send confirmation email to the reporter
    const reporterEmailResponse = await sendEmail(
      [reporterEmail],
      `Jūsų pranešimas gautas: ${title}`,
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
            .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 20px;">✅ Pranešimas gautas</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Taurakalnio Namai</p>
            </div>
            <div class="content">
              <p>Gerbiamas(-a) ${reporterName},</p>
              <p>Jūsų pranešimas apie <strong>"${title}"</strong> sėkmingai gautas.</p>
              <p>Mūsų administratorius peržiūrės jūsų pranešimą ir netrukus su jumis susisieks.</p>
              <p>Ačiū, kad pranešėte apie problemą!</p>
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

    console.log("Reporter confirmation email sent:", reporterEmailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        adminEmail: adminEmailResponse,
        reporterEmail: reporterEmailResponse,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-ticket-notification function:", error);
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
