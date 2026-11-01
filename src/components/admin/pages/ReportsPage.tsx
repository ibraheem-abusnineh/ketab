import React, { useCallback, useEffect, useMemo, useState } from 'react';
import '../report.css';
import { buildQuery, getJson, ReportsSchoolResponse, ReportsUserResponse, TimeResponse, UsersResponse, VisitsResponse } from '../api';
import { DailyPoint } from '../types';
import { Loading } from '../ui';
import { shortDay } from '../charts/chartUtils';

/* ------------------------------------------------------------------ */
/* types + helpers                                                     */
/* ------------------------------------------------------------------ */

interface SchoolReport {
  school: string;
  loginCount: number;
  uniqueUsers: number;
}

interface UserReport {
  nationalNumber: string;
  name: string;
  school: string;
  role?: string;
  loginCount: number;
  lastLogin: string | null;
}

interface DirectoryUser {
  nationalNumber: string;
  name: string;
  role: string;
  school: string;
  phone: string;
  directorate?: string;
}

type Role = 'ex' | 'ad';
type TabId = 'ov' | 'fd' | 'fb' | 'rd' | 'us' | 'lg' | 'dq' | 'ch' | 'rc';

const MAROON = '#8B2F3C';
const YELLOW = '#d9b800';
const DONUT_COLORS = [MAROON, YELLOW, '#c98a93', '#7a6a6d', '#3f6b55', '#3d617e'];

const TAB_LABELS: Record<TabId, string> = {
  ov: 'نظرة عامة',
  fd: 'المدارس',
  fb: 'الملاحظات والاستفسارات',
  rd: 'جاهزية التقارير',
  us: 'المستخدمون',
  lg: 'سجل الدخول',
  dq: 'جودة البيانات',
  ch: 'سجل التعديلات',
  rc: 'مركز التقارير',
};

const TABS: Record<Role, TabId[]> = {
  ex: ['ov', 'fd', 'fb', 'rd'],
  ad: ['us', 'lg', 'dq', 'ch', 'rc'],
};

const ROLE_LABELS: Record<string, string> = {
  parent: 'ولي أمر',
  teacher: 'معلّم',
  supervisor: 'مشرف',
  student: 'طالب',
  developer: 'مطوّر',
  guest: 'زائر',
  'qra-employ': 'موظف الجمعية',
};

const n = (value: number): string => (Number.isFinite(value) ? value.toLocaleString('en-US') : '0');

function toDayString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatArabicDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ar-JO-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatArabicDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ar-JO-u-nu-latn', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Amman',
  });
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ------------------------------------------------------------------ */
/* printable report (full A4 document)                                 */
/* ------------------------------------------------------------------ */

const PRINT_COLORS = [MAROON, '#d9b800', '#3f6b55', '#3d617e', '#b07a83', '#7d6a58', '#8f9c88', '#c2a25e'];

function renderPrintDonut(rows: SchoolReport[]): string {
  const visible = rows.slice(0, 8).filter((row) => row.loginCount > 0);
  const total = visible.reduce((sum, row) => sum + row.loginCount, 0);
  if (total === 0) return '';
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = visible
    .map((row, index) => {
      const fraction = row.loginCount / total;
      const dash = Math.max(fraction * circumference - 1.5, 0);
      const segment = `<circle cx="80" cy="80" r="${radius}" fill="none" stroke="${
        PRINT_COLORS[index % PRINT_COLORS.length]
      }" stroke-width="20" stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(
        2
      )}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 80 80)" />`;
      offset += fraction * circumference;
      return segment;
    })
    .join('');

  return `<svg viewBox="0 0 160 160" width="160" height="160" role="img" aria-label="نسبة المدارس">
    <circle cx="80" cy="80" r="${radius}" fill="none" stroke="#efe6e2" stroke-width="20" />
    ${segments}
    <text x="80" y="77" text-anchor="middle" font-family="Amiri, serif" font-size="20" font-weight="700" fill="#2a1d20">${total.toLocaleString(
      'en-US'
    )}</text>
    <text x="80" y="93" text-anchor="middle" font-family="Tahoma" font-size="9" fill="#7a6a6d">عمليات الدخول</text>
  </svg>`;
}

