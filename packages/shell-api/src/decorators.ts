import { MongoshInternalError } from '@mongosh/errors';
import type { ReplPlatform } from '@mongosh/service-provider-core';
import type { AutocompletionContext } from '@mongodb-js/mongodb-ts-autocomplete';
import type { Mongo, ShellInstanceState } from '.';
import type { Topologies } from './enums';
import {
  ALL_PLATFORMS,
  ALL_SERVER_VERSIONS,
  ALL_API_VERSIONS,
  ALL_TOPOLOGIES,
  asPrintable,
  namespaceInfo,
  shellApiType,
} from './enums';
import Help from './help';
import { addHiddenDataProperty } from './helpers';
import type { CursorConstructionOptionsWithChains } from './abstract-cursor';

const addSourceToResultsSymbol = Symbol.for('@@mongosh.addSourceToResults');
const resultSource = Symbol.for('@@mongosh.resultSource');

/**
 * Full name of a MongoDB collection.
 */
export interface Namespace {
  db: string;
  collection: string;
}

/**
 * Information about the origin of a result returned by a shell API call.
 */
export interface ShellResultSourceInformation {
  namespace: Namespace;
}

/**
 * Represents the result of a shell evaluation. The {@link toShellResult}
 * function can be used to turn a raw JS value into an object of this form.
 */
export interface ShellResult {
  /**
   * The original result of the evaluation, as it would be stored e.g. as a
   * variable inside the shell.
   */
  rawValue: any;

  /**
   * A version of the raw value that is usable for printing, e.g. what the
   * shell would print.
   */
  printable: any;

  /**
   * The type of the shell result. This refers to built-in shell types, e.g.
   * `Cursor`; all unknown object types and primitives are given the
   * type `null`.
   */
  type: string | null;

  /**
   * Optional information about the original data source of the result.
   */
  source?: ShellResultSourceInformation;

  /**
   * Optional information for Cursor types about how to reconstruct the cursor.
   */
  constructionOptions?: CursorConstructionOptionsWithChains;
}

/**
 * Base class that most shell API classes inherit from. Some of our method
 * decorators rely on these shared features (for example, `_instanceState`
 * always being present).
 */
export abstract class ShellApiClass {
  public help: any;

  /**
   * A reference to the shell instance to which this object belongs.
   */
  abstract get _instanceState(): ShellInstanceState;

  /**
   * This is reported as `type` in {@link ShellResult} instances.
   * It is used by the output formatters in the different environments
   * to figure out how to print this specific object.
   */
  get [shellApiType](): string {
    throw new MongoshInternalError('Shell API Type did not use decorators');
  }
  set [shellApiType](value: string) {
    addHiddenDataProperty(this, shellApiType, value);
  }

  /**
   * Return the information required to format this object for presentation
   * to the user. This method may return a Promise.
   */
  [asPrintable](): any {
    if (Array.isArray(this)) {
      return [...this];
    }
    return { ...this };
  }
}

/**
 * Helper for shell API classes which have access to a {@link Mongo}
 * object instance.
 */
export abstract class ShellApiWithMongoClass extends ShellApiClass {
  abstract get _mongo(): Mongo;

  get _instanceState(): ShellInstanceState {
    // _mongo can be undefined in tests
    return this._mongo?._instanceState;
  }
}

/**
 * Helper for shell API classes which do not have access to a
 * {@link Mongo} object instance.
 */
export abstract class ShellApiValueClass extends ShellApiClass {
  get _mongo(): never {
    throw new MongoshInternalError('Not supported on this value class');
  }

  get _instanceState(): never {
    throw new MongoshInternalError('Not supported on this value class');
  }
}

/**
 * Look up the shell API type, if any, for a given JS object.
 * Unlike {@link toShellResult}, this method completes synchronously.
 *
 * @param rawValue Any JS value.
 */
export function getShellApiType(rawValue: any): string | null {
  return rawValue?.[shellApiType] ?? null;
}

/**
 * Look up an object's type and printable representation.
 *
 * @param rawValue Any JS value.
 * @returns A {@link ShellResult} object with information about the value.
 */
