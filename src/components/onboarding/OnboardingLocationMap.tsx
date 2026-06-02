import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";

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
    const [imgError, setImgError] = useState(false);

    useImperativeHandle(ref, () => ({
      zoomIn: () => setZoom((z) => Math.min(18, z + 1)),
      zoomOut: () => setZoom((z) => Math.max(2, z - 1)),
    }));

    // LocationIQ static map — try first; free plan may not support it.
    const locationiqSrc = useMemo(() => {
      if (!accessToken) return null;
      const p = new URLSearchParams({
        key: accessToken,
        center: `${lngLat.lat},${lngLat.lng}`,
        zoom: String(zoom),
        size: "640x480",
        markers: `icon:small-red-cutout|${lngLat.lat},${lngLat.lng}`,
      });
      return `https://maps.locationiq.com/v3/staticmap?${p.toString()}`;
    }, [accessToken, lngLat.lat, lngLat.lng, zoom]);

    // OpenStreetMap embed — always free, no key needed, used as fallback.
    const osmSrc = useMemo(() => {
      const half = Math.pow(0.5, zoom - 10) * 0.5;
      const west = (lngLat.lng - half).toFixed(6);
      const east = (lngLat.lng + half).toFixed(6);
      const south = (lngLat.lat - half * 0.75).toFixed(6);
      const north = (lngLat.lat + half * 0.75).toFixed(6);
      return `https://www.openstreetmap.org/export/embed.html?bbox=${west},${south},${east},${north}&layer=mapnik&marker=${lngLat.lat},${lngLat.lng}`;
    }, [lngLat.lat, lngLat.lng, zoom]);

    useEffect(() => { setImgError(false); }, [locationiqSrc]);

    // If LocationIQ hasn't errored, try it first.
    if (locationiqSrc && !imgError) {
      return (
        <img
          src={locationiqSrc}
          alt="Location preview map"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setImgError(true)}
        />
      );
    }

    // Fallback: OpenStreetMap embed — always works, real interactive map.
    return (
      <iframe
        src={osmSrc}
        title="Location preview map"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  },
);
