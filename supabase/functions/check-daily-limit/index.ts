import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAILY_LIMIT = 2; // Changed from 3 to 2

// Get start of today (midnight) in UTC
function getTodayStartUTC(): Date {
    const now = new Date();
    const utcDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0
    ));
    return utcDate;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Get user from auth header
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({
                    error: "Unauthorized",
                    message: "Authentication required",
                    remaining: 0,
                }),
                {
                    status: 401,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const token = authHeader.replace("Bearer ", "");
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (!user || userError) {
            return new Response(
                JSON.stringify({
                    error: "Unauthorized",
                    message: "Invalid authentication token",
                    remaining: 0,
                }),
                {
                    status: 401,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const userId = user.id;

        // Check if user is admin
        const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .eq("role", "admin")
            .maybeSingle();

        const isAdmin = !!roleData;

        // Admins have unlimited access
        if (isAdmin) {
            return new Response(
                JSON.stringify({
                    remaining: null, // null means unlimited
                    limit: DAILY_LIMIT,
                    isAdmin: true,
                }),
                {
                    status: 200,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Get start of today (midnight UTC)
        const todayStart = getTodayStartUTC();
        const todayStartISO = todayStart.toISOString();

        // Count usage since midnight today
        const { count, error: countError } = await supabase
            .from("ai_usage_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("action", "ai_score")
            .gte("created_at", todayStartISO);

        if (countError) {
            console.error("Error checking usage:", countError);
            return new Response(
                JSON.stringify({
                    error: "Failed to check limit",
                    message: "An error occurred while checking your daily limit",
                    remaining: 0,
                }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const used = count !== null ? count : 0;
        const remaining = Math.max(0, DAILY_LIMIT - used);
        const hasReachedLimit = used >= DAILY_LIMIT;

        return new Response(
            JSON.stringify({
                remaining,
                used,
                limit: DAILY_LIMIT,
                hasReachedLimit,
                resetTime: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Next midnight
            }),
            {
                status: hasReachedLimit ? 429 : 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );

    } catch (e) {
        console.error("check-daily-limit error:", e);
        return new Response(
            JSON.stringify({
                error: "Internal server error",
                message: e instanceof Error ? e.message : "Unknown error occurred",
                remaining: 0,
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});

