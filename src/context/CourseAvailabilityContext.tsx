import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../utils/api';
import { CourseType, getCourseState, setCourseState } from '../utils/courseState';

type CourseStatus = {
  locked: boolean;
  label?: string;
};

type CourseMap = Record<CourseType, CourseStatus>;

interface CourseAvailabilityContextValue {
  courses: CourseMap;
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
  updateCourseLock: (course: CourseType, locked: boolean) => Promise<void>;
}

const DEFAULT_COURSES: CourseMap = {
  arabic: { locked: false, label: 'Arabic Language' },
  english: { locked: true, label: 'English Language' },
  numbers: { locked: true, label: 'Mathematics' }
};

const CourseAvailabilityContext = createContext<CourseAvailabilityContextValue | undefined>(undefined);

const normalizeCourses = (courses?: Partial<Record<string, CourseStatus>>): CourseMap => {
  const normalized: CourseMap = { ...DEFAULT_COURSES };
  if (courses) {
    (Object.keys(courses) as string[]).forEach(key => {
      if (key === 'arabic' || key === 'english' || key === 'numbers') {
        const status = courses[key];
        if (status && typeof status.locked === 'boolean') {
          normalized[key] = {
            ...DEFAULT_COURSES[key],
            ...status
          };
        }
      }
    });
  }
  return normalized;
};

export const CourseAvailabilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [courses, setCourses] = useState<CourseMap>(DEFAULT_COURSES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const isResettingRef = useRef(false);

  const ensureUnlockedCourse = useCallback((updatedCourses: CourseMap) => {
    if (isResettingRef.current) {
      return;
    }

    const currentCourse = getCourseState();
    const currentStatus = updatedCourses[currentCourse];
    if (currentStatus && currentStatus.locked) {
      const fallbackCourse = (Object.entries(updatedCourses) as Array<[CourseType, CourseStatus]>)
        .find(([, status]) => !status.locked)?.[0] || 'arabic';

      if (fallbackCourse !== currentCourse) {
        try {
          isResettingRef.current = true;
          setCourseState(fallbackCourse);
        } finally {
          setTimeout(() => {
            isResettingRef.current = false;
          }, 0);
        }
      }
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/courses/status');
      if (!response.ok) {
        throw new Error('Failed to load course availability');
      }
      const data = await response.json();
      const normalized = normalizeCourses(data.courses);
      setCourses(normalized);
      setError(undefined);
      ensureUnlockedCourse(normalized);
    } catch (err) {
      console.error('Error fetching course availability:', err);
      setCourses(DEFAULT_COURSES);
      setError(err instanceof Error ? err.message : 'Unknown error');
      ensureUnlockedCourse(DEFAULT_COURSES);
    } finally {
      setLoading(false);
    }
  }, [ensureUnlockedCourse]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const updateCourseLock = useCallback(async (course: CourseType, locked: boolean) => {
    const response = await apiFetch(`/api/admin/courses/${course}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ locked })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update course status');
    }

    const data = await response.json();
    const normalized = normalizeCourses(data.courses);
    setCourses(normalized);
    ensureUnlockedCourse(normalized);
  }, [ensureUnlockedCourse]);

  const contextValue = useMemo<CourseAvailabilityContextValue>(() => ({
    courses,
    loading,
    error,
    refresh: fetchCourses,
    updateCourseLock
  }), [courses, loading, error, fetchCourses, updateCourseLock]);

  return (
    <CourseAvailabilityContext.Provider value={contextValue}>
      {children}
    </CourseAvailabilityContext.Provider>
  );
};

export const useCourseAvailability = (): CourseAvailabilityContextValue => {
  const context = useContext(CourseAvailabilityContext);
  if (!context) {
    throw new Error('useCourseAvailability must be used within a CourseAvailabilityProvider');
  }
  return context;
};
