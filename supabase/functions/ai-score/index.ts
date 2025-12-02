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
  task_response: number | null;
  coherence_cohesion: number | null;
  lexical_resource: number | null;
  grammar_range_accuracy: number | null;
  final_band: number;
  word_count: number;
  overall_comment: string;
  feedback: string[];
  improvements: string[];
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

    // Build the rigorous IELTS-official prompt
    const prompt = `You are an extremely strict and accurate scoring engine for ${examType} ${taskType ? (taskType === "task1" ? "IELTS Writing Task 1" : "IELTS Writing Task 2") : "GRE AWA"}. 

Your only job is to evaluate the essay using official scoring descriptors and output STRICT JSON.

===========================
 GLOBAL RULES
===========================
- Output MUST be valid JSON only.
- No markdown. No backticks. No explanation outside JSON.
- Every score MUST be in 0.5 increments.
- Feedback must be concrete and under 25 words per point.
- If JSON is malformed, regenerate internally but output only final JSON.

===========================
 JSON SCHEMA
===========================
{
  "task_response": number | null,
  "coherence_cohesion": number | null,
  "lexical_resource": number | null,
  "grammar_range_accuracy": number | null,
  "final_band": number,
  "word_count": ${wordCount},
  "overall_comment": "short summary",
  "feedback": ["strength1", "strength2", "strength3"],
  "improvements": ["weakness1", "weakness2", "weakness3"]
}

===========================
 IELTS OFFICIAL ANCHORS
===========================

TASK RESPONSE (TR)
9 = fully answers all parts thoroughly.
7 = addresses all parts but uneven development.
6 = addresses task but partially developed.
5 = partially addresses task, limited ideas.
4 = minimal addressing of task.

COHERENCE & COHESION (CC)
9 = seamless progression; logical & cohesive.
7 = well organized; good paragraphing.
6 = some progression issues.
5 = limited organization.

LEXICAL RESOURCE (LR)
9 = wide accurate vocabulary.
7 = good range, occasional misuse.
6 = adequate range, frequent errors.
5 = limited range and accuracy.

GRAMMAR RANGE & ACCURACY (GRA)
9 = wide structures, near-perfect accuracy.
7 = good control, some errors.
6 = mix of simple/complex, noticeable errors.
5 = frequent errors.

===========================
 TASK 1 RULES
===========================
If taskType is "task1":
- MUST include an overview sentence.
- NO opinions (I think, should, must, etc).
- NO causes/reasons (because, due to).
- MUST highlight comparisons.
- MUST maintain academic tone.
If overview missing → lower TR by 1 band.
If opinions present → lower TR by 1 band.

===========================
 TASK 2 RULES
===========================
If taskType is "task2":
- MUST have a clear position.
- MUST answer ALL parts of the question.
- MUST develop ideas logically.
- NO informal tone.
If fewer than 3 paragraphs → cap final_band at 6.0.

===========================
 GRE RULES
===========================
If examType is GRE:
- Ignore IELTS sub-scores.
- Score based on argument development, clarity, logic, evidence.
- Return task_response, coherence_cohesion, lexical_resource, grammar_range_accuracy as null.
- final_band = GRE score (1.0–6.0).

===========================
 NOW SCORE THIS ESSAY
===========================

${topic ? `Topic: ${topic}` : ""}
Essay:
${essay}`;

    // Call Google Gemini API directly with retry logic
    let response: Response | null = null;
    let lastError: Error | null = null;

    // Try cheapest models first (flash models are cheaper and faster)
    const modelsToTry = [
      { name: "gemini-flash-latest", version: "v1beta" }, // Cheapest and fastest
      { name: "gemini-2.5-flash", version: "v1beta" },
      { name: "gemini-2.0-flash", version: "v1beta" },
      { name: "gemini-2.0-flash-exp", version: "v1beta" },
      { name: "gemini-pro-latest", version: "v1beta" },
      { name: "gemini-2.5-pro", version: "v1beta" },
      { name: "gemini-3-pro-preview", version: "v1beta" },
    ];

    for (let modelIndex = 0; modelIndex < modelsToTry.length; modelIndex++) {
      const { name: modelName, version } = modelsToTry[modelIndex];

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          console.log(`Gemini API attempt ${attempt + 1} with model: ${modelName} (${version})`);
          const GEMINI_URL = `https://generativelanguage.googleapis.com/${version}/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
          response = await fetch(GEMINI_URL, {
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
                maxOutputTokens: 2500, // Increased to prevent MAX_TOKENS truncation
              },
            }),
          });

          if (response.ok) {
            console.log(`Successfully used model: ${modelName}`);
            break;
          }

          if (response.status === 429) {
            console.log("Rate limited, waiting before retry...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }

          // If 404, try next model
          if (response.status === 404) {
            const errorText = await response.text();
            console.log(`Model ${modelName} not found (404), trying next model...`);
            lastError = new Error(`Model ${modelName} not available: ${errorText}`);
            break; // Break inner loop to try next model
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

      // If we got a successful response, break out of model loop
      if (response && response.ok) {
        break;
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error("Failed to get Gemini response after retries");
    }

    const geminiResponse = await response.json();
    console.log("Gemini response received");

    // Check for finish reason
    const finishReason = geminiResponse.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      console.warn("Response was truncated due to MAX_TOKENS. Consider increasing maxOutputTokens.");
    }

    // Extract content from Gemini response format
    const content = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content || content.trim().length === 0) {
      console.error("Empty response from Gemini:", JSON.stringify(geminiResponse));
      console.error("Finish reason:", finishReason);
      throw new Error(`Empty response from Gemini. Finish reason: ${finishReason || "unknown"}`);
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

      // Initialize scores
      let taskResponse: number | null = null;
      let coherenceCohesion: number | null = null;
      let lexicalResource: number | null = null;
      let grammarRangeAccuracy: number | null = null;
      let finalBand: number;

      if (examType === "IELTS") {
        // Parse IELTS sub-scores
        taskResponse = parsed.task_response !== null && parsed.task_response !== undefined
          ? roundToHalf(Math.max(0, Math.min(9, Number(parsed.task_response))))
          : null;
        coherenceCohesion = parsed.coherence_cohesion !== null && parsed.coherence_cohesion !== undefined
          ? roundToHalf(Math.max(0, Math.min(9, Number(parsed.coherence_cohesion))))
          : null;
        lexicalResource = parsed.lexical_resource !== null && parsed.lexical_resource !== undefined
          ? roundToHalf(Math.max(0, Math.min(9, Number(parsed.lexical_resource))))
          : null;
        grammarRangeAccuracy = parsed.grammar_range_accuracy !== null && parsed.grammar_range_accuracy !== undefined
          ? roundToHalf(Math.max(0, Math.min(9, Number(parsed.grammar_range_accuracy))))
          : null;

        // Calculate final_band as average of 4 sub-scores
        if (taskResponse !== null && coherenceCohesion !== null && lexicalResource !== null && grammarRangeAccuracy !== null) {
          finalBand = roundToHalf((taskResponse + coherenceCohesion + lexicalResource + grammarRangeAccuracy) / 4);
        } else {
          // Fallback to parsed final_band if sub-scores missing
          finalBand = roundToHalf(Math.max(0, Math.min(9, Number(parsed.final_band || parsed.score || 0))));
        }

        // Apply Task 1 validation penalties
        if (taskType === "task1") {
          const essayLower = essay.toLowerCase();
          // Check for overview
          const hasOverview = /overall|in summary|in general|to summarize|in conclusion|to sum up/i.test(essayLower);
          if (!hasOverview && taskResponse !== null) {
            taskResponse = Math.max(0, roundToHalf(taskResponse - 1.0));
          }
          // Check for opinions
          const hasOpinions = /I think|I believe|should|must|recommend|I suggest|I feel|in my opinion/i.test(essayLower);
          if (hasOpinions && taskResponse !== null) {
            taskResponse = Math.max(0, roundToHalf(taskResponse - 1.0));
          }
          // Recalculate final_band after penalties
          if (taskResponse !== null && coherenceCohesion !== null && lexicalResource !== null && grammarRangeAccuracy !== null) {
            finalBand = roundToHalf((taskResponse + coherenceCohesion + lexicalResource + grammarRangeAccuracy) / 4);
          }
        }

        // Apply Task 2 paragraph penalty
        if (taskType === "task2") {
          const paragraphs = essay.split("\n\n").filter(p => p.trim().length > 0);
          if (paragraphs.length < 3) {
            finalBand = Math.min(finalBand, 6.0);
          }
        }

        // Ensure final_band is in valid range
        finalBand = Math.max(0, Math.min(9, finalBand));
      } else {
        // GRE scoring
        finalBand = roundToHalf(Math.max(1, Math.min(6, Number(parsed.final_band || parsed.score || 0))));
        // GRE sub-scores remain null
      }

      scoreData = {
        task_response: taskResponse,
        coherence_cohesion: coherenceCohesion,
        lexical_resource: lexicalResource,
        grammar_range_accuracy: grammarRangeAccuracy,
        final_band: finalBand,
        word_count: wordCount,
        overall_comment: parsed.overall_comment || parsed.comment || "Evaluation complete.",
        feedback: Array.isArray(parsed.feedback) ? parsed.feedback.slice(0, 3).filter((f: any) => typeof f === 'string' && f.trim().length > 0) : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 3).filter((i: any) => typeof i === 'string' && i.trim().length > 0) : [],
      };

      // Ensure we have exactly 3 feedback and 3 improvements
      while (scoreData.feedback.length < 3) {
        scoreData.feedback.push("No additional feedback provided.");
      }
      while (scoreData.improvements.length < 3) {
        scoreData.improvements.push("Continue practicing to improve.");
      }
      scoreData.feedback = scoreData.feedback.slice(0, 3);
      scoreData.improvements = scoreData.improvements.slice(0, 3);
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