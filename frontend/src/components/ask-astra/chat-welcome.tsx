"use client";

import { Sparkles } from "lucide-react";

interface ChatWelcomeProps {
  userName: string;
  onSuggestionClick: (query: string) => void;
}

const SUGGESTIONS = [
  "Show me today's summary",
  "What are the current tank levels?",
  "How many employees are on shift?",
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function ChatWelcome({
  userName,
  onSuggestionClick,
}: ChatWelcomeProps) {
  const greeting = getGreeting();
  const firstName = userName.split(" ")[0];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] sm:min-h-[calc(100vh-10rem)] px-4 py-8 sm:py-12">
      {/* Animated Icon */}
      <div className="relative mb-6 sm:mb-8">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl animate-pulse" />
        <div className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-background border border-border">
          <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
        </div>
      </div>

      {/* Hero Greeting */}
      <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground mb-2 sm:mb-3 tracking-tight text-center">
        {greeting}, {firstName}
      </h1>
      <p className="text-sm sm:text-base text-muted-foreground text-center mb-8 sm:mb-12">
        Ask me anything about your stations
      </p>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-xl px-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-full border border-border bg-background text-xs sm:text-sm text-foreground hover:bg-muted hover:border-muted-foreground/30 transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
