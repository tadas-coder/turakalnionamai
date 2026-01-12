import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Invoice {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  status: string;
  user_id: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting invoice reminder check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date and calculate reminder dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const reminderDays = [7, 3, 1]; // Send reminders 7, 3, and 1 day(s) before due date
    
    let totalEmailsSent = 0;
    const results: { day: number; emails: number; errors: string[] }[] = [];

    for (const days of reminderDays) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      console.log(`Checking invoices due on ${targetDateStr} (${days} day(s) from now)...`);

      // Get unpaid invoices due on the target date
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .eq("due_date", targetDateStr)
        .neq("status", "paid");

      if (invoicesError) {
        console.error("Error fetching invoices:", invoicesError);
        results.push({ day: days, emails: 0, errors: [invoicesError.message] });
        continue;
      }

      if (!invoices || invoices.length === 0) {
        console.log(`No unpaid invoices due on ${targetDateStr}`);
        results.push({ day: days, emails: 0, errors: [] });
        continue;
      }

      console.log(`Found ${invoices.length} unpaid invoice(s) due on ${targetDateStr}`);

      const dayErrors: string[] = [];
      let dayEmailsSent = 0;

      for (const invoice of invoices as Invoice[]) {
        if (!invoice.user_id) {
          console.log(`Invoice ${invoice.id} has no user_id, skipping...`);
          continue;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("id", invoice.user_id)
          .single();

        if (profileError || !profile) {
          console.error(`Error fetching profile for user ${invoice.user_id}:`, profileError);
          dayErrors.push(`Profile not found for user ${invoice.user_id}`);
          continue;
        }

        const userProfile = profile as Profile;
        const userName = userProfile.full_name || "Gerbiamas gyventojau";
        const formattedAmount = new Intl.NumberFormat('lt-LT', { 
          style: 'currency', 
          currency: 'EUR' 
        }).format(invoice.amount);
        const formattedDueDate = new Date(invoice.due_date).toLocaleDateString('lt-LT');

        let urgencyText = "";
        let subjectPrefix = "";
        if (days === 1) {
          urgencyText = "⚠️ RYTOJ yra paskutinė diena apmokėti šią sąskaitą!";
          subjectPrefix = "⚠️ SKUBU: ";
        } else if (days === 3) {
          urgencyText = "Liko tik 3 dienos iki mokėjimo termino.";
          subjectPrefix = "Priminimas: ";
        } else {
          urgencyText = "Liko 7 dienos iki mokėjimo termino.";
          subjectPrefix = "";
        }

        try {
          const emailResponse = await resend.emails.send({
            from: "Taurakalnio Namai <info@taurakalnionamai.lt>",
            to: [userProfile.email],
            subject: `${subjectPrefix}Sąskaitos mokėjimo terminas artėja - ${invoice.title}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">🏠 Taurakalnio Namai</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Sąskaitos priminimas</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                  <p style="font-size: 16px;">Sveiki, <strong>${userName}</strong>!</p>
                  
                  <p style="font-size: 15px;">${urgencyText}</p>
                  
                  <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea;">
                    <h3 style="margin: 0 0 15px 0; color: #333;">${invoice.title}</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #666;">Suma:</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333; font-size: 18px;">${formattedAmount}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666;">Mokėjimo terminas:</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${days === 1 ? '#e74c3c' : '#333'};">${formattedDueDate}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <div style="text-align: center; margin: 25px 0;">
                    <a href="https://taurakalnionamai.lt/invoices" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">
                      Peržiūrėti sąskaitas
                    </a>
                  </div>
                  
                  <p style="font-size: 14px; color: #666; margin-top: 25px;">
                    Jei jau apmokėjote šią sąskaitą, prašome nekreipti dėmesio į šį priminimą.
                  </p>
                  
                  <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                  
                  <p style="font-size: 12px; color: #999; text-align: center;">
                    Šis laiškas buvo išsiųstas automatiškai iš Taurakalnio Namų valdymo sistemos.<br>
                    © ${new Date().getFullYear()} Taurakalnio Namai
                  </p>
                </div>
              </body>
              </html>
            `,
          });

          console.log(`Reminder email sent to ${userProfile.email} for invoice ${invoice.id}:`, emailResponse);
          dayEmailsSent++;
          totalEmailsSent++;
        } catch (emailError: any) {
          console.error(`Error sending email to ${userProfile.email}:`, emailError);
          dayErrors.push(`Failed to send to ${userProfile.email}: ${emailError.message}`);
        }
      }

      results.push({ day: days, emails: dayEmailsSent, errors: dayErrors });
    }

    console.log(`Invoice reminder check completed. Total emails sent: ${totalEmailsSent}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalEmailsSent,
        results,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invoice-reminders function:", error);
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
