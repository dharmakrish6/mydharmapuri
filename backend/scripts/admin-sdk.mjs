// Shared Firebase Admin setup for the backend scripts.
// Needs a service-account key: Firebase console → Project settings →
// Service accounts → Generate new private key. Save it as
// backend/service-account.json (git-ignored) or point
// GOOGLE_APPLICATION_CREDENTIALS at it.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const keyPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'service-account.json');

if (process.env.FIRESTORE_EMULATOR_HOST) {
  // Local emulator (firebase emulators:start) — no credentials needed.
  initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-mydharmapuri' });
} else if (existsSync(keyPath)) {
  initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  initializeApp({ credential: applicationDefault() });
} else {
  console.error('Missing credentials: save your service-account key as backend/service-account.json');
  process.exit(1);
}

export const db = getFirestore();
export const auth = getAuth();
