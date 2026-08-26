import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from 'remotion';
import { evolvePath } from '@remotion/paths';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';

interface LineChartDataPoint {
  x: number;
  y: number;
}

interface MockLineChartProps {
  data: LineChartDataPoint[];
  delay?: number;
  height?: number;
  width?: number;
  color?: string;
  strokeWidth?: number;
}

export const MockLineChart: React.FC<MockLineChartProps> = ({
  data,
  delay = 0,
  height = 200,
  width = 400,
  color = COLORS.TEXT_WHITE,
  strokeWidth = 2,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (data.length < 2) return null;

  const padding = { top: 10, right: 10, bottom: 10, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xMin = Math.min(...data.map((d) => d.x));
  const xMax = Math.max(...data.map((d) => d.x));
  const yMin = Math.min(...data.map((d) => d.y));
  const yMax = Math.max(...data.map((d) => d.y));

  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const scaleX = (v: number) =>
    padding.left + ((v - xMin) / xRange) * chartW;
  const scaleY = (v: number) =>
    padding.top + chartH - ((v - yMin) / yRange) * chartH;

  const pathString = data
    .map((d, i) => {
      const px = scaleX(d.x);
      const py = scaleY(d.y);
      return i === 0 ? `M ${px} ${py}` : `L ${px} ${py}`;
    })
    .join(' ');

  const drawDurationFrames = fps * 2;
  const progress = interpolate(
    frame,
    [delay, delay + drawDurationFrames],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.quad),
    },
  );

  const evolved = evolvePath(progress, pathString);

  // Calculate the position of the dot at the end of the drawn line
  const currentPointIndex = Math.min(
    Math.floor(progress * (data.length - 1)),
    data.length - 1,
  );
  const nextPointIndex = Math.min(currentPointIndex + 1, data.length - 1);
  const segmentProgress =
    (progress * (data.length - 1)) - currentPointIndex;

  const dotX =
    scaleX(data[currentPointIndex].x) +
    (scaleX(data[nextPointIndex].x) - scaleX(data[currentPointIndex].x)) *
      segmentProgress;
  const dotY =
    scaleY(data[currentPointIndex].y) +
    (scaleY(data[nextPointIndex].y) - scaleY(data[currentPointIndex].y)) *
      segmentProgress;

  return (
    <svg
      width={width}
      height={height}
      style={{ fontFamily, overflow: 'visible' }}
    >
      {/* X-axis */}
      <line
        x1={padding.left}
        y1={padding.top + chartH}
        x2={padding.left + chartW}
        y2={padding.top + chartH}
        stroke={COLORS.BORDER_LIGHT}
        strokeWidth={1}
      />
      {/* Y-axis */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={padding.top + chartH}
        stroke={COLORS.BORDER_LIGHT}
        strokeWidth={1}
      />

      {/* Line path */}
      <path
        d={pathString}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={evolved.strokeDasharray}
        strokeDashoffset={evolved.strokeDashoffset}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dot at current end */}
      {progress > 0 && (
        <circle
          cx={dotX}
          cy={dotY}
          r={4}
          fill={color}
        />
      )}
    </svg>
  );
};
