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
 * --spec-dir <dir> (default openapi). Each run is bound to its own app's
 * config, router and spec, so only the apifn options listed in
 * forwardedOptions are passed on; positional arguments, --spec, --config,
 * --report and any other option are rejected with exit code 2 before apifn
 * runs (--format too: the runner's per-app text would corrupt its output),
 * and --base-spec needs exactly one --app. All selected apps are
 * checked; the exit code is the highest one apifn returned (0 pass, 1 drift,
 * invalid spec or an unversioned breaking change, 2 usage or load error). A
 * relative --spec-dir is read from the directory npm ran from; a relative
 * --base-spec is read from services/account.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apps = ['memotron', 'pointron', 'nucleum'];
const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cli = path.join(path.dirname(createRequire(import.meta.url).resolve('@apifn/cli')), 'bin.js');

/** The apifn check options passed to every app run: true when the option takes a value. */
const forwardedOptions = new Map([
  ['--base', true],
  ['--base-spec', true],
  ['--allow-breaking', false],
  ['--write', false],
  ['--verbose', false],
  ['--quiet', false],
  ['--no-color', false]
]);

function usage(message) {
  console.error(`openapi:check: ${message}`);
  console.error(
    `Usage: npm run openapi:check -- [--app <name>]... [--spec-dir <dir>] [${[...forwardedOptions.keys()].join(' | ')}]...`
  );
  process.exit(2);
}

/** Splits `--name=value` into its name and inline value. */
function splitOption(arg) {
  const eq = arg.indexOf('=');
  return arg.startsWith('--') && eq !== -1 ? [arg.slice(0, eq), arg.slice(eq + 1)] : [arg, undefined];
}

function parseArgs(argv) {
  const selected = [];
  let specDir;
  let baseSpec = false;
  const forwarded = [];
  for (let i = 0; i < argv.length; i += 1) {
    const [name, inline] = splitOption(argv[i]);
    const takesValue = name === '--app' || name === '--spec-dir' || forwardedOptions.get(name) === true;
    if (!takesValue && !forwardedOptions.has(name)) {
      if (!name.startsWith('-')) usage(`unexpected argument "${name}"; each app's router comes from its own config`);
      if (name === '--spec' || name === '--config')
        usage(`${name} is set per app by this command; use --spec-dir or --app instead`);
      if (name === '--report') usage('--report is not supported: every app would write the same file');
      usage(`unsupported option ${name}`);
    }
    if (!takesValue) {
      if (inline !== undefined) usage(`${name} takes no value`);
      forwarded.push(name);
      continue;
    }
    const value = inline ?? argv[++i];
    if (value === undefined || value === '' || value.startsWith('-')) usage(`${name} needs a value`);
    if (name === '--app') {
      if (!apps.includes(value)) usage(`unknown app "${value}" (expected one of ${apps.join(', ')})`);
      if (!selected.includes(value)) selected.push(value);
    } else if (name === '--spec-dir') {
      if (specDir !== undefined) usage('--spec-dir given more than once');
      specDir = value;
    } else {
      if (name === '--base-spec') baseSpec = true;
      forwarded.push(name, value);
    }
  }
  if (baseSpec && selected.length !== 1) usage("--base-spec is one app's base spec, so it needs exactly one --app");
  return {
    selected: selected.length > 0 ? selected : apps,
    specDir,
    forwarded
  };
}

/**
 * The spec path for one app: the committed spec stays relative to
 * services/account so apifn can read it at the --base git ref.
 */
function specPath(app, specDir) {
  if (specDir === undefined) return `openapi/${app}.json`;
  return path.join(path.resolve(process.env.INIT_CWD ?? process.cwd(), specDir), `${app}.json`);
}

const { selected, specDir, forwarded } = parseArgs(process.argv.slice(2));
const env = {
  ...process.env,
  NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --preserve-symlinks`.trim()
};
const results = [];
for (const app of selected) {
  console.log(`\n== apifn check: ${app} ==`);
  const run = spawnSync(
    process.execPath,
    [cli, 'check', '--config', `src/api/${app}/apifn.config.ts`, '--spec', specPath(app, specDir), ...forwarded],
    { cwd: serviceRoot, env, stdio: 'inherit' }
  );
  if (run.error) console.error(`openapi:check: ${app}: ${run.error.message}`);
  const status = typeof run.status === 'number' ? run.status : 2;
  results.push({ app, status });
}
console.log(
  `\nopenapi:check ${results.map(({ app, status }) => `${app}=${status === 0 ? 'pass' : `fail(${status})`}`).join(' ')}`
);
process.exit(Math.max(...results.map(({ status }) => status)));
