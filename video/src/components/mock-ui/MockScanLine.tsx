import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

type MockScanLineProps = {
  delay?: number;
  duration?: number;
  direction?: 'vertical' | 'horizontal';
};

export const MockScanLine: React.FC<MockScanLineProps> = ({
  delay = 0,
  duration = 60,
  direction = 'vertical',
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = frame - delay;

  if (adjustedFrame < 0 || adjustedFrame > duration) {
    return null;
  }

  const progress = interpolate(adjustedFrame, [0, duration], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = interpolate(
    adjustedFrame,
    [0, 5, duration - 5, duration],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const isVertical = direction === 'vertical';

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity }}>
      <div
        style={{
          position: 'absolute',
          ...(isVertical
            ? {
                left: 0,
                right: 0,
                top: `${progress}%`,
                height: 2,
              }
            : {
                top: 0,
                bottom: 0,
                left: `${progress}%`,
                width: 2,
              }),
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          boxShadow:
            '0 0 20px 8px rgba(255, 255, 255, 0.3), 0 0 60px 20px rgba(255, 255, 255, 0.1)',
        }}
      />
      {/* Trailing glow */}
      <div
        style={{
          position: 'absolute',
          ...(isVertical
            ? {
                left: 0,
                right: 0,
                top: `${Math.max(0, progress - 8)}%`,
                height: `${Math.min(8, progress)}%`,
              }
            : {
                top: 0,
                bottom: 0,
                left: `${Math.max(0, progress - 8)}%`,
                width: `${Math.min(8, progress)}%`,
              }),
          background: isVertical
            ? 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.05))'
            : 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.05))',
        }}
      />
    </AbsoluteFill>
  );
};
