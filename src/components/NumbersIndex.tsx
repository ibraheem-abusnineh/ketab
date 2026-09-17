import React from 'react';
import { useNavigate } from 'react-router-dom';
import { numbersOrder } from '../data/numbersData';
import LogoWithImage from './LogoWithImage';
import { useCourseAvailability } from '../context/CourseAvailabilityContext';
import { getAuthState } from '../utils/auth';
import { useCourseState } from '../utils/courseState';
import CourseTabRow from './CourseTabRow';

const NumbersIndex: React.FC = () => {
  const navigate = useNavigate();
  const { courses: availability } = useCourseAvailability();
  const [course] = useCourseState();
  const isEnglish = course === 'english';
  const mathLocked = availability.math?.locked;
  const isDev = getAuthState().user?.role === 'developer';

  const labels = {
    heading: isEnglish ? 'Numbers from 0 to 10' : 'الأعداد من 0 إلى 10',
    lockedTitle: isEnglish ? 'Course Locked' : 'المحتوى مقفل',
    lockedBody: isEnglish
      ? 'The Numbers (Math) course is currently locked.'
      : 'محتوى الأعداد (الرياضيات) مقفل حالياً.',
  };

  const pick = (n: number) => {
    navigate(`/worksheet/${n}`);
  };

  if (mathLocked && !isDev) {
    return (
      <div
        className="bg-white rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.15)] border-[3px] border-[#84333c] p-[30px] lg:p-[40px_30px_30px_30px] mt-10 mx-auto relative w-full max-w-[1100px] lg:max-w-[98vw]"
        dir={isEnglish ? 'ltr' : 'rtl'}
        style={{ direction: isEnglish ? 'ltr' : 'rtl' }}
      >
        <div className="flex justify-between items-center mb-5">
          <div className="hidden lg:flex absolute top-[25px] right-[25px] z-[100] bg-white rounded-md border-2 border-[#84333c] w-[150px] h-[150px] lg:w-[200px] lg:h-[200px] p-[10px] items-center justify-center">
            <LogoWithImage
              logoPath="qra-logo.svg"
              className="w-full h-auto block"
            />
          </div>
        </div>

        <CourseTabRow />

        <div className="text-center text-[2.2em] text-[#84333c] mb-[30px] font-bold drop-shadow-[1px_1px_2px_rgba(255,255,255,0.8)]">
          {labels.lockedTitle}
        </div>
        <p className="text-center text-[1.1em] text-[#333] leading-[1.6]">
          {labels.lockedBody}
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.15)] border-[3px] border-[#84333c] p-[30px] lg:p-[40px_30px_30px_30px] mt-10 mx-auto relative w-full max-w-[1100px] lg:max-w-[98vw]"
      dir={isEnglish ? 'ltr' : 'rtl'}
      style={{ direction: isEnglish ? 'ltr' : 'rtl' }}
    >
      <div className="flex justify-between items-center mb-5">
        <div className="hidden lg:flex absolute top-[25px] right-[25px] z-[100] bg-white rounded-md border-2 border-[#84333c] w-[150px] h-[150px] lg:w-[200px] lg:h-[200px] p-[10px] items-center justify-center">
          <LogoWithImage
            logoPath="qra-logo.svg"
            className="w-full h-auto block"
          />
        </div>
      </div>

      <CourseTabRow />

      <div className="text-center text-[2.2em] text-[#84333c] mb-[30px] font-bold drop-shadow-[1px_1px_2px_rgba(255,255,255,0.8)]">
        {labels.heading}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(64px,1fr))] lg:grid-cols-[repeat(auto-fit,minmax(80px,1fr))] lg:pr-[240px] gap-[10px] justify-items-center">
        {numbersOrder.map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => pick(n)}
            className="aspect-square w-full max-w-[80px] rounded-lg flex items-center justify-center bg-white border-2 border-[#84333c] text-[#84333c] font-bold text-[1.2em] cursor-pointer transition-transform duration-150 hover:scale-110 active:scale-95 hover:bg-[#84333c] hover:text-white"
            aria-label={isEnglish ? `Open number ${n}` : `افتح العدد ${n}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
};

export default NumbersIndex;
