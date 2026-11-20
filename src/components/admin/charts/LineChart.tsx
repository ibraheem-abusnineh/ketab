import React from 'react';
import { axisDay, formatNumber, labelIndexes, niceScale, SeriesPoint } from './chartUtils';

interface LineChartProps {
  data: SeriesPoint[];
  color?: string;
  height?: number;
  area?: boolean;
  valueLabel?: string;
  emptyLabel?: string;
  /** Optional axis titles. */
  xLabel?: string;
  yLabel?: string;
}

const WIDTH = 720;

const LineChart: React.FC<LineChartProps> = ({
  data,
  color = 'var(--admin-maroon)',
  height = 240,
  area = true,
  valueLabel = 'logins',
  emptyLabel = 'لا توجد بيانات في هذه الفترة',
  xLabel,
  yLabel,
}) => {
  const PAD = {
    top: 16,
    right: 18,
    bottom: xLabel ? 46 : 30,
    left: yLabel ? 66 : 46,
  };

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

  // For date series, label at a constant day step (anchored at the last day)
  // so the gaps between labels are equal instead of arbitrary indexes.
  const isDateSeries = /^\d{4}-\d{2}-\d{2}$/.test(data[0].label);
  let xLabels: number[];
  if (isDateSeries) {
    const candidates = [1, 2, 3, 5, 7, 10, 14, 21, 30, 60, 90];
    const step = candidates.find((value) => Math.ceil(data.length / value) <= 6) || 90;
    const indexes: number[] = [];
    for (let i = data.length - 1; i >= 0; i -= step) indexes.unshift(i);
    xLabels = indexes;
  } else {
    xLabels = labelIndexes(data.length, 6);
  }

  return (
    <svg
      className="line-chart"
      viewBox={`0 0 ${WIDTH} ${height}`}
      role="img"
      aria-label={`مخطط خطي لـ${valueLabel} عبر الزمن`}
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
          y={height - (xLabel ? 24 : 8)}
          textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'}
          className="chart-axis-text"
        >
          {axisDay(data[index].label, data.length)}
        </text>
      ))}

      {xLabel && (
        <text
          x={PAD.left + plotWidth / 2}
          y={height - 4}
          textAnchor="middle"
          className="chart-axis-title"
        >
          {xLabel}
        </text>
      )}

      {yLabel && (
        <text
          transform={`rotate(-90 14 ${PAD.top + plotHeight / 2})`}
          x={14}
          y={PAD.top + plotHeight / 2}
          textAnchor="middle"
          className="chart-axis-title"
        >
          {yLabel}
        </text>
      )}
    </svg>
  );
};

export default LineChart;
