import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';
import { MockSidebar } from './MockSidebar';

interface MockDashboardShellProps {
  children: React.ReactNode;
  sidebarDelay?: number;
  showSidebar?: boolean;
}

export const MockDashboardShell: React.FC<MockDashboardShellProps> = ({
  children,
  sidebarDelay = 0,
  showSidebar = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entranceProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 80 },
  });

  const scale = 0.95 + 0.05 * entranceProgress;
  const opacity = entranceProgress;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: COLORS.BG_BLACK,
        fontFamily,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      {/* Sidebar */}
      {showSidebar && <MockSidebar delay={sidebarDelay} />}

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header bar */}
        <div
          style={{
            height: 60,
            borderBottom: `1px solid ${COLORS.BORDER}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            flexShrink: 0,
          }}
        >
          {/* Breadcrumb */}
          <span
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: COLORS.TEXT_GRAY,
            }}
          >
            Dashboard
          </span>

          {/* User avatar */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: COLORS.BORDER_LIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.TEXT_GRAY,
              }}
            >
              U
            </span>
          </div>
        </div>

        {/* Content area */}
        <div
          style={{
            flex: 1,
            padding: 24,
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
