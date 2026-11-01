import React, { useState } from 'react';
import { useCourseAvailability } from '../../../context/CourseAvailabilityContext';
import { CourseType } from '../../../utils/courseState';
import { Banner, Loading, PageHeader, formatNumber } from '../ui';
import Icon from '../Icons';

const DISPLAY_NAMES: Record<CourseType, string> = {
  arabic: 'اللغة العربية',
  english: 'اللغة الإنجليزية',
  math: 'الرياضيات',
  awareness: 'التوعية',
};

const DESCRIPTIONS: Record<CourseType, string> = {
  arabic: 'متاح لجميع المستخدمين.',
  english: 'افتح المقرر ليتيح للمتعلمين الوصول إلى مواد لغة الإشارة الإنجليزية.',
  math: 'افتح المقرر ليتيح للمتعلمين الوصول إلى أوراق الأعداد (الرياضيات).',
  awareness: 'افتح المقرر ليتيح للمتعلمين الوصول إلى فيديوهات التوعية.',
};

const GLYPHS: Record<CourseType, string> = {
  arabic: 'ع',
  english: 'E',
  math: '٣',
  awareness: 'و',
};

const ORDER: CourseType[] = ['arabic', 'english', 'math', 'awareness'];

const CoursesPage: React.FC = () => {
  const { courses, loading, error, updateCourseLock, refresh } = useCourseAvailability();
  const [savingCourse, setSavingCourse] = useState<CourseType | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const keys = ORDER.filter((key) => courses[key]);
  const lockedCount = keys.filter((key) => courses[key]?.locked).length;
  const openCount = keys.length - lockedCount;

  const handleToggle = async (course: CourseType) => {
    if (course === 'arabic') {
      alert('مقرر اللغة العربية متاح دائمًا ولا يمكن إغلاقه.');
      return;
    }

    const current = courses[course];
    if (!current) return;

    setSavingCourse(course);
    setRequestError(null);
    try {
      await updateCourseLock(course, !current.locked);
    } catch (err) {
      console.error('Failed to update course lock:', err);
      setRequestError(err instanceof Error ? err.message : 'تعذّر تحديث حالة المقرر');
    } finally {
      setSavingCourse(null);
    }
  };

  if (loading && keys.length === 0) {
    return <Loading label="جارٍ قراءة حالة المقررات" />;
  }

  return (
    <div>
      <PageHeader
        title="توفّر المقررات"
        description="افتح المقرر ليتيح للمتعلمين رؤيته. الإغلاق يخفيه عن الجميع فورًا."
        actions={
          <button type="button" className="btn" onClick={refresh} disabled={loading}>
            <Icon name="refresh" size={14} />
            {loading ? 'جارٍ التحديث…' : 'تحديث'}
          </button>
        }
      />

      {(error || requestError) && (
        <Banner
          tone="error"
          action={
            <button type="button" className="btn btn--sm" onClick={() => setRequestError(null)}>
              إغلاق
            </button>
          }
        >
          {requestError || error}
        </Banner>
      )}

      <div className="course-board">
        {keys.map((course, index) => {
          const status = courses[course];
          const isSaving = savingCourse === course;
          const isArabic = course === 'arabic';
          return (
            <div key={course} className={`course-card ${course}`}>
              <div className="course-card__index">
                {`${index + 1}`.padStart(2, '0')}
                <div className="course-card__glyph">{GLYPHS[course]}</div>
              </div>
              <div className="course-card__main">
                <div className="course-card__title-row">
                  <h3>{DISPLAY_NAMES[course]}</h3>
                  <span className={`course-status ${status.locked ? 'locked' : 'unlocked'}`}>
                    {status.locked ? 'مغلق' : 'مفتوح'}
                  </span>
                </div>
                <p className="course-description">{DESCRIPTIONS[course]}</p>
              </div>
              <div className="course-actions">
                <button
                  type="button"
                  className={`toggle-button ${status.locked ? 'unlock' : 'lock'}`}
                  disabled={loading || isSaving || isArabic}
                  onClick={() => handleToggle(course)}
                >
                  {isSaving
                    ? 'جارٍ الحفظ...'
                    : isArabic
                    ? 'متاح دائمًا'
                    : status.locked
                    ? 'فتح المقرر'
                    : 'إغلاق المقرر'}
                </button>
                <span className="hint-text">
                  {isArabic
                    ? 'مقرر اللغة العربية الأساسي متاح دائمًا.'
                    : status.locked
                    ? 'لن يرى الطلاب هذا المقرر ما دام مغلقًا.'
                    : 'يمكن للطلاب الآن الوصول إلى هذا المقرر من لوحاتهم.'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="course-board__foot">
        <div className="course-board__legend">
          <span>
            <span className="course-board__dot" style={{ background: 'var(--admin-sage)' }} />
            {formatNumber(openCount)} مفتوح
          </span>
          <span>
            <span className="course-board__dot" style={{ background: 'var(--admin-brass)' }} />
            {formatNumber(lockedCount)} مغلق
          </span>
          <span>
            <span className="course-board__dot" style={{ background: 'var(--admin-line-2)' }} />
            {formatNumber(keys.length)} مقرر إجمالًا
          </span>
        </div>
        <span>تُطبَّق التغييرات على كل متعلم عند تحميل الصفحة التالية.</span>
      </div>
    </div>
  );
};

export default CoursesPage;
