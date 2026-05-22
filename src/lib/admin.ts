// Owner-only admin management: list/approve/revoke admins and access requests.
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { emailKey } from './auth';

export interface AdminRecord {
  email: string;
  approved: boolean;
  addedBy?: string;
}

export interface AccessRequest {
  email: string;
}

export function subscribeAdmins(cb: (admins: AdminRecord[]) => void): () => void {
  return onSnapshot(collection(db, 'admins'), (snap) =>
    cb(snap.docs.map((d) => ({ email: d.data().email ?? d.id, approved: d.data().approved === true, addedBy: d.data().addedBy }))),
  );
}

export function subscribeRequests(cb: (requests: AccessRequest[]) => void): () => void {
  return onSnapshot(collection(db, 'accessRequests'), (snap) => cb(snap.docs.map((d) => ({ email: d.data().email ?? d.id }))));
}

export async function approveAdmin(email: string, addedBy: string): Promise<void> {
  const key = emailKey(email);
  await setDoc(doc(db, 'admins', key), { email: key, approved: true, addedBy, addedAt: serverTimestamp() });
  await deleteDoc(doc(db, 'accessRequests', key)).catch(() => {});
}

export async function revokeAdmin(email: string): Promise<void> {
  await deleteDoc(doc(db, 'admins', emailKey(email)));
}

export async function dismissRequest(email: string): Promise<void> {
  await deleteDoc(doc(db, 'accessRequests', emailKey(email)));
}
