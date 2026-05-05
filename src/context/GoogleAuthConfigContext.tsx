import { createContext, useContext, type ReactNode } from "react";

type GoogleAuthConfigContextValue = {
  activeClientId: string | null;
  activeIndex: number;
  totalCandidates: number;
  switchToNextClientId: () => boolean;
};

const noopSwitch = () => false;

const GoogleAuthConfigContext = createContext<GoogleAuthConfigContextValue>({
  activeClientId: null,
  activeIndex: 0,
  totalCandidates: 0,
  switchToNextClientId: noopSwitch,
});

export function GoogleAuthConfigProvider({
  value,
  children,
}: {
  value: GoogleAuthConfigContextValue;
  children: ReactNode;
}) {
  return <GoogleAuthConfigContext.Provider value={value}>{children}</GoogleAuthConfigContext.Provider>;
}

export function useGoogleAuthConfig() {
  return useContext(GoogleAuthConfigContext);
}
