import React, { useState, useEffect } from 'react';
import './Statistics.css';
import { apiFetch } from '../utils/api';

interface SchoolStats {
  school: string;
  visitCount: number;
  uniqueUsers: number;
}

interface VisitDetail {
  timestamp: string;
  nationalNumber: string;
  name: string;
  school: string;
}

type PeriodType = 'day' | 'week' | 'month' | 'all' | 'custom';

interface UserHistory {
  nationalNumber: string;
  name: string;
  school: string;
  role: string;
  loginCount: number;
  lastLogin: string;
  recentLogins: Array<{
    timestamp: string;
    date: string;
    time: string;
  }>;
}

const Statistics: React.FC = () => {
  const [totalVisitCount, setTotalVisitCount] = useState<number>(0);
  const [filteredVisitCount, setFilteredVisitCount] = useState<number>(0);
  const [filteredVisits, setFilteredVisits] = useState<VisitDetail[]>([]);
  const [schoolStats, setSchoolStats] = useState<SchoolStats[]>([]);
  const [userHistory, setUserHistory] = useState<UserHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [periodType, setPeriodType] = useState<PeriodType>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const getDateRange = (): { startDate: string; endDate: string } | null => {
    const now = new Date();
    let startDate: Date;

    switch (periodType) {
      case 'day':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            startDate: new Date(customStartDate).toISOString(),
            endDate: new Date(customEndDate + 'T23:59:59').toISOString()
          };
        }
        return null;
      case 'all':
      default:
        return null;
    }

    return {
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    };
  };

  const fetchAllStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all statistics in parallel
      const [visitResponse, schoolResponse, userResponse] = await Promise.all([
        apiFetch('/api/visit-count'),
        apiFetch('/api/stats/by-school'),
        apiFetch('/api/stats/user-history')
      ]);

      let fetchedTotalVisitCount = 0;
      
      const visitData = await visitResponse.json();
      fetchedTotalVisitCount = visitData.totalVisits || 0;
      setTotalVisitCount(fetchedTotalVisitCount);

      const schoolData = await schoolResponse.json();
      setSchoolStats(schoolData.data || []);

      const userData = await userResponse.json();
      setUserHistory(userData.data || []);

      // Fetch filtered visits based on period
      const dateRange = getDateRange();
      if (dateRange) {
        const params = new URLSearchParams({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        });
        const visitsResponse = await apiFetch(`/api/stats/visits?${params}`);
        const visitsData = await visitsResponse.json();
        setFilteredVisitCount(visitsData.count || 0);
        setFilteredVisits(visitsData.visits || []);
      } else {
        // All time - use fetched total visit count and fetch all visits (limit to recent ones for display)
        setFilteredVisitCount(fetchedTotalVisitCount);
        const visitsResponse = await apiFetch('/api/stats/visits');
        const visitsData = await visitsResponse.json();
        setFilteredVisits((visitsData.visits || []).slice(-100)); // Show last 100 for "all time"
      }

      setLastUpdated(new Date());
      setError('');
    } catch (error: any) {
      setError(error.message || 'Network error. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchAllStats();
    
    // Set up polling every 10 seconds
    const interval = setInterval(fetchAllStats, 10000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodType, customStartDate, customEndDate]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Amman'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Amman'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Amman'
    });
  };

  const handleResetVisits = async () => {
    try {
      setResetting(true);
      setResetMessage(null);
      
      const response = await apiFetch('/api/admin/reset-visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmed: true }),
      });

      const data = await response.json();
      setResetMessage({ type: 'success', text: data.message || 'Visit counter and login history reset successfully!' });
      setShowResetConfirm(false);
      // Refresh all statistics
      await fetchAllStats();
      // Clear message after 5 seconds
      setTimeout(() => setResetMessage(null), 5000);
    } catch (error: any) {
      setResetMessage({ type: 'error', text: error.message || 'Network error. Please check if the server is running.' });
    } finally {
      setResetting(false);
    }
  };

  if (loading && totalVisitCount === 0) {
    return (
      <div className="statistics">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="statistics">
      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={fetchAllStats} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {resetMessage && (
        <div className={`reset-message ${resetMessage.type === 'success' ? 'success' : 'error'}`}>
          <p>{resetMessage.type === 'success' ? '✓' : '❌'} {resetMessage.text}</p>
        </div>
      )}

      <div className="stats-grid">
        {/* Total Visits Card */}
        <div className="stat-card total-visits">
          <h3>📊 Total Site Visits</h3>
          
          {/* Period Selection */}
          <div className="period-selector">
            <label htmlFor="period-select" className="period-label">
              <span className="info-icon" title="Select time period to filter visits">ℹ️</span>
              Period:
            </label>
            <select
              id="period-select"
              value={periodType}
              onChange={(e) => {
                setPeriodType(e.target.value as PeriodType);
                if (e.target.value !== 'custom') {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }
              }}
              className="period-select"
            >
              <option value="all">All Time</option>
              <option value="day">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {periodType === 'custom' && (
            <div className="custom-date-range">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="date-input"
                placeholder="Start Date"
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="date-input"
                placeholder="End Date"
              />
            </div>
          )}

          {/* Visit Count Display */}
          <div className="stat-number">{filteredVisitCount.toLocaleString()}</div>
          <div className="stat-label">
            {periodType === 'all' 
              ? 'Total Logins (All Time)' 
              : periodType === 'day' 
              ? 'Logins Today'
              : periodType === 'week'
              ? 'Logins (Last 7 Days)'
              : periodType === 'month'
              ? 'Logins (Last 30 Days)'
              : 'Logins (Custom Range)'}
          </div>

          {/* Period Info */}
          {periodType !== 'all' && (
            <div className="period-info">
              {periodType === 'day' && `Showing visits from today`}
              {periodType === 'week' && `Showing visits from the last 7 days`}
              {periodType === 'month' && `Showing visits from the last 30 days`}
              {periodType === 'custom' && customStartDate && customEndDate && 
                `Showing visits from ${formatDate(customStartDate)} to ${formatDate(customEndDate)}`}
            </div>
          )}

          {/* Recent Visits List */}
          {filteredVisits.length > 0 && (
            <div className="recent-visits-list">
              <h4 className="recent-visits-title">Recent Visits ({Math.min(5, filteredVisits.length)} of {filteredVisits.length})</h4>
              <div className="visits-scroll">
                {filteredVisits.slice(-5).reverse().map((visit, index) => (
                  <div key={index} className="visit-item">
                    <div className="visit-time">{formatDateTime(visit.timestamp)}</div>
                    <div className="visit-user">{visit.name} • {visit.school}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lastUpdated && (
            <div className="last-updated">
              Last updated: {formatTime(lastUpdated)}
            </div>
          )}
          <button 
            onClick={() => setShowResetConfirm(true)} 
            className="reset-btn"
            disabled={resetting}
          >
            {resetting ? 'Resetting...' : 'Reset Counter'}
          </button>
        </div>

        {/* Visits by School Card */}
        <div className="stat-card school-stats">
          <h3>🏫 Visits by School</h3>
          {schoolStats.length > 0 ? (
            <div className="school-list">
              {schoolStats.slice(0, 5).map((school, index) => (
                <div key={school.school} className="school-item">
                  <div className="school-name">{school.school}</div>
                  <div className="school-numbers">
                    <span className="visit-count">{school.visitCount} visits</span>
                    <span className="user-count">{school.uniqueUsers} users</span>
                  </div>
                </div>
              ))}
              {schoolStats.length > 5 && (
                <div className="more-schools">
                  +{schoolStats.length - 5} more schools
                </div>
              )}
            </div>
          ) : (
            <div className="no-data">No school data available</div>
          )}
        </div>

        {/* Most Active Users Card */}
        <div className="stat-card active-users">
          <h3>👥 Most Active Users</h3>
          {userHistory.length > 0 ? (
            <div className="users-list">
              {userHistory.slice(0, 5).map((user, index) => (
                <div key={user.nationalNumber} className="user-item">
                  <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-details">
                      {user.school} • {user.role}
                    </div>
                  </div>
                  <div className="user-stats">
                    <div className="login-count">{user.loginCount} logins</div>
                    <div className="last-login">
                      Last: {formatDate(user.lastLogin)}
                    </div>
                  </div>
                </div>
              ))}
              {userHistory.length > 5 && (
                <div className="more-users">
                  +{userHistory.length - 5} more users
                </div>
              )}
            </div>
          ) : (
            <div className="no-data">No user activity data available</div>
          )}
        </div>
      </div>

      <div className="dashboard-info">
        <div className="info-card">
          <h3>📊 Enhanced Statistics</h3>
          <p>This dashboard now tracks detailed login analytics including:</p>
          <ul>
            <li>• Visits grouped by school</li>
            <li>• Activity patterns by time</li>
            <li>• Individual user login history</li>
            <li>• Most active users and schools</li>
          </ul>
        </div>
        
        <div className="info-card">
          <h3>🔄 Real-time Updates</h3>
          <p>Statistics update automatically every 10 seconds.</p>
          <p>All data is stored securely and includes timestamps for each login event.</p>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="reset-modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="reset-modal" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Reset Visit Counter</h3>
            <p>Are you sure you want to reset the visit counter and clear all login history?</p>
            <p className="reset-warning">This action cannot be undone!</p>
            <div className="reset-modal-actions">
              <button 
                onClick={handleResetVisits} 
                className="reset-confirm-btn"
                disabled={resetting}
              >
                {resetting ? 'Resetting...' : 'Yes, Reset'}
              </button>
              <button 
                onClick={() => setShowResetConfirm(false)} 
                className="reset-cancel-btn"
                disabled={resetting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics;
