import React, { useState, useEffect } from 'react';
import './ProfileRequests.css';
import { apiFetch } from '../utils/api';

interface ProfileEditRequest {
  id: string;
  type: 'profile_edit_request';
  userId: string;
  userName: string;
  timestamp: string;
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  read: boolean;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
  rejectedAt?: string;
}

interface User {
  nationalNumber: string;
  name: string;
  role: 'parent' | 'teacher';
  school: string;
  phone: string;
  directorate?: string;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';

const ProfileRequests: React.FC = () => {
  const [requests, setRequests] = useState<ProfileEditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [selectedRequest, setSelectedRequest] = useState<ProfileEditRequest | null>(null);
  const [userDetails, setUserDetails] = useState<User | null>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);

  const fetchRequests = async () => {
    try {
      const response = await apiFetch('/api/admin/notifications');
      const data = await response.json();
      // Filter only profile edit requests
      const profileRequests = data.notifications.filter(
        (n: any) => n.type === 'profile_edit_request'
      ) as ProfileEditRequest[];
      setRequests(profileRequests);
      setError('');
    } catch (error: any) {
      console.error('Error fetching profile requests:', error);
      setError(error.message || 'Network error. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (nationalNumber: string) => {
    setLoadingUserDetails(true);
    try {
      const response = await apiFetch('/api/users');
      const data = await response.json();
      const user = data.users.find((u: User) => u.nationalNumber === nationalNumber);
      setUserDetails(user || null);
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoadingUserDetails(false);
    }
  };

  const handleViewDetails = async (request: ProfileEditRequest) => {
    setSelectedRequest(request);
    await fetchUserDetails(request.userId);
  };

  const handleCloseDetails = () => {
    setSelectedRequest(null);
    setUserDetails(null);
  };

  const handleApprove = async (requestId: string) => {
    try {
      await apiFetch(`/api/admin/profile-requests/${requestId}/approve`, {
        method: 'POST'
      });
      await fetchRequests();
      handleCloseDetails();
    } catch (error: any) {
      console.error('Error approving request:', error);
      alert(error.message || 'Failed to approve request');
    }
  };

  const handleReject = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to reject this profile edit request?')) {
      return;
    }
    try {
      await apiFetch(`/api/admin/profile-requests/${requestId}/reject`, {
        method: 'POST'
      });
      await fetchRequests();
      handleCloseDetails();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      alert(error.message || 'Failed to reject request');
    }
  };

