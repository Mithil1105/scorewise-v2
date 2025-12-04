import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, ArrowRight, Loader2 } from "lucide-react";
import { checkAnswer } from "@/utils/grammar/answerChecker";
import { GrammarExerciseSourceType } from "@/types/grammar";

interface Exercise {
  id: string;
  question: string;
  answer: string;
  use_ai_check?: boolean;
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

  const handleCheck = async () => {
    if (!currentAnswer.trim()) return;

    setIsChecking(true);
    try {
      const isCorrect = await checkAnswer(
        currentExercise.question,
        currentExercise.answer,
        currentAnswer,
        currentExercise.use_ai_check || false
      );

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
    setIsSubmitting(true);
    try {
      // Save all attempts to database
      const attemptResults = exercises.map(ex => ({
        exerciseId: ex.id,
        isCorrect: results[ex.id] || false,
        userAnswer: userAnswers[ex.id] || ""
      }));

      // TODO: Call API to save attempts to grammar_attempts table
      // await saveGrammarAttempts(attemptResults, assignmentType, assignmentId, exerciseSourceType);

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
          <p className="text-lg font-medium">{currentExercise.question}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Your Answer</label>
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
                <p className="text-sm text-muted-foreground">Correct answer{currentExercise.answer.includes('|') || currentExercise.answer.includes(',') ? 's' : ''}:</p>
                <div className="font-medium">
                  {currentExercise.answer.includes('|') || currentExercise.answer.includes(',') ? (
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
              disabled={!currentAnswer.trim() || isChecking}
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

