import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';

interface CountUpNumberProps {
  target: number;
  delay?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  fontSize?: number;
  color?: string;
  formatAsIndianCurrency?: boolean;
}

const formatIndianCurrency = (num: number): string => {
  const str = Math.round(num).toString();
  let result = '';
  const len = str.length;
  let count = 0;

  for (let i = len - 1; i >= 0; i--) {
    result = str[i] + result;
    count++;
    if (count === 3 && i > 0) {
      result = ',' + result;
    } else if (count > 3 && (count - 3) % 2 === 0 && i > 0) {
      result = ',' + result;
    }
  }

  return result;
};

export const CountUpNumber: React.FC<CountUpNumberProps> = ({
  target,
  delay = 0,
  duration = 60,
  prefix = '₹',
  suffix = '',
  fontSize = 48,
  color = COLORS.TEXT_WHITE,
  formatAsIndianCurrency = true,
}) => {
  const frame = useCurrentFrame();

  const currentValue = interpolate(
    frame,
    [delay, delay + duration],
    [0, target],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.quad),
    },
  );

  const displayValue = formatAsIndianCurrency
    ? formatIndianCurrency(currentValue)
    : Math.round(currentValue).toLocaleString();

  return (
    <div
      style={{
        fontFamily,
        fontSize,
        fontWeight: 700,
        color,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {prefix}
      {displayValue}
      {suffix}
    </div>
  );
};
