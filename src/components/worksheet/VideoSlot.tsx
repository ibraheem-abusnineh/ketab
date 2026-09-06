import React from 'react';
import './VideoSlot.css';

interface VideoSlotProps {
  videoUrl?: string;
  className?: string;
}

/**
 * Renders the trimmed `public/numbers/{n}.mp4` clip when `videoUrl`
 * is provided (the live data wires `videoUrl = /numbers/{n}.mp4`
 * for every number 0..10). Falls back to a dashed-border placeholder
 * matching the prototype's "أضِفه لاحقًا" affordance when no clip
 * is available, so the worksheet never looks broken during future
 * asset swaps.
 */
const VideoSlot: React.FC<VideoSlotProps> = ({ videoUrl, className = '' }) => {
  return (
    <div className={`video-slot ${className}`.trim()}>
      {videoUrl ? (
        <video
          src={videoUrl}
          controls
          className="video-slot-player"
          aria-label="فيديو شرح العدد"
        />
      ) : (
        <>
          <span className="video-slot-icon" aria-hidden="true">▶</span>
          <span className="video-slot-label">فيديو الشرح — سيضاف لاحقًا</span>
        </>
      )}
    </div>
  );
};

export default VideoSlot;
