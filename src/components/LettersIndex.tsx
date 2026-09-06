import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { lettersData, lettersOrder } from '../data/lettersData';
import { englishLettersData, englishLettersOrder } from '../data/englishLettersData';
import LetterImage from './LetterImage';
import { useCourseState, CourseType } from '../utils/courseState';
import { LetterData } from '../types';
import LogoWithImage from './LogoWithImage';
import { useCourseAvailability } from '../context/CourseAvailabilityContext';
import { getAuthState } from '../utils/auth';

const LettersIndex: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [course, setCourse] = useCourseState();
  const [lockedCourse, setLockedCourse] = useState<CourseType | null>(null);
  const { courses: availability } = useCourseAvailability();
  interface CourseData {
    letters: string[];
    data: Record<string, LetterData>;
    title: string;
  }

  const getDataForCourse = useCallback((selectedCourse: string): CourseData => {
    switch (selectedCourse) {
      case 'english':
        return {
          letters: englishLettersOrder,
          data: englishLettersData,
          title: 'English Sign Language Alphabet Index'
        };
      case 'arabic':
      default:
        return {
          letters: lettersOrder,
          data: lettersData,
          title: 'فَهْرَسُ الْأبَجَدِيَّةِ الْإِشَارَّيَّةِ الْعَرَبَيّةِ الْأُرْدُنِيةِ'
        };
    }
  }, []);

  const [currentData, setCurrentData] = useState<CourseData>(getDataForCourse('arabic'));

  useEffect(() => {
    setCurrentData(getDataForCourse(course));
  }, [course, getDataForCourse]);

  const lettersPerPage = Math.ceil(currentData.letters.length / 2);

  const handleLetterClick = (letter: string) => {
    navigate(`/worksheet/${letter}`);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < 2) {
      setCurrentPage(currentPage + 1);
    } else {
      // Go to first letter
      const firstLetter = currentData.letters[0];
      if (firstLetter) {
        navigate(`/worksheet/${firstLetter}`);
      }
    }
  };

  const renderPage = (page: number) => {
    const start = (page - 1) * lettersPerPage;
    const end = start + lettersPerPage;
    const pageLetters = currentData.letters.slice(start, end);

    return pageLetters.map(letter => {
      const letterData = currentData.data[letter];
      if (!letterData) return null;

      return (
        <div
          key={letter}
          className="bg-gradient-to-br from-[#ffd700] to-[#f0d000] border-2 border-[#84333c] rounded-2xl shadow-sm w-[140px] h-[180px] lg:w-[180px] lg:h-[240px] flex flex-col items-center justify-start cursor-pointer transition-transform duration-150 p-0 hover:scale-105 hover:shadow-[0_8px_24px_rgba(132,51,60,0.18)] hover:border-[#a45a64]"
          onClick={() => handleLetterClick(letter)}
          title={letterData.name}
        >
          <div className="w-full h-[60%] rounded-t-[14px] border-2 border-[#84333c] border-b-0 bg-white overflow-hidden block">
            <LetterImage 
              letter={letter}
              alt={letter}
              className="w-full h-full object-cover block border-none rounded-none m-0 p-0"
            />
          </div>
          <div className="flex flex-col items-center justify-center mt-2 gap-1" style={{ direction: course === 'english' ? 'ltr' : 'rtl' }}>
            <span className="text-[1em] text-[#5a2428] font-semibold text-center inline-block align-middle mx-2">
              {letterData.name.includes(' ') ? (
                <>
                  <span className="block leading-[1.1]">{letterData.name.split(' ')[0]}</span>
                  <span className="block leading-[1.1]">{letterData.name.split(' ').slice(1).join(' ')}</span>
                </>
              ) : (
                letterData.name
              )}
            </span>
          </div>
        </div>
      );
    });
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const isEnglish = course === 'english';

  const englishLocked = availability.english.locked;

  const handleCourseSelection = (targetCourse: CourseType) => {
    const isDev = getAuthState().user?.role === 'developer';
    if (!isDev && availability[targetCourse]?.locked) {
      setLockedCourse(targetCourse);
      return;
    }

    if (course !== targetCourse) {
      setCourse(targetCourse);
      setCurrentPage(1);
    }
  };

  const labels = {
    profile: isEnglish ? '👤 Profile' : '👤 الملف الشخصي',
    arabicCourse: isEnglish ? 'Arabic Language' : 'اللغة العربية',
    englishCourse: englishLocked
      ? isEnglish ? '🔒 English Language' : '🔒 اللغة الإنجليزية'
      : isEnglish ? 'English Language' : 'اللغة الإنجليزية',
    previousPage: isEnglish ? 'Previous Page' : 'الصفحة السابقة',
    nextPage: isEnglish ? 'Next Page' : 'الصفحة التالية',
    goFirstLetter: isEnglish ? 'Go to First Letter' : 'انتقل إلى أول حرف',
    pageIndicator: isEnglish ? `Page ${currentPage} of 2` : `صفحة ${currentPage} من 2`,
    lockedTitle: isEnglish ? 'Course Locked' : 'المحتوى مقفل',
    lockedBody: (target: CourseType) => {
      if (target === 'english') {
        return isEnglish
          ? 'The English course is currently locked by the administrator.'
          : 'محتوى اللغة الإنجليزية مقفل حالياً.';
      }
      return isEnglish
        ? 'This course is currently locked.'
        : 'هذا المحتوى مقفل حالياً.';
    },
    lockedOk: isEnglish ? 'OK' : 'حسناً'
  };

  return (
    <div className="bg-white rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.15)] border-[3px] border-[#84333c] p-[30px] lg:p-[40px_30px_30px_30px] mt-10 mx-auto relative w-full max-w-[1100px] lg:max-w-[98vw]" dir={isEnglish ? 'ltr' : 'rtl'} style={{ direction: isEnglish ? 'ltr' : 'rtl' }}>
      <div className="flex justify-between items-center mb-5">
        <div className="hidden lg:flex absolute top-[25px] left-[25px] z-[100] bg-white rounded-md border-2 border-[#84333c] w-[150px] h-[150px] lg:w-[200px] lg:h-[200px] p-[10px] items-center justify-center">
          <LogoWithImage 
            logoPath="qra-logo.svg"
            className="w-full h-auto block"
          />
        </div>
        <button
          className="bg-[#84333c] text-white border-none rounded-lg py-3 px-5 text-base font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_12px_rgba(132,51,60,0.3)] hover:bg-[#a45a64] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(132,51,60,0.4)]"
          onClick={() => navigate('/numbers')}
          aria-label="الأعداد"
        >
          الأعداد
        </button>
        <button
          className="bg-[#84333c] text-white border-none rounded-lg py-3 px-5 text-base font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_12px_rgba(132,51,60,0.3)] hover:bg-[#a45a64] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(132,51,60,0.4)] ml-auto"
          onClick={handleProfileClick}
        >
          {labels.profile}
        </button>
      </div>

      <div className="flex justify-center gap-5 mb-[30px] flex-wrap">
        <button
          className={`py-[15px] px-[20px] min-w-[200px] lg:min-w-[250px] text-center border-2 border-[#84333c] rounded-lg text-base cursor-pointer transition-all duration-200 active:translate-y-px ${course === 'arabic' ? 'bg-[#84333c] text-white' : 'bg-white text-[#333] hover:bg-[#84333c] hover:text-white'}`}
          onClick={() => setCourse('arabic')}
        >
          {labels.arabicCourse}
        </button>
        <button
          className={`py-[15px] px-[20px] min-w-[200px] lg:min-w-[250px] text-center border-2 border-[#84333c] rounded-lg text-base cursor-pointer transition-all duration-200 active:translate-y-px ${course === 'english' ? 'bg-[#84333c] text-white' : 'bg-white text-[#333] hover:bg-[#84333c] hover:text-white'} ${englishLocked ? 'opacity-60 cursor-not-allowed relative hover:bg-gray-100 hover:text-[#666] hover:border-[#ccc] hover:transform-none' : ''}`}
          onClick={() => handleCourseSelection('english')}
        >
          {labels.englishCourse}
        </button>
        <button
          className={`py-[15px] px-[20px] min-w-[200px] lg:min-w-[250px] text-center border-2 border-[#84333c] rounded-lg text-base cursor-pointer transition-all duration-200 active:translate-y-px ${location.pathname === '/numbers' ? 'bg-[#84333c] text-white' : 'bg-white text-[#333] hover:bg-[#84333c] hover:text-white'}`}
          onClick={() => navigate('/numbers')}
        >
          الأعداد
        </button>
      </div>
      
      <div className="text-center text-[2.5em] text-[#84333c] mb-[30px] font-bold drop-shadow-[1px_1px_2px_rgba(255,255,255,0.8)]">
        {currentData.title}
      </div>
      
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] lg:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[15px] lg:gap-[40px] justify-items-center" style={{ direction: isEnglish ? 'ltr' : 'rtl' }}>
        {renderPage(currentPage)}
      </div>
      
      <div className="flex justify-center items-center gap-[30px] mt-[40px]" style={{ direction: isEnglish ? 'ltr' : 'rtl' }}>
        <button 
          className="bg-[#84333c] text-white border-none rounded-md py-3 px-8 text-xl cursor-pointer transition-colors duration-200 disabled:bg-[#ccc] disabled:cursor-not-allowed"
          onClick={handlePrevPage}
          disabled={currentPage === 1}
        >
          {labels.previousPage}
        </button>
        <span className="text-[1.2em] text-[#84333c] font-bold">
          {labels.pageIndicator}
        </span>
        <button 
          className="bg-[#84333c] text-white border-none rounded-md py-3 px-8 text-xl cursor-pointer transition-colors duration-200 disabled:bg-[#ccc] disabled:cursor-not-allowed"
          onClick={handleNextPage}
        >
          {currentPage === 2 ? labels.goFirstLetter : labels.nextPage}
        </button>
      </div>

      {lockedCourse && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] animate-[fadeIn_0.3s_ease]" onClick={() => setLockedCourse(null)}>
          <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-[30px] max-w-[500px] w-[90%] relative animate-[slideDown_0.3s_ease] border-[3px] border-[#84333c]" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-[15px] right-[15px] bg-none border-none text-[32px] text-[#84333c] cursor-pointer w-[35px] h-[35px] flex items-center justify-center rounded-full transition-all duration-200 hover:bg-[#f5f5f5] hover:rotate-90" onClick={() => setLockedCourse(null)}>&times;</button>
            <div className="text-[1.8em] text-[#84333c] font-bold text-center mb-[20px] pt-[10px]">{labels.lockedTitle}</div>
            <div className="text-center mb-[25px]">
              <p className="m-[15px_0] text-[1.1em] leading-[1.6] text-[#333]">
                {labels.lockedBody(lockedCourse)}
              </p>
            </div>
            <button className="bg-[#84333c] text-white border-none rounded-lg py-[12px] px-[40px] text-[1.1em] font-semibold cursor-pointer block mx-auto transition-all duration-300 shadow-[0_4px_12px_rgba(132,51,60,0.3)] hover:bg-[#a45a64] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(132,51,60,0.4)]" onClick={() => setLockedCourse(null)}>{labels.lockedOk}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LettersIndex;
