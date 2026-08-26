import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
  Easing,
} from 'remotion';
import { evolvePath } from '@remotion/paths';
import { COLORS } from '../lib/colors';
import { fontFamily } from '../lib/fonts';
import { FullScreenScene } from '../components/layout/FullScreenScene';
import { FadeInText } from '../components/animated/FadeInText';
import { StaggeredReveal } from '../components/animated/StaggeredReveal';

/* ------------------------------------------------------------------ */
/*  Tech grid data                                                      */
/* ------------------------------------------------------------------ */
const TECH_LABELS = [
  ['Next.js 16', 'TypeScript', 'Tailwind CSS'],
  ['FastAPI', 'LangGraph', 'Groq AI'],
  ['Supabase', 'React Query', 'shadcn/ui'],
];

/* ------------------------------------------------------------------ */
/*  Tech label badge                                                    */
/* ------------------------------------------------------------------ */
const TechBadge: React.FC<{ label: string }> = ({ label }) => {
  return (
    <div
      style={{
        backgroundColor: COLORS.BG_CARD,
        border: `1px solid ${COLORS.BORDER}`,
        borderRadius: 10,
        padding: '12px 24px',
        fontSize: 16,
        fontWeight: 500,
        color: COLORS.TEXT_WHITE,
        textAlign: 'center',
        fontFamily,
      }}
    >
      {label}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Architecture flow box                                               */
/* ------------------------------------------------------------------ */
interface ArchBoxProps {
  label: string;
  delay: number;
  x: number;
  y: number;
}

const ArchBox: React.FC<ArchBoxProps> = ({ label, delay, x, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    fps,
    frame: frame - delay,
    config: { damping: 18, stiffness: 100 },
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        backgroundColor: COLORS.BG_CARD_HOVER,
        border: `1px solid ${COLORS.BORDER}`,
        borderRadius: 8,
        padding: '8px 20px',
        fontSize: 14,
        fontWeight: 500,
        color: COLORS.TEXT_WHITE,
        fontFamily,
        opacity: entrance,
        transform: `scale(${0.8 + 0.2 * entrance})`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Arrow connector (SVG line with evolvePath)                          */
/* ------------------------------------------------------------------ */
interface ArrowLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  delay: number;
}

const ArrowLine: React.FC<ArrowLineProps> = ({ x1, y1, x2, y2, delay }) => {
  const frame = useCurrentFrame();

  const progress = interpolate(
    frame,
    [delay, delay + 20],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.quad),
    },
  );

  const pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
  const evolved = evolvePath(progress, pathD);

  // Arrow head
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const arrowSize = 6;
  const headX1 = x2 - arrowSize * Math.cos(angle - Math.PI / 6);
  const headY1 = y2 - arrowSize * Math.sin(angle - Math.PI / 6);
  const headX2 = x2 - arrowSize * Math.cos(angle + Math.PI / 6);
  const headY2 = y2 - arrowSize * Math.sin(angle + Math.PI / 6);

  const arrowOpacity = interpolate(progress, [0.8, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <>
      <path
        d={pathD}
        fill="none"
        stroke={COLORS.BORDER_LIGHT}
        strokeWidth={2}
        strokeDasharray={evolved.strokeDasharray}
        strokeDashoffset={evolved.strokeDashoffset}
        strokeLinecap="round"
      />
      <polygon
        points={`${x2},${y2} ${headX1},${headY1} ${headX2},${headY2}`}
        fill={COLORS.BORDER_LIGHT}
        opacity={arrowOpacity}
      />
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  Architecture diagram layout                                         */
/*  Browser → Next.js → Supabase                                       */
/*                    → FastAPI → LangGraph → Groq                     */
/* ------------------------------------------------------------------ */
const ARCH_BOXES = [
  { label: 'Browser', x: 100, y: 0, delay: 135 },
  { label: 'Next.js', x: 310, y: 0, delay: 145 },
  { label: 'Supabase', x: 520, y: -50, delay: 155 },
  { label: 'FastAPI', x: 520, y: 50, delay: 160 },
  { label: 'LangGraph', x: 720, y: 50, delay: 170 },
  { label: 'Groq', x: 900, y: 50, delay: 180 },
];

// Arrow connections: from right edge of source → left edge of target
const ARCH_ARROWS = [
  { x1: 195, y1: 18, x2: 305, y2: 18, delay: 148 },   // Browser → Next.js
  { x1: 390, y1: 10, x2: 515, y2: -32, delay: 158 },   // Next.js → Supabase
  { x1: 390, y1: 26, x2: 515, y2: 68, delay: 162 },     // Next.js → FastAPI
  { x1: 605, y1: 68, x2: 715, y2: 68, delay: 172 },     // FastAPI → LangGraph
  { x1: 815, y1: 68, x2: 895, y2: 68, delay: 182 },     // LangGraph → Groq
];

/* ------------------------------------------------------------------ */
/*  TechStack scene (300 frames = 10 seconds)                           */
/* ------------------------------------------------------------------ */
export const TechStack: React.FC = () => {
  return (
    <FullScreenScene showGrid showGlow glowPosition={{ x: 960, y: 540 }}>
      {/* Title: Frame 0-20 */}
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
        }}
      >
        <FadeInText
          text="Built with Modern Tech"
          fontSize={48}
          fontWeight={700}
          direction="up"
        />

        {/* 3x3 tech grid: Frame 20-130 */}
        <Sequence from={20} layout="none">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              marginTop: 40,
              width: '100%',
              maxWidth: 600,
            }}
          >
            {TECH_LABELS.map((row, rowIdx) => (
              <div
                key={rowIdx}
                style={{
                  display: 'flex',
                  gap: 12,
                  justifyContent: 'center',
                }}
              >
                <StaggeredReveal
                  staggerDelay={6}
                  direction="up"
                  baseDelay={rowIdx * 18}
                >
                  {row.map((label) => (
                    <TechBadge key={label} label={label} />
                  ))}
                </StaggeredReveal>
              </div>
            ))}
          </div>
        </Sequence>

        {/* Architecture flow: Frame 130-250 */}
        <Sequence from={130} layout="none">
          <div
            style={{
              position: 'relative',
              width: 1000,
              height: 120,
              marginTop: 50,
            }}
          >
            {/* SVG arrows layer */}
            <svg
              width={1000}
              height={120}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                overflow: 'visible',
              }}
            >
              {ARCH_ARROWS.map((arrow, i) => (
                <ArrowLine
                  key={i}
                  x1={arrow.x1}
                  y1={arrow.y1}
                  x2={arrow.x2}
                  y2={arrow.y2}
                  delay={arrow.delay}
                />
              ))}
            </svg>

            {/* Boxes layer */}
            {ARCH_BOXES.map((box) => (
              <ArchBox
                key={box.label}
                label={box.label}
                x={box.x}
                y={40 + box.y}
                delay={box.delay}
              />
            ))}
          </div>
        </Sequence>
      </div>

      {/* Closing text: Frame 250-300 */}
      <Sequence from={250} layout="none">
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 0,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <FadeInText
            text="Enterprise-grade. AI-powered. Lightning fast."
            fontSize={28}
            fontWeight={600}
            delay={250}
            color={COLORS.TEXT_GRAY}
          />
        </div>
      </Sequence>
    </FullScreenScene>
  );
};
