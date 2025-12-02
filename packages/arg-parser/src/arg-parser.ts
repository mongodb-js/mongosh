import parser from 'yargs-parser';
import { z } from 'zod/v4';
import type { Options as YargsOptions } from 'yargs-parser';
import {
  type CliOptions,
  CliOptionsSchema,
  processPositionalCliOptions,
  validateCliOptions,
} from './cli-options';
import {
  argMetadata,
  getArgumentMetadata,
  getDeprecatedArgsWithReplacement,
  getUnsupportedArgs,
  UnknownCliArgumentError,
  UnsupportedCliArgumentError,
} from './arg-metadata';

function unwrapType(type: unknown): unknown {
  if (type instanceof z.ZodOptional) {
    return unwrapType(type.unwrap());
  }
  if (type instanceof z.ZodDefault) {
    return unwrapType(type.unwrap());
  }
  return type;
}

/**
 * Generate yargs-parser configuration from schema
 */
export function generateYargsOptionsFromSchema({
  schema,
  configuration = {
    'camel-case-expansion': false,
    'unknown-options-as-args': true,
    'parse-positional-numbers': false,
    'parse-numbers': false,
    'greedy-arrays': false,
    'short-option-groups': false,
  },
}: {
  schema: z.ZodObject;
  configuration?: YargsOptions['configuration'];
}): YargsOptions {
  const options = {
    string: <string[]>[],
    boolean: <string[]>[],
    array: <string[]>[],
    alias: <Record<string, string>>{},
    coerce: <Record<string, (value: unknown) => unknown>>{},
    number: <string[]>[],
  } satisfies Required<
    Pick<
      YargsOptions,
      'string' | 'boolean' | 'array' | 'alias' | 'coerce' | 'number'
    >
  >;

  for (const [fieldName, fieldSchema] of Object.entries(schema.shape)) {
    const meta = getArgumentMetadata(schema, fieldName);

    const unwrappedType = unwrapType(fieldSchema);

    // Determine type
    if (unwrappedType instanceof z.ZodArray) {
      options.array.push(fieldName);
    } else if (unwrappedType instanceof z.ZodBoolean) {
      options.boolean.push(fieldName);
    } else if (unwrappedType instanceof z.ZodString) {
      options.string.push(fieldName);
    } else if (unwrappedType instanceof z.ZodNumber) {
      options.number.push(fieldName);
    } else if (unwrappedType instanceof z.ZodUnion) {
      // Handle union types (like json, browser, oidcDumpTokens)
      const unionOptions = (
        unwrappedType as z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>
      ).options;

      const hasString = unionOptions.some(
        (opt) => opt instanceof z.ZodString || opt instanceof z.ZodEnum
      );

      if (hasString) {
        const hasFalseLiteral = unionOptions.some(
          (opt) => opt instanceof z.ZodLiteral && opt.value === false
        );
        const hasBoolean = unionOptions.some(
          (opt) => opt instanceof z.ZodBoolean
        );
        if (hasFalseLiteral) {
          // If set to 'false' coerce into false boolean; string in all other cases
          options.coerce[fieldName] = coerceIfFalse;
          // Setting as string prevents --{field} from being valid.
          options.string.push(fieldName);
        } else if (hasBoolean) {
          // If the field is 'true' or 'false', we coerce the value to a boolean.
          options.coerce[fieldName] = coerceIfBoolean;
        } else {
          options.string.push(fieldName);
        }
      }
    } else if (unwrappedType instanceof z.ZodEnum) {
      if (
        unwrappedType.options.every((opt: unknown) => typeof opt === 'string')
      ) {
        options.string.push(fieldName);
      } else if (
        unwrappedType.options.every((opt: unknown) => typeof opt === 'number')
      ) {
        options.number.push(fieldName);
      } else {
        throw new Error(
          `${fieldName} has unsupported enum options. Currently, only string and number enum options are supported.`
        );
      }
    } else {
      throw new Error(
        `Unknown field type: ${
          unwrappedType instanceof Object
            ? unwrappedType.constructor.name
            : typeof unwrappedType
        }`
      );
    }

    // Add aliases
    if (meta?.alias) {
      for (const a of meta.alias) {
        options.alias[a] = fieldName;
      }
    }
  }

  return {
    ...options,
    configuration,
  };
}

