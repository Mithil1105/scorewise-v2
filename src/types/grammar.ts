/**
 * TypeScript types for Grammar Module
 */

export type GrammarSourceType = 'predefined' | 'custom' | 'ai' | 'mixed';
export type GrammarTopicType = 'predefined' | 'institute';
export type GrammarAssignmentType = 'daily' | 'manual' | 'self_practice';
export type GrammarExerciseSourceType = 'predefined' | 'custom' | 'ai';

// Predefined Topics (Global)
export interface PredefinedTopic {
  id: string;
  topic_key: string;
  topic_name: string;
  topic_description: string;
  created_at: string;
}

// Predefined Exercises (Global)
export interface PredefinedExercise {
  id: string;
  topic_id: string;
  question: string;
  answer: string;
  difficulty: number;
  created_at: string;
}

// Institute Grammar Topics
export interface GrammarTopic {
  id: string;
  institute_id: string;
  topic_name: string;
  topic_description: string;
  created_by: string | null;
  created_at: string;
}

// Institute Grammar Exercises
export interface GrammarExercise {
  id: string;
  institute_id: string;
  topic_id: string | null;
  question: string;
  answer: string;
  source: 'custom' | 'ai';
  difficulty: number;
  use_ai_check: boolean;
  created_by: string | null;
  created_at: string;
}

// Daily Practice Configuration
export interface GrammarDailyConfig {
  id: string;
  teacher_id: string;
  source: GrammarSourceType;
  question_count: number;
  assign_time_utc: string; // Time format HH:MM:SS
  created_at: string;
  updated_at: string;
}

// Daily Practice Students
export interface GrammarDailyStudent {
  id: string;
  teacher_id: string;
  student_id: string;
  created_at: string;
}

// Daily Assignment Log
export interface GrammarDailyAssignmentLog {
  id: string;
  teacher_id: string;
  student_id: string;
  date: string; // Date format YYYY-MM-DD
  exercise_ids: string[];
  created_at: string;
}

// Manual Assignments
export interface GrammarManualAssignment {
  id: string;
  teacher_id: string;
  institute_id: string;
  title: string;
  source_type: GrammarSourceType;
  topic_type: GrammarTopicType;
  topic_id: string | null;
  batch_ids: string[] | null;
  student_ids: string[] | null;
  exercise_ids: string[];
  due_date: string | null;
  created_at: string;
}

// Grammar Attempts
export interface GrammarAttempt {
  id: string;
  student_id: string;
  assignment_type: GrammarAssignmentType;
  assignment_id: string | null;
  exercise_id: string;
  exercise_source_type: GrammarExerciseSourceType;
  user_answer: string;
  is_correct: boolean;
  score: number;
  submitted_at: string;
}

// Combined types for UI
export interface GrammarTopicWithExercises extends GrammarTopic {
  exercise_count?: number;
}

export interface PredefinedTopicWithExercises extends PredefinedTopic {
  exercise_count?: number;
}

export interface GrammarExerciseWithTopic extends GrammarExercise {
  topic?: GrammarTopic | PredefinedTopic;
}

export interface GrammarAssignmentWithDetails extends GrammarManualAssignment {
  topic?: GrammarTopic | PredefinedTopic;
  exercise_count?: number;
  completed_count?: number;
}

