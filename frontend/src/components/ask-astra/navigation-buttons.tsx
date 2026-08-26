"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { NavigationAction } from "@/types/ask-astra";

interface NavigationButtonsProps {
  actions: NavigationAction[];
}

export function NavigationButtons({ actions }: NavigationButtonsProps) {
  const router = useRouter();

  if (!actions?.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.path}
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2"
          onClick={() => router.push(action.path)}
        >
          {action.label}
          <ArrowRight className="h-3 w-3" />
        </Button>
      ))}
    </div>
  );
}
