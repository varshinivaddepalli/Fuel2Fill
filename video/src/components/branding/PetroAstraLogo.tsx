import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';

interface PetroAstraLogoProps {
  delay?: number;
  size?: 'small' | 'medium' | 'large';
}

const SIZE_MAP: Record<string, number> = {
  small: 40,
  medium: 64,
  large: 96,
};

export const PetroAstraLogo: React.FC<PetroAstraLogoProps> = ({
  delay = 0,
  size = 'large',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fontSize = SIZE_MAP[size];

  const entranceScale = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 12,
    },
  });

  // Subtle breathing pulse after entrance (very slow oscillation 1.0 → 1.02)
  const breathFrame = Math.max(0, frame - delay - 30);
  const breathScale = interpolate(
    breathFrame % 90,
    [0, 45, 90],
    [1.0, 1.02, 1.0],
  );

  const finalScale = entranceScale * breathScale;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `scale(${finalScale})`,
      }}
    >
      <span
        style={{
          fontFamily,
          fontSize,
          fontWeight: 700,
          letterSpacing: fontSize * 0.15,
          textTransform: 'uppercase',
          lineHeight: 1,
        }}
      >
        <span style={{ color: COLORS.TEXT_WHITE }}>PETRO </span>
        <span style={{ color: COLORS.TEXT_GRAY }}>ASTRA</span>
      </span>
    </div>
  );
};
