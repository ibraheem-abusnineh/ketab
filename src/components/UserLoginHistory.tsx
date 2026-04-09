import React, { useState, useEffect } from 'react';
import ActivityTimeline from './ActivityTimeline';
import './UserLoginHistory.css';
import { apiFetch } from '../utils/api';

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

const UserLoginHistory: React.FC = () => {
  const [userHistory, setUserHistory] = useState<UserHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'loginCount' | 'lastLogin'>('loginCount');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 20;

  const fetchUserHistory = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/stats/user-history');
      const data = await response.json();
      setUserHistory(data.data || []);
      setError('');
    } catch (error: any) {
      setError(error.message || 'Network error. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserHistory();
  }, []);

  const filteredUsers = userHistory.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.nationalNumber.includes(searchTerm) ||
                         user.school.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortBy === 'loginCount') {
      return b.loginCount - a.loginCount;
    } else {
      return new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime();
    }
  });

  const totalPages = Math.ceil(sortedUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, startIndex + usersPerPage);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const toggleExpanded = (nationalNumber: string) => {
    setExpandedUser(expandedUser === nationalNumber ? null : nationalNumber);
  };

  if (loading) {
    return (
      <div className="user-login-history">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading user history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-login-history">
      {/* Activity Timeline Section */}
      <ActivityTimeline collapsible={true} />

      <div className="history-header">
        <h2>User Login History</h2>
        <div className="history-actions">
          <button 
            onClick={fetchUserHistory}
            className="refresh-btn"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={fetchUserHistory} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      <div className="history-filters">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="role-filter"
        >
          <option value="all">All Roles</option>
          <option value="parent">Parents</option>
          <option value="teacher">Teachers</option>
          <option value="supervisor">Supervisors</option>
          <option value="student">Students</option>
          <option value="guest">Guests</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'loginCount' | 'lastLogin')}
          className="sort-filter"
        >
          <option value="loginCount">Sort by Login Count</option>
          <option value="lastLogin">Sort by Last Login</option>
        </select>
      </div>

      <div className="history-stats">
        <div className="stat-item">
          <span className="stat-label">Total Users:</span>
          <span className="stat-value">{userHistory.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Filtered:</span>
          <span className="stat-value">{filteredUsers.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Logins:</span>
          <span className="stat-value">
            {userHistory.reduce((sum, user) => sum + user.loginCount, 0)}
          </span>
        </div>
      </div>

      <div className="history-table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th>User Details</th>
              <th>School</th>
              <th>Login Count</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map(user => (
              <React.Fragment key={user.nationalNumber}>
                <tr className="user-row">
                  <td>
                    <div className="user-info">
                      <div className="user-name">{user.name}</div>
                      <div className="user-national">{user.nationalNumber}</div>
                      <span className={`role-badge role-${user.role}`}>
                        {user.role}
                      </span>
                    </div>
                  </td>
                  <td>{user.school || 'N/A'}</td>
                  <td>
                    <div className="login-count">
                      <span className="count-number">{user.loginCount}</span>
                      <span className="count-label">logins</span>
                    </div>
                  </td>
                  <td>
                    <div className="last-login">
                      <div className="login-date">{formatDate(user.lastLogin)}</div>
                      <div className="login-time">{formatTime(user.lastLogin)}</div>
                    </div>
                  </td>
                  <td>
                    <button
                      onClick={() => toggleExpanded(user.nationalNumber)}
                      className="expand-btn"
                    >
                      {expandedUser === user.nationalNumber ? '▼' : '▶'} Details
                    </button>
                  </td>
                </tr>
                {expandedUser === user.nationalNumber && (
                  <tr className="expanded-row">
                    <td colSpan={5}>
                      <div className="login-details">
                        <h4>Recent Login History</h4>
                        <div className="login-timeline">
                          {user.recentLogins.map((login, index) => (
                            <div key={index} className="login-entry">
                              <div className="login-timestamp">
                                {login.date} at {login.time}
                              </div>
                              <div className="login-relative">
                                {new Date(login.timestamp).toLocaleString()}
                              </div>
                            </div>
                          ))}
                          {user.loginCount > 5 && (
                            <div className="more-logins">
                              ... and {user.loginCount - 5} more logins
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        
        {paginatedUsers.length === 0 && (
          <div className="no-users">
            <p>No users found matching your criteria.</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="page-btn"
          >
            Previous
          </button>
          
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="page-btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default UserLoginHistory;
