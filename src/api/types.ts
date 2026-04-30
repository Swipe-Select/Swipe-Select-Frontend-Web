export type AuthUserPayload = {
  _id: string;
  name: string;
  email: string;
  onboardingStep?: number;
  token: string;
};
