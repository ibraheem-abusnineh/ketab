import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../utils/api';
import { DirectoryUser } from '../types';
import {
  Banner,
  EmptyState,
  Loading,
  PageHeader,
  RoleFilterChips,
  RoleStamp,
  formatNumber,
  roleLabel,
} from '../ui';
import Icon from '../Icons';

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

const PAGE_SIZE = 25;

const EMPTY_USER = {
  nationalNumber: '',
  name: '',
  role: 'parent' as DirectoryUser['role'],
  school: '',
  phone: '',
  directorate: '',
};

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editNationalNumber, setEditNationalNumber] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ ...EMPTY_USER });

  const [showImportForm, setShowImportForm] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importRole, setImportRole] = useState('parent');
  const [importStrategy, setImportStrategy] = useState('add');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<ImportError | null>(null);

  const [userToDelete, setUserToDelete] = useState<DirectoryUser | null>(null);
  const [userToChangeNumber, setUserToChangeNumber] = useState<DirectoryUser | null>(null);
  const [newNationalNumberInput, setNewNationalNumberInput] = useState('');
  const [changeNumberError, setChangeNumberError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/users');
      const data = await response.json();
      setUsers(data.users || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'تعذّر قراءة دليل المستخدمين.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, roleFilter]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: users.length };
    users.forEach((user) => {
      counts[user.role] = (counts[user.role] || 0) + 1;
    });
    return counts;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !needle ||
        (user.name || '').toLowerCase().includes(needle) ||
        (user.nationalNumber || '').includes(needle) ||
        (user.school || '').toLowerCase().includes(needle);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleAddUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await apiFetch('/api/users/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await response.json();
      if (data.success) {
        setUsers((current) => [...current, data.user]);
        setNewUser({ ...EMPTY_USER });
        setShowAddForm(false);
        setError('');
      } else {
        setError(data.error || 'تعذّر إضافة المستخدم.');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في الشبكة.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (nationalNumber: string) => {
    setEditingUser(nationalNumber);
    setEditNationalNumber(nationalNumber);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditNationalNumber('');
    setError('');
  };

  const handleFieldChange = (nationalNumber: string, field: keyof DirectoryUser, value: string) => {
    setUsers((current) =>
      current.map((user) =>
        user.nationalNumber === nationalNumber ? { ...user, [field]: value } : user
      )
    );
  };

  const handleUpdateUser = async (user: DirectoryUser) => {
    if (!editingUser) {
      setError('لا يوجد مستخدم قيد التعديل.');
      return;
    }
    const originalNumber = editingUser;
    const trimmedNewNumber = editNationalNumber.trim();
    if (!trimmedNewNumber) {
      setError('الرقم الوطني مطلوب.');
      return;
    }

    setLoading(true);
    try {
      if (!user.name || !user.role) {
        throw new Error('الاسم والنوع مطلوبان.');
      }

      const response = await apiFetch(`/api/users/${originalNumber.trim()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: user.name.trim(),
          role: user.role,
          school: user.school?.trim() || '',
          phone: user.phone?.trim() || '',
          directorate: user.directorate?.trim() || '',
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'تعذّر تحديث المستخدم.');

      if (trimmedNewNumber !== originalNumber.trim()) {
        const renameResponse = await apiFetch(
          `/api/users/${originalNumber.trim()}/nationalNumber`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ newNationalNumber: trimmedNewNumber }),
          }
        );
        const renameData = await renameResponse.json();
        if (!renameData.success) {
          throw new Error(renameData.error || 'تعذّر تغيير الرقم الوطني.');
        }
      }

      setEditingUser(null);
      setEditNationalNumber('');
      setError('');
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في الشبكة أثناء تحديث المستخدم.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: DirectoryUser) => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/users/${user.nationalNumber}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setUsers((current) =>
          current.filter((item) => item.nationalNumber !== user.nationalNumber)
        );
        setUserToDelete(null);
        setError('');
      } else {
        setError(data.error || 'تعذّر حذف المستخدم.');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في الشبكة.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNationalNumber = async () => {
    if (!userToChangeNumber) return;
    const trimmed = newNationalNumberInput.trim();
    if (!trimmed) {
      setChangeNumberError('الرقم الوطني الجديد مطلوب.');
      return;
    }
    if (trimmed === userToChangeNumber.nationalNumber) {
      setChangeNumberError('يجب أن يكون الرقم الجديد مختلفًا عن الرقم الحالي.');
      return;
    }

    setLoading(true);
    setChangeNumberError('');
    try {
      const response = await apiFetch(
        `/api/users/${userToChangeNumber.nationalNumber}/nationalNumber`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newNationalNumber: trimmed }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setUserToChangeNumber(null);
        setNewNationalNumberInput('');
        setError('');
        await fetchUsers();
      } else {
        setChangeNumberError(data.error || 'تعذّر تغيير الرقم الوطني.');
      }
    } catch (err: any) {
      setChangeNumberError(err.message || 'حدث خطأ في الشبكة.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportCSV = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!csvFile) return;

    setLoading(true);
    setImportResult(null);
    setImportError(null);

    const formData = new FormData();
    formData.append('csvFile', csvFile);
    formData.append('role', importRole);
    formData.append('strategy', importStrategy);

    try {
      const response = await apiFetch('/api/users/import-csv', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setImportResult(data.result);
        setCsvFile(null);
        setShowImportForm(false);
        await fetchUsers();
        setError('');
      } else {
        setImportError(data);
        setError('');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في الشبكة.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && users.length === 0) {
    return <Loading label="جارٍ فتح الدليل" />;
  }

  return (
    <div>
      <PageHeader
        title="المستخدمون"
        description="الدليل الذي يقف خلف كل عملية دخول. ابحث وعدّل واستورد وغيّر الرقم الوطني دون مغادرة السجل."
        actions={
          <>
            <button type="button" className="btn" onClick={() => setShowImportForm(true)}>
              <Icon name="upload" size={14} />
              استيراد CSV
            </button>
            <button type="button" className="btn btn--primary" onClick={() => setShowAddForm(true)}>
              <Icon name="plus" size={14} />
              إضافة مستخدم
            </button>
          </>
        }
      />

      {error && (
        <Banner
          tone="error"
          action={
            <button type="button" className="btn btn--sm" onClick={() => setError('')}>
              إغلاق
            </button>
          }
        >
          {error}
        </Banner>
      )}

      {importResult && (
        <Banner
          tone="success"
          action={
            <button type="button" className="btn btn--sm" onClick={() => setImportResult(null)}>
              إغلاق
            </button>
          }
        >
          اكتمل الاستيراد · أُضيف {importResult.added}، وحُدِّث {importResult.updated}، وتُخطّي{' '}
          {importResult.skipped}
          {importResult.errors.length > 0 ? ` · ${importResult.errors.length} خطأ في الصفوف` : ''}
        </Banner>
      )}

      {importError && (
        <Banner
          tone="error"
          action={
            <button type="button" className="btn btn--sm" onClick={() => setImportError(null)}>
              إغلاق
            </button>
          }
        >
          فشل الاستيراد: {importError.error}
          {importError.details ? ` · ${importError.details.suggestion}` : ''}
        </Banner>
      )}

      <div className="users-layout">
        <aside className="register-summary">
          <div className="register-summary__total">{formatNumber(users.length)}</div>
          <div className="register-summary__label">حساب في السجل</div>
          <div className="register-summary__list">
            {Object.entries(roleCounts)
              .filter(([role]) => role !== 'all')
              .sort((a, b) => b[1] - a[1])
              .map(([role, count]) => (
                <div className="register-summary__row" key={role}>
                  <span>{roleLabel(role)}</span>
                  <span className="register-summary__count">{formatNumber(count)}</span>
                </div>
              ))}
          </div>
          <p className="register-summary__note">
            عرض {formatNumber(filteredUsers.length)} من {formatNumber(users.length)} حساب
            {roleFilter !== 'all' ? ` · ${roleLabel(roleFilter)}` : ''}.
          </p>
        </aside>

        <div>
          <div className="toolbar">
            <div className="toolbar__grow">
              <input
                className="input input--search"
                type="search"
                placeholder="ابحث بالاسم أو الرقم الوطني أو المدرسة"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <button type="button" className="btn btn--sm" onClick={fetchUsers} disabled={loading}>
              <Icon name="refresh" size={13} />
              تحديث
            </button>
          </div>

          <RoleFilterChips value={roleFilter} onChange={setRoleFilter} counts={roleCounts} />

          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table className="ledger">
              <thead>
                <tr>
                  <th>الرقم الوطني</th>
                  <th>الاسم</th>
                  <th>النوع</th>
                  <th>المدرسة</th>
                  <th>الهاتف</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((user) => {
                  const isEditing = editingUser === user.nationalNumber;
                  return (
                    <tr key={user.nationalNumber}>
                      <td>
                        {isEditing ? (
                          <input
                            className="input"
                            style={{ minWidth: 130 }}
                            value={editNationalNumber}
                            onChange={(event) => setEditNationalNumber(event.target.value)}
                            title="تغيير هذا يغيّر تسجيل دخول المستخدم"
                          />
                        ) : (
                          <span className="num">{user.nationalNumber}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="input"
                            style={{ minWidth: 150 }}
                            value={user.name}
                            onChange={(event) =>
                              handleFieldChange(user.nationalNumber, 'name', event.target.value)
                            }
                          />
                        ) : (
                          <span className="ledger__name">{user.name}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <select
                            className="select"
                            value={user.role}
                            onChange={(event) =>
                              handleFieldChange(
                                user.nationalNumber,
                                'role',
                                event.target.value as DirectoryUser['role']
                              )
                            }
                          >
                            <option value="parent">ولي أمر</option>
                            <option value="teacher">معلّم</option>
                            <option value="qra-employ">موظف الجمعية</option>
                            <option value="supervisor">مشرف</option>
                            <option value="student">طالب</option>
                            <option value="developer">مطوّر</option>
                            <option value="guest">زائر</option>
                          </select>
                        ) : (
                          <RoleStamp role={user.role} />
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="input"
                            style={{ minWidth: 150 }}
                            value={user.school || ''}
                            onChange={(event) =>
                              handleFieldChange(user.nationalNumber, 'school', event.target.value)
                            }
                          />
                        ) : (
                          <span className="muted">{user.school || '—'}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="input"
                            style={{ minWidth: 110 }}
                            value={user.phone || ''}
                            onChange={(event) =>
                              handleFieldChange(
                                user.nationalNumber,
                                'phone',
                                event.target.value.replace(/\D/g, '').slice(0, 10)
                              )
                            }
                            inputMode="numeric"
                          />
                        ) : (
                          <span className="num">{user.phone || '—'}</span>
                        )}
                      </td>
                      <td>
                        <div className="ledger__actions">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                className="btn btn--sm btn--primary"
                                onClick={() => handleUpdateUser(user)}
                                disabled={loading}
                              >
                                حفظ
                              </button>
                              <button
                                type="button"
                                className="btn btn--sm"
                                onClick={handleCancelEdit}
                                disabled={loading}
                              >
                                إلغاء
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn btn--sm"
                                onClick={() => handleEditClick(user.nationalNumber)}
                              >
                                تعديل
                              </button>
                              <button
                                type="button"
                                className="btn btn--sm"
                                onClick={() => {
                                  setUserToChangeNumber(user);
                                  setNewNationalNumberInput('');
                                  setChangeNumberError('');
                                }}
                              >
                                الرقم
                              </button>
                              <button
                                type="button"
                                className="btn btn--sm btn--danger"
                                onClick={() => setUserToDelete(user)}
                              >
                                حذف
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pageRows.length === 0 && (
              <div className="ledger-empty">
                <EmptyState
                  title="لا توجد حسابات مطابقة"
                  body="جرّب بحثًا آخر أو امسح تصفية النوع."
                  action={
                    <button
                      type="button"
                      className="btn btn--sm"
                      onClick={() => {
                        setSearchTerm('');
                        setRoleFilter('all');
                      }}
                    >
                      مسح التصفية
                    </button>
                  }
                />
              </div>
            )}
          </div>

          {filteredUsers.length > PAGE_SIZE && (
            <div className="pagination">
              <span className="pagination__info">
                صفحة {safePage} من {totalPages} · {formatNumber(filteredUsers.length)} حساب
              </span>
              <div className="pagination__buttons">
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                >
                  <Icon name="chevron-left" size={13} />
                  السابق
                </button>
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                >
                  التالي
                  <Icon name="chevron-right" size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="modal-backdrop" onClick={() => setShowAddForm(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__head">
              <h3>إضافة مستخدم</h3>
              <button type="button" className="modal-close" onClick={() => setShowAddForm(false)} aria-label="إغلاق">
                ×
              </button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="modal-card__body">
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="new-number">الرقم الوطني *</label>
                    <input
                      id="new-number"
                      className="input"
                      value={newUser.nationalNumber}
                      onChange={(event) =>
                        setNewUser({ ...newUser, nationalNumber: event.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="new-name">الاسم *</label>
                    <input
                      id="new-name"
                      className="input"
                      value={newUser.name}
                      onChange={(event) => setNewUser({ ...newUser, name: event.target.value })}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="new-role">النوع *</label>
                    <select
                      id="new-role"
                      className="select"
                      value={newUser.role}
                      onChange={(event) =>
                        setNewUser({
                          ...newUser,
                          role: event.target.value as DirectoryUser['role'],
                        })
                      }
                      required
                    >
                      <option value="parent">ولي أمر</option>
                      <option value="teacher">معلّم</option>
                      <option value="qra-employ">موظف الجمعية</option>
                      <option value="supervisor">مشرف</option>
                      <option value="student">طالب</option>
                      <option value="developer">مطوّر</option>
                      <option value="guest">زائر</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="new-school">المدرسة *</label>
                    <input
                      id="new-school"
                      className="input"
                      value={newUser.school}
                      onChange={(event) => setNewUser({ ...newUser, school: event.target.value })}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="new-phone">الهاتف (10 أرقام)</label>
                    <input
                      id="new-phone"
                      className="input"
                      value={newUser.phone}
                      onChange={(event) =>
                        setNewUser({
                          ...newUser,
                          phone: event.target.value.replace(/\D/g, '').slice(0, 10),
                        })
                      }
                      inputMode="numeric"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="new-directorate">المديرية</label>
                    <input
                      id="new-directorate"
                      className="input"
                      value={newUser.directorate}
                      onChange={(event) =>
                        setNewUser({ ...newUser, directorate: event.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="modal-card__foot">
                <button type="button" className="btn" onClick={() => setShowAddForm(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn--primary" disabled={loading}>
                  {loading ? 'جارٍ الإضافة…' : 'إضافة مستخدم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportForm && (
        <div className="modal-backdrop" onClick={() => setShowImportForm(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__head">
              <h3>استيراد المستخدمين من CSV</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowImportForm(false)}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleImportCSV}>
              <div className="modal-card__body">
                <div className="field" style={{ marginBottom: 13 }}>
                  <label htmlFor="csv-file">ملف CSV *</label>
                  <input
                    id="csv-file"
                    className="input"
                    type="file"
                    accept=".csv"
                    onChange={(event) => setCsvFile(event.target.files?.[0] || null)}
                    required
                  />
                </div>
                <div className="field" style={{ marginBottom: 13 }}>
                  <label htmlFor="import-role">نوع المستخدم *</label>
                  <select
                    id="import-role"
                    className="select"
                    value={importRole}
                    onChange={(event) => setImportRole(event.target.value)}
                  >
                    <option value="parent">أولياء الأمور</option>
                    <option value="teacher">المعلّمون</option>
                    <option value="qra-employ">موظف الجمعية</option>
                  </select>
                </div>
                <div className="field">
                  <label>طريقة الاستيراد *</label>
                  <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <input
                      type="radio"
                      value="add"
                      checked={importStrategy === 'add'}
                      onChange={(event) => setImportStrategy(event.target.value)}
                    />
                    <span style={{ fontSize: 12 }}>إضافة الجديد فقط (تخطّي الموجود)</span>
                  </label>
                  <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <input
                      type="radio"
                      value="upsert"
                      checked={importStrategy === 'upsert'}
                      onChange={(event) => setImportStrategy(event.target.value)}
                    />
                    <span style={{ fontSize: 12 }}>تحديث الموجود وإضافة الجديد</span>
                  </label>
                  <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <input
                      type="radio"
                      value="replace"
                      checked={importStrategy === 'replace'}
                      onChange={(event) => setImportStrategy(event.target.value)}
                    />
                    <span style={{ fontSize: 12 }}>استبدال كل المستخدمين</span>
                  </label>
                </div>
              </div>
              <div className="modal-card__foot">
                <button type="button" className="btn" onClick={() => setShowImportForm(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn--primary" disabled={loading || !csvFile}>
                  {loading ? 'جارٍ الاستيراد…' : 'استيراد CSV'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {userToDelete && (
        <div className="modal-backdrop" onClick={() => setUserToDelete(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__head">
              <h3>حذف المستخدم</h3>
              <button type="button" className="modal-close" onClick={() => setUserToDelete(null)} aria-label="إغلاق">
                ×
              </button>
            </div>
            <div className="modal-card__body">
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                حذف <strong>{userToDelete.name}</strong>؟ سيؤدّي هذا إلى إزالة الحساب من
                الدليل ولا يمكن التراجع عنه.
              </p>
            </div>
            <div className="modal-card__foot">
              <button type="button" className="btn" onClick={() => setUserToDelete(null)}>
                إلغاء
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => handleDeleteUser(userToDelete)}
                disabled={loading}
              >
                {loading ? 'جارٍ الحذف…' : 'حذف المستخدم'}
              </button>
            </div>
          </div>
        </div>
      )}

      {userToChangeNumber && (
        <div className="modal-backdrop" onClick={() => setUserToChangeNumber(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__head">
              <h3>تغيير الرقم الوطني</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setUserToChangeNumber(null)}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>
            <div className="modal-card__body">
              <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.6 }}>
                يؤدّي هذا إلى تغيير تسجيل الدخول لـ <strong>{userToChangeNumber.name}</strong> (حاليًا{' '}
                <span className="num">{userToChangeNumber.nationalNumber}</span>).
              </p>
              <div className="field">
                <label htmlFor="changed-number">الرقم الوطني الجديد</label>
                <input
                  id="changed-number"
                  className="input"
                  value={newNationalNumberInput}
                  onChange={(event) => setNewNationalNumberInput(event.target.value)}
                  autoFocus
                />
              </div>
              {changeNumberError && (
                <div className="banner banner--error" style={{ marginTop: 12, marginBottom: 0 }}>
                  {changeNumberError}
                </div>
              )}
            </div>
            <div className="modal-card__foot">
              <button type="button" className="btn" onClick={() => setUserToChangeNumber(null)}>
                إلغاء
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleChangeNationalNumber}
                disabled={loading}
              >
                {loading ? 'جارٍ الحفظ…' : 'تغيير الرقم'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