/**
 * Determine the locale of the shell.
 *
 * @param {string[]} args - The arguments.
 *
 * @returns {string} The locale.
 */
export function getLocale(args: string[], env: any): string {
  const localeIndex = args.indexOf('--locale');
  if (localeIndex > -1) {
    return args[localeIndex + 1];
  }
  const lang = env.LANG || env.LANGUAGE || env.LC_ALL || env.LC_MESSAGES;
  return lang ? lang.split('.')[0] : lang;
}

export function parseArgs<T>({
  args,
  schema,
  parserConfiguration,
}: {
  args: string[];
  schema: z.ZodObject;
  parserConfiguration?: YargsOptions['configuration'];
}): {
  /** Parsed options from the schema, including replaced deprecated arguments. */
  parsed: T & Omit<parser.Arguments, '_'>;
  /** Record of used deprecated arguments which have been replaced. */
  deprecated: Record<keyof z.infer<typeof schema>, T>;
  /** Positional arguments which were not parsed as options. */
  positional: parser.Arguments['_'];
} {
  const options = generateYargsOptionsFromSchema({
    schema,
    configuration: parserConfiguration,
  });

  const { _: positional, ...parsedArgs } = parser(args, options);

  const allDeprecatedArgs = getDeprecatedArgsWithReplacement<T>(schema);
  const usedDeprecatedArgs = {} as Record<keyof z.infer<typeof schema>, T>;

  for (const deprecated of Object.keys(allDeprecatedArgs)) {
    if (deprecated in parsedArgs) {
      const replacement = allDeprecatedArgs[deprecated];

      // This is a complicated type scenario.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (parsedArgs as any)[replacement] =
        parsedArgs[deprecated as keyof typeof parsedArgs];
      usedDeprecatedArgs[deprecated] = replacement;

      delete parsedArgs[deprecated as keyof typeof parsedArgs];
    }
  }

  for (const arg of positional) {
    if (typeof arg === 'string' && arg.startsWith('-')) {
      throw new UnknownCliArgumentError(arg);
    }
  }

  const unsupportedArgs = getUnsupportedArgs(schema);
  for (const unsupported of unsupportedArgs) {
    if (unsupported in parsedArgs) {
      throw new UnsupportedCliArgumentError(unsupported);
    }
  }

  return {
    parsed: parsedArgs as T & Omit<parser.Arguments, '_'>,
    deprecated: usedDeprecatedArgs,
    positional,
  };
}

type ParsedCliOptions = CliOptions & {
  smokeTests: boolean;
  perfTests: boolean;
  buildInfo: boolean;
  file?: string[];
};

/** Parses the arguments with special handling of mongosh CLI options fields. */
export function parseArgsWithCliOptions({
  args,
  schema: schemaToExtend,
}: {
  args: string[];
  /** Schema to extend the CLI options schema with. */
  schema?: z.ZodObject;
}): ReturnType<typeof parseArgs<CliOptions>> {
  const schema =
    schemaToExtend !== undefined
      ? z.object({
          ...CliOptionsSchema.shape,
          ...schemaToExtend.shape,
        })
      : CliOptionsSchema;
  const { parsed, positional, deprecated } = parseArgs<ParsedCliOptions>({
    args,
    schema,
  });

  const processed = processPositionalCliOptions({
    parsed,
    positional,
  });

  validateCliOptions(processed);

  return {
    parsed: processed,
    positional,
    deprecated,
  };
}

export function coerceIfBoolean(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    return value;
  }
  return value;
}

export function coerceIfFalse(value: unknown): unknown {
  if (value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    if (value === 'false') {
      return false;
    }
    return value;
  }
  return value;
}

export { argMetadata, UnknownCliArgumentError, UnsupportedCliArgumentError };
export { type ArgumentMetadata } from './arg-metadata';
export { type CliOptions, CliOptionsSchema } from './cli-options';
