import type { ReactNode } from 'react';

// Web build: AdMob only runs in the Android/iOS app (see Ads.native.tsx), so these render nothing.
export function AdsProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function AdBanner(_props: { style?: object }) {
  return null;
}

export function NativeAdCard(_props: { style?: object }) {
  return null;
}
