import { test, expect } from '@playwright/test';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { relative } from 'node:path';

test('built First Contact renders and reaches a durable map with keyboard alone', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await page.getByRole('button', { name: 'Play quietly', exact: true }).click();
  const body = page.locator('body');
  const canvas = page.locator('#game');
  await expect(canvas).toHaveAttribute('data-rendered', 'true');
  await expect(canvas).toHaveAttribute('data-asset-loaded', 'true', { timeout: 20_000 });
  await expect(body).toHaveAttribute('data-phase', 'living-room');
  await expect(page.getByRole('button', { name: 'Idea notebook' })).toHaveCount(0);
  expect(await page.evaluate(() => typeof (window as unknown as Record<string, unknown>).__SPACE_DRAGON__)).toBe('undefined');

  await canvas.focus();
  for (const phase of ['signal', 'backyard', 'suits']) {
    await page.keyboard.press('Space');
    await expect(body).toHaveAttribute('data-phase', phase);
  }
  for (let count = 1; count <= 5; count++) {
    await page.keyboard.press('Space');
    await expect(body).toHaveAttribute('data-suits-count', String(count));
  }
  await expect(body).toHaveAttribute('data-phase', 'scan');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(body).toHaveAttribute('data-phase', 'archive');
  await page.keyboard.press('Space');
  await expect(body).toHaveAttribute('data-phase', 'map');
  await page.reload();
  await page.getByRole('button', { name: 'Play quietly', exact: true }).click();
  await expect(body).toHaveAttribute('data-phase', 'map');
  await expect(body).toHaveAttribute('data-suits-count', '5');
  await expect(canvas).toHaveAttribute('data-rendered', 'true');
  expect(errors).toEqual([]);
});

test('production has no notebook write endpoint', async ({ request }) => {
  const response = await request.post('/space-dragon/__ideas', {
    headers: { Origin: 'https://not-the-local-workspace.example' },
    data: { thought: 'Synthetic production-boundary check; must not be captured.' },
  });
  expect(response.status()).toBe(404);
});

test('build excludes project sources, references and the development observation API', async () => {
  const files = await readdir('dist', { recursive: true });
  expect(files.filter(file => /(?:^|[\\/])(?:ideas|reference|source|docs|\.git)(?:[\\/]|$)|\.blend\d?$/i.test(file))).toEqual([]);
  const manifest = JSON.parse(await readFile('assets/reference/family/manifest.json', 'utf8')) as { photos: { filename: string }[] };
  const runtimeText = (await Promise.all(files.filter(file => /\.(?:js|html|css)$/.test(file))
    .map(file => readFile(`dist/${file}`, 'utf8')))).join('\n');
  expect(runtimeText).not.toContain('__SPACE_DRAGON__');
  for (const photo of manifest.photos) expect(runtimeText).not.toContain(photo.filename);
});

test('approved runtime assets match their manifest hashes and contain real GLB bytes', async () => {
  const manifest = JSON.parse(await readFile('public/assets/manifest.json', 'utf8')) as {
    schemaVersion: number;
    assets: { runtimePath: string; files: { path: string; bytes: number; sha256: string }[] }[];
  };
  expect(manifest.schemaVersion).toBe(1);
  const declared = manifest.assets.flatMap(asset => asset.files);
  const declaredPaths = declared.map(file => file.path);
  expect(new Set(declaredPaths).size).toBe(declaredPaths.length);
  for (const asset of manifest.assets) expect(declaredPaths).toContain(asset.runtimePath);
  for (const file of declared) {
    expect(file.path).toMatch(/^assets\//);
    expect(file.path).not.toContain('\\');
    expect(file.path.split('/')).not.toContain('..');
    expect(file.sha256).toMatch(/^[a-f0-9]{64}$/);
    for (const root of ['public', 'dist']) {
      const bytes = await readFile(`${root}/${file.path}`);
      expect(bytes.byteLength, `${root}/${file.path} length`).toBe(file.bytes);
      expect(createHash('sha256').update(bytes).digest('hex'), `${root}/${file.path} checksum`).toBe(file.sha256);
      if (file.path.endsWith('.glb')) {
        expect(bytes.readUInt32LE(0), 'GLB magic; a Git LFS pointer is not a model').toBe(0x46546c67);
        expect(bytes.readUInt32LE(8)).toBe(bytes.byteLength);
      }
    }
  }
  const files = await readdir('public/assets', { recursive: true, withFileTypes: true });
  const actual = files.filter(file => file.isFile()).map(file => {
    const parent = relative('public/assets', file.parentPath).replaceAll('\\', '/');
    return `assets/${parent ? `${parent}/` : ''}${file.name}`;
  });
  expect(actual.sort()).toEqual(['assets/manifest.json', ...declaredPaths].sort());
});
