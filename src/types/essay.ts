export interface LocalEssay {
  localId: string;
  examType: 'GRE' | 'IELTS-Task1' | 'IELTS-Task2';
  topic: string;
  essayText: string;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  aiScore?: number;
  aiFeedback?: string;
  cloudId?: string;
  syncedAt?: string;
  institutionId?: string;
  institutionMemberId?: string;
}

export interface LocalImage {
  localId: string;
  essayLocalId: string;
  imageBase64: string;
  imageType: string;
  createdAt: string;
  cloudId?: string;
}

export interface CloudEssay {
  id: string;
  user_id: string;
  exam_type: string;
  topic: string | null;
  essay_text: string | null;
  created_at: string;
  updated_at: string;
  word_count: number | null;
  ai_score: number | null;
  ai_feedback: string | null;
  local_id: string | null;
  institution_id: string | null;
  institution_member_id: string | null;
  task1_image_url: string | null;
  storage_size_kb: number | null;
}

export interface CloudImage {
  id: string;
  essay_id: string | null;
  user_id: string;
  image_base64: string | null;
  image_type: string | null;
  created_at: string;
}
