/* eslint-disable dot-notation,complexity */
import Help from './help';

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

export enum ReadPreference {
  PRIMARY = 0,
  PRIMARY_PREFERRED = 1,
  SECONDARY = 2,
  SECONDARY_PREFERRED = 3,
  NEAREST = 4
}

export enum DBQueryOption {
  tailable = 2,
  slaveOk = 4,
  oplogReplay = 8,
  noTimeout = 16,
  awaitData = 32,
  exhaust = 64,
  partial = 128
}

export const DBQuery = {
  Option: DBQueryOption
};

export interface ShellApiInterface {
  toReplString: Function;
  shellApiType?: Function;
  serverVersions?: [string, string];
  topologies?: Topologies[];
  help?: Help;
  [key: string]: any;
}

export class ShellApiClass implements ShellApiInterface {
  toReplString(): any {
    return JSON.parse(JSON.stringify(this));
  }
  shellApiType(): string {
    return 'ShellApiClass';
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
const signatures = {
  ShellApi: {
    type: 'ShellApi',
    hasAsyncChild: false,
    attributes: {
      use: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
      it: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
      show: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] }
    }
  }
} as Signatures;

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

  const classAttributes = Object.keys(constructor.prototype);
  for (const propertyName of classAttributes) {
    const descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, propertyName);
    const isMethod = descriptor.value instanceof Function;
    if (
      !isMethod ||
      ['toReplString', 'shellApiType', 'constructor'].includes(propertyName) ||
      propertyName.startsWith('_')
    ) continue;

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

  if (Object.getPrototypeOf(constructor.prototype).constructor.name !== 'ShellApiClass') {
    const superClass = Object.getPrototypeOf(constructor.prototype);
    const superClassHelpKeyPrefix = `shell-api.classes.${superClass.constructor.name}.help`;
    for (const propertyName of Object.keys(superClass)) {
      const descriptor = Object.getOwnPropertyDescriptor(superClass, propertyName);
      const isMethod = descriptor.value instanceof Function;
      if (
        classAttributes.includes(propertyName) ||
        !isMethod ||
        ['toReplString', 'shellApiType', 'constructor'].includes(propertyName) ||
        propertyName.startsWith('_')
      ) continue;
      classSignature.attributes[propertyName] = {
        type: 'function',
        returnsPromise: descriptor.value.returnsPromise,
        returnType: descriptor.value.returnType
      };

      const attributeHelpKeyPrefix = `${superClassHelpKeyPrefix}.attributes.${propertyName}`;

      classHelp.attr.push({
        name: propertyName,
        description: `${attributeHelpKeyPrefix}.description`
      });
    }
  }
  constructor.prototype.help = new Help(classHelp);
  if (!constructor.prototype.hasOwnProperty('shellApiType')) {
    constructor.prototype.shellApiType = function(): string { return className; };
  }
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
