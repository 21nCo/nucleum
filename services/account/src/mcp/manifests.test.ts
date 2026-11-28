import { describe, expect, it } from 'vitest';
import { interfaceApps } from '@nucleum/schema/interfaces';
import { currentManifest, readManifest } from './manifests.js';

describe('checked-in MCP manifests', () => {
  it.each(interfaceApps)('match the %s server declaration (run npm run mcp:manifests after a reviewed change)', (app) => {
    expect(currentManifest(app)).toEqual(readManifest(app));
  });
});
