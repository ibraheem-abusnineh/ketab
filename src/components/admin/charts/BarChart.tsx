import React from 'react';
import { formatNumber } from './chartUtils';

export interface BarRow {
  label: string;
  value: number;
  meta?: string;
  color?: string;
}

interface BarChartProps {
  data: BarRow[];
  valueLabel?: string;
  emptyLabel?: string;
  highlightTop?: boolean;
}

/**
 * Horizontal bars rendered as HTML (not SVG) so long Arabic school names
 * truncate cleanly and the numbers stay crisp at any zoom.
 */
const BarChart: React.FC<BarChartProps> = ({
  data,
  valueLabel = 'logins',
  emptyLabel = 'No data for this range',
  highlightTop = true,
}) => {
  if (data.length === 0) {
    return <div className="chart-empty">{emptyLabel}</div>;
  }

  const max = Math.max(...data.map((row) => row.value), 1);

  return (
    <div className="hbar" role="img" aria-label={`مخطط أشرطة لـ${valueLabel}`}>
      {data.map((row, index) => {
        const width = Math.max(row.value > 0 ? 2 : 0, (row.value / max) * 100);
        const background =
          row.color || (highlightTop && index === 0 ? 'var(--admin-brass)' : 'var(--admin-maroon)');
        return (
          <div className="hbar__row" key={`${row.label}-${index}`}>
            <div className="hbar__label" title={row.label}>
              <span className="hbar__label-text">{row.label}</span>
              {row.meta && <span className="hbar__label-meta">{row.meta}</span>}
            </div>
            <div className="hbar__track">
              <div className="hbar__fill" style={{ width: `${width}%`, background }} />
            </div>
            <div className="hbar__value">{formatNumber(row.value)}</div>
          </div>
        );
      })}
    </div>
  );
};

export default BarChart;
