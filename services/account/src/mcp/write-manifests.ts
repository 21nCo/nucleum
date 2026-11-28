/**
 * Regenerates the checked-in MCP manifests; the manifest test fails until
 * they match the declarations.
 */
import { interfaceApps } from '@nucleum/schema/interfaces';
import { manifestPath, writeManifest } from './manifests.js';

for (const app of interfaceApps) {
  writeManifest(app);
  console.log(`wrote ${manifestPath(app)}`);
}
