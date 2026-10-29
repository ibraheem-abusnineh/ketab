import React, { ReactNode } from 'react';

export const formatNumber = (value: number): string =>
  Number.isFinite(value) ? value.toLocaleString('en-US') : '0';

export const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Amman',
  });
};

export const formatDateTime = (value: string | Date | null | undefined): string => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Amman',
  });
};

export const formatTime = (value: string | Date | null | undefined): string => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Amman',
  });
};

export const todayKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const roleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    parent: 'Parent',
    teacher: 'Teacher',
    supervisor: 'Supervisor',
    student: 'Student',
    developer: 'Developer',
    guest: 'Guest',
    'qra-employ': 'QRA employ',
  };
  return labels[role] || role;
};

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => (
  <header className="page-head">
    <div>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
    {actions && <div className="page-head__actions">{actions}</div>}
  </header>
);

export interface KpiProps {
  label: string;
  value: ReactNode;
  hint?: string;
  spark?: ReactNode;
}

export const Kpi: React.FC<KpiProps> = ({ label, value, hint, spark }) => (
  <div className="kpi">
    <div className="kpi__label">{label}</div>
    <div className="kpi__value">{value}</div>
    {hint && <div className="kpi__hint">{hint}</div>}
    {spark && <div className="kpi__spark">{spark}</div>}
  </div>
);

export interface EmptyStateProps {
  title: string;
  body?: string;
  action?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, body, action }) => (
  <div className="empty">
    <strong>{title}</strong>
    {body && <span>{body}</span>}
    {action && <div className="empty__action">{action}</div>}
  </div>
);

export const Loading: React.FC<{ label?: string }> = ({ label = 'Reading the register' }) => (
  <div className="loading" role="status" aria-live="polite">
    <span className="loading__bar" />
    <span>{label}…</span>
  </div>
);

export const Banner: React.FC<{
  tone?: 'error' | 'success' | 'info';
  children: ReactNode;
  action?: ReactNode;
}> = ({ tone = 'info', children, action }) => (
  <div className={`banner banner--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
    <span>{children}</span>
    {action}
  </div>
);

export const StatusStamp: React.FC<{ status: string }> = ({ status }) => (
  <span className={`status status--${status}`}>{status}</span>
);

export const RoleStamp: React.FC<{ role: string }> = ({ role }) => (
  <span className={`stamp stamp--${role.replace(/[^a-z-]/g, '')}`}>{roleLabel(role)}</span>
);

export const RoleFilterChips: React.FC<{
  value: string;
  onChange: (value: string) => void;
  counts?: Record<string, number>;
  roles?: string[];
}> = ({ value, onChange, counts, roles }) => {
  const list = roles || [
    'all',
    'parent',
    'teacher',
    'qra-employ',
    'supervisor',
    'student',
    'developer',
    'guest',
  ];
  return (
    <div className="chip-row" role="group" aria-label="Filter by role">
      {list.map((role) => (
        <button
          type="button"
          key={role}
          className={`chip ${value === role ? 'active' : ''}`}
          onClick={() => onChange(role)}
        >
          {role === 'all' ? 'All roles' : roleLabel(role)}
          {counts && counts[role] !== undefined && (
            <span className="chip__count">{counts[role]}</span>
          )}
        </button>
      ))}
    </div>
  );
};
