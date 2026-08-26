import React from 'react';
import { AbsoluteFill } from 'remotion';

interface GridBackgroundProps {
  dotColor?: string;
  spacing?: number;
}

export const GridBackground: React.FC<GridBackgroundProps> = ({
  dotColor = 'rgba(255,255,255,0.03)',
  spacing = 40,
}) => {
  const patternId = 'grid-dot-pattern';

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          <pattern
            id={patternId}
            x="0"
            y="0"
            width={spacing}
            height={spacing}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={spacing / 2} cy={spacing / 2} r={1.5} fill={dotColor} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </AbsoluteFill>
  );
};
