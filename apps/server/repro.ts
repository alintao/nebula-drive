import path from 'node:path';
import { LocalDriver } from './src/storage/local.js';

console.log('cwd:', process.cwd());
console.log('path.resolve("") =', path.resolve(''));

const d = new LocalDriver(1, 'test', '');
console.log('driver.root =', (d as unknown as { root: string }).root);

const t0 = Date.now();
console.log('calling list("/") ...');
const entries = await d.list('/');
console.log('list done:', entries.length, 'entries in', Date.now() - t0, 'ms');
for (const e of entries) console.log(' -', e.name, e.isDir ? '[dir]' : e.size);
console.log('REPRO OK');
process.exit(0);
