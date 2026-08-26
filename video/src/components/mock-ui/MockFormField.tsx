import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';

interface MockFormFieldProps {
  label: string;
  value: string;
  delay?: number;
  type?: 'text' | 'select' | 'date';
}

export const MockFormField: React.FC<MockFormFieldProps> = ({
  label,
  value,
  delay = 0,
  type = 'text',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fieldProgress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });

  const opacity = interpolate(fieldProgress, [0, 1], [0, 1]);

  // Typewriter: reveal characters one by one, 2 frames per char
  const charsToShow = Math.max(
    0,
    Math.floor((frame - delay - 10) / 2)
  );
  const displayValue = value.slice(0, Math.min(charsToShow, value.length));

  const formatDisplayValue = () => {
    if (type === 'date' && displayValue.length === value.length) {
      return value;
    }
    return displayValue;
  };

  return (
    <div
      style={{
        fontFamily,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        opacity,
      }}
    >
      {/* Label */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: COLORS.TEXT_GRAY,
        }}
      >
        {label}
      </div>

      {/* Input */}
      <div
        style={{
          position: 'relative',
          backgroundColor: COLORS.BG_DARK,
          border: `1px solid ${COLORS.BORDER}`,
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 14,
          color: COLORS.TEXT_WHITE,
          minHeight: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>{formatDisplayValue()}</span>

        {/* Blinking cursor during typing */}
        {charsToShow < value.length && charsToShow >= 0 && (
          <span
            style={{
              opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
              color: COLORS.ACCENT,
              marginLeft: 1,
              fontWeight: 300,
            }}
          >
            |
          </span>
        )}

        {/* Dropdown arrow for select type */}
        {type === 'select' && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            style={{ flexShrink: 0, marginLeft: 8 }}
          >
            <path
              d="M3.5 5.25L7 8.75L10.5 5.25"
              stroke={COLORS.TEXT_GRAY}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* Calendar icon for date type */}
        {type === 'date' && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            style={{ flexShrink: 0, marginLeft: 8 }}
          >
            <rect
              x="1.5"
              y="2.5"
              width="11"
              height="10"
              rx="1.5"
              stroke={COLORS.TEXT_GRAY}
              strokeWidth="1.2"
            />
            <line x1="1.5" y1="5.5" x2="12.5" y2="5.5" stroke={COLORS.TEXT_GRAY} strokeWidth="1.2" />
            <line x1="4.5" y1="1.5" x2="4.5" y2="3.5" stroke={COLORS.TEXT_GRAY} strokeWidth="1.2" />
            <line x1="9.5" y1="1.5" x2="9.5" y2="3.5" stroke={COLORS.TEXT_GRAY} strokeWidth="1.2" />
          </svg>
        )}
      </div>
    </div>
  );
};
