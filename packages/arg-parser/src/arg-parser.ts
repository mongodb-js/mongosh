import parser from 'yargs-parser';
import { z, ZodError } from 'zod/v4';
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
  InvalidArgumentError,
  UnknownArgumentError,
  UnsupportedArgumentError,
} from './arg-metadata';
import {
  coerceIfBoolean,
  coerceIfFalse,
  coerceObject,
  unwrapType,
} from './utils';

export const defaultParserOptions: Partial<YargsOptions> = {
  configuration: {
    'camel-case-expansion': false,
    'unknown-options-as-args': true,
    'parse-positional-numbers': false,
    'parse-numbers': false,
    'greedy-arrays': false,
    'short-option-groups': false,
  },
};

export type ParserOptions = Partial<YargsOptions>;

export function parseArgs<T>({
  args,
  schema,
  parserOptions,
}: {
  args: string[];
  schema: z.ZodObject;
  parserOptions?: YargsOptions;
}): {
  /** Parsed options from the schema, including replaced deprecated arguments. */
  parsed: z.infer<typeof schema> & Omit<parser.Arguments, '_'>;
  /** Record of used deprecated arguments which have been replaced. */
  deprecated: Record<keyof z.infer<typeof schema>, T>;
  /** Positional arguments which were not parsed as options. */
  positional: parser.Arguments['_'];
} {
  const options = generateYargsOptionsFromSchema({
    schema,
    parserOptions,
  });

  const { argv, error } = parser.detailed(args, {
    ...options,
  });
  const { _: positional, ...parsedArgs } = argv;

  if (error) {
    if (error instanceof ZodError) {
      throw new InvalidArgumentError(error.message);
    }
    throw error;
  }

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
      throw new UnknownArgumentError(arg);
    }
  }

  const unsupportedArgs = getUnsupportedArgs(schema);
  for (const unsupported of unsupportedArgs) {
    if (unsupported in parsedArgs) {
      throw new UnsupportedArgumentError(unsupported);
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
export function parseArgsWithCliOptions<
  T extends CliOptions = ParsedCliOptions
>({
  args,
  schema: schemaToExtend,
  parserOptions,
}: {
  args: string[];
  /** Schema to extend the CLI options schema with. */
  schema?: z.ZodObject;
  parserOptions?: Partial<YargsOptions>;
}): ReturnType<typeof parseArgs<T>> {
  const schema =
    schemaToExtend !== undefined
      ? z.object({
          ...CliOptionsSchema.shape,
          ...schemaToExtend.shape,
        })
      : CliOptionsSchema;
  const { parsed, positional, deprecated } = parseArgs<T>({
    args,
    schema,
    parserOptions,
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

/**
 * Generate yargs-parser configuration from schema
 */
export function generateYargsOptionsFromSchema({
  schema,
  parserOptions = defaultParserOptions,
}: {
  schema: z.ZodObject;
  parserOptions?: Partial<YargsOptions>;
}): YargsOptions {
  const options: Required<
    Pick<
      YargsOptions,
      'string' | 'boolean' | 'array' | 'alias' | 'coerce' | 'number'
    > & { array: string[] }
  > = {
    ...parserOptions,
    string: [],
    boolean: [],
    array: [],
    alias: {},
    coerce: {},
    number: [],
  };

  /**
   * Recursively process fields in a schema, including nested object fields
   */
  function processFields(currentSchema: z.ZodObject, prefix = ''): void {
    for (const [fieldName, fieldSchema] of Object.entries(
      currentSchema.shape
    )) {
      const fullFieldName = prefix ? `${prefix}.${fieldName}` : fieldName;
      const meta = getArgumentMetadata(currentSchema, fieldName);

      const unwrappedType = unwrapType(fieldSchema);

      // Determine type
      if (unwrappedType instanceof z.ZodArray) {
        options.array.push(fullFieldName);
      } else if (unwrappedType instanceof z.ZodBoolean) {
        options.boolean.push(fullFieldName);
      } else if (unwrappedType instanceof z.ZodString) {
        options.string.push(fullFieldName);
      } else if (unwrappedType instanceof z.ZodNumber) {
        options.number.push(fullFieldName);
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
            options.coerce[fullFieldName] = coerceIfFalse;
            // Setting as string prevents --{field} from being valid.
            options.string.push(fullFieldName);
          } else if (hasBoolean) {
            // If the field is 'true' or 'false', we coerce the value to a boolean.
            options.coerce[fullFieldName] = coerceIfBoolean;
          } else {
            options.string.push(fullFieldName);
          }
        }
      } else if (unwrappedType instanceof z.ZodEnum) {
        if (
          unwrappedType.options.every((opt: unknown) => typeof opt === 'string')
        ) {
          options.string.push(fullFieldName);
        } else if (
          unwrappedType.options.every((opt: unknown) => typeof opt === 'number')
        ) {
          options.number.push(fullFieldName);
        } else {
          throw new Error(
            `${fullFieldName} has unsupported enum options. Currently, only string and number enum options are supported.`
          );
        }
      } else if (unwrappedType instanceof z.ZodObject) {
        // For top-level object fields (no prefix), keep the coerce function
        // to support --field '{"key":"value"}' format
        if (!prefix) {
          options.coerce[fullFieldName] = coerceObject(unwrappedType);
        }
        // Recursively process nested fields
        processFields(unwrappedType, fullFieldName);
      } else {
        throw new Error(
          `Unknown field type: ${
            unwrappedType instanceof Object
              ? unwrappedType.constructor.name
              : typeof unwrappedType
          }`
        );
      }

      // Add aliases (only for top-level fields)
      if (!prefix && meta?.alias) {
        for (const a of meta.alias) {
          options.alias[a] = fullFieldName;
        }
      }
    }
  }

  processFields(schema);

  return options;
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

export { argMetadata, UnknownArgumentError, UnsupportedArgumentError };
export { type ArgumentMetadata } from './arg-metadata';
export { type CliOptions, CliOptionsSchema } from './cli-options';
