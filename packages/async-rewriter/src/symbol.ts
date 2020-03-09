import { types } from 'mongosh-shell-api';

/**
 * A single symbol. The type argument will be one of:
 *     unknown: { type: 'unknown', attributes?: {} }
 *     function: { type: 'function', returnsPromise?: bool, returnType?: type name or obj, attributes?: {} }
 *     class instance: { type: classname, attributes?: {} }
 *     class definition: { type: 'classdef', returnType: type name or obj }
 */
export default class Symbol {
  public name: string;
  public type: any;
  constructor(name, type) {
    this.name = name;
    this.type = type === undefined ? types.unknown : type;
  }
}


