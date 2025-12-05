/**
 * Utility functions for parsing MCQ (Multiple Choice Question) format
 */

export interface MCQOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface ParsedMCQ {
  questionText: string;
  options: MCQOptions;
  correctAnswer: string; // Can be "A", "B", "C", "D" or the full answer text
  isMCQ: boolean;
}

/**
 * Parses a question string to detect if it's an MCQ and extract options
 * Format: "Question text [A) option1 B) option2 C) option3 D) option4] -> Answer Letter) Answer Text"
 * or: "Question text [A) option1 B) option2 C) option3 D) option4] -> B) will be announced"
 */
export function parseMCQ(question: string, answer: string): ParsedMCQ {
  // Check if question contains MCQ format: [A) ... B) ... C) ... D) ...]
  const mcqPattern = /\[A\)\s*(.+?)\s+B\)\s*(.+?)\s+C\)\s*(.+?)\s+D\)\s*(.+?)\]/i;
  const match = question.match(mcqPattern);

  if (!match) {
    return {
      questionText: question,
      options: { A: '', B: '', C: '', D: '' },
      correctAnswer: answer,
      isMCQ: false
    };
  }

  // Extract options
  const options: MCQOptions = {
    A: match[1].trim(),
    B: match[2].trim(),
    C: match[3].trim(),
    D: match[4].trim()
  };

  // Remove MCQ options from question text
  const questionText = question.replace(mcqPattern, '').trim();

  // Parse correct answer - could be "A", "B", "C", "D" or full answer text
  let correctAnswer = answer.trim();
  
  // Check if answer is in format "Letter) Answer Text" (e.g., "B) will be announced")
  const answerMatch = answer.match(/^([A-D])\)\s*(.+)$/i);
  if (answerMatch) {
    const letter = answerMatch[1].toUpperCase();
    const answerText = answerMatch[2].trim();
    
    // Return both letter and text for flexibility
    correctAnswer = `${letter}) ${answerText}`;
  }

  return {
    questionText,
    options,
    correctAnswer,
    isMCQ: true
  };
}

/**
 * Checks if a user's MCQ answer is correct
 * Supports multiple correct answers separated by | or ,
 */
export function checkMCQAnswer(userAnswer: string, correctAnswer: string, options: MCQOptions): boolean {
  // Normalize user answer
  const normalizedUser = userAnswer.trim().toUpperCase();
  
  // Parse correct answer(s)
  const correctAnswers = correctAnswer.includes('|') || correctAnswer.includes(',')
    ? correctAnswer.split(/[|,]/).map(a => a.trim())
    : [correctAnswer.trim()];
  
  // Check if user selected a letter (A, B, C, D)
  if (['A', 'B', 'C', 'D'].includes(normalizedUser)) {
    // Check each correct answer to see if user's letter matches
    for (const correct of correctAnswers) {
      // Extract letter from correct answer format "Letter) Answer Text"
      const letterMatch = correct.match(/^([A-D])\)/i);
      if (letterMatch) {
        const correctLetter = letterMatch[1].toUpperCase();
        // User's selected letter must match the correct letter
        if (normalizedUser === correctLetter) {
          return true;
        }
      } else {
        // If correct answer doesn't have letter format, check if it matches the option text
        // Find which option matches the correct answer text
        const optionKeys: (keyof MCQOptions)[] = ['A', 'B', 'C', 'D'];
        for (const key of optionKeys) {
          const optionText = options[key].toLowerCase().trim();
          const correctText = correct.toLowerCase().trim();
          // If this option matches the correct answer text, check if user selected this option
          if (optionText === correctText && normalizedUser === key) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  // If user provided full text answer (not just a letter), check against options
  const normalizedUserText = userAnswer.toLowerCase().trim();
  
  for (const correct of correctAnswers) {
    // Remove letter prefix if present
    const answerText = correct.replace(/^[A-D]\)\s*/i, '').trim().toLowerCase();
    
    // Check if user's text matches the correct answer text directly
    if (normalizedUserText === answerText) {
      return true;
    }
    
    // Check if user's text matches any option that is correct
    const optionKeys: (keyof MCQOptions)[] = ['A', 'B', 'C', 'D'];
    for (const key of optionKeys) {
      const optionText = options[key].toLowerCase().trim();
      // If this option matches the correct answer text AND user's answer matches this option
      if (optionText === answerText && normalizedUserText === optionText) {
        return true;
      }
    }
  }
  
  return false;
}

