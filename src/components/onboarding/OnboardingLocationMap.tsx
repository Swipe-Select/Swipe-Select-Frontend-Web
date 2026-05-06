import { forwardRef, useImperativeHandle, useMemo, useState } from "react";

export type OnboardingLocationMapHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
};

type Props = {
  accessToken: string;
  lngLat: { lng: number; lat: number };
};

export const OnboardingLocationMap = forwardRef<OnboardingLocationMapHandle, Props>(
  function OnboardingLocationMap({ accessToken, lngLat }, ref) {
    const [zoom, setZoom] = useState(11);

    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        setZoom((z) => Math.min(18, z + 1));
      },
      zoomOut: () => {
        setZoom((z) => Math.max(2, z - 1));
      },
    }));

    const mapSrc = useMemo(() => {
      const p = new URLSearchParams({
        key: accessToken,
        center: `${lngLat.lat},${lngLat.lng}`,
        zoom: String(zoom),
        size: "1280x900",
        markers: `icon:small-red-cutout|${lngLat.lat},${lngLat.lng}`,
      });
      return `https://maps.locationiq.com/v3/staticmap?${p.toString()}`;
    }, [accessToken, lngLat.lat, lngLat.lng, zoom]);

    return (
      <img
        src={mapSrc}
        alt="Location preview map"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  },
);