export async function toShellResult(rawValue: any): Promise<ShellResult> {
  if (
    (typeof rawValue !== 'object' && typeof rawValue !== 'function') ||
    rawValue === null
  ) {
    return {
      type: null,
      rawValue: rawValue,
      printable: rawValue,
    };
  }

  if ('then' in rawValue && typeof rawValue.then === 'function') {
    // Accepting Promises for the actual values here makes life a bit easier
    // in the Java shell.
    return toShellResult(await rawValue);
  }

  const type = getShellApiType(rawValue);

  const printable =
    typeof rawValue[asPrintable] === 'function'
      ? await rawValue[asPrintable]()
      : rawValue;

  const source = rawValue[resultSource] ?? undefined;

  // for cursors, if we have the necessary information, we might want to be able
  // to reconstruct the cursor on the other side.
  const constructionOptions = rawValue._constructionOptions
    ? { options: rawValue._constructionOptions, chains: rawValue._chains }
    : undefined;

  return {
    type,
    rawValue,
    printable,
    source,
    constructionOptions,
  };
}

/**
 * Wrap a class method so that its return value will be decorated with
 * a hidden data property indicating the source of that data.
 *
 * This applies exclusively to classes which use the {@link addSourceToResults}
 * decorator. These classes need to implement a {@link namespaceInfo} getter.
 *
 * Specifically, for classes like Collection, it can be useful to attach
 * information to the result about the original data source, so that downstream
 * consumers of the shell can e.g. figure out how to edit a document returned
 * from the shell.
 *
 * This helper also attaches the `shellApiType` property to the
 * return type (if that is possible and they are not already present), so that
 * we can also provide sensible information for methods that do not return
 * shell classes, like db.coll.findOne() which returns a Document (i.e. a plain
 * JavaScript object).
 *
 * @param fn The class method to be wrapped.
 * @returns The wrapped class method.
 */
function wrapWithAddSourceToResult(fn: Function): Function {
  function addSource<T extends {}>(result: T, obj: any): T {
    if (typeof result === 'object' && result !== null) {
      const resultSourceInformation: ShellResultSourceInformation = {
        namespace: obj[namespaceInfo](),
      };
      addHiddenDataProperty(result, resultSource, resultSourceInformation);
      if (
        (result as any)[shellApiType] === undefined &&
        (fn as any).returnType
      ) {
        addHiddenDataProperty(result, shellApiType, (fn as any).returnType);
      }
    }
    return result;
  }
  const wrapper = (fn as any).returnsPromise
    ? markImplicitlyAwaited(async function (
        this: any,
        ...args: any[]
      ): Promise<any> {
        return addSource(await fn.call(this, ...args), this);
      })
    : function (this: any, ...args: any[]): any {
        return addSource(fn.call(this, ...args), this);
      };
  Object.setPrototypeOf(wrapper, Object.getPrototypeOf(fn));
  Object.defineProperties(wrapper, Object.getOwnPropertyDescriptors(fn));
  return wrapper;
}

/**
 * Wrap a method on a shell API class so that the wrapped function
 * automatically checks whether a user interrupt has occurred
 * (for example, Ctrl+C in the command line variant).
 *
 * This also adds checks to emit deprecation notifications on the bus
 * so that we can gather telemetry about which deprecated methods are
 * used and how frequently.
 *
 * @param fn The class method to wrap.
 * @param className The name of the class on which the method is present.
 * @returns The wrapped class method.
 */
function wrapWithApiChecks<T extends (...args: any[]) => any>(
  fn: T,
  className: string
): (args: Parameters<T>) => ReturnType<T> {
  const wrapper = (fn as any).returnsPromise
    ? markImplicitlyAwaited(async function (
        this: any,
        ...args: any[]
      ): Promise<any> {
        const instanceState = getShellInstanceState(this);
        emitApiCallTelemetry(instanceState, className, fn, true);
        const interruptFlag = instanceState?.interrupted;
        interruptFlag?.checkpoint();
        const interrupt = interruptFlag?.asPromise();

        let result: any;
        try {
          if (instanceState) {
            instanceState.apiCallDepth++;
          }
          result = await Promise.race([
            interrupt?.promise ?? new Promise<never>(() => {}),
            fn.call(this, ...args),
          ]);
        } catch (e: any) {
          throw instanceState?.transformError(e) ?? e;
        } finally {
          if (instanceState) {
            instanceState.apiCallDepth--;
          }
          if (interrupt) {
            interrupt.destroy();
          }
        }
        interruptFlag?.checkpoint();
        return result;
      })
    : function (this: any, ...args: any[]): any {
        const instanceState = getShellInstanceState(this);
        emitApiCallTelemetry(instanceState, className, fn, false);
        const interruptFlag = instanceState?.interrupted;
        interruptFlag?.checkpoint();
        let result: any;
        try {
          if (instanceState) {
            instanceState.apiCallDepth++;
          }
          result = fn.call(this, ...args);
        } catch (e: any) {
          throw instanceState?.transformError(e) ?? e;
        } finally {
          if (instanceState) {
            instanceState.apiCallDepth--;
          }
        }
        interruptFlag?.checkpoint();
        return result;
      };
  Object.setPrototypeOf(wrapper, Object.getPrototypeOf(fn));
  Object.defineProperties(wrapper, Object.getOwnPropertyDescriptors(fn));
  return wrapper;
}

