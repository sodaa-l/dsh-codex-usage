import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Reproduce the canonical node_modules layout used by dsh-codex-usage@file:<path>.
// Resolve the exported package resources and execute client.js through its module loader.
test('resolves canonical Client package identity and manifest icon from an installed layout', async (t) => {
  const packageName = 'dsh-codex-usage';
  const profile = await mkdtemp(join(tmpdir(), 'dsh-codex-usage-meta-'));
  t.after(() => rm(profile, { recursive: true, force: true }));
  const packageRoot = join(profile, 'node_modules', packageName);
  await mkdir(packageRoot, { recursive: true });
  await Promise.all([
    copyFile(new URL('../package.json', import.meta.url), join(packageRoot, 'package.json')),
    copyFile(new URL('../cordis.patch.yml', import.meta.url), join(packageRoot, 'cordis.patch.yml')),
    copyFile(new URL('../client.js', import.meta.url), join(packageRoot, 'client.js')),
    copyFile(new URL('../icon.svg', import.meta.url), join(packageRoot, 'icon.svg')),
  ]);

  const resolverPath = join(profile, 'resolver.mjs');
  await writeFile(resolverPath, 'export const resolveFromProfile = (specifier) => import.meta.resolve(specifier);');
  const { resolveFromProfile } = await import(pathToFileURL(resolverPath).href);
  const manifestPath = fileURLToPath(resolveFromProfile(`${packageName}/package.json`));
  const clientPath = fileURLToPath(resolveFromProfile(`${packageName}/client`));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.equal(manifestPath, join(packageRoot, 'package.json'));
  assert.equal(clientPath, join(packageRoot, 'client.js'));
  assert.equal(manifest.name, packageName);
  assert.equal(manifest.icon, './icon.svg');

  const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));
  assert.equal(lock.name, packageName);
  assert.equal(lock.packages[''].name, packageName);

  const patch = await readFile(join(packageRoot, 'cordis.patch.yml'), 'utf8');
  const patchIdentity = /^\s+- id:\s*([^\s]+)\s*\r?\n\s+name:\s*'([^']+)'\s*$/m.exec(patch);
  assert.ok(patchIdentity, 'cordis.patch.yml must declare a plugin id and package name');
  assert.equal(patchIdentity[1], packageName);
  assert.equal(patchIdentity[2], manifest.name);

  assert.equal(manifest.exports['./package.json'], './package.json');
  assert.equal(manifest.exports['./client'], './client.js');
  assert.equal(manifest.exports['./icon'], './icon.svg');
  assert.equal(manifest.dsh.client.platform, 'web');
  assert.equal(manifest.dsh.client.immediately, true);
  assert.ok(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-sidebar'));
  assert.ok(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-client-locale'));

  const loadedModules = [];
  runInNewContext(await readFile(clientPath, 'utf8'), {
    window: { __ModuleLoader__: { load: (definition) => loadedModules.push(definition) } },
  }, { filename: clientPath });
  assert.equal(loadedModules.length, 1, 'client.js must register exactly one Client module');
  assert.equal(loadedModules[0].id, manifest.name);
  const clientPlugin = loadedModules[0].factory((specifier) => {
    assert.equal(specifier, 'react');
    return { createElement() {} };
  });
  assert.deepEqual(Array.from(clientPlugin.inject), ['slots', 'locale']);

  const root = realpathSync(dirname(manifestPath));
  const iconPath = resolve(root, manifest.icon);
  const resolvedIconPath = fileURLToPath(resolveFromProfile(`${packageName}/icon`));
  const realIconPath = realpathSync(iconPath);
  const local = relative(root, realIconPath);
  assert.notEqual(local, '..');
  assert.ok(!local.startsWith(`..${sep}`));
  assert.ok(!isAbsolute(local));
  assert.equal(realIconPath, resolvedIconPath);
  assert.deepEqual(await readFile(realIconPath), await readFile(new URL('../icon.svg', import.meta.url)));
});
