import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RECIPIENT_EMAIL = "mithil20056mistry@gmail.com";

interface ContactFormData {
    name: string;
    email: string;
    role: string;
    message: string;
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            },
        });
    }

    try {
        // Initialize Supabase client with service role for database access
        // Contact form can be submitted anonymously, but we use service role for DB writes
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        // Use service role key for database operations (bypasses RLS)
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

        // Parse request body
        const { name, email, role, message }: ContactFormData = await req.json();

        // Validate required fields
        if (!name || !email || !role || !message) {
            return new Response(
                JSON.stringify({ error: "Missing required fields" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                }
            );
        }

        // Save to database first
        const { error: dbError } = await supabaseClient
            .from("contact_messages")
            .insert({
                name,
                email,
                role,
                message,
            });

        if (dbError) {
            console.error("Database error:", dbError);
            // Continue even if DB insert fails
        }

        // Send email using Resend API if available, otherwise use a simple email service
        let emailSent = false;
        let emailError = null;

        if (RESEND_API_KEY) {
            try {
                const emailResponse = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${RESEND_API_KEY}`,
                    },
                    body: JSON.stringify({
                        from: "ScoreWise <noreply@scorewise.mithilmistry.tech>",
                        to: [RECIPIENT_EMAIL],
                        reply_to: email,
                        subject: `New Contact Form Submission: ${role} - ${name}`,
                        html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e3a8a;">New Contact Form Submission</h2>
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Name:</strong> ${name}</p>
                  <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                  <p><strong>Role/Inquiry Type:</strong> ${role}</p>
                  <p><strong>Message:</strong></p>
                  <p style="white-space: pre-wrap; background-color: white; padding: 15px; border-radius: 4px; margin-top: 10px;">${message}</p>
                </div>
                <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
                  This email was sent from the ScoreWise contact form.
                </p>
              </div>
            `,
                        text: `
New Contact Form Submission

Name: ${name}
Email: ${email}
Role/Inquiry Type: ${role}

Message:
${message}

---
This email was sent from the ScoreWise contact form.
            `,
                    }),
                });

                if (emailResponse.ok) {
                    emailSent = true;
                } else {
                    const errorText = await emailResponse.text();
                    emailError = `Resend API error: ${emailResponse.status} - ${errorText}`;
                    console.error("Resend API error:", errorText);
                }
            } catch (err) {
                emailError = err instanceof Error ? err.message : "Unknown error";
                console.error("Error sending email via Resend:", err);
            }
        } else {
            // Fallback: Log email details for manual sending or use Supabase email
            console.error("RESEND_API_KEY not configured. Email not sent. Details:", {
                to: RECIPIENT_EMAIL,
                from: email,
                subject: `New Contact Form Submission: ${role} - ${name}`,
                body: `Name: ${name}\nEmail: ${email}\nRole: ${role}\n\nMessage:\n${message}`,
            });

            // Email was NOT sent - this is important to track
            emailSent = false;
            emailError = "RESEND_API_KEY not configured. Please set it in Supabase secrets to enable email sending.";
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "Contact form submitted successfully",
                emailSent,
                emailError: emailError || undefined,
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    } catch (error) {
        console.error("Error in send-contact-email function:", error);
        return new Response(
            JSON.stringify({
                error: "Internal server error",
                message: error instanceof Error ? error.message : "Unknown error",
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    }
});

