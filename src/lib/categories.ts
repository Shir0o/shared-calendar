// Owner-editable category labels and hues, stored at `config/categories`.
// Schema: { overrides: { [id: CategoryId]: { label?: string; hue?: number } } }
//
// Override values are applied by mutating the shared CATEGORIES / CAT_BY_ID
// arrays in place (see calendar.ts). React picks up the change because every
// consumer mounted under <CalendarApp> reads via useSyncExternalStore on the
// version counter — when overrides arrive, the counter bumps and the whole
// tree re-renders.
import { useSyncExternalStore } from 'react';
import { doc, onSnapshot, setDoc, deleteField } from 'firebase/firestore';
import { db } from './firebase';
import {
  CATEGORIES,
  CAT_BY_ID,
  DEFAULT_CATEGORIES,
  tokensForHue,
  type CategoryId,
} from './calendar';

export interface CategoryOverride {
  label?: string;
  hue?: number;
}
export type CategoryOverrides = Partial<Record<CategoryId, CategoryOverride>>;

let version = 0;
const subscribers = new Set<() => void>();
const notify = () => {
  version++;
  subscribers.forEach((cb) => cb());
};

function applyOverrides(overrides: CategoryOverrides): void {
  DEFAULT_CATEGORIES.forEach((def, i) => {
    const target = CATEGORIES[i];
    const ov = overrides[def.id];
    // Start from defaults so removing an override snaps back.
    target.label = ov?.label?.trim() || def.label;
    if (ov?.hue != null && Number.isFinite(ov.hue)) {
      const t = tokensForHue(ov.hue);
      target.hue = ov.hue;
      target.dot = t.dot;
      target.soft = t.soft;
      target.ink = t.ink;
    } else {
      target.hue = def.hue;
      target.dot = def.dot;
      target.soft = def.soft;
      target.ink = def.ink;
    }
    // Keep CAT_BY_ID's entry === CATEGORIES[i] (we mutate in place, so it is).
    CAT_BY_ID[def.id] = target;
  });
  notify();
}

// Subscribe to the override doc. Returns an unsubscribe function. Call once
// at app startup (CalendarApp).
export function subscribeCategoryOverrides(
  onError?: (e: unknown) => void,
): () => void {
  return onSnapshot(
    doc(db, 'config', 'categories'),
    (snap) => {
      const raw = (snap.exists() ? snap.data().overrides : undefined) as
        | CategoryOverrides
        | undefined;
      applyOverrides(raw ?? {});
    },
    (err) => onError?.(err),
  );
}

// Owner-only writes. Rules enforce.
export async function setCategoryOverride(
  id: CategoryId,
  patch: CategoryOverride,
): Promise<void> {
  // Build dotted-path update so we don't clobber sibling overrides.
  const update: Record<string, unknown> = {};
  if (patch.label !== undefined) update[`overrides.${id}.label`] = patch.label;
  if (patch.hue !== undefined) update[`overrides.${id}.hue`] = patch.hue;
  if (Object.keys(update).length === 0) return;
  await setDoc(doc(db, 'config', 'categories'), update, { merge: true });
}

export async function clearCategoryOverride(id: CategoryId): Promise<void> {
  await setDoc(
    doc(db, 'config', 'categories'),
    { overrides: { [id]: deleteField() } },
    { merge: true },
  );
}

// React glue. Components that should re-render on category edits call this
// at the top level; consumers of CATEGORIES/CAT_BY_ID under such a component
// will re-render automatically.
function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}
function getSnapshot(): number {
  return version;
}
export function useCategoryVersion(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
