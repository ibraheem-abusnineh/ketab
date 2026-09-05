import React, { useState, useEffect } from 'react';

interface NumberSignImageProps {
  number: number;
  src?: string;
  alt?: string;
  className?: string;
}

/**
 * Graceful placeholder for a hand-sign (Arabic sign language) image
 * keyed by a number. Mirrors LetterImage.tsx's behavior: while src is
 * undefined, render a placeholder box. When a real image URL is
 * provided, render it. The placeholder is intentionally visual (not
 * a broken image) so the worksheet doesn't look unfinished before
 * per-number assets are added.
 */
const NumberSignImage: React.FC<NumberSignImageProps> = ({
  number,
  src,
  alt,
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  const safeAlt = alt ?? `لغة الإشارة للعدد ${number}`;

  if (!src || imageError) {
    return (
      <div
        className={`number-sign-placeholder ${className}`}
        aria-label={safeAlt}
        role="img"
      >
        <span className="number-sign-placeholder-icon" aria-hidden="true">✋</span>
        <span className="number-sign-placeholder-label">
          إشارة العدد {number} — ستضاف لاحقًا
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={safeAlt}
      className={className}
      onError={() => setImageError(true)}
    />
  );
};

export default NumberSignImage;