/**
 * Emit a 'mongosh:api-call' event on the instance state's message bus,
 * with the 'deprecated' property set if the function was marked with
 * the {@link deprecated} decorator.
 *
 * @param instanceState A ShellInstanceState object.
 * @param className The name of the class in question.
 * @param fn The class method in question.
 */
function emitApiCallTelemetry(
  instanceState: ShellInstanceState | undefined,
  className: string,
  fn: Function,
  isAsync: boolean
) {
  instanceState?.emitApiCall?.({
    method: fn.name,
    class: className,
    deprecated: !!(fn as any).deprecated,
    isAsync,
  });
}

/**
 * Look up the {@link ShellInstanceState} object associated with a shell API object.
 *
 * @param apiClass An object that subclasses {@link ShellApiClass}.
 */
function getShellInstanceState(apiObject: any): ShellInstanceState | undefined {
  if (!apiObject[shellApiType]) {
    throw new MongoshInternalError(
      'getShellInstanceState can only be called for functions from shell API classes'
    );
  }
  // instanceState can be undefined in tests
  return (apiObject as ShellApiClass)._instanceState;
}

/**
 * A set of options and helpers that can be used by autocompletion support
 * for built-in shell commands (e.g. `use` or `show`).
 *
 * This is a bit more restrictive than {@link AutocompleteParameters} used in the
 * instance state code, so that it can also be accessed by testing code in the
 * autocomplete package. You can expand this type to be closer to `AutocompleteParameters`
 * as needed.
 */
export interface ShellCommandAutocompleteParameters {
  getDatabaseCompletions: (dbName: string) => string[] | Promise<string[]>;
}

export type NewShellCommandAutocompleteParameters = Pick<
  AutocompletionContext,
  'currentDatabaseAndConnection' | 'databasesForConnection'
>;

/**
 * Provide a suggested list of completions for the last item in a shell command,
 * e.g. `show pro` to `show profile` by returning ['profile'].
 */
export type ShellCommandCompleter = (
  params: ShellCommandAutocompleteParameters,
  args: string[]
) => Promise<string[] | undefined>;

export type NewShellCommandCompleter = (
  context: NewShellCommandAutocompleteParameters,
  args: string[]
) => Promise<string[] | undefined>;

/**
 * Information about a class or a method that is used for
 * e.g. autocompletion and i18n support.
 */
export interface TypeSignature {
  type: string;
  serverVersions?: [string, string];
  apiVersions?: [number, number];
  topologies?: Topologies[];
  returnsPromise?: boolean;
  deprecated?: boolean;
  returnType?: string | TypeSignature;
  attributes?: { [key: string]: TypeSignature };
  isDirectShellCommand?: boolean;
  acceptsRawInput?: boolean;
  shellCommandCompleter?: ShellCommandCompleter;
  newShellCommandCompleter?: NewShellCommandCompleter;
  inherited?: boolean;
}

/**
 * Signatures of all shell API classes.
 */
interface Signatures {
  [key: string]: TypeSignature;
}

// We currently store a list of all shell class signatures
// on the global object. Ideally, this will go away
// as part of a refactor of the autocompletion system, e.g.
// by making the signatures accessible from a ShellInstanceState
// object instead of a global list, or even more radical changes
// such as removing the concept of signatures altogether.
const signaturesGlobalIdentifier = '@@@mdb.signatures@@@';
if (!(globalThis as any)[signaturesGlobalIdentifier]) {
  (globalThis as any)[signaturesGlobalIdentifier] = {};
}

