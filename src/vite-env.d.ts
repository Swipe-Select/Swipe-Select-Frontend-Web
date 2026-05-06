/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_CLIENT_IDS?: string;
  /** LocationIQ API key: onboarding location search + reverse geocoding + static map */
  readonly VITE_LOCATIONIQ_API_KEY?: string;
  /** Mapbox public access token: onboarding map + geocoding + current location */
  readonly VITE_MAPBOX_ACCESS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
