"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { CardData } from "@/types/ask-astra";

interface CardResultProps {
  data: CardData;
}

export function CardResult({ data }: CardResultProps) {
  const getChangeIcon = () => {
    switch (data.changeType) {
      case "increase":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "decrease":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getChangeColor = () => {
    switch (data.changeType) {
      case "increase":
        return "text-green-500";
      case "decrease":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className="w-fit min-w-[160px] sm:min-w-[200px]">
      <CardContent className="pt-4 pb-4 sm:pt-6 sm:pb-6">
        <div className="text-center">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">{data.label}</p>
          <p className="text-2xl sm:text-4xl font-bold mt-1 sm:mt-2">{data.value}</p>
          {data.change && (
            <div className={`flex items-center justify-center gap-1 mt-1 sm:mt-2 ${getChangeColor()}`}>
              {getChangeIcon()}
              <span className="text-xs sm:text-sm">{data.change}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface CardResultFromDataProps {
  results: Record<string, unknown>[];
}

export function CardResultFromData({ results }: CardResultFromDataProps) {
  if (!results || results.length === 0) {
    return (
      <CardResult
        data={{
          value: "No data",
          label: "Result",
        }}
      />
    );
  }

  const firstRow = results[0];
  const keys = Object.keys(firstRow);
  const key = keys[0];
  const value = firstRow[key];

  // Format the value
  let formattedValue: string;
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      formattedValue = value.toLocaleString();
    } else {
      formattedValue = value.toFixed(2);
    }
  } else {
    formattedValue = value !== null && value !== undefined ? String(value) : "N/A";
  }

  // Create label from column name
  const label = key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <CardResult
      data={{
        value: formattedValue,
        label,
      }}
    />
  );
}
