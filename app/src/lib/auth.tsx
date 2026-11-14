import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

interface AuthState {
  user: User | null;
  ready: boolean;
  /** Whether Google sign-in can run here (needs Firebase, and a dev build on phones). */
  canSignIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

// Native Google sign-in needs custom native code, so it is unavailable in
// Expo Go. Load it lazily so the rest of the app still runs there.
function loadNativeGoogle() {
  if (Platform.OS === 'web') return null;
  try {
    const mod = require('@react-native-google-signin/google-signin');
    mod.GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
    return mod.GoogleSignin as {
      hasPlayServices: () => Promise<boolean>;
      signIn: () => Promise<{ type: string; data: { idToken: string | null } | null }>;
      signOut: () => Promise<null>;
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!auth);
  const nativeGoogle = useMemo(loadNativeGoogle, []);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  const value = useMemo<AuthState>(() => ({
    user,
    ready,
    canSignIn: Boolean(auth) && (Platform.OS === 'web' || Boolean(nativeGoogle)),
    async signIn() {
      if (!auth) throw new Error('Firebase is not configured yet.');
      if (Platform.OS === 'web') {
        await signInWithPopup(auth, new GoogleAuthProvider());
        return;
      }
      if (!nativeGoogle) throw new Error('Google sign-in needs a development build of the app.');
      await nativeGoogle.hasPlayServices();
      const res = await nativeGoogle.signIn();
      const idToken = res.data?.idToken;
      if (res.type !== 'success' || !idToken) return; // cancelled
      await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    },
    async signOut() {
      if (!auth) return;
      await fbSignOut(auth);
      await nativeGoogle?.signOut().catch(() => {});
    },
  }), [user, ready, nativeGoogle]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
