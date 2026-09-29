import {register} from 'node:module';
import * as testRunner from 'node:test';

// Expose describe, it, beforeEach, afterEach to global scope for tests
Object.assign(globalThis, testRunner);

// Resolve local .js imports to .ts files outside node_modules
register(
  'data:text/javascript,export async function resolve(specifier, context, nextResolve) { if (specifier.endsWith(".js") && context.parentURL && !context.parentURL.includes("/node_modules/")) { try { return await nextResolve(specifier, context); } catch { return nextResolve(specifier.replace(/\\.js$/, ".ts"), context); } } return nextResolve(specifier, context); }',
  import.meta.url
);
