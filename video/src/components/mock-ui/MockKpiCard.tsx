import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';
import { CountUpNumber } from '../animated/CountUpNumber';

interface MockKpiCardProps {
  title: string;
  value: number;
  prefix?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  delay?: number;
  formatAsIndianCurrency?: boolean;
}

export const MockKpiCard: React.FC<MockKpiCardProps> = ({
  title,
  value,
  prefix = '\u20B9',
  trend,
  trendValue,
  delay = 0,
  formatAsIndianCurrency = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entranceProgress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 100 },
  });

  const scale = 0.9 + 0.1 * entranceProgress;
  const opacity = entranceProgress;

  const trendColor =
    trend === 'up'
      ? COLORS.SUCCESS
      : trend === 'down'
        ? COLORS.ERROR
        : COLORS.TEXT_MUTED;

  const trendArrow =
    trend === 'up' ? '\u2191' : trend === 'down' ? '\u2193' : '';

  return (
    <div
      style={{
        backgroundColor: COLORS.BG_CARD,
        border: `1px solid ${COLORS.BORDER}`,
        borderRadius: 12,
        padding: 20,
        transform: `scale(${scale})`,
        opacity,
        fontFamily,
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: COLORS.TEXT_GRAY,
          marginBottom: 12,
        }}
      >
        {title}
      </div>

      {/* Value */}
      <CountUpNumber
        target={value}
        delay={delay + 10}
        prefix={prefix}
        fontSize={32}
        color={COLORS.TEXT_WHITE}
        formatAsIndianCurrency={formatAsIndianCurrency}
      />

      {/* Trend */}
      {trend && trend !== 'neutral' && trendValue && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 10,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: trendColor,
            }}
          >
            {trendArrow} {trendValue}
          </span>
        </div>
      )}
    </div>
  );
};
