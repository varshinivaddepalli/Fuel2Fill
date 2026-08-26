import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
  Sequence,
} from 'remotion';
import { evolvePath } from '@remotion/paths';
import { COLORS } from '../lib/colors';
import { fontFamily } from '../lib/fonts';
import { FullScreenScene } from '../components/layout/FullScreenScene';
import { FadeInText } from '../components/animated/FadeInText';
import { MockKpiCard } from '../components/mock-ui/MockKpiCard';
import { MockDataTable } from '../components/mock-ui/MockDataTable';
import { MockBarChart } from '../components/mock-ui/MockBarChart';
import { AppScreenshot } from '../components/layout/AppScreenshot';

/* ------------------------------------------------------------------ */
/*  Quadrant wrapper                                                    */
/* ------------------------------------------------------------------ */
interface QuadrantProps {
  label: string;
  children: React.ReactNode;
  delay: number;
  frame: number;
  fps: number;
}

const Quadrant: React.FC<QuadrantProps> = ({
  label,
  children,
  delay,
  frame,
  fps,
}) => {
  const progress = spring({
    fps,
    frame,
    delay,
    config: { damping: 16, stiffness: 80 },
  });

  const scale = interpolate(progress, [0, 1], [0.8, 1]);
  const opacity = progress;

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: COLORS.BG_CARD,
        border: `1px solid ${COLORS.BORDER}`,
        borderRadius: 12,
        padding: 16,
        opacity,
        transform: `scale(${scale})`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Badge label */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 12,
          backgroundColor: COLORS.BG_DARK,
          border: `1px solid ${COLORS.BORDER_LIGHT}`,
          borderRadius: 6,
          padding: '3px 10px',
          fontSize: 11,
          fontWeight: 600,
          color: COLORS.TEXT_GRAY,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 32 }}>{children}</div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Classification flow diagram                                         */
/* ------------------------------------------------------------------ */
interface FlowBoxProps {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  delay: number;
  frame: number;
  fps: number;
  isMain?: boolean;
}

