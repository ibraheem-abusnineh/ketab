import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CourseType, useCourseState } from '../utils/courseState';
import { useCourseAvailability } from '../context/CourseAvailabilityContext';
import { getAuthState } from '../utils/auth';

export const COURSE_TABS: Array<{
  course: CourseType;
  labelAr: string;
  labelEn: string;
  path: string;
}> = [
  { course: 'arabic', labelAr: 'اللغة العربية', labelEn: 'Arabic Language', path: '/letters' },
  { course: 'english', labelEn: 'English Language', labelAr: 'اللغة الإنجليزية', path: '/letters' },
  { course: 'math', labelAr: 'الأعداد', labelEn: 'Numbers', path: '/numbers' },
  { course: 'awareness', labelAr: 'التوعية', labelEn: 'Awareness', path: '/awareness' },
];

interface CourseTabRowProps {
  /** When provided, this course is shown active regardless of URL (the letters page, where arabic/english tabs share /letters). */
  activeOverride?: CourseType;
  /** Passed on the letters page, where the arabic/english tabs switch content instead of routing. */
  onCourseChange?: (course: CourseType) => void;
  /** Fires when the user clicks a locked arabic/english tab on the letters page; the page shows its lock modal. */
  onLockedClick?: (course: CourseType) => void;
}

const BTN_BASE =
  'py-[15px] px-[20px] min-w-[200px] lg:min-w-[250px] text-center border-2 border-[#84333c] rounded-lg text-base cursor-pointer transition-all duration-200 active:translate-y-px';
const BTN_ACTIVE = 'bg-[#84333c] text-white';
const BTN_INACTIVE = 'bg-white text-[#333] hover:bg-[#84333c] hover:text-white';
const BTN_LOCKED =
  'opacity-60 cursor-not-allowed relative hover:bg-gray-100 hover:text-[#666] hover:border-[#ccc] hover:transform-none';

/**
 * The one course-tab row shared by the letters, numbers, and awareness pages
 * so course navigation looks and behaves identically everywhere.
 *
 * Behavior rules:
 * - Labels flip with the app-wide course (same as the letters page).
 * - arabic/english: active state tracks the app-wide course; on the letters
 *   page they swap content via onCourseChange, elsewhere they set the course
 *   and route to /letters.
 * - math/awareness: route to their own pages; active state tracks the URL.
 * - Locked arabic/english: styled disabled, letters page shows its lock modal
 *   via onLockedClick; other pages just don't navigate. Locked math/awareness
 *   still navigate — their pages render the lock screen themselves.
 */
const CourseTabRow: React.FC<CourseTabRowProps> = ({ activeOverride, onCourseChange, onLockedClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [course, setCourse] = useCourseState();
  const { courses: availability } = useCourseAvailability();
  const isDev = getAuthState().user?.role === 'developer';
  const isEnglish = course === 'english';
  // Trailing slash tolerant: '/awareness/' must match '/awareness'.
  const path = location.pathname.replace(/\/+$/, '') || '/';

  const handleTab = (tab: (typeof COURSE_TABS)[number]) => {
    const locked = availability[tab.course]?.locked;

    if (tab.course === 'arabic' || tab.course === 'english') {
      if (locked && !isDev) {
        if (onLockedClick) onLockedClick(tab.course);
        return;
      }
      if (onCourseChange) {
        onCourseChange(tab.course);
        return;
      }
      if (course !== tab.course) {
        setCourse(tab.course);
      }
      navigate('/letters');
      return;
    }

    navigate(tab.path);
  };

  const isActive = (tab: (typeof COURSE_TABS)[number]) => {
    if (activeOverride) return tab.course === activeOverride;
    if (tab.course === 'math') return path === '/numbers';
    if (tab.course === 'awareness') return path === '/awareness';
    // arabic/english are only "selected" while actually on the letters page,
    // otherwise the app-wide course would keep them highlighted on /numbers
    // and /awareness alongside the URL-active tab.
    return path === '/letters' && course === tab.course;
  };

  return (
    <div className="flex justify-center gap-5 mb-[30px] flex-wrap">
      {COURSE_TABS.map((tab) => {
        const locked = availability[tab.course]?.locked;
        const classes = [BTN_BASE, isActive(tab) ? BTN_ACTIVE : BTN_INACTIVE];
        if (locked && !isDev) classes.push(BTN_LOCKED);
        return (
          <button
            key={tab.course}
            className={classes.join(' ')}
            onClick={() => handleTab(tab)}
            title={locked && !isDev ? (isEnglish ? 'Locked' : 'مقفل') : undefined}
          >
            {isEnglish ? tab.labelEn : tab.labelAr}
          </button>
        );
      })}
    </div>
  );
};

export default CourseTabRow;
