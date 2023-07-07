import * as babel from '@babel/core';
import compiledRuntimeSupport from './runtime-support.out.nocov';
import wrapAsFunctionPlugin from './stages/wrap-as-iife';
import uncatchableExceptionPlugin from './stages/uncatchable-exceptions';
import makeMaybeAsyncFunctionPlugin from './stages/transform-maybe-await';
import { AsyncRewriterErrors } from './error-codes';

/**
 * General notes for this package:
 *
 * This package contains three babel plugins used in async rewriting, plus a helper
 * to apply these plugins to plain code.
 *
 * If you have not worked with babel plugins,
 * https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md
 * may be a good resource for starting with this.
 *
 * https://astexplorer.net/ is also massively helpful, and enables working
 * with babel plugins as live transformers. It doesn't understand all TS syntax,
 * but pasting the compiled output from lib/stages/[...].js is already
 * a very good start.
 *
 * The README file for this repository contains a more high-level technical
 * overview.
 */

export default class AsyncWriter {
  step(
    ast: babel.types.Node | null | undefined,
    originalSource: string,
    plugins: babel.PluginItem[] = [],
    opts: babel.TransformOptions = {}
  ): babel.BabelFileResult | null {
    const transform = (opts: babel.TransformOptions) =>
      ast
        ? babel.transformFromAstSync(ast, originalSource, opts)
        : babel.transformSync(originalSource, opts);
    return transform({
      plugins,
      code: false,
      ast: true,
      cloneInputAst: false,
      configFile: false,
      babelrc: false,
      browserslistConfigFile: false,
      compact: originalSource.length > 10_000,
      sourceType: 'script',
      ...opts,
    });
  }

  /**
   * Returns translated code.
   * @param code - string to compile.
   */
  process(code: string): string {
    try {
      // In the first step, we apply a number of common babel transformations
      // that are necessary in order for subsequent steps to succeed
      // (in particular, shorthand properties and parameters would otherwise
      // mess with detecting expressions in their proper locations).
      let ast = this.step(undefined, code, [
        require('@babel/plugin-transform-shorthand-properties').default,
        require('@babel/plugin-transform-parameters').default,
        require('@babel/plugin-transform-destructuring').default,
      ])?.ast;
      ast = this.step(ast, code, [wrapAsFunctionPlugin])?.ast;
      ast = this.step(ast, code, [uncatchableExceptionPlugin])?.ast;
      return this.step(
        ast,
        code,
        [
          [
            makeMaybeAsyncFunctionPlugin,
            {
              customErrorBuilder: babel.types.identifier(
                'MongoshAsyncWriterError'
              ),
            },
          ],
        ],
        { code: true, ast: false }
      )?.code as string;
    } catch (e: any) {
      const { message } = e;
      delete e.message; // e.message may have been non-writable
      e.message = message.replace('unknown: ', '');
      throw e;
    }
  }

  unprocessedRuntimeSupportCode(): string {
    // The definition of MongoshAsyncWriterError is kept separately from other
    // code, as it is one of the few actually mongosh-specific pieces of code here.
    return this.process(`
    class MongoshAsyncWriterError extends Error {
      constructor(message, codeIdentifier) {
        const code = (${JSON.stringify(AsyncRewriterErrors)})[codeIdentifier];
        super(\`[\${code}] \${message}\`);
        this.code = code;
      }
    }`);
  }

  runtimeSupportCode(): string {
    return compiledRuntimeSupport;
  }
}
