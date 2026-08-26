import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface PulsingDotProps {
  color?: string;
  size?: number;
  period?: number;
}

export const PulsingDot: React.FC<PulsingDotProps> = ({
  color = '#4ADE80',
  size = 8,
  period = 30,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame % period,
    [0, period * 0.5, period],
    [1.0, 0.4, 1.0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color,
        opacity,
        boxShadow: `0 0 ${size}px ${color}`,
        display: 'inline-block',
      }}
    />
  );
};
