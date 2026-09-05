import React, { useState } from 'react';
import './CourseManagement.css';
import { useCourseAvailability } from '../context/CourseAvailabilityContext';
import { CourseType } from '../utils/courseState';

const DISPLAY_NAMES: Record<CourseType, string> = {
  arabic: 'Arabic Language',
  english: 'English Language',
  math: 'Math'
};

const DESCRIPTIONS: Record<CourseType, string> = {
  arabic: 'Available to all users.',
  english: 'Unlock to allow learners to access the English sign language materials.',
  math: 'Unlock to allow learners to access the numbers (math) worksheets.'
};

const CourseManagement: React.FC = () => {
  const { courses, loading, error, updateCourseLock } = useCourseAvailability();
  const [savingCourse, setSavingCourse] = useState<CourseType | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const handleToggle = async (course: CourseType) => {
    if (course === 'arabic') {
      alert('The Arabic course is always available and cannot be locked.');
      return;
    }

    const current = courses[course];
    if (!current) {
      return;
    }

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

  return (
    <div className="course-management">
      <div className="course-management-header">
        <h2>Course Availability</h2>
        <p>Unlock a course to make it visible to learners. Locking hides it again for everyone.</p>
      </div>

      {(error || requestError) && (
        <div className="course-management-error">{requestError || error}</div>
      )}

      {loading ? (
        <div className="course-management-loading">Loading course availability...</div>
      ) : (
        <div className="course-management-grid">
          {(Object.keys(courses) as CourseType[]).map(course => {
            const status = courses[course];
            const isSaving = savingCourse === course;
            return (
              <div key={course} className={`course-card ${course}`}>
                <div className="course-card-header">
                  <h3>{status.label || DISPLAY_NAMES[course]}</h3>
                  <span className={`course-status ${status.locked ? 'locked' : 'unlocked'}`}>
                    {status.locked ? 'Locked' : 'Unlocked'}
                  </span>
                </div>
                <p className="course-description">{DESCRIPTIONS[course]}</p>
                <div className="course-actions">
                  <button
                    className={`toggle-button ${status.locked ? 'unlock' : 'lock'}`}
                    disabled={loading || isSaving || course === 'arabic'}
                    onClick={() => handleToggle(course)}
                  >
                    {isSaving
                      ? 'Saving...'
                      : course === 'arabic'
                        ? 'Always Available'
                        : status.locked ? 'Unlock Course' : 'Lock Course'}
                  </button>
                  <span className="hint-text">
                    {course === 'arabic'
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
      )}

    </div>
  );
};

export default CourseManagement;

