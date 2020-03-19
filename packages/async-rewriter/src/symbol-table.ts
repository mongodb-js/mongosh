/* eslint no-console:0 */
/**
 * Symbol Table implementation, which is a stack of key-value maps.
 *
 * A single symbol has a name and type attribute.
 * The type attribute will be one of:
 *     unknown: { type: 'unknown', attributes?: {} }
 *     function: { type: 'function', returnsPromise?: bool, returnType?: type name or obj, attributes?: {} }
 *     class instance: { type: classname, attributes?: {} }
 *     class definition: { type: 'classdef', returnType: type name or obj }
 */
export default class SymbolTable {
  readonly scopeStack: any;
  public types: any;
  constructor(initialScope, types) {
    this.scopeStack = [initialScope];
    this.types = types;
    Object.keys(types).forEach(s => {
      if (s === 'unknown') return;
      this.add(s, { type: 'classdef', returnType: types[s], lib: true });
    });
  }
  lookup(item): any {
    for (let i = 0; i < this.scopeStack.length; i++) {
      if (this.scopeStack[i][item]) {
        return this.scopeStack[i][item];
      }
    }
    return this.types.unknown;
  }
  add(item, value): void {
    this.scopeStack[this.scopeStack.length - 1][item] = value;
  }
  update(item, value): void {
    for (let i = 0; i < this.scopeStack.length; i++) {
      if (this.scopeStack[i][item]) {
        this.scopeStack[i][item] = value;
        return;
      }
    }
    return this.add(item, value);
  }
  popScope(): void {
    if (this.scopeStack.length === 1) return;
    this.scopeStack.pop();
  }
  pushScope(): void {
    this.scopeStack.push([]);
  }
  printSymbol(s, i): void {
    const type = s.type;
    let info = '';
    if (type === 'function') {
      let rt = s.returnType;
      if (typeof s.returnType === 'undefined') {
        rt = '?';
      } else if (typeof s.returnType === 'object') {
        rt = rt.type;
      }
      const rp = s.returnsPromise === undefined ? '?' : s.returnsPromise;
      info = `returnType: ${rt} returnsPromise: ${rp}`;
    } else {
      info = ` attr: ${s.attributes ? JSON.stringify(Object.keys(s.attributes)) : []}`;
    }
    console.log(`  ${i}: { type: '${type}' ${info} }`);
  }
  print(): void {
    console.log('----Printing Symbol Table----');
    for (let i = this.scopeStack.length - 1; i >= 0; i--) {
      const scope = this.scopeStack[i];
      console.log(`scope@${i}:`);
      Object.keys(scope).filter((s) => (!scope[s].lib)).forEach((k) => {
        this.printSymbol(scope[k], k);
      });
    }
    console.log('-----------------------------');
  }
}

