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
import { MockDashboardShell } from '../components/mock-ui/MockDashboardShell';
import { MockKpiCard } from '../components/mock-ui/MockKpiCard';
import { MockAreaChart } from '../components/mock-ui/MockAreaChart';
import { MockPieChart } from '../components/mock-ui/MockPieChart';
import { MockBarChart } from '../components/mock-ui/MockBarChart';
import { AppScreenshot } from '../components/layout/AppScreenshot';

/* ------------------------------------------------------------------ */
/*  Tank level progress bar                                            */
/* ------------------------------------------------------------------ */
interface TankBarProps {
  name: string;
  fuelType: string;
  percentage: number;
  delay: number;
  color: string;
}

const TankBar: React.FC<TankBarProps> = ({
  name,
  fuelType,
  percentage,
  delay,
  color,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fillProgress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 20, stiffness: 60 },
  });

  const entryOpacity = spring({
    fps,
    frame: frame - delay,
    config: { damping: 200 },
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        opacity: entryOpacity,
        fontFamily,
      }}
    >
      {/* Tank name + fuel type */}
      <div style={{ width: 100, flexShrink: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: COLORS.TEXT_WHITE,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: 10,
            color: COLORS.TEXT_MUTED,
          }}
        >
          {fuelType}
        </div>
      </div>

      {/* Bar track */}
      <div
        style={{
          flex: 1,
          height: 14,
          backgroundColor: COLORS.BG_CARD,
          borderRadius: 7,
          border: `1px solid ${COLORS.BORDER}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percentage * fillProgress}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: 7,
          }}
        />
      </div>

      {/* Percentage */}
      <div
        style={{
          width: 40,
          fontSize: 12,
          fontWeight: 600,
          color: COLORS.TEXT_WHITE,
          textAlign: 'right',
        }}
      >
        {Math.round(percentage * fillProgress)}%
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Chart data                                                         */
/* ------------------------------------------------------------------ */
const REVENUE_TREND_DATA = [
  { x: 1, y: 850000 },
  { x: 2, y: 920000 },
  { x: 3, y: 880000 },
  { x: 4, y: 1050000 },
  { x: 5, y: 1120000 },
  { x: 6, y: 980000 },
  { x: 7, y: 1245000 },
];

const PIE_DATA = [
  { label: 'Petrol', value: 55, color: COLORS.TEXT_WHITE },
  { label: 'Diesel', value: 35, color: COLORS.TEXT_GRAY },
  { label: 'CNG', value: 10, color: COLORS.TEXT_MUTED },
];

const BAR_DATA = [
  { label: 'Mon', value: 4200 },
  { label: 'Tue', value: 3800 },
  { label: 'Wed', value: 5100 },
  { label: 'Thu', value: 4700 },
  { label: 'Fri', value: 5600 },
  { label: 'Sat', value: 6200 },
];

const TANKS = [
  { name: 'Tank 1', fuelType: 'Petrol', percentage: 78, color: COLORS.TEXT_WHITE },
  { name: 'Tank 2', fuelType: 'Diesel', percentage: 45, color: COLORS.TEXT_GRAY },
  { name: 'Tank 3', fuelType: 'Petrol', percentage: 92, color: COLORS.ACCENT_DIM },
  { name: 'Tank 4', fuelType: 'CNG', percentage: 31, color: COLORS.TEXT_MUTED },
];

/* ------------------------------------------------------------------ */
/*  HeroDashboard scene                                                */
/* ------------------------------------------------------------------ */
export const HeroDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Subtle zoom from 450-600
  const holdZoom = interpolate(frame, [450, 600], [1.0, 1.02], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Dashboard shell entrance (delay until frame 30)
  const shellEntrance = spring({
    fps,
    frame: frame - 30,
    config: { damping: 20, stiffness: 80 },
  });

  const shellScale = 0.95 + 0.05 * shellEntrance;
  const shellOpacity = shellEntrance;

  return (
    <FullScreenScene showGrid showGlow glowPosition={{ x: 960, y: 400 }}>
      {/* Title text */}
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
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <Sequence from={0} durationInFrames={60} layout="none">
          <FadeInText
            text="One platform. Every station."
            fontSize={48}
            fontWeight={700}
            direction="up"
          />
        </Sequence>
      </div>

      {/* Dashboard shell -- appears at frame 30 */}
      <Sequence from={30} layout="none">
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: `scale(${holdZoom})`,
            transformOrigin: 'center center',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              opacity: shellOpacity,
              transform: `scale(${shellScale})`,
              transformOrigin: 'center center',
            }}
          >
            <MockDashboardShell sidebarDelay={0} showSidebar>
              {/* KPI Cards Row */}
              <Sequence from={30} layout="none">
                <div
                  style={{
                    display: 'flex',
                    gap: 14,
                    marginBottom: 20,
                  }}
                >
                  <StaggeredReveal staggerDelay={10} direction="up" baseDelay={0}>
                    <div style={{ flex: 1 }}>
                      <MockKpiCard
                        title="Total Revenue"
                        value={1245000}
                        prefix="₹"
                        trend="up"
                        trendValue="+12.5%"
                        delay={30}
                        formatAsIndianCurrency
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <MockKpiCard
                        title="Liters Sold"
                        value={45200}
                        prefix=""
                        trend="up"
                        trendValue="+8.2%"
                        delay={40}
                        formatAsIndianCurrency={false}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <MockKpiCard
                        title="Total Expenses"
                        value={321000}
                        prefix="₹"
                        trend="down"
                        trendValue="-3.1%"
                        delay={50}
                        formatAsIndianCurrency
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <MockKpiCard
                        title="Net Profit"
                        value={924000}
                        prefix="₹"
                        trend="up"
                        trendValue="+18.7%"
                        delay={60}
                        formatAsIndianCurrency
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <MockKpiCard
                        title="Credit Outstanding"
                        value={210000}
                        prefix="₹"
                        trend="neutral"
                        delay={70}
                        formatAsIndianCurrency
                      />
                    </div>
                  </StaggeredReveal>
                </div>
              </Sequence>

              {/* Charts Row */}
              <Sequence from={150} layout="none">
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    marginBottom: 20,
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Revenue Area Chart */}
                  <div
                    style={{
                      flex: 1,
                      backgroundColor: COLORS.BG_CARD,
                      border: `1px solid ${COLORS.BORDER}`,
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: COLORS.TEXT_GRAY,
                        marginBottom: 8,
                        fontFamily,
                      }}
                    >
                      Revenue Trend
                    </div>
                    <MockAreaChart
                      data={REVENUE_TREND_DATA}
                      delay={0}
                      height={150}
                      width={360}
                      color={COLORS.TEXT_WHITE}
                      fillOpacity={0.08}
                    />
                  </div>

                  {/* Fuel Type Pie Chart */}
                  <div
                    style={{
                      backgroundColor: COLORS.BG_CARD,
                      border: `1px solid ${COLORS.BORDER}`,
                      borderRadius: 12,
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: COLORS.TEXT_GRAY,
                        marginBottom: 8,
                        fontFamily,
                        alignSelf: 'flex-start',
                      }}
                    >
                      Fuel Sales Mix
                    </div>
                    <MockPieChart data={PIE_DATA} delay={30} size={150} />
                    {/* Legend */}
                    <div
                      style={{
                        display: 'flex',
                        gap: 12,
                        marginTop: 8,
                        fontFamily,
                      }}
                    >
                      {PIE_DATA.map((d) => (
                        <div
                          key={d.label}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: d.color,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 10,
                              color: COLORS.TEXT_MUTED,
                            }}
                          >
                            {d.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Daily Sales Bar Chart */}
                  <div
                    style={{
                      flex: 1,
                      backgroundColor: COLORS.BG_CARD,
                      border: `1px solid ${COLORS.BORDER}`,
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: COLORS.TEXT_GRAY,
                        marginBottom: 8,
                        fontFamily,
                      }}
                    >
                      Daily Sales (L)
                    </div>
                    <MockBarChart
                      data={BAR_DATA}
                      delay={60}
                      height={150}
                      showLabels
                    />
                  </div>
                </div>
              </Sequence>

              {/* Tank Levels */}
              <Sequence from={320} layout="none">
                <div
                  style={{
                    backgroundColor: COLORS.BG_CARD,
                    border: `1px solid ${COLORS.BORDER}`,
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: COLORS.TEXT_GRAY,
                      marginBottom: 12,
                      fontFamily,
                    }}
                  >
                    Tank Levels
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    {TANKS.map((tank, i) => (
                      <TankBar
                        key={tank.name}
                        {...tank}
                        delay={i * 8}
                      />
                    ))}
                  </div>
                </div>
              </Sequence>
            </MockDashboardShell>
          </div>
        </div>
      </Sequence>

      {/* Real app video overlay */}
      <Sequence from={450} layout="none">
        <div style={{ position: 'absolute', bottom: 40, right: 40 }}>
          <AppScreenshot screenshot="screenshots/images1.png" delay={0} scale={0.45} />
        </div>
      </Sequence>
    </FullScreenScene>
  );
};
