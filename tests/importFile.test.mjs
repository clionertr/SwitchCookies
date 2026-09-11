import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { importSwitchCookiesFile } from '../src/lib/importFile.js';

// Exercise the shared importer with deterministic Chrome API failures.
globalThis.FileReader = class {
  readAsText(file) { this.result = file; this.onload(); }
};
let saved, removed, written, reloaded, failWrite;
beforeEach(() => {
  saved = {}; removed = []; written = []; reloaded = []; failWrite = false;
  globalThis.chrome = {
    runtime: {},
    storage: { local: {
      get: async () => ({ cookieProfiles: saved }),
      set: async value => { saved = value.cookieProfiles; },
    } },
    cookies: {
      getAll: async ({ domain }) => [{ domain, name: 'old', value: 'old', path: '/' }],
      remove: async details => { removed.push(details); return details; },
      set: async details => {
        written.push(details);
        if (failWrite || details.name === 'fail') throw new Error('Write rejected');
        return details;
      },
    },
    tabs: { reload: async id => reloaded.push(id) },
  };
});
const cookie = { domain: 'example.com', name: 'session', value: 'test', path: '/' };
const run = (data, target) => importSwitchCookiesFile(JSON.stringify(data), target);

test('imports and overwrites account backups', async () => {
  saved = { existing: { domain: 'example.com', cookies: [] } };
  const profile = { domain: 'example.com', cookies: [cookie] };
  const result = await run({ type: 'cookie_profiles', profiles: { existing: profile, added: profile } });
  assert.deepEqual(result.vars, { added: 1, replaced: 1 });
  assert.deepEqual(saved.added, profile);
});

test('single-site import clears the file site, preserving the unrelated active site', async () => {
  const result = await run({ domain: 'example.com', cookies: [cookie] }, { hostname: 'other.test', tabId: 7 });
  assert.equal(result.ok, true);
  assert.equal(removed[0].url, 'http://example.com/');
  assert.equal(written[0].url, 'http://example.com/');
  assert.deepEqual(reloaded, []);
});

test('reloads the corresponding target after import', async () => {
  await run({ domain: 'example.com', cookies: [cookie] }, { hostname: 'example.com', tabId: 7 });
  assert.deepEqual(reloaded, [7]);
});

test('imports all-domain backups and reports partial failure', async () => {
  const result = await run({ allDomains: true, cookiesByDomain: {
    'example.com': [cookie, { ...cookie, name: 'fail' }],
  } });
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'info');
  assert.equal(result.vars.ok, 1);
  assert.equal(result.vars.total, 2);
});

test('total write failure is an error; empty cookie backup is a successful clear', async () => {
  failWrite = true;
  const result = await run({ domain: 'example.com', cookies: [cookie] });
  assert.equal(result.kind, 'error');
  assert.equal(result.ok, false);
  const empty = await run({ domain: 'example.com', cookies: [] });
  assert.equal(empty.ok, true);
  assert.equal(empty.vars.total, 0);
});

test('invalid JSON and malformed backup shapes cause no writes or deletions', async () => {
  for (const data of [null, { type: 'cookie_profiles', profiles: 'bad' },
    { allDomains: true, cookiesByDomain: { site: {} } },
    { domain: 'example.com', cookies: [null] }]) {
    assert.equal((await run(data)).key, 'import_invalid');
  }
  assert.equal((await importSwitchCookiesFile('{')).key, 'import_invalid');
  assert.deepEqual(removed, []);
  assert.deepEqual(written, []);
  assert.deepEqual(saved, {});
});

test('storage errors propagate for the UI to display', async () => {
  chrome.storage.local.set = async () => { throw new Error('Quota exceeded'); };
  await assert.rejects(run({ type: 'cookie_profiles', profiles: {} }), /Quota exceeded/);
});
