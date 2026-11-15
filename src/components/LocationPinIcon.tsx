import React from "react";

export interface LocationPinIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number;
  className?: string;
}

export const LocationPinIcon: React.FC<LocationPinIconProps> = ({
  size = 16,
  className = "",
  style,
  alt = "Location",
  ...rest
}) => {
  return (
    <img
      src="/assets/location-icon-3d.png"
      alt={alt}
      width={size}
      height={size}
      className={`location-pin-3d ${className}`.trim()}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        objectFit: "contain",
        display: "inline-block",
        verticalAlign: "-0.15em",
        flexShrink: 0,
        ...style,
      }}
      loading="lazy"
      draggable={false}
      {...rest}
    />
  );
};

export default LocationPinIcon;
