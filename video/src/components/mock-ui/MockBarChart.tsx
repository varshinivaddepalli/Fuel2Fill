import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';

interface BarChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface MockBarChartProps {
  data: BarChartDataPoint[];
  delay?: number;
  height?: number;
  showLabels?: boolean;
}

export const MockBarChart: React.FC<MockBarChartProps> = ({
  data,
  delay = 0,
  height = 200,
  showLabels = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const yAxisSteps = 3;

  const chartPaddingLeft = 50;
  const chartPaddingBottom = showLabels ? 30 : 10;
  const chartPaddingTop = 10;
  const chartPaddingRight = 10;

  const totalWidth = data.length * 60 + chartPaddingLeft + chartPaddingRight;
  const chartHeight = height - chartPaddingBottom - chartPaddingTop;

  const barWidth = 32;
  const barGap =
    data.length > 1
      ? (totalWidth - chartPaddingLeft - chartPaddingRight - barWidth * data.length) /
        (data.length - 1)
      : 0;

  return (
    <svg
      width={totalWidth}
      height={height}
      style={{ fontFamily, overflow: 'visible' }}
    >
      {/* Y-axis labels */}
      {Array.from({ length: yAxisSteps + 1 }).map((_, i) => {
        const yVal = Math.round((maxValue / yAxisSteps) * i);
        const y =
          chartPaddingTop + chartHeight - (chartHeight / yAxisSteps) * i;
        return (
          <g key={`y-${i}`}>
            <line
              x1={chartPaddingLeft}
              y1={y}
              x2={totalWidth - chartPaddingRight}
              y2={y}
              stroke={COLORS.BORDER}
              strokeWidth={1}
            />
            <text
              x={chartPaddingLeft - 8}
              y={y + 4}
              fill={COLORS.TEXT_MUTED}
              fontSize={11}
              textAnchor="end"
            >
              {yVal}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const barProgress = spring({
          frame: frame - delay - i * 5,
          fps,
          config: { damping: 18, stiffness: 80 },
        });

        const barHeight = (d.value / maxValue) * chartHeight * barProgress;
        const x =
          chartPaddingLeft + i * (barWidth + barGap);
        const y = chartPaddingTop + chartHeight - barHeight;

        return (
          <g key={d.label}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 0)}
              fill={d.color || COLORS.ACCENT_DIM}
              rx={4}
              ry={4}
            />
            {/* X-axis label */}
            {showLabels && (
              <text
                x={x + barWidth / 2}
                y={chartPaddingTop + chartHeight + 18}
                fill={COLORS.TEXT_MUTED}
                fontSize={11}
                textAnchor="middle"
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};
