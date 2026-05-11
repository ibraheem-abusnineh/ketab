import React, { useState, useEffect } from 'react';
import './ActivityTimeline.css';
import { apiFetch } from '../utils/api';

interface TimeStats {
  hourly: Array<{ hour: number; count: number }>;
  daily: Array<{ day: string; count: number }>;
}

const ActivityTimeline: React.FC<{ collapsible?: boolean }> = ({ collapsible = false }) => {
  const [timeStats, setTimeStats] = useState<TimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(!collapsible);

  const fetchTimeStats = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/stats/by-time');
      const timeData = await response.json();
      setTimeStats(timeData.data);
      setError('');
    } catch (error: any) {
      setError(error.message || 'Network error. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeStats();
    
    // Set up polling every 30 seconds (less frequent than main stats)
    const interval = setInterval(fetchTimeStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (collapsible && !isExpanded) {
    return (
      <div className="activity-timeline-collapsed">
        <button 
          className="expand-timeline-btn"
          onClick={() => setIsExpanded(true)}
        >
          <span className="timeline-icon">⏰</span>
          <span>Show Activity Timeline</span>
          <span className="expand-arrow">▼</span>
        </button>
      </div>
    );
  }

  return (
    <div className="activity-timeline">
      {collapsible && (
        <div className="timeline-header">
          <h3>⏰ Activity Timeline</h3>
          <button 
            className="collapse-timeline-btn"
            onClick={() => setIsExpanded(false)}
            title="Collapse timeline"
          >
            ▲
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading activity data...</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={fetchTimeStats} className="retry-btn">
            Retry
          </button>
        </div>
      ) : timeStats && timeStats.hourly.length > 0 ? (
        <div className="timeline-content">
          <div className="hourly-chart">
            <h4>Peak Hours (Last 24 Hours)</h4>
            <div className="hour-bars">
              {timeStats.hourly.slice(0, 12).map(hour => (
                <div key={hour.hour} className="hour-bar">
                  <div 
                    className="bar-fill" 
                    style={{ 
                      height: `${Math.max(10, (hour.count / Math.max(...timeStats.hourly.map(h => h.count))) * 100)}%` 
                    }}
                  ></div>
                  <div className="hour-label">{hour.hour}:00</div>
                  <div className="hour-count">{hour.count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="daily-chart">
            <h4>Daily Activity (Last 7 Days)</h4>
            <div className="day-bars">
              {timeStats.daily.slice(-7).map(day => (
                <div key={day.day} className="day-bar">
                  <div 
                    className="bar-fill" 
                    style={{ 
                      height: `${Math.max(10, (day.count / Math.max(...timeStats.daily.map(d => d.count))) * 100)}%` 
                    }}
                  ></div>
                  <div className="day-label">
                    {new Date(day.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Amman' })}
                  </div>
                  <div className="day-count">{day.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="no-data">No activity data available</div>
      )}
    </div>
  );
};

export default ActivityTimeline;

