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
import { StaggeredReveal } from '../components/animated/StaggeredReveal';
import { MockDataTable } from '../components/mock-ui/MockDataTable';
import { MockCalendarView } from '../components/mock-ui/MockCalendarView';
import { CountUpNumber } from '../components/animated/CountUpNumber';
import { PulsingDot } from '../components/animated/PulsingDot';
import { SceneSection } from '../components/layout/SceneSection';
import { AppScreenshot } from '../components/layout/AppScreenshot';
import { getInitials } from '../lib/utils';

/* ------------------------------------------------------------------ */
/*  Employee data                                                       */
/* ------------------------------------------------------------------ */
const EMPLOYEES = [
  { name: 'Rajesh Kumar', role: 'Manager', station: 'Station Alpha' },
  { name: 'Priya Singh', role: 'Cashier', station: 'Station Beta' },
  { name: 'Amit Patel', role: 'Attendant', station: 'Station Alpha' },
  { name: 'Sunita Devi', role: 'Attendant', station: 'Station Gamma' },
  { name: 'Vikram Shah', role: 'Manager', station: 'Station Beta' },
  { name: 'Neha Gupta', role: 'Cashier', station: 'Station Gamma' },
];

const SHIFT_HEADERS = ['Employee', 'Station', 'Start', 'End', 'Status'];
const SHIFT_ROWS = [
  ['Rajesh Kumar', 'Station Alpha', '06:00 AM', '02:00 PM', 'Active'],
  ['Priya Singh', 'Station Beta', '06:00 AM', '02:00 PM', 'Active'],
  ['Amit Patel', 'Station Alpha', '02:00 PM', '10:00 PM', 'Upcoming'],
  ['Vikram Shah', 'Station Beta', '10:00 PM', '06:00 AM', 'Completed'],
];

const CALENDAR_DATA = [
  { day: 1, status: 'present' as const },
  { day: 2, status: 'present' as const },
  { day: 3, status: 'present' as const },
  { day: 4, status: 'absent' as const },
  { day: 5, status: 'present' as const },
  { day: 6, status: 'holiday' as const },
  { day: 7, status: 'holiday' as const },
  { day: 8, status: 'present' as const },
  { day: 9, status: 'present' as const },
  { day: 10, status: 'present' as const },
  { day: 11, status: 'present' as const },
  { day: 12, status: 'present' as const },
  { day: 13, status: 'present' as const },
  { day: 14, status: 'present' as const },
  { day: 15, status: 'present' as const },
  { day: 16, status: 'absent' as const },
  { day: 17, status: 'present' as const },
  { day: 18, status: 'present' as const },
  { day: 19, status: 'present' as const },
  { day: 20, status: 'present' as const },
  { day: 21, status: 'present' as const },
  { day: 22, status: 'present' as const },
  { day: 23, status: 'present' as const },
  { day: 24, status: 'absent' as const },
  { day: 25, status: 'present' as const },
  { day: 26, status: 'present' as const },
  { day: 27, status: 'holiday' as const },
  { day: 28, status: 'holiday' as const },
  { day: 29, status: 'present' as const },
  { day: 30, status: 'present' as const },
  { day: 31, status: 'present' as const },
  { day: 0, status: 'empty' as const },
  { day: 0, status: 'empty' as const },
  { day: 0, status: 'empty' as const },
  { day: 0, status: 'empty' as const },
];

/* ------------------------------------------------------------------ */
/*  Employee card component                                             */
/* ------------------------------------------------------------------ */

