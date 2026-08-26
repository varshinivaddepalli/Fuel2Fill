import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
} from 'remotion';
import { evolvePath } from '@remotion/paths';
import { COLORS } from '../../lib/colors';
import { fontFamily } from '../../lib/fonts';

type TopologyNode = {
  id: string;
  label: string;
  count: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type TopologyConnection = {
  from: string;
  to: string;
  path: string;
};

const NODES: TopologyNode[] = [
  { id: 'station', label: 'Station', count: 1, x: 60, y: 200, width: 120, height: 50 },
  { id: 'fuel-types', label: 'Fuel Types', count: 3, x: 280, y: 60, width: 110, height: 44 },
  { id: 'tanks', label: 'Tanks', count: 4, x: 280, y: 150, width: 110, height: 44 },
  { id: 'pumps', label: 'Pumps', count: 6, x: 280, y: 240, width: 110, height: 44 },
  { id: 'nozzles', label: 'Nozzles', count: 12, x: 280, y: 330, width: 110, height: 44 },
  { id: 'products', label: 'Products', count: 5, x: 500, y: 105, width: 110, height: 44 },
];

const getConnections = (): TopologyConnection[] => {
  const station = NODES[0];
  const cx = station.x + station.width;
  const cy = station.y + station.height / 2;

  return [
    {
      from: 'station',
      to: 'fuel-types',
      path: `M ${cx} ${cy} C ${cx + 60} ${cy}, ${NODES[1].x - 40} ${NODES[1].y + 22}, ${NODES[1].x} ${NODES[1].y + 22}`,
    },
    {
      from: 'station',
      to: 'tanks',
      path: `M ${cx} ${cy} C ${cx + 60} ${cy}, ${NODES[2].x - 40} ${NODES[2].y + 22}, ${NODES[2].x} ${NODES[2].y + 22}`,
    },
    {
      from: 'station',
      to: 'pumps',
      path: `M ${cx} ${cy} C ${cx + 60} ${cy}, ${NODES[3].x - 40} ${NODES[3].y + 22}, ${NODES[3].x} ${NODES[3].y + 22}`,
    },
    {
      from: 'station',
      to: 'nozzles',
      path: `M ${cx} ${cy} C ${cx + 60} ${cy}, ${NODES[4].x - 40} ${NODES[4].y + 22}, ${NODES[4].x} ${NODES[4].y + 22}`,
    },
    {
      from: 'fuel-types',
      to: 'products',
      path: `M ${NODES[1].x + NODES[1].width} ${NODES[1].y + 22} C ${NODES[1].x + NODES[1].width + 50} ${NODES[1].y + 22}, ${NODES[5].x - 40} ${NODES[5].y + 22}, ${NODES[5].x} ${NODES[5].y + 22}`,
    },
  ];
};

const NODE_DELAYS = [0, 12, 16, 20, 24, 28];

type MockTopologyDiagramProps = {
  delay?: number;
};

export const MockTopologyDiagram: React.FC<MockTopologyDiagramProps> = ({
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const connections = getConnections();

  return (
    <svg
      width={640}
      height={420}
      viewBox="0 0 640 420"
      style={{ fontFamily }}
    >
      {/* Connection lines */}
      {connections.map((conn, i) => {
        const lineDelay = delay + 8 + i * 6;
        const progress = interpolate(
          frame - lineDelay,
          [0, 30],
          [0, 1],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.quad),
          }
        );

        const { strokeDasharray, strokeDashoffset } = evolvePath(
          progress,
          conn.path
        );

        return (
          <path
            key={`${conn.from}-${conn.to}`}
            d={conn.path}
            fill="none"
            stroke={COLORS.BORDER_LIGHT}
            strokeWidth={2}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
          />
        );
      })}

      {/* Nodes */}
      {NODES.map((node, i) => {
        const nodeDelay = delay + NODE_DELAYS[i];
        const entrance = spring({
          frame,
          fps,
          delay: nodeDelay,
          config: { damping: 200 },
        });

        const scale = interpolate(entrance, [0, 1], [0.7, 1]);
        const opacity = entrance;
        const isRoot = i === 0;

        return (
          <g
            key={node.id}
            style={{
              transform: `translate(${node.x + node.width / 2}px, ${node.y + node.height / 2}px) scale(${scale})`,
              transformOrigin: '0 0',
              opacity,
            }}
          >
            <rect
              x={-node.width / 2}
              y={-node.height / 2}
              width={node.width}
              height={node.height}
              rx={8}
              fill={isRoot ? '#222222' : COLORS.BG_CARD}
              stroke={isRoot ? COLORS.TEXT_WHITE : COLORS.BORDER}
              strokeWidth={isRoot ? 2 : 1}
            />
            <text
              x={0}
              y={-4}
              textAnchor="middle"
              fill={COLORS.TEXT_WHITE}
              fontSize={13}
              fontWeight={isRoot ? 600 : 400}
            >
              {node.label}
            </text>
            <text
              x={0}
              y={14}
              textAnchor="middle"
              fill={COLORS.TEXT_MUTED}
              fontSize={11}
            >
              {node.count} {node.count === 1 ? 'item' : 'items'}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
