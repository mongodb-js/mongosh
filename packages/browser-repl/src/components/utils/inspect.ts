/* eslint-disable @typescript-eslint/no-var-requires */
const utilInspect = require('util').inspect;
const utilInspectCustom = utilInspect.custom || 'inspect';

const formatBsonType = (value): any => ({
  [utilInspectCustom](): string {
    return `${value._bsontype}(${(JSON.stringify(value))})`;
  }
});

function isBsonType(value): any {
  return value && value._bsontype;
}

function isObject(value): any {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function formatProperty(value): any {
  if (isObject(value) && isBsonType(value)) {
    return formatBsonType(value);
  }

  return value;
}

function formatObject(object): any {
  const viewObject = {};
  for (const key of Object.keys(object)) {
    viewObject[key] = formatProperty(object[key]);
  }
  return viewObject;
}

function toViewValue(value): any {
  if (isBsonType(value)) {
    return formatBsonType(value);
  }

  if (isObject(value)) {
    return formatObject(value);
  }
  return value;
}

type InspectOptions = {
  expanded?: boolean;
}

export function inspect(value, options: InspectOptions = {}): string {
  const viewValue = toViewValue(value);
  const stringifiedValue = utilInspect(viewValue, {
    customInspect: true,
    compact: !options.expanded,
    depth: options.expanded ? 1000 : 0,
    breakLength: 0
  });

  return stringifiedValue;
}

