// Grants (or with --remove, revokes) admin access for a user.
// The user must have signed in to the app or admin dashboard once first.
//
//   npm run set-admin -- you@gmail.com
//   npm run set-admin -- you@gmail.com --remove
import { FieldValue } from 'firebase-admin/firestore';
import { auth, db } from './admin-sdk.mjs';

const email = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!email) {
  console.error('Usage: npm run set-admin -- <email> [--remove]');
  process.exit(1);
}

const user = await auth.getUserByEmail(email).catch(() => null);
if (!user) {
  console.error(`No user with email ${email}. Sign in once with Google, then re-run.`);
  process.exit(1);
}

if (process.argv.includes('--remove')) {
  await db.doc(`admins/${user.uid}`).delete();
  console.log(`Removed admin: ${email}`);
} else {
  await db.doc(`admins/${user.uid}`).set({ email, addedAt: FieldValue.serverTimestamp() });
  console.log(`Granted admin: ${email} (${user.uid})`);
}
