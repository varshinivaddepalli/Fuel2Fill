"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSubmit,
  isLoading,
  placeholder = "Ask anything about your stations...",
}: ChatInputProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    if (!query.trim() || isLoading) return;
    onSubmit(query.trim());
    setQuery("");
  }, [query, isLoading, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 160);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [query]);

  return (
    <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-8 lg:px-12 border-t border-border/50 bg-background">
      <div className="max-w-2xl mx-auto">
        <div
          className={cn(
            "relative flex items-end gap-2 rounded-xl border bg-background transition-all duration-200",
            isFocused
              ? "border-border ring-1 ring-border shadow-sm"
              : "border-border/60 hover:border-border"
          )}
        >
          {/* Input */}
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={isLoading}
            className={cn(
              "flex-1 resize-none bg-transparent text-sm leading-relaxed",
              "placeholder:text-muted-foreground/50",
              "focus:outline-none disabled:opacity-50",
              "min-h-[44px] max-h-[160px] py-3 pl-4 pr-2"
            )}
            rows={1}
          />

          {/* Submit Button */}
          <div className="p-1.5">
            <Button
              onClick={handleSubmit}
              disabled={!query.trim() || isLoading}
              size="icon"
              className={cn(
                "h-8 w-8 rounded-lg transition-all duration-200",
                query.trim() && !isLoading
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Helper Text - hidden on mobile, visible on desktop when focused */}
        <p
          className={cn(
            "hidden sm:block mt-2 text-xs text-center text-muted-foreground/50 transition-opacity duration-200",
            isFocused ? "opacity-100" : "opacity-0"
          )}
        >
          Press Enter to send
        </p>
      </div>
    </div>
  );
}
