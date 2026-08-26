import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface SceneSectionProps {
  children: React.ReactNode;
  delay: number;
  exitAt: number;
}

export const SceneSection: React.FC<SceneSectionProps> = ({
  children,
  delay,
  exitAt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterProgress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 200 },
  });

  const exitProgress =
    exitAt > 0
      ? interpolate(frame, [exitAt - 15, exitAt], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1;

  const opacity = enterProgress * exitProgress;
  const translateY = (1 - enterProgress) * 30;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 80px',
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {children}
    </div>
  );
};
