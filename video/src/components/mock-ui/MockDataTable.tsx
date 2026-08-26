import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';

interface MockDataTableProps {
  headers: string[];
  rows: string[][];
  delay?: number;
  highlightRow?: number;
}

export const MockDataTable: React.FC<MockDataTableProps> = ({
  headers,
  rows,
  delay = 0,
  highlightRow,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const visibleRows = rows.slice(0, 8);

  const headerProgress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });

  return (
    <div
      style={{
        fontFamily,
        borderRadius: 8,
        overflow: 'hidden',
        border: `1px solid ${COLORS.BORDER}`,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          backgroundColor: COLORS.BG_DARK,
          opacity: interpolate(headerProgress, [0, 1], [0, 1]),
        }}
      >
        {headers.map((header, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 600,
              color: COLORS.TEXT_GRAY,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {header}
          </div>
        ))}
      </div>

      {/* Data rows */}
      {visibleRows.map((row, rowIndex) => {
        const rowDelay = delay + 6 + rowIndex * 4;
        const rowProgress = spring({
          frame: frame - rowDelay,
          fps,
          config: { damping: 200 },
        });

        const opacity = interpolate(rowProgress, [0, 1], [0, 1]);
        const translateY = interpolate(rowProgress, [0, 1], [10, 0]);
        const isHighlighted = highlightRow === rowIndex;

        return (
          <div
            key={rowIndex}
            style={{
              display: 'flex',
              backgroundColor: COLORS.BG_CARD,
              borderBottom: `1px solid ${COLORS.BORDER}`,
              borderLeft: isHighlighted ? `3px solid ${COLORS.ACCENT}` : '3px solid transparent',
              opacity,
              transform: `translateY(${translateY}px)`,
            }}
          >
            {row.map((cell, cellIndex) => (
              <div
                key={cellIndex}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: COLORS.TEXT_WHITE,
                }}
              >
                {cell}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};
