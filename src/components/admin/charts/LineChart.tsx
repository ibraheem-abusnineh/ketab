import React from 'react';
import { formatNumber, labelIndexes, niceScale, SeriesPoint, shortDay } from './chartUtils';

interface LineChartProps {
  data: SeriesPoint[];
  color?: string;
  height?: number;
  area?: boolean;
  valueLabel?: string;
  emptyLabel?: string;
}

const WIDTH = 720;
const PAD = { top: 16, right: 18, bottom: 30, left: 46 };

const LineChart: React.FC<LineChartProps> = ({
  data,
  color = 'var(--admin-maroon)',
  height = 240,
  area = true,
  valueLabel = 'logins',
  emptyLabel = 'No data for this range',
}) => {
  if (data.length === 0) {
    return <div className="chart-empty">{emptyLabel}</div>;
  }

  const maxValue = Math.max(...data.map((point) => point.value), 1);
  const { max, ticks } = niceScale(maxValue);
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = height - PAD.top - PAD.bottom;
  const xFor = (index: number) =>
    PAD.left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
  const yFor = (value: number) => PAD.top + plotHeight - (value / max) * plotHeight;

  const line = data.map((point, index) => `${xFor(index)},${yFor(point.value)}`).join(' ');
  const areaPath = `M ${xFor(0)},${PAD.top + plotHeight} L ${line
    .split(' ')
    .join(' L ')} L ${xFor(data.length - 1)},${PAD.top + plotHeight} Z`;

  const xLabels = labelIndexes(data.length, 6);

  return (
    <svg
      className="line-chart"
      viewBox={`0 0 ${WIDTH} ${height}`}
      role="img"
      aria-label={`Line chart of ${valueLabel} over time`}
    >
      {ticks.map((tick) => {
        const y = yFor(tick);
        return (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y}
              y2={y}
              stroke="var(--admin-line)"
              strokeWidth="1"
            />
            <text x={PAD.left - 8} y={y + 3.5} textAnchor="end" className="chart-axis-text">
              {formatNumber(tick)}
            </text>
          </g>
        );
      })}

      {area && (
        <path d={areaPath} fill={color} opacity="0.09" stroke="none" />
      )}
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {data.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <circle cx={xFor(index)} cy={yFor(point.value)} r="3.2" fill={color}>
            <title>{`${point.label}: ${formatNumber(point.value)} ${valueLabel}`}</title>
          </circle>
        </g>
      ))}

      {xLabels.map((index) => (
        <text
          key={`x-${index}`}
          x={xFor(index)}
          y={height - 8}
          textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'}
          className="chart-axis-text"
        >
          {shortDay(data[index].label)}
        </text>
      ))}
    </svg>
  );
};

export default LineChart;
