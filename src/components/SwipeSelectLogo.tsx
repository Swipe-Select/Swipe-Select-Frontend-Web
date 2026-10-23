import React from 'react';
import { BRAND_NAME } from '../brand';

interface SwipeSelectLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  textClassName?: string;
}

export const SwipeSelectLogo: React.FC<SwipeSelectLogoProps> = ({
  size = 32,
  showText = false,
  className = '',
  textClassName = '',
}) => {
  return (
    <div
      className={`swipe-select-logo-container ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: showText ? 10 : 0 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, display: 'block', transition: 'transform 200ms ease' }}
        className="swipe-select-logo-svg"
        aria-label="Swipe Select Logo"
        role="img"
      >
        <defs>
          <linearGradient id="ss-base-grad-react" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>

          <linearGradient id="ss-card-front-react" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0.88" />
          </linearGradient>

          <linearGradient id="ss-card-back-react" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.3" />
          </linearGradient>

          <linearGradient id="ss-spark-grad-react" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>

          <filter id="ss-drop-shadow-react" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#1e1b4b" floodOpacity="0.25" />
          </filter>

          <filter id="ss-card-shadow-react" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.2" />
          </filter>
        </defs>

        {/* Base squircle emblem */}
        <rect
          x="2"
          y="2"
          width="44"
          height="44"
          rx="12"
          fill="url(#ss-base-grad-react)"
          filter="url(#ss-drop-shadow-react)"
        />

        {/* Sheen stroke */}
        <rect
          x="2.5"
          y="2.5"
          width="43"
          height="43"
          rx="11.5"
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth="1"
        />

        {/* Back Card (Layered Tilt Left) */}
        <g transform="rotate(-10 20 25)">
          <rect
            x="10"
            y="11"
            width="18"
            height="24"
            rx="4"
            fill="url(#ss-card-back-react)"
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth="1.2"
          />
        </g>

        {/* Front Card (Active Swipe Action Tilt Right) */}
        <g transform="rotate(7 27 24)" filter="url(#ss-card-shadow-react)">
          <rect
            x="17"
            y="9"
            width="19"
            height="26"
            rx="4"
            fill="url(#ss-card-front-react)"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth="1.2"
          />
          {/* Card micro-content lines */}
          <rect x="20.5" y="14" width="12" height="2" rx="1" fill="#94a3b8" />
          <rect x="20.5" y="18" width="8" height="1.8" rx="0.9" fill="#cbd5e1" />

          {/* Select / Verified Badge */}
          <circle cx="26.5" cy="27" r="4.8" fill="url(#ss-spark-grad-react)" />
          <path
            d="M24.5 27L26 28.5L28.8 25.5"
            stroke="#ffffff"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Dynamic speed curves */}
        <path
          d="M39 17C41 19 41.5 22 41 25"
          stroke="#a5f3fc"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M41 20C42.2 21.5 42.5 23.5 42 25"
          stroke="#38bdf8"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>

      {showText && (
        <span
          className={`swipe-select-logo-text ${textClassName}`}
          style={{
            fontWeight: 800,
            fontSize: size * 0.58,
            letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            userSelect: 'none',
          }}
        >
          {BRAND_NAME}
        </span>
      )}
    </div>
  );
};
