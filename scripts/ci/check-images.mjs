// Toda imagem citada em data.js (memes/...) precisa existir em memes/.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const src = readFileSync(resolve(root, 'data.js'), 'utf8');
const refs = new Set([...src.matchAll(/memes\/[^"'`\s)\\]+/g)].map(m => m[0]));
const missing = [...refs].filter(r => !existsSync(resolve(root, r)));
for (const r of missing) console.log(`::error file=data.js::imagem citada não existe: ${r}`);
console.log(`check-images: ${refs.size} imagens citadas, ${missing.length} faltando`);
process.exit(missing.length ? 1 : 0);
