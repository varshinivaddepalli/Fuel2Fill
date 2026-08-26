import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';

interface WordHighlightProps {
  text: string;
  highlightWord: string;
  delay?: number;
  highlightColor?: string;
  fontSize?: number;
  fontWeight?: number;
}

const Highlight: React.FC<{
  word: string;
  color: string;
  delay: number;
  durationInFrames: number;
}> = ({ word, color, delay, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    fps,
    frame,
    config: { damping: 200 },
    delay,
    durationInFrames,
  });

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: '1.05em',
          transform: `translateY(-50%) scaleX(${progress})`,
          transformOrigin: 'left center',
          backgroundColor: color,
          borderRadius: '0.18em',
          zIndex: 0,
        }}
      />
      <span style={{ position: 'relative', zIndex: 1 }}>{word}</span>
    </span>
  );
};

export const WordHighlight: React.FC<WordHighlightProps> = ({
  text,
  highlightWord,
  delay = 0,
  highlightColor = 'rgba(255,255,255,0.15)',
  fontSize = 32,
  fontWeight = 600,
}) => {
  const idx = text.indexOf(highlightWord);

  if (idx === -1) {
    return (
      <div
        style={{
          fontFamily,
          fontSize,
          fontWeight,
          color: COLORS.TEXT_WHITE,
        }}
      >
        {text}
      </div>
    );
  }

  const pre = text.slice(0, idx);
  const post = text.slice(idx + highlightWord.length);

  return (
    <div
      style={{
        fontFamily,
        fontSize,
        fontWeight,
        color: COLORS.TEXT_WHITE,
      }}
    >
      {pre}
      <Highlight
        word={highlightWord}
        color={highlightColor}
        delay={delay}
        durationInFrames={18}
      />
      {post}
    </div>
  );
};
