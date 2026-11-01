import React from 'react';

interface SlushCupIconProps {
  className?: string;
  size?: number;
}

export const SlushCupIcon: React.FC<SlushCupIconProps> = ({
  className = 'w-8 h-8',
  size = 32,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Slushy liquid gradient */}
        <linearGradient id="slushGradient" x1="16" y1="26" x2="48" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00F2FE" />
          <stop offset="50%" stopColor="#0080FF" />
          <stop offset="100%" stopColor="#FF007F" />
        </linearGradient>

        {/* Straw neon glow */}
        <linearGradient id="strawGradient" x1="38" y1="4" x2="48" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE600" />
          <stop offset="100%" stopColor="#39FF14" />
        </linearGradient>

        {/* Cup outline glow */}
        <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#00F2FE" floodOpacity="0.7" />
        </filter>
      </defs>

      {/* Straw sticking out from the dome */}
      <path
        d="M48 6L39 24L35 24L43 6C43.5 5 44.5 4.5 45.5 4.5C46.5 4.5 47.5 5 48 6Z"
        fill="url(#strawGradient)"
        stroke="#FFFFFF"
        strokeWidth="1"
      />
      {/* Straw stripes */}
      <line x1="46" y1="9" x2="43" y2="15" stroke="#FF007F" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="42" y1="17" x2="39" y2="23" stroke="#FF007F" strokeWidth="1.5" strokeLinecap="round" />

      {/* Cup Body Base (Trapezoid cup) */}
      <path
        d="M17 26L22.5 56.5C22.8 58 24.2 59 25.8 59H38.2C39.8 59 41.2 58 41.5 56.5L47 26H17Z"
        fill="url(#slushGradient)"
        fillOpacity="0.85"
        stroke="#00F2FE"
        strokeWidth="2"
        strokeLinejoin="round"
        filter="url(#neonGlow)"
      />

      {/* Internal ice crystals / slush texture */}
      <circle cx="28" cy="38" r="2" fill="#FFFFFF" fillOpacity="0.7" />
      <circle cx="36" cy="46" r="2.5" fill="#FFFFFF" fillOpacity="0.6" />
      <circle cx="27" cy="48" r="1.5" fill="#FFFFFF" fillOpacity="0.5" />
      <circle cx="34" cy="34" r="1.8" fill="#FFFFFF" fillOpacity="0.8" />

      {/* Dome Lid */}
      <path
        d="M15 26C15 17 22.5 14 32 14C41.5 14 49 17 49 26H15Z"
        fill="#00F2FE"
        fillOpacity="0.2"
        stroke="#00F2FE"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Dome Lid Rim / Lip */}
      <rect
        x="13"
        y="24"
        width="38"
        height="3.5"
        rx="1.75"
        fill="#0D1117"
        stroke="#00F2FE"
        strokeWidth="1.5"
      />

      {/* Slush wave surface inside dome */}
      <path
        d="M19 25C23 21 27 22 32 20C37 18 41 21 45 25"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />

      {/* Glossy Reflection on Cup */}
      <path
        d="M20 28L23.5 54"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
    </svg>
  );
};
