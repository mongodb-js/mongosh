/* eslint-disable dot-notation */
import { Help } from './help';
export enum ServerVersions {
  latest = '4.4.0',
  earliest = '0.0.0'
}

export enum Topologies {
  ReplSet = 0,
  Standalone = 1,
  Sharded = 2
}

export const ALL_SERVER_VERSIONS = [ ServerVersions.earliest, ServerVersions.latest ];
export const ALL_TOPOLOGIES = [ Topologies.ReplSet, Topologies.Sharded, Topologies.Standalone ];

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
const signatures = {} as Signatures;

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
    attributes: {}
  };

  for (const propertyName of Object.keys(constructor.prototype)) {
    const descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, propertyName);
    const isMethod = descriptor.value instanceof Function;
    if (!isMethod || propertyName === 'toReplString') continue;

    descriptor.value.serverVersions = descriptor.value.serverVersions || ALL_SERVER_VERSIONS;
    descriptor.value.topologies = descriptor.value.topologies || ALL_TOPOLOGIES;
    descriptor.value.returnType = descriptor.value.returnType || { type: 'unknown', attributes: {} };
    descriptor.value.returnsPromise = descriptor.value.returnsPromise || false;

    classSignature.attributes[propertyName] = {
      type: 'function',
      returnsPromise: descriptor.value.returnsPromise,
      returnType: descriptor.value.returnType
    };

    const attributeHelpKeyPrefix = `${classHelpKeyPrefix}.attributes.${propertyName}`;
    descriptor.value.help = {
      help: `${attributeHelpKeyPrefix}.example`,
      docs: `${attributeHelpKeyPrefix}.link`,
      attr: [
        { description: `${attributeHelpKeyPrefix}.description` }
      ]
    };

    classHelp.attr.push({
      name: propertyName,
      description: `${attributeHelpKeyPrefix}.description`
    });
    Object.defineProperty(constructor.prototype, propertyName, descriptor);
  }
  constructor.prototype.help = new Help(classHelp);
  constructor.prototype.shellApiType = (): string => (className);
  constructor.prototype.toReplString = constructor.prototype.toReplString || function(): any { return JSON.parse(JSON.stringify(constructor.prototype)); };
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
