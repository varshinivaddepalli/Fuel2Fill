import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';

interface StaggeredRevealProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  baseDelay?: number;
}

export const StaggeredReveal: React.FC<StaggeredRevealProps> = ({
  children,
  staggerDelay = 8,
  direction = 'up',
  baseDelay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const distance = 20;

  return (
    <>
      {React.Children.map(children, (child, index) => {
        const itemDelay = baseDelay + index * staggerDelay;

        const progress = spring({
          fps,
          frame,
          config: { damping: 200 },
          delay: itemDelay,
        });

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
            style={{
              opacity: progress,
              transform: `translate(${translateX}px, ${translateY}px)`,
            }}
          >
            {child}
          </div>
        );
      })}
    </>
  );
};
