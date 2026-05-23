// Firebase initialization. Config comes from VITE_FIREBASE_* env vars.
// Project: cisa-cal (num 50267769259). Cloudflare Pages hosts the frontend only;
// all backend (Auth + Firestore) is Firebase.
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
// Re-exported so AI-agent preview scripts can sign in via a single stable
// import path (see CLAUDE.md "Log in (admin)") instead of reaching into
// Vite's internal /node_modules/.vite/deps cache.
export { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || 'cisa-cal.firebaseapp.com',
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || 'cisa-cal',
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || 'cisa-cal.firebasestorage.app',
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || '50267769259',
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// The fixed shared "member" account. The shared password is this account's
// Firebase Auth password, so a wrong password is rejected server-side by
// Firebase (no Cloud Functions needed). Members get view + create.
export const MEMBER_EMAIL = (import.meta.env.VITE_MEMBER_EMAIL as string) || 'members@cisa-cal.web.app';

// Owner email — single source of truth lives in shared/owner.ts. Re-exported
// here so existing imports (src/lib/auth.tsx, src/views/AccessPanel.tsx) don't
// need to change.
export { OWNER_EMAIL } from '../../shared/owner';
