"use client";

interface ProcessingIndicatorProps {
  loadingStep: string;
}

export function ProcessingIndicator({ loadingStep }: ProcessingIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Animated dots */}
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-foreground/60 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-foreground/60 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-foreground/60 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>

      {/* Step text */}
      <span className="text-sm text-muted-foreground">
        {loadingStep}
      </span>
    </div>
  );
}
