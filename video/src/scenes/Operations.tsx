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
import { CountUpNumber } from '../components/animated/CountUpNumber';
import { MockLineChart } from '../components/mock-ui/MockLineChart';
import { MockDataTable } from '../components/mock-ui/MockDataTable';
import { MockFormField } from '../components/mock-ui/MockFormField';
import { SceneSection } from '../components/layout/SceneSection';

/* ------------------------------------------------------------------ */
/*  Price data                                                          */
/* ------------------------------------------------------------------ */
const PETROL_HISTORY = [
  { x: 1, y: 10450 },
  { x: 2, y: 10520 },
  { x: 3, y: 10490 },
  { x: 4, y: 10580 },
  { x: 5, y: 10610 },
  { x: 6, y: 10590 },
  { x: 7, y: 10631 },
];

const DIESEL_HISTORY = [
  { x: 1, y: 9100 },
  { x: 2, y: 9150 },
  { x: 3, y: 9200 },
  { x: 4, y: 9180 },
  { x: 5, y: 9220 },
  { x: 6, y: 9250 },
  { x: 7, y: 9272 },
];

const CREDIT_CUSTOMERS_HEADERS = ['Name', 'Balance', 'Station'];
const CREDIT_CUSTOMERS_ROWS = [
  ['Sharma Transport', '₹45,200', 'Station Alpha'],
  ['Gupta Logistics', '₹32,800', 'Station Beta'],
  ['Singh Enterprises', '₹18,500', 'Station Gamma'],
  ['Patel Motors', '₹27,100', 'Station Alpha'],
];

const TRANSACTIONS_HEADERS = ['Customer', 'Amount', 'Date'];
const TRANSACTIONS_ROWS = [
  ['Sharma Transport', '₹12,500', '14 Mar'],
  ['Gupta Logistics', '₹8,200', '13 Mar'],
  ['Singh Enterprises', '₹5,400', '13 Mar'],
];

const FEATURE_LABELS = [
  'Product Sales',
  'Purchases',
  'Expenses',
  'Stock View',
];

/* ------------------------------------------------------------------ */
/*  Fuel price card                                                     */
/* ------------------------------------------------------------------ */
interface FuelPriceCardProps {
  fuelType: string;
  price: string;
  chartData: { x: number; y: number }[];
  delay: number;
}

