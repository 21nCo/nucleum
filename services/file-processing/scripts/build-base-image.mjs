import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Builds the FileFn processing image (superfunctions FILE-9) at the commit the
 * Dockerfile's `FILEFN_PROCESSING_BASE_IMAGE` names, and tags it with that
 * name, so `services/file-processing/Dockerfile` can build on it.
 */
const dockerfile = fs.readFileSync(path.join(import.meta.dirname, '..', 'Dockerfile'), 'utf8');
const image = /^ARG FILEFN_PROCESSING_BASE_IMAGE=(\S+)$/m.exec(dockerfile)?.[1];
const commit = image?.split(':')[1];
if (!image || !/^[0-9a-f]{40}$/.test(commit ?? '')) {
  console.error('services/file-processing/Dockerfile must pin FILEFN_PROCESSING_BASE_IMAGE=filefn-processing:<commit>');
  process.exit(1);
}
const platform = process.argv.find((arg) => arg.startsWith('--platform='))?.slice('--platform='.length) ?? 'linux/amd64';
const args = [
  'build',
  '--platform', platform,
  '-f', 'filefn/processing/container/Dockerfile',
  '-t', image,
  `https://github.com/21nCo/superfunctions.git#${commit}`
];
console.log(`$ docker ${args.join(' ')}`);
const result = spawnSync('docker', args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
