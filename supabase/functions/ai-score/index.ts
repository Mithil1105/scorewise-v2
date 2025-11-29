import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScoreRequest {
  essay: string;
  examType: "GRE" | "IELTS";
  taskType?: "task1" | "task2";
  topic?: string;
}

interface ScoreResponse {
  score: number;
  feedback: string[];
  areas_to_improve: string[];
  word_count: number;
}

const DAILY_LIMIT = 3;

// Round to nearest 0.5
function roundToHalf(num: number): number {
  return Math.round(num * 2) / 2;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { essay, examType, taskType, topic } = await req.json() as ScoreRequest;
    
    console.log(`Scoring ${examType} essay, taskType: ${taskType}, word count: ${essay.trim().split(/\s+/).length}`);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let isAdmin = false;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (user && !userError) {
        userId = user.id;
        
        // Check if user is admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();
        
        isAdmin = !!roleData;
        
        // Check daily limit for non-admin users
        if (!isAdmin) {
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          
          const { count, error: countError } = await supabase
            .from("ai_usage_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("action", "ai_score")
            .gte("created_at", twentyFourHoursAgo);
          
          if (countError) {
            console.error("Error checking usage:", countError);
          } else if (count !== null && count >= DAILY_LIMIT) {
            return new Response(
              JSON.stringify({
                error: "Daily limit reached",
                message: "You have used all 3 daily AI evaluations. Try again tomorrow or become Pro!",
                remaining: 0,
              }),
              {
                status: 429,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        }
      }
    }

    // Validate essay length
    const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
    
    if (wordCount < 20) {
      return new Response(
        JSON.stringify({
          error: "Essay too short",
          message: "Please write more to receive a valid score. Minimum 20 words required.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      throw new Error("Gemini API key not configured");
    }

    // Build the prompt based on exam type
    let scoringScale: string;
    let criteria: string;

    if (examType === "GRE") {
      scoringScale = "1.0-6.0 (in 0.5 increments, e.g., 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0)";
      criteria = `
- Argument strength and development of ideas
- Organization and logical flow
- Language clarity and precision
- Use of specific examples and evidence`;
    } else {
      // IELTS
      scoringScale = "0.0-9.0 (in 0.5 increments, e.g., 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0)";
      if (taskType === "task1") {
        criteria = `
- Task Achievement (how well the response addresses the task)
- Coherence and Cohesion (logical organization, paragraphing)
- Lexical Resource (vocabulary range and accuracy)
- Grammatical Range and Accuracy`;
      } else {
        criteria = `
- Task Response (position, ideas, conclusions)
- Coherence and Cohesion (logical progression, linking)
- Lexical Resource (vocabulary range, collocation)
- Grammatical Range and Accuracy`;
      }
    }

    const prompt = `You are an automated essay scoring engine for ${examType} ${taskType ? `Writing ${taskType === 'task1' ? 'Task 1' : 'Task 2'}` : 'AWA'}.

SCORING SCALE: ${scoringScale}

EVALUATION CRITERIA:
${criteria}

You MUST respond with valid JSON only, no other text. Use this exact format:
{
  "score": <number with one decimal place>,
  "feedback": ["<point 1>", "<point 2>", "<point 3>"],
  "areas_to_improve": ["<improvement 1>", "<improvement 2>"]
}

Rules:
- Score MUST be a number with one decimal place (e.g., 5.0, 5.5, 6.0)
- Score must be in 0.5 increments only
- Provide exactly 3 feedback points (strengths or observations)
- Provide exactly 2 areas to improve
- Be constructive and specific
- Keep each point under 30 words

${topic ? `Essay Topic: ${topic}\n\n` : ''}Essay:
${essay}`;

    // Call Google Gemini API directly with retry logic
    let response: Response | null = null;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`Gemini API attempt ${attempt + 1}`);
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: prompt }]
                }
              ],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 500,
              },
            }),
          }
        );

        if (response.ok) break;
        
        if (response.status === 429) {
          console.log("Rate limited, waiting before retry...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        const errorText = await response.text();
        console.error(`Gemini API error: ${response.status}`, errorText);
        lastError = new Error(`API returned ${response.status}: ${errorText}`);
      } catch (e) {
        console.error("Fetch error:", e);
        lastError = e instanceof Error ? e : new Error("Unknown error");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error("Failed to get Gemini response after retries");
    }

    const geminiResponse = await response.json();
    console.log("Gemini response received");

    // Extract content from Gemini response format
    const content = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      console.error("Empty response from Gemini:", JSON.stringify(geminiResponse));
      throw new Error("Empty response from Gemini");
    }

    // Parse the JSON response
    let scoreData: ScoreResponse;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.slice(7);
      } else if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith("```")) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      cleanedContent = cleanedContent.trim();

      const parsed = JSON.parse(cleanedContent);
      
      // Round score to nearest 0.5
      let score = roundToHalf(Number(parsed.score));
      
      // Validate score is in valid range
      if (examType === "GRE") {
        score = Math.max(1, Math.min(6, score));
      } else {
        score = Math.max(0, Math.min(9, score));
      }

      scoreData = {
        score,
        feedback: Array.isArray(parsed.feedback) ? parsed.feedback.slice(0, 3) : [],
        areas_to_improve: Array.isArray(parsed.areas_to_improve) ? parsed.areas_to_improve.slice(0, 2) : [],
        word_count: wordCount,
      };
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", content);
      throw new Error("Failed to parse scoring response");
    }

    // Log usage for authenticated users
    if (userId) {
      const { error: logError } = await supabase
        .from("ai_usage_logs")
        .insert({
          user_id: userId,
          action: "ai_score",
          tokens_used: wordCount,
          exam_type: examType,
        });
      
      if (logError) {
        console.error("Failed to log usage:", logError);
      }
    }

    // Calculate remaining evaluations for non-admin users
    let remaining: number | undefined;
    if (userId && !isAdmin) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("ai_usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("action", "ai_score")
        .gte("created_at", twentyFourHoursAgo);
      
      remaining = count !== null ? Math.max(0, DAILY_LIMIT - count) : undefined;
    }

    console.log("Scoring complete:", scoreData.score);

    return new Response(JSON.stringify({ ...scoreData, remaining }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ai-score error:", e);
    return new Response(
      JSON.stringify({ 
        error: "Scoring failed", 
        message: e instanceof Error ? e.message : "Unknown error occurred" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});