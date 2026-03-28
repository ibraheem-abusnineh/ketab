import React from 'react';
import './PrintButton.css';

interface PrintButtonProps {
  className?: string;
  label?: string;
  isEnglish?: boolean;
}

const PrintButton: React.FC<PrintButtonProps> = ({ 
  className = '', 
  label,
  isEnglish = false 
}) => {
  const handlePrint = () => {
    window.print();
  };

  const defaultLabel = isEnglish ? 'Print' : 'طباعة';

  return (
    <button
      type="button"
      className={`print-button ${className}`}
      onClick={handlePrint}
      aria-label={label || defaultLabel}
    >
      <span className="print-icon">🖨️</span>
      <span className="print-text">{label || defaultLabel}</span>
    </button>
  );
};

export default PrintButton;

