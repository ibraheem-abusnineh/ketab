import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../../utils/api';
import {
  Banner,
  EmptyState,
  Kpi,
  Loading,
  PageHeader,
  formatNumber,
} from '../ui';
import Icon from '../Icons';

interface DataSummary {
  users: number;
  totalVisits: number;
  daysRecorded: number;
  notifications: number;
  pendingRequests: number;
  coursesLocked: number;
  coursesTotal: number;
  adminUsername: string | null;
}

interface AppliedRow {
  entity: string;
  action: string;
  added?: number;
  updated?: number;
  total?: number;
  records?: number;
}

interface ImportResult {
  dryRun: boolean;
  mode: string;
  applied: AppliedRow[];
  skipped: string[];
  warnings: string[];
  validationErrors: string[];
}

const ENTITY_LABELS: Record<string, string> = {
  users: 'Users',
  visits: 'Visits / logins',
  notifications: 'Notifications',
  courses: 'Courses',
  admin: 'Admin credentials',
};

function todayStamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DataPage: React.FC = () => {
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [includeAdmin, setIncludeAdmin] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('');

  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<'replace' | 'merge'>('replace');
  const [busy, setBusy] = useState<'preview' | 'apply' | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/admin/data/summary');
      const data = await response.json();
      setSummary(data.summary);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Could not read the data inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleExport = async () => {
    try {
      setExporting(true);
      setNotice('');
      const response = await apiFetch(
        `/api/admin/data/export${includeAdmin ? '?includeAdmin=1' : ''}`
      );
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data.backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ketab-backup-${todayStamp()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setNotice(
        `Backup downloaded · ${formatNumber(data.backup.counts.users)} users · ` +
          `${formatNumber(data.backup.counts.totalVisits)} logins` +
          (includeAdmin ? ' · admin credentials included' : '')
      );
      setTimeout(() => setNotice(''), 6000);
    } catch (err: any) {
      setError(err.message || 'Could not build the backup.');
    } finally {
      setExporting(false);
    }
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = Array.from(incoming);
    setFiles((current) => [...current, ...next]);
    setResult(null);
    setImportError('');
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, i) => i !== index));
    setResult(null);
  };

  const runImport = async (dryRun: boolean) => {
    if (files.length === 0) {
      setImportError('Choose at least one backup or data file first.');
      return;
    }
    try {
      setBusy(dryRun ? 'preview' : 'apply');
      setImportError('');
      setResult(null);
      const form = new FormData();
      files.forEach((file) => form.append('files', file));
      form.append('mode', mode);
      form.append('dryRun', String(dryRun));
      const response = await apiFetch('/api/admin/data/import', { method: 'POST', body: form });
      const data = await response.json();
      setResult(data as ImportResult);
      if (!dryRun) {
        await fetchSummary();
        setNotice('Data restored from the uploaded files.');
        setTimeout(() => setNotice(''), 6000);
      }
    } catch (err: any) {
      setImportError(err.message || 'Could not import those files.');
    } finally {
      setBusy(null);
    }
  };

  if (loading && !summary) {
    return <Loading label="Reading the data inventory" />;
  }

  return (
    <div>
      <PageHeader
        title="Backup & restore"
        description="The live data files (visits, notifications) are kept out of git on purpose. Download a backup now, and restore it here after a re-clone or a deploy."
        actions={
          <button type="button" className="btn" onClick={fetchSummary} disabled={loading}>
            <Icon name="refresh" size={14} />
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {error && (
        <Banner
          tone="error"
          action={
            <button type="button" className="btn btn--sm" onClick={fetchSummary}>
              Retry
            </button>
          }
        >
          {error}
        </Banner>
      )}

      {notice && <Banner tone="success">{notice}</Banner>}

      <div className="kpi-grid">
        <Kpi
          label="Users in the directory"
          value={formatNumber(summary?.users || 0)}
          hint="Restored from a users.json backup"
        />
        <Kpi
          label="Total logins"
          value={formatNumber(summary?.totalVisits || 0)}
          hint={`${formatNumber(summary?.daysRecorded || 0)} recorded days`}
        />
        <Kpi
          label="Notifications"
          value={formatNumber(summary?.notifications || 0)}
          hint={`${formatNumber(summary?.pendingRequests || 0)} pending requests`}
        />
        <Kpi
          label="Courses locked"
          value={`${formatNumber(summary?.coursesLocked || 0)}/${formatNumber(
            summary?.coursesTotal || 0
          )}`}
          hint={summary?.adminUsername ? `Admin account: ${summary.adminUsername}` : 'No admin account set'}
        />
      </div>

      <div className="data-grid">
        <section className="data-card">
          <header className="data-card__head">
            <div>
              <h3 className="data-card__title">1 · Download a backup</h3>
              <p className="data-card__sub">
                One JSON file with users, visits, notifications, and course locks. Keep it somewhere
                safe before pushing.
              </p>
            </div>
            <Icon name="database" size={22} />
          </header>

          <label className="data-toggle">
            <input
              type="checkbox"
              checked={includeAdmin}
              onChange={(event) => setIncludeAdmin(event.target.checked)}
            />
            <span>
              Include admin credentials <em>(the bcrypt hash from admin.json)</em>
            </span>
          </label>

          {includeAdmin && (
            <p className="data-note">
              Restoring a backup that contains admin credentials replaces the admin password with the
              hash in the file. The default local account is <code>admin / admin123</code>.
            </p>
          )}

          <div className="data-card__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleExport}
              disabled={exporting}
            >
              <Icon name="download" size={14} />
              {exporting ? 'Preparing…' : 'Download backup JSON'}
            </button>
          </div>

          <p className="data-note">
            Prefer the command line? <code>npm run data:export</code> writes SQL seed files to{' '}
            <code>server/data/seeds/</code> (also gitignored), and <code>npm run data:import</code>{' '}
            restores them. The button above downloads a single portable JSON instead.
          </p>
        </section>

        <section className="data-card">
          <header className="data-card__head">
            <div>
              <h3 className="data-card__title">2 · Restore from a backup</h3>
              <p className="data-card__sub">
                Upload a KETAB backup JSON, individual <code>users.json</code> /{' '}
                <code>visits.json</code> files, or legacy <code>seeds/*.sql</code> files.
              </p>
            </div>
            <Icon name="upload" size={22} />
          </header>

          <div
            className="data-drop"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              addFiles(event.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
            }}
          >
            <Icon name="upload" size={20} />
            <strong>Drop files here, or click to choose</strong>
            <span>.json backup or .sql seed files · multiple allowed</span>
            <input
              ref={inputRef}
              className="data-fileinput"
              type="file"
              multiple
              accept=".json,.sql,application/json,text/plain"
              onChange={(event) => {
                addFiles(event.target.files);
                if (inputRef.current) inputRef.current.value = '';
              }}
            />
          </div>

          {files.length > 0 && (
            <ul className="data-filelist">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`}>
                  <span className="data-filelist__name">{file.name}</span>
                  <span className="data-filelist__size">{formatNumber(Math.ceil(file.size / 1024))} KB</span>
                  <button
                    type="button"
                    className="btn btn--sm btn--danger"
                    onClick={() => removeFile(index)}
                    aria-label={`Remove ${file.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="data-options">
            <span className="data-options__label">Mode</span>
            <label className="data-radio">
              <input
                type="radio"
                name="data-mode"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
              />
              <span>
                <strong>Replace</strong> — overwrite each entity with the file
              </span>
            </label>
            <label className="data-radio">
              <input
                type="radio"
                name="data-mode"
                checked={mode === 'merge'}
                onChange={() => setMode('merge')}
              />
              <span>
                <strong>Merge</strong> — add or update users (by national number) and notifications
                (by id)
              </span>
            </label>
          </div>

          <div className="data-card__actions">
            <button
              type="button"
              className="btn"
              onClick={() => runImport(true)}
              disabled={busy !== null || files.length === 0}
            >
              <Icon name="check" size={14} />
              {busy === 'preview' ? 'Checking…' : 'Preview (dry run)'}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => runImport(false)}
              disabled={busy !== null || files.length === 0}
            >
              <Icon name="database" size={14} />
              {busy === 'apply' ? 'Restoring…' : 'Restore now'}
            </button>
          </div>

          {importError && <div className="banner banner--error data-result-banner">{importError}</div>}
        </section>
      </div>

      {result && (
        <section className="data-result">
          <header className="data-card__head">
            <div>
              <h3 className="data-card__title">
                {result.dryRun ? 'Dry run result' : 'Restore result'}
              </h3>
              <p className="data-card__sub">
                Mode: {result.mode} · {result.dryRun ? 'nothing was written' : 'files were written'}
              </p>
            </div>
            <button type="button" className="btn btn--sm" onClick={() => setResult(null)}>
              Dismiss
            </button>
          </header>

          {result.applied.length === 0 ? (
            <EmptyState
              title="Nothing recognized"
              body="The upload did not contain any entity this desk knows how to restore."
            />
          ) : (
            <div className="table-wrap" style={{ border: 0 }}>
              <table className="ledger">
                <thead>
                  <tr>
                    <th>Entity</th>
                    <th>Action</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {result.applied.map((row) => (
                    <tr key={`${row.entity}-${row.action}`}>
                      <td className="ledger__name">{ENTITY_LABELS[row.entity] || row.entity}</td>
                      <td className="muted">{row.action}</td>
                      <td className="num">
                        {row.entity === 'users' && row.added !== undefined
                          ? `${formatNumber(row.added)} added · ${formatNumber(row.updated || 0)} updated · ${formatNumber(row.total || 0)} total`
                          : row.entity === 'notifications' && row.added !== undefined
                          ? `${formatNumber(row.added)} added · ${formatNumber(row.updated || 0)} updated · ${formatNumber(row.total || 0)} total`
                          : row.entity === 'visits'
                          ? `${formatNumber(row.total || 0)} logins · ${formatNumber(row.records || 0)} day records`
                          : `${formatNumber(row.total || 0)} record${(row.total || 0) === 1 ? '' : 's'}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.skipped.length > 0 && (
            <p className="data-note">
              Not present in the upload (left untouched):{' '}
              {result.skipped.map((name) => ENTITY_LABELS[name] || name).join(', ')}.
            </p>
          )}

          {result.warnings.length > 0 && (
            <ul className="data-warnings">
              {result.warnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>{warning}</li>
              ))}
            </ul>
          )}

          {result.validationErrors.length > 0 && (
            <ul className="data-warnings data-warnings--error">
              {result.validationErrors.map((row, index) => (
                <li key={`${row}-${index}`}>{row}</li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};

export default DataPage;
