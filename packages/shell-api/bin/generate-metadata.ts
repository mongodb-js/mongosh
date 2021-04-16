/* eslint-disable complexity */
import fs from 'fs/promises';
import path from 'path';
import ts from 'typescript';

function hasDecoratorsWithName(node: ts.Node, name: string): boolean {
  return !!(
    node.decorators &&
    node.decorators.some((decorator) => {
      return (
        ts.isIdentifier(decorator.expression) &&
        decorator.expression.escapedText === name
      );
    })
  );
}

function inheritsFromShellApiBaseClass(node: ts.ClassDeclaration): boolean {
  return !!(
    node.heritageClauses &&
    node.heritageClauses.some((clause) =>
      clause.types.some(
        (type) =>
          ts.isIdentifier(type.expression) &&
          type.expression.escapedText === 'ShellApiClass'
      )
    )
  );
}

function findShellApiClass(node: ts.Node, set: Set<ts.ClassDeclaration>): void {
  if (
    ts.isClassDeclaration(node) &&
    inheritsFromShellApiBaseClass(node) &&
    hasDecoratorsWithName(node, 'shellApiClassDefault')
  ) {
    set.add(node);
    return;
  }
  ts.forEachChild(node, (node) => {
    findShellApiClass(node, set);
  });
  return;
}

function hasFlag(type: ts.Type, flag: ts.TypeFlags): boolean {
  return (type.getFlags() & flag) !== 0;
}

// function hasModifierFlag(mod: ts.Modifier, flag: ts.ModifierFlags): boolean {
//   return (mod.flags & flag) !== 0;
// }

function hasSymbolFlag(type: ts.Symbol, flag: ts.SymbolFlags): boolean {
  return (type.getFlags() & flag) !== 0;
}

function hasObjectFlag(type: ts.ObjectType, flag: ts.ObjectFlags): boolean {
  return (type.objectFlags & flag) !== 0;
}

// function isUnionType(type: ts.Type): type is ts.UnionType {
//   return hasFlag(type, ts.TypeFlags.Union);
// }

function isObjectType(type: ts.Type): type is ts.ObjectType {
  return hasFlag(type, ts.TypeFlags.Object);
}

function isTypeReference(type: ts.Type): type is ts.TypeReference {
  return isObjectType(type) && hasObjectFlag(type, ts.ObjectFlags.Reference);
}

function isTupleType(type: ts.Type): type is ts.TupleType {
  return isObjectType(type) && hasObjectFlag(type, ts.ObjectFlags.Tuple);
}

function isFunctionType(type: ts.Type): boolean {
  return type.getCallSignatures()?.length > 0;
}

function isFunctionLike(type: ts.Type): boolean {
  return (
    isObjectType(type) &&
    ['call', 'apply', 'caller', 'arguments'].every(
      (propName) => !!type.getProperty(propName)
    )
  );
}

function typeToJsonSchema(type: ts.Type, checker: ts.TypeChecker): any {
  if (type.isStringLiteral()) {
    return {
      type: 'string',
      const: type.value
    };
  }

  if (type.isNumberLiteral()) {
    return {
      type: 'number',
      const: type.value
    };
  }

  if (hasFlag(type, ts.TypeFlags.BooleanLiteral)) {
    return {
      type: 'boolean',
      const: JSON.parse(checker.typeToString(type))
    };
  }

  if (
    hasFlag(type, ts.TypeFlags.String) ||
    hasFlag(type, ts.TypeFlags.Number) ||
    hasFlag(type, ts.TypeFlags.Boolean)
  ) {
    return { type: checker.typeToString(type) };
  }

  if (isFunctionType(type) || isFunctionLike(type)) {
    return { type: 'function' };
  }

  // This might be done better, but good enough for PoC, otherwise classes
  // produce absolutely bizzare validation rules and cause recursion issues
  // where deeply nested or recursive
  if (isObjectType(type) && hasObjectFlag(type, ts.ObjectFlags.Class)) {
    return {
      type: 'object',
      instanceof: checker.typeToString(type)
    };
  }

  if (isTypeReference(type) && isTupleType(type.target)) {
    return {
      type: 'array',
      items: type.typeArguments
        ? type.typeArguments.map((type) => typeToJsonSchema(type, checker))
        : []
    };
  }

  if (
    isTypeReference(type) &&
    checker.getFullyQualifiedName(type.symbol) === 'Array'
  ) {
    const items = type.typeArguments
      ? type.typeArguments.map((type) => typeToJsonSchema(type, checker))
      : [];

    return {
      type: 'array',
      items: items.length === 1 ? { ...items[0] } : { anyOf: items }
    };
  }

  if (type.isUnion()) {
    const anyOf = type.types.map((type) => typeToJsonSchema(type, checker));

    const onlyConstValues = anyOf.filter(
      (type) => typeof type.const !== 'undefined'
    );

    const enumFromConst = onlyConstValues.reduce(
      (acc, schema) => {
        acc.type.add(schema.type);
        acc.enum.add(schema.const);
        return acc;
      },
      { type: new Set(), enum: new Set() }
    );

    enumFromConst.type = Array.from(enumFromConst.type);
    enumFromConst.enum = Array.from(enumFromConst.enum);

    if (enumFromConst.type.length === 1) {
      enumFromConst.type = enumFromConst.type[0];
    }

    if (onlyConstValues.length === anyOf.length) {
      return enumFromConst;
    }

    if (onlyConstValues.length > 1) {
      return {
        anyOf: anyOf
          .filter((type) => typeof type.const === 'undefined')
          .concat([enumFromConst])
      };
    }

    return { anyOf };
  }

  if (isObjectType(type)) {
    const required = [];
    const properties: Record<string, any> = {};

    for (const propSymbol of type.getProperties()) {
      const name = propSymbol.getName();

      // Easiest way to check for a symbol, but might be error-prone
      if (/^__@/.test(name)) {
        continue;
      }

      const propType = checker.getTypeOfSymbolAtLocation(
        propSymbol,
        propSymbol.valueDeclaration
      );

      properties[name] = typeToJsonSchema(propType, checker);

      if (!hasSymbolFlag(propSymbol, ts.SymbolFlags.Optional)) {
        required.push(name);
      }
    }

    return Object.assign(
      { type: 'object' },
      Object.keys(properties).length > 0 && {
        properties,
        // Assuming that if we were able to extract any properties for the
        // schema it means that we don't want any non-defined ones
        additionalProperties: false
      },
      required.length > 0 && { required }
    );
  }

  // Empty jsonschema is "any" value
  return {};
}

