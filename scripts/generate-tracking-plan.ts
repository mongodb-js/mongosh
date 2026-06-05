#!/usr/bin/env ts-node
/**
 * Generates docs/tracking-plan.md from the typed event interfaces in
 * packages/logging/src/telemetry-events.ts.
 *
 * Usage: ts-node scripts/generate-tracking-plan.ts > docs/tracking-plan.md
 */

import ts from 'typescript';
import * as fs from 'fs';
import path from 'path';

const TELEMETRY_EVENTS_FILE = path.resolve(
  __dirname,
  '../packages/logging/src/telemetry-events.ts'
);

interface PropertyInfo {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

interface EventInfo {
  interfaceName: string;
  eventName: string;
  category: string;
  description: string;
  properties: PropertyInfo[];
}

interface SectionInfo {
  description: string;
  properties: PropertyInfo[];
}

function getTelemetryEventNames(sourceFile: ts.SourceFile): string[] {
  const names: string[] = [];
  ts.forEachChild(sourceFile, (node) => {
    if (
      ts.isTypeAliasDeclaration(node) &&
      node.name.text === 'MongoshTelemetryEvent' &&
      ts.isUnionTypeNode(node.type)
    ) {
      for (const typeElement of node.type.types) {
        if (
          ts.isTypeReferenceNode(typeElement) &&
          ts.isIdentifier(typeElement.typeName)
        ) {
          names.push(typeElement.typeName.text);
        }
      }
    }
  });
  return names;
}

function getSourceWithResolvedTypes(
  originalSource: ts.SourceFile,
  eventTypeNames: string[]
) {
  // Creates a new in-memory source that appends resolved versions of each event
  // type, flattening intersections and type references into basic types.
  // This lets us use the TypeChecker to emit readable, fully-expanded types
  // in the tracking plan even when the source uses shared base interfaces.
  const resolvedEventTypes = eventTypeNames
    .map(
      (name) => `
type Resolved${name} = {
  name: ${name}['name'];
  properties: ResolveType<${name} extends { properties: infer P } ? P : Record<string, never>>;
};`
    )
    .join('\n');

  const modifiedSourceText = `
type ResolveType<T> = T extends (...args: infer A) => infer R
  ? (...args: ResolveType<A>) => ResolveType<R>
  : T extends object
  ? T extends infer O
    ? { [K in keyof O]: ResolveType<O[K]> }
    : never
  : T;

${originalSource.text}

type ResolvedMongoshCommonEventProperties = ResolveType<MongoshCommonEventProperties>;
type ResolvedMongoshIdentifyTraits = ResolveType<MongoshIdentifyTraits>;

${resolvedEventTypes}
`;

  const sourceFile = ts.createSourceFile(
    'inMemoryFile.ts',
    modifiedSourceText,
    ts.ScriptTarget.Latest,
    true
  );

  const compilerOptions = { strictNullChecks: true };
  const host = ts.createCompilerHost(compilerOptions);
  host.getSourceFile = (fileName) =>
    fileName === 'inMemoryFile.ts' ? sourceFile : undefined;

  const program = ts.createProgram(['inMemoryFile.ts'], compilerOptions, host);
  const checker = program.getTypeChecker();
  return { sourceFile, checker };
}

function extractPropertiesFromType(
  type: ts.Type,
  node: ts.Node,
  checker: ts.TypeChecker
): PropertyInfo[] {
  const props: PropertyInfo[] = [];

  for (const prop of type.getProperties()) {
    const propType = checker.getTypeOfSymbolAtLocation(prop, node);
    const isOptionalFlag = (prop.getFlags() & ts.SymbolFlags.Optional) !== 0;
    const allowsUndefined =
      propType.isUnion() &&
      propType.types.some((t) => t.flags & ts.TypeFlags.Undefined);
    props.push({
      name: prop.getName(),
      type: checker.typeToString(
        propType,
        undefined,
        ts.TypeFormatFlags.NoTruncation
      ),
      description: ts.displayPartsToString(
        prop.getDocumentationComment(checker)
      ),
      required: !isOptionalFlag && !allowsUndefined,
    });
  }

  // Index signatures, e.g. [key: string]: T
  for (const indexInfo of checker.getIndexInfosOfType(type)) {
    props.push({
      name: `[key: ${checker.typeToString(indexInfo.keyType)}]`,
      type: checker.typeToString(
        indexInfo.type,
        undefined,
        ts.TypeFormatFlags.NoTruncation
      ),
      description: '',
      required: false,
    });
  }

  return props;
}

function findTypeAlias(
  sourceFile: ts.SourceFile,
  name: string
): ts.TypeAliasDeclaration {
  let found: ts.TypeAliasDeclaration | undefined;
  sourceFile.forEachChild((node) => {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === name) {
      found = node;
    }
  });
  if (!found) throw new Error(`Type alias ${name} not found`);
  return found;
}

function findInterface(
  sourceFile: ts.SourceFile,
  name: string
): ts.InterfaceDeclaration {
  let found: ts.InterfaceDeclaration | undefined;
  sourceFile.forEachChild((node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === name) {
      found = node;
    }
  });
  if (!found) throw new Error(`Interface ${name} not found`);
  return found;
}

