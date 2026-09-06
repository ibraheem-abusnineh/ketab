import React from 'react';
import { useNavigate } from 'react-router-dom';
import LogoWithImage from './LogoWithImage';
import { useCourseAvailability } from '../context/CourseAvailabilityContext';
import { getAuthState } from '../utils/auth';

const AWARENESS_VIDEO_URL = '/awareness/awareness.mp4';

const AwarenessIndex: React.FC = () => {
  const navigate = useNavigate();
  const { courses: availability } = useCourseAvailability();
  const awarenessLocked = availability.awareness?.locked;
  const isDev = getAuthState().user?.role === 'developer';

  if (awarenessLocked && !isDev) {
    return (
      <div
        className="bg-white rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.15)] border-[3px] border-[#84333c] p-[30px] lg:p-[40px_30px_30px_30px] mt-10 mx-auto relative w-full max-w-[1100px] lg:max-w-[98vw]"
        dir="rtl"
        style={{ direction: 'rtl' }}
      >
        <div className="flex justify-between items-center mb-5">
          <div className="hidden lg:flex absolute top-[25px] right-[25px] z-[100] bg-white rounded-md border-2 border-[#84333c] w-[150px] h-[150px] lg:w-[200px] lg:h-[200px] p-[10px] items-center justify-center">
            <LogoWithImage
              logoPath="qra-logo.svg"
              className="w-full h-auto block"
            />
          </div>
          <button
            className="bg-[#84333c] text-white border-none rounded-lg py-3 px-5 text-base font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_12px_rgba(132,51,60,0.3)] hover:bg-[#a45a64] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(132,51,60,0.4)] ml-auto"
            onClick={() => navigate('/letters')}
          >
            الحروف
          </button>
        </div>
        <div className="text-center text-[2.2em] text-[#84333c] mb-[30px] font-bold drop-shadow-[1px_1px_2px_rgba(255,255,255,0.8)]">
          المحتوى مقفل
        </div>
        <p className="text-center text-[1.1em] text-[#333] leading-[1.6]">
          محتوى التوعية مقفل حالياً.
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.15)] border-[3px] border-[#84333c] p-[30px] lg:p-[40px_30px_30px_30px] mt-10 mx-auto relative w-full max-w-[1100px] lg:max-w-[98vw]"
      dir="rtl"
      style={{ direction: 'rtl' }}
    >
      <div className="flex justify-between items-center mb-5">
        <div className="hidden lg:flex absolute top-[25px] right-[25px] z-[100] bg-white rounded-md border-2 border-[#84333c] w-[150px] h-[150px] lg:w-[200px] lg:h-[200px] p-[10px] items-center justify-center">
          <LogoWithImage
            logoPath="qra-logo.svg"
            className="w-full h-auto block"
          />
        </div>
        <button
          className="bg-[#84333c] text-white border-none rounded-lg py-3 px-5 text-base font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_12px_rgba(132,51,60,0.3)] hover:bg-[#a45a64] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(132,51,60,0.4)] ml-auto"
          onClick={() => navigate('/letters')}
        >
          الحروف
        </button>
      </div>
      <div className="text-center text-[2.2em] text-[#84333c] mb-[30px] font-bold drop-shadow-[1px_1px_2px_rgba(255,255,255,0.8)]">
        التوعية
      </div>
      <div className="flex justify-center">
        <video
          src={AWARENESS_VIDEO_URL}
          controls
          className="w-full max-w-[800px] rounded-lg border-2 border-[#84333c]"
          aria-label="فيديو التوعية"
        >
          متصفحك لا يدعم تشغيل الفيديو.
        </video>
      </div>
    </div>
  );
};

export default AwarenessIndex;