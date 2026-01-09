import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusNotificationRequest {
  ticketTitle: string;
  ticketDescription: string;
  ticketCategory: string;
  ticketLocation: string | null;
  oldStatus: string;
  newStatus: string;
  updatedAt: string;
}

const statusLabels: { [key: string]: string } = {
  new: "Naujas",
  in_progress: "Vykdomas",
  resolved: "Išspręstas",
  closed: "Uždarytas",
};

const categoryLabels: { [key: string]: string } = {
  doors: "Durų problemos",
  water: "Vandentiekio problemos",
  walls: "Sienų pažeidimai",
  electricity: "Elektros problemos",
  heating: "Šildymo problemos",
  elevator: "Lifto problemos",
  security: "Saugumo problemos",
  cleanliness: "Švaros problemos",
  other: "Kita",
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case "new": return "#ef4444";
    case "in_progress": return "#f59e0b";
    case "resolved": return "#22c55e";
    case "closed": return "#6b7280";
    default: return "#6b7280";
  }
};

async function sendEmail(to: string[], subject: string, html: string) {
  console.log(`Sending email to: ${to.join(", ")}`);
  const res = await fetch("https://api.resend.com/emails", {
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
  const data = await res.json();
  console.log("Resend API response:", data);
  return data;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send status notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      ticketTitle,
      ticketDescription,
      ticketCategory,
      ticketLocation,
      oldStatus,
      newStatus,
      updatedAt,
    }: StatusNotificationRequest = await req.json();

    console.log(`Status change: ${oldStatus} -> ${newStatus} for ticket: ${ticketTitle}`);

    const oldStatusLabel = statusLabels[oldStatus] || oldStatus;
    const newStatusLabel = statusLabels[newStatus] || newStatus;
    const categoryLabel = categoryLabels[ticketCategory] || ticketCategory;
    const newStatusColor = getStatusColor(newStatus);
    const formattedDate = new Date(updatedAt).toLocaleString("lt-LT");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .status-badge { padding: 8px 16px; border-radius: 20px; color: white; font-weight: 600; display: inline-block; }
          .detail-row { padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
          .detail-label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
          .detail-value { margin-top: 4px; color: #1f2937; }
          .footer { background: #f9fafb; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🔄 Būsenos pakeitimas</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Pranešimo būsena buvo atnaujinta</p>
          </div>
          <div class="content">
            <h2 style="margin-top: 0; color: #1e3a5f;">${ticketTitle}</h2>
            
            <div style="text-align: center; margin: 25px 0;">
              <span class="status-badge" style="background: ${getStatusColor(oldStatus)};">${oldStatusLabel}</span>
              <span style="font-size: 24px; color: #6b7280; margin: 0 10px;">→</span>
              <span class="status-badge" style="background: ${newStatusColor};">${newStatusLabel}</span>
            </div>

            <div class="detail-row">
              <div class="detail-label">Kategorija</div>
              <div class="detail-value">${categoryLabel}</div>
            </div>

            ${ticketLocation ? `
            <div class="detail-row">
              <div class="detail-label">Vieta / Butas</div>
              <div class="detail-value">${ticketLocation}</div>
            </div>
            ` : ''}

            <div class="detail-row">
              <div class="detail-label">Aprašymas</div>
              <div class="detail-value">${ticketDescription}</div>
            </div>

            <div class="detail-row">
              <div class="detail-label">Atnaujinta</div>
              <div class="detail-value">${formattedDate}</div>
            </div>
          </div>
          <div class="footer">
            <p style="margin: 0;">DNSB „Taurakalnio Namai"</p>
            <p style="margin: 5px 0 0 0;">Automatinis pranešimas apie būsenos pakeitimą</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const adminEmail = await sendEmail(
      ["taurakalnionamai@gmail.com"],
      `Būsenos pakeitimas: ${ticketTitle}`,
      emailHtml
    );

    console.log("Admin notification email sent:", adminEmail);

    return new Response(
      JSON.stringify({ success: true, adminEmail }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-status-notification function:", error);
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
