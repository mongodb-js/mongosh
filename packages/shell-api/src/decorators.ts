/* eslint-disable dot-notation,complexity */
import Help from './help';
import {
  Topologies,
  ALL_PLATFORMS,
  ALL_TOPOLOGIES,
  ALL_SERVER_VERSIONS,
  shellApiType,
  asPrintable,
  namespaceInfo
} from './enums';
import { MongoshInternalError } from '@mongosh/errors';
import { addHiddenDataProperty } from './helpers';

const addSourceToResultsSymbol = Symbol.for('@@mongosh.addSourceToResults');
const resultSource = Symbol.for('@@mongosh.resultSource');

export interface ShellApiInterface {
  [shellApiType]: string;
  [asPrintable]?: () => any;
  serverVersions?: [string, string];
  topologies?: Topologies[];
  help?: Help;
  [key: string]: any;
}

export interface Namespace {
  db: string;
  collection: string;
}

export interface ShellResultSourceInformation {
  namespace: Namespace;
}

export interface ShellResult {
  /// The original result of the evaluation, as it would be stored e.g. as a
  /// variable inside the shell.
  rawValue: any;

  /// A version of the raw value that is usable for printing, e.g. what the
  /// shell would print.
  printable: any;

  /// The type of the shell result. This refers to built-in shell types, e.g.
  /// `Cursor`; all unknown object types and primitives are given the
  /// type `null`.
  type: string | null;

  /// Optional information about the original data source of the result.
  source?: ShellResultSourceInformation;
}

export class ShellApiClass implements ShellApiInterface {
  help: any;
  get [shellApiType](): string {
    throw new MongoshInternalError('Shell API Type did not use decorators');
  }
  set [shellApiType](value: string) {
    addHiddenDataProperty(this, shellApiType, value);
  }
  [asPrintable](): any {
    return Object.assign({}, this);
  }
}

export function getShellApiType(rawValue: any): string | null {
  return (rawValue && rawValue[shellApiType]) ?? null;
}

export async function toShellResult(rawValue: any): Promise<ShellResult> {
  if ((typeof rawValue !== 'object' && typeof rawValue !== 'function') || rawValue === null) {
    return {
      type: null,
      rawValue: rawValue,
      printable: rawValue
    };
  }

  if ('then' in rawValue && typeof rawValue.then === 'function') {
    // Accepting Promises for the actual values here makes life a bit easier
    // in the Java shell.
    return toShellResult(await rawValue);
  }

  const printable =
    typeof rawValue[asPrintable] === 'function' ? await rawValue[asPrintable]() : rawValue;
  const source = rawValue[resultSource] ?? undefined;

  return {
    type: getShellApiType(rawValue),
    rawValue: rawValue,
    printable: printable,
    source: source
  };
}

// For classes like Collection, it can be useful to attach information to the
// result about the original data source, so that downstream consumers of the
// shell can e.g. figure out how to edit a document returned from the shell.
// To that end, we wrap the methods of a class, and report back how the
// result was generated.
// We also attach the `shellApiType` property to the
// return type (if that is possible and they are not already present), so that
// we can also provide sensible information for methods that do not return
// shell classes, like db.coll.findOne() which returns a Document (i.e. a plain
// JavaScript object).
function wrapWithAddSourceToResult(fn: Function): Function {
  function addSource<T extends {}>(result: T, obj: any): T {
    if (typeof result === 'object' && result !== null) {
      const resultSourceInformation: ShellResultSourceInformation = {
        namespace: obj[namespaceInfo](),
      };
      addHiddenDataProperty(result, resultSource, resultSourceInformation);
      if (result[shellApiType] === undefined && (fn as any).returnType) {
        addHiddenDataProperty(result, shellApiType, (fn as any).returnType);
      }
    }
    return result;
  }
  const wrapper = (fn as any).returnsPromise ?
    async function(...args): Promise<any> {
      return addSource(await fn.call(this, ...args), this);
    } : function(...args): any {
      return addSource(fn.call(this, ...args), this);
    };
  Object.setPrototypeOf(wrapper, Object.getPrototypeOf(fn));
  Object.defineProperties(wrapper, Object.getOwnPropertyDescriptors(fn));
  return wrapper;
}

interface TypeSignature {
  type: string;
  hasAsyncChild?: boolean;
  returnsPromise?: boolean;
  returnType?: string | TypeSignature;
  attributes?: { [key: string]: TypeSignature };
}

interface Signatures {
  [key: string]: TypeSignature;
}
const signaturesGlobalIdentifier = '@@@mdb.signatures@@@';
if (!global[signaturesGlobalIdentifier]) {
  global[signaturesGlobalIdentifier] = {};
}

const signatures: Signatures = global[signaturesGlobalIdentifier];
signatures.Document = { type: 'Document', attributes: {} };

