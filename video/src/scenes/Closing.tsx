import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
} from 'remotion';
import { COLORS } from '../lib/colors';
import { fontFamily } from '../lib/fonts';
import { FullScreenScene } from '../components/layout/FullScreenScene';
import { FadeInText } from '../components/animated/FadeInText';
import { PetroAstraLogo } from '../components/branding/PetroAstraLogo';
import { Tagline } from '../components/branding/Tagline';

/* ------------------------------------------------------------------ */
/*  Particle field                                                      */
/* ------------------------------------------------------------------ */
interface Particle {
  x: number;
  startY: number;
  speed: number;
  opacity: number;
  size: number;
}

// Deterministic particle positions (no Math.random at render time)
const PARTICLES: Particle[] = [
  { x: 120, startY: 900, speed: 0.35, opacity: 0.15, size: 2 },
  { x: 280, startY: 950, speed: 0.45, opacity: 0.2, size: 3 },
  { x: 440, startY: 880, speed: 0.3, opacity: 0.1, size: 2 },
  { x: 580, startY: 920, speed: 0.5, opacity: 0.25, size: 4 },
  { x: 720, startY: 960, speed: 0.4, opacity: 0.15, size: 3 },
  { x: 860, startY: 890, speed: 0.35, opacity: 0.2, size: 2 },
  { x: 1000, startY: 940, speed: 0.45, opacity: 0.1, size: 3 },
  { x: 1140, startY: 910, speed: 0.3, opacity: 0.2, size: 2 },
  { x: 1280, startY: 950, speed: 0.5, opacity: 0.15, size: 4 },
  { x: 1420, startY: 880, speed: 0.4, opacity: 0.25, size: 3 },
  { x: 1560, startY: 930, speed: 0.35, opacity: 0.1, size: 2 },
  { x: 1700, startY: 960, speed: 0.45, opacity: 0.2, size: 3 },
  { x: 200, startY: 970, speed: 0.38, opacity: 0.15, size: 2 },
  { x: 650, startY: 900, speed: 0.42, opacity: 0.18, size: 3 },
  { x: 1100, startY: 940, speed: 0.33, opacity: 0.12, size: 2 },
];

const ParticleField: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {PARTICLES.map((p, i) => {
        const y = p.startY - frame * p.speed;
        // Loop particles: when they drift off top, wrap to bottom
        const wrappedY = ((y % 1080) + 1080) % 1080;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.x,
              top: wrappedY,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: COLORS.TEXT_WHITE,
              opacity: p.opacity,
            }}
          />
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  CTA with underline draw                                             */
/* ------------------------------------------------------------------ */
const CtaText: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();

  const underlineWidth = interpolate(
    frame,
    [delay + 20, delay + 50],
    [0, 100],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <FadeInText
        text="Start your free trial today"
        fontSize={24}
        fontWeight={500}
        delay={delay}
        color={COLORS.TEXT_GRAY}
      />
      <div
        style={{
          width: `${underlineWidth}%`,
          maxWidth: 300,
          height: 2,
          backgroundColor: COLORS.TEXT_GRAY,
          borderRadius: 1,
        }}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Closing scene (450 frames = 15 seconds)                             */
/* ------------------------------------------------------------------ */
export const Closing: React.FC = () => {
  return (
    <FullScreenScene
      showGrid={false}
      showGlow
      glowPosition={{ x: 960, y: 400 }}
    >
      {/* Particle field - always visible */}
      <ParticleField />

      {/* Central content */}
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
          gap: 32,
          zIndex: 1,
        }}
      >
        {/* Logo: Frame 60-150 */}
        <Sequence from={60} layout="none">
          <PetroAstraLogo delay={60} size="large" />
        </Sequence>

        {/* Tagline: Frame 150-250 */}
        <Sequence from={150} layout="none">
          <Tagline delay={150} />
        </Sequence>

        {/* CTA: Frame 250-330+ */}
        <Sequence from={250} layout="none">
          <CtaText delay={250} />
        </Sequence>
      </div>
    </FullScreenScene>
  );
};
