import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';

interface FadeInTextProps {
  text: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  className?: string;
}

export const FadeInText: React.FC<FadeInTextProps> = ({
  text,
  delay = 0,
  direction = 'up',
  fontSize = 32,
  fontWeight = 600,
  color = COLORS.TEXT_WHITE,
  className,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    fps,
    frame,
    config: { damping: 200 },
    delay,
  });

  const distance = 30;

  const translateX =
    direction === 'left'
      ? (1 - progress) * -distance
      : direction === 'right'
        ? (1 - progress) * distance
        : 0;

  const translateY =
    direction === 'up'
      ? (1 - progress) * distance
      : direction === 'down'
        ? (1 - progress) * -distance
        : 0;

  return (
    <div
      className={className}
      style={{
        fontFamily,
        fontSize,
        fontWeight,
        color,
        opacity: progress,
        transform: `translate(${translateX}px, ${translateY}px)`,
      }}
    >
      {text}
    </div>
  );
};