const signatures: Signatures = (globalThis as any)[signaturesGlobalIdentifier];
signatures.Document = { type: 'Document', attributes: {} };
export { signatures };

/**
 * This is similar to {@link TypeSignature}, but differs in that it
 * is specifically for classes and all properties are required, not optional.
 */
type ClassSignature = {
  type: string;
  returnsPromise: boolean;
  deprecated: boolean;
  attributes: {
    [methodName: string]: {
      type: 'function';
      serverVersions: [string, string];
      apiVersions: [number, number];
      topologies: Topologies[];
      returnType: ClassSignature;
      returnsPromise: boolean;
      deprecated: boolean;
      platforms: ReplPlatform[];
      isDirectShellCommand: boolean;
      acceptsRawInput?: boolean;
      shellCommandCompleter?: ShellCommandCompleter;
      newShellCommandCompleter?: NewShellCommandCompleter;
      inherited?: true;
    };
  };
};

/**
 * Contains the i18n keys for a class and its attributes.
 */
type ClassHelp = {
  help: string;
  docs: string;
  attr: { name: string; description: string }[];
};

export const toIgnore = ['constructor', 'help', 'toJSON'];

/**
 * Decorator helper for all shell API classes. Generates the signature for the
 * class and its methods.
 *
 * @param constructor The target class.
 * @param hasHelp Whether the class has own help information or not.
 */
