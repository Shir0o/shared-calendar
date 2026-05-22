/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, MEMBER_EMAIL, OWNER_EMAIL } from './firebase';

export type Role = 'member' | 'admin' | 'owner' | 'pending';

interface AuthState {
  user: User | null;
  role: Role | null;
  loading: boolean;
  signInMember: (password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export const emailKey = (email: string) => email.trim().toLowerCase();

async function resolveRole(user: User): Promise<Role> {
  const email = (user.email || '').toLowerCase();
  if (email && email === MEMBER_EMAIL.toLowerCase()) return 'member';
  if (email === OWNER_EMAIL.toLowerCase()) return 'owner';
  // Google user — check approved admins.
  try {
    const snap = await getDoc(doc(db, 'admins', emailKey(email)));
    if (snap.exists() && snap.data().approved === true) return 'admin';
  } catch {
    /* fall through to pending */
  }
  // Not an admin yet — record an access request once so the owner can approve.
  // Only write if absent, to avoid redundant writes / clobbering requestedAt
  // on every page load.
  try {
    const reqRef = doc(db, 'accessRequests', emailKey(email));
    const existing = await getDoc(reqRef);
    if (!existing.exists()) {
      await setDoc(reqRef, { email, requestedAt: serverTimestamp() });
    }
  } catch {
    /* best-effort */
  }
  return 'pending';
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setRole(await resolveRole(u));
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInMember = async (password: string) => {
    await signInWithEmailAndPassword(auth, MEMBER_EMAIL, password);
  };
  const signInGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };
  const signOutUser = async () => {
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signInMember, signInGoogle, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export const canEdit = (role: Role | null) => role === 'admin' || role === 'owner';
