import React from 'react';
import { useNavigate } from 'react-router-dom';
import LogoWithImage from './LogoWithImage';
import { useCourseAvailability } from '../context/CourseAvailabilityContext';
import { getAuthState } from '../utils/auth';
import { useCourseState } from '../utils/courseState';
import CourseTabRow from './CourseTabRow';

const AWARENESS_VIDEOS = [
  { src: '/awareness/focus-on-road.mp4', titleEn: 'Focus on the Road', titleAr: 'ركّز على الطريق' },
  { src: '/awareness/addiction.mp4', titleEn: 'Addiction', titleAr: 'الإدمان' },
  { src: '/awareness/cyber-fraud.mp4', titleEn: 'Cyber Fraud', titleAr: 'الاحتيال الإلكتروني' },
  { src: '/awareness/heat-stress.mp4', titleEn: 'Protection from Heat Stress', titleAr: 'حمايتك من الإجهاد مع تزايد الحرارة' },
];

const AwarenessIndex: React.FC = () => {
  const navigate = useNavigate();
  const { courses: availability } = useCourseAvailability();
  const [course] = useCourseState();
  const isEnglish = course === 'english';
  const awarenessLocked = availability.awareness?.locked;
  const isDev = getAuthState().user?.role === 'developer';
  const [activeIndex, setActiveIndex] = React.useState(0);

  const labels = {
    lockedTitle: isEnglish ? 'Course Locked' : 'المحتوى مقفل',
    lockedBody: isEnglish
      ? 'The Awareness course is currently locked.'
      : 'محتوى التوعية مقفل حالياً.',
  };

  if (awarenessLocked && !isDev) {
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

  const active = AWARENESS_VIDEOS[activeIndex] ?? AWARENESS_VIDEOS[0];

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
        {isEnglish ? 'Awareness' : 'التوعية'}
      </div>
      <div className="flex justify-center mb-5">
        <video
          key={active.src}
          src={active.src}
          controls
          className="w-full max-w-[800px] rounded-lg border-2 border-[#84333c]"
          aria-label={isEnglish ? active.titleEn : active.titleAr}
        >
          متصفحك لا يدعم تشغيل الفيديو.
        </video>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {AWARENESS_VIDEOS.map((v, i) => (
          <button
            key={v.src}
            onClick={() => setActiveIndex(i)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold border-2 transition-all duration-200 cursor-pointer ${
              i === activeIndex
                ? 'bg-[#84333c] text-white border-[#84333c]'
                : 'bg-white text-[#84333c] border-[#84333c] hover:bg-[#f3e8eb]'
            }`}
          >
            {isEnglish ? v.titleEn : v.titleAr}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AwarenessIndex;