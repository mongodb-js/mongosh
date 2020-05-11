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

export function shellApiClassDefault(constructor: Function) {
  const className = constructor.name;
  const classHelpKeyPrefix = `shell-api.classes.${className}.help`;
  const classHelp = {
    help: `${classHelpKeyPrefix}.description`,
    docs: `${classHelpKeyPrefix}.link`,
    attr: []
  };

  for (const propertyName of Object.keys(constructor.prototype)) {
    const descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, propertyName);
    const isMethod = descriptor.value instanceof Function;
    if (!isMethod || propertyName === 'toReplString') continue;

    descriptor.value.serverVersions = descriptor.value.serverVersions || ALL_SERVER_VERSIONS;
    descriptor.value.topologies = descriptor.value.topologies || ALL_TOPOLOGIES;
    descriptor.value.returnType = descriptor.value.returnType || { type: 'unknown', attributes: {} };
    descriptor.value.returnsPromise = descriptor.value.returnsPromise || false;

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
  constructor.prototype.shellApiType = () => (className);
  constructor.prototype.toReplString = constructor.prototype.toReplString || function(): any { return JSON.parse(JSON.stringify(constructor.prototype)); };
  constructor.prototype.hasAsyncChild = constructor.prototype.hasAsyncChild || false;
}

export function serverVersions(value: any[]) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    descriptor.value.serverVersions = value;
  };
}
export function topologies(value: any[]) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    descriptor.value.topologies = value;
  };
}
export function returnsPromise(value: boolean) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    descriptor.value.topologies = value;
  };
}
export function returnType(value: string) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    descriptor.value.topologies = value;
  };
}
