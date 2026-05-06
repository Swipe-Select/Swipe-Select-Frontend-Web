const splitAndClean = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export function getGoogleClientIdCandidates() {
  const primary = splitAndClean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const multi = splitAndClean(import.meta.env.VITE_GOOGLE_CLIENT_IDS);
  return Array.from(new Set([...primary, ...multi]));
}

export function hasGoogleClientIdCandidates() {
  return getGoogleClientIdCandidates().length > 0;
}
