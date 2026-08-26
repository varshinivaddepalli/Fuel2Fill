import React from 'react';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';

interface ScreenFrameProps {
  children: React.ReactNode;
  title?: string;
  grayscale?: boolean;
  scale?: number;
}

export const ScreenFrame: React.FC<ScreenFrameProps> = ({
  children,
  title,
  grayscale = true,
  scale = 1,
}) => {
  const dotColors = grayscale
    ? ['#666666', '#555555', '#444444']
    : ['#FF5F56', '#FFBD2E', '#27C93F'];

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        borderRadius: 12,
        overflow: 'hidden',
        border: `1px solid ${COLORS.BORDER}`,
        background: COLORS.BG_CARD,
        filter: grayscale ? 'grayscale(1)' : undefined,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          backgroundColor: COLORS.BG_DARK,
          borderBottom: `1px solid ${COLORS.BORDER}`,
        }}
      >
        {dotColors.map((color, i) => (
          <div
            key={i}
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: color,
            }}
          />
        ))}
        {title && (
          <span
            style={{
              marginLeft: 8,
              fontSize: 13,
              color: COLORS.TEXT_MUTED,
              fontFamily,
            }}
          >
            {title}
          </span>
        )}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'hidden' }}>{children}</div>
    </div>
  );
};
