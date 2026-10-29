import React, { useState } from 'react';
import { useCourseAvailability } from '../../../context/CourseAvailabilityContext';
import { CourseType } from '../../../utils/courseState';
import { Banner, Loading, PageHeader, formatNumber } from '../ui';
import Icon from '../Icons';

const DISPLAY_NAMES: Record<CourseType, string> = {
  arabic: 'Arabic Language',
  english: 'English Language',
  math: 'Math',
  awareness: 'Awareness',
};

const DESCRIPTIONS: Record<CourseType, string> = {
  arabic: 'Available to all users.',
  english: 'Unlock to allow learners to access the English sign language materials.',
  math: 'Unlock to allow learners to access the numbers (math) worksheets.',
  awareness: 'Unlock to allow learners to access the awareness videos.',
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
      alert('The Arabic course is always available and cannot be locked.');
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
      setRequestError(err instanceof Error ? err.message : 'Failed to update course status');
    } finally {
      setSavingCourse(null);
    }
  };

  if (loading && keys.length === 0) {
    return <Loading label="Reading course availability" />;
  }

  return (
    <div>
      <PageHeader
        title="Course availability"
        description="Unlock a course to make it visible to learners. Locking hides it again for everyone, immediately."
        actions={
          <button type="button" className="btn" onClick={refresh} disabled={loading}>
            <Icon name="refresh" size={14} />
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {(error || requestError) && (
        <Banner
          tone="error"
          action={
            <button type="button" className="btn btn--sm" onClick={() => setRequestError(null)}>
              Dismiss
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
                  <h3>{status.label || DISPLAY_NAMES[course]}</h3>
                  <span className={`course-status ${status.locked ? 'locked' : 'unlocked'}`}>
                    {status.locked ? 'Locked' : 'Unlocked'}
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
                    ? 'Saving...'
                    : isArabic
                    ? 'Always Available'
                    : status.locked
                    ? 'Unlock Course'
                    : 'Lock Course'}
                </button>
                <span className="hint-text">
                  {isArabic
                    ? 'The primary Arabic course is always enabled.'
                    : status.locked
                    ? 'Students will not see this course while it is locked.'
                    : 'Students can now access this course from their dashboards.'}
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
            {formatNumber(openCount)} open
          </span>
          <span>
            <span className="course-board__dot" style={{ background: 'var(--admin-brass)' }} />
            {formatNumber(lockedCount)} locked
          </span>
          <span>
            <span className="course-board__dot" style={{ background: 'var(--admin-line-2)' }} />
            {formatNumber(keys.length)} total courses
          </span>
        </div>
        <span>Changes apply to every learner on their next page load.</span>
      </div>
    </div>
  );
};

export default CoursesPage;
