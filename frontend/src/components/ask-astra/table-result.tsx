"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface TableResultProps {
  results: Record<string, unknown>[];
  maxRows?: number;
}

export function TableResult({ results, maxRows = 50 }: TableResultProps) {
  if (!results || results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data to display
      </div>
    );
  }

  const columns = Object.keys(results[0]);
  const displayRows = results.slice(0, maxRows);
  const hasMore = results.length > maxRows;

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "number") {
      if (Number.isInteger(value)) {
        return value.toLocaleString();
      }
      return value.toFixed(2);
    }
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    return String(value);
  };

  const formatHeader = (key: string): string => {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto -mx-px">
        <div className="inline-block min-w-full align-middle">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column} className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">
                    {formatHeader(column)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column} className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">
                      {formatValue(row[column])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      {hasMore && (
        <p className="text-xs sm:text-sm text-muted-foreground text-center px-2">
          Showing {maxRows} of {results.length} rows
        </p>
      )}
    </div>
  );
}
