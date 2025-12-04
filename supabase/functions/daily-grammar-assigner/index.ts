import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mixed source distribution (40% predefined, 40% custom, 20% AI)
const MIXED_DISTRIBUTION = {
  predefined: 0.4,
  custom: 0.4,
  ai: 0.2,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current UTC time
    const now = new Date();
    const currentTimeUTC = now.toISOString().split('T')[1].substring(0, 5); // HH:MM format
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // Fetch all teachers with daily config
    const { data: configs, error: configsError } = await supabase
      .from('grammar_daily_config')
      .select('*');

    if (configsError) {
      console.error("Error fetching daily configs:", configsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch configs" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!configs || configs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No daily configs found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let assignedCount = 0;
    const errors: string[] = [];

    for (const config of configs) {
      try {
        // Check if assignment time matches (within 1 hour window)
        const configTime = config.assign_time_utc.substring(0, 5); // HH:MM
        const timeDiff = Math.abs(
          (parseInt(currentTimeUTC.split(':')[0]) * 60 + parseInt(currentTimeUTC.split(':')[1])) -
          (parseInt(configTime.split(':')[0]) * 60 + parseInt(configTime.split(':')[1]))
        );

        // Only process if within 1 hour window
        if (timeDiff > 60) {
          continue;
        }

        // Get students for this teacher
        const { data: dailyStudents, error: studentsError } = await supabase
          .from('grammar_daily_students')
          .select('student_id')
          .eq('teacher_id', config.teacher_id);

        if (studentsError) {
          errors.push(`Error fetching students for teacher ${config.teacher_id}: ${studentsError.message}`);
          continue;
        }

        if (!dailyStudents || dailyStudents.length === 0) {
          continue; // No students configured
        }

        // Check if already assigned today (idempotent check)
        const { data: existingLog } = await supabase
          .from('grammar_daily_assignment_log')
          .select('id')
          .eq('teacher_id', config.teacher_id)
          .eq('date', today)
          .limit(1);

        if (existingLog && existingLog.length > 0) {
          continue; // Already assigned today
        }

        // Get exercises based on source type
        const exercises = await getExercisesForSource(
          supabase,
          config.source,
          config.question_count,
          config.teacher_id
        );

        if (exercises.length === 0) {
          errors.push(`No exercises found for teacher ${config.teacher_id} with source ${config.source}`);
          continue;
        }

        const exerciseIds = exercises.map(ex => ex.id);

        // Create assignment log for each student
        const assignmentLogs = dailyStudents.map(ds => ({
          teacher_id: config.teacher_id,
          student_id: ds.student_id,
          date: today,
          exercise_ids: exerciseIds
        }));

        const { error: insertError } = await supabase
          .from('grammar_daily_assignment_log')
          .insert(assignmentLogs);

        if (insertError) {
          errors.push(`Error inserting assignment log for teacher ${config.teacher_id}: ${insertError.message}`);
          continue;
        }

        assignedCount += dailyStudents.length;
      } catch (error) {
        errors.push(`Error processing teacher ${config.teacher_id}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${configs.length} teachers, assigned to ${assignedCount} students`,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("daily-grammar-assigner error:", e);
    return new Response(
      JSON.stringify({
        error: "Failed to assign daily grammar",
        message: e instanceof Error ? e.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function getExercisesForSource(
  supabase: any,
  source: string,
  questionCount: number,
  teacherId: string
): Promise<any[]> {
  const exercises: any[] = [];

  if (source === 'predefined') {
    const { data } = await supabase
      .from('predefined_exercises')
      .select('*')
      .limit(questionCount * 2) // Get more than needed for randomization
      .order('created_at', { ascending: false });

    if (data) {
      // Randomly select questionCount exercises
      const shuffled = data.sort(() => 0.5 - Math.random());
      exercises.push(...shuffled.slice(0, questionCount));
    }
  } else if (source === 'custom') {
    // Get teacher's institute_id
    const { data: teacherMember } = await supabase
      .from('institution_members')
      .select('institution_id')
      .eq('user_id', teacherId)
      .eq('role', 'teacher')
      .maybeSingle();

    if (teacherMember) {
      const { data } = await supabase
        .from('grammar_exercises')
        .select('*')
        .eq('institute_id', teacherMember.institution_id)
        .eq('source', 'custom')
        .limit(questionCount * 2)
        .order('created_at', { ascending: false });

      if (data) {
        const shuffled = data.sort(() => 0.5 - Math.random());
        exercises.push(...shuffled.slice(0, questionCount));
      }
    }
  } else if (source === 'ai') {
    // Generate AI exercises (placeholder - requires implementation)
    // TODO: Call AI generation Edge Function
    console.warn("AI exercise generation not yet implemented");
    // For now, fallback to custom
    return getExercisesForSource(supabase, 'custom', questionCount, teacherId);
  } else if (source === 'mixed') {
    // Distribute across sources
    const predefinedCount = Math.ceil(questionCount * MIXED_DISTRIBUTION.predefined);
    const customCount = Math.ceil(questionCount * MIXED_DISTRIBUTION.custom);
    const aiCount = questionCount - predefinedCount - customCount;

    const predefined = await getExercisesForSource(supabase, 'predefined', predefinedCount, teacherId);
    const custom = await getExercisesForSource(supabase, 'custom', customCount, teacherId);
    // TODO: AI exercises
    const ai: any[] = [];

    exercises.push(...predefined, ...custom, ...ai);
  }

  return exercises;
}

