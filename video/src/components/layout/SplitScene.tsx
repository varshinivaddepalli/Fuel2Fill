import React from 'react';
import { AbsoluteFill } from 'remotion';

interface SplitSceneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  ratio?: '50/50' | '60/40' | '40/60';
  gap?: number;
}

const RATIO_MAP: Record<string, [number, number]> = {
  '50/50': [1, 1],
  '60/40': [3, 2],
  '40/60': [2, 3],
};

export const SplitScene: React.FC<SplitSceneProps> = ({
  left,
  right,
  ratio = '50/50',
  gap = 40,
}) => {
  const [leftFlex, rightFlex] = RATIO_MAP[ratio];

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap,
      }}
    >
      <div style={{ flex: leftFlex, overflow: 'hidden' }}>{left}</div>
      <div style={{ flex: rightFlex, overflow: 'hidden' }}>{right}</div>
    </AbsoluteFill>
  );
};
