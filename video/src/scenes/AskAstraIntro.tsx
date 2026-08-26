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
import { TypewriterText } from '../components/animated/TypewriterText';
import { PulsingDot } from '../components/animated/PulsingDot';
import { MockChatBubble } from '../components/mock-ui/MockChatBubble';
import { MockKpiCard } from '../components/mock-ui/MockKpiCard';
import { MockLineChart } from '../components/mock-ui/MockLineChart';

/* ------------------------------------------------------------------ */
/*  Processing dots (3 dots with staggered pulse)                      */
/* ------------------------------------------------------------------ */
const ProcessingDots: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const entryOpacity = interpolate(adjustedFrame, [0, 5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        padding: '8px 14px',
        opacity: entryOpacity,
        alignItems: 'center',
      }}
    >
      <Sequence from={delay} layout="none">
        <PulsingDot color={COLORS.TEXT_MUTED} size={6} period={20} />
      </Sequence>
      <Sequence from={delay + 5} layout="none">
        <PulsingDot color={COLORS.TEXT_MUTED} size={6} period={20} />
      </Sequence>
      <Sequence from={delay + 10} layout="none">
        <PulsingDot color={COLORS.TEXT_MUTED} size={6} period={20} />
      </Sequence>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Navigation button (styled rectangle with icon circle)              */
/* ------------------------------------------------------------------ */
interface NavButtonProps {
  label: string;
  delay: number;
}

const NavButton: React.FC<NavButtonProps> = ({ label, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 14, stiffness: 80 },
  });

  const scale = 0.9 + 0.1 * progress;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 8,
        border: `1px solid ${COLORS.BORDER}`,
        backgroundColor: COLORS.BG_CARD,
        opacity: progress,
        transform: `scale(${scale})`,
        fontFamily,
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: COLORS.BORDER_LIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width={10} height={10} viewBox="0 0 10 10">
          <path
            d="M 2 5 L 8 5 M 6 3 L 8 5 L 6 7"
            stroke={COLORS.TEXT_WHITE}
            strokeWidth={1.2}
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: COLORS.TEXT_WHITE,
        }}
      >
        {label}
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  SQL toggle pill                                                     */
/* ------------------------------------------------------------------ */
const SqlToggle: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 200 },
  });

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        borderRadius: 6,
        border: `1px solid ${COLORS.BORDER}`,
        backgroundColor: COLORS.BG_BLACK,
        opacity: progress,
        fontFamily,
        marginTop: 4,
      }}
    >
      <svg width={10} height={10} viewBox="0 0 10 10">
        <rect x={1} y={2} width={3} height={6} rx={0.5} fill={COLORS.TEXT_MUTED} />
        <rect x={5} y={4} width={4} height={4} rx={0.5} fill={COLORS.TEXT_MUTED} />
      </svg>
      <span style={{ fontSize: 10, color: COLORS.TEXT_MUTED }}>Show SQL</span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Confidence badge                                                    */
/* ------------------------------------------------------------------ */
const ConfidenceBadge: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 200 },
  });

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 4,
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        opacity: progress,
        fontFamily,
        marginTop: 4,
      }}
    >
      <div
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          backgroundColor: COLORS.SUCCESS,
        }}
      />
      <span style={{ fontSize: 10, color: COLORS.SUCCESS, fontWeight: 500 }}>
        98% confident
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Line chart data                                                     */
/* ------------------------------------------------------------------ */
const REVENUE_LINE_DATA = [
  { x: 1, y: 145000 },
  { x: 2, y: 162000 },
  { x: 3, y: 138000 },
  { x: 4, y: 178000 },
  { x: 5, y: 195000 },
  { x: 6, y: 172000 },
  { x: 7, y: 210000 },
];

