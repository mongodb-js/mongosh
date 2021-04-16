import type { JSDocTagInfo, SymbolDisplayPart } from 'typescript';
import type { JSONSchemaType } from 'ajv';
import { inspect } from 'util';
import Ajv from 'ajv';
import ShellApiMetadata from './metadata.json';
import { MongoshInvalidInputError } from '@mongosh/errors';

const ajv = new Ajv({ strict: false });

type CommonMetadata = {
  label: string;
  deprecated: boolean;
  description: SymbolDisplayPart[];
  jsDocTags: JSDocTagInfo[];
};

export type ClassMetadata = CommonMetadata & {
  kind: 'Class';
  members: Record<string, MemberMetadata>;
};

export type MemberMetadata = PropertyMetadata | MethodMetadata;

export type PropertyMetadata = CommonMetadata & {
  kind: 'Property';
};

export type MethodMetadata = CommonMetadata & {
  kind: 'Method';
  params: ParameterMetadata[];
};

export type ParameterMetadata<T = unknown> = {
  label: string;
  kind: 'Parameter';
  schema: JSONSchemaType<T>;
  printableType: string;
  optional: boolean;
  rest: boolean;
};

export function getMetadataForClass(className: string): ClassMetadata | null {
  return (ShellApiMetadata as any)[className] ?? null;
}

export function getMetadataForMember(
  className: string,
  memberName: string
): MemberMetadata | null {
  return (ShellApiMetadata as any)[className]?.members?.[memberName] ?? null;
}

export function getUsageStringForMethod(
  { label, params }: MethodMetadata,
  className?: string
): string {
  className = className ? `${className}.` : '';
  const propertiesAsString = params
    .map((prop) => {
      return [
        prop.rest ? '...' : '',
        prop.label,
        prop.optional ? '?' : '',
        ': ',
        prop.printableType
      ].join('');
    })
    .join(', ');
  return `${className}${label}(${propertiesAsString})`;
}

function invalidArgumentMessage(
  methodName: string,
  propName: string | undefined | null,
  position: number,
  expected: string,
  value: unknown
) {
  propName = propName ? `\`${propName}\`` : '';
  value = inspect(value, { breakLength: Infinity });
  return `Invalid argument ${propName}passed to method \`${methodName}\` at position ${position}: expected ${expected} but got ${value}`;
}

function unwrapArrayType(printableType: string): string {
  const [, t1, t2] = /(?:Array<(.+?)>|(.+?)\[\])/.exec(printableType) || [];
  return t1 || t2 || printableType;
}

export function validateMethodArguments(
  args: unknown[],
  metadata: MethodMetadata,
  className?: string
) {
  const usageString = getUsageStringForMethod(metadata, className);

  for (const [idx, param] of metadata.params.entries()) {
    const value = args[idx];

    if (typeof value === 'undefined' && param.optional) {
      continue;
    }

    let validate;

    try {
      validate = ajv.compile(param.schema);
    } catch (e) {
      // TODO: Just for PoC purposes so I can see where it fails, with
      // real thing we should either make sure that this never happens or
      // silently ignore it, maybe log/trace a warning or something
      const schema = JSON.stringify(param.schema);
      throw Error(
        `Failed to compile validator for schema ${schema}: ${e.message}`
      );
    }

    if (param.rest) {
      const restArgs = args.slice(idx);

      if (!validate(restArgs)) {
        const err = validate.errors?.[0];
        const pos = Number(err?.instancePath.replace('/', '') ?? 0);
        const itemType = unwrapArrayType(param.printableType);
        const msg = invalidArgumentMessage(
          metadata.label,
          null,
          idx + pos + 1,
          itemType,
          restArgs[pos]
        );

        throw new MongoshInvalidInputError(
          `${msg}\n\nUsage:\n\n  ${usageString}\n`
        );
      }

      continue;
    }

    if (!validate(value)) {
      const msg = invalidArgumentMessage(
        metadata.label,
        param.label,
        idx + 1,
        param.printableType,
        value
      );

      throw new MongoshInvalidInputError(
        `${msg}\n\nUsage:\n\n  ${usageString}\n`
      );
    }
  }
}
