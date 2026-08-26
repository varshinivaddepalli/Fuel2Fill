import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';

interface TypewriterTextProps {
  text: string;
  delay?: number;
  charFrames?: number;
  showCursor?: boolean;
  fontSize?: number;
  color?: string;
  pauseAfter?: string;
  pauseSeconds?: number;
}

const getTypedText = (
  frame: number,
  fullText: string,
  pauseAfter: string | undefined,
  charFrames: number,
  pauseFrames: number,
): string => {
  const pauseIndex =
    pauseAfter !== undefined ? fullText.indexOf(pauseAfter) : -1;
  const preLen =
    pauseIndex >= 0 ? pauseIndex + pauseAfter!.length : fullText.length;

  let typedChars = 0;

  if (frame < preLen * charFrames) {
    typedChars = Math.floor(frame / charFrames);
  } else if (frame < preLen * charFrames + pauseFrames) {
    typedChars = preLen;
  } else {
    const postPhase = frame - preLen * charFrames - pauseFrames;
    typedChars = Math.min(
      fullText.length,
      preLen + Math.floor(postPhase / charFrames),
    );
  }

  return fullText.slice(0, typedChars);
};

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  delay = 0,
  charFrames = 2,
  showCursor = true,
  fontSize = 32,
  color = COLORS.TEXT_WHITE,
  pauseAfter,
  pauseSeconds = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - delay);
  const pauseFrames = Math.round(pauseSeconds * fps);

  const displayedText = getTypedText(
    adjustedFrame,
    text,
    pauseAfter,
    charFrames,
    pauseFrames,
  );

  const blinkPeriod = Math.round(fps * 0.8);
  const cursorOpacity = interpolate(
    adjustedFrame % blinkPeriod,
    [0, blinkPeriod * 0.5, blinkPeriod * 0.5 + 1, blinkPeriod],
    [1, 1, 0, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  const isComplete = displayedText.length === text.length;

  return (
    <div
      style={{
        fontFamily,
        fontSize,
        color,
        display: 'inline-block',
        whiteSpace: 'pre-wrap',
      }}
    >
      {displayedText}
      {showCursor && (
        <span
          style={{
            opacity: isComplete ? cursorOpacity : 1,
            color,
          }}
        >
          &#x258C;
        </span>
      )}
    </div>
  );
};
