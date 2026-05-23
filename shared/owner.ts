// Canonical source of truth for the calendar owner's email.
//
// The frontend re-exports this from src/lib/firebase.ts.
//
// The Cloud Functions codebase (functions/) and firestore.rules each keep
// their own literal copy because they're separate deploy/runtime boundaries
// (functions packages only its own directory; rules is a different language).
// A drift-guard test in src/lib/owner.test.ts asserts all three agree, so
// updating this constant + running `npm test` will surface any out-of-sync
// copies before they're committed.
export const OWNER_EMAIL = 'yilongwang05@gmail.com';
