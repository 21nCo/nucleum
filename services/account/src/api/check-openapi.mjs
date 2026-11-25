#!/usr/bin/env node
/**
 * Runs the published `apifn check` for each app's router against its
 * committed spec openapi/<app>.json (npm run openapi:check). CI and
 * developers run the same command:
 *
 *   npm run openapi:check -- --base origin/dev   # drift, validity and breaking changes
 *   npm run openapi:check -- --write             # rewrite a drifted spec, then commit it
 *
 * Runner options: --app <name> (repeatable; default all apps) and
 * --spec-dir <dir> (default openapi). Every other argument is passed to each
 * `apifn check` unchanged. All selected apps are checked; the exit code is
 * the highest one apifn returned (0 pass, 1 drift, invalid spec or an
 * unversioned breaking change, 2 usage or load error). A relative --spec-dir
 * is read from the directory npm ran from; forwarded paths (such as
 * --base-spec or --report) are read from services/account.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apps = ['memotron', 'pointron', 'nucleum'];
const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// The installed CLI's entry, run with this Node binary, so no command is looked up on PATH.
const cli = path.join(path.dirname(createRequire(import.meta.url).resolve('@apifn/cli')), 'bin.js');

function usage(message) {
  console.error(`openapi:check: ${message}`);
  console.error('Usage: npm run openapi:check -- [--app <name>]... [--spec-dir <dir>] [apifn check options]');
  process.exit(2);
}

function parseArgs(argv) {
  const selected = [];
  let specDir;
  const forwarded = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const [name, inline] = arg.startsWith('--') && arg.includes('=') ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)] : [arg, undefined];
    if (name === '--app' || name === '--spec-dir') {
      const value = inline ?? argv[++i];
      if (value === undefined || value === '') usage(`${name} needs a value`);
      if (name === '--app') {
        if (!apps.includes(value)) usage(`unknown app "${value}" (expected one of ${apps.join(', ')})`);
        if (!selected.includes(value)) selected.push(value);
      } else {
        if (specDir !== undefined) usage('--spec-dir given more than once');
        specDir = value;
      }
    } else if (name === '--spec' || name === '--config') {
      usage(`${name} is set per app by this command; use --spec-dir or --app instead`);
    } else {
      forwarded.push(arg);
    }
  }
  return { selected: selected.length > 0 ? selected : apps, specDir, forwarded };
}

const { selected, specDir, forwarded } = parseArgs(process.argv.slice(2));
const env = { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --preserve-symlinks`.trim() };
const results = [];
for (const app of selected) {
  // The committed spec stays relative to services/account so apifn finds it at the --base ref.
  const spec = specDir === undefined ? `openapi/${app}.json` : path.join(path.resolve(process.env.INIT_CWD ?? process.cwd(), specDir), `${app}.json`);
  console.log(`\n== apifn check: ${app} ==`);
  const run = spawnSync(
    process.execPath,
    [cli, 'check', '--config', `src/api/${app}/apifn.config.ts`, '--spec', spec, ...forwarded],
    { cwd: serviceRoot, env, stdio: 'inherit' }
  );
  if (run.error) console.error(`openapi:check: ${app}: ${run.error.message}`);
  const status = typeof run.status === 'number' ? run.status : 2;
  results.push({ app, status });
}
console.log(`\nopenapi:check ${results.map(({ app, status }) => `${app}=${status === 0 ? 'pass' : `fail(${status})`}`).join(' ')}`);
process.exit(Math.max(...results.map(({ status }) => status)));
