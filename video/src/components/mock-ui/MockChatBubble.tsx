import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';

interface MockChatBubbleProps {
  message: string;
  isUser: boolean;
  delay?: number;
  showAvatar?: boolean;
  children?: React.ReactNode;
}

export const MockChatBubble: React.FC<MockChatBubbleProps> = ({
  message,
  isUser,
  delay = 0,
  showAvatar = true,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateX = interpolate(progress, [0, 1], [isUser ? 40 : -40, 0]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 10,
        opacity,
        transform: `translateX(${translateX}px)`,
        fontFamily,
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      {showAvatar && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: isUser ? COLORS.BG_CARD_HOVER : COLORS.BG_CARD,
            border: `1px solid ${COLORS.BORDER}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 600,
            color: COLORS.TEXT_WHITE,
            flexShrink: 0,
          }}
        >
          {isUser ? 'U' : 'A'}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '75%' }}>
        <div
          style={{
            backgroundColor: isUser ? COLORS.BG_CARD_HOVER : COLORS.BG_CARD,
            border: isUser ? 'none' : `1px solid ${COLORS.BORDER}`,
            borderRadius: isUser ? '12px 0 12px 12px' : '0 12px 12px 12px',
            padding: '10px 14px',
            fontSize: 14,
            lineHeight: 1.5,
            color: COLORS.TEXT_WHITE,
          }}
        >
          {message}
        </div>
        {children && <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>}
      </div>
    </div>
  );
};
