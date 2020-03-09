/* eslint no-console:0 */
export default class SymbolTable {
    readonly scopeStack: any;
    constructor(initialScope) {
      this.scopeStack = [initialScope];
    }
    lookup(item): any {
      for (let i = 0; i < this.scopeStack.length; i++) {
        if (this.scopeStack[i][item]) {
          return this.scopeStack[i][item];
        }
      }
      return 'Unknown';
    }
    add(item, value): void {
      this.scopeStack[this.scopeStack.length - 1][item] = value;
    }
    popScope(): void {
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
        console.log('scope:');
        Object.keys(scope).forEach((k) => {
          this.printSymbol(scope[k], k);
        });
      }
      console.log('-----------------------------');
    }
}

