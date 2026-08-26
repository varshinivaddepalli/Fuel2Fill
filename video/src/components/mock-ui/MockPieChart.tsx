import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';

interface PieChartDataPoint {
  label: string;
  value: number;
  color: string;
}

interface MockPieChartProps {
  data: PieChartDataPoint[];
  delay?: number;
  size?: number;
}

export const MockPieChart: React.FC<MockPieChartProps> = ({
  data,
  delay = 0,
  size = 180,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const strokeW = 24;

  let cumulativeOffset = 0;

  return (
    <svg
      width={size}
      height={size}
      style={{ fontFamily, overflow: 'visible' }}
    >
      {/* Rotate -90 degrees so we start from 12 o'clock */}
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        {data.map((d, i) => {
          const segmentLength = (d.value / total) * circumference;
          const offset = cumulativeOffset;
          cumulativeOffset += segmentLength;

          const staggerDelay = delay + i * 8;
          const segmentProgress = spring({
            frame: frame - staggerDelay,
            fps,
            config: { damping: 20, stiffness: 60 },
          });

          // strokeDasharray: segment length, then gap for the rest
          const dashArray = `${segmentLength * segmentProgress} ${circumference - segmentLength * segmentProgress}`;
          // strokeDashoffset: negative offset to position the segment
          const dashOffset = -offset;

          return (
            <circle
              key={d.label}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={strokeW}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
            />
          );
        })}
      </g>

      {/* Center text */}
      <text
        x={cx}
        y={cy - 6}
        fill={COLORS.TEXT_WHITE}
        fontSize={20}
        fontWeight={700}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {total.toLocaleString()}
      </text>
      <text
        x={cx}
        y={cy + 14}
        fill={COLORS.TEXT_MUTED}
        fontSize={11}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        Total
      </text>
    </svg>
  );
};