  useEffect(() => {
    fetchRequests();
    // Set up polling every 10 seconds
    const interval = setInterval(() => {
      fetchRequests();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Filter requests by status
  const filteredRequests = requests.filter(request => {
    if (statusFilter === 'all') return true;
    return request.status === statusFilter;
  });

  // Sort requests
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    switch (sortOption) {
      case 'date-desc':
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      case 'date-asc':
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      case 'name-asc':
        return a.userName.localeCompare(b.userName);
      case 'name-desc':
        return b.userName.localeCompare(a.userName);
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="profile-requests-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading profile requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-requests-container">
      <div className="profile-requests-header">
        <h2>Profile Edit Requests</h2>
        <div className="request-count">
          {sortedRequests.length} request{sortedRequests.length !== 1 ? 's' : ''}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      <div className="filters-and-sort">
        <div className="status-filters">
          <label>Filter by Status:</label>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </button>
            <button
              className={`filter-btn ${statusFilter === 'approved' ? 'active' : ''}`}
              onClick={() => setStatusFilter('approved')}
            >
              Approved
            </button>
            <button
              className={`filter-btn ${statusFilter === 'rejected' ? 'active' : ''}`}
              onClick={() => setStatusFilter('rejected')}
            >
              Rejected
            </button>
          </div>
        </div>

        <div className="sort-controls">
          <label htmlFor="sort-select">Sort by:</label>
          <select
            id="sort-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="sort-select"
          >
            <option value="date-desc">Date (Newest First)</option>
            <option value="date-asc">Date (Oldest First)</option>
            <option value="name-asc">User Name (A-Z)</option>
            <option value="name-desc">User Name (Z-A)</option>
          </select>
        </div>
      </div>

      {sortedRequests.length === 0 ? (
        <div className="no-requests">
          <p>
            {statusFilter === 'all'
              ? 'No profile edit requests available'
              : `No ${statusFilter} requests found`}
          </p>
        </div>
      ) : (
        <div className="requests-list">
          {sortedRequests.map(request => (
            <div key={request.id} className={`request-card ${request.status}`}>
              <div className="request-card-header">
                <div className="request-user-info">
                  <span className="request-user-name">{request.userName}</span>
                  <span className="request-timestamp">{formatDate(request.timestamp)}</span>
                </div>
                <span className={`status-badge ${request.status}`}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
              </div>

              <div className="request-changes">
                <h4>Requested Changes:</h4>
                <ul className="changes-list">
                  {request.changes.map((change, index) => (
                    <li key={index}>
                      <strong>{change.field}:</strong> "{change.oldValue || 'empty'}" → "{change.newValue}"
                    </li>
                  ))}
                </ul>
              </div>

              {request.status === 'approved' && request.approvedAt && (
                <div className="request-status-info approved">
                  ✓ Approved on {formatDate(request.approvedAt)}
                </div>
              )}

              {request.status === 'rejected' && request.rejectedAt && (
                <div className="request-status-info rejected">
                  ✗ Rejected on {formatDate(request.rejectedAt)}
                </div>
              )}

              <div className="request-actions">
                <button
                  className="view-details-btn"
                  onClick={() => handleViewDetails(request)}
                >
                  👁️ View User Details
                </button>
                {request.status === 'pending' && (
                  <>
                    <button
                      className="approve-btn"
                      onClick={() => handleApprove(request.id)}
                    >
                      ✓ Approve
                    </button>
                    <button
                      className="reject-btn"
                      onClick={() => handleReject(request.id)}
                    >
                      ✗ Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User Details Modal */}
      {selectedRequest && (
        <div className="user-details-modal-overlay" onClick={handleCloseDetails}>
          <div className="user-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Details & Request Comparison</h3>
              <button className="close-modal-btn" onClick={handleCloseDetails}>
                ×
              </button>
            </div>

            <div className="modal-content">
              {loadingUserDetails ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <p>Loading user details...</p>
                </div>
              ) : (
                <>
                  <div className="user-current-profile">
                    <h4>Current Profile</h4>
                    {userDetails ? (
                      <div className="profile-info">
                        <div className="info-row">
                          <span className="info-label">Name:</span>
                          <span className="info-value">{userDetails.name}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">National Number:</span>
                          <span className="info-value">{userDetails.nationalNumber}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Role:</span>
                          <span className="info-value">{userDetails.role}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">School:</span>
                          <span className="info-value">{userDetails.school || 'N/A'}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Phone:</span>
                          <span className="info-value">{userDetails.phone || 'N/A'}</span>
                        </div>
                        {userDetails.directorate && (
                          <div className="info-row">
                            <span className="info-label">Directorate:</span>
                            <span className="info-value">{userDetails.directorate}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="error-text">User details not found</p>
                    )}
                  </div>

                  <div className="comparison-section">
                    <h4>Requested Changes Comparison</h4>
                    <table className="comparison-table">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Current Value</th>
                          <th>Requested Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRequest.changes.map((change, index) => {
                          // Get current value from userDetails
                          const currentValue = userDetails
                            ? (userDetails as any)[change.field] || 'N/A'
                            : change.oldValue || 'empty';
                          
                          return (
                            <tr key={index}>
                              <td><strong>{change.field}</strong></td>
                              <td className="current-value">{currentValue}</td>
                              <td className="requested-value">{change.newValue}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {selectedRequest.status === 'pending' && (
                    <div className="modal-actions">
                      <button
                        className="approve-btn"
                        onClick={() => handleApprove(selectedRequest.id)}
                      >
                        ✓ Approve Request
                      </button>
                      <button
                        className="reject-btn"
                        onClick={() => handleReject(selectedRequest.id)}
                      >
                        ✗ Reject Request
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileRequests;
