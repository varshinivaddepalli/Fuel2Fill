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

/* ------------------------------------------------------------------ */
/*  Floating document icon (simple SVG receipt / spreadsheet shape)    */
/* ------------------------------------------------------------------ */
interface DocIconProps {
  x: number;
  y: number;
  rotation: number;
  variant: number; // 0-3 for different inner-line layouts
  frame: number;
  fps: number;
  entryDelay: number;
}

const DocIcon: React.FC<DocIconProps> = ({
  x,
  y,
  rotation,
  variant,
  frame,
  fps,
  entryDelay,
}) => {
  // Entrance spring
  const enterProgress = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 60 },
    delay: entryDelay,
  });

  // Gentle drift over time
  const driftX = Math.sin((frame + entryDelay * 7) * 0.02) * 8;
  const driftY = Math.cos((frame + entryDelay * 11) * 0.015) * 6;
  const driftRot = Math.sin((frame + entryDelay * 5) * 0.012) * 4;

  // Compress toward center (frames 150-200 of the composition)
  const compressProgress = interpolate(frame, [150, 200], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const compressedX = interpolate(compressProgress, [0, 1], [x, 960]);
  const compressedY = interpolate(compressProgress, [0, 1], [y, 540]);
  const compressedScale = interpolate(compressProgress, [0, 1], [1, 0.3]);

  // Fade out (frames 200-240)
  const fadeOut = interpolate(frame, [200, 240], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const finalX = compressedX + driftX * (1 - compressProgress);
  const finalY = compressedY + driftY * (1 - compressProgress);
  const finalRot = rotation + driftRot * (1 - compressProgress);

  // Inner lines vary by variant
  const innerLines: React.ReactNode[] = [];
  const lineColor = COLORS.BORDER_LIGHT;
  if (variant === 0) {
    // Receipt: multiple short lines
    innerLines.push(
      <line key="l1" x1={8} y1={14} x2={32} y2={14} stroke={lineColor} strokeWidth={2} />,
      <line key="l2" x1={8} y1={22} x2={28} y2={22} stroke={lineColor} strokeWidth={2} />,
      <line key="l3" x1={8} y1={30} x2={24} y2={30} stroke={lineColor} strokeWidth={2} />,
      <line key="l4" x1={8} y1={38} x2={30} y2={38} stroke={lineColor} strokeWidth={2} />,
    );
  } else if (variant === 1) {
    // Spreadsheet: grid
    innerLines.push(
      <line key="h1" x1={6} y1={18} x2={34} y2={18} stroke={lineColor} strokeWidth={1} />,
      <line key="h2" x1={6} y1={28} x2={34} y2={28} stroke={lineColor} strokeWidth={1} />,
      <line key="h3" x1={6} y1={38} x2={34} y2={38} stroke={lineColor} strokeWidth={1} />,
      <line key="v1" x1={20} y1={12} x2={20} y2={42} stroke={lineColor} strokeWidth={1} />,
    );
  } else if (variant === 2) {
    // Invoice: header block + lines
    innerLines.push(
      <rect key="hdr" x={8} y={12} width={24} height={6} rx={1} fill={lineColor} />,
      <line key="l1" x1={8} y1={24} x2={32} y2={24} stroke={lineColor} strokeWidth={2} />,
      <line key="l2" x1={8} y1={32} x2={26} y2={32} stroke={lineColor} strokeWidth={2} />,
      <line key="l3" x1={8} y1={40} x2={20} y2={40} stroke={lineColor} strokeWidth={2} />,
    );
  } else {
    // Chart doc: small bar chart inside
    innerLines.push(
      <rect key="b1" x={10} y={32} width={5} height={10} fill={lineColor} />,
      <rect key="b2" x={17} y={26} width={5} height={16} fill={lineColor} />,
      <rect key="b3" x={24} y={20} width={5} height={22} fill={lineColor} />,
      <line key="ax" x1={8} y1={42} x2={32} y2={42} stroke={lineColor} strokeWidth={1} />,
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: finalX - 20,
        top: finalY - 25,
        opacity: enterProgress * fadeOut,
        transform: `rotate(${finalRot}deg) scale(${enterProgress * compressedScale})`,
        transformOrigin: 'center center',
      }}
    >
      <svg width={40} height={50} viewBox="0 0 40 50">
        {/* Document body */}
        <rect
          x={2}
          y={2}
          width={36}
          height={46}
          rx={4}
          fill="none"
          stroke={COLORS.TEXT_MUTED}
          strokeWidth={1.5}
        />
        {/* Corner fold */}
        <path d="M 28 2 L 38 12" stroke={COLORS.TEXT_MUTED} strokeWidth={1} fill="none" />
        {innerLines}
      </svg>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Document icon positions and configs                                */
/* ------------------------------------------------------------------ */
const DOCUMENT_ICONS = [
  { x: 280, y: 220, rotation: -12, variant: 0, entryDelay: 30 },
  { x: 1600, y: 180, rotation: 8, variant: 1, entryDelay: 35 },
  { x: 450, y: 680, rotation: -20, variant: 2, entryDelay: 40 },
  { x: 1400, y: 720, rotation: 15, variant: 3, entryDelay: 38 },
  { x: 700, y: 150, rotation: 5, variant: 1, entryDelay: 42 },
  { x: 1200, y: 400, rotation: -8, variant: 0, entryDelay: 33 },
  { x: 350, y: 450, rotation: 18, variant: 2, entryDelay: 45 },
  { x: 1550, y: 550, rotation: -15, variant: 3, entryDelay: 36 },
];

/* ------------------------------------------------------------------ */
/*  ColdOpen scene                                                     */
/* ------------------------------------------------------------------ */
export const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Global fade-out for everything (frames 200-240)
  const globalFade = interpolate(frame, [200, 240], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <FullScreenScene showGrid={false}>
      {/* Floating document icons */}
      {DOCUMENT_ICONS.map((icon, i) => (
        <DocIcon key={i} {...icon} frame={frame} fps={fps} />
      ))}

      {/* Text overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 12,
          opacity: globalFade,
          fontFamily,
        }}
      >
        <Sequence from={60} layout="none">
          <FadeInText
            text="Managing fuel stations"
            fontSize={52}
            fontWeight={600}
            direction="up"
          />
        </Sequence>

        <Sequence from={90} layout="none">
          <FadeInText
            text="shouldn't feel like this."
            fontSize={52}
            fontWeight={600}
            direction="up"
          />
        </Sequence>
      </div>
    </FullScreenScene>
  );
};
