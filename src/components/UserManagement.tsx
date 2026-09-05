import React, { useState, useEffect } from 'react';
import './UserManagement.css';
import { apiFetch } from '../utils/api';

interface User {
  nationalNumber: string;
  name: string;
  role: 'parent' | 'teacher' | 'supervisor' | 'student' | 'developer' | 'guest' | 'qra-employ';
  school: string;
  phone: string;
  directorate?: string;
}

interface EditUser extends User {
  isEditing?: boolean;
}

interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
}

interface ImportError {
  error: string;
  details?: {
    headers: string[];
    rowCount: number;
    suggestion: string;
  };
}


const UserManagement: React.FC = (): React.ReactElement => {
  const [users, setUsers] = useState<EditUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  
  // Add user form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({
    nationalNumber: '',
    name: '',
    role: 'parent',
    school: '',
    phone: '',
    directorate: ''
  });
  
  // CSV import
  const [showImportForm, setShowImportForm] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importRole, setImportRole] = useState('parent');
  const [importStrategy, setImportStrategy] = useState('add');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<ImportError | null>(null);
  
  // Delete confirmation
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Change national number confirmation
  const [userToChangeNumber, setUserToChangeNumber] = useState<User | null>(null);
  const [newNationalNumberInput, setNewNationalNumberInput] = useState('');
  const [changeNumberError, setChangeNumberError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/users');
      const data = await response.json();
      setUsers(data.users || []);
      setError('');
    } catch (error: any) {
      setError(error.message || 'Network error. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await apiFetch('/api/users/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      const data = await response.json();

      if (data.success) {
        setUsers([...users, data.user]);
        setNewUser({
          nationalNumber: '',
          name: '',
          role: 'parent',
          school: '',
          phone: '',
          directorate: ''
        });
        setShowAddForm(false);
        setError('');
      } else {
        setError(data.error || 'Failed to add user');
      }
    } catch (error: any) {
      setError(error.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (nationalNumber: string) => {
    setEditingUser(nationalNumber);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setError('');
  };

  const handleUpdateUser = async (user: EditUser) => {
    if (!user || !user.nationalNumber) {
      setError('Invalid user data');
      return;
    }

    setLoading(true);
    try {
      // Validate required fields
      if (!user.name || !user.role) {
        throw new Error('Name and role are required fields');
      }

      const response = await apiFetch(`/api/users/${user.nationalNumber.trim()}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: user.name.trim(),
          role: user.role,
          school: user.school?.trim() || '',
          phone: user.phone?.trim() || '',
          directorate: user.directorate?.trim() || ''
        })
      });

      const data = await response.json();
      if (data.success && data.user) {
        setUsers(users.map(u => 
          u.nationalNumber === user.nationalNumber ? { ...data.user } : u
        ));
        setEditingUser(null);
        setError('');
      } else {
        throw new Error(data.error || 'Failed to update user');
      }
    } catch (error: any) {
      setError(error.message || 'Network error while updating user');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (nationalNumber: string, field: keyof User, value: string) => {
    setUsers(users.map(user => 
      user.nationalNumber === nationalNumber 
        ? { ...user, [field]: value }
        : user
    ));
  };

  const handleDeleteUser = async (user: User) => {
    setLoading(true);
    
    try {
      const response = await apiFetch(`/api/users/${user.nationalNumber}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setUsers(users.filter(u => u.nationalNumber !== user.nationalNumber));
        setUserToDelete(null);
        setError('');
      } else {
        setError(data.error || 'Failed to delete user');
      }
    } catch (error: any) {
      setError(error.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNationalNumber = async () => {
    if (!userToChangeNumber) return;
    const trimmed = newNationalNumberInput.trim();
    if (!trimmed) {
      setChangeNumberError('New national number is required');
      return;
    }
    if (trimmed === userToChangeNumber.nationalNumber) {
      setChangeNumberError('New number must be different from the current one');
      return;
    }

    setLoading(true);
    setChangeNumberError('');
    try {
      const response = await apiFetch(`/api/users/${userToChangeNumber.nationalNumber}/nationalNumber`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newNationalNumber: trimmed }),
      });
      const data = await response.json();
      if (data.success) {
        setUserToChangeNumber(null);
        setNewNationalNumberInput('');
        setError('');
        await fetchUsers();
      } else {
        setChangeNumberError(data.error || 'Failed to change national number');
      }
    } catch (error: any) {
      setChangeNumberError(error.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const openChangeNumberModal = (user: User) => {
    setUserToChangeNumber(user);
    setNewNationalNumberInput('');
    setChangeNumberError('');
  };

  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;
    
    setLoading(true);
    setImportResult(null);
    setImportError(null);
    
    const formData = new FormData();
    formData.append('csvFile', csvFile);
    formData.append('role', importRole as string);
    formData.append('strategy', importStrategy);
    
    try {
      const response = await apiFetch('/api/users/import-csv', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      if (data.success) {
        setImportResult(data.result);
        setCsvFile(null);
        setShowImportForm(false);
        fetchUsers(); // Refresh users list
        setError('');
      } else {
        setImportError(data);
        setError('');
      }
    } catch (error: any) {
      setError(error.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.nationalNumber.includes(searchTerm) ||
                         user.school.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading && users.length === 0) {
    return (
      <div className="user-management">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h2>User Management</h2>
        <div className="user-actions">
          <button 
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            Add User
          </button>
          <button 
            onClick={() => setShowImportForm(true)}
            className="btn btn-secondary"
          >
            Import CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={() => setError('')} className="btn btn-sm">Dismiss</button>
        </div>
      )}

      {importResult && (
        <div className="import-result">
          <h3>Import Results</h3>
          <p>Added: {importResult.added} | Updated: {importResult.updated} | Skipped: {importResult.skipped}</p>
          {importResult.errors.length > 0 && (
            <div className="import-errors">
              <h4>Errors:</h4>
              <ul>
                {importResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          <button onClick={() => setImportResult(null)} className="btn btn-sm">Close</button>
        </div>
      )}

      {importError && (
        <div className="import-error">
          <h3>❌ Import Failed</h3>
          <p><strong>Error:</strong> {importError.error}</p>
          {importError.details && (
            <div className="import-error-details">
              <p><strong>Headers detected:</strong> {importError.details.headers.join(', ')}</p>
              <p><strong>Rows processed:</strong> {importError.details.rowCount}</p>
              <p><strong>Suggestion:</strong> {importError.details.suggestion}</p>
            </div>
          )}
          <button onClick={() => setImportError(null)} className="btn btn-sm">Close</button>
        </div>
      )}

      <div className="user-filters">
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
          <option value="qra-employ">QRA Employ</option>
          <option value="supervisor">Supervisors</option>
          <option value="student">Students</option>
          <option value="developer">Developers</option>
          <option value="guest">Guests</option>
        </select>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>National Number</th>
              <th>Name</th>
              <th>Role</th>
              <th>School</th>
              <th>Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.nationalNumber}>
                <td>{user.nationalNumber}</td>
                <td>
                  {editingUser === user.nationalNumber ? (
                    <input
                      type="text"
                      value={user.name}
                      onChange={(e) => handleFieldChange(user.nationalNumber, 'name', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    user.name
                  )}
                </td>
                <td>
                  {editingUser === user.nationalNumber ? (
                    <select
                      value={user.role}
                      onChange={(e) => handleFieldChange(user.nationalNumber, 'role', e.target.value as User['role'])}
                      className="edit-select"
                    >
                      <option value="parent">Parent</option>
                      <option value="teacher">Teacher</option>
                      <option value="qra-employ">QRA Employ</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="student">Student</option>
                      <option value="developer">Developer</option>
                      <option value="guest">Guest</option>
                    </select>
                  ) : (
                    <span className={`role-badge role-${user.role}`}>
                      {user.role}
                    </span>
                  )}
                </td>
                <td>
                  {editingUser === user.nationalNumber ? (
                    <input
                      type="text"
                      value={user.school || ''}
                      onChange={(e) => handleFieldChange(user.nationalNumber, 'school', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    user.school || ''
                  )}
                </td>
                <td>
                  {editingUser === user.nationalNumber ? (
                    <input
                      type="text"
                      value={user.phone || ''}
                      onChange={(e) => handleFieldChange(user.nationalNumber, 'phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      pattern="\d{10}"
                      title="Phone must be exactly 10 digits"
                      className="edit-input"
                    />
                  ) : (
                    user.phone || ''
                  )}
                </td>
                <td>
                  {editingUser === user.nationalNumber ? (
                    <div className="action-buttons">
                      <button
                        onClick={() => handleUpdateUser(user)}
                        className="btn btn-success btn-sm"
                        disabled={loading}
                      >
                        {loading ? '...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="btn btn-secondary btn-sm"
                        disabled={loading}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="action-buttons">
                      <button
                        onClick={() => handleEditClick(user.nationalNumber)}
                        className="btn btn-primary btn-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openChangeNumberModal(user)}
                        className="btn btn-secondary btn-sm"
                      >
                        Change Number
                      </button>
                      <button
                        onClick={() => setUserToDelete(user)}
                        className="btn btn-danger btn-sm"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredUsers.length === 0 && (
          <div className="no-users">
            <p>No users found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add New User</h3>
            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label>National Number *</label>
                <input
                  type="text"
                  value={newUser.nationalNumber}
                  onChange={(e) => setNewUser({...newUser, nationalNumber: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as User['role']})}
                  required
                >
                  <option value="parent">Parent</option>
                  <option value="teacher">Teacher</option>
                  <option value="qra-employ">QRA Employ</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="student">Student</option>
                  <option value="developer">Developer</option>
                  <option value="guest">Guest</option>
                </select>
              </div>
              <div className="form-group">
                <label>School *</label>
                <input
                  type="text"
                  value={newUser.school}
                  onChange={(e) => setNewUser({...newUser, school: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone (10 digits)</label>
                <input
                  type="text"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({...newUser, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                  pattern="\d{10}"
                  title="Phone must be exactly 10 digits"
                  inputMode="numeric"
                />
              </div>
              <div className="form-group">
                <label>Directorate</label>
                <input
                  type="text"
                  value={newUser.directorate}
                  onChange={(e) => setNewUser({...newUser, directorate: e.target.value})}
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportForm && (
        <div className="modal-overlay" onClick={() => setShowImportForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Import Users from CSV</h3>
            <form onSubmit={handleImportCSV}>
              <div className="form-group">
                <label>CSV File *</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              <div className="form-group">
                <label>User Role *</label>
                <select
                  value={importRole}
                  onChange={(e) => setImportRole(e.target.value)}
                  required
                >
                  <option value="parent">Parents</option>
                  <option value="teacher">Teachers</option>
                  <option value="qra-employ">QRA Employ</option>
                </select>
              </div>
              <div className="form-group">
                <label>Import Strategy *</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      value="add"
                      checked={importStrategy === 'add'}
                      onChange={(e) => setImportStrategy(e.target.value)}
                    />
                    Add new only (skip existing)
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="upsert"
                      checked={importStrategy === 'upsert'}
                      onChange={(e) => setImportStrategy(e.target.value)}
                    />
                    Update existing + add new
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="replace"
                      checked={importStrategy === 'replace'}
                      onChange={(e) => setImportStrategy(e.target.value)}
                    />
                    Replace all users
                  </label>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowImportForm(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading || !csvFile}>
                  {loading ? 'Importing...' : 'Import CSV'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="modal-overlay" onClick={() => setUserToDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete user <strong>{userToDelete.name}</strong>?</p>
            <p>This action cannot be undone.</p>
            <div className="form-actions">
              <button 
                onClick={() => setUserToDelete(null)} 
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteUser(userToDelete)} 
                className="btn btn-danger"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change National Number Confirmation Modal */}
      {userToChangeNumber && (
        <div className="modal-overlay" onClick={() => setUserToChangeNumber(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Change National Number</h3>
            <p>
              Update the login national number for <strong>{userToChangeNumber.name}</strong>{' '}
              (currently <code>{userToChangeNumber.nationalNumber}</code>).
            </p>
            <p className="warning">
              Changing a national number changes the user's login. This action cannot be undone.
            </p>
            <div className="form-group">
              <label htmlFor="new-national-number">New National Number</label>
              <input
                id="new-national-number"
                type="text"
                value={newNationalNumberInput}
                onChange={(e) => setNewNationalNumberInput(e.target.value)}
                className="edit-input"
                autoFocus
              />
            </div>
            {changeNumberError && (
              <div className="modal-error" role="alert">{changeNumberError}</div>
            )}
            <div className="form-actions">
              <button
                onClick={() => setUserToChangeNumber(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeNationalNumber}
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}
     </div>
  );
};

export default UserManagement;