function shellApiClassGeneric<T extends { prototype: any }>(
  constructor: T,
  hasHelp: boolean,
  context: ClassDecoratorContext
): void {
  const className = context.name!;
  const classHelpKeyPrefix = `shell-api.classes.${className}.help`;
  const classHelp: ClassHelp = {
    help: `${classHelpKeyPrefix}.description`,
    docs: `${classHelpKeyPrefix}.link`,
    attr: [],
  };
  const classSignature: ClassSignature = {
    type: className,
    returnsPromise: constructor.prototype.returnsPromise || false,
    deprecated: constructor.prototype.deprecated || false,
    attributes: {},
  };

  const classAttributes = Object.getOwnPropertyNames(constructor.prototype);
  for (const propertyName of classAttributes) {
    const descriptor = Object.getOwnPropertyDescriptor(
      constructor.prototype,
      propertyName
    );

    if (toIgnore.includes(propertyName) || propertyName.startsWith('_')) {
      continue;
    }

    const isMethod =
      descriptor?.value && typeof descriptor.value === 'function';
    if (!isMethod) {
      const attributeHelpKeyPrefix = `${classHelpKeyPrefix}.attributes.${propertyName}`;
      classHelp.attr.push({
        name: propertyName,
        description: `${attributeHelpKeyPrefix}.description`,
      });
      continue;
    }

    let method: any = (descriptor as any).value;

    if ((constructor as any)[addSourceToResultsSymbol]) {
      method = wrapWithAddSourceToResult(method);
    }
    method = wrapWithApiChecks(method, className);

    method.serverVersions = method.serverVersions || ALL_SERVER_VERSIONS;
    method.apiVersions = method.apiVersions || ALL_API_VERSIONS;
    method.topologies = method.topologies || ALL_TOPOLOGIES;
    method.returnType = method.returnType || {
      type: 'unknown',
      attributes: {},
    };
    method.returnsPromise = method.returnsPromise || false;
    method.deprecated = method.deprecated || false;
    method.platforms = method.platforms || ALL_PLATFORMS;
    method.isDirectShellCommand = method.isDirectShellCommand || false;
    method.acceptsRawInput = method.acceptsRawInput || false;
    method.shellCommandCompleter = method.shellCommandCompleter || undefined;
    method.newShellCommandCompleter =
      method.newShellCommandCompleter || undefined;

    classSignature.attributes[propertyName] = {
      type: 'function',
      serverVersions: method.serverVersions,
      apiVersions: method.apiVersions,
      topologies: method.topologies,
      returnType: method.returnType === 'this' ? className : method.returnType,
      returnsPromise: method.returnsPromise,
      deprecated: method.deprecated,
      platforms: method.platforms,
      isDirectShellCommand: method.isDirectShellCommand,
      acceptsRawInput: method.acceptsRawInput,
      shellCommandCompleter: method.shellCommandCompleter,
      newShellCommandCompleter: method.newShellCommandCompleter,
    };

    const attributeHelpKeyPrefix = `${classHelpKeyPrefix}.attributes.${propertyName}`;
    const attrHelp = {
      help: `${attributeHelpKeyPrefix}.example`,
      docs: `${attributeHelpKeyPrefix}.link`,
      attr: [{ description: `${attributeHelpKeyPrefix}.description` }],
    };
    const aHelp = new Help(attrHelp);
    method.help = (): Help => aHelp;
    Object.setPrototypeOf(method.help, aHelp);

    classHelp.attr.push({
      name: propertyName,
      description: `${attributeHelpKeyPrefix}.description`,
    });
    Object.defineProperty(constructor.prototype, propertyName, {
      ...descriptor,
      value: method,
    });
  }

  let superClass = constructor.prototype;
  while ((superClass = Object.getPrototypeOf(superClass)) !== null) {
    if (
      superClass.constructor.name === 'ShellApiClass' ||
      superClass.constructor === Array
    ) {
      break;
    }
    const superClassHelpKeyPrefix = `shell-api.classes.${superClass.constructor.name}.help`;
    for (const propertyName of Object.getOwnPropertyNames(superClass)) {
      const descriptor = Object.getOwnPropertyDescriptor(
        superClass,
        propertyName
      );
      const isMethod =
        descriptor?.value && typeof descriptor.value === 'function';
      if (
        classAttributes.includes(propertyName) ||
        !isMethod ||
        toIgnore.includes(propertyName) ||
        propertyName.startsWith('_')
      )
        continue;
      const method: any = (descriptor as any).value;

      classSignature.attributes[propertyName] = {
        type: 'function',
        serverVersions: method.serverVersions,
        apiVersions: method.apiVersions,
        topologies: method.topologies,
        returnType:
          method.returnType === 'this' ? className : method.returnType,
        returnsPromise: method.returnsPromise,
        deprecated: method.deprecated,
        platforms: method.platforms,
        isDirectShellCommand: method.isDirectShellCommand,
        acceptsRawInput: method.acceptsRawInput,
        shellCommandCompleter: method.shellCommandCompleter,
        newShellCommandCompleter: method.newShellCommandCompleter,
        inherited: true,
      };

      const attributeHelpKeyPrefix = `${superClassHelpKeyPrefix}.attributes.${propertyName}`;

      classHelp.attr.push({
        name: propertyName,
        description: `${attributeHelpKeyPrefix}.description`,
      });
    }
  }
  const help = new Help(classHelp);
  constructor.prototype.help = (): Help => help;
  Object.setPrototypeOf(constructor.prototype.help, help);
  constructor.prototype[asPrintable] =
    constructor.prototype[asPrintable] || ShellApiClass.prototype[asPrintable];
  addHiddenDataProperty(constructor.prototype, shellApiType, className);
  if (hasHelp) {
    signatures[className] = classSignature;
  }
}

/**
 * Marks a class as being a Shell API class including help information.
 */
export function shellApiClassDefault<T extends { prototype: any }>(
  constructor: T,
  context: ClassDecoratorContext
): void {
  return shellApiClassGeneric(constructor, true, context);
}

/**
 * Marks a class as being a Shell API class without help information
 * (e.g. a superclass of other classes).
 */
export function shellApiClassNoHelp<T extends { prototype: any }>(
  constructor: T,
  context: ClassDecoratorContext
): void {
  return shellApiClassGeneric(constructor, false, context);
}

/**
 * Wrap a function so that its return value is a Promise which is
 * decorated with the `@@mongosh.syntheticPromise` symbol, to tell
 * the async rewriter that the result of this function should be
 * implicitly `await`ed.
 *
 * @param orig The function to be wrapped.
 * @returns The wrapped function.
 */
