import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, staticFile, Img } from 'remotion';
import { ScreenFrame } from './ScreenFrame';

interface AppScreenshotProps {
  screenshot: string;
  delay?: number;
  scale?: number;
  grayscale?: boolean;
}

export const AppScreenshot: React.FC<AppScreenshotProps> = ({
  screenshot,
  delay = 0,
  scale = 0.65,
  grayscale = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    delay,
    config: { damping: 200 },
  });

  // Ken Burns: slow zoom from 1.0 to 1.06
  const kenBurnsScale = interpolate(frame, [delay, delay + 150], [1.0, 1.06], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        opacity: entrance,
        transform: `translateY(${(1 - entrance) * 20}px)`,
      }}
    >
      <ScreenFrame title="Petro Astra" grayscale={grayscale} scale={scale}>
        <div style={{ overflow: 'hidden', width: 1920 * scale, height: 1080 * scale }}>
          <div style={{ transform: `scale(${kenBurnsScale})`, transformOrigin: 'center center' }}>
            <Img
              src={staticFile(screenshot)}
              style={{
                width: '100%',
                height: 'auto',
              }}
            />
          </div>
        </div>
      </ScreenFrame>
    </div>
  );
};
