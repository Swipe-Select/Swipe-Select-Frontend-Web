export type LocationIqLocationRow = {
  label: string;
  city: string;
  region: string;
  country?: string;
  source: "locationiq";
  lngLat: [number, number];
};

type LocationIqFeature = {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
};

function featureToRow(feature: LocationIqFeature): LocationIqLocationRow | null {
  const label = feature.display_name?.trim();
  const lat = Number(feature.lat);
  const lon = Number(feature.lon);
  if (!label || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const city =
    feature.address?.city ||
    feature.address?.town ||
    feature.address?.village ||
    feature.address?.county ||
    label.split(",")[0]?.trim() ||
    "Unknown";
  const country = feature.address?.country?.trim();
  const regionParts = [feature.address?.state, country].filter(Boolean) as string[];
  const region = regionParts.length ? regionParts.join(", ") : label;

  return {
    label,
    city,
    region,
    country,
    source: "locationiq",
    lngLat: [lon, lat],
  };
}

export async function mapboxForwardGeocode(
  query: string,
  accessToken: string,
  options?: { limit?: number },
  signal?: AbortSignal,
): Promise<LocationIqLocationRow[]> {
  const q = query.trim();
  if (!q) return [];
  const limit = String(options?.limit ?? 8);
  const params = new URLSearchParams({
    key: accessToken,
    q,
    format: "json",
    addressdetails: "1",
    limit,
    normalizecity: "1",
  });
  const url = `https://us1.locationiq.com/v1/search.php?${params.toString()}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (res.status === 401 || res.status === 403) {
    throw new Error("LOCATIONIQ_AUTH");
  }
  if (!res.ok) return [];
  const json = (await res.json()) as LocationIqFeature[];
  const rows: LocationIqLocationRow[] = [];
  for (const f of json ?? []) {
    const row = featureToRow(f);
    if (row) rows.push(row);
  }
  return rows;
}

export async function mapboxReverseGeocode(
  lng: number,
  lat: number,
  accessToken: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const params = new URLSearchParams({
    key: accessToken,
    lat: String(lat),
    lon: String(lng),
    format: "json",
    normalizecity: "1",
  });
  const url = `https://us1.locationiq.com/v1/reverse.php?${params.toString()}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (res.status === 401 || res.status === 403) {
    throw new Error("LOCATIONIQ_AUTH");
  }
  if (!res.ok) return null;
  const json = (await res.json()) as { display_name?: string };
  return json.display_name?.trim() ?? null;
}
