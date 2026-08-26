import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';

interface MockSidebarProps {
  delay?: number;
  activeItem?: string;
}

interface MenuGroup {
  header: string;
  items: string[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    header: '',
    items: ['Dashboard'],
  },
  {
    header: 'Registration',
    items: ['Stations', 'Fuel Types', 'Tanks', 'Pumps', 'Nozzles', 'Products'],
  },
  {
    header: 'Employee',
    items: ['Employees', 'Shifts', 'Attendance'],
  },
  {
    header: 'Operations',
    items: ['Fuel Price', 'Sales', 'Credit'],
  },
  {
    header: 'AI Features',
    items: ['Ask Astra', 'Click Astra'],
  },
];

export const MockSidebar: React.FC<MockSidebarProps> = ({
  delay = 0,
  activeItem = 'Dashboard',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let itemIndex = 0;

  return (
    <div
      style={{
        width: 220,
        height: '100%',
        backgroundColor: COLORS.BG_DARK,
        borderRight: `1px solid ${COLORS.BORDER}`,
        display: 'flex',
        flexDirection: 'column',
        fontFamily,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '24px 20px 20px',
          opacity: spring({
            frame: frame - delay,
            fps,
            config: { damping: 20, stiffness: 100 },
          }),
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: COLORS.TEXT_WHITE,
            letterSpacing: 3,
          }}
        >
          PETRO ASTRA
        </span>
      </div>

      {/* Menu Groups */}
      <div style={{ flex: 1, paddingTop: 4 }}>
        {MENU_GROUPS.map((group) => {
          const headerIndex = itemIndex;
          return (
            <div key={group.header || '_root'} style={{ marginBottom: 8 }}>
              {group.header && (() => {
                const hIdx = headerIndex;
                itemIndex++;
                const headerOpacity = spring({
                  frame: frame - delay - hIdx * 3,
                  fps,
                  config: { damping: 20, stiffness: 100 },
                });
                return (
                  <div
                    style={{
                      padding: '12px 20px 4px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: COLORS.TEXT_MUTED,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      opacity: headerOpacity,
                    }}
                  >
                    {group.header}
                  </div>
                );
              })()}
              {group.items.map((item) => {
                const currentIdx = itemIndex;
                itemIndex++;
                const isActive = item === activeItem;
                const itemOpacity = spring({
                  frame: frame - delay - currentIdx * 3,
                  fps,
                  config: { damping: 20, stiffness: 100 },
                });
                return (
                  <div
                    key={item}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 20px',
                      position: 'relative',
                      opacity: itemOpacity,
                    }}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 4,
                          bottom: 4,
                          width: 3,
                          backgroundColor: COLORS.TEXT_WHITE,
                          borderRadius: '0 2px 2px 0',
                        }}
                      />
                    )}
                    {/* Dot icon */}
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: isActive
                          ? COLORS.TEXT_WHITE
                          : COLORS.TEXT_MUTED,
                        marginRight: 12,
                        flexShrink: 0,
                      }}
                    />
                    {/* Label */}
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 400,
                        color: isActive
                          ? COLORS.TEXT_WHITE
                          : COLORS.TEXT_GRAY,
                      }}
                    >
                      {item}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
