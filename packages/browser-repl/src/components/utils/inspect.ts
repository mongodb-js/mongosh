import { inspect as utilInspect } from 'util';
type BSONBaseType = { _bsontype: string };

const formatBsonType = (value: BSONBaseType): any => ({
  inspect(): string {
    return `${value._bsontype}(${(JSON.stringify(value))})`;
  }
});

function isBsonType(value: any): boolean {
  return !!(value && value._bsontype);
}

function isObject(value: any): boolean {
  return !!(value && typeof value === 'object' && !Array.isArray(value));
}

function formatProperty(value: any): any {
  if (isObject(value) && isBsonType(value)) {
    return formatBsonType(value);
  }

  return value;
}

function formatObject(object: any): any {
  const viewObject: any = {};
  for (const key of Object.keys(object)) {
    viewObject[key] = formatProperty(object[key]);
  }
  return viewObject;
}

function toViewValue(value: any): any {
  if (isBsonType(value)) {
    return formatBsonType(value);
  }

  if (isObject(value)) {
    return formatObject(value);
  }
  return value;
}

export function inspect(value: any): string {
  const viewValue = toViewValue(value);
  const stringifiedValue = utilInspect(viewValue, {
    customInspect: true,
    depth: 1000,
    breakLength: 0
  });

  return stringifiedValue;
}

