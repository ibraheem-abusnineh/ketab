import React from 'react';
import './CoursePickerModal.css';

interface Props {
  open: boolean;
  userName?: string;
  onPick: (course: 'letters' | 'numbers') => void;
}

const CoursePickerModal: React.FC<Props> = ({ open, userName, onPick }) => {
  if (!open) return null;

  const greeting = userName ? `أهلاً ${userName}!` : 'أهلاً!';

  return (
    <div
      className="course-picker-overlay"
      role="dialog"
      aria-modal="true"
      dir="rtl"
      lang="ar"
    >
      <div className="course-picker-modal">
        <div className="course-picker-title">{greeting}</div>
        <div className="course-picker-subtitle">اختر ما تريد تعلّمه</div>

        <div className="course-picker-buttons">
          <button
            type="button"
            className="course-picker-btn"
            onClick={() => onPick('letters')}
            aria-label="الحروف"
          >
            <span className="course-picker-icon" aria-hidden="true">أ ب ت</span>
            <span className="course-picker-label">الحروف</span>
          </button>

          <button
            type="button"
            className="course-picker-btn"
            onClick={() => onPick('numbers')}
            aria-label="الأعداد"
          >
            <span className="course-picker-icon" aria-hidden="true">١ ٢ ٣</span>
            <span className="course-picker-label">الأعداد</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoursePickerModal;
