import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Reproduce the Desktop install: the dependency alias differs from manifest.name.
// Resolve the exported manifest instead of reading the source manifest directly,
// because DSH can only see a top-level icon through that exported resource.
test('resolves manifest-declared icon through a local package alias', async (t) => {
  const profile = await mkdtemp(join(tmpdir(), 'dsh-codex-usage-meta-'));
  t.after(() => rm(profile, { recursive: true, force: true }));
  const packageRoot = join(profile, 'node_modules', '@local', 'dsh-codex-usage');
  await mkdir(packageRoot, { recursive: true });
  await writeFile(join(packageRoot, 'package.json'), await readFile(new URL('../package.json', import.meta.url)));
  await copyFile(new URL('../icon.svg', import.meta.url), join(packageRoot, 'icon.svg'));

  const resolverPath = join(profile, 'resolver.mjs');
  await writeFile(resolverPath, 'export const resolveFromProfile = (specifier) => import.meta.resolve(specifier);');
  const { resolveFromProfile } = await import(pathToFileURL(resolverPath).href);
  const manifestPath = fileURLToPath(resolveFromProfile('@local/dsh-codex-usage/package.json'));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.notEqual(manifest.name, '@local/dsh-codex-usage');
  assert.equal(manifest.icon, './icon.svg');
  const root = realpathSync(dirname(manifestPath));
  const iconPath = resolve(root, manifest.icon);
  const resolvedIconPath = fileURLToPath(resolveFromProfile('@local/dsh-codex-usage/icon'));
  const realIconPath = realpathSync(iconPath);
  const local = relative(root, realIconPath);
  assert.notEqual(local, '..');
  assert.ok(!local.startsWith(`..${sep}`));
  assert.ok(!isAbsolute(local));
  assert.equal(realIconPath, resolvedIconPath);
  assert.deepEqual(await readFile(realIconPath), await readFile(new URL('../icon.svg', import.meta.url)));
});
