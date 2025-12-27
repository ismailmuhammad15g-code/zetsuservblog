import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OTPRequest {
  email: string;
  action: "send" | "verify";
  code?: string;
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, action, code }: OTPRequest = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "send") {
      // Generate OTP
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Delete old OTPs for this email
      await supabase.from("otp_codes").delete().eq("email", email);

      // Insert new OTP
      const { error: insertError } = await supabase.from("otp_codes").insert({
        email,
        code: otp,
        expires_at: expiresAt.toISOString(),
      });

      if (insertError) {
        console.error("Error inserting OTP:", insertError);
        throw new Error("Failed to generate verification code");
      }

      // Send email via Gmail SMTP
      const client = new SMTPClient({
        connection: {
          hostname: "smtp.gmail.com",
          port: 465,
          tls: true,
          auth: {
            username: Deno.env.get("GMAIL_USER") || "",
            password: Deno.env.get("GMAIL_APP_PASSWORD") || "",
          },
        },
      });

      await client.send({
        from: `ZetsuServ <${Deno.env.get("GMAIL_USER")}>`,
        to: email,
        subject: "Your ZetsuServ Verification Code",
        content: "auto",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 40px 20px; }
              .container { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
              .logo { font-size: 24px; font-weight: 700; color: #0a0a0a; margin-bottom: 32px; }
              h1 { font-size: 20px; color: #0a0a0a; margin: 0 0 16px; }
              p { color: #666; line-height: 1.6; margin: 0 0 24px; }
              .code { background: #f0f0f0; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
              .code span { font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0a0a0a; font-family: monospace; }
              .footer { font-size: 13px; color: #999; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">ZetsuServ</div>
              <h1>Verify your email</h1>
              <p>Enter this verification code to complete your registration:</p>
              <div class="code">
                <span>${otp}</span>
              </div>
              <p>This code will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
              <div class="footer">
                <p>© ${new Date().getFullYear()} ZetsuServ. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      await client.close();
      console.log(`OTP sent to ${email}`);

      return new Response(
        JSON.stringify({ success: true, message: "Verification code sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } else if (action === "verify") {
      if (!code) {
        return new Response(
          JSON.stringify({ error: "Verification code is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get OTP from database
      const { data: otpRecord, error: fetchError } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("email", email)
        .eq("code", code)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (fetchError || !otpRecord) {
        console.log("OTP verification failed:", fetchError);
        return new Response(
          JSON.stringify({ error: "Invalid or expired verification code" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Mark as verified
      await supabase
        .from("otp_codes")
        .update({ verified: true })
        .eq("id", otpRecord.id);

      console.log(`OTP verified for ${email}`);

      return new Response(
        JSON.stringify({ success: true, verified: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in verify-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
