import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { McpFnManifest } from '@mcpfn/core';
import type { InterfaceApp } from '@nucleum/schema/interfaces';
import { createInterfaceMcpServer } from './tools.js';

/** Where an app's checked-in MCP manifest lives, beside the OpenAPI documents. */
export function manifestPath(app: InterfaceApp): string {
  return fileURLToPath(new URL(`../../mcp/${app}.json`, import.meta.url));
}

/** The manifest an app's MCP server declares now. */
export function currentManifest(app: InterfaceApp): McpFnManifest {
  return createInterfaceMcpServer(app).declaration.manifest();
}

/** The checked-in manifest of an app. */
export function readManifest(app: InterfaceApp): McpFnManifest {
  return JSON.parse(readFileSync(manifestPath(app), 'utf8')) as McpFnManifest;
}

/** Rewrites an app's checked-in manifest from its declaration. */
export function writeManifest(app: InterfaceApp): void {
  writeFileSync(manifestPath(app), `${JSON.stringify(currentManifest(app), null, 2)}\n`);
}
