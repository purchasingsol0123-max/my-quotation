import React from 'react';

interface SmsiLogoProps {
  className?: string;
  compact?: boolean;
}

export const SmsiLogo: React.FC<SmsiLogoProps> = ({
  className = 'h-16 w-auto',
  compact = false,
}) => {
  if (compact) {
    // Compact square emblem for collapsed sidebar
    return (
      <svg
        viewBox="0 0 110 100"
        className={className}
        role="img"
        aria-label="SMSI Logo"
      >
        <defs>
          <linearGradient id="smsiOrangeC" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="60%" stopColor="#EA8C1E" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="smsiBlueC" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="50%" stopColor="#3B4990" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        </defs>
        {/* Top Orange Swoosh Arm */}
        <path
          d="M 102 18 C 68 2, 16 14, 16 54 C 16 74, 34 86, 48 88 L 52 82 L 42 75 L 48 73 L 38 69 C 28 63, 28 44, 44 30 C 60 16, 84 14, 102 18 Z"
          fill="url(#smsiOrangeC)"
        />
        {/* Bottom Blue Swoosh Arm */}
        <path
          d="M 8 84 C 42 98, 94 86, 94 48 C 94 28, 76 16, 62 14 L 58 20 L 68 27 L 62 29 L 72 33 C 82 39, 82 58, 66 72 C 50 86, 26 88, 8 84 Z"
          fill="url(#smsiBlueC)"
        />
        {/* Center Wireframe Globe */}
        <g transform="translate(55, 51)" stroke="#1D63B8" strokeWidth="2" fill="none">
          <circle r="17" />
          <ellipse rx="17" ry="6" transform="rotate(-18)" />
          <ellipse rx="17" ry="12" transform="rotate(-18)" />
          <ellipse rx="6" ry="17" transform="rotate(-18)" />
          <ellipse rx="12" ry="17" transform="rotate(-18)" />
          <line x1="-17" y1="0" x2="17" y2="0" transform="rotate(-18)" />
          <line x1="0" y1="-17" x2="0" y2="17" transform="rotate(-18)" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 380 115"
      className={className}
      role="img"
      aria-label="SMSI Human Capital Solutions Logo"
    >
      <defs>
        <linearGradient id="smsiOrange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5A623" />
          <stop offset="55%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#9A5B13" />
        </linearGradient>
        <linearGradient id="smsiBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8E9CE6" />
          <stop offset="50%" stopColor="#3B4990" />
          <stop offset="100%" stopColor="#090D26" />
        </linearGradient>
        <filter id="swooshShadow" x="-10%" y="-10%" width="125%" height="125%">
          <feDropShadow dx="2" dy="2" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Top Orange Reaching Hand Swoosh */}
      <path
        filter="url(#swooshShadow)"
        d="M 255 18 C 185 -4, 66 8, 66 56 C 66 74, 88 86, 114 91 L 122 89 L 112 83 L 120 82 L 106 76 L 114 72 L 102 72 C 88 64, 86 46, 108 32 C 136 14, 198 10, 255 18 Z"
        fill="url(#smsiOrange)"
      />

      {/* Bottom Blue Reaching Hand Swoosh */}
      <path
        filter="url(#swooshShadow)"
        d="M 10 96 C 82 114, 186 102, 186 58 C 186 40, 166 28, 142 22 L 134 24 L 144 30 L 136 31 L 150 37 L 142 41 L 154 41 C 166 49, 166 68, 144 82 C 116 98, 62 102, 10 96 Z"
        fill="url(#smsiBlue)"
      />

      {/* Center Blue Wireframe Globe */}
      <g transform="translate(126, 57) rotate(-18)" stroke="#1860B8" strokeWidth="1.8" fill="none">
        <circle r="21" fill="#FFFFFF" />
        <circle r="21" />
        <ellipse rx="21" ry="7" />
        <ellipse rx="21" ry="14" />
        <ellipse rx="7" ry="21" />
        <ellipse rx="14" ry="21" />
        <line x1="-21" y1="0" x2="21" y2="0" />
        <line x1="0" y1="-21" x2="0" y2="21" />
      </g>

      {/* SMSI Outlined Corporate Letters */}
      <g transform="translate(196, 36)">
        {/* S */}
        <path
          d="M 38 6 H 12 C 6 6, 4 10, 4 14 C 4 18, 6 21, 12 21 H 32 C 38 21, 41 25, 41 30 C 41 35, 38 39, 32 39 H 4"
          fill="none"
          stroke="#2E3B78"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* M */}
        <path
          d="M 52 39 V 7 L 76 28 L 100 7 V 39"
          fill="none"
          stroke="#2E3B78"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* S */}
        <path
          d="M 148 6 H 122 C 116 6, 114 10, 114 14 C 114 18, 116 21, 122 21 H 142 C 148 21, 151 25, 151 30 C 151 35, 148 39, 142 39 H 114"
          fill="none"
          stroke="#2E3B78"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* I */}
        <path
          d="M 164 6 V 39"
          fill="none"
          stroke="#2E3B78"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* Tagline: Human Capital Solutions */}
        <text x="2" y="54" fontSize="11.5" fontFamily="Plus Jakarta Sans, sans-serif" letterSpacing="0.3">
          <tspan fill="#9CA3AF" fontWeight="500">Human Capital </tspan>
          <tspan fill="#4B5563" fontWeight="600">Sol</tspan>
          <tspan fill="#EA8C1E" fontWeight="700">utions</tspan>
        </text>
      </g>
    </svg>
  );
};
