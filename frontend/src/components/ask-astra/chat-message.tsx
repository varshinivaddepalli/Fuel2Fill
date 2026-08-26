"use client";

import { Sparkles, Code, AlertCircle, Copy, Check, ChevronRight, Loader2, ThumbsUp, ThumbsDown, ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ResultRenderer } from "./result-renderer";
import { NavigationButtons } from "./navigation-buttons";
import { ProcessingIndicator } from "./processing-indicator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { submitFeedback } from "@/actions/ask-astra";
import type { ChatMessage as ChatMessageType } from "@/types/ask-astra";

interface ChatMessageProps {
  message: ChatMessageType;
  userInitials?: string;
  loadingStep?: string;
}

export function ChatMessage({ message, userInitials = "U", loadingStep }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [sqlOpen, setSqlOpen] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<"positive" | "negative" | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const isUser = message.role === "user";

  const handleCopySQL = async () => {
    if (!message.sql) return;

    try {
      await navigator.clipboard.writeText(message.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy SQL:", error);
    }
  };

  const handleFeedback = async (feedback: "positive" | "negative") => {
    if (!message.analyticsId || feedbackGiven) return;

    setFeedbackLoading(true);
    try {
      await submitFeedback(message.analyticsId, feedback);
      setFeedbackGiven(feedback);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const confidenceIndicator = () => {
    if (message.confidenceScore == null || !message.sql) return null;

    const score = message.confidenceScore;
    if (score >= 0.8) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400" title={`Confidence: ${(score * 100).toFixed(0)}%`}>
          <ShieldCheck className="h-3.5 w-3.5" />
          High confidence
        </span>
      );
    } else if (score >= 0.5) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400" title={`Confidence: ${(score * 100).toFixed(0)}%`}>
          <Shield className="h-3.5 w-3.5" />
          Moderate confidence
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400" title={`Confidence: ${(score * 100).toFixed(0)}%`}>
          <ShieldAlert className="h-3.5 w-3.5" />
          Results may not fully match your question
        </span>
      );
    }
  };

  return (
    <div
      className={cn(
        "flex gap-2 sm:gap-3 py-3 sm:py-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
        <AvatarFallback
          className={cn(
            "text-xs font-medium",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
          )}
        >
          {isUser ? (
            userInitials
          ) : message.isLoading ? (
            <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col gap-2 flex-1 min-w-0",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Role Label */}
        <span className="text-xs font-medium text-muted-foreground">
          {isUser ? "You" : "Astra"}
        </span>

        {/* Message Bubble */}
        <div
          className={cn(
            "rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm max-w-[90%]"
              : "bg-muted rounded-tl-sm w-full"
          )}
        >
          {message.isLoading ? (
            <ProcessingIndicator loadingStep={loadingStep || "Analyzing your question..."} />
          ) : message.error ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm break-words">{message.error}</p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {message.content}
            </p>
          )}
        </div>

        {/* Confidence indicator */}
        {!isUser && !message.isLoading && confidenceIndicator()}

        {/* Results visualization */}
        {!isUser && message.results && message.results.length > 0 && !message.isLoading && message.visualization !== "text" && (
          <div className="w-full mt-2 rounded-lg border border-border overflow-x-auto">
            <ResultRenderer
              visualization={message.visualization || "table"}
              results={message.results}
              chartConfig={message.chartConfig}
            />
          </div>
        )}

        {/* Actions row */}
        {!isUser && !message.isLoading && (message.sql || message.navigationActions || message.analyticsId) && (
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {/* SQL toggle */}
            {message.sql && (message.visualization === "table" || message.visualization === "chart") && (
              <Collapsible open={sqlOpen} onOpenChange={setSqlOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground px-2"
                  >
                    <Code className="h-3.5 w-3.5" />
                    SQL
                    <ChevronRight
                      className={cn(
                        "h-3 w-3 transition-transform",
                        sqlOpen && "rotate-90"
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 relative group">
                    <div className="p-3 rounded-lg bg-muted/50 border border-border overflow-x-auto">
                      <pre className="text-xs text-foreground/80 font-mono whitespace-pre-wrap">
                        {message.sql}
                      </pre>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleCopySQL}
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-primary" />
                      ) : (
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Navigation buttons */}
            {message.navigationActions && message.navigationActions.length > 0 && (
              <NavigationButtons actions={message.navigationActions} />
            )}

            {/* Feedback buttons */}
            {message.analyticsId && !message.error && (
              <div className="flex items-center gap-1 ml-auto">
                {feedbackGiven ? (
                  <span className="text-xs text-muted-foreground">
                    {feedbackGiven === "positive" ? "Thanks!" : "Thanks for the feedback"}
                  </span>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-emerald-600"
                      onClick={() => handleFeedback("positive")}
                      disabled={feedbackLoading}
                      title="Good response"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-600"
                      onClick={() => handleFeedback("negative")}
                      disabled={feedbackLoading}
                      title="Bad response"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