interface EmployeeCardProps {
  name: string;
  role: string;
  station: string;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ name, role, station }) => {
  return (
    <div
      style={{
        backgroundColor: COLORS.BG_CARD,
        borderRadius: 12,
        padding: 16,
        border: `1px solid ${COLORS.BORDER}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          backgroundColor: COLORS.BG_CARD_HOVER,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 600,
          color: COLORS.TEXT_WHITE,
          flexShrink: 0,
        }}
      >
        {getInitials(name)}
      </div>

      {/* Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: COLORS.TEXT_WHITE,
          }}
        >
          {name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: COLORS.TEXT_GRAY,
              backgroundColor: COLORS.BORDER_LIGHT,
              padding: '2px 8px',
              borderRadius: 10,
            }}
          >
            {role}
          </span>
          <span style={{ fontSize: 12, color: COLORS.TEXT_MUTED }}>
            {station}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Shift status cell with pulsing dot                                  */
/* ------------------------------------------------------------------ */
interface ShiftStatusCellProps {
  status: string;
}

const ShiftStatusCell: React.FC<ShiftStatusCellProps> = ({ status }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {status === 'Active' && <PulsingDot color={COLORS.SUCCESS} size={6} />}
      <span
        style={{
          color:
            status === 'Active'
              ? COLORS.SUCCESS
              : status === 'Completed'
                ? COLORS.TEXT_MUTED
                : COLORS.WARNING,
        }}
      >
        {status}
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Summary stat card                                                   */
/* ------------------------------------------------------------------ */
interface SummaryCardProps {
  label: string;
  value: number;
  color: string;
  delay: number;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  color,
  delay,
}) => {
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
        backgroundColor: COLORS.BG_CARD,
        border: `1px solid ${COLORS.BORDER}`,
        borderRadius: 10,
        padding: '12px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        opacity: progress,
        transform: `translateY(${(1 - progress) * 15}px)`,
        fontFamily,
        flex: 1,
      }}
    >
      <CountUpNumber
        target={value}
        delay={delay + 5}
        duration={40}
        prefix=""
        fontSize={28}
        color={color}
        formatAsIndianCurrency={false}
      />
      <div style={{ fontSize: 12, color: COLORS.TEXT_GRAY, fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Employee scene (600 frames = 20 seconds)                            */
/* ------------------------------------------------------------------ */
export const Employee: React.FC = () => {
  return (
    <FullScreenScene showGrid>
      {/* Title: Frame 0-30 */}
      <Sequence from={0} durationInFrames={160} layout="none">
        <SceneSection delay={0} exitAt={155}>
          <FadeInText
            text="Workforce Management"
            fontSize={48}
            fontWeight={700}
            direction="up"
          />

          {/* Employee cards grid: Frame 30-160 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 14,
              marginTop: 40,
              width: '100%',
              maxWidth: 900,
            }}
          >
            <StaggeredReveal staggerDelay={8} direction="up" baseDelay={30}>
              {EMPLOYEES.map((emp) => (
                <EmployeeCard
                  key={emp.name}
                  name={emp.name}
                  role={emp.role}
                  station={emp.station}
                />
              ))}
            </StaggeredReveal>
          </div>
        </SceneSection>
      </Sequence>

      {/* Shifts section: Frame 160-290 */}
      <Sequence from={160} durationInFrames={130} layout="none">
        <SceneSection delay={160} exitAt={285}>
          <FadeInText
            text="Shift Management"
            fontSize={28}
            fontWeight={600}
            delay={160}
            color={COLORS.TEXT_GRAY}
          />
          <div style={{ marginTop: 24, width: '100%', maxWidth: 860 }}>
            <MockDataTable
              headers={SHIFT_HEADERS}
              rows={SHIFT_ROWS}
              delay={170}
            />
            {/* Overlay pulsing dots on active status cells */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              {/* We render status indicators inline via the table rows */}
            </div>
          </div>
        </SceneSection>
      </Sequence>

      {/* Attendance section: Frame 290-430 */}
      <Sequence from={290} durationInFrames={140} layout="none">
        <SceneSection delay={290} exitAt={425}>
          <FadeInText
            text="Attendance Tracking"
            fontSize={28}
            fontWeight={600}
            delay={290}
            color={COLORS.TEXT_GRAY}
          />
          <div
            style={{
              marginTop: 20,
              display: 'flex',
              gap: 40,
              alignItems: 'flex-start',
              maxWidth: 900,
              width: '100%',
            }}
          >
            {/* Calendar */}
            <div style={{ flex: 1, maxWidth: 380 }}>
              <MockCalendarView
                month="March 2026"
                data={CALENDAR_DATA}
                delay={295}
              />
            </div>

            {/* Summary cards */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                justifyContent: 'center',
              }}
            >
              <div style={{ display: 'flex', gap: 12 }}>
                <SummaryCard
                  label="Present"
                  value={18}
                  color={COLORS.SUCCESS}
                  delay={310}
                />
                <SummaryCard
                  label="Absent"
                  value={3}
                  color={COLORS.ERROR}
                  delay={320}
                />
                <SummaryCard
                  label="Holidays"
                  value={2}
                  color={COLORS.WARNING}
                  delay={330}
                />
              </div>
            </div>
          </div>
        </SceneSection>
      </Sequence>

      {/* Real app video overlay: Employee management */}
      <Sequence from={430} layout="none">
        <div style={{ position: 'absolute', bottom: 40, right: 40 }}>
          <AppScreenshot screenshot="screenshots/images4.png" delay={0} scale={0.4} />
        </div>
      </Sequence>

      {/* Closing text: Frame 430-600 */}
      <Sequence from={430} layout="none">
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <FadeInText
            text="Complete workforce visibility."
            fontSize={32}
            fontWeight={600}
            delay={430}
          />
        </div>
      </Sequence>
    </FullScreenScene>
  );
};
