import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface GlowOrbProps {
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  animate?: boolean;
}

export const GlowOrb: React.FC<GlowOrbProps> = ({
  x = 0,
  y = 0,
  size = 400,
  color = 'rgba(255,255,255,0.06)',
  animate = true,
}) => {
  const frame = useCurrentFrame();

  const scale = animate
    ? interpolate(frame % 120, [0, 60, 120], [0.95, 1.05, 0.95])
    : 1;

  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        transform: `scale(${scale})`,
        pointerEvents: 'none',
      }}
    />
  );
};