/* ------------------------------------------------------------------ */
/*  AskAstraIntro scene                                                */
/* ------------------------------------------------------------------ */
export const AskAstraIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title movement: starts centered, moves to top at frame 40-80
  const titleMoveProgress = interpolate(frame, [40, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(titleMoveProgress, [0, 1], [420, 60]);
  const titleScale = interpolate(titleMoveProgress, [0, 1], [1, 0.7]);

  // Chat container slides up from bottom
  const chatEntranceProgress = spring({
    fps,
    frame: frame - 40,
    config: { damping: 18, stiffness: 60 },
  });
  const chatTranslateY = interpolate(chatEntranceProgress, [0, 1], [600, 0]);
  const chatOpacity = chatEntranceProgress;

  // Determine which phase to show processing dots
  const showDots1 = frame >= 200 && frame < 240;
  const showDots2 = frame >= 400 && frame < 440;

  return (
    <FullScreenScene showGrid showGlow glowPosition={{ x: 960, y: 300 }}>
      {/* Title area */}
      <div
        style={{
          position: 'absolute',
          top: titleY,
          left: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          transform: `scale(${titleScale})`,
          transformOrigin: 'center top',
          zIndex: 10,
        }}
      >
        <Sequence from={0} layout="none">
          <FadeInText
            text="Ask Astra"
            fontSize={64}
            fontWeight={700}
            direction="up"
          />
        </Sequence>
        <Sequence from={15} layout="none">
          <FadeInText
            text="AI-Powered Analytics"
            fontSize={22}
            fontWeight={400}
            color={COLORS.TEXT_GRAY}
            direction="up"
          />
        </Sequence>
      </div>

      {/* Chat container */}
      <div
        style={{
          position: 'absolute',
          top: 160,
          left: '50%',
          width: 700,
          transform: `translateX(-50%) translateY(${chatTranslateY}px)`,
          opacity: chatOpacity,
          height: 700,
          backgroundColor: COLORS.BG_DARK,
          borderRadius: 16,
          border: `1px solid ${COLORS.BORDER}`,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflow: 'hidden',
          fontFamily,
        }}
      >
        {/* Chat header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingBottom: 12,
            borderBottom: `1px solid ${COLORS.BORDER}`,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: COLORS.SUCCESS,
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: COLORS.TEXT_GRAY,
            }}
          >
            Ask Astra Chat
          </span>
        </div>

        {/* Chat messages container */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            overflow: 'hidden',
          }}
        >
          {/* Welcome message */}
          <Sequence from={80} layout="none">
            <MockChatBubble
              message="Good Morning! I'm Ask Astra, your AI analyst."
              isUser={false}
              delay={0}
              showAvatar
            />
          </Sequence>

          {/* User query 1: total sales */}
          <Sequence from={120} layout="none">
            <MockChatBubble
              message=""
              isUser
              delay={0}
              showAvatar
            >
              <div
                style={{
                  backgroundColor: COLORS.BG_CARD_HOVER,
                  borderRadius: '12px 0 12px 12px',
                  padding: '10px 14px',
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: COLORS.TEXT_WHITE,
                }}
              >
                <TypewriterText
                  text="What were my total sales last week?"
                  delay={0}
                  charFrames={2}
                  showCursor
                  fontSize={14}
                  color={COLORS.TEXT_WHITE}
                />
              </div>
            </MockChatBubble>
          </Sequence>

          {/* Processing dots 1 */}
          {showDots1 && (
            <div style={{ paddingLeft: 38 }}>
              <ProcessingDots delay={0} />
            </div>
          )}

          {/* Assistant response 1: KPI card */}
          <Sequence from={240} layout="none">
            <MockChatBubble
              message="Here are your total sales from last week:"
              isUser={false}
              delay={0}
              showAvatar
            >
              <div style={{ paddingLeft: 0 }}>
                <MockKpiCard
                  title="Total Sales"
                  value={1245320}
                  prefix="₹"
                  trend="up"
                  trendValue="+12.5%"
                  delay={10}
                  formatAsIndianCurrency
                />
                <ConfidenceBadge delay={30} />
              </div>
            </MockChatBubble>
          </Sequence>

          {/* User query 2: revenue trend */}
          <Sequence from={340} layout="none">
            <MockChatBubble
              message=""
              isUser
              delay={0}
              showAvatar
            >
              <div
                style={{
                  backgroundColor: COLORS.BG_CARD_HOVER,
                  borderRadius: '12px 0 12px 12px',
                  padding: '10px 14px',
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: COLORS.TEXT_WHITE,
                }}
              >
                <TypewriterText
                  text="Show me daily revenue trend"
                  delay={0}
                  charFrames={2}
                  showCursor
                  fontSize={14}
                  color={COLORS.TEXT_WHITE}
                />
              </div>
            </MockChatBubble>
          </Sequence>

          {/* Processing dots 2 */}
          {showDots2 && (
            <div style={{ paddingLeft: 38 }}>
              <ProcessingDots delay={0} />
            </div>
          )}

          {/* Assistant response 2: Line chart */}
          <Sequence from={440} layout="none">
            <MockChatBubble
              message="Here's the daily revenue trend for last week:"
              isUser={false}
              delay={0}
              showAvatar
            >
              <div
                style={{
                  backgroundColor: COLORS.BG_CARD,
                  border: `1px solid ${COLORS.BORDER}`,
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <MockLineChart
                  data={REVENUE_LINE_DATA}
                  delay={15}
                  height={140}
                  width={420}
                  color={COLORS.TEXT_WHITE}
                  strokeWidth={2}
                />
              </div>
              <SqlToggle delay={50} />
            </MockChatBubble>
          </Sequence>

          {/* User query 3: how-to */}
          <Sequence from={560} layout="none">
            <MockChatBubble
              message=""
              isUser
              delay={0}
              showAvatar
            >
              <div
                style={{
                  backgroundColor: COLORS.BG_CARD_HOVER,
                  borderRadius: '12px 0 12px 12px',
                  padding: '10px 14px',
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: COLORS.TEXT_WHITE,
                }}
              >
                <TypewriterText
                  text="How do I add an employee?"
                  delay={0}
                  charFrames={2}
                  showCursor
                  fontSize={14}
                  color={COLORS.TEXT_WHITE}
                />
              </div>
            </MockChatBubble>
          </Sequence>

          {/* Assistant response 3: text + nav buttons */}
          <Sequence from={620} layout="none">
            <MockChatBubble
              message="I can help! Here's how to add an employee:"
              isUser={false}
              delay={0}
              showAvatar
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <NavButton label="Add Employee" delay={20} />
                <NavButton label="View Employee" delay={30} />
              </div>
            </MockChatBubble>
          </Sequence>
        </div>
      </div>

      {/* Bottom tagline */}
      <Sequence from={700} layout="none">
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 0,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <FadeInText
            text="Ask anything. Get instant answers."
            fontSize={36}
            fontWeight={600}
            direction="up"
            color={COLORS.TEXT_WHITE}
          />
        </div>
      </Sequence>
    </FullScreenScene>
  );
};