const FlowBox: React.FC<FlowBoxProps> = ({
  x,
  y,
  width,
  height,
  text,
  delay,
  frame,
  fps,
  isMain = false,
}) => {
  const progress = spring({
    fps,
    frame,
    delay,
    config: { damping: 200 },
  });

  return (
    <g style={{ opacity: progress }}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        fill={isMain ? COLORS.BG_CARD_HOVER : COLORS.BG_CARD}
        stroke={isMain ? COLORS.TEXT_WHITE : COLORS.BORDER}
        strokeWidth={isMain ? 2 : 1}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 + 5}
        textAnchor="middle"
        fill={COLORS.TEXT_WHITE}
        fontSize={isMain ? 14 : 12}
        fontWeight={isMain ? 600 : 400}
        fontFamily={fontFamily}
      >
        {text}
      </text>
    </g>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene                                                               */
/* ------------------------------------------------------------------ */
export const AskAstraResults: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Title (0-30)
  // Phase 2: 4-quadrant (30-250)
  // Phase 3: Classification flow (250-370)
  // Phase 4: Closing text (370-510)

  // Quadrant grid visibility
  const quadrantFadeOut = interpolate(frame, [220, 250], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Flow diagram visibility
  const flowFadeIn = interpolate(frame, [250, 270], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Table data
  const tableHeaders = ['Station', 'Revenue', 'Liters'];
  const tableRows = [
    ['Highway Express', '₹4,52,300', '12,450'],
    ['City Center', '₹3,18,700', '8,920'],
    ['Industrial Hub', '₹5,67,100', '15,800'],
    ['Airport Road', '₹2,89,400', '7,630'],
  ];

  // Bar chart data
  const barData = [
    { label: 'Mon', value: 4200 },
    { label: 'Tue', value: 3800 },
    { label: 'Wed', value: 5100 },
    { label: 'Thu', value: 4700 },
    { label: 'Fri', value: 6300 },
  ];

  // Classification flow arrow paths
  const arrowPaths = [
    'M 470 300 C 510 300, 530 220, 570 220',
    'M 470 300 C 510 300, 530 270, 570 270',
    'M 470 300 C 510 300, 530 330, 570 330',
    'M 470 300 C 510 300, 530 380, 570 380',
  ];

  // Flow box from "User Query"
  const mainArrowPath = 'M 280 300 C 320 300, 340 300, 370 300';

  return (
    <FullScreenScene showGrid showGlow glowPosition={{ x: 960, y: 300 }}>
      {/* Centered content container */}
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
          fontFamily,
          padding: '40px 80px',
        }}
      >
        {/* Phase 1: Title */}
        <div style={{ marginBottom: 30 }}>
          <FadeInText
            text="Intelligent Responses"
            fontSize={48}
            fontWeight={700}
            delay={0}
          />
        </div>

        {/* Phase 2: 4-Quadrant grid */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 20,
            width: '100%',
            maxWidth: 1600,
            flex: 1,
            opacity: quadrantFadeOut,
          }}
        >
          {/* Top-left: Text response */}
          <div style={{ flex: '1 1 45%', display: 'flex' }}>
            <Quadrant label="Text" delay={35} frame={frame} fps={fps}>
              <div
                style={{
                  backgroundColor: COLORS.BG_DARK,
                  borderRadius: 8,
                  padding: 16,
                  border: `1px solid ${COLORS.BORDER}`,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    color: COLORS.TEXT_GRAY,
                    marginBottom: 8,
                  }}
                >
                  Response:
                </div>
                <div
                  style={{
                    fontSize: 18,
                    color: COLORS.TEXT_WHITE,
                    lineHeight: 1.5,
                  }}
                >
                  Good morning! How can I help you today?
                </div>
              </div>
            </Quadrant>
          </div>

          {/* Top-right: KPI Card */}
          <div style={{ flex: '1 1 45%', display: 'flex' }}>
            <Quadrant label="Card" delay={50} frame={frame} fps={fps}>
              <MockKpiCard
                title="Active Stations"
                value={5}
                prefix=""
                delay={60}
                formatAsIndianCurrency={false}
              />
            </Quadrant>
          </div>

          {/* Bottom-left: Table */}
          <div style={{ flex: '1 1 45%', display: 'flex' }}>
            <Quadrant label="Table" delay={65} frame={frame} fps={fps}>
              <MockDataTable
                headers={tableHeaders}
                rows={tableRows}
                delay={75}
              />
            </Quadrant>
          </div>

          {/* Bottom-right: Chart */}
          <div style={{ flex: '1 1 45%', display: 'flex' }}>
            <Quadrant label="Chart" delay={80} frame={frame} fps={fps}>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
                <MockBarChart data={barData} delay={90} height={180} />
              </div>
            </Quadrant>
          </div>
        </div>

        {/* Phase 3: Classification flow diagram */}
        <div
          style={{
            position: 'absolute',
            top: 120,
            left: 0,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            opacity: flowFadeIn,
          }}
        >
          <svg
            width={900}
            height={500}
            viewBox="100 180 800 240"
            style={{ fontFamily }}
          >
            {/* Main arrow: User Query → Classifier */}
            {(() => {
              const arrowDelay = 255;
              const progress = interpolate(
                frame - arrowDelay,
                [0, 20],
                [0, 1],
                {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                  easing: Easing.out(Easing.quad),
                }
              );
              const { strokeDasharray, strokeDashoffset } = evolvePath(
                progress,
                mainArrowPath
              );
              return (
                <path
                  d={mainArrowPath}
                  fill="none"
                  stroke={COLORS.BORDER_LIGHT}
                  strokeWidth={2}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                />
              );
            })()}

            {/* Branch arrows */}
            {arrowPaths.map((path, i) => {
              const arrowDelay = 275 + i * 6;
              const progress = interpolate(
                frame - arrowDelay,
                [0, 25],
                [0, 1],
                {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                  easing: Easing.out(Easing.quad),
                }
              );
              const { strokeDasharray, strokeDashoffset } = evolvePath(
                progress,
                path
              );
              return (
                <path
                  key={`arrow-${i}`}
                  d={path}
                  fill="none"
                  stroke={COLORS.BORDER_LIGHT}
                  strokeWidth={2}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                />
              );
            })}

            {/* Boxes */}
            <FlowBox
              x={150}
              y={280}
              width={130}
              height={40}
              text="User Query"
              delay={252}
              frame={frame}
              fps={fps}
              isMain
            />
            <FlowBox
              x={370}
              y={275}
              width={100}
              height={50}
              text="4-Way Classifier"
              delay={260}
              frame={frame}
              fps={fps}
              isMain
            />
            <FlowBox
              x={575}
              y={202}
              width={120}
              height={36}
              text="data_query"
              delay={285}
              frame={frame}
              fps={fps}
            />
            <FlowBox
              x={575}
              y={252}
              width={120}
              height={36}
              text="greeting"
              delay={291}
              frame={frame}
              fps={fps}
            />
            <FlowBox
              x={575}
              y={312}
              width={120}
              height={36}
              text="follow_up"
              delay={297}
              frame={frame}
              fps={fps}
            />
            <FlowBox
              x={575}
              y={362}
              width={120}
              height={36}
              text="meta"
              delay={303}
              frame={frame}
              fps={fps}
            />
          </svg>
        </div>

        {/* Real app video overlay: Ask Astra chat */}
        <Sequence from={380} layout="none">
          <div style={{ position: 'absolute', bottom: 40, right: 40 }}>
            <AppScreenshot screenshot="screenshots/images2.png" delay={0} scale={0.4} />
          </div>
        </Sequence>

        {/* Phase 4: Closing text */}
        {frame >= 370 && (
          <div
            style={{
              position: 'absolute',
              bottom: 180,
              left: 0,
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <FadeInText
              text="The system classifies your intent automatically"
              fontSize={32}
              fontWeight={500}
              delay={370}
              color={COLORS.TEXT_GRAY}
            />
          </div>
        )}
      </div>
    </FullScreenScene>
  );
};
