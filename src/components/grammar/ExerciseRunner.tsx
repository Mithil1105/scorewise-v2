import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, ArrowRight, Loader2 } from "lucide-react";
import { checkAnswer } from "@/utils/grammar/answerChecker";
import { parseMCQ, checkMCQAnswer, ParsedMCQ } from "@/utils/grammar/mcqParser";
import { GrammarExerciseSourceType } from "@/types/grammar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Exercise {
  id: string;
  question: string;
  answer: string;
  use_ai_check?: boolean;
  exercise_set_id?: string;
  exercise_set_title?: string;
}

interface ExerciseRunnerProps {
  exercises: Exercise[];
  exerciseSourceType: GrammarExerciseSourceType;
  assignmentType: 'daily' | 'manual' | 'self_practice';
  assignmentId?: string;
  onComplete?: (results: Array<{ exerciseId: string; isCorrect: boolean; userAnswer: string }>) => void;
  onExit?: () => void;
}

export function ExerciseRunner({
  exercises,
  exerciseSourceType,
  assignmentType,
  assignmentId,
  onComplete,
  onExit
}: ExerciseRunnerProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [showResult, setShowResult] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentExercise = exercises[currentIndex];
  const currentAnswer = userAnswers[currentExercise.id] || "";
  const isLastExercise = currentIndex === exercises.length - 1;
  const allAnswered = exercises.every(ex => userAnswers[ex.id]?.trim());
  
  // Parse MCQ format if present
  const parsedMCQ: ParsedMCQ = parseMCQ(currentExercise.question, currentExercise.answer);

  const handleCheck = async () => {
    if (!currentAnswer.trim()) return;

    setIsChecking(true);
    try {
      let isCorrect: boolean;
      
      // Use MCQ checking if it's an MCQ
      if (parsedMCQ.isMCQ) {
        isCorrect = checkMCQAnswer(currentAnswer, parsedMCQ.correctAnswer, parsedMCQ.options);
      } else {
        // Use regular answer checking for fill-in-the-blank and rewrite
        isCorrect = await checkAnswer(
          currentExercise.question,
          currentExercise.answer,
          currentAnswer,
          currentExercise.use_ai_check || false
        );
      }

      setResults(prev => ({ ...prev, [currentExercise.id]: isCorrect }));
      setShowResult(true);
    } catch (error) {
      console.error("Error checking answer:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleNext = () => {
    if (isLastExercise) {
      handleSubmit();
    } else {
      setCurrentIndex(prev => prev + 1);
      setShowResult(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    setIsSubmitting(true);
    try {
      // Save all attempts to database
      const attemptResults = exercises.map(ex => ({
        exerciseId: ex.id,
        isCorrect: results[ex.id] || false,
        userAnswer: userAnswers[ex.id] || ""
      }));

      // Get exercise_set_id from first exercise (all exercises in a set should have same exercise_set_id)
      const exerciseSetId = exercises.length > 0 && exercises[0].exercise_set_id 
        ? exercises[0].exercise_set_id 
        : null;

      // Save attempts to grammar_attempts table
      const attempts = attemptResults.map(result => {
        const exercise = exercises.find(ex => ex.id === result.exerciseId);
        return {
          student_id: user.id,
          assignment_type: assignmentType,
          assignment_id: assignmentId || null,
          exercise_id: result.exerciseId,
          exercise_set_id: exerciseSetId || exercise?.exercise_set_id || null,
          question_id: result.exerciseId,
          exercise_source_type: exerciseSourceType,
          user_answer: result.userAnswer,
          is_correct: result.isCorrect,
          score: result.isCorrect ? 1.0 : 0.0
        };
      });

      const { error: attemptsError } = await supabase
        .from('grammar_attempts')
        .insert(attempts);

      if (attemptsError) {
        console.error("Error saving attempts:", attemptsError);
        // Still call onComplete even if save fails
      }

      // Create or update completion record if exercise_set_id is available
      if (exerciseSetId) {
        const totalQuestions = attemptResults.length;
        const correctAnswers = attemptResults.filter(r => r.isCorrect).length;
        const incorrectAnswers = totalQuestions - correctAnswers;
        const score = correctAnswers;

        const { error: completionError } = await supabase
          .from('grammar_exercise_completions')
          .upsert({
            student_id: user.id,
            exercise_set_id: exerciseSetId,
            assignment_type: assignmentType,
            assignment_id: assignmentId || null,
            total_questions: totalQuestions,
            correct_answers: correctAnswers,
            incorrect_answers: incorrectAnswers,
            score: score
          }, {
            onConflict: 'student_id,exercise_set_id,assignment_type,assignment_id'
          });

        if (completionError) {
          console.error("Error saving completion:", completionError);
        }
      }

      if (onComplete) {
        onComplete(attemptResults);
      }
    } catch (error) {
      console.error("Error submitting attempts:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCorrect = results[currentExercise.id];
  const hasResult = showResult && currentExercise.id in results;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Exercise {currentIndex + 1} of {exercises.length}</CardTitle>
          {onExit && (
            <Button variant="ghost" size="sm" onClick={onExit}>
              Exit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-lg font-medium">{parsedMCQ.isMCQ ? parsedMCQ.questionText : currentExercise.question}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Your Answer</label>
          
          {parsedMCQ.isMCQ ? (
            // MCQ: Show radio buttons
            <RadioGroup
              value={currentAnswer}
              onValueChange={(value) => {
                setUserAnswers(prev => ({ ...prev, [currentExercise.id]: value }));
                setShowResult(false);
              }}
              disabled={hasResult}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="A" id="option-a" />
                <Label htmlFor="option-a" className="flex-1 cursor-pointer">
                  <span className="font-semibold mr-2">A)</span>
                  {parsedMCQ.options.A}
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="B" id="option-b" />
                <Label htmlFor="option-b" className="flex-1 cursor-pointer">
                  <span className="font-semibold mr-2">B)</span>
                  {parsedMCQ.options.B}
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="C" id="option-c" />
                <Label htmlFor="option-c" className="flex-1 cursor-pointer">
                  <span className="font-semibold mr-2">C)</span>
                  {parsedMCQ.options.C}
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="D" id="option-d" />
                <Label htmlFor="option-d" className="flex-1 cursor-pointer">
                  <span className="font-semibold mr-2">D)</span>
                  {parsedMCQ.options.D}
                </Label>
              </div>
            </RadioGroup>
          ) : (
            // Fill-in-the-blank or Rewrite: Show textarea
            <Textarea
              value={currentAnswer}
              onChange={(e) => {
                setUserAnswers(prev => ({ ...prev, [currentExercise.id]: e.target.value }));
                setShowResult(false);
              }}
              placeholder="Type your answer here..."
              className="min-h-[100px]"
              disabled={hasResult}
            />
          )}
        </div>

        {hasResult && (
          <div className={`p-4 rounded-lg border-2 ${
            isCorrect 
              ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
              : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-semibold ${isCorrect ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                {isCorrect ? "Correct!" : "Incorrect"}
              </span>
            </div>
            {!isCorrect && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">Correct answer{parsedMCQ.isMCQ || currentExercise.answer.includes('|') || currentExercise.answer.includes(',') ? 's' : ''}:</p>
                <div className="font-medium">
                  {parsedMCQ.isMCQ ? (
                    <div className="mt-2">
                      {parsedMCQ.correctAnswer.includes('|') || parsedMCQ.correctAnswer.includes(',') ? (
                        <ul className="list-disc list-inside space-y-1">
                          {(parsedMCQ.correctAnswer.includes('|') 
                            ? parsedMCQ.correctAnswer.split('|') 
                            : parsedMCQ.correctAnswer.split(',')
                          ).map((ans, idx) => {
                            const trimmed = ans.trim();
                            const letterMatch = trimmed.match(/^([A-D])\)/i);
                            if (letterMatch) {
                              const letter = letterMatch[1].toUpperCase();
                              const optionText = parsedMCQ.options[letter as keyof typeof parsedMCQ.options];
                              return (
                                <li key={idx}>
                                  <span className="font-semibold">{letter})</span> {optionText}
                                </li>
                              );
                            }
                            return <li key={idx}>{trimmed}</li>;
                          })}
                        </ul>
                      ) : (
                        <div>
                          {parsedMCQ.correctAnswer.match(/^([A-D])\)/i) ? (
                            (() => {
                              const letterMatch = parsedMCQ.correctAnswer.match(/^([A-D])\)/i);
                              const letter = letterMatch![1].toUpperCase();
                              const optionText = parsedMCQ.options[letter as keyof typeof parsedMCQ.options];
                              return (
                                <p>
                                  <span className="font-semibold">{letter})</span> {optionText}
                                </p>
                              );
                            })()
                          ) : (
                            <p>{parsedMCQ.correctAnswer}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : currentExercise.answer.includes('|') || currentExercise.answer.includes(',') ? (
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      {(currentExercise.answer.includes('|') 
                        ? currentExercise.answer.split('|') 
                        : currentExercise.answer.split(',')
                      ).map((ans, idx) => (
                        <li key={idx}>{ans.trim()}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{currentExercise.answer}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {!hasResult ? (
            <Button
              onClick={handleCheck}
              disabled={!currentAnswer || isChecking}
              className="flex-1"
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                "Check Answer"
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : isLastExercise ? (
                "Submit"
              ) : (
                <>
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>

        {/* Progress indicator */}
        <div className="flex gap-1">
          {exercises.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 flex-1 rounded ${
                idx === currentIndex
                  ? "bg-primary"
                  : idx < currentIndex
                  ? results[exercises[idx].id]
                    ? "bg-green-500"
                    : "bg-red-500"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