function markImplicitlyAwaited<This, Args extends any[], Return>(
  orig: (this: This, ...args: Args) => Promise<Return>
): (this: This, ...args: Args) => Promise<Return> {
  function wrapper(this: This, ...args: Args[]) {
    const origResult = orig.call(this, ...(args as any));
    return addHiddenDataProperty(
      origResult,
      Symbol.for('@@mongosh.syntheticPromise'),
      true
    );
  }
  Object.setPrototypeOf(wrapper, Object.getPrototypeOf(orig));
  Object.defineProperties(wrapper, Object.getOwnPropertyDescriptors(orig));
  return wrapper;
}

/**
 * Marks the decorated method as being supported for the given range of server versions.
 * Server versions are given as `[min, max]` where both boundaries are **inclusive**.
 * If the version of the server the user is connected to is not inside the range, the method
 * will not be included in autocompletion.
 *
 * When a method is deprecated after a specific server version, the `versionArray` should include
 * this version as the `max` value.
 *
 * See also `ServerVersions.earliest` and `ServerVersions.latest`.
 *
 * @param versionArray An array of supported server versions
 */
export function serverVersions(serverVersions: [string, string]) {
  return function <T extends Function>(
    value: T,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: ClassMethodDecoratorContext
  ): T & { serverVersions: [string, string] } {
    return Object.assign(value, { serverVersions });
  };
}

/**
 * Marks the decorated method as being supported for the given range of API versions.
 * API versions are given as `[version]` or `[min, max]`.
 * If the API version the user specified during connection is not inside the range, the method
 * will not be included in autocompletion.
 *
 * @param versionArray An array of supported API versions
 */
export function apiVersions(versionArray: [] | [number] | [number, number]) {
  return function <T extends Function>(
    value: T,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: ClassMethodDecoratorContext
  ): T & { apiVersions: [number, number] } {
    if (versionArray.length === 0) {
      versionArray = [0, 0];
    } else if (versionArray.length === 1) {
      versionArray = [versionArray[0], Infinity];
    }
    return Object.assign(value, { apiVersions: versionArray });
  };
}

/**
 * Marks the decorated class/method as deprecated.
 * A deprecated method will not be included in autocompletion.
 *
 * Calling a deprecated method will automatically emit a telemetry event but
 * will **not** print an automatic deprecation warning (see `printDeprecationWarning`).
 *
 * **Important:** To exclude the method from autocompletion use `@serverVersions`.
 */
export function deprecated<T extends Function>(
  value: T,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: ClassMethodDecoratorContext
): T & { deprecated: true } {
  return Object.assign(value, { deprecated: true } as const);
}

/**
 * Marks the decorated method as only being available for the given topologies.
 * The method will not be included in autocomplete if the user is connected to a cluster
 * of a topology type that is not present in `topologiesArray`.
 *
 * @param topologiesArray The topologies for which the method is available
 */
export function topologies(topologies: Topologies[]) {
  return function <T extends Function>(
    value: T,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: ClassMethodDecoratorContext
  ): T & { topologies: Topologies[] } {
    return Object.assign(value, { topologies });
  };
}

export const nonAsyncFunctionsReturningPromises: string[] = []; // For testing.
/**
 * Marks the decorated method as having a synthetic promise return value that needs to be implicitly
 * awaited by the async rewriter.
 *
 * Note: a test will verify that the `nonAsyncFunctionsReturningPromises` is empty, i.e. **every**
 * method that is decorated with `@returnsPromise` must be an `async` method.
 */
export function returnsPromise<This, Args extends any[], Return>(
  originalFunction: (this: This, ...args: Args) => Promise<Return>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: ClassMethodDecoratorContext<
    This,
    (this: This, ...args: Args) => Promise<Return>
  >
): ((this: This, ...args: Args) => Promise<Return>) & { returnsPromise: true } {
  async function wrapper(this: This, ...args: Args[]): Promise<Return> {
    try {
      return await originalFunction.call(this, ...(args as any));
    } finally {
      if (
        typeof setTimeout === 'function' &&
        typeof setImmediate === 'function'
      ) {
        // Not all JS environments have setImmediate
        await new Promise(setImmediate);
      }
    }
  }
  Object.setPrototypeOf(wrapper, Object.getPrototypeOf(originalFunction));
  Object.defineProperties(
    wrapper,
    Object.getOwnPropertyDescriptors(originalFunction)
  );

  if (originalFunction.constructor.name !== 'AsyncFunction') {
    nonAsyncFunctionsReturningPromises.push(originalFunction.name);
  }
  return Object.assign(markImplicitlyAwaited(wrapper), {
    returnsPromise: true,
  } as const);
}

