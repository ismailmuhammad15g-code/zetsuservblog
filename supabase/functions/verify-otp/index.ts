import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OTPRequest {
  email: string;
  action: "send" | "verify" | "reset_password" | "register" | "confirm_email";
  code?: string;
  newPassword?: string;
  password?: string;
  fullName?: string;
  type?: "register" | "reset";
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Strict list of allowed email domains (Whitelist)
const ALLOWED_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'windowslive.com',
  'yahoo.com', 'ymail.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.es', 'yahoo.it', 'yahoo.de',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com',
  'protonmail.com', 'proton.me',
  'zoho.com',
  'gmx.com', 'gmx.net', 'gmx.de',
  'mail.com',
  'yandex.com', 'yandex.ru'
]);

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

function validateEmailFormat(email: string): boolean {
  if (!email || email.length > 254) return false;
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return false;
  const localPart = email.substring(0, atIndex);
  if (localPart.length > 64 || localPart.length === 0) return false;
  if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
  if (localPart.includes('..')) return false;
  return EMAIL_REGEX.test(email.toLowerCase());
}

function isAllowedEmail(email: string): boolean {
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return false;
  const domain = email.substring(atIndex + 1).toLowerCase();
  return ALLOWED_DOMAINS.has(domain);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, action, code, newPassword, password, fullName, type }: OTPRequest = await req.json();

    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !validateEmailFormat(normalizedEmail)) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!isAllowedEmail(normalizedEmail)) {
      return new Response(
        JSON.stringify({ error: "Disposable email addresses are not supported. Please use a major provider like Gmail, Outlook, or Yahoo." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "send") {
      // Check for existing user logic removed for 'send' to prevent enumeration, 
      // EXCEPT for reset password where we must check.
      if (type === "reset") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (!profile) {
          return new Response(
            JSON.stringify({ error: "No account found with this email address" }),
            { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      } else {
        // For registration/signup, verify no existing user
        // However, allow 'confirm_email' to proceed if unverified.
        // For now, simplify: if register flow, check unique.
        if (type === 'register' || !type) { // default 
          // actually, 'send' is generic.
          // If user exists but unconfirmed, we might want to resend?
          // Supabase allows duplicate signup if unconfirmed usually (it resends).
          // But here we block duplicates.
          // We will assume 'send' works.
        }
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await supabase.from("otp_codes").delete().eq("email", normalizedEmail);

      const { error: insertError } = await supabase.from("otp_codes").insert({
        email: normalizedEmail,
        code: otp,
        expires_at: expiresAt.toISOString(),
      });

      if (insertError) {
        console.error("Error inserting OTP:", insertError);
        throw new Error("Failed to generate verification code");
      }

      // Send email
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

      const subject = type === "reset" ? "Reset your Password" : "Your ZetsuServ Verification Code";
      const title = type === "reset" ? "Reset Your Password" : "Verify your email";
      const messageText = type === "reset"
        ? "Use the code below to reset your password. If you didn't request this, you can safely ignore this email."
        : "Enter this verification code to complete your registration:";

      await client.send({
        from: `ZetsuServ <${Deno.env.get("GMAIL_USER")}>`,
        to: email,
        subject: subject,
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
              <h1>${title}</h1>
              <p>${messageText}</p>
              <div class="code">
                <span>${otp}</span>
              </div>
              <p>This code will expire in 10 minutes.</p>
              <div class="footer">
                <p>© ${new Date().getFullYear()} ZetsuServ. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      await client.close();

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

      const { data: otpRecord, error: fetchError } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("code", code)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      console.log("OTP Verify Debug:", { email: normalizedEmail, code, otpRecord, fetchError });

      if (fetchError || !otpRecord) {
        console.error("OTP verification failed:", { fetchError, otpRecord, emailQueried: normalizedEmail, codeQueried: code });
        return new Response(
          JSON.stringify({ error: "Invalid or expired verification code", verified: false }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      await supabase.from("otp_codes").update({ verified: true }).eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({ success: true, verified: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } else if (action === "reset_password") {
      // ... existing reset logic ...
      if (!code || !newPassword) {
        return new Response(
          JSON.stringify({ error: "Code and new password are required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: otpRecord, error: fetchError } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("code", code)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (fetchError || !otpRecord) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired verification code" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      await supabase.from("otp_codes").delete().eq("id", otpRecord.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (!profile) {
        return new Response(
          JSON.stringify({ error: "User profile not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        profile.id,
        { password: newPassword }
      );

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to update password" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Password updated successfully" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } else if (action === "register") {
      // ... register logic ...
      if (!password || !fullName) {
        return new Response(
          JSON.stringify({ error: "Password and name are required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: otpRecord } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("verified", true)
        .maybeSingle();

      if (!otpRecord) {
        return new Response(
          JSON.stringify({ error: "Email verification required before registration" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName
        }
      });

      if (createError) {
        console.error("Create user error:", createError);
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      await supabase.from("otp_codes").delete().eq("email", normalizedEmail);

      return new Response(
        JSON.stringify({ success: true, user: userData.user }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } else if (action === "confirm_email") {
      // Manual confirmation for existing accounts
      if (!code) {
        return new Response(
          JSON.stringify({ error: "Code is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: otpRecord } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("code", code)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!otpRecord) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired code" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Find user
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (!profile) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Confirm Email via Admin API
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        profile.id,
        { email_confirm: true }
      );

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to confirm email" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      await supabase.from("otp_codes").delete().eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({ success: true, message: "Email confirmed" }),
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
