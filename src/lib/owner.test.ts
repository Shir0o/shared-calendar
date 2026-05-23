// Drift guard: the owner email is duplicated across three sites that can't
// easily share a TypeScript import (the frontend src/, the functions/
// workspace, and the Firestore rules DSL). This test asserts they all match
// the canonical value in shared/owner.ts so a one-place update can never get
// silently out of sync.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { OWNER_EMAIL } from '../../shared/owner';

const ROOT = join(__dirname, '..', '..');

function readUtf8(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('OWNER_EMAIL drift guard', () => {
  it('matches the literal in firestore.rules', () => {
    const rules = readUtf8('firestore.rules');
    // The rules file declares: function OWNER_EMAIL() { return '...'; }
    const m = rules.match(/function OWNER_EMAIL\(\)\s*\{\s*return\s*'([^']+)'\s*;/);
    expect(m, 'firestore.rules must declare OWNER_EMAIL()').not.toBeNull();
    expect(m![1]).toBe(OWNER_EMAIL);
  });

  it('matches the literal in functions/src/index.ts', () => {
    const idx = readUtf8('functions/src/index.ts');
    const m = idx.match(/const OWNER_EMAIL\s*=\s*'([^']+)'/);
    expect(m, 'functions/src/index.ts must declare const OWNER_EMAIL').not.toBeNull();
    expect(m![1]).toBe(OWNER_EMAIL);
  });
});
