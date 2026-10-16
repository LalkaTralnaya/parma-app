import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { APP_VERSION, RELEASES, releaseDate } from '../src/lib/releases.ts';
import { RELEASE_NOTES_KEY, shouldShowRelease, markReleaseShown } from '../src/lib/ui/release-notes.ts';

test('release notes show once and a different release is announced again', () => {
 const values = new Map();
 const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
 assert.equal(shouldShowRelease(storage, 'release-test-one'), true);
 markReleaseShown(storage, 'release-test-one');
 assert.equal(values.get(RELEASE_NOTES_KEY), 'release-test-one');
 assert.equal(shouldShowRelease(storage, 'release-test-one'), false);
 assert.equal(shouldShowRelease(storage, 'release-test-two'), true);
 markReleaseShown(storage, 'release-test-two');
 assert.equal(shouldShowRelease(storage, 'release-test-two'), false);
});

test('blocked browser storage does not break the page or repeat within the same tab', () => {
 const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
 assert.equal(shouldShowRelease(storage, 'blocked-storage-release'), true);
 assert.doesNotThrow(() => markReleaseShown(storage, 'blocked-storage-release'));
 assert.equal(shouldShowRelease(storage, 'blocked-storage-release'), false);
 assert.equal(shouldShowRelease(null, 'missing-storage-release'), true);
 markReleaseShown(null, 'missing-storage-release');
 assert.equal(shouldShowRelease(null, 'missing-storage-release'), false);
});

test('published release version matches package and lockfile; history is dated and ordered', () => {
 const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
 const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
 assert.equal(APP_VERSION, pkg.version);
 assert.equal(APP_VERSION, lock.version);
 assert.equal(APP_VERSION, lock.packages[''].version);
 assert.equal(new Set(RELEASES.map(release => release.id)).size, RELEASES.length);
 for (const [index, release] of RELEASES.entries()) {
  assert.match(release.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(release.changes.length > 0 && release.changes.every(change => change.trim()));
  if (index) assert.ok(RELEASES[index - 1].date >= release.date);
 }
 assert.match(releaseDate('2026-10-16'), /16 октября 2026/);
});
