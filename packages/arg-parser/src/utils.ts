import z from 'zod/v4';

export function coerceObject(schema: z.ZodObject): (value: unknown) => unknown {
  return (value: unknown) => {
    switch (typeof value) {
      case 'string':
        return schema.parse(JSON.parse(value));
      case 'object':
        return value;
      default:
        return null;
    }
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

export function unwrapType(type: unknown): z.ZodType {
  assertZodType(type);
  let unwrappedType = z.clone(type);
  while (
    unwrappedType instanceof z.ZodOptional ||
    unwrappedType instanceof z.ZodDefault ||
    unwrappedType instanceof z.ZodNullable ||
    unwrappedType instanceof z.ZodPipe
  ) {
    if (unwrappedType instanceof z.ZodPipe) {
      const nextWrap = unwrappedType.def.out;
      assertZodType(nextWrap);
      unwrappedType = nextWrap;
    } else {
      const nextWrap = unwrappedType.unwrap();
      assertZodType(nextWrap);
      unwrappedType = nextWrap;
    }
  }

  return unwrappedType;
}

function assertZodType(type: unknown): asserts type is z.ZodType {
  if (!(type instanceof z.ZodType)) {
    throw new Error(
      `Unknown schema field type: ${
        type && typeof type === 'object' ? type.constructor.name : typeof type
      }`
    );
  }
}
