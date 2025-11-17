import { types } from 'util';
import { EJSON } from 'bson';

export function formatForJSONOutput(
  value: any,
  mode: 'relaxed' | 'canonical' | true
): string {
  if (types.isNativeError(value)) {
    value = {
      ...value,
      message: value.message,
      stack: value.stack,
      name: value.name,
    };
  }

  return EJSON.stringify(value, undefined, 2, {
    relaxed: mode === 'relaxed',
  });
}
