import React from 'react';
import { BRAND_NAME } from '../brand';

interface SwipeSelectLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  textClassName?: string;
  style?: React.CSSProperties;
}

export const SwipeSelectLogo: React.FC<SwipeSelectLogoProps> = ({
  size = 32,
  showText = false,
  className = '',
  textClassName = '',
  style,
}) => {
  return (
    <div
      className={`swipe-select-logo-container ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: showText ? 10 : 0,
        ...style,
      }}
    >
      <img
        src="/assets/swipe-select-logo.png"
        alt={`${BRAND_NAME} Logo`}
        width={size}
        height={size}
        className="swipe-select-logo-img"
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          display: 'block',
          borderRadius: Math.round(size * 0.22),
          objectFit: 'cover',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
          transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 200ms ease',
          userSelect: 'none',
        }}
        draggable={false}
      />

      {showText && (
        <span
          className={`swipe-select-logo-text ${textClassName}`.trim()}
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

export default SwipeSelectLogo;