function isPrivateMember(member: ts.ClassElement): boolean {
  return !!member.modifiers?.some((modifier) => {
    return modifier.kind === ts.SyntaxKind.PrivateKeyword;
  });
}

enum ItemKind {
  Class = 'Class',
  Method = 'Method',
  Property = 'Property',
  Parameter = 'Parameter'
}

async function generateMetadata(
  fileNames: string[],
  options: ts.CompilerOptions
) {
  console.log('Generating metadata for shell-api classes ...');

  // A possibility, but mongodb classes confuse the hell out of it
  // const generator = require('ts-json-schema-generator').createGenerator({
  //   path: `{${fileNames.join(',')}}`,
  //   tsconfig: optionsPath
  // });

  const result: Record<string, any> = {};

  const program = ts.createProgram(fileNames, options);

  const checker = program.getTypeChecker();

  const shellApiClasses = new Set<ts.ClassDeclaration>();

  for (const file of program.getSourceFiles()) {
    if (!file.isDeclarationFile) {
      ts.forEachChild(file, (node) => {
        findShellApiClass(node, shellApiClasses);
      });
    }
  }

  for (const classNode of shellApiClasses) {
    if (!classNode.name) {
      continue;
    }

    const classSymbol = checker.getSymbolAtLocation(classNode.name);

    if (!classSymbol) {
      continue;
    }

    console.log('  %s', classNode.name.escapedText);

    const members: Record<string, any> = {};

    for (const member of (classNode.members || [])) {
      if (isPrivateMember(member)) {
        continue;
      }

      if (!member.name) {
        continue;
      }

      const memberSymbol = checker.getSymbolAtLocation(member.name);

      if (!memberSymbol) {
        continue;
      }

      const memberName = memberSymbol.getName();

      // shell-api convention, but maybe we should mark all those private and
      // rely on that as a filtering mechanism
      if (/^_/.test(memberName)) {
        continue;
      }

      members[memberName] = {
        label: memberName,
        description: memberSymbol.getDocumentationComment(checker),
        jsDocTags: memberSymbol.getJsDocTags(),
        deprecated:
          hasDecoratorsWithName(classNode, 'deprecated') ||
          memberSymbol.getJsDocTags()?.some((tag) => tag.name === 'deprecated')
      };

      if (ts.isPropertyDeclaration(member)) {
        Object.assign(members[memberName], { kind: ItemKind.Property });
      }

      if (ts.isMethodDeclaration(member)) {
        const memberSignature = checker.getSignatureFromDeclaration(
          member
        );

        if (!memberSignature) {
          continue;
        }

        Object.assign(members[memberName], {
          kind: ItemKind.Method,
          params: memberSignature.getParameters().map((paramSymbol) => {
            const paramDeclaration = paramSymbol.valueDeclaration as ts.ParameterDeclaration;

            const paramType = checker.getTypeOfSymbolAtLocation(
              paramSymbol,
              paramDeclaration
            );

            checker.getDeclaredTypeOfSymbol(paramSymbol);

            return {
              label: paramSymbol.getName(),
              kind: ItemKind.Parameter,
              schema: typeToJsonSchema(paramType, checker),
              printableType: checker.typeToString(paramType),
              optional: checker.isOptionalParameter(paramDeclaration),
            };
          })
        });
      }
    }

    const metadata = {
      label: classNode.name.escapedText,
      kind: ItemKind.Class,
      description: classSymbol.getDocumentationComment(checker),
      jsDocTags: classSymbol.getJsDocTags(),
      members,
      deprecated: hasDecoratorsWithName(classNode, 'classDeprecated')
    };

    result[classNode.name.escapedText as string] = metadata;
  }

  return result;
}

(async() => {
  const root = path.resolve(__dirname, '..');
  const src = path.join(root, 'src');
  const opts = path.join(root, 'tsconfig.json');

  const files = (await fs.readdir(src))
    .filter((name) => /\.ts$/.test(name) && !/\.spec/.test(name))
    .map((name) => path.join(src, name));

  const config: ts.CompilerOptions = JSON.parse(
    await fs.readFile(opts, 'utf-8')
  );

  const metadata = await generateMetadata(files, config);

  await fs.writeFile(
    path.join(src, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );
})();
