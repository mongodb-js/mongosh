import * as babel from '@babel/core';
import type * as BabelTypes from '@babel/types';
import { promises as fs } from 'fs';
import path from 'path';
import { signatures } from '../';
import enUs from '../../i18n/src/locales/en_US';

function applyAsyncRewriterChanges() {
  return ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    types: t,
  }: {
    types: typeof BabelTypes;
  }): babel.PluginObj<{
    processedMethods: [string, string, BabelTypes.ClassBody][];
  }> => {
    return {
      pre() {
        this.processedMethods = [];
      },
      post() {
        for (const className of Object.keys(signatures)) {
          for (const methodName of Object.keys(
            signatures[className].attributes ?? {}
          )) {
            if (
              signatures[className].attributes?.[methodName].returnsPromise &&
              !signatures[className].attributes?.[methodName].inherited
            ) {
              if (
                !this.processedMethods.find(
                  ([cls, method]) => cls === className && method === methodName
                )
              ) {
                // eslint-disable-next-line no-console
                console.error(
                  `Expected to find and transpile type for @returnsPromise-annotated method ${className}.${methodName}`
                );
              }
            }
          }
        }
      },
      visitor: {
        TSDeclareMethod(path) {
          if ('isMongoshAsyncRewrittenMethod' in path.node) return;

          if (path.parent.type !== 'ClassBody') return;
          if (path.parentPath.parent.type !== 'ClassDeclaration') return;
          const classId = path.parentPath.parent.id;
          if (classId?.type !== 'Identifier') return;
          const className = classId.name;
          if (path.node.key.type !== 'Identifier') return;
          const methodName = path.node.key.name;

          if (
            this.processedMethods.find(
              ([cls, method, classBody]) =>
                cls === className &&
                method === methodName &&
                classBody !== path.parent
            )
          ) {
            throw new Error(`Duplicate method: ${className}.${methodName}`);
          }
          this.processedMethods.push([className, methodName, path.parent]);

          const classHelp = (enUs['shell-api'] as any).classes[className];
          if (
            classHelp &&
            classHelp.help.attributes &&
            classHelp.help.attributes[methodName]
          ) {
            const methodHelp = classHelp.help.attributes[methodName];
            if (methodHelp && methodHelp.description) {
              //console.log(`${className}.${methodName}`, methodHelp.description);
              path.addComment(
                'leading',
                `\n${methodHelp.description as string}\n`,
                false
              );
            }
          }

          if (!signatures[className]?.attributes?.[methodName]?.returnsPromise)
            return;

          const { returnType } = path.node;
          if (returnType?.type !== 'TSTypeAnnotation') return;
          if (returnType.typeAnnotation.type !== 'TSTypeReference') return;
          if (returnType.typeAnnotation.typeName.type !== 'Identifier') return;
          if (returnType.typeAnnotation.typeName.name !== 'Promise') return;
          if (!returnType.typeAnnotation.typeParameters?.params.length) return;
          path.replaceWith({
            ...path.node,
            returnType: {
              ...returnType,
              typeAnnotation:
                returnType.typeAnnotation.typeParameters.params[0],
            },
            isMongoshAsyncRewrittenMethod: true,
          });
        },
      },
    };
  };
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('Postprocessing lib/api-raw.d.ts as lib/api-processed.d.ts...');
  const apiRaw = await fs.readFile(
    path.resolve(__dirname, '..', 'lib', 'api-raw.d.ts'),
    'utf8'
  );
  const result = babel.transformSync(apiRaw, {
    code: true,
    ast: false,
    configFile: false,
    babelrc: false,
    browserslistConfigFile: false,
    compact: false,
    sourceType: 'module',
    plugins: [applyAsyncRewriterChanges()],
    parserOpts: {
      plugins: ['typescript'],
    },
  });
  const apiGlobals = await fs.readFile(
    path.resolve(__dirname, '..', 'src', 'api-globals.d.ts'),
    'utf8'
  );

  const code = (result?.code ?? '') + '\n' + apiGlobals;
  await fs.writeFile(
    path.resolve(__dirname, '..', 'lib', 'api-processed.d.ts'),
    code
  );

  // eslint-disable-next-line no-console
  console.log('Writing lib/api-export.js...');
  const exportCode = `"use strict";
module.exports = { api: ${JSON.stringify(code)} };
`;
  await fs.writeFile(
    path.resolve(__dirname, '..', 'lib', 'api-export.js'),
    exportCode
  );

  // eslint-disable-next-line no-console
  console.log('Writing lib/api-export.d.ts...');
  await fs.writeFile(
    path.resolve(__dirname, '..', 'lib', 'api-export.d.ts'),
    'export declare const api;'
  );
}

main().catch((err) =>
  process.nextTick(() => {
    throw err;
  })
);
