import { types } from 'util';
import { bson } from '@mongosh/service-provider-core';

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

  return bson.EJSON.stringify(value, undefined, 2, {
    relaxed: mode === 'relaxed',
  });
}
