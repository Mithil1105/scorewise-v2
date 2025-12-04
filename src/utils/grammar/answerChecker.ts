/**
 * Answer normalization and checking utilities for grammar exercises
 */

/**
 * Normalizes an answer string for comparison
 * - Converts to lowercase
 * - Trims whitespace
 * - Removes trailing punctuation
 * - Collapses multiple spaces
 */
export function normalizeAnswer(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:]+$/g, "") // strip trailing punctuation
    .replace(/\s+/g, " ");      // collapse multiple spaces
}

/**
 * Parses multiple correct answers from a string
 * Supports pipe-separated (|) or comma-separated answers
 * @param answerString - String containing one or more answers (e.g., "do not|don't" or "do not, don't")
 * @returns Array of normalized answer strings
 */
export function parseMultipleAnswers(answerString: string): string[] {
  // Support both pipe (|) and comma (,) separators
  const separators = /[|,]/;
  return answerString
    .split(separators)
    .map(ans => normalizeAnswer(ans))
    .filter(ans => ans.length > 0); // Remove empty strings
}

/**
 * Checks if a user answer is correct using exact match (default, zero cost)
 * Supports multiple correct answers separated by | or ,
 * @param userAnswer - The student's answer
 * @param correctAnswer - The correct answer(s) - can be single answer or multiple answers separated by | or ,
 * @returns true if user answer matches any of the correct answers after normalization
 */
export function checkAnswerExact(userAnswer: string, correctAnswer: string): boolean {
  const normalizedUserAnswer = normalizeAnswer(userAnswer);
  
  // Check if multiple answers are provided
  if (correctAnswer.includes('|') || correctAnswer.includes(',')) {
    const correctAnswers = parseMultipleAnswers(correctAnswer);
    return correctAnswers.some(ans => ans === normalizedUserAnswer);
  }
  
  // Single answer check
  return normalizedUserAnswer === normalizeAnswer(correctAnswer);
}

/**
 * Checks answer using AI (placeholder - requires Edge Function implementation)
 * @param question - The exercise question
 * @param correctAnswer - The correct answer(s) - can be single or multiple answers
 * @param userAnswer - The student's answer
 * @returns Promise<boolean> - true if correct, false otherwise
 */
export async function checkAnswerAI(
  question: string,
  correctAnswer: string,
  userAnswer: string
): Promise<boolean> {
  // TODO: Implement AI-based checking via Edge Function
  // For now, fallback to exact match (which supports multiple answers)
  console.warn("AI answer checking not yet implemented, using exact match");
  return checkAnswerExact(userAnswer, correctAnswer);
}

/**
 * Main answer checking function
 * Uses exact match by default, AI if enabled
 */
export async function checkAnswer(
  question: string,
  correctAnswer: string,
  userAnswer: string,
  useAI: boolean = false
): Promise<boolean> {
  if (useAI) {
    return await checkAnswerAI(question, correctAnswer, userAnswer);
  }
  return checkAnswerExact(userAnswer, correctAnswer);
}

