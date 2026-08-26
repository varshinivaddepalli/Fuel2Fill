import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';

type DayStatus = 'present' | 'absent' | 'holiday' | 'empty';

interface DayData {
  day: number;
  status: DayStatus;
}

interface MockCalendarViewProps {
  month?: string;
  data?: DayData[];
  delay?: number;
}

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_COLORS: Record<DayStatus, string> = {
  present: COLORS.SUCCESS,
  absent: COLORS.ERROR,
  holiday: COLORS.WARNING,
  empty: 'transparent',
};

const DEFAULT_DATA: DayData[] = [
  // Row 1 (week 1)
  { day: 1, status: 'present' },
  { day: 2, status: 'present' },
  { day: 3, status: 'present' },
  { day: 4, status: 'absent' },
  { day: 5, status: 'present' },
  { day: 6, status: 'holiday' },
  { day: 7, status: 'holiday' },
  // Row 2 (week 2)
  { day: 8, status: 'present' },
  { day: 9, status: 'present' },
  { day: 10, status: 'present' },
  { day: 11, status: 'present' },
  { day: 12, status: 'present' },
  { day: 13, status: 'holiday' },
  { day: 14, status: 'holiday' },
  // Row 3 (week 3)
  { day: 15, status: 'present' },
  { day: 16, status: 'absent' },
  { day: 17, status: 'present' },
  { day: 18, status: 'present' },
  { day: 19, status: 'present' },
  { day: 20, status: 'holiday' },
  { day: 21, status: 'holiday' },
  // Row 4 (week 4)
  { day: 22, status: 'present' },
  { day: 23, status: 'present' },
  { day: 24, status: 'present' },
  { day: 25, status: 'present' },
  { day: 26, status: 'absent' },
  { day: 27, status: 'holiday' },
  { day: 28, status: 'holiday' },
  // Row 5 (remaining)
  { day: 29, status: 'present' },
  { day: 30, status: 'present' },
  { day: 31, status: 'present' },
  { day: 0, status: 'empty' },
  { day: 0, status: 'empty' },
  { day: 0, status: 'empty' },
  { day: 0, status: 'empty' },
];

export const MockCalendarView: React.FC<MockCalendarViewProps> = ({
  month = 'March 2026',
  data,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const days = data || DEFAULT_DATA;

  const headerProgress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });

  return (
    <div
      style={{
        fontFamily,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Month header */}
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: COLORS.TEXT_WHITE,
          opacity: interpolate(headerProgress, [0, 1], [0, 1]),
          textAlign: 'center',
        }}
      >
        {month}
      </div>

      {/* Day-of-week headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 6,
          opacity: interpolate(headerProgress, [0, 1], [0, 1]),
        }}
      >
        {DAY_HEADERS.map((day) => (
          <div
            key={day}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.TEXT_GRAY,
              textAlign: 'center',
              padding: '4px 0',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 6,
        }}
      >
        {days.map((dayData, index) => {
          const row = Math.floor(index / 7);
          const cellDelay = delay + 8 + row * 5;
          const cellProgress = spring({
            frame: frame - cellDelay,
            fps,
            config: { damping: 200 },
          });

          const cellOpacity = interpolate(cellProgress, [0, 1], [0, 1]);
          const statusColor = STATUS_COLORS[dayData.status];
          const isEmpty = dayData.status === 'empty';

          return (
            <div
              key={index}
              style={{
                aspectRatio: '1',
                borderRadius: 6,
                backgroundColor: isEmpty ? 'transparent' : COLORS.BG_CARD,
                border: isEmpty ? 'none' : `1px solid ${COLORS.BORDER}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                opacity: cellOpacity,
              }}
            >
              {!isEmpty && (
                <>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: COLORS.TEXT_WHITE,
                    }}
                  >
                    {dayData.day}
                  </div>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: statusColor,
                    }}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
