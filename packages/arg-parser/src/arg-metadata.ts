import z from 'zod/v4';

/**
 * Registry for argument options metadata
 */
export const argMetadata = z.registry<ArgumentMetadata>();

/**
 * Metadata that can be used to define field's parsing behavior
 */
export type ArgumentMetadata = {
  /** If set, sets this field as deprecated and replaces this field with the set field. */
  deprecationReplacement?: string;
  /** If set, gets replaced with a differet field name (without deprecation) */
  replacement?: string;
  /** Whether this argument is unsupported. Always throws an error if set to true. */
  unsupported?: boolean;
  /** Aliases for this argument. */
  alias?: string[];
};

/**
 * Extract metadata for a field using the custom registry
 */
export function getArgumentMetadata(
  schema: z.ZodObject,
  fieldName: string
): ArgumentMetadata | undefined {
  const fieldSchema = schema.shape[fieldName as keyof typeof schema.shape];
  if (!fieldSchema) {
    return undefined;
  }
  return argMetadata.get(fieldSchema);
}

/**
 * Maps deprecated arguments to their new counterparts, derived from schema metadata.
 */
export function getDeprecatedArgsWithReplacement<T>(
  schema: z.ZodObject
): Record<keyof z.infer<typeof schema>, T> {
  const deprecated: Record<string, T> = {};
  for (const fieldName of Object.keys(schema.shape)) {
    const meta = getArgumentMetadata(schema, fieldName);
    if (meta?.deprecationReplacement) {
      deprecated[fieldName] = meta.deprecationReplacement as T;
    }
  }
  return deprecated;
}

/**
 * Get list of unsupported arguments, derived from schema metadata.
 */
export function getUnsupportedArgs(schema: z.ZodObject): string[] {
  const unsupported: string[] = [];
  for (const fieldName of Object.keys(schema.shape)) {
    const meta = getArgumentMetadata(schema, fieldName);
    if (meta?.unsupported) {
      unsupported.push(fieldName);
    }
  }
  return unsupported;
}

export class UnknownCliArgumentError extends Error {
  /** The argument that was not parsed. */
  readonly argument: string;
  constructor(argument: string) {
    super(`Unknown argument: ${argument}`);
    this.name = 'UnknownCliArgumentError';
    this.argument = argument;
  }
}

export class UnsupportedCliArgumentError extends Error {
  /** The argument that was not supported. */
  readonly argument: string;
  constructor(argument: string) {
    super(`Unsupported argument: ${argument}`);
    this.name = 'UnsupportedCliArgumentError';
    this.argument = argument;
  }
}
