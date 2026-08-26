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
import { StaggeredReveal } from '../components/animated/StaggeredReveal';
import { MockTopologyDiagram } from '../components/mock-ui/MockTopologyDiagram';
import { MockFormField } from '../components/mock-ui/MockFormField';
import { AppScreenshot } from '../components/layout/AppScreenshot';

/* ------------------------------------------------------------------ */
/*  Station card                                                        */
/* ------------------------------------------------------------------ */
interface StationCardProps {
  name: string;
  city: string;
  state: string;
  pumps: number;
  nozzles: number;
}

const StationCard: React.FC<StationCardProps> = ({
  name,
  city,
  state,
  pumps,
  nozzles,
}) => {
  return (
    <div
      style={{
        backgroundColor: COLORS.BG_CARD,
        border: `1px solid ${COLORS.BORDER}`,
        borderRadius: 12,
        padding: 20,
        fontFamily,
        minWidth: 240,
        flex: 1,
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: COLORS.TEXT_WHITE,
          marginBottom: 4,
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontSize: 13,
          color: COLORS.TEXT_GRAY,
          marginBottom: 12,
        }}
      >
        {city}, {state}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 12, color: COLORS.TEXT_MUTED }}>
          {pumps} pumps
        </div>
        <div style={{ fontSize: 12, color: COLORS.TEXT_MUTED }}>
          {nozzles} nozzles
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Mini form section                                                   */
/* ------------------------------------------------------------------ */
interface FormSectionProps {
  title: string;
  fields: { label: string; value: string }[];
  delay: number;
  frame: number;
  fps: number;
}

const FormSection: React.FC<FormSectionProps> = ({
  title,
  fields,
  delay,
  frame,
  fps,
}) => {
  const progress = spring({
    fps,
    frame,
    delay,
    config: { damping: 200 },
  });

  return (
    <div
      style={{
        backgroundColor: COLORS.BG_CARD,
        border: `1px solid ${COLORS.BORDER}`,
        borderRadius: 10,
        padding: 16,
        fontFamily,
        flex: 1,
        minWidth: 280,
        opacity: progress,
        transform: `translateY(${(1 - progress) * 20}px)`,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: COLORS.TEXT_WHITE,
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {/* Small form icon */}
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
          <rect
            x={1}
            y={1}
            width={12}
            height={12}
            rx={2}
            stroke={COLORS.TEXT_MUTED}
            strokeWidth={1.2}
          />
          <line
            x1={3.5}
            y1={5}
            x2={10.5}
            y2={5}
            stroke={COLORS.TEXT_MUTED}
            strokeWidth={1}
          />
          <line
            x1={3.5}
            y1={8}
            x2={8}
            y2={8}
            stroke={COLORS.TEXT_MUTED}
            strokeWidth={1}
          />
        </svg>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fields.map((field, i) => (
          <MockFormField
            key={field.label}
            label={field.label}
            value={field.value}
            delay={delay + 10 + i * 12}
          />
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene                                                               */
/* ------------------------------------------------------------------ */
export const Registration: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase visibility
  const topologyVisible = frame >= 40;
  const cardsVisible = frame >= 220;
  const formsVisible = frame >= 380;

  // Topology fade out when cards come in
  const topologyScale = interpolate(frame, [200, 240], [1, 0.6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const topologyOpacity = interpolate(frame, [200, 240], [1, 0.7], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Further fade when forms come in
  const topologyFinalOpacity = interpolate(frame, [360, 390], [topologyOpacity, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Cards fade when forms come in
  const cardsFadeOut = interpolate(frame, [360, 390], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Forms fade out for closing
  const formsFadeOut = interpolate(frame, [480, 500], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stations: StationCardProps[] = [
    {
      name: 'Highway Express',
      city: 'Mumbai',
      state: 'Maharashtra',
      pumps: 6,
      nozzles: 12,
    },
    {
      name: 'City Center',
      city: 'Pune',
      state: 'Maharashtra',
      pumps: 4,
      nozzles: 8,
    },
    {
      name: 'Industrial Hub',
      city: 'Nashik',
      state: 'Maharashtra',
      pumps: 8,
      nozzles: 16,
    },
  ];

  const formSections = [
    {
      title: 'Add Station',
      fields: [
        { label: 'Name', value: 'Highway Express' },
        { label: 'City', value: 'Mumbai' },
        { label: 'State', value: 'Maharashtra' },
      ],
      delay: 385,
    },
    {
      title: 'Add Tank',
      fields: [
        { label: 'Tank Number', value: 'T-001' },
        { label: 'Capacity', value: '20,000 L' },
      ],
      delay: 400,
    },
    {
      title: 'Add Pump',
      fields: [
        { label: 'Pump Number', value: 'P-001' },
        { label: 'Station', value: 'Highway Express' },
      ],
      delay: 415,
    },
  ];

  return (
    <FullScreenScene showGrid showGlow glowPosition={{ x: 960, y: 400 }}>
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
        {/* Title */}
        <div style={{ marginBottom: 20 }}>
          <FadeInText
            text="Complete Infrastructure Management"
            fontSize={48}
            fontWeight={700}
            delay={0}
          />
        </div>

        {/* Topology diagram */}
        {topologyVisible && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              opacity: topologyFinalOpacity,
              transform: `scale(${topologyScale})`,
              marginBottom: 10,
            }}
          >
            <MockTopologyDiagram delay={40} />
          </div>
        )}

        {/* Station cards */}
        {cardsVisible && (
          <div
            style={{
              display: 'flex',
              gap: 24,
              width: '100%',
              maxWidth: 1200,
              justifyContent: 'center',
              opacity: cardsFadeOut,
              marginBottom: 20,
            }}
          >
            <StaggeredReveal staggerDelay={12} baseDelay={220}>
              {stations.map((station) => (
                <StationCard key={station.name} {...station} />
              ))}
            </StaggeredReveal>
          </div>
        )}

        {/* Form montage */}
        {formsVisible && (
          <div
            style={{
              position: 'absolute',
              top: 140,
              left: 80,
              right: 80,
              display: 'flex',
              gap: 24,
              justifyContent: 'center',
              opacity: formsFadeOut,
            }}
          >
            {formSections.map((section) => (
              <FormSection
                key={section.title}
                title={section.title}
                fields={section.fields}
                delay={section.delay}
                frame={frame}
                fps={fps}
              />
            ))}
          </div>
        )}

        {/* Real app video overlay: Registration flow */}
        <Sequence from={380} layout="none">
          <div style={{ position: 'absolute', bottom: 40, right: 40 }}>
            <AppScreenshot screenshot="screenshots/images3.png" delay={0} scale={0.4} />
          </div>
        </Sequence>

        {/* Closing text */}
        {frame >= 500 && (
          <div
            style={{
              position: 'absolute',
              bottom: 200,
              left: 0,
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <FadeInText
              text="7 registration forms. Complete setup."
              fontSize={32}
              fontWeight={500}
              delay={500}
              color={COLORS.TEXT_GRAY}
            />
          </div>
        )}
      </div>
    </FullScreenScene>
  );
};
