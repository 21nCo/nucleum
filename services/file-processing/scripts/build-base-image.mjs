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
const docker = resolveDocker();
console.log(`$ ${docker} ${args.join(' ')}`);
const result = spawnSync(docker, args, { stdio: 'inherit' });
process.exit(result.status ?? 1);

/**
 * The docker executable, run from an absolute path rather than looked up on
 * `PATH`: `DOCKER_BIN` when set (it must be absolute), otherwise the first
 * docker in the usual install directories. Exits with an error naming
 * `DOCKER_BIN` when neither gives an executable file.
 */
function resolveDocker() {
  const override = process.env.DOCKER_BIN?.trim();
  const candidates = override
    ? [override]
    : ['/usr/local/bin/docker', '/opt/homebrew/bin/docker', '/usr/bin/docker', '/Applications/Docker.app/Contents/Resources/bin/docker'];
  const found = candidates.find((candidate) => path.isAbsolute(candidate) && isExecutable(candidate));
  if (!found) {
    console.error(
      override
        ? `DOCKER_BIN must be the absolute path of the docker executable; got ${JSON.stringify(override)}`
        : `docker not found in ${candidates.join(', ')}; set DOCKER_BIN to its absolute path`
    );
    process.exit(1);
  }
  return found;
}

function isExecutable(file) {
  try {
    fs.accessSync(file, fs.constants.X_OK);
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}
