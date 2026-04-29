/** Local auth assets served from /public/assets. */
const BASE = "/assets";

export const signUpAssets = {
  featureInsights: `${BASE}/feature-insights.svg`,
  featureNetwork: `${BASE}/feature-network.svg`,
  featureCoaching: `${BASE}/feature-coaching.svg`,
  google: `${BASE}/google-signup.svg`,
} as const;

export const loginAssets = {
  google: `${BASE}/google-login.svg`,
  passwordToggle: `${BASE}/password-toggle.svg`,
} as const;
