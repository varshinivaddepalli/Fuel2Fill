import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';
import { GridBackground } from './GridBackground';
import { GlowOrb } from './GlowOrb';

interface FullScreenSceneProps {
  children: React.ReactNode;
  backgroundColor?: string;
  showGrid?: boolean;
  showGlow?: boolean;
  glowPosition?: { x: number; y: number };
}

export const FullScreenScene: React.FC<FullScreenSceneProps> = ({
  children,
  backgroundColor = COLORS.BG_BLACK,
  showGrid = true,
  showGlow = false,
  glowPosition,
}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        fontFamily,
        overflow: 'hidden',
      }}
    >
      {showGrid && <GridBackground />}
      {showGlow && glowPosition && (
        <GlowOrb x={glowPosition.x} y={glowPosition.y} />
      )}
      {children}
    </AbsoluteFill>
  );
};