/**
 * Marks the deocrated method as executable in the shell in a POSIX-shell-like
 * fashion, e.g. `show foo` which is translated into a call to `show('foo')`.
 */
export function directShellCommand<T extends Function>(
  value: T,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: ClassMethodDecoratorContext
): T & { isDirectShellCommand: true } {
  return Object.assign(value, { isDirectShellCommand: true } as const);
}

/**
 * Marks the decorated method to provide a specific `completer` function to be
 * called for autocomplete.
 *
 * This can be used to provide autocompletion for POSIX-shell-like commands,
 * e.g. `show ...`.
 *
 * @param completer The completer to use for autocomplete
 */
export function shellCommandCompleter(
  shellCommandCompleter: ShellCommandCompleter,
  newShellCommandCompleter: NewShellCommandCompleter
) {
  return function <T extends Function>(
    value: T,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: ClassMethodDecoratorContext
  ): T & {
    shellCommandCompleter: ShellCommandCompleter;
    newShellCommandCompleter: NewShellCommandCompleter;
  } {
    return Object.assign(value, {
      shellCommandCompleter,
      newShellCommandCompleter,
    });
  };
}

/**
 * Marks the decorated method as returning a (resolved) value of the given Shell API type.
 * The type is given as string being the classname of the Shell API class.
 * Specify `'this'` in order to return a value of the methods surrounding class type.
 *
 * @param type The Shell API return type of the method
 */
export function returnType(returnType: string) {
  return function <T extends Function>(
    value: T,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: ClassMethodDecoratorContext
  ): T & { returnType: string } {
    return Object.assign(value, { returnType });
  };
}

/**
 * Marks the constructor of the decorated class as being deprecated.
 *
 * Calling the constructor will automatically emit a telemetry event but
 * will **not** print an automatic deprecation warning (see `printDeprecationWarning`).
 */
export function classDeprecated<T extends { prototype: any }>(
  constructor: T,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: ClassDecoratorContext
): void {
  constructor.prototype.deprecated = true;
}

/**
 * Marks the decorated method as only being supported on the given platforms.
 * @param platformsArray The platforms the method is supported on
 */
export function platforms(platforms: ReplPlatform[]) {
  return function <T extends Function>(
    value: T,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: ClassMethodDecoratorContext
  ): T & { platforms: ReplPlatform[] } {
    return Object.assign(value, { platforms });
  };
}

/**
 * Marks the constructor of the decorated class as only being supported on the given platforms.
 * @param platformsArray The platforms the method is supported on
 */
export function classPlatforms(platformsArray: ReplPlatform[]): Function {
  return function addSourceToResults<T extends { prototype: any }>(
    constructor: T,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: ClassDecoratorContext
  ): void {
    constructor.prototype.platforms = platformsArray;
  };
}

/**
 * Marks the decorated class that for all methods in the class additional
 * source information of the call will be added to the calls returned result.
 */
export function addSourceToResults<T extends { prototype: any }>(
  constructor: T,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: ClassDecoratorContext
): void {
  (constructor as any)[addSourceToResultsSymbol] = true;
}

/**
 * A decorator that marks a cursor method as a chainable method, i.e. a method that returns the cursor itself so that calls can be chained.
 *
 * This is used for methods like `sort()` and `limit()`, which modify the cursor but still return it, so that calls can be chained like `db.collection.find().sort(...).limit(...)`.
 */
export function cursorChainable<
  This extends { _chains: any[] },
  Args extends any[],
  Return
>(
  originalFunction: (this: This, ...args: Args) => Return
): (this: This, ...args: Args) => Return {
  function wrapper(this: This, ...args: Args): Return {
    // Push the method name and arguments onto the cursor's chain array
    this._chains.push({
      method: originalFunction.name,
      args: [...args],
    });
    // Call the original method and return its result
    return originalFunction.call(this, ...args);
  }
  Object.setPrototypeOf(wrapper, Object.getPrototypeOf(originalFunction));
  Object.defineProperties(
    wrapper,
    Object.getOwnPropertyDescriptors(originalFunction)
  );
  return wrapper;
}
