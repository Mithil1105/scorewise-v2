import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Copy, Sparkles, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PromptGenerator() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("1");
  const [count, setCount] = useState("15");
  const [questionType, setQuestionType] = useState<"fill-blank" | "mcq" | "rewrite" | "both">("both");
  const [customInstructions, setCustomInstructions] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [copied, setCopied] = useState(false);

  const generatePrompt = () => {
    const difficultyText = {
      "1": "beginner/elementary level",
      "2": "intermediate level",
      "3": "advanced level"
    }[difficulty] || "intermediate level";

    const questionTypeInstructions = {
      "fill-blank": `Create fill-in-the-blank questions where students need to complete sentences with the correct word or phrase. Each question must be a COMPLETE SENTENCE.`,
      "mcq": `Create multiple-choice questions (MCQs) with 4 options (A, B, C, D) where only one answer is correct. Each question must be a COMPLETE SENTENCE.`,
      "rewrite": `Create sentence rewriting exercises where students must rewrite a given sentence in a different form (e.g., active to passive, direct to indirect speech, changing tenses). Provide the original sentence and the expected rewritten version.`,
      "both": `Create a mix of fill-in-the-blank questions, multiple-choice questions (MCQs) with 4 options each, and sentence rewriting exercises. Each question must be a COMPLETE SENTENCE.`
    }[questionType];

    const formatInstructions = questionType === "mcq" 
      ? `CRITICAL: Each exercise must be on a SINGLE LINE with this EXACT format:
"Question text [A) option1 B) option2 C) option3 D) option4] -> Answer Letter) Answer Text"

NO numbering, NO emojis, NO line breaks, NO extra text. Just the question, options in brackets, arrow, and answer.`
      : questionType === "fill-blank"
      ? `CRITICAL: Each exercise must be on a SINGLE LINE with this EXACT format:
"Question text -> Answer"

NO numbering, NO emojis, NO line breaks, NO extra text. Just the question, arrow, and answer.`
      : questionType === "rewrite"
      ? `CRITICAL: Each exercise must be on a SINGLE LINE with this EXACT format:
"Original sentence -> Rewritten sentence"

NO numbering, NO emojis, NO line breaks, NO extra text. Just the original sentence, arrow, and rewritten sentence.`
      : `CRITICAL: Each exercise must be on a SINGLE LINE.

Fill-in-the-blank format: "Question text -> Answer"
MCQ format: "Question text [A) option1 B) option2 C) option3 D) option4] -> Answer Letter) Answer Text"
Rewrite format: "Original sentence -> Rewritten sentence"

NO numbering, NO emojis, NO line breaks, NO extra text. Each exercise is exactly one line.`;

    const examples = questionType === "mcq" 
      ? `Example (EXACT format to follow - MUST include hint in parentheses):
The committee will announce the decision tomorrow. Convert to passive: The decision ___ tomorrow by the committee. (Passive voice expected) [A) will announce B) will be announced C) is announced D) announces] -> B) will be announced`
      : questionType === "fill-blank"
      ? `Example (EXACT format to follow - MUST include hint and multiple answers if applicable):
The committee will announce the decision tomorrow. Convert to passive: The decision ___ tomorrow by the committee. (Passive voice expected) -> will be announced
She ___ coffee every morning. (Present simple) -> does not drink|doesn't drink`
      : questionType === "rewrite"
      ? `Example (EXACT format to follow - MUST include hint):
The committee will announce the decision tomorrow. (Convert to passive voice) -> The decision will be announced tomorrow by the committee.`
      : `Examples (EXACT format to follow - MUST include hints and multiple answers when applicable):
The committee will announce the decision tomorrow. Convert to passive: The decision ___ tomorrow by the committee. (Passive voice expected) -> will be announced
She ___ coffee every morning. (Present simple, negative) -> does not drink|doesn't drink
The committee will announce the decision tomorrow. Convert to passive: The decision ___ tomorrow by the committee. (Passive voice expected) [A) will announce B) will be announced C) is announced D) announces] -> B) will be announced
The committee will announce the decision tomorrow. (Convert to passive voice) -> The decision will be announced tomorrow by the committee.`;

    const prompt = `You are an expert English grammar teacher creating grammar exercises for ${difficultyText} students.

TOPIC: ${topic || "General English Grammar"}

TASK:
${questionTypeInstructions}

Create exactly ${count} grammar exercises covering the topic "${topic || "general English grammar"}".

CRITICAL FORMATTING RULES:
1. Each exercise must be on EXACTLY ONE LINE - no line breaks within an exercise
2. NO numbering (no 1️⃣, 2️⃣, 1., 2., etc.)
3. NO emojis or special characters
4. NO extra text like "Fill in the blank:" or "MCQ:" before the question
5. ALWAYS include helpful hints in parentheses: (Passive voice expected), (Past perfect required), (Modal verb needed), etc.
6. Use the arrow " -> " (space, dash, greater-than, space) to separate question from answer
7. For MCQs: Options must be in square brackets [A) ... B) ... C) ... D) ...] on the same line
8. Output ONLY the exercises, one per line, nothing else
9. Each question must be a COMPLETE, GRAMMATICALLY CORRECT SENTENCE (even with blanks)
10. For passive voice exercises: Include the active voice sentence first, then "Convert to passive:" followed by the sentence with blank and hint
11. For multi-word answers: Use a single blank "___" and provide the complete answer phrase
12. Include the key verb forms or grammar structures being tested in the question context
13. MULTIPLE CORRECT ANSWERS: If there are multiple acceptable answers (e.g., "do not" and "don't", "cannot" and "can't", "I am" and "I'm"), separate them with a pipe "|" character. Example: "do not|don't" or "cannot|can't". Include ALL common variations that are grammatically correct.

REQUIREMENTS:
- All questions should be at ${difficultyText}
- Questions should be clear, practical, and test real grammar understanding
- Each question must be a COMPLETE SENTENCE - not fragments or incomplete thoughts
- For fill-in-the-blank: Use clear context clues in the question itself. Include hints when testing specific grammar points (e.g., "Passive voice expected", "Past perfect required", "Modal verb needed")
- For MCQs: Provide 4 plausible options with only one correct answer. Each option must be grammatically complete. Include hints in the question when testing specific grammar points
- For sentence rewriting: Provide complete original sentences and complete rewritten versions. Include hints about what transformation is needed (e.g., "Convert to passive", "Change to indirect speech", "Use past perfect")
- ALWAYS include helpful hints in parentheses or as part of the question when testing specific grammar concepts:
  * For tenses: "(Past perfect expected)", "(Future continuous required)", "(Present perfect needed)"
    ** CRITICAL FOR TENSES: Always include the verb form needed in the hint. Examples:
      - "(Past perfect: had + past participle)", "(Present continuous: am/is/are + verb-ing)", "(Future simple: will + base verb)"
      - "(Past simple: verb + -ed or irregular form)", "(Present perfect: have/has + past participle)"
      - Include the specific verb forms: "(Past perfect: had + past participle of 'finish' = had finished)"
      - For irregular verbs, mention the forms: "(Past simple of 'go' = went)", "(Past participle of 'write' = written)"
  * For voice: "(Passive voice expected)", "(Convert to active voice)"
  * For modals: "(Modal verb needed)", "(Use 'should' or 'must')"
  * For conditionals: "(Third conditional required)", "(Use 'if' clause)"
  * For reported speech: "(Convert to indirect speech)", "(Change to reported speech)"
- Include the key verb forms or grammar structures being tested in the question context
- FOR TENSES EXERCISES: Always provide verb form guidance in hints. Include:
  * The tense name and structure (e.g., "Past perfect: had + past participle")
  * The specific verb forms when relevant (e.g., "Past simple of 'go' = went")
  * Base form, past form, and past participle for irregular verbs when testing those forms
  * Examples: "(Past perfect: had + past participle of 'complete' = had completed)", "(Present continuous: am/is/are + verb-ing)"
- For passive voice exercises: ALWAYS include the active voice sentence first, then "Convert to passive:" followed by the sentence with blank
- Mix different aspects of the topic (if applicable)
- Ensure all sentences are complete and make sense as standalone statements
- Make questions educational - students should learn from the context and hints
- MULTIPLE CORRECT ANSWERS: When there are multiple grammatically correct ways to answer (contractions vs full forms, different word orders, etc.), provide ALL acceptable variations separated by pipe "|". Examples:
  * Contractions: "do not|don't", "cannot|can't", "I am|I'm", "will not|won't"
  * Word order variations: "have been waiting|been waiting have" (if both are acceptable)
  * Different phrasings: "should not|shouldn't", "would not|wouldn't"
  * Include common variations that native speakers use interchangeably

OUTPUT FORMAT:
${formatInstructions}

${customInstructions ? `ADDITIONAL INSTRUCTIONS:\n${customInstructions}\n` : ""}

${examples}

IMPORTANT: Output ONLY the ${count} exercises, one per line, in the exact format shown above. No numbering, no emojis, no extra text. Start directly with the first exercise.`;

    setGeneratedPrompt(prompt);
    setCopied(false);
  };

  const copyToClipboard = async () => {
    if (generatedPrompt) {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Prompt copied to clipboard. Paste it into ChatGPT.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <PageLayout>
      <TopBar />
      <div className="px-4 py-6 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/teacher/grammar/quick-add")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quick Add
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              ChatGPT Prompt Generator
            </CardTitle>
            <CardDescription>
              Generate a customized ChatGPT prompt to create grammar exercises in bulk. Copy the prompt and paste it into ChatGPT.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Configuration Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">Grammar Topic *</Label>
                  <Input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Present Simple Tense, Articles (a/an/the)"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="count">Number of Exercises *</Label>
                  <Input
                    id="count"
                    type="number"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    min="1"
                    max="50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level *</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Easy (Beginner/Elementary)</SelectItem>
                      <SelectItem value="2">2 - Medium (Intermediate)</SelectItem>
                      <SelectItem value="3">3 - Hard (Advanced)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="questionType">Question Type *</Label>
                  <Select value={questionType} onValueChange={(v) => setQuestionType(v as "fill-blank" | "mcq" | "rewrite" | "both")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fill-blank">Fill-in-the-Blank Only</SelectItem>
                      <SelectItem value="mcq">Multiple Choice (MCQ) Only</SelectItem>
                      <SelectItem value="rewrite">Sentence Rewriting Only</SelectItem>
                      <SelectItem value="both">All Types (Mixed)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customInstructions">Custom Instructions (Optional)</Label>
                <Textarea
                  id="customInstructions"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g., Focus on common mistakes, Use business English context, Include examples with 'used to'..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Add any specific requirements or context for the exercises.
                </p>
              </div>

              <Button onClick={generatePrompt} className="w-full">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate ChatGPT Prompt
              </Button>
            </div>

            {/* Generated Prompt */}
            {generatedPrompt && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Generated Prompt (Copy and paste into ChatGPT)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={generatedPrompt}
                  readOnly
                  rows={20}
                  className="font-mono text-sm bg-muted"
                />
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Next Steps:</strong>
                  </p>
                  <ol className="list-decimal list-inside text-sm text-blue-600 dark:text-blue-400 space-y-1">
                    <li>Copy the prompt above</li>
                    <li>Open ChatGPT (chat.openai.com)</li>
                    <li>Paste the prompt and send it</li>
                    <li>Copy the generated exercises from ChatGPT</li>
                    <li>Paste them into the "Bulk Add" tab in Quick Add Exercises</li>
                  </ol>
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold mb-1">
                      ⚠️ If ChatGPT outputs with numbering/emojis:
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      If ChatGPT includes numbers (1️⃣, 2️⃣) or labels ("Fill in the blank:", "MCQ:"), you can either:
                      <br />
                      • Reply to ChatGPT: "Remove all numbering, emojis, and labels. Output only the exercises, one per line."
                      <br />
                      • Or manually clean the output: Remove numbers, emojis, and labels before pasting.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Format Guide */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm">Format Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <strong>Fill-in-the-Blank Format (with active voice):</strong>
                  <pre className="mt-1 p-2 bg-background rounded text-xs whitespace-pre-wrap">
The committee will announce the decision tomorrow. Convert to passive: The decision ___ tomorrow by the committee. -&gt; will be announced
                  </pre>
                </div>
                <div>
                  <strong>MCQ Format (with active voice):</strong>
                  <pre className="mt-1 p-2 bg-background rounded text-xs whitespace-pre-wrap">
The committee will announce the decision tomorrow. Convert to passive: The decision ___ tomorrow by the committee. [A) will announce B) will be announced C) is announced D) announces] -&gt; B) will be announced
                  </pre>
                </div>
                <div>
                  <strong>Simple Fill-in-the-Blank (without conversion):</strong>
                  <pre className="mt-1 p-2 bg-background rounded text-xs whitespace-pre-wrap">
I ___ a student at the university. -&gt; am
                  </pre>
                </div>
                <div>
                  <strong>Sentence Rewriting Format:</strong>
                  <pre className="mt-1 p-2 bg-background rounded text-xs whitespace-pre-wrap">
The committee will announce the decision tomorrow. -&gt; The decision will be announced tomorrow by the committee.
                  </pre>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded p-2">
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold mb-1">
                    Important Notes:
                  </p>
                  <ul className="text-xs text-amber-600 dark:text-amber-400 list-disc list-inside space-y-1">
                    <li>Each question must be a COMPLETE SENTENCE</li>
                    <li>For passive voice: Include the active voice sentence first, then "Convert to passive:"</li>
                    <li>Use single blank "___" even for multi-word answers</li>
                    <li>The arrow separator is " -&gt; " (space, dash, greater-than, space)</li>
                    <li>NO numbering, NO emojis, NO labels - just the question and answer</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

