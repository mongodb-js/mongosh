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
  private scopeStack: any;
  public types: any;
  constructor(initialScope: object[], types: object) {
    this.types = types;
    this.scopeStack = initialScope;
    Object.keys(this.types).forEach(s => {
      if (s === 'unknown' || this.lookup(s).type !== 'unknown') return;
      this.add(s, { type: 'classdef', returnType: this.types[s], lib: true });
    });
  }
  deepCopy(): SymbolTable {
    const newStack = JSON.parse(JSON.stringify(this.scopeStack));
    return new SymbolTable(newStack, this.types);
  }
  lookup(item): any {
    for (let i = this.last; i >= 0; i--) {
      if (this.scopeStack[i][item]) {
        return this.scopeStack[i][item];
      }
    }
    return this.types.unknown;
  }
  add(item, value): void {
    this.scopeStack[this.last][item] = value;
  }
  addToParent(item, value): void {
    const end = Math.max(this.last - 1, 0);
    for (let i = end; i >= 0; i--) {
      if (this.scopeStack[i][item]) {
        this.scopeStack[i][item] = value;
        return;
      }
    }
    this.scopeStack[end][item] = value;
  }
  update(item, value): void {
    for (let i = this.last; i >= 0; i--) {
      if (this.scopeStack[i][item]) {
        this.scopeStack[i][item] = value;
        return;
      }
    }
    return this.add(item, value);
  }
  popScope(): void {
    if (this.depth === 1) return;
    return this.scopeStack.pop();
  }
  pushScope(): void {
    this.scopeStack.push({});
  }
  get depth(): number {
    return this.scopeStack.length;
  }
  get last(): number {
    return this.depth - 1;
  }
  scopeAt(i): object {
    return this.scopeStack[i];
  }
  compareScope(consequent): void {
    if (this.depth !== consequent.depth) {
      throw new Error('Internal Error: scope tracking errored');
    }
    this.scopeStack.forEach((resultScope, i) => {
      const consScope = consequent.scopeAt(i);
      Object.keys(consScope).forEach((k) => {
        if (JSON.stringify(consScope[k]) === JSON.stringify(resultScope[k])) { // branches don't diverge
          resultScope[k] = consScope[k];
        } else { // branches diverge
          if ((consScope[k] !== undefined && consScope[k].hasAsyncChild) || (resultScope[k] !== undefined && resultScope[k].hasAsyncChild)) { // conditional async, error
            throw new Error('Error: cannot conditionally assign Shell API types');
          }
          resultScope[k] = consScope[k] || this.types.unknown; // update to whatever
        }
      });
    });
  }
  compareScopes(consequent, alternate): void {
    if (this.depth !== consequent.depth || consequent.depth !== alternate.depth) {
      throw new Error('Internal Error: scope tracking errored');
    }
    this.scopeStack.forEach((resultScope, i) => {
      const consScope = consequent.scopeAt(i);
      const altScope = alternate.scopeAt(i);
      const union = new Set([...Object.keys(consScope), ...Object.keys(altScope)]);
      union.forEach((k) => {
        if (JSON.stringify(consScope[k]) === JSON.stringify(altScope[k])) { // branches don't diverge
          resultScope[k] = consScope[k];
        } else if (consScope[k] === undefined || altScope[k] === undefined) { // something defined in only one branch
          if (consScope[k] !== undefined && consScope[k].hasAsyncChild || altScope[k] !== undefined && altScope[k].hasAsyncChild) { // if defined with async, error
            throw new Error('Error: cannot conditionally assign shell API types');
          }
          resultScope[k] = consScope[k] || altScope[k]; // update to whatever
        } else { // branches diverge
          if (consScope[k].hasAsyncChild || altScope[k].hasAsyncChild) { // conditional async, error
            throw new Error('Error: cannot conditionally assign Shell API types');
          }
          resultScope[k] = consScope[k]; // update to whatever
        }
      });
    });
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
    for (let scopeDepth = this.last; scopeDepth >= 0; scopeDepth--) {
      const scope = this.scopeStack[scopeDepth];
      console.log(`scope@${scopeDepth}:`);
      Object.keys(scope).filter((s) => (!scope[s].lib)).forEach((k) => {
        console.log(this.printSymbol(scope[k], k));
      });
    }
    console.log('-----------------------------');
  }
}