const FuelPriceCard: React.FC<FuelPriceCardProps> = ({
  fuelType,
  price,
  chartData,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    fps,
    frame: frame - delay,
    config: { damping: 18, stiffness: 100 },
  });

  const scale = 0.92 + 0.08 * entrance;

  return (
    <div
      style={{
        backgroundColor: COLORS.BG_CARD,
        border: `1px solid ${COLORS.BORDER}`,
        borderRadius: 12,
        padding: 20,
        flex: 1,
        opacity: entrance,
        transform: `scale(${scale})`,
        fontFamily,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: COLORS.TEXT_GRAY,
          marginBottom: 8,
        }}
      >
        {fuelType}
      </div>
      <div
        style={{
          fontSize: 42,
          fontWeight: 700,
          color: COLORS.TEXT_WHITE,
          lineHeight: 1.1,
        }}
      >
        {price}
      </div>
      <div
        style={{
          fontSize: 14,
          color: COLORS.TEXT_MUTED,
          marginBottom: 12,
        }}
      >
        per litre
      </div>
      <MockLineChart
        data={chartData}
        delay={delay + 15}
        height={80}
        width={240}
        color={COLORS.TEXT_WHITE}
        strokeWidth={1.5}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Payment bar                                                         */
/* ------------------------------------------------------------------ */
interface PaymentBarProps {
  label: string;
  percentage: number;
  color: string;
  delay: number;
}

const PaymentBar: React.FC<PaymentBarProps> = ({
  label,
  percentage,
  color,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fillProgress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 20, stiffness: 60 },
  });

  const opacity = spring({
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
        fontFamily,
        opacity,
      }}
    >
      <div
        style={{
          width: 50,
          fontSize: 12,
          fontWeight: 500,
          color: COLORS.TEXT_GRAY,
          textAlign: 'right',
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          height: 18,
          backgroundColor: COLORS.BG_CARD,
          borderRadius: 9,
          border: `1px solid ${COLORS.BORDER}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percentage * fillProgress}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: 9,
          }}
        />
      </div>
      <div
        style={{
          width: 40,
          fontSize: 12,
          fontWeight: 600,
          color: COLORS.TEXT_WHITE,
          textAlign: 'left',
        }}
      >
        {Math.round(percentage * fillProgress)}%
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Feature label box                                                   */
/* ------------------------------------------------------------------ */
interface FeatureLabelProps {
  label: string;
  delay: number;
}

const FeatureLabel: React.FC<FeatureLabelProps> = ({ label, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    fps,
    frame: frame - delay,
    config: { damping: 14, stiffness: 120 },
  });

  return (
    <div
      style={{
        backgroundColor: COLORS.BG_CARD,
        border: `1px solid ${COLORS.BORDER}`,
        borderRadius: 10,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        opacity: entrance,
        transform: `scale(${0.85 + 0.15 * entrance})`,
        fontFamily,
      }}
    >
      {/* Icon placeholder */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: COLORS.BG_CARD_HOVER,
          border: `1px solid ${COLORS.BORDER_LIGHT}`,
        }}
      />
      <span
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: COLORS.TEXT_WHITE,
        }}
      >
        {label}
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Nozzle reading display                                              */
/* ------------------------------------------------------------------ */
interface NozzleReadingProps {
  label: string;
  value: number;
  delay: number;
}

const NozzleReading: React.FC<NozzleReadingProps> = ({
  label,
  value,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    fps,
    frame: frame - delay,
    config: { damping: 200 },
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        opacity: entrance,
        fontFamily,
      }}
    >
      <div style={{ fontSize: 13, color: COLORS.TEXT_GRAY, fontWeight: 500 }}>
        {label}
      </div>
      <CountUpNumber
        target={value}
        delay={delay + 5}
        duration={50}
        prefix=""
        fontSize={32}
        color={COLORS.TEXT_WHITE}
        formatAsIndianCurrency
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Liters sold result                                                  */
/* ------------------------------------------------------------------ */
const LitersSold: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    fps,
    frame: frame - delay,
    config: { damping: 200 },
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        opacity: entrance,
        transform: `translateY(${(1 - entrance) * 15}px)`,
        fontFamily,
      }}
    >
      <div style={{ fontSize: 13, color: COLORS.SUCCESS, fontWeight: 500 }}>
        Liters Sold
      </div>
      <CountUpNumber
        target={750}
        delay={delay + 5}
        duration={40}
        prefix=""
        suffix=" L"
        fontSize={36}
        color={COLORS.SUCCESS}
        formatAsIndianCurrency={false}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Operations scene (690 frames = 23 seconds)                          */
/* ------------------------------------------------------------------ */
export const Operations: React.FC = () => {
  return (
    <FullScreenScene showGrid>
      {/* Title: Frame 0-30 */}
      <Sequence from={0} durationInFrames={150} layout="none">
        <SceneSection delay={0} exitAt={145}>
          <FadeInText
            text="Daily Operations"
            fontSize={48}
            fontWeight={700}
            direction="up"
          />

          {/* Fuel price cards: Frame 30-150 */}
          <div
            style={{
              display: 'flex',
              gap: 24,
              marginTop: 40,
              width: '100%',
              maxWidth: 700,
            }}
          >
            <FuelPriceCard
              fuelType="Petrol"
              price="₹106.31"
              chartData={PETROL_HISTORY}
              delay={30}
            />
            <FuelPriceCard
              fuelType="Diesel"
              price="₹92.72"
              chartData={DIESEL_HISTORY}
              delay={45}
            />
          </div>
        </SceneSection>
      </Sequence>

      {/* Sale record section: Frame 150-300 */}
      <Sequence from={150} durationInFrames={150} layout="none">
        <SceneSection delay={150} exitAt={295}>
          <FadeInText
            text="Daily Sale Record"
            fontSize={28}
            fontWeight={600}
            delay={150}
            color={COLORS.TEXT_GRAY}
          />

          {/* Nozzle readings */}
          <div
            style={{
              display: 'flex',
              gap: 60,
              marginTop: 28,
              alignItems: 'center',
            }}
          >
            <NozzleReading
              label="Opening Reading"
              value={12450}
              delay={160}
            />
            <div
              style={{
                width: 2,
                height: 50,
                backgroundColor: COLORS.BORDER_LIGHT,
              }}
            />
            <NozzleReading
              label="Closing Reading"
              value={13200}
              delay={175}
            />
          </div>

          {/* Liters sold */}
          <div style={{ marginTop: 20 }}>
            <LitersSold delay={200} />
          </div>

          {/* Payment breakdown bars */}
          <div
            style={{
              marginTop: 28,
              width: '100%',
              maxWidth: 500,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: COLORS.TEXT_GRAY,
                fontWeight: 500,
                marginBottom: 4,
                fontFamily,
              }}
            >
              Payment Breakdown
            </div>
            <PaymentBar
              label="Cash"
              percentage={60}
              color={COLORS.TEXT_WHITE}
              delay={220}
            />
            <PaymentBar
              label="UPI"
              percentage={30}
              color={COLORS.TEXT_GRAY}
              delay={230}
            />
            <PaymentBar
              label="Credit"
              percentage={10}
              color={COLORS.TEXT_MUTED}
              delay={240}
            />
          </div>
        </SceneSection>
      </Sequence>

      {/* Credit management triptych: Frame 300-480 */}
      <Sequence from={300} durationInFrames={180} layout="none">
        <SceneSection delay={300} exitAt={475}>
          <div
            style={{
              display: 'flex',
              gap: 16,
              width: '100%',
              maxWidth: 1000,
            }}
          >
            <StaggeredReveal staggerDelay={15} direction="up" baseDelay={300}>
              {/* Panel 1: Credit Customers */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: COLORS.TEXT_WHITE,
                    fontFamily,
                  }}
                >
                  Credit Customers
                </div>
                <MockDataTable
                  headers={CREDIT_CUSTOMERS_HEADERS}
                  rows={CREDIT_CUSTOMERS_ROWS}
                  delay={310}
                />
              </div>

              {/* Panel 2: Transactions */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: COLORS.TEXT_WHITE,
                    fontFamily,
                  }}
                >
                  Transactions
                </div>
                <MockDataTable
                  headers={TRANSACTIONS_HEADERS}
                  rows={TRANSACTIONS_ROWS}
                  delay={325}
                />
              </div>

              {/* Panel 3: Payment Form */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: COLORS.TEXT_WHITE,
                    fontFamily,
                  }}
                >
                  Record Payment
                </div>
                <div
                  style={{
                    backgroundColor: COLORS.BG_CARD,
                    border: `1px solid ${COLORS.BORDER}`,
                    borderRadius: 10,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <MockFormField
                    label="Customer"
                    value="Sharma Transport"
                    delay={340}
                    type="select"
                  />
                  <MockFormField
                    label="Amount"
                    value="₹12,500"
                    delay={350}
                    type="text"
                  />
                  <MockFormField
                    label="Date"
                    value="2026-03-14"
                    delay={360}
                    type="date"
                  />
                </div>
              </div>
            </StaggeredReveal>
          </div>
        </SceneSection>
      </Sequence>

      {/* Feature montage: Frame 480-600 */}
      <Sequence from={480} durationInFrames={120} layout="none">
        <SceneSection delay={480} exitAt={595}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16,
              maxWidth: 500,
            }}
          >
            {FEATURE_LABELS.map((label, i) => (
              <FeatureLabel
                key={label}
                label={label}
                delay={485 + i * 10}
              />
            ))}
          </div>
        </SceneSection>
      </Sequence>

      {/* Closing text: Frame 600-690 */}
      <Sequence from={600} layout="none">
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
            text="9 modules. Zero paper."
            fontSize={36}
            fontWeight={600}
            delay={600}
          />
        </div>
      </Sequence>
    </FullScreenScene>
  );
};
