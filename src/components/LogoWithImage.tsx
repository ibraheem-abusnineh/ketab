import React, { useState, useEffect } from 'react';
import './LogoWithImage.css';

interface LogoWithImageProps {
  logoPath?: string;
  imagePath?: string;
  imageAlt?: string;
  className?: string;
}

const PUBLIC_URL = process.env.PUBLIC_URL || '';

const LogoWithImage: React.FC<LogoWithImageProps> = ({
  logoPath = `${PUBLIC_URL}/qra-logo.svg`,
  imagePath = `${PUBLIC_URL}/logo2.svg`,
  imageAlt = 'Image',
  className = ''
}) => {
  const [logoExists, setLogoExists] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Check if logo exists
  useEffect(() => {
    const fullPath = logoPath.startsWith('http') || logoPath.startsWith('data:') 
      ? logoPath 
      : `${PUBLIC_URL}${logoPath.startsWith('/') ? '' : '/'}${logoPath}`;

    console.log('Attempting to load logo from:', fullPath);
    const img = new Image();
    img.onload = () => {
      console.log('Logo loaded successfully from:', fullPath);
      setLogoExists(true);
    };
    img.onerror = (e) => {
      console.error('Failed to load logo from:', fullPath, e);
      setLogoExists(false);
    };
    img.src = fullPath;
  }, [logoPath]);

  // If logo doesn't exist, don't render anything
  if (!logoExists) {
    console.log('Logo does not exist, not rendering LogoWithImage');
    return null;
  }

  return (
    <div className={`logo-with-image-container ${className}`}>
      <div className="logo-top">
        <img src={logoPath} alt="Logo" className="logo-img" />
      </div>
      <div className="image-under-logo">
        <img 
          src={imagePath} 
          alt={imageAlt} 
          className="under-logo-img"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(false)}
        />
      </div>
    </div>
  );
};

export default LogoWithImage;

