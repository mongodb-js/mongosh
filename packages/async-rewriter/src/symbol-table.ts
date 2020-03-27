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
  addToParent(item, value): void {
    const i = this.scopeStack.length - 2;
    this.scopeStack[i > 0 ? i : 0][item] = value;
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
  printSymbol(symbol, key): string {
    const type = symbol.type;
    let info = '';
    if (type === 'function') {
      let rt = symbol.returnType;
      if (typeof symbol.returnType === 'undefined') {
        rt = '?';
      } else if (typeof symbol.returnType === 'object') {
        rt = rt.type;
      }
      const rp = symbol.returnsPromise === undefined ? '?' : symbol.returnsPromise;
      info = `returnType: ${rt} returnsPromise: ${rp}`;
    } else if (type === 'classdef') {
      info = this.printSymbol(symbol.returnType, 'returnType');
    } else {
      info = '[]';
      if (symbol.attributes !== undefined) {
        info = Object.keys(symbol.attributes).map((v) => {
          return `${v}: <${symbol.attributes[v].type}>`;
        }).join(', ');
      }
      info = ` attributes: { ${info} }`;
    }
    return `  ${key}: { type: '${type}' ${info} }`;
  }
  print(): void {
    console.log('----Printing Symbol Table----');
    for (let scopeDepth = this.scopeStack.length - 1; scopeDepth >= 0; scopeDepth--) {
      const scope = this.scopeStack[scopeDepth];
      console.log(`scope@${scopeDepth}:`);
      Object.keys(scope).filter((s) => (!scope[s].lib)).forEach((k) => {
        console.log(this.printSymbol(scope[k], k));
      });
    }
    console.log('-----------------------------');
  }
}

