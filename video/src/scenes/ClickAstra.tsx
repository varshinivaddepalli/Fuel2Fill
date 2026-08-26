import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from 'remotion';
import { COLORS } from '../lib/colors';
import { fontFamily } from '../lib/fonts';
import { FullScreenScene } from '../components/layout/FullScreenScene';
import { FadeInText } from '../components/animated/FadeInText';
import { StaggeredReveal } from '../components/animated/StaggeredReveal';
import { MockFormField } from '../components/mock-ui/MockFormField';
import { MockScanLine } from '../components/mock-ui/MockScanLine';

/* ------------------------------------------------------------------ */
/*  Upload area with sliding document                                   */
/* ------------------------------------------------------------------ */
interface UploadAreaProps {
  frame: number;
  fps: number;
}

const UploadArea: React.FC<UploadAreaProps> = ({ frame, fps }) => {
  // Upload area fade in
  const areaProgress = spring({
    fps,
    frame,
    delay: 40,
    config: { damping: 200 },
  });

  // Document slide in from right
  const docSlide = spring({
    fps,
    frame,
    delay: 55,
    config: { damping: 14, stiffness: 60 },
  });

  const docX = interpolate(docSlide, [0, 1], [200, 0]);
  const docOpacity = docSlide;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: areaProgress,
      }}
    >
      {/* Dashed upload border */}
      <div
        style={{
          width: 380,
          height: 480,
          border: `2px dashed ${COLORS.BORDER_LIGHT}`,
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Upload icon (visible before doc slides in) */}
        {frame < 70 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              opacity: interpolate(frame, [55, 70], [1, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            <svg width={48} height={48} viewBox="0 0 48 48" fill="none">
              <path
                d="M24 32V16M24 16L18 22M24 16L30 22"
                stroke={COLORS.TEXT_MUTED}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 32V36C8 38.2 9.8 40 12 40H36C38.2 40 40 38.2 40 36V32"
                stroke={COLORS.TEXT_MUTED}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div
              style={{
                fontSize: 14,
                color: COLORS.TEXT_MUTED,
                fontFamily,
              }}
            >
              Upload Invoice
            </div>
          </div>
        )}

        {/* Invoice document */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 30,
            width: 320,
            height: 440,
            backgroundColor: COLORS.BG_DARK,
            border: `1px solid ${COLORS.BORDER}`,
            borderRadius: 8,
            padding: 24,
            transform: `translateX(${docX}px)`,
            opacity: docOpacity,
            fontFamily,
          }}
        >
          {/* Invoice header */}
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: COLORS.TEXT_WHITE,
              marginBottom: 4,
            }}
          >
            INVOICE
          </div>
          <div
            style={{
              fontSize: 11,
              color: COLORS.TEXT_MUTED,
              marginBottom: 20,
            }}
          >
            Indian Oil Corporation Ltd.
          </div>

          {/* Separator line */}
          <div
            style={{
              height: 1,
              backgroundColor: COLORS.BORDER,
              marginBottom: 16,
            }}
          />

          {/* Mock invoice lines */}
          {[
            { label: 'Invoice No:', value: 'INV-2024-0847' },
            { label: 'Date:', value: '15 Mar 2026' },
            { label: 'GSTIN:', value: '27AABCI1234F1Z5' },
          ].map((line, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 12, color: COLORS.TEXT_MUTED }}>
                {line.label}
              </span>
              <span style={{ fontSize: 12, color: COLORS.TEXT_GRAY }}>
                {line.value}
              </span>
            </div>
          ))}

          {/* Separator */}
          <div
            style={{
              height: 1,
              backgroundColor: COLORS.BORDER,
              margin: '12px 0',
            }}
          />

          {/* Item lines */}
          {[
            { item: 'Diesel HSD', qty: '5000 L', amount: '₹42,500' },
            { item: 'Transport', qty: '1', amount: '₹1,230' },
            { item: 'GST (18%)', qty: '', amount: '₹1,500' },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 11, color: COLORS.TEXT_GRAY, flex: 2 }}>
                {row.item}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: COLORS.TEXT_MUTED,
                  flex: 1,
                  textAlign: 'center',
                }}
              >
                {row.qty}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: COLORS.TEXT_WHITE,
                  flex: 1,
                  textAlign: 'right',
                }}
              >
                {row.amount}
              </span>
            </div>
          ))}

          {/* Total */}
          <div
            style={{
              height: 1,
              backgroundColor: COLORS.BORDER_LIGHT,
              margin: '8px 0',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.TEXT_WHITE,
              }}
            >
              Total
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.TEXT_WHITE,
              }}
            >
              ₹45,230
            </span>
          </div>

          {/* Scan line overlay */}
          <MockScanLine delay={100} duration={60} direction="vertical" />
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Checkmark component                                                 */
/* ------------------------------------------------------------------ */
interface CheckmarkProps {
  delay: number;
  frame: number;
  fps: number;
}

