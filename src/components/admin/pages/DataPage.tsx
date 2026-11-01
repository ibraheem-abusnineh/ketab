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
  users: 'المستخدمون',
  visits: 'الزيارات / الدخولات',
  notifications: 'الإشعارات',
  courses: 'المقررات',
  admin: 'بيانات مدير النظام',
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
      setError(err.message || 'تعذّرت قراءة جرد البيانات.');
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
        `تم تنزيل النسخة الاحتياطية · المستخدمون: ${formatNumber(data.backup.counts.users)} · ` +
          `عمليات الدخول: ${formatNumber(data.backup.counts.totalVisits)}` +
          (includeAdmin ? ' · بيانات مدير النظام مشمولة' : '')
      );
      setTimeout(() => setNotice(''), 6000);
    } catch (err: any) {
      setError(err.message || 'تعذّر إنشاء النسخة الاحتياطية.');
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
      setImportError('اختر ملف نسخة احتياطية أو ملف بيانات واحدًا على الأقل أولًا.');
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
        setNotice('تمت استعادة البيانات من الملفات المرفوعة.');
        setTimeout(() => setNotice(''), 6000);
      }
    } catch (err: any) {
      setImportError(err.message || 'تعذّر استيراد تلك الملفات.');
    } finally {
      setBusy(null);
    }
  };

  if (loading && !summary) {
    return <Loading label="جارٍ قراءة جرد البيانات" />;
  }

  return (
    <div>
      <PageHeader
        title="النسخ الاحتياطي والاستعادة"
        description="تُستثنى ملفات البيانات الحية (الزيارات والإشعارات) من git عن قصد. نزّل نسخة احتياطية الآن، واستعدها هنا بعد إعادة الاستنساخ أو النشر."
        actions={
          <button type="button" className="btn" onClick={fetchSummary} disabled={loading}>
            <Icon name="refresh" size={14} />
            {loading ? 'جارٍ التحديث…' : 'تحديث'}
          </button>
        }
      />

      {error && (
        <Banner
          tone="error"
          action={
            <button type="button" className="btn btn--sm" onClick={fetchSummary}>
              إعادة المحاولة
            </button>
          }
        >
          {error}
        </Banner>
      )}

      {notice && <Banner tone="success">{notice}</Banner>}

      <div className="kpi-grid">
        <Kpi
          label="المستخدمون في الدليل"
          value={formatNumber(summary?.users || 0)}
          hint="مُستعادة من نسخة users.json احتياطية"
        />
        <Kpi
          label="إجمالي عمليات الدخول"
          value={formatNumber(summary?.totalVisits || 0)}
          hint={`${formatNumber(summary?.daysRecorded || 0)} يومًا مسجّلًا`}
        />
        <Kpi
          label="الإشعارات"
          value={formatNumber(summary?.notifications || 0)}
          hint={`${formatNumber(summary?.pendingRequests || 0)} طلبات قيد الانتظار`}
        />
        <Kpi
          label="مقررات مغلقة"
          value={`${formatNumber(summary?.coursesLocked || 0)}/${formatNumber(
            summary?.coursesTotal || 0
          )}`}
          hint={summary?.adminUsername ? `حساب المدير: ${summary.adminUsername}` : 'لم يُضبط حساب مدير'}
        />
      </div>

      <div className="data-grid">
        <section className="data-card">
          <header className="data-card__head">
            <div>
              <h3 className="data-card__title">1 · تنزيل نسخة احتياطية</h3>
              <p className="data-card__sub">
                ملف JSON واحد يضم المستخدمين والزيارات والإشعارات وأقفال المقررات. احتفظ به في مكان
                آمن قبل الدفع.
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
              تضمين بيانات مدير النظام <em>(تجزئة bcrypt من admin.json)</em>
            </span>
          </label>

          {includeAdmin && (
            <p className="data-note">
              استعادة نسخة احتياطية تحتوي على بيانات مدير النظام تستبدل كلمة مرور المدير بالتجزئة
              الموجودة في الملف. الحساب الافتراضي المحلي هو <code>admin / admin123</code>.
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
              {exporting ? 'جارٍ التحضير…' : 'تنزيل نسخة JSON احتياطية'}
            </button>
          </div>

          <p className="data-note">
            تفضّل سطر الأوامر؟ يكتب <code>npm run data:export</code> ملفات SQL الأولية في{' '}
            <code>server/data/seeds/</code> (مستثناة من git أيضًا)، ويعيد <code>npm run data:import</code>{' '}
            استعادتها. أما الزر أعلاه فينزّل ملف JSON محمولًا واحدًا بدلًا من ذلك.
          </p>
        </section>

        <section className="data-card">
          <header className="data-card__head">
            <div>
              <h3 className="data-card__title">2 · الاستعادة من نسخة احتياطية</h3>
              <p className="data-card__sub">
                ارفع نسخة احتياطية JSON من KETAB، أو ملفات <code>users.json</code> /{' '}
                <code>visits.json</code> منفردة، أو ملفات <code>seeds/*.sql</code> القديمة.
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
            <strong>أفلِت الملفات هنا أو انقر للاختيار</strong>
            <span>ملف نسخة احتياطية .json أو ملفات SQL أولية .sql · يُسمح بعدة ملفات</span>
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
                    aria-label={`إزالة ${file.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="data-options">
            <span className="data-options__label">النمط</span>
            <label className="data-radio">
              <input
                type="radio"
                name="data-mode"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
              />
              <span>
                <strong>استبدال</strong> — استبدال كل كيان بالملف
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
                <strong>دمج</strong> — إضافة أو تحديث المستخدمين (حسب الرقم الوطني) والإشعارات
                (حسب المعرّف)
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
              {busy === 'preview' ? 'جارٍ الفحص…' : 'معاينة (بدون كتابة)'}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => runImport(false)}
              disabled={busy !== null || files.length === 0}
            >
              <Icon name="database" size={14} />
              {busy === 'apply' ? 'جارٍ الاستعادة…' : 'استعادة الآن'}
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
                {result.dryRun ? 'نتيجة المعاينة' : 'نتيجة الاستعادة'}
              </h3>
              <p className="data-card__sub">
                النمط: {result.mode} · {result.dryRun ? 'لم تتم أي كتابة' : 'تمت كتابة الملفات'}
              </p>
            </div>
            <button type="button" className="btn btn--sm" onClick={() => setResult(null)}>
              إغلاق
            </button>
          </header>

          {result.applied.length === 0 ? (
            <EmptyState
              title="لا شيء معروف"
              body="لم يحتوي الملف المرفوع على أي كيان يعرف هذا القسم كيفية استعادته."
            />
          ) : (
            <div className="table-wrap" style={{ border: 0 }}>
              <table className="ledger">
                <thead>
                  <tr>
                    <th>الكيان</th>
                    <th>الإجراء</th>
                    <th>النتيجة</th>
                  </tr>
                </thead>
                <tbody>
                  {result.applied.map((row) => (
                    <tr key={`${row.entity}-${row.action}`}>
                      <td className="ledger__name">{ENTITY_LABELS[row.entity] || row.entity}</td>
                      <td className="muted">{row.action}</td>
                      <td className="num">
                        {row.entity === 'users' && row.added !== undefined
                          ? `أُضيف: ${formatNumber(row.added)} · حُدّث: ${formatNumber(row.updated || 0)} · الإجمالي: ${formatNumber(row.total || 0)}`
                          : row.entity === 'notifications' && row.added !== undefined
                          ? `أُضيف: ${formatNumber(row.added)} · حُدّث: ${formatNumber(row.updated || 0)} · الإجمالي: ${formatNumber(row.total || 0)}`
                          : row.entity === 'visits'
                          ? `عمليات الدخول: ${formatNumber(row.total || 0)} · سجلات يومية: ${formatNumber(row.records || 0)}`
                          : `${formatNumber(row.total || 0)} سجلات`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.skipped.length > 0 && (
            <p className="data-note">
              غير موجود في الملفات المرفوعة (بقي دون تغيير):{' '}
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
