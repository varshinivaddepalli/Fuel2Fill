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

interface AreaChartDataPoint {
  x: number;
  y: number;
}

interface MockAreaChartProps {
  data: AreaChartDataPoint[];
  delay?: number;
  height?: number;
  width?: number;
  color?: string;
  fillOpacity?: number;
}

export const MockAreaChart: React.FC<MockAreaChartProps> = ({
  data,
  delay = 0,
  height = 200,
  width = 400,
  color = COLORS.TEXT_WHITE,
  fillOpacity = 0.1,
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

  const baselineY = padding.top + chartH;

  // Line path
  const linePathString = data
    .map((d, i) => {
      const px = scaleX(d.x);
      const py = scaleY(d.y);
      return i === 0 ? `M ${px} ${py}` : `L ${px} ${py}`;
    })
    .join(' ');

  // Area path (line + close along bottom)
  const areaPathString =
    linePathString +
    ` L ${scaleX(data[data.length - 1].x)} ${baselineY}` +
    ` L ${scaleX(data[0].x)} ${baselineY} Z`;

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

  const evolved = evolvePath(progress, linePathString);

  // Clip the area fill to match the line draw progress
  const clipX = scaleX(data[0].x) + progress * chartW;

  const gradientId = 'area-gradient';
  const clipId = 'area-clip';

  return (
    <svg
      width={width}
      height={height}
      style={{ fontFamily, overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
        <clipPath id={clipId}>
          <rect
            x={padding.left}
            y={padding.top}
            width={clipX - padding.left}
            height={chartH}
          />
        </clipPath>
      </defs>

      {/* X-axis */}
      <line
        x1={padding.left}
        y1={baselineY}
        x2={padding.left + chartW}
        y2={baselineY}
        stroke={COLORS.BORDER_LIGHT}
        strokeWidth={1}
      />
      {/* Y-axis */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={baselineY}
        stroke={COLORS.BORDER_LIGHT}
        strokeWidth={1}
      />

      {/* Area fill */}
      <path
        d={areaPathString}
        fill={`url(#${gradientId})`}
        clipPath={`url(#${clipId})`}
      />

      {/* Line */}
      <path
        d={linePathString}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray={evolved.strokeDasharray}
        strokeDashoffset={evolved.strokeDashoffset}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