const Checkmark: React.FC<CheckmarkProps> = ({ delay, frame, fps }) => {
  const progress = spring({
    fps,
    frame,
    delay,
    config: { damping: 12, stiffness: 100 },
  });

  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        backgroundColor: COLORS.SUCCESS,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: progress,
        transform: `scale(${progress})`,
        flexShrink: 0,
      }}
    >
      <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
        <path
          d="M2.5 6L5 8.5L9.5 3.5"
          stroke="white"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene                                                               */
/* ------------------------------------------------------------------ */
export const ClickAstra: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Export button visibility (420-480)
  const exportBtnProgress = spring({
    fps,
    frame,
    delay: 420,
    config: { damping: 200 },
  });

  // Subtle pulse for export button (1.0 → 1.05 → 1.0)
  const pulseScale =
    frame >= 440
      ? 1 + 0.05 * Math.sin((frame - 440) * 0.15)
      : 1;

  // Closing text fade
  const closingFade = interpolate(frame, [480, 510], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Fields + extracted data visible range
  const fieldsVisible = frame >= 180;
  const checkmarksVisible = frame >= 350;

  const fields = [
    { label: 'Invoice Number', value: 'INV-2024-0847', delay: 180, type: 'text' as const },
    { label: 'Amount', value: '₹45,230', delay: 195, type: 'text' as const },
    { label: 'Date', value: '15 Mar 2026', delay: 210, type: 'date' as const },
    { label: 'Vendor', value: 'Indian Oil Corporation', delay: 225, type: 'text' as const },
    { label: 'GSTIN', value: '27AABCI1234F1Z5', delay: 240, type: 'text' as const },
  ];

  return (
    <FullScreenScene showGrid showGlow glowPosition={{ x: 480, y: 540 }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          fontFamily,
        }}
      >
        {/* Title area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 50,
            gap: 8,
          }}
        >
          <FadeInText
            text="Click Astra"
            fontSize={64}
            fontWeight={700}
            delay={0}
          />
          <FadeInText
            text="AI Document Processing"
            fontSize={24}
            fontWeight={400}
            delay={15}
            color={COLORS.TEXT_GRAY}
          />
        </div>

        {/* Main content: Split layout */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            padding: '30px 80px',
            gap: 60,
          }}
        >
          {/* Left: Upload area + document */}
          <div style={{ flex: 1, display: 'flex' }}>
            <UploadArea frame={frame} fps={fps} />
          </div>

          {/* Right: Extracted fields */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 16,
              paddingRight: 40,
            }}
          >
            {fieldsVisible && (
              <>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: COLORS.TEXT_GRAY,
                    marginBottom: 8,
                    opacity: interpolate(frame, [180, 195], [0, 1], {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                    }),
                  }}
                >
                  Extracted Fields
                </div>

                <StaggeredReveal staggerDelay={10} baseDelay={180}>
                  {fields.map((field, i) => (
                    <div
                      key={field.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <MockFormField
                          label={field.label}
                          value={field.value}
                          delay={field.delay}
                          type={field.type}
                        />
                      </div>
                      {/* Checkmark */}
                      {checkmarksVisible && (
                        <Checkmark
                          delay={350 + i * 8}
                          frame={frame}
                          fps={fps}
                        />
                      )}
                    </div>
                  ))}
                </StaggeredReveal>

                {/* Export button */}
                <div
                  style={{
                    marginTop: 20,
                    opacity: exportBtnProgress,
                    transform: `scale(${pulseScale})`,
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: COLORS.TEXT_WHITE,
                      color: COLORS.BG_BLACK,
                      padding: '12px 24px',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      fontFamily,
                      boxShadow: `0 0 20px ${COLORS.GLOW_STRONG}`,
                    }}
                  >
                    <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                      <path
                        d="M8 2V10M8 10L5 7M8 10L11 7M3 13H13"
                        stroke={COLORS.BG_BLACK}
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Export to Excel
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Closing text */}
        {frame >= 480 && (
          <div
            style={{
              position: 'absolute',
              bottom: 80,
              left: 0,
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              opacity: closingFade,
            }}
          >
            <FadeInText
              text="No more manual data entry."
              fontSize={36}
              fontWeight={600}
              delay={480}
            />
          </div>
        )}
      </div>
    </FullScreenScene>
  );
};
