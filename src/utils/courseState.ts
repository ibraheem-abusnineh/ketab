import { useState, useEffect } from 'react';

export type CourseType = 'arabic' | 'english' | 'numbers';

// Get the current course from localStorage or default to 'arabic'
export const getCourseState = (): CourseType => {
  const stored = localStorage.getItem('currentCourse');
  return (stored as CourseType) || 'arabic';
};

// Set the course in localStorage
export const setCourseState = (course: CourseType): void => {
  localStorage.setItem('currentCourse', course);
  // Dispatch an event so other components can react to the change
  window.dispatchEvent(new Event('courseChanged'));
};

// Hook to listen for course changes
export const useCourseState = () => {
  const [course, setCourse] = useState<CourseType>(getCourseState());

  useEffect(() => {
    const handleCourseChange = () => {
      setCourse(getCourseState());
    };

    window.addEventListener('courseChanged', handleCourseChange);
    return () => window.removeEventListener('courseChanged', handleCourseChange);
  }, []);

  const updateCourse = (newCourse: CourseType) => {
    setCourseState(newCourse);
    setCourse(newCourse);
  };

  return [course, updateCourse] as const;
};