function renderPrintLine(rows: DailyPoint[], logins: number[]): string {
  if (rows.length === 0) return '';
  const width = 680;
  const height = 150;
  const pad = { top: 12, right: 10, bottom: 22, left: 34 };
  const series = [rows.map((row) => row.count), logins];
  const max = Math.max(...series[0], ...series[1], 1);
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const xFor = (index: number) =>
    pad.left + (rows.length === 1 ? plotWidth / 2 : (index / (rows.length - 1)) * plotWidth);
  const yFor = (value: number) => pad.top + plotHeight - (value / max) * plotHeight;
  const path = (values: number[]) => values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(' ');
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((fraction) => {
      const y = pad.top + plotHeight - fraction * plotHeight;
      return `<line x1="${pad.left}" x2="${width - pad.right}" y1="${y}" y2="${y}" stroke="#efe6e2" stroke-width="1" />`;
    })
    .join('');
  const labelIndexes = [0, Math.floor((rows.length - 1) / 2), rows.length - 1].filter(
    (value, index, array) => array.indexOf(value) === index
  );
  const labels = labelIndexes
    .map(
      (index) =>
        `<text x="${xFor(index)}" y="${height - 6}" text-anchor="${
          index === 0 ? 'start' : index === rows.length - 1 ? 'end' : 'middle'
        }" font-family="Tahoma" font-size="9" fill="#7a6a6d">${shortDay(rows[index].day)}</text>`
    )
    .join('');

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="الدخول اليومي">
    ${grid}
    <polyline points="${path(series[0])}" fill="none" stroke="${MAROON}" stroke-width="2.4" />
    <polyline points="${path(series[1])}" fill="none" stroke="#d9b800" stroke-width="2.4" />
    ${labels}
  </svg>
  <div class="legend-dots">
    <span><i style="background:${MAROON}"></i>مستخدمون نشطون يوميًا</span>
    <span><i style="background:#d9b800"></i>عمليات الدخول</span>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* small presentational pieces (mirror the template's helpers)         */
/* ------------------------------------------------------------------ */

const Badge: React.FC<{ tone: 'ok' | 'wn' | 'er' | 'gr'; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={`bd ${tone}`}>{children}</span>
);

const Kpi: React.FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div className="card k">
    <span>{label}</span>
    <b>{value}</b>
    {hint ? <i>{hint}</i> : null}
  </div>
);

const Bars: React.FC<{ rows: Array<[string, number, string?]>; max?: number; empty?: string }> = ({ rows, max, empty }) => {
  if (rows.length === 0) {
    return <p className="note">{empty || 'لا توجد بيانات في هذه الفترة.'}</p>;
  }
  const peak = max || Math.max(...rows.map((row) => row[1]), 1);
  return (
    <>
      {rows.map((row) => (
        <div className="row" key={row[0]}>
          <span title={row[0]}>{row[0]}</span>
          <div className="tr">
            <div style={{ width: `${Math.max(row[1] > 0 ? 2 : 0, (row[1] / peak) * 100)}%` }} />
          </div>
          <b>{row[2] || n(row[1])}</b>
        </div>
      ))}
    </>
  );
};

const Table: React.FC<{ head: string[]; rows: React.ReactNode[][]; empty?: string }> = ({ head, rows, empty }) => (
  <div className="tw">
    <table>
      <thead>
        <tr>
          {head.map((cell) => (
            <th key={cell}>{cell}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={head.length}>{empty || 'لا توجد بيانات في هذه الفترة.'}</td>
          </tr>
        ) : (
          rows.map((row, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                // eslint-disable-next-line react/no-array-index-key
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

/* two-series line, same shape as the template's `line()` helper */
const DualLine: React.FC<{ a: number[]; b: number[]; labels: string[] }> = ({ a, b, labels }) => {
  if (labels.length === 0) {
    return <p className="note">لا توجد بيانات في هذه الفترة.</p>;
  }
  const W = 520;
  const H = 170;
  const max = Math.max(...a, ...b, 1) * 1.1;
  const points = (series: number[]) =>
    series.map((v, i) => `${30 + (i * (W - 50)) / Math.max(series.length - 1, 1)},${H - 20 - (v / max) * (H - 40)}`).join(' ');
  const labelIndexes = [0, Math.floor((labels.length - 1) / 3), Math.floor((2 * (labels.length - 1)) / 3), labels.length - 1].filter(
    (v, i, arr) => v !== undefined && arr.indexOf(v) === i
  );
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        <polyline fill="none" stroke={MAROON} strokeWidth="3" points={points(b)} />
        <polyline fill="none" stroke="#d9b800" strokeWidth="3" points={points(a)} />
        {labelIndexes.map((index) => (
          <text
            key={index}
            x={30 + (index * (W - 50)) / Math.max(labels.length - 1, 1)}
            y={H - 4}
            fontSize="10"
            textAnchor="middle"
            fill="currentColor"
          >
            {shortDay(labels[index])}
          </text>
        ))}
      </svg>
      <div className="dot">
        <span>
          <i style={{ background: MAROON }} />عمليات الدخول
        </span>
        <span>
          <i style={{ background: '#d9b800' }} />مستخدمون نشطون
        </span>
      </div>
    </>
  );
};

const Donut: React.FC<{ data: Array<[string, number]> }> = ({ data }) => {
  const total = data.reduce((sum, row) => sum + row[1], 0);
  if (total === 0) return <p className="note">لا توجد بيانات في هذه الفترة.</p>;

  // Hide slices smaller than 1% so a 2-of-808 role does not show up as "0%".
  const kept = data.filter((row) => (row[1] / total) * 100 >= 1);
  const hidden = data.length - kept.length;
  const shown = kept.length > 0 ? kept : [data[0]];

  // Largest-remainder rounding so the legend sums to exactly 100%.
  const ringTotal = shown.reduce((sum, row) => sum + row[1], 0);
  const rawShares = shown.map((row) => (row[1] / ringTotal) * 100);
  const percents = rawShares.map((value) => Math.floor(value));
  let remainder = 100 - percents.reduce((sum, value) => sum + value, 0);
  rawShares
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)
    .forEach((entry) => {
      if (remainder > 0) {
        percents[entry.index] += 1;
        remainder -= 1;
      }
    });

  let offset = 0;
  return (
    <>
      <svg viewBox="0 0 42 42" width="170" style={{ display: 'block', margin: 'auto' }}>
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--b)" strokeWidth="6" />
        {shown.map((row, index) => {
          const dash = (row[1] / ringTotal) * 100;
          const segment = (
            <circle
              key={row[0]}
              cx="21"
              cy="21"
              r="15.9"
              fill="none"
              stroke={DONUT_COLORS[index % DONUT_COLORS.length]}
              strokeWidth="6"
              strokeDasharray={`${dash} ${100 - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 21 21)"
            />
          );
          offset += dash;
          return segment;
        })}
      </svg>
      <div className="dot">
        {shown.map((row, index) => (
          <span key={row[0]}>
            <i style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }} />
            {row[0]} {percents[index]}%
          </span>
        ))}
      </div>
      {hidden > 0 && (
        <p className="note" style={{ marginTop: 4 }}>
          {hidden === 1 ? 'مجموعة واحدة أصغر من 1% غير معروضة.' : `${hidden} مجموعات أصغر من 1% غير معروضة.`}
        </p>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

const ReportsPage: React.FC = () => {
  const [role, setRole] = useState<Role>('ex');
  const [tab, setTab] = useState<TabId>('ov');
  const [period, setPeriod] = useState('1');
  const [roleFilter, setRoleFilter] = useState('الكل');

  const [schools, setSchools] = useState<SchoolReport[]>([]);
  const [users, setUsers] = useState<UserReport[]>([]);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [events, setEvents] = useState<VisitsResponse['visits']>([]);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; type: string; userName: string; timestamp: string; status?: string; read: boolean; changes: Array<{ field: string; oldValue: string; newValue: string }> }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const range = useMemo(() => {
    const now = new Date();
    if (period === '1') return {} as { startDate?: string; endDate?: string };
    if (period === 'month') {
      return {
        startDate: toDayString(new Date(now.getFullYear(), now.getMonth(), 1)),
        endDate: toDayString(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    }
    const days = period === '30' ? 30 : period === 'q' ? 90 : 7;
    const start = new Date(now);
    start.setDate(now.getDate() - days);
    return { startDate: toDayString(start), endDate: toDayString(now) };
  }, [period]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const query = buildQuery({ startDate: range.startDate, endDate: range.endDate });
      const [schoolData, userData, timeData, usersData, visitsData, notificationsData] = await Promise.all([
        getJson<ReportsSchoolResponse>(`/api/reports/by-school${query}`),
        getJson<ReportsUserResponse>(`/api/reports/by-user${query}`),
        getJson<TimeResponse>(`/api/stats/by-time${query}`),
        getJson<UsersResponse>('/api/users'),
        getJson<VisitsResponse>(`/api/stats/visits${query}`),
        getJson<{ notifications: typeof notifications }>('/api/admin/notifications'),
      ]);
      setSchools(schoolData.data || []);
      setUsers(userData.data || []);
      setDaily(timeData.data?.daily || []);
      setEvents(visitsData.visits || []);
      setDirectory(usersData.users || []);
      setNotifications(notificationsData.notifications || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'تعذّر بناء التقرير.');
    } finally {
      setLoading(false);
    }
  }, [range.startDate, range.endDate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    setTab(role === 'ex' ? 'ov' : 'us');
  }, [role]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2600);
  };

  /* ---- derived numbers ---- */

  const totalLogins = useMemo(() => schools.reduce((sum, school) => sum + school.loginCount, 0), [schools]);
  const activeUsers = users.length;
  const busiest = useMemo(
    () => (daily.length > 0 ? daily.reduce((best, point) => (point.count > best.count ? point : best), daily[0]) : null),
    [daily]
  );

  const periodFrom = range.startDate || daily[0]?.day;
  const periodTo = range.endDate || daily[daily.length - 1]?.day;

  const loginsByDay = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach((event) => {
      if (!event.timestamp) return;
      const key = event.timestamp.slice(0, 10);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [events]);

  const dayLabels = daily.map((point) => point.day);
  const activeSeries = daily.map((point) => point.count);
  const loginSeries = dayLabels.map((day) => loginsByDay.get(day) || 0);

  const roleRows = useMemo(() => {
    const counts = new Map<string, number>();
    directory.forEach((user) => counts.set(user.role, (counts.get(user.role) || 0) + 1));
    return Array.from(counts.entries())
      .map(([key, value]) => [ROLE_LABELS[key] || key, value] as [string, number])
      .sort((a, b) => b[1] - a[1]);
  }, [directory]);

  const requests = useMemo(() => notifications.filter((item) => item.type === 'profile_edit_request'), [notifications]);
  const updates = useMemo(() => notifications.filter((item) => item.type === 'profile_update'), [notifications]);
  const pendingRequests = requests.filter((item) => (item.status || 'pending') === 'pending');
  const resolvedRequests = requests.filter((item) => item.status && item.status !== 'pending');

  const dataIssues = useMemo(() => {
    const missingPhone = directory.filter((user) => !user.phone || !/^\d{10}$/.test(user.phone)).length;
    const missingSchool = directory.filter((user) => !user.school || user.school === 'Unknown').length;
    const missingDirectorate = directory.filter((user) => !user.directorate).length;
    const weakNumber = directory.filter((user) => !/^\d{6,}$/.test(user.nationalNumber)).length;
    return [
      { label: 'رقم هاتف ناقص أو غير صحيح', count: missingPhone, action: 'قائمة المتأثرين' },
      { label: 'مدرسة ناقصة', count: missingSchool, action: 'قائمة المتأثرين' },
      { label: 'مديرية ناقصة', count: missingDirectorate, action: 'تصدير قائمة' },
      { label: 'رقم وطني غير مكتمل', count: weakNumber, action: 'قائمة المتأثرين' },
    ];
  }, [directory]);

  const inactiveUsers = useMemo(
    () => directory.filter((user) => !users.some((row) => row.nationalNumber === user.nationalNumber)).length,
    [directory, users]
  );

  const filteredUsers = useMemo(
    () => (roleFilter === 'الكل' ? users : users.filter((user) => (ROLE_LABELS[user.role || ''] || user.role) === roleFilter)),
    [users, roleFilter]
  );

  /* ---- exports ---- */

  const csvFor = (name: string, head: string[], rows: Array<Array<string | number>>) => {
    let csv = `${name}\n${head.join(',')}\n`;
    rows.forEach((row) => {
      csv += row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('تم تصدير الملف');
  };

  const exportMain = () =>
    csvFor(
      'تقرير-أصوات-ترى',
      ['المدرسة', 'عمليات الدخول', 'المستخدمون الفريدون'],
      schools.map((school) => [school.school, school.loginCount, school.uniqueUsers])
    );

  const printReport = () => {
    const logoUrl = `${window.location.origin}/admin-logo.png`;
    const generated = new Date().toLocaleString('ar-JO-u-nu-latn', { timeZone: 'Asia/Amman' });
    const maxSchoolValue = schools.length > 0 ? Math.max(...schools.map((row) => row.loginCount)) : 1;
    const schoolRows = schools
      .map((school) => {
        const width = maxSchoolValue > 0 ? (school.loginCount / maxSchoolValue) * 100 : 0;
        return `<tr>
          <td>${escapeHtml(school.school)}</td>
          <td class="num">${n(school.loginCount)}</td>
          <td class="num">${n(school.uniqueUsers)}</td>
          <td class="share"><div class="bar"><span style="width:${width.toFixed(1)}%"></span></div></td>
          <td class="num">${totalLogins > 0 ? Math.round((school.loginCount / totalLogins) * 100) : 0}%</td>
        </tr>`;
      })
      .join('');
    // keep the printed report on a single A4 sheet: top 20 users, fewer when
    // the school table is very long.
    const userLimit = schools.length > 20 ? 12 : schools.length > 12 ? 15 : 20;
    const userRows = users
      .slice(0, userLimit)
      .map(
        (user) => `<tr>
          <td>${escapeHtml(user.name)}</td>
          <td class="num">${escapeHtml(user.nationalNumber)}</td>
          <td>${escapeHtml(user.school)}</td>
          <td>${escapeHtml(ROLE_LABELS[user.role || ''] || user.role || '—')}</td>
          <td class="num">${n(user.loginCount)}</td>
          <td class="num">${escapeHtml(formatArabicDateTime(user.lastLogin))}</td>
        </tr>`
      )
      .join('');
    const legend = schools
      .slice(0, 8)
      .map(
        (school, index) =>
          `<li><span style="background:${PRINT_COLORS[index % PRINT_COLORS.length]}"></span>${escapeHtml(
            school.school
          )} <em>${n(school.loginCount)}</em></li>`
      )
      .join('');
    const from = periodFrom;
    const to = periodTo;

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>أصواتٌ تُرى · تقرير الإدارة · ${from || ''} → ${to || ''}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: 'Amiri', 'Segoe UI', Tahoma, Arial, sans-serif; color: #2a1d20; background: #fff; direction: rtl; font-size: 10.5px; line-height: 1.6; }
  .masthead { border-top: 8px solid #8B2F3C; padding: 12px 0 10px; display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; border-bottom: 1px solid #e6dcd8; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand-logo { width: 46px; height: 46px; object-fit: contain; }
  .brand-name { font-family: 'Amiri', serif; font-size: 22px; font-weight: 700; }
  .brand-sub { font-family: Tahoma; font-size: 9px; color: #7a6a6d; }
  .meta { text-align: left; font-family: Tahoma; font-size: 9px; color: #7a6a6d; line-height: 1.8; }
  h1 { margin: 14px 0 2px; font-family: 'Amiri', serif; font-size: 30px; line-height: 1.2; color: #8B2F3C; }
  .lede { margin: 0 0 14px; font-size: 11px; color: #7a6a6d; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #e6dcd8; margin: 14px 0 18px; }
  .kpi { padding: 10px 12px; border-left: 1px solid #e6dcd8; border-top: 4px solid #F4D000; }
  .kpi:last-child { border-left: 0; }
  .kpi .label { font-family: Tahoma; font-size: 9px; color: #7a6a6d; }
  .kpi .value { margin-top: 3px; font-family: 'Amiri', serif; font-size: 24px; font-weight: 700; color: #8B2F3C; line-height: 1; }
  .section { page-break-inside: avoid; margin-top: 18px; }
  h2 { margin: 0 0 8px; font-family: 'Amiri', serif; font-size: 17px; color: #8B2F3C; border-bottom: 2px solid #F4D000; padding-bottom: 5px; }
  .chart-row { display: grid; grid-template-columns: 1.45fr 1fr; gap: 14px; align-items: start; }
  .chart-row .section { margin-top: 0; }
  .chart-row svg { width: 100%; height: auto; }
  .legend { list-style: none; margin: 6px 0 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 10px; font-size: 8.5px; }
  .legend li { display: flex; align-items: center; gap: 5px; }
  .legend span { width: 8px; height: 8px; display: inline-block; border-radius: 50%; flex: 0 0 auto; }
  .legend em { margin-right: auto; font-style: normal; font-family: Tahoma; color: #7a6a6d; }
  .legend-dots { display: flex; gap: 16px; justify-content: center; font-size: 9.5px; font-family: Tahoma; color: #7a6a6d; margin-top: 4px; }
  .legend-dots i { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-left: 5px; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  th { background: #f6f1ee; color: #8B2F3C; border-bottom: 1px solid #8B2F3C; padding: 4px 6px; text-align: right; font-weight: 700; white-space: nowrap; }
  td { border-bottom: 1px solid #e6dcd8; padding: 4px 6px; vertical-align: middle; }
  tr:nth-child(even) td { background: #fbfaf9; }
  .num { font-family: Tahoma; font-size: 9px; white-space: nowrap; }
  .share { width: 90px; }
  .bar { height: 7px; background: #efe6e2; width: 100%; border-radius: 4px; }
  .bar span { display: block; height: 100%; background: #8B2F3C; border-radius: 4px; }
  .note { margin-top: 6px; font-size: 9px; color: #7a6a6d; }
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #e6dcd8; margin-top: 18px; }
  .summary div { padding: 10px 12px; border-left: 1px solid #e6dcd8; }
  .summary div:last-child { border-left: 0; }
  .summary .label { font-family: Tahoma; font-size: 9px; color: #7a6a6d; }
  .summary .value { margin-top: 3px; font-family: 'Amiri', serif; font-size: 19px; font-weight: 700; color: #8B2F3C; }
  footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 22px; padding-top: 8px; border-top: 1px solid #e6dcd8; font-family: Tahoma; font-size: 9px; color: #7a6a6d; }
  @media print {
    body { padding: 0; }
    .section, .kpis, .summary, table, footer, .chart-row { page-break-inside: avoid; }
    tr, li { page-break-inside: avoid; }
    h1, h2 { page-break-after: avoid; }
    table { font-size: 8.5px; }
    th, td { padding: 3px 5px; }
  }
</style>
</head>
<body>
  <header class="masthead">
    <div class="brand">
      <img class="brand-logo" src="${logoUrl}" alt="">
      <div>
        <div class="brand-name">أصواتٌ تُرى</div>
        <div class="brand-sub">لوحة الإدارة · التقارير</div>
      </div>
    </div>
    <div class="meta">
      <div>الفترة: ${escapeHtml(formatArabicDate(from))} — ${escapeHtml(formatArabicDate(to))}</div>
      <div>أُنشئ في: ${escapeHtml(generated)}</div>
      <div>جمعية جائزة الملكة رانيا العبدالله</div>
    </div>
  </header>

  <h1>تقرير نشاط المنصّة</h1>
  <p class="lede">ملخّص عمليات الدخول والمدارس والمستخدمين خلال الفترة المحددة.</p>

  <section class="kpis">
    <div class="kpi"><div class="label">إجمالي عمليات الدخول</div><div class="value">${n(totalLogins)}</div></div>
    <div class="kpi"><div class="label">المدارس</div><div class="value">${n(schools.length)}</div></div>
    <div class="kpi"><div class="label">المستخدمون النشطون</div><div class="value">${n(activeUsers)}</div></div>
    <div class="kpi"><div class="label">متوسط الدخول اليومي</div><div class="value">${n(daily.length > 0 ? Math.round(totalLogins / daily.length) : 0)}</div></div>
  </section>

  <div class="chart-row">
    <section class="section">
      <h2>الحركة اليومية</h2>
      ${renderPrintLine(daily, loginSeries)}
    </section>
    <section class="section">
      <h2>توزيع الدخول على المدارس</h2>
      ${renderPrintDonut(schools)}
      <ul class="legend">${legend}</ul>
    </section>
  </div>

  <section class="section">
    <h2>عمليات الدخول حسب المدرسة</h2>
    <table id="schools-table">
      <thead>
        <tr><th>المدرسة</th><th>عمليات الدخول</th><th>المستخدمون الفريدون</th><th>الحصة</th><th>النسبة</th></tr>
      </thead>
      <tbody>${schoolRows || '<tr><td colspan="5">لا توجد بيانات في هذه الفترة.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="section">
    <h2>أكثر المستخدمين نشاطًا</h2>
    <table id="users-table">
      <thead>
        <tr><th>الاسم</th><th>الرقم الوطني</th><th>المدرسة</th><th>النوع</th><th>عدد الدخولات</th><th>آخر دخول</th></tr>
      </thead>
      <tbody>${userRows || '<tr><td colspan="6">لا توجد بيانات في هذه الفترة.</td></tr>'}</tbody>
    </table>
    ${users.length > userLimit ? `<div class="note">* عرض أعلى ${userLimit} مستخدمًا من ${users.length} حتى يتناسب التقرير مع صفحة A4.</div>` : ''}
  </section>

  <section class="summary">
    <div><div class="label">إجمالي المدارس</div><div class="value">${n(schools.length)}</div></div>
    <div><div class="label">إجمالي المستخدمين</div><div class="value">${n(activeUsers)}</div></div>
    <div><div class="label">إجمالي عمليات الدخول</div><div class="value">${n(totalLogins)}</div></div>
  </section>

  <footer>
    <span>أصواتٌ تُرى · منصّة تعليمية للصم وضعاف السمع</span>
    <span>${escapeHtml(formatArabicDate(from))} — ${escapeHtml(formatArabicDate(to))}</span>
  </footer>

  <script>
    (function () {
      // Guarantee a single A4 sheet: if the document is taller than the
      // printable area, hide table rows from the bottom (users first, then
      // schools) while keeping a sensible floor.
      var usable = Math.round(((297 - 24) / 25.4) * 96);
      function fit(id, floor) {
        var table = document.getElementById(id);
        if (!table || !table.tBodies[0]) return;
        var rows = table.tBodies[0].rows;
        var index = rows.length - 1;
        while (document.body.scrollHeight > usable && index >= floor) {
          rows[index].style.display = 'none';
          index -= 1;
        }
      }
      window.addEventListener('load', function () {
        fit('users-table', 5);
        fit('schools-table', 3);
      });
      setTimeout(function () {
        fit('users-table', 5);
        fit('schools-table', 3);
      }, 60);
    })();
  </script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) {
      showToast('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  /* ---- views ---- */

  const maxSchool = schools.length > 0 ? Math.max(...schools.map((row) => row.loginCount)) : 1;

  const viewOverview = (
    <>
      <div className="grid">
        <Kpi label="إجمالي عمليات الدخول" value={n(totalLogins)} hint="خلال الفترة المحددة" />
        <Kpi label="المستخدمون النشطون" value={n(activeUsers)} hint={busiest ? `ذروة النشاط: ${n(busiest.count)}` : ''} />
        <Kpi label="المدارس" value={n(schools.length)} hint={schools[0] ? `الأعلى: ${schools[0].school}` : ''} />
        <Kpi
          label="متوسط الدخول اليومي"
          value={n(daily.length > 0 ? Math.round(totalLogins / daily.length) : 0)}
          hint={`عدد الأيام: ${n(daily.length)}`}
        />
        <Kpi label="حسابات الدليل" value={n(directory.length)} hint="كل الأنواع" />
        <Kpi label="طلبات بانتظار الرد" value={n(pendingRequests.length)} hint={`${n(resolvedRequests.length)} محسومة`} />
        <Kpi label="تحديثات الملف" value={n(updates.length)} hint="مسجّلة في الإشعارات" />
        <Kpi
          label="غير نشطين خلال الفترة"
          value={n(inactiveUsers)}
          hint={`من ${n(directory.length)} حسابًا`}
        />
      </div>
      <div className="grid g2" style={{ marginTop: 12 }}>
        <div className="card">
          <h3>الدخول والمستخدمون النشطون</h3>
          <DualLine a={loginSeries} b={activeSeries} labels={dayLabels} />
        </div>
        <div className="card">
          <h3>المستخدمون حسب النوع</h3>
          <Donut data={roleRows.slice(0, 6)} />
        </div>
        <div className="card">
          <h3>المدارس الأكثر نشاطًا</h3>
          <Bars
            rows={schools.slice(0, 6).map((school) => [school.school || 'غير معروف', school.loginCount] as [string, number])}
            max={maxSchool}
          />
        </div>
        <div className="card">
          <h3>رحلة الاستخدام</h3>
          <Bars
            rows={[
              ['عمليات الدخول', totalLogins],
              ['مستخدمون نشطون', activeUsers],
              ['مدارس', schools.length],
              ['أيام نشطة', daily.length],
            ]}
            max={Math.max(totalLogins, 1)}
          />
        </div>
      </div>
    </>
  );

  const viewSchools = (
    <>
      <div className="card">
        <h3>عمليات الدخول حسب المدرسة</h3>
        <Table
          head={['المدرسة', 'المستخدمون الفريدون', 'عمليات الدخول', 'الحصة', 'النسبة']}
          rows={schools.map((school) => [
            school.school,
            n(school.uniqueUsers),
            n(school.loginCount),
            <Badge key="b" tone="ok">
              {totalLogins > 0 ? Math.round((school.loginCount / totalLogins) * 100) : 0}%
            </Badge>,
            n(school.loginCount) === n(maxSchool) ? <Badge key="t" tone="wn">الأعلى</Badge> : '—',
          ])}
        />
      </div>
      <div className="grid g2" style={{ marginTop: 12 }}>
        <div className="card">
          <h3>الأكثر استخدامًا</h3>
          <Bars
            rows={schools.slice(0, 5).map((school) => [school.school || 'غير معروف', school.loginCount] as [string, number])}
            max={maxSchool}
          />
        </div>
        <div className="card">
          <h3>الأقل استخدامًا</h3>
          <Bars
            rows={[...schools]
              .slice(-5)
              .map((school) => [school.school || 'غير معروف', school.loginCount] as [string, number])}
            max={maxSchool}
          />
        </div>
      </div>
    </>
  );

  const viewFeedback = (
    <>
      <div className="grid">
        <Kpi label="إجمالي الطلبات والتحديثات" value={n(notifications.length)} />
        <Kpi label="بانتظار الرد" value={n(pendingRequests.length)} hint="بحاجة لمتابعة" />
        <Kpi label="تمت المعالجة" value={n(resolvedRequests.length)} hint="موافقة أو رفض" />
        <Kpi label="تحديثات ملف مسجّلة" value={n(updates.length)} />
      </div>
      <div className="grid g2" style={{ marginTop: 12 }}>
        <div className="card">
          <h3>حالة الطلبات</h3>
          <Bars
            rows={[
              ['بانتظار الرد', pendingRequests.length],
              ['تمت الموافقة', requests.filter((item) => item.status === 'approved').length],
              ['مرفوضة', requests.filter((item) => item.status === 'rejected').length],
            ]}
            max={Math.max(pendingRequests.length, 1)}
          />
        </div>
        <div className="card">
          <h3>التحديثات حسب النوع</h3>
          <Bars
            rows={[
              ['تحديثات ملف', updates.length],
              ['طلبات تعديل', requests.length],
            ]}
            max={Math.max(updates.length, 1)}
          />
        </div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <h3>أحدث الطلبات</h3>
        <Table
          head={['المستخدم', 'النوع', 'الحالة', 'التاريخ']}
          rows={notifications.slice(0, 8).map((item) => [
            item.userName,
            item.type === 'profile_edit_request' ? 'طلب تعديل ملف' : 'تحديث ملف',
            item.type === 'profile_edit_request' ? (
              <Badge key="s" tone={(item.status || 'pending') === 'pending' ? 'wn' : item.status === 'approved' ? 'ok' : 'er'}>
                {(item.status || 'pending') === 'pending' ? 'بانتظار' : item.status === 'approved' ? 'موافقة' : 'رفض'}
              </Badge>
            ) : (
              <Badge key="s" tone="ok">
                تحديث
              </Badge>
            ),
            formatArabicDateTime(item.timestamp),
          ])}
        />
      </div>
    </>
  );

  const viewReadiness = (
    <>
      <div className="card">
        <h3>جاهزية التقارير حسب البيانات المتوفرة</h3>
        <Table
          head={['التقرير', 'الحالة', 'ملاحظة']}
          rows={[
            ['المستخدمون والتسجيل', <Badge key="1" tone="ok">متاح</Badge>, 'من دليل المستخدمين الحالي'],
            ['سجل الدخول (وقت واحد لكل عملية)', <Badge key="2" tone="ok">متاح</Badge>, 'من مجموع الزيارات اليومي'],
            ['الطلبات والاستفسارات', <Badge key="3" tone="ok">متاح</Badge>, 'من صندوق الإشعارات'],
            ['تعديلات بيانات المستخدم', <Badge key="4" tone="wn">متاح جزئيًا</Badge>, 'يحتاج سجل قديم/جديد كاملًا'],
            ['استخدام كل محتوى لكل مستخدم', <Badge key="5" tone="er">يحتاج تطوير</Badge>, 'يحتاج تتبّعًا لكل عنصر محتوى'],
            ['تقييم الفيديوهات ★', <Badge key="6" tone="er">يحتاج تطوير</Badge>, 'يحتاج تفعيل التقييم'],
            ['الدخول بإيميل موثّق', <Badge key="7" tone="er">يحتاج تطوير</Badge>, 'لا يؤثر على بقية التقارير'],
          ]}
        />
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <h3>أولويات التطوير</h3>
        <Table
          head={['#', 'البند', 'الأولوية', 'الحالة']}
          rows={[
            ['1', 'تتبّع الاستخدام لكل محتوى', '1', <Badge key="a" tone="er">لم تتم</Badge>],
            ['2', 'تقييم نجوم لكل فيديو', '1', <Badge key="b" tone="er">لم تتم</Badge>],
            ['3', 'شعارات الجهات الشريكة', '2', <Badge key="c" tone="er">لم تتم</Badge>],
            ['4', 'حسابات الأطفال لولي الأمر', '2', <Badge key="d" tone="wn">قيد الدراسة</Badge>],
            ['5', 'تعديل الرقم الوطني من الأدمن', '1', <Badge key="e" tone="ok">تمت</Badge>],
            ['6', 'ترتيب المحتوى بأقسام', '1', <Badge key="f" tone="ok">تمت</Badge>],
          ]}
        />
      </div>
    </>
  );

  const viewUsers = (
    <>
      <div className="grid">
        <Kpi label="مستخدمو الدليل" value={n(directory.length)} />
        <Kpi label="نشطون خلال الفترة" value={n(activeUsers)} hint={`${directory.length > 0 ? Math.round((activeUsers / directory.length) * 100) : 0}% من الدليل`} />
        <Kpi label="غير نشطين" value={n(inactiveUsers)} hint="بلا دخول في الفترة" />
        <Kpi label="متوسط الدخول لكل مستخدم" value={n(activeUsers > 0 ? Math.round(totalLogins / activeUsers) : 0)} />
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <h3>المستخدمون النشطون</h3>
        <div className="sn">
          {['الكل', 'معلم', 'ولي أمر', 'طالب', 'مشرف'].map((label) => (
            <button
              type="button"
              key={label}
              className={roleFilter === label ? 'on' : ''}
              onClick={() => setRoleFilter(label)}
            >
              {label}
            </button>
          ))}
        </div>
        <Table
          head={['#', 'الاسم', 'النوع', 'المدرسة', 'عدد الدخولات', 'آخر دخول']}
          rows={filteredUsers.slice(0, 60).map((user, index) => [
            n(index + 1),
            user.name,
            <Badge key="r" tone="gr">
              {ROLE_LABELS[user.role || ''] || user.role || '—'}
            </Badge>,
            user.school || '—',
            n(user.loginCount),
            formatArabicDateTime(user.lastLogin),
          ])}
        />
        <p className="note">تُعرض أول 60 صفًا · يمكن تصدير القائمة كاملة من مركز التقارير.</p>
      </div>
    </>
  );

  const viewLogins = (
    <>
      <div className="grid">
        <Kpi label="عمليات الدخول" value={n(totalLogins)} />
        <Kpi label="أيام فيها نشاط" value={n(daily.length)} />
        <Kpi label="أعلى يوم" value={n(busiest ? busiest.count : 0)} hint={busiest ? formatArabicDate(busiest.day) : ''} />
        <Kpi
          label="متوسط الدخول اليومي"
          value={n(daily.length > 0 ? Math.round(totalLogins / daily.length) : 0)}
        />
      </div>
      <div className="grid g2" style={{ marginTop: 12 }}>
        <div className="card">
          <h3>الدخول حسب اليوم</h3>
          <DualLine a={loginSeries} b={activeSeries} labels={dayLabels} />
        </div>
        <div className="card">
          <h3>عمليات الدخول الأخيرة</h3>
          <Table
            head={['المستخدم', 'المدرسة', 'الوقت']}
            rows={[...events]
              .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
              .slice(0, 12)
              .map((event) => [
                event.name || 'غير معروف',
                event.school || '—',
                formatArabicDateTime(event.timestamp),
              ])}
          />
        </div>
      </div>
    </>
  );

  const viewDataQuality = (
    <div className="card">
      <h3>مشاكل البيانات</h3>
      <Table
        head={['نوع المشكلة', 'السجلات', 'النسبة', 'إجراء']}
        rows={[
          ...dataIssues.map((issue) => [
            issue.label,
            n(issue.count),
            `${directory.length > 0 ? Math.round((issue.count / directory.length) * 100) : 0}%`,
            <button
              key={issue.label}
              type="button"
              className="btn"
              onClick={() => csvFor('قائمة-المتأثرين', ['النوع', 'العدد'], [[issue.label, issue.count]])}
            >
              {issue.action}
            </button>,
          ]),
          ['غير نشطين خلال الفترة', n(inactiveUsers), `${directory.length > 0 ? Math.round((inactiveUsers / directory.length) * 100) : 0}%`, '—'],
        ]}
      />
      <p className="note">تُحسب المشاكل من دليل المستخدمين الحالي مباشرةً.</p>
    </div>
  );

  const viewChangelog = (
    <div className="card">
      <h3>سجل تعديلات بيانات المستخدمين</h3>
      <Table
        head={['المستخدم', 'الحقل', 'القديمة', 'الجديدة', 'الحالة', 'التاريخ']}
        rows={notifications.slice(0, 20).flatMap((item) =>
          item.changes.slice(0, 1).map((change) => [
            item.userName,
            ROLE_LABELS[change.field] || change.field,
            change.oldValue || '—',
            change.newValue || '—',
            item.type === 'profile_edit_request' ? (
              <Badge key="s" tone={(item.status || 'pending') === 'pending' ? 'wn' : item.status === 'approved' ? 'ok' : 'er'}>
                {(item.status || 'pending') === 'pending' ? 'بانتظار' : item.status === 'approved' ? 'موافقة' : 'رفض'}
              </Badge>
            ) : (
              <Badge key="s" tone="gr">مسجّل</Badge>
            ),
            formatArabicDateTime(item.timestamp),
          ])
        )}
      />
      <p className="note">لا تُحذف القيم القديمة نهائيًا.</p>
    </div>
  );

  const viewReportCenter = (
    <div className="card">
      <h3>مركز التقارير</h3>
      <Table
        head={['التقرير', 'التصدير']}
        rows={[
          ['تقرير تنفيذي للإدارة العليا', <button key="1" type="button" className="btn" onClick={printReport}>PDF</button>],
          ['الدخول والمستخدمون النشطون', <button key="2" type="button" className="btn" onClick={() => csvFor('الدخول', ['اليوم', 'عمليات الدخول', 'مستخدمون نشطون'], dayLabels.map((day, i) => [day, loginSeries[i], activeSeries[i]]))}>CSV</button>],
          ['المستخدمون حسب النوع', <button key="3" type="button" className="btn" onClick={() => csvFor('المستخدمون-حسب-النوع', ['النوع', 'العدد'], roleRows)}>CSV</button>],
          ['المدارس وعدد الدخولات', <button key="4" type="button" className="btn" onClick={exportMain}>CSV</button>],
          ['المستخدمون النشطون', <button key="5" type="button" className="btn" onClick={() => csvFor('المستخدمون-النشطون', ['الاسم', 'المدرسة', 'عدد الدخولات'], users.map((user) => [user.name, user.school, user.loginCount]))}>CSV</button>],
          ['الطلبات والاستفسارات', <button key="6" type="button" className="btn" onClick={() => csvFor('الطلبات', ['المستخدم', 'النوع', 'الحالة', 'التاريخ'], notifications.map((item) => [item.userName, item.type, item.status || '—', item.timestamp]))}>CSV</button>],
          ['جودة البيانات', <button key="7" type="button" className="btn" onClick={() => csvFor('جودة-البيانات', ['المشكلة', 'العدد'], dataIssues.map((issue) => [issue.label, issue.count]))}>CSV</button>],
        ]}
      />
      <p className="note">كل تقرير متاح للتصدير بصيغة CSV، وتقرير الإدارة العليا متاح للطباعة PDF.</p>
    </div>
  );

  const views: Record<TabId, React.ReactNode> = {
    ov: viewOverview,
    fd: viewSchools,
    fb: viewFeedback,
    rd: viewReadiness,
    us: viewUsers,
    lg: viewLogins,
    dq: viewDataQuality,
    ch: viewChangelog,
    rc: viewReportCenter,
  };

  if (loading && schools.length === 0 && daily.length === 0) {
    return <Loading label="جارٍ بناء التقرير" />;
  }

  return (
    <div className="rt" dir="rtl" data-theme="light">
      <header>
        <div>
          <h1>أصواتٌ تُرى — لوحة التقارير</h1>
          <small>جمعية جائزة الملكة رانيا العبدالله</small>
        </div>
        <div className="seg" id="role">
          <button type="button" className={role === 'ex' ? 'on' : ''} onClick={() => setRole('ex')}>
            الإدارة العليا
          </button>
          <button type="button" className={role === 'ad' ? 'on' : ''} onClick={() => setRole('ad')}>
            الأدمن
          </button>
        </div>
      </header>

      <div className="demo">
        الفترة المعروضة: {periodFrom && periodTo ? `${formatArabicDate(periodFrom)} — ${formatArabicDate(periodTo)}` : 'كل الفترات'} · {n(totalLogins)} عملية دخول
      </div>

      <div className="tabs" id="tabs">
        {TABS[role].map((id) => (
          <button type="button" key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            {TAB_LABELS[id]}
          </button>
        ))}
      </div>

      <main>
        <div className="bar">
          <label>الفترة:</label>
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="1">كل الفترات</option>
            <option value="month">هذا الشهر</option>
            <option value="30">آخر 30 يومًا</option>
            <option value="7">آخر 7 أيام</option>
          </select>
          <label>نوع المستخدم:</label>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option>الكل</option>
            <option>معلّم</option>
            <option>ولي أمر</option>
            <option>طالب</option>
            <option>مشرف</option>
          </select>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn" onClick={exportMain} disabled={totalLogins === 0}>
            Excel
          </button>
          <button type="button" className="btn" onClick={printReport} disabled={totalLogins === 0}>
            PDF
          </button>
          <button type="button" className="btn" onClick={exportMain} disabled={totalLogins === 0}>
            CSV
          </button>
        </div>

        {error && (
          <div className="note" style={{ color: 'var(--er)' }}>
            {error}
          </div>
        )}

        <div id="v">{views[tab]}</div>
      </main>

      {toast && <div id="toast" className="s">{toast}</div>}
    </div>
  );
};

export default ReportsPage;