function parseTelemetryEvent(
  interfaceName: string,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
): EventInfo {
  const originalNode = findInterface(sourceFile, interfaceName);
  const resolvedNode = findTypeAlias(sourceFile, `Resolved${interfaceName}`);

  const originalSymbol = checker.getSymbolAtLocation(originalNode.name);
  const description = originalSymbol
    ? ts.displayPartsToString(originalSymbol.getDocumentationComment(checker))
    : '';

  const categoryTag = ts
    .getJSDocTags(originalNode)
    .find((tag) => tag.tagName.getText() === 'category');
  const category = categoryTag?.comment?.toString() ?? 'Other';

  const resolvedType = checker.getTypeAtLocation(resolvedNode);
  const nameSymbol = resolvedType
    .getProperties()
    .find((p) => p.getName() === 'name');
  let eventName = interfaceName;
  if (nameSymbol) {
    const nameType = checker.getTypeOfSymbolAtLocation(nameSymbol, resolvedNode);
    if (nameType.isStringLiteral()) eventName = nameType.value;
  }

  const propsSymbol = resolvedType
    .getProperties()
    .find((p) => p.getName() === 'properties');
  const properties = propsSymbol
    ? extractPropertiesFromType(
        checker.getTypeOfSymbolAtLocation(propsSymbol, resolvedNode),
        resolvedNode,
        checker
      )
    : [];

  return { interfaceName, eventName, category, description, properties };
}

function parseSectionType(
  interfaceName: string,
  resolvedAlias: string,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
): SectionInfo {
  const originalNode = findInterface(sourceFile, interfaceName);
  const resolvedNode = findTypeAlias(sourceFile, resolvedAlias);

  const originalSymbol = checker.getSymbolAtLocation(originalNode.name);
  const description = originalSymbol
    ? ts.displayPartsToString(originalSymbol.getDocumentationComment(checker))
    : '';

  const type = checker.getTypeAtLocation(resolvedNode);
  const properties = extractPropertiesFromType(type, resolvedNode, checker);
  return { description, properties };
}

function anchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function renderPropertiesTable(
  properties: PropertyInfo[],
  lines: string[]
): void {
  if (properties.length === 0) {
    lines.push('_No additional properties._');
    return;
  }
  lines.push('| Property | Type | Required | Description |');
  lines.push('|----------|------|----------|-------------|');
  for (const prop of properties) {
    lines.push(
      `| \`${prop.name}\` | \`${escapeCell(prop.type)}\` | ${prop.required ? 'Yes' : 'No'} | ${escapeCell(prop.description)} |`
    );
  }
}

function generateMarkdown(
  events: EventInfo[],
  traits: SectionInfo,
  commonProps: SectionInfo
): string {
  const lines: string[] = [];
  const date = new Date().toISOString().split('T')[0];

  lines.push('# mongosh Tracking Plan');
  lines.push('');
  lines.push(`> Auto-generated on ${date}. Do not edit manually.`);
  lines.push(
    '> Run `npm run generate-tracking-plan` to regenerate from source.'
  );
  lines.push('');

  lines.push('## Common Properties');
  lines.push('');
  lines.push(commonProps.description);
  lines.push('');
  renderPropertiesTable(commonProps.properties, lines);

  lines.push('');
  lines.push('## Identity');
  lines.push('');
  lines.push(traits.description);
  lines.push('');
  renderPropertiesTable(traits.properties, lines);

  const byCategory = new Map<string, EventInfo[]>();
  for (const event of events) {
    if (!byCategory.has(event.category)) byCategory.set(event.category, []);
    byCategory.get(event.category)!.push(event);
  }

  lines.push('');
  lines.push('## Table of Contents');
  lines.push('');
  for (const [cat, catEvents] of byCategory) {
    lines.push(`- [${cat}](#${anchor(cat)})`);
    for (const event of catEvents) {
      lines.push(`  - [${event.eventName}](#${anchor(event.eventName)})`);
    }
  }

  for (const [cat, catEvents] of byCategory) {
    lines.push('');
    lines.push(`## ${cat}`);
    lines.push('');
    for (const event of catEvents) {
      lines.push(`### ${event.eventName}`);
      lines.push('');
      if (event.description) {
        lines.push(event.description);
        lines.push('');
      }
      renderPropertiesTable(event.properties, lines);
      lines.push('');
    }
  }

  return lines.join('\n');
}

// -- main --

const originalSource = ts.createSourceFile(
  TELEMETRY_EVENTS_FILE,
  fs.readFileSync(TELEMETRY_EVENTS_FILE, 'utf8'),
  ts.ScriptTarget.Latest,
  true
);

const eventTypeNames = getTelemetryEventNames(originalSource);
if (eventTypeNames.length === 0) throw new Error('No events found in MongoshTelemetryEvent');

const { sourceFile, checker } = getSourceWithResolvedTypes(originalSource, eventTypeNames);

const commonProps = parseSectionType(
  'MongoshCommonEventProperties',
  'ResolvedMongoshCommonEventProperties',
  sourceFile,
  checker
);
const traits = parseSectionType(
  'MongoshIdentifyTraits',
  'ResolvedMongoshIdentifyTraits',
  sourceFile,
  checker
);

const events = eventTypeNames.map((name) =>
  parseTelemetryEvent(name, sourceFile, checker)
);

process.stdout.write(generateMarkdown(events, traits, commonProps) + '\n');
