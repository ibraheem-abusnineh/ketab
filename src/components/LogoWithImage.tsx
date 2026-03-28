import React, { useState, useEffect } from 'react';
import './LogoWithImage.css';

interface LogoWithImageProps {
  logoPath?: string;
  className?: string;
}

const PUBLIC_URL = process.env.PUBLIC_URL || '';

const LogoWithImage: React.FC<LogoWithImageProps> = ({
  logoPath = 'qra-logo.svg',
  className = ''
}) => {
  const [logoExists, setLogoExists] = useState(false);

  // Check if logo exists
  useEffect(() => {
    const fullPath = logoPath.startsWith('http') || logoPath.startsWith('data:') 
      ? logoPath 
      : `${PUBLIC_URL}${logoPath.startsWith('/') ? '' : '/'}${logoPath}`;

    const img = new Image();
    img.onload = () => setLogoExists(true);
    img.onerror = () => setLogoExists(false);
    img.src = fullPath;
  }, [logoPath]);

  // If logo doesn't exist, don't render anything
  if (!logoExists) {
    return null;
  }

  const fullLogoPath = logoPath.startsWith('http') || logoPath.startsWith('data:') 
    ? logoPath 
    : `${PUBLIC_URL}${logoPath.startsWith('/') ? '' : '/'}${logoPath}`;

  return (
    <div className={`flex items-center justify-center w-full h-full p-2 ${className}`}>
      <img 
        src={fullLogoPath} 
        alt="Logo" 
        className="max-w-full max-h-full object-contain block" 
      />
    </div>
  );
};

export default LogoWithImage;

