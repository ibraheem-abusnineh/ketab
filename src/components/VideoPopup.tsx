import React from 'react';
import { VideoPopupProps } from '../types';
import './VideoPopup.css';

const VideoPopup: React.FC<VideoPopupProps> = ({ 
  isOpen, 
  onClose, 
  videoUrl, 
  word, 
  isLocal = false 
}) => {
  if (!isOpen) return null;

  return (
    <div className="video-popup" onClick={onClose}>
      <div className="video-popup-content" onClick={(e) => e.stopPropagation()}>
        <button className="video-popup-close" onClick={onClose}>
          &times;
        </button>
        
        {word && (
          <div className="video-popup-title">
            فيديو عن الكلمة: <b>{word}</b>
          </div>
        )}
        
        {isLocal && videoUrl ? (
          <video 
            width="560" 
            height="315" 
            controls 
            style={{
              borderRadius: '12px',
              border: '2px dashed #84333c',
              background: '#eee',
              maxWidth: '80vw',
              maxHeight: '60vh'
            }}
          >
            <source src={videoUrl} type="video/mp4" />
            هذا المتصفح لا يدعم تشغيل الفيديو.
          </video>
        ) : videoUrl ? (
          <iframe
            width="560"
            height="315"
            src={videoUrl}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{
              borderRadius: '12px',
              border: '2px dashed #84333c',
              background: '#eee',
              maxWidth: '80vw',
              maxHeight: '60vh'
            }}
          />
        ) : (
          <div style={{
            background: '#eee',
            border: '2px dashed #84333c',
            borderRadius: '12px',
            height: '220px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ color: '#84333c', fontSize: '1.3em' }}>
              مكان الفيديو هنا
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPopup;
