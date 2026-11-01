import React from 'react';

interface SlushyLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const SlushyLogo: React.FC<SlushyLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };

  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-600 to-fuchsia-600 p-0.5 shadow-[0_0_20px_rgba(0,242,254,0.45)] ${sizeMap[size]} ${className}`}
    >
      <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden relative">
        {/* Glow backdrop inside */}
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 via-transparent to-fuchsia-500/20" />

        {/* Stylized Slushy Glass with Straw (Vasito con pitillo) */}
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-4/5 h-4/5 relative z-10 drop-shadow-[0_0_8px_rgba(0,242,254,0.8)]"
        >
          {/* Neon Straw (Pitillo saliendo inclinado del vaso) */}
          <path
            d="M 38 6 L 46 16 L 36 34"
            stroke="#FF007F"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="filter drop-shadow-[0_0_6px_#FF007F]"
          />
          {/* Straw stripe accent */}
          <path
            d="M 40 8 L 44 14"
            stroke="#FFE600"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Domo de Hielo Escarchado (Frosted Ice Dome) */}
          <path
            d="M 21 24 C 21 16, 43 16, 43 24 Z"
            fill="url(#iceGradient)"
            stroke="#00F2FE"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Ice Crystal Sparkles inside dome */}
          <circle cx="28" cy="20" r="1.5" fill="#FFFFFF" />
          <circle cx="35" cy="18" r="1.2" fill="#00FFE0" />
          <circle cx="32" cy="22" r="1" fill="#FF007F" />

          {/* Vaso Cónico Transparente (Cup Body) */}
          <path
            d="M 18 24 L 24 54 C 24.5 56.5, 39.5 56.5, 40 54 L 46 24 Z"
            fill="url(#slushyLiquidGradient)"
            stroke="#00F2FE"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Vaso Rim Line (Borde del vaso) */}
          <ellipse
            cx="32"
            cy="24"
            rx="14"
            ry="3.5"
            stroke="#00FFE0"
            strokeWidth="2"
            fill="none"
          />

          {/* Wave Lines inside Slushy (Ondas de granizado congelado) */}
          <path
            d="M 22 36 Q 28 32, 32 36 T 42 36"
            stroke="#00F2FE"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M 23 44 Q 28 41, 32 44 T 41 44"
            stroke="#D946EF"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Glass Gloss / Reflection */}
          <path
            d="M 22 27 L 26 51"
            stroke="#FFFFFF"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.6"
          />

          {/* Gradients */}
          <defs>
            <linearGradient id="iceGradient" x1="21" y1="16" x2="43" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00F2FE" stopOpacity="0.85" />
              <stop offset="0.6" stopColor="#D946EF" stopOpacity="0.85" />
              <stop offset="1" stopColor="#00FFE0" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="slushyLiquidGradient" x1="18" y1="24" x2="46" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0A1128" stopOpacity="0.9" />
              <stop offset="0.4" stopColor="#083344" stopOpacity="0.95" />
              <stop offset="0.8" stopColor="#701A75" stopOpacity="0.95" />
              <stop offset="1" stopColor="#0369A1" stopOpacity="0.9" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};
