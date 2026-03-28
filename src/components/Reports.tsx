import React, { useState, useEffect } from 'react';
import './Reports.css';

interface SchoolReport {
  school: string;
  loginCount: number;
  uniqueUsers: number;
}

interface UserReport {
  nationalNumber: string;
  name: string;
  school: string;
  role: string;
  loginCount: number;
  lastLogin: string;
}

interface Visit {
  timestamp: string;
  count: number;
}

type PeriodType = 'day' | 'week' | 'month' | 'custom';

const Reports: React.FC = () => {
  // Set default date range (current month: start of month to end of month)
  const getDefaultDateRange = () => {
    const now = new Date();
    
    // Start of current month (day 1)
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // End of current month (day 0 of next month = last day of current month)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  const defaultDates = getDefaultDateRange();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [schoolReports, setSchoolReports] = useState<SchoolReport[]>([]);
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [startDate, setStartDate] = useState<string>(defaultDates.startDate);
  const [endDate, setEndDate] = useState<string>(defaultDates.endDate);
  const [exporting, setExporting] = useState<'none' | 'csv'>('none');

  const fetchReports = async () => {
    if (!startDate || !endDate) {
      return;
    }
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: startDate,
        endDate: endDate
      });
      
      const [schoolResponse, userResponse] = await Promise.all([
        fetch(`/api/reports/by-school?${params}`),
        fetch(`/api/reports/by-user?${params}`)
      ]);

      if (schoolResponse.ok) {
        const schoolData = await schoolResponse.json();
        setSchoolReports(schoolData.data || []);
      } else {
        setError('Failed to fetch school reports');
      }

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserReports(userData.data || []);
      } else {
        setError('Failed to fetch user reports');
      }

      setError('');
    } catch (error) {
      setError('Network error. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch reports when dates change (including initial load)
  useEffect(() => {
    if (startDate && endDate) {
      fetchReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Escape HTML special characters while preserving Arabic/RTL text
  const escapeHtml = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const exportToCSV = () => {
    setExporting('csv');
    
    // School Report CSV
    let csv = 'School Reports\n';
    csv += 'School,Total Logins,Unique Users\n';
    schoolReports.forEach(school => {
      // Escape quotes and ensure proper CSV formatting
      const schoolName = school.school.replace(/"/g, '""');
      csv += `"${schoolName}",${school.loginCount},${school.uniqueUsers}\n`;
    });
    
    csv += '\n\nUser Reports\n';
    csv += 'Name,National Number,School,Role,Login Count,Last Login\n';
    userReports.forEach(user => {
      // Escape quotes in all text fields
      const userName = user.name.replace(/"/g, '""');
      const userSchool = user.school.replace(/"/g, '""');
      const lastLogin = formatDateTime(user.lastLogin).replace(/"/g, '""');
      csv += `"${userName}","${user.nationalNumber}","${userSchool}","${user.role}",${user.loginCount},"${lastLogin}"\n`;
    });
    
    // Add UTF-8 BOM for proper Arabic text encoding (EF BB BF)
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csv;
    
    // Create blob with UTF-8 encoding
    const blob = new Blob([csvWithBOM], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reports_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setExporting('none');
  };

  // Generate HTML content for report
  const generateReportHTML = (): string => {
    let htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700&display=swap');
            @font-face {
              font-family: 'Cairo';
              font-style: normal;
              font-weight: 400;
              src: url('https://fonts.gstatic.com/s/cairo/v28/SLXVc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hGA-W1ToLQ-HmkA.ttf') format('truetype');
            }
            body {
              font-family: 'Cairo', 'Segoe UI', 'Arial Unicode MS', Arial, sans-serif;
              direction: rtl;
              padding: 20px;
              margin: 0;
              width: 100%;
              background: white;
            }
            @media print {
              @page {
                size: A4;
                margin: 15mm;
              }
              body {
                margin: 0;
                padding: 0;
                background: white;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print {
                display: none !important;
              }
              .title {
                page-break-after: avoid;
                margin-bottom: 10px;
              }
              .date-range {
                page-break-after: avoid;
                margin-bottom: 15px;
              }
              .section-title {
                page-break-after: avoid;
                page-break-inside: avoid;
                margin-top: 15px;
                margin-bottom: 10px;
              }
              table {
                page-break-inside: avoid;
                border-collapse: collapse;
              }
              thead {
                display: table-header-group;
              }
              tbody {
                display: table-row-group;
              }
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              td, th {
                border: 1px solid #ddd;
                padding: 8px;
              }
              .summary {
                page-break-inside: avoid;
                margin-top: 20px;
              }
              * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
            .title {
              font-size: 24px;
              font-weight: 700;
              text-align: center;
              margin-bottom: 10px;
              color: #333;
            }
            .date-range {
              font-size: 14px;
              text-align: center;
              color: #666;
              margin-bottom: 20px;
            }
            .section-title {
              font-size: 18px;
              font-weight: 600;
              margin: 20px 0 10px 0;
              color: #667eea;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 11px;
            }
            th {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 10px 8px;
              text-align: right;
              font-weight: 600;
              border: 1px solid #ddd;
            }
            td {
              padding: 8px;
              border: 1px solid #ddd;
              text-align: right;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .summary {
              margin-top: 30px;
              padding: 15px;
              background-color: #f5f5f5;
              border-radius: 5px;
            }
            .summary-item {
              margin: 5px 0;
              font-size: 12px;
            }
            .note {
              font-size: 10px;
              color: #999;
              font-style: italic;
              text-align: center;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="title">📊 تقارير التحليلات</div>
          <div class="date-range">${formatDate(startDate)} إلى ${formatDate(endDate)}</div>
      `;

      // School Reports Section
      if (schoolReports.length > 0) {
        htmlContent += `
          <div class="section-title">🏫 تسجيلات الدخول حسب المدرسة</div>
          <table>
            <thead>
              <tr>
                <th>المدرسة</th>
                <th>إجمالي الدخول</th>
                <th>المستخدمون الفريدون</th>
              </tr>
            </thead>
            <tbody>
        `;
        
        schoolReports.forEach(school => {
          htmlContent += `
            <tr>
              <td>${escapeHtml(school.school)}</td>
              <td>${school.loginCount.toLocaleString()}</td>
              <td>${school.uniqueUsers.toLocaleString()}</td>
            </tr>
          `;
        });
        
        htmlContent += `
            </tbody>
          </table>
        `;
      }

      // User Reports Section
      if (userReports.length > 0) {
        htmlContent += `
          <div class="section-title">👥 تسجيلات الدخول حسب المستخدم</div>
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
            <tbody>
        `;
        
        userReports.slice(0, 100).forEach(user => {
          htmlContent += `
            <tr>
              <td>${escapeHtml(user.name)}</td>
              <td>${escapeHtml(user.nationalNumber)}</td>
              <td>${escapeHtml(user.school)}</td>
              <td>${escapeHtml(user.role)}</td>
              <td>${user.loginCount}</td>
              <td>${escapeHtml(formatDateTime(user.lastLogin))}</td>
            </tr>
          `;
        });
        
        htmlContent += `
            </tbody>
          </table>
        `;
        
        if (userReports.length > 100) {
          htmlContent += `<div class="note">* عرض أول 100 من ${userReports.length} مستخدم</div>`;
        }
      }

      // Summary Section
      const totalLogins = schoolReports.reduce((sum, s) => sum + s.loginCount, 0);
      htmlContent += `
          <div class="summary">
            <div class="section-title">📈 الملخص</div>
            <div class="summary-item"><strong>إجمالي المدارس:</strong> ${schoolReports.length}</div>
            <div class="summary-item"><strong>إجمالي المستخدمين:</strong> ${userReports.length}</div>
            <div class="summary-item"><strong>إجمالي الدخول:</strong> ${totalLogins.toLocaleString()}</div>
          </div>
        </body>
        </html>
      `;

    return htmlContent;
  };

  const openAsHTML = () => {
    try {
      const htmlContent = generateReportHTML();
      
      // Open HTML in a new window
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        
        newWindow.focus();
        setTimeout(() => {
          newWindow.print();
        }, 500);
      } else {
        alert('Please allow popups for this site to view the HTML report.');
      }
    } catch (error: any) {
      console.error('HTML view error:', error);
      alert(`Failed to open HTML report: ${error.message || 'Unknown error'}`);
    }
  };

  const maxSchoolLogins = schoolReports.length > 0 
    ? Math.max(...schoolReports.map(s => s.loginCount))
    : 1;

  const maxUserLogins = userReports.length > 0
    ? Math.max(...userReports.map(u => u.loginCount))
    : 1;

  if (loading && schoolReports.length === 0) {
    return (
      <div className="reports">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports">
      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={fetchReports} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      <div className="reports-header">
        <h2>📊 Analytics Reports</h2>
        <div className="export-buttons">
          <button 
            onClick={openAsHTML} 
            className="export-btn export-html"
            disabled={schoolReports.length === 0}
          >
            🌐 View HTML (Printable)
          </button>
          <button 
            onClick={exportToCSV} 
            className="export-btn export-csv"
            disabled={exporting !== 'none' || schoolReports.length === 0}
          >
            {exporting === 'csv' ? 'Exporting...' : '📊 Export CSV'}
          </button>
        </div>
      </div>

      <div className="date-range-picker">
        <div className="date-input-group">
          <label htmlFor="startDate">Start Date:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="date-input"
          />
        </div>
        <div className="date-input-group">
          <label htmlFor="endDate">End Date:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="date-input"
          />
        </div>
        <div className="date-range-info">
          <span className="info-icon">ℹ️</span>
          <span>
            Showing data from {formatDate(startDate)} to {formatDate(endDate)}
          </span>
        </div>
      </div>

      <div className="reports-grid">
        {/* School Logins Report */}
        <div className="report-card school-report">
          <h3>🏫 Logins by School</h3>
          {schoolReports.length > 0 ? (
            <>
              <div className="chart-container">
                <div className="bar-chart">
                  {schoolReports.slice(0, 10).map((school, index) => (
                    <div key={school.school} className="bar-item">
                      <div className="bar-label">{school.school}</div>
                      <div className="bar-wrapper">
                        <div 
                          className="bar-fill"
                          style={{ 
                            width: `${(school.loginCount / maxSchoolLogins) * 100}%`,
                            background: `linear-gradient(90deg, #667eea 0%, #764ba2 100%)`
                          }}
                        >
                          <span className="bar-value">{school.loginCount}</span>
                        </div>
                      </div>
                      <div className="bar-meta">
                        <span className="unique-users">{school.uniqueUsers} unique users</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="report-summary">
                <div className="summary-item">
                  <span className="summary-label">Total Schools:</span>
                  <span className="summary-value">{schoolReports.length}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Logins:</span>
                  <span className="summary-value">
                    {schoolReports.reduce((sum, s) => sum + s.loginCount, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="no-data">No school data available for the selected period</div>
          )}
        </div>

        {/* User Logins Report */}
        <div className="report-card user-report">
          <h3>👥 Logins by User</h3>
          {userReports.length > 0 ? (
            <>
              <div className="chart-container">
                <div className="bar-chart user-chart">
                  {userReports.slice(0, 15).map((user, index) => (
                    <div key={user.nationalNumber} className="bar-item user-bar-item">
                      <div className="bar-label user-label">
                        <span className="user-name">{user.name}</span>
                        <span className="user-school">{user.school}</span>
                      </div>
                      <div className="bar-wrapper">
                        <div 
                          className="bar-fill"
                          style={{ 
                            width: `${(user.loginCount / maxUserLogins) * 100}%`,
                            background: `linear-gradient(90deg, #28a745 0%, #20c997 100%)`
                          }}
                        >
                          <span className="bar-value">{user.loginCount}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="report-summary">
                <div className="summary-item">
                  <span className="summary-label">Total Users:</span>
                  <span className="summary-value">{userReports.length}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Logins:</span>
                  <span className="summary-value">
                    {userReports.reduce((sum, u) => sum + u.loginCount, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="no-data">No user data available for the selected period</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;

