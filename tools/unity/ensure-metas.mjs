import { createHash } from 'node:crypto';
import { readdir, stat, writeFile, access } from 'node:fs/promises';
import { join, relative, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Writes a Unity .meta beside every file and folder that lacks one, under the given
// folders of unity/SpaceDragon/Assets/SpaceDragon. Existing .meta files are never changed.
// GUIDs are derived from the asset path, so a fresh checkout and the Editor always agree:
//   node tools/unity/ensure-metas.mjs Playground Traversal [--check]
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const assets = join(root, 'unity/SpaceDragon/Assets/SpaceDragon');
const check = process.argv.includes('--check');
const folders = process.argv.slice(2).filter(argument => !argument.startsWith('--'));
if (folders.length === 0) throw new Error('Name at least one folder below Assets/SpaceDragon.');

const guidOf = path => createHash('md5').update(`space-dragon:${path}`).digest('hex');
const block = (guid, importer, extra = '') => `fileFormatVersion: 2\nguid: ${guid}\n${extra}${importer}:\n  externalObjects: {}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n`;
function metaFor(path, isFolder) {
  const guid = guidOf(path);
  if (isFolder) return block(guid, 'DefaultImporter', 'folderAsset: yes\n');
  switch (extname(path).toLowerCase()) {
    case '.cs': return `fileFormatVersion: 2\nguid: ${guid}`;
    case '.asmdef': return block(guid, 'AssemblyDefinitionImporter');
    case '.json': case '.txt': case '.md': return block(guid, 'TextScriptImporter');
    // Models, textures and raw buffers: Unity picks its registered importer and completes the
    // block on first import; the scene generator then asserts the settings it needs.
    default: return `fileFormatVersion: 2\nguid: ${guid}\n`;
  }
}

const missing = [];
async function visit(folder) {
  const path = relative(assets, folder).replaceAll('\\', '/');
  await ensure(folder, path, true);
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (entry.name.endsWith('.meta') || entry.name.startsWith('.') || entry.name.endsWith('~')) continue;
    const child = join(folder, entry.name);
    if (entry.isDirectory()) await visit(child);
    else await ensure(child, `${path}/${entry.name}`, false);
  }
}
async function ensure(target, path, isFolder) {
  const meta = `${target}.meta`;
  if (await access(meta).then(() => true, () => false)) return;
  missing.push(path);
  if (!check) await writeFile(meta, metaFor(path, isFolder));
}
for (const folder of folders) {
  const target = join(assets, folder);
  if (!(await stat(target)).isDirectory()) throw new Error(`${folder} is not a folder`);
  await visit(target);
}
if (check && missing.length) { console.error(`Missing Unity .meta files:\n${missing.join('\n')}`); process.exit(1); }
console.log(check ? 'UNITY_METAS_COMPLETE' : `UNITY_METAS_WRITTEN ${missing.length}`);
for (const path of check ? [] : missing) console.log(`  ${path}`);
