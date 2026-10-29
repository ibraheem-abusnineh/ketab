import React, { ReactNode } from 'react';

export interface LegendItem {
  label: string;
  color: string;
  value?: string;
}

interface ChartFrameProps {
  title: string;
  subtitle?: string;
  legend?: LegendItem[];
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Every chart is a "plate": a title block, an optional legend strip, and
 * the plot itself. Keeping the header here means no chart can ship without
 * one, which was the original complaint.
 */
const ChartFrame: React.FC<ChartFrameProps> = ({
  title,
  subtitle,
  legend,
  action,
  className = '',
  children,
}) => (
  <section className={`chart-plate ${className}`.trim()}>
    <header className="chart-plate__head">
      <div className="chart-plate__heading">
        <h3 className="chart-plate__title">{title}</h3>
        {subtitle && <p className="chart-plate__subtitle">{subtitle}</p>}
      </div>
      {action && <div className="chart-plate__action">{action}</div>}
    </header>
    {legend && legend.length > 0 && (
      <ul className="chart-legend">
        {legend.map((item) => (
          <li className="chart-legend__item" key={item.label}>
            <span className="chart-legend__swatch" style={{ background: item.color }} />
            <span className="chart-legend__label">{item.label}</span>
            {item.value && <span className="chart-legend__value">{item.value}</span>}
          </li>
        ))}
      </ul>
    )}
    <div className="chart-plate__body">{children}</div>
  </section>
);

export default ChartFrame;
