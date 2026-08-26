"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { checkBackendHealth } from "@/actions/health";

interface BackendStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected";

const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

export function BackendStatusIndicator({
  className,
  showLabel = true
}: BackendStatusIndicatorProps) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();

  const checkHealth = useCallback(() => {
    startTransition(async () => {
      const result = await checkBackendHealth();
      setStatus(result.healthy ? "connected" : "disconnected");
      setLastChecked(new Date());
    });
  }, []);

  useEffect(() => {
    // Initial check
    checkHealth();

    // Set up periodic health checks
    const interval = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [checkHealth]);

  const statusConfig = {
    connecting: {
      color: "bg-yellow-500",
      pulseColor: "bg-yellow-400",
      label: "Connecting...",
      tooltip: "Checking backend connection...",
    },
    connected: {
      color: "bg-green-500",
      pulseColor: "bg-green-400",
      label: "Connected",
      tooltip: "Backend is healthy and responding",
    },
    disconnected: {
      color: "bg-red-500",
      pulseColor: "bg-red-400",
      label: "Disconnected",
      tooltip: "Unable to reach backend server",
    },
  };

  const config = statusConfig[status];
  const showPulse = status === "connecting" || isPending;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 cursor-pointer select-none",
              className
            )}
            onClick={checkHealth}
            role="status"
            aria-label={`Backend status: ${config.label}`}
          >
            <span className="relative flex size-2.5">
              {showPulse && (
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                    config.pulseColor
                  )}
                />
              )}
              <span
                className={cn(
                  "relative inline-flex size-2.5 rounded-full",
                  config.color
                )}
              />
            </span>
            {showLabel && (
              <span className="text-xs text-muted-foreground">
                {isPending ? "Checking..." : config.label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p>{config.tooltip}</p>
          {lastChecked && (
            <p className="text-muted-foreground mt-1">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
          <p className="text-muted-foreground">Click to refresh</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
