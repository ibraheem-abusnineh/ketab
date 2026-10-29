import React from 'react';
import { buildHeatWeeks, HeatCell, shortDayLong } from './chartUtils';

interface HeatmapProps {
  data: HeatCell[];
  emptyLabel?: string;
}

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

const Heatmap: React.FC<HeatmapProps> = ({ data, emptyLabel = 'No data for this range' }) => {
  const { weeks, max } = buildHeatWeeks(data);

  if (weeks.length === 0) {
    return <div className="chart-empty">{emptyLabel}</div>;
  }

  return (
    <div className="heatmap">
      <div className="heatmap__days" aria-hidden="true">
        {DAY_LABELS.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      <div className="heatmap__scroll">
        <div
          className="heatmap__grid"
          style={{ gridTemplateColumns: `repeat(${weeks.length}, 16px)` }}
          role="img"
          aria-label="Calendar heatmap of daily logins"
        >
          {weeks.map((week, weekIndex) =>
            week.cells.map((cell, dayIndex) => {
              if (!cell) {
                return (
                  <span
                    className="heatmap__cell heatmap__cell--blank"
                    key={`blank-${weekIndex}-${dayIndex}`}
                  />
                );
              }
              const ratio = max === 0 ? 0 : cell.count / max;
              const alpha = cell.count === 0 ? 0.04 : 0.16 + ratio * 0.84;
              return (
                <span
                  className="heatmap__cell"
                  key={cell.day}
                  title={`${shortDayLong(cell.day)}: ${cell.count} logins`}
                  style={{ background: `rgba(132, 51, 60, ${alpha.toFixed(2)})` }}
                />
              );
            })
          )}
        </div>
        <div className="heatmap__legend">
          <span>Less</span>
          {[0.08, 0.28, 0.5, 0.72, 0.95].map((alpha) => (
            <span
              className="heatmap__swatch"
              key={alpha}
              style={{ background: `rgba(132, 51, 60, ${alpha})` }}
            />
          ))}
          <span>More</span>
          <span className="heatmap__max">Peak day: {max}</span>
        </div>
      </div>
    </div>
  );
};

export default Heatmap;
