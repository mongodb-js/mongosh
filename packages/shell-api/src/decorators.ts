/* eslint-disable dot-notation,complexity */
import Help from './help';
import {
  Topologies,
  ALL_PLATFORMS,
  ALL_TOPOLOGIES,
  ALL_SERVER_VERSIONS,
  shellApiType,
  asShellResult
} from './enums';
import { MongoshInternalError } from '@mongosh/errors';

export interface ShellApiInterface {
  [asShellResult]: Function;
  asPrintable: Function;
  serverVersions?: [string, string];
  topologies?: Topologies[];
  help?: Help;
  [key: string]: any;
}

export interface ShellResult {
  value: any;
  type: string;
}

export class ShellApiClass implements ShellApiInterface {
  help: any;
  [asShellResult](): any {
    throw new MongoshInternalError('Shell API Type did not use decorators');
  }
  asPrintable(): any {
    return Object.assign({}, this);
  }
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

if (!global['!!!mdb.signatures']) {
  global['!!!mdb.signatures'] = {};
}

const signatures: Signatures = global['!!!mdb.signatures'];

export const toIgnore = [asShellResult, 'asPrintable', 'constructor'];
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
  constructor.prototype.asPrintable =
    constructor.prototype.asPrintable ||
    function(): any { return Object.assign({}, this); };
  if (!constructor.prototype.hasOwnProperty(asShellResult)) {
    constructor.prototype[asShellResult] = async function(): Promise<ShellResult> {
      return {
        type: className,
        value: await this.asPrintable()
      };
    };
  }
  Object.defineProperty(constructor.prototype, shellApiType, { value: className, enumerable: false });
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
