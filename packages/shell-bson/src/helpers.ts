import { MongoshInvalidInputError, CommonErrors } from '@mongosh/errors';

// Create a copy of a class so that it's constructible without `new`, i.e.
// class A {}; B = functionCtor(A);
// A() // throws
// B() // does not throw, returns instance of A
export function functionCtorWithoutProps<
  T extends Function & { new (...args: any): any }
>(
  ClassCtor: T
): {
  new (...args: ConstructorParameters<T>): InstanceType<T>;
  (...args: ConstructorParameters<T>): InstanceType<T>;
} {
  function fnCtor(...args: any[]) {
    if (new.target) {
      return Reflect.construct(ClassCtor, args, new.target);
    }
    return new ClassCtor(...args);
  }
  Object.setPrototypeOf(fnCtor, Object.getPrototypeOf(ClassCtor));
  const nameDescriptor = Object.getOwnPropertyDescriptor(ClassCtor, 'name');
  if (nameDescriptor) {
    Object.defineProperty(fnCtor, 'name', nameDescriptor);
  }
  return fnCtor as any;
}

export function assignAll<T extends {}, U extends {}>(t: T, u: U): T & U;
export function assignAll<T extends {}, U extends {}, V extends {}>(
  t: T,
  u: U,
  v: V
): T & U & V;
export function assignAll<
  T extends {},
  U extends {},
  V extends {},
  W extends {}
>(t: T, u: U, v: V, w: W): T & U & V & W;
export function assignAll(target: {}, ...sources: {}[]): any {
  const newDescriptorList = [];
  for (const source of sources) {
    newDescriptorList.push(
      ...Object.entries(Object.getOwnPropertyDescriptors(source))
    );
  }
  const newDescriptorMap = Object.fromEntries(newDescriptorList);
  for (const key of Object.getOwnPropertyNames(newDescriptorMap)) {
    if (Object.getOwnPropertyDescriptor(target, key)?.configurable === false) {
      // e.g. .prototype can be written to but not re-defined
      (target as any)[key] = newDescriptorMap[key].value;
      delete newDescriptorMap[key];
    }
  }
  Object.defineProperties(target, newDescriptorMap);

  return target;
}

// pick() but account for descriptor properties and ensure that the set of passed
// keys matches the public properties of O exactly
export function pickWithExactKeyMatch<
  K extends string,
  O extends Record<K, unknown>
>(o: Record<string, never> extends Omit<O, K> ? O : never, keys: K[]): O {
  return Object.create(
    Object.getPrototypeOf(o),
    Object.fromEntries(
      Object.entries(Object.getOwnPropertyDescriptors(o)).filter(([k]) =>
        (keys as string[]).includes(k)
      )
    )
  );
}

function getAssertCaller(caller?: string): string {
  return caller ? ` (${caller})` : '';
}

// NB: Duplicate of the one in packages/shell-api/src/helpers.ts
export function assertArgsDefinedType(
  args: any[],
  expectedTypes: Array<true | string | Array<string | undefined>>,
  func?: string
): void {
  args.forEach((arg, i) => {
    const expected = expectedTypes[i];
    if (arg === undefined) {
      if (
        expected !== true &&
        Array.isArray(expected) &&
        expected.includes(undefined)
      ) {
        return;
      }
      throw new MongoshInvalidInputError(
        `Missing required argument at position ${i}${getAssertCaller(func)}`,
        CommonErrors.InvalidArgument
      );
    } else if (expected === true) {
      return;
    }

    const expectedTypesList: Array<string | undefined> =
      typeof expected === 'string' ? [expected] : expected;
    const isExpectedTypeof = expectedTypesList.includes(typeof arg);
    const isExpectedBson = expectedTypesList.includes(`bson:${arg?._bsontype}`);

    if (!isExpectedTypeof && !isExpectedBson) {
      const expectedMsg = expectedTypesList
        .filter((e) => e !== undefined)
        .map((e) => e?.replace(/^bson:/, ''))
        .join(' or ');
      throw new MongoshInvalidInputError(
        `Argument at position ${i} must be of type ${expectedMsg}, got ${typeof arg} instead${getAssertCaller(
          func
        )}`,
        CommonErrors.InvalidArgument
      );
    }
  });
}
