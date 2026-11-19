import {cp,mkdir,writeFile,readFile} from 'node:fs/promises';
await mkdir('.pages-dist',{recursive:true});
await cp('public','.pages-dist',{recursive:true});
// Pages handles web requests; the existing Worker keeps the daily backup Cron Trigger.
const source=await readFile('src/worker.js','utf8');
await writeFile('.pages-dist/_worker.js',source.replace('export async function automaticBackup','async function automaticBackup'));
await writeFile('.pages-dist/_routes.json',JSON.stringify({version:1,include:['/*'],exclude:[]}));
console.log('Pages bundle ready.');
