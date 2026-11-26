import { useEffect } from 'react';
import { Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { doc, increment, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Site-wide visit counters: one Firestore doc per day, /traffic/{YYYY-MM-DD} (India time),
 * with page views and visitor sessions for the website and the app. Only admins can read them.
 */

let appSessionCounted = false;

/** True the first time it's called in a browser tab session / app launch. */
function isNewVisit(): boolean {
  if (Platform.OS !== 'web') {
    if (appSessionCounted) return false;
    appSessionCounted = true;
    return true;
  }
  try {
    if (sessionStorage.getItem('md-visit')) return false;
    sessionStorage.setItem('md-visit', '1');
    return true;
  } catch {
    return false;
  }
}

/** Counts one page view per screen change (and one visit per session). Skipped in development. */
export function usePageVisitCounter() {
  const pathname = usePathname();
  useEffect(() => {
    if (!db || __DEV__) return;
    const web = Platform.OS === 'web';
    const day = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
    const data: Record<string, ReturnType<typeof increment>> = { [web ? 'webViews' : 'appViews']: increment(1) };
    if (isNewVisit()) data[web ? 'webVisits' : 'appVisits'] = increment(1);
    setDoc(doc(db, 'traffic', day), data, { merge: true }).catch(() => {});
  }, [pathname]);
}
