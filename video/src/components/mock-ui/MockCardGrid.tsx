import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';

interface CardItem {
  title: string;
  subtitle?: string;
  icon?: string;
  value?: string;
}

interface MockCardGridProps {
  cards: CardItem[];
  columns?: number;
  delay?: number;
}

export const MockCardGrid: React.FC<MockCardGridProps> = ({
  cards,
  columns = 3,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        fontFamily,
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 16,
      }}
    >
      {cards.map((card, index) => {
        const cardDelay = delay + index * 6;
        const progress = spring({
          frame: frame - cardDelay,
          fps,
          config: { damping: 200 },
        });

        const opacity = interpolate(progress, [0, 1], [0, 1]);
        const scale = interpolate(progress, [0, 1], [0.9, 1]);

        return (
          <div
            key={index}
            style={{
              backgroundColor: COLORS.BG_CARD,
              border: `1px solid ${COLORS.BORDER}`,
              borderRadius: 12,
              padding: 16,
              opacity,
              transform: `scale(${scale})`,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {/* Icon placeholder */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: COLORS.BG_DARK,
                border: `1px solid ${COLORS.BORDER}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                color: COLORS.TEXT_GRAY,
              }}
            >
              {card.icon || ''}
            </div>

            {/* Title */}
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.TEXT_WHITE,
              }}
            >
              {card.title}
            </div>

            {/* Subtitle */}
            {card.subtitle && (
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.TEXT_GRAY,
                  lineHeight: 1.4,
                }}
              >
                {card.subtitle}
              </div>
            )}

            {/* Value */}
            {card.value && (
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: COLORS.ACCENT,
                  marginTop: 'auto',
                }}
              >
                {card.value}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
