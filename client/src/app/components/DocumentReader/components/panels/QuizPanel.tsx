"use client";

import React, { useState } from "react";
import { HelpCircle, Loader2, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface Question {
  question: string;
  options: string[];
  correct: number;
}

export default function QuizPanel() {
  const [loading, setLoading]     = useState(false);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers]     = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const generate = () => {
    setLoading(true);
    setQuestions(null);
    setAnswers({});
    setSubmitted(false);
    // TODO: replace with real AI endpoint call
    setTimeout(() => {
      setQuestions([
        {
          question: "Quiz generation is coming soon. Which best describes this feature?",
          options: ["Under construction", "Already live", "Not planned", "Optional"],
          correct: 0,
        },
      ]);
      setLoading(false);
    }, 1200);
  };

  const score = questions?.filter((q, i) => answers[i] === q.correct).length ?? 0;

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Generating questions…</p>
    </div>
  );

  if (!questions) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-5">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
        <HelpCircle className="h-6 w-6 text-primary" />
      </div>
      <div>
        <p className="font-semibold text-foreground">Generate a Quiz</p>
        <p className="text-sm text-muted-foreground mt-1">
          Test your understanding with AI-generated questions from this document.
        </p>
      </div>
      <Button onClick={generate}>Generate Quiz</Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 h-full px-5 pb-5 min-h-0">
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-5 pr-2">
          {questions.map((q, qi) => (
            <div key={qi} className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">{qi + 1}. {q.question}</p>
              <div className="flex flex-col gap-1.5">
                {q.options.map((opt, oi) => {
                  const chosen  = answers[qi] === oi;
                  const correct = submitted && oi === q.correct;
                  const wrong   = submitted && chosen && oi !== q.correct;
                  return (
                    <button
                      key={oi}
                      disabled={submitted}
                      onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                      className={`text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                        correct ? "bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-400"
                        : wrong  ? "bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-400"
                        : chosen ? "bg-primary/15 border-primary/40 text-primary"
                        : "border-border hover:bg-muted/60"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {!submitted ? (
        <Button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length < questions.length}>
          Submit Answers
        </Button>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            Score: <span className="text-primary">{score}/{questions.length}</span>
          </p>
          <Button variant="outline" size="sm" onClick={generate} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> New Quiz
          </Button>
        </div>
      )}
    </div>
  );
}
