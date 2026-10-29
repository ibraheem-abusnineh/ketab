import React from 'react';

export type IconName =
  | 'grid'
  | 'chart'
  | 'document'
  | 'clock'
  | 'users'
  | 'inbox'
  | 'bell'
  | 'layers'
  | 'logout'
  | 'home'
  | 'key'
  | 'refresh'
  | 'plus'
  | 'upload'
  | 'download'
  | 'print'
  | 'chevron-left'
  | 'chevron-right'
  | 'close'
  | 'check'
  | 'trash'
  | 'database';

const PATHS: Record<IconName, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </>
  ),
  chart: (
    <>
      <path d="M3 21h18" />
      <rect x="5" y="12" width="3" height="6" />
      <rect x="10.5" y="8" width="3" height="10" />
      <rect x="16" y="4" width="3" height="14" />
    </>
  ),
  document: (
    <>
      <path d="M6 2h8l4 4v16H6z" />
      <path d="M14 2v5h5" />
      <path d="M9 13h6M9 17h6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15 14.2c2.8.3 5 2.6 5 5.8" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 4h16v16H4z" />
      <path d="M4 13h4l2 3h4l2-3h4" />
    </>
  ),
  bell: (
    <>
      <path d="M6 17h12l-1.5-2.5V10a4.5 4.5 0 0 0-9 0v4.5z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3 3 8l9 5 9-5-9-5z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 16 9 5 9-5" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H5v16h5" />
      <path d="M14 8l4 4-4 4" />
      <path d="M18 12H9" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8-8M16 4l4 4M14 6l4 4" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-2.3 6" />
      <path d="M20 4v7h-7" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 20h16" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  print: (
    <>
      <path d="M6 9V3h12v6" />
      <path d="M6 18H4v-7h16v7h-2" />
      <path d="M6 14h12v7H6z" />
    </>
  ),
  'chevron-left': <path d="m15 5-7 7 7 7" />,
  'chevron-right': <path d="m9 5 7 7-7 7" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  check: <path d="m4 12 5 5L20 6" />,
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 14h10l1-14" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5.5" rx="7" ry="2.8" />
      <path d="M5 5.5v13c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-13" />
      <path d="M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

const Icon: React.FC<IconProps> = ({ name, size = 16, className }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="square"
    strokeLinejoin="miter"
    aria-hidden="true"
    focusable="false"
  >
    {PATHS[name]}
  </svg>
);

export default Icon;
