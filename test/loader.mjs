import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import { createRequire, register } from 'node:module';
import { isMainThread } from 'node:worker_threads';
import ts from 'typescript';

const typescript = ts.transpileModule ? ts : (ts.default || ts);

if (isMainThread) {
  try {
    const require = createRequire(process.cwd() + '/');
    const origLoad = Module._load;
    Module._load = function(request, parent, isMain) {
      if (request === 'yargs/yargs') {
        const yargsPkg = path.dirname(require.resolve('yargs/package.json'));
        const { applyExtends, cjsPlatformShim, Parser, Yargs, processArgv } = require(path.join(yargsPkg, 'build/index.cjs'));
        Yargs.applyExtends = (config, cwd, mergeExtends) => applyExtends(config, cwd, mergeExtends, cjsPlatformShim);
        Yargs.hideBin = processArgv.hideBin;
        Yargs.Parser = Parser;
        return Yargs;
      }
      return origLoad.apply(this, arguments);
    };
  } catch {}

  register(import.meta.url);
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.js') && context.parentURL && !context.parentURL.includes('/node_modules/')) {
    try {
      return await nextResolve(specifier, context);
    } catch {
      return nextResolve(specifier.replace(/\.js$/, '.ts'), context);
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (process.features?.typescript) {
    return nextLoad(url, context);
  }

  if (url.endsWith('.ts') && !url.includes('/node_modules/')) {
    const source = fs.readFileSync(new URL(url), 'utf8');
    const { outputText } = typescript.transpileModule(source, {
      fileName: url,
      compilerOptions: {
        module: typescript.ModuleKind.ESNext,
        target: typescript.ScriptTarget.ES2020,
        inlineSourceMap: true,
      },
    });
    return {
      format: 'module',
      source: outputText,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
