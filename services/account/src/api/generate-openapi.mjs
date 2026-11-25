#!/usr/bin/env node
/**
 * Writes each app's OpenAPI 3.1 document to openapi/<app>.json with the
 * published apifn CLI: `apifn generate` from the app's router, then
 * `apifn export json`. Run from services/account (npm run openapi:v1).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

const apps = ['memotron', 'pointron', 'nucleum'];
const workDir = mkdtempSync(path.join(tmpdir(), 'apifn-v1-'));
// The installed CLI's entry, run with this Node binary, so no command is looked up on PATH.
const cli = path.join(path.dirname(createRequire(import.meta.url).resolve('@apifn/cli')), 'bin.js');
const run = (args) => execFileSync(process.execPath, [cli, ...args], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --preserve-symlinks`.trim() }
});
try {
  for (const app of apps) {
    const yaml = path.join(workDir, `${app}.yml`);
    run(['generate', '--config', `src/api/${app}/apifn.config.ts`, '--output', yaml]);
    run(['export', 'json', `openapi/${app}.json`, '--input', yaml]);
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
