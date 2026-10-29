import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { buildQuery, getJson, ReportsSchoolResponse, ReportsUserResponse, TimeResponse } from '../api';
import { DailyPoint, HourlyPoint } from '../types';
import {
  Banner,
  Kpi,
  Loading,
  PageHeader,
  formatDate,
  formatDateTime,
  formatNumber,
} from '../ui';
import ChartFrame from '../charts/ChartFrame';
import LineChart from '../charts/LineChart';
import ColumnChart from '../charts/ColumnChart';
import BarChart from '../charts/BarChart';
import DonutChart from '../charts/DonutChart';
import { shortDay } from '../charts/chartUtils';
import Icon from '../Icons';

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

function toDayString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: toDayString(start), endDate: toDayString(end) };
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

function fullDay(hourly: HourlyPoint[]): Array<{ label: string; value: number }> {
  const counts = new Map<number, number>();
  hourly.forEach((point) => counts.set(point.hour, point.count));
  return Array.from({ length: 24 }, (_, hour) => ({
    label: `${hour}`.padStart(2, '0'),
    value: counts.get(hour) || 0,
  }));
}

const PRINT_COLORS = ['#84333c', '#a67c2e', '#3f6b55', '#3d617e', '#b07a83', '#7d6a58', '#8f9c88', '#c2a25e'];

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

  return `<svg viewBox="0 0 160 160" width="160" height="160" role="img" aria-label="School share">
    <circle cx="80" cy="80" r="${radius}" fill="none" stroke="#eee8e0" stroke-width="20" />
    ${segments}
    <text x="80" y="77" text-anchor="middle" font-family="Amiri, serif" font-size="20" font-weight="700" fill="#1b1b1b">${total.toLocaleString(
      'en-US'
    )}</text>
    <text x="80" y="92" text-anchor="middle" font-family="monospace" font-size="8" fill="#6c7772">تسجيل</text>
  </svg>`;
}

