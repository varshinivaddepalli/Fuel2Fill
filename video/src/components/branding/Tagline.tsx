import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';

interface TaglineProps {
  delay?: number;
}

const WORDS = ['Ask.', 'Analyze.', 'Accelerate.'];
const WORD_OFFSET = 20; // frames between each word highlight

export const Tagline: React.FC<TaglineProps> = ({ delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      {WORDS.map((word, i) => {
        const wordDelay = delay + i * WORD_OFFSET;

        const highlightProgress = spring({
          frame: frame - wordDelay,
          fps,
          config: {
            damping: 200,
          },
        });

        return (
          <span
            key={word}
            style={{
              position: 'relative',
              fontFamily,
              fontSize: 36,
              fontWeight: 600,
              letterSpacing: 2,
              color: COLORS.TEXT_WHITE,
              display: 'inline-block',
            }}
          >
            {/* Highlight wipe behind text */}
            <span
              style={{
                position: 'absolute',
                top: 0,
                left: -4,
                right: -4,
                bottom: 0,
                backgroundColor: 'rgba(255,255,255,0.12)',
                borderRadius: 4,
                transformOrigin: 'left center',
                transform: `scaleX(${highlightProgress})`,
              }}
            />
            <span style={{ position: 'relative' }}>{word}</span>
          </span>
        );
      })}
    </div>
  );
};
