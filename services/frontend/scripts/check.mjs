import path from 'node:path';
import { readConfig, routeDefinitions } from './frontend-config.mjs';

const serviceRoot = path.resolve(import.meta.dirname, '..');
const config = readConfig(serviceRoot);

for (const environment of Object.keys(config.environments)) {
  const routes = routeDefinitions(config, environment);
  if (routes.length !== Object.keys(config.products).length) {
    throw new Error(`Expected one route per product for ${environment}`);
  }
  for (const route of routes) {
    if (!route.pattern.includes('/*')) {
      throw new Error(`Invalid route pattern: ${route.pattern}`);
    }
    if (!route.script || !route.zoneName) {
      throw new Error(`Incomplete route definition: ${JSON.stringify(route)}`);
    }
  }
}

console.log('Frontend Cloudflare deploy config is valid.');