function renderPrintLine(rows: DailyPoint[]): string {
  if (rows.length === 0) return '';
  const width = 680;
  const height = 170;
  const pad = { top: 12, right: 10, bottom: 24, left: 34 };
  const max = Math.max(...rows.map((row) => row.count), 1);
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const xFor = (index: number) =>
    pad.left + (rows.length === 1 ? plotWidth / 2 : (index / (rows.length - 1)) * plotWidth);
  const yFor = (value: number) => pad.top + plotHeight - (value / max) * plotHeight;
  const points = rows.map((row, index) => `${xFor(index)},${yFor(row.count)}`).join(' ');
  const area = `M ${xFor(0)},${pad.top + plotHeight} L ${points
    .split(' ')
    .join(' L ')} L ${xFor(rows.length - 1)},${pad.top + plotHeight} Z`;
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((fraction) => {
      const y = pad.top + plotHeight - fraction * plotHeight;
      return `<line x1="${pad.left}" x2="${width - pad.right}" y1="${y}" y2="${y}" stroke="#e6e0d8" stroke-width="1" />`;
    })
    .join('');
  const dots = rows
    .map(
      (row, index) =>
        `<circle cx="${xFor(index)}" cy="${yFor(row.count)}" r="2.4" fill="#84333c" />`
    )
    .join('');
  const labelIndexes = [0, Math.floor((rows.length - 1) / 2), rows.length - 1].filter(
    (value, index, array) => array.indexOf(value) === index
  );
  const labels = labelIndexes
    .map(
      (index) =>
        `<text x="${xFor(index)}" y="${height - 6}" text-anchor="${
          index === 0 ? 'start' : index === rows.length - 1 ? 'end' : 'middle'
        }" font-family="monospace" font-size="8" fill="#6c7772">${shortDay(rows[index].day)}</text>`
    )
    .join('');

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="Daily logins">
    ${grid}
    <path d="${area}" fill="#84333c" opacity="0.08" />
    <polyline points="${points}" fill="none" stroke="#84333c" stroke-width="2.2" />
    ${dots}
    ${labels}
  </svg>`;
}

const ReportsPage: React.FC = () => {
  const initial = defaultRange();
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [schools, setSchools] = useState<SchoolReport[]>([]);
  const [users, setUsers] = useState<UserReport[]>([]);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [hourly, setHourly] = useState<HourlyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchReports = useCallback(async () => {
    if (!startDate || !endDate) return;
    try {
      setLoading(true);
      const query = buildQuery({ startDate, endDate });
      const [schoolData, userData, timeData] = await Promise.all([
        getJson<ReportsSchoolResponse>(`/api/reports/by-school${query}`),
        getJson<ReportsUserResponse>(`/api/reports/by-user${query}`),
        getJson<TimeResponse>(`/api/stats/by-time${query}`),
      ]);
      setSchools(schoolData.data || []);
      setUsers(userData.data || []);
      setDaily(timeData.data?.daily || []);
      setHourly(timeData.data?.hourly || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Could not build the report.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const totalLogins = useMemo(
    () => schools.reduce((sum, school) => sum + school.loginCount, 0),
    [schools]
  );
  const avgPerDay = daily.length > 0 ? Math.round(totalLogins / daily.length) : 0;
  const maxSchool = schools.length > 0 ? Math.max(...schools.map((row) => row.loginCount)) : 1;

  const setPreset = (preset: 'month' | '30' | '7') => {
    const now = new Date();
    if (preset === 'month') {
      const range = defaultRange();
      setStartDate(range.startDate);
      setEndDate(range.endDate);
      return;
    }
    const start = new Date(now);
    start.setDate(now.getDate() - (preset === '30' ? 30 : 7));
    setStartDate(toDayString(start));
    setEndDate(toDayString(now));
  };

  const exportToCSV = () => {
    setExporting(true);
    let csv = 'School Reports\n';
    csv += 'School,Total Logins,Unique Users\n';
    schools.forEach((school) => {
      csv += `"${(school.school || '').replace(/"/g, '""')}",${school.loginCount},${school.uniqueUsers}\n`;
    });
    csv += '\n\nUser Reports\n';
    csv += 'Name,National Number,School,Role,Login Count,Last Login\n';
    users.forEach((user) => {
      csv += `"${(user.name || '').replace(/"/g, '""')}","${user.nationalNumber}","${(
        user.school || ''
      ).replace(/"/g, '""')}","${user.role || ''}",${user.loginCount},"${formatDateTime(
        user.lastLogin
      ).replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ketab_reports_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  const generateReportHTML = (): string => {
    const generated = new Date().toLocaleString('en-US', { timeZone: 'Asia/Amman' });
    const schoolRows = schools
      .map((school) => {
        const share = totalLogins > 0 ? Math.round((school.loginCount / totalLogins) * 100) : 0;
        const width = maxSchool > 0 ? (school.loginCount / maxSchool) * 100 : 0;
        return `<tr>
          <td>${escapeHtml(school.school)}</td>
          <td class="num">${school.loginCount.toLocaleString('en-US')}</td>
          <td class="num">${school.uniqueUsers.toLocaleString('en-US')}</td>
          <td class="share"><div class="bar"><span style="width:${width.toFixed(1)}%"></span></div></td>
          <td class="num">${share}%</td>
        </tr>`;
      })
      .join('');

    const userRows = users
      .slice(0, 50)
      .map(
        (user) => `<tr>
          <td>${escapeHtml(user.name)}</td>
          <td class="num">${escapeHtml(user.nationalNumber)}</td>
          <td>${escapeHtml(user.school)}</td>
          <td>${escapeHtml(user.role || '—')}</td>
          <td class="num">${user.loginCount.toLocaleString('en-US')}</td>
          <td class="num">${escapeHtml(formatDateTime(user.lastLogin))}</td>
        </tr>`
      )
      .join('');

    const legend = schools
      .slice(0, 8)
      .map(
        (school, index) => `<li><span style="background:${
          PRINT_COLORS[index % PRINT_COLORS.length]
        }"></span>${escapeHtml(school.school)} <em>${school.loginCount.toLocaleString('en-US')}</em></li>`
      )
      .join('');

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>تقرير كتاب · ${startDate} → ${endDate}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0;
    font-family: 'Noto Naskh Arabic', 'Amiri', 'Segoe UI', Tahoma, sans-serif;
    color: #1b1b1b;
    background: #fff;
    direction: rtl;
    font-size: 10.5px;
    line-height: 1.6;
  }
  .masthead {
    border-top: 8px solid #84333c;
    padding: 12px 0 10px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    border-bottom: 1px solid #d8d2c8;
  }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand-mark {
    width: 44px; height: 44px;
    display: grid; place-items: center;
    border: 1px solid #84333c;
    color: #84333c;
    font-family: 'Amiri', serif;
    font-size: 26px;
    line-height: 1;
  }
  .brand-name { font-family: 'Amiri', serif; font-size: 21px; font-weight: 700; letter-spacing: .04em; }
  .brand-sub { font-family: monospace; font-size: 8px; color: #6c7772; letter-spacing: .12em; }
  .meta { text-align: left; font-family: monospace; font-size: 8.5px; color: #6c7772; line-height: 1.8; }
  h1 { margin: 14px 0 2px; font-family: 'Amiri', serif; font-size: 30px; line-height: 1.2; }
  .lede { margin: 0 0 14px; font-size: 11px; color: #6c7772; }
  .kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border: 1px solid #d8d2c8;
    margin: 14px 0 18px;
  }
  .kpi { padding: 10px 12px; border-left: 1px solid #d8d2c8; }
  .kpi:last-child { border-left: 0; }
  .kpi .label { font-family: monospace; font-size: 8px; color: #6c7772; }
  .kpi .value { margin-top: 3px; font-family: 'Amiri', serif; font-size: 24px; font-weight: 700; color: #84333c; line-height: 1; }
  .section { page-break-inside: avoid; margin-top: 18px; }
  h2 { margin: 0 0 8px; font-family: 'Amiri', serif; font-size: 17px; color: #4e1b22; border-bottom: 2px solid #84333c; padding-bottom: 5px; }
  .chart-row { display: grid; grid-template-columns: minmax(0, 1fr) 190px; gap: 16px; align-items: center; }
  .legend { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 4px; font-size: 8.5px; }
  .legend li { display: flex; align-items: center; gap: 5px; }
  .legend span { width: 8px; height: 8px; display: inline-block; }
  .legend em { margin-right: auto; font-style: normal; font-family: monospace; color: #6c7772; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  th {
    background: #f1e3e4;
    color: #4e1b22;
    border-bottom: 1px solid #84333c;
    padding: 6px 7px;
    text-align: right;
    font-weight: 600;
    white-space: nowrap;
  }
  td { border-bottom: 1px solid #e6e0d8; padding: 6px 7px; vertical-align: middle; }
  tr:nth-child(even) td { background: #fbfaf7; }
  .num { font-family: monospace; font-size: 8.5px; white-space: nowrap; }
  .share { width: 90px; }
  .bar { height: 7px; background: #f1e3e4; width: 100%; }
  .bar span { display: block; height: 100%; background: #84333c; }
  .note { margin-top: 6px; font-size: 8.5px; color: #6c7772; font-style: italic; }
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #d8d2c8; margin-top: 18px; }
  .summary div { padding: 10px 12px; border-left: 1px solid #d8d2c8; }
  .summary div:last-child { border-left: 0; }
  .summary .label { font-family: monospace; font-size: 8px; color: #6c7772; }
  .summary .value { margin-top: 3px; font-family: 'Amiri', serif; font-size: 19px; font-weight: 700; }
  footer {
    display: flex; justify-content: space-between; gap: 12px;
    margin-top: 22px; padding-top: 8px;
    border-top: 1px solid #d8d2c8;
    font-family: monospace; font-size: 8px; color: #6c7772;
  }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <header class="masthead">
    <div class="brand">
      <div class="brand-mark">ك</div>
      <div>
        <div class="brand-name">كتاب</div>
        <div class="brand-sub">KETAB · ADMIN DESK</div>
      </div>
    </div>
    <div class="meta">
      <div>الفترة: ${escapeHtml(formatDate(startDate))} — ${escapeHtml(formatDate(endDate))}</div>
      <div>أُنشئ في: ${escapeHtml(generated)}</div>
      <div>سجلّ نشاط المنصة</div>
    </div>
  </header>

  <h1>تقرير نشاط المنصة</h1>
  <p class="lede">ملخّص تسجيلات الدخول والمدارس والمستخدمين خلال الفترة المحددة.</p>

  <section class="kpis">
    <div class="kpi"><div class="label">إجمالي الدخول</div><div class="value">${totalLogins.toLocaleString('en-US')}</div></div>
    <div class="kpi"><div class="label">المدارس</div><div class="value">${schools.length.toLocaleString('en-US')}</div></div>
    <div class="kpi"><div class="label">المستخدمون النشطون</div><div class="value">${users.length.toLocaleString('en-US')}</div></div>
    <div class="kpi"><div class="label">متوسط الدخول اليومي</div><div class="value">${avgPerDay.toLocaleString('en-US')}</div></div>
  </section>

  <section class="section">
    <h2>الحركة اليومية</h2>
    ${renderPrintLine(daily)}
  </section>

  <section class="section">
    <h2>توزيع الدخول على المدارس</h2>
    <div class="chart-row">
      <div>${renderPrintDonut(schools)}</div>
      <ul class="legend">${legend}</ul>
    </div>
  </section>

  <section class="section">
    <h2>تسجيلات الدخول حسب المدرسة</h2>
    <table>
      <thead>
        <tr>
          <th>المدرسة</th>
          <th>إجمالي الدخول</th>
          <th>المستخدمون الفريدون</th>
          <th>الحصة</th>
          <th>النسبة</th>
        </tr>
      </thead>
      <tbody>${schoolRows || '<tr><td colspan="5">لا توجد بيانات في هذه الفترة.</td></tr>'}</tbody>
    </table>
  </section>

  <section class="section">
    <h2>أكثر المستخدمين نشاطًا</h2>
    <table>
      <thead>
        <tr>
          <th>الاسم</th>
          <th>الرقم الوطني</th>
          <th>المدرسة</th>
          <th>الدور</th>
          <th>عدد الدخول</th>
          <th>آخر دخول</th>
        </tr>
      </thead>
      <tbody>${userRows || '<tr><td colspan="6">لا توجد بيانات في هذه الفترة.</td></tr>'}</tbody>
    </table>
    ${users.length > 50 ? '<div class="note">* عرض أول 50 مستخدمًا من ' + users.length + ' مستخدم.</div>' : ''}
  </section>

  <section class="summary">
    <div><div class="label">إجمالي المدارس</div><div class="value">${schools.length.toLocaleString('en-US')}</div></div>
    <div><div class="label">إجمالي المستخدمين</div><div class="value">${users.length.toLocaleString('en-US')}</div></div>
    <div><div class="label">إجمالي الدخول</div><div class="value">${totalLogins.toLocaleString('en-US')}</div></div>
  </section>

  <footer>
    <span>كتاب · منصة تعليمية للصم وضعاف السمع</span>
    <span>${escapeHtml(formatDate(startDate))} — ${escapeHtml(formatDate(endDate))}</span>
  </footer>
</body>
</html>`;
  };

  const openAsHTML = () => {
    const html = generateReportHTML();
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert('Allow pop-ups for this site to open the printable report.');
      return;
    }
    newWindow.document.write(html);
    newWindow.document.close();
    newWindow.focus();
    setTimeout(() => newWindow.print(), 500);
  };

  if (loading && schools.length === 0 && users.length === 0) {
    return <Loading label="Building the report" />;
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Pick a period, read the spread, then export a CSV or print a designed A4 report."
        actions={
          <>
            <button type="button" className="btn" onClick={exportToCSV} disabled={exporting || schools.length === 0}>
              <Icon name="download" size={14} />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={openAsHTML}
              disabled={schools.length === 0}
            >
              <Icon name="print" size={14} />
              Print / PDF
            </button>
          </>
        }
      />

      {error && (
        <Banner
          tone="error"
          action={
            <button type="button" className="btn btn--sm" onClick={fetchReports}>
              Retry
            </button>
          }
        >
          {error}
        </Banner>
      )}

      <div className="report-toolbar">
        <div className="report-toolbar__group">
          <label htmlFor="report-start">Start date</label>
          <input
            id="report-start"
            className="input"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>
        <div className="report-toolbar__group">
          <label htmlFor="report-end">End date</label>
          <input
            id="report-end"
            className="input"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>
        <div className="report-toolbar__group">
          <label>Presets</label>
          <div className="chip-row">
            <button type="button" className="chip" onClick={() => setPreset('month')}>
              This month
            </button>
            <button type="button" className="chip" onClick={() => setPreset('30')}>
              Last 30 days
            </button>
            <button type="button" className="chip" onClick={() => setPreset('7')}>
              Last 7 days
            </button>
          </div>
        </div>
        <span className="report-toolbar__spacer" />
        <div className="report-toolbar__group">
          <label>Period</label>
          <span className="report-note">
            {formatDate(startDate)} → {formatDate(endDate)}
          </span>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi label="Total logins" value={formatNumber(totalLogins)} hint="In the selected period" />
        <Kpi label="Schools" value={formatNumber(schools.length)} hint={schools[0]?.school || 'No data'} />
        <Kpi label="Active users" value={formatNumber(users.length)} hint={users[0]?.name || 'No data'} />
        <Kpi label="Average / day" value={formatNumber(avgPerDay)} hint={`${daily.length} recorded days`} />
      </div>

      <div className="chart-grid">
        <ChartFrame className="a-col-5" title="School share" subtitle="Percentage of logins by school">
          <DonutChart
            data={schools.slice(0, 8).map((school) => ({
              label: school.school,
              value: school.loginCount,
            }))}
            centerLabel="logins"
            valueLabel="logins"
          />
        </ChartFrame>

        <ChartFrame className="a-col-7" title="Daily logins" subtitle="Volume for every day in the period">
          <LineChart
            data={daily.map((point) => ({ label: point.day, value: point.count }))}
            height={230}
            valueLabel="logins"
          />
        </ChartFrame>

        <ChartFrame className="a-col-5" title="Activity by hour" subtitle="When logins happen during the day">
          <ColumnChart data={fullDay(hourly)} height={220} valueLabel="logins" />
        </ChartFrame>

        <ChartFrame className="a-col-7" title="Most active users" subtitle="Top 10 users in this period">
          <BarChart
            data={users.slice(0, 10).map((user) => ({
              label: user.name || 'Unknown',
              value: user.loginCount,
              meta: user.school || 'No school',
            }))}
            valueLabel="logins"
          />
        </ChartFrame>

        <ChartFrame className="a-col-12" title="Logins by school" subtitle="Every school in the period, with its share">
          {schools.length === 0 ? (
            <div className="chart-empty">No school data in this period</div>
          ) : (
            <div className="table-wrap" style={{ border: 0 }}>
              <table className="ledger">
                <thead>
                  <tr>
                    <th>School</th>
                    <th>Logins</th>
                    <th>Unique users</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((school) => {
                    const width = maxSchool > 0 ? (school.loginCount / maxSchool) * 100 : 0;
                    return (
                      <tr key={school.school}>
                        <td className="ledger__name">{school.school}</td>
                        <td className="num">{formatNumber(school.loginCount)}</td>
                        <td className="num">{formatNumber(school.uniqueUsers)}</td>
                        <td>
                          <div className="report-table-bar">
                            <div className="report-table-bar__fill" style={{ width: `${width}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ChartFrame>

        <ChartFrame className="a-col-12" title="Logins by user" subtitle="Top 25 users, with last login">
          {users.length === 0 ? (
            <div className="chart-empty">No user data in this period</div>
          ) : (
            <div className="table-wrap" style={{ border: 0 }}>
              <table className="ledger">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>National number</th>
                    <th>School</th>
                    <th>Role</th>
                    <th>Logins</th>
                    <th>Last login</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 25).map((user) => (
                    <tr key={user.nationalNumber}>
                      <td className="ledger__name">{user.name}</td>
                      <td className="num">{user.nationalNumber}</td>
                      <td className="muted">{user.school || '—'}</td>
                      <td className="muted">{user.role || '—'}</td>
                      <td className="num">{formatNumber(user.loginCount)}</td>
                      <td className="num">{formatDateTime(user.lastLogin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartFrame>
      </div>
    </div>
  );
};

export default ReportsPage;