export const toIgnore = [asPrintable, 'constructor'];
export function shellApiClassDefault(constructor: Function): void {
  const className = constructor.name;
  const classHelpKeyPrefix = `shell-api.classes.${className}.help`;
  const classHelp = {
    help: `${classHelpKeyPrefix}.description`,
    docs: `${classHelpKeyPrefix}.link`,
    attr: []
  };
  const classSignature = {
    type: className,
    hasAsyncChild: constructor.prototype.hasAsyncChild || false,
    returnsPromise: constructor.prototype.returnsPromise || false,
    attributes: {}
  };

  const classAttributes = Object.keys(constructor.prototype);
  for (const propertyName of classAttributes) {
    const descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, propertyName);
    const isMethod = descriptor.value instanceof Function;
    if (
      !isMethod ||
      toIgnore.includes(propertyName) ||
      propertyName.startsWith('_')
    ) continue;

    if ((constructor as any)[addSourceToResultsSymbol]) {
      descriptor.value = wrapWithAddSourceToResult(descriptor.value);
    }

    descriptor.value.serverVersions = descriptor.value.serverVersions || ALL_SERVER_VERSIONS;
    descriptor.value.topologies = descriptor.value.topologies || ALL_TOPOLOGIES;
    descriptor.value.returnType = descriptor.value.returnType || { type: 'unknown', attributes: {} };
    descriptor.value.returnsPromise = descriptor.value.returnsPromise || false;
    descriptor.value.platforms = descriptor.value.platforms || ALL_PLATFORMS;

    classSignature.attributes[propertyName] = {
      type: 'function',
      serverVersions: descriptor.value.serverVersions,
      topologies: descriptor.value.topologies,
      returnType: descriptor.value.returnType,
      returnsPromise: descriptor.value.returnsPromise,
      platforms: descriptor.value.platforms
    };

    const attributeHelpKeyPrefix = `${classHelpKeyPrefix}.attributes.${propertyName}`;
    const attrHelp = {
      help: `${attributeHelpKeyPrefix}.example`,
      docs: `${attributeHelpKeyPrefix}.link`,
      attr: [
        { description: `${attributeHelpKeyPrefix}.description` }
      ]
    };
    const aHelp = new Help(attrHelp);
    descriptor.value.help = (): Help => (aHelp);
    Object.setPrototypeOf(descriptor.value.help, aHelp);

    classHelp.attr.push({
      name: propertyName,
      description: `${attributeHelpKeyPrefix}.description`
    });
    Object.defineProperty(constructor.prototype, propertyName, descriptor);
  }

  if (Object.getPrototypeOf(constructor.prototype).constructor.name !== 'ShellApiClass') {
    const superClass = Object.getPrototypeOf(constructor.prototype);
    const superClassHelpKeyPrefix = `shell-api.classes.${superClass.constructor.name}.help`;
    for (const propertyName of Object.keys(superClass)) {
      const descriptor = Object.getOwnPropertyDescriptor(superClass, propertyName);
      const isMethod = descriptor.value instanceof Function;
      if (
        classAttributes.includes(propertyName) ||
        !isMethod ||
        toIgnore.includes(propertyName) ||
        propertyName.startsWith('_')
      ) continue;
      classSignature.attributes[propertyName] = {
        type: 'function',
        serverVersions: descriptor.value.serverVersions,
        topologies: descriptor.value.topologies,
        returnType: descriptor.value.returnType,
        returnsPromise: descriptor.value.returnsPromise,
        platforms: descriptor.value.platforms
      };

      const attributeHelpKeyPrefix = `${superClassHelpKeyPrefix}.attributes.${propertyName}`;

      classHelp.attr.push({
        name: propertyName,
        description: `${attributeHelpKeyPrefix}.description`
      });
    }
  }
  const help = new Help(classHelp);
  constructor.prototype.help = (): Help => (help);
  Object.setPrototypeOf(constructor.prototype.help, help);
  constructor.prototype[asPrintable] =
    constructor.prototype[asPrintable] ||
    function(): any { return Object.assign({}, this); };
  addHiddenDataProperty(constructor.prototype, shellApiType, className);
  signatures[className] = classSignature;
}

export { signatures };
export function serverVersions(versionArray: any[]): Function {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): void {
    descriptor.value.serverVersions = versionArray;
  };
}
export function topologies(topologiesArray: any[]): Function {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): void {
    descriptor.value.topologies = topologiesArray;
  };
}
export function returnsPromise(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
  descriptor.value.returnsPromise = true;
}
export function returnType(type: string | TypeSignature): Function {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): void {
    descriptor.value.returnType = type;
  };
}
export function hasAsyncChild(constructor: Function): void {
  constructor.prototype.hasAsyncChild = true;
}
export function classReturnsPromise(constructor: Function): void {
  constructor.prototype.returnsPromise = true;
}
export function platforms(platformsArray: any[]): Function {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): void {
    descriptor.value.platforms = platformsArray;
  };
}
export function classPlatforms(platformsArray: any[]): Function {
  return function(constructor: Function): void {
    constructor.prototype.platforms = platformsArray;
  };
}
export function addSourceToResults(constructor: Function): void {
  (constructor as any)[addSourceToResultsSymbol] = true;
}
