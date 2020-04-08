/* eslint no-console:0 */
/**
 * Symbol Table implementation, which is a stack of key-value maps.
 */
export default class SymbolTable {
  private scopeStack: object[];
  public types: any;

  /**
   * Construct a new SymbolTable instance.
   * @param initialScope - usually empty, only set when deep copying SymbolTable.
   * @param types - a type object that has at least the 'type' and 'attributes' keys. Will be one of:
   *     unknown: { type: 'unknown', attributes?: {} }
   *     function: { type: 'function', returnsPromise?: bool, returnType?: type name or obj, attributes?: {} }
   *     class instance: { type: classname, attributes?: {} }
   *     class definition: { type: 'classdef', returnType: type name or obj }
   */
  constructor(initialScope: object[], types: object) {
    this.types = { unknown: { type: 'unknown', attributes: {} } };
    Object.assign(this.types, types);
    this.scopeStack = initialScope;
    Object.keys(types).forEach(s => {
      if (s === 'unknown' || this.lookup(s).type !== 'unknown') return;
      this.scopeAt(0)[s] = { type: 'classdef', returnType: this.types[s], lib: true };
    });
  }

  /**
   * Initialize the shell API class instances like db, sh, rs, etc.
   *
   * @param apiObjects - set of class instance name and type.
   */
  public initializeApiObjects(apiObjects: object): void {
    Object.keys(apiObjects).forEach(key => {
      this.scopeAt(0)[key] = apiObjects[key];
    });
  }

  /**
   * Remove the 'path' attribute from a type. Required so that we can deep clone everything in the scope *except*
   * path references.
   *
   * @param type - a type object.
   */
  public elidePath(type: object): object {
    if (type === undefined) {
      return type;
    }
    return Object.keys(type).filter(t => t !== 'path').reduce((obj, key) => {
      obj[key] = type[key];
      return obj;
    }, {});
  }

  /**
   * Do a deep comparison of two type objects.
   *
   * @param t1
   * @param t2
   */
  public compareTypes(t1: object, t2: object): boolean {
    return (JSON.stringify(this.elidePath(t1)) === JSON.stringify(this.elidePath(t2)));
  }

  /**
   * Make a deep copy of the symbols and return a new instance of SymbolTable.
   * Do not deep copy path attributes as they must stay as references to the AST.
   */
  public deepCopy(): SymbolTable {
    const newStack = [];
    this.scopeStack.forEach(oldScope => {
      const newScope = {};
      Object.keys(oldScope).forEach(key => {
        newScope[key] = JSON.parse(JSON.stringify(this.elidePath(oldScope[key])));
        if ('path' in oldScope[key]) {
          newScope[key].path = oldScope[key].path;
        }
      });
      newStack.push(newScope);
    });
    return new SymbolTable(newStack, this.types);
  }

  /**
   * Return the most recently scoped matching symbol.
   *
   * @param item
   */
  public lookup(item: string): any {
    for (let i = this.last; i >= 0; i--) {
      if (this.scopeStack[i][item]) {
        return this.scopeStack[i][item];
      }
    }
    return this.types.unknown;
  }

  /**
   * Add item to the current scope.
   *
   * @param item
   * @param value
   */
  public add(item: string, value: object): void {
    this.scopeStack[this.last][item] = value;
  }

  /**
   * Add item to the parent of the current scope. This is for class name declarations since babel's
   * findFunctionParent will return self, and we need to add the classname to the parent scope.
   * @param item
   * @param value
   */
  public addToParent(item: string, value: object): void {
    this.scopeStack[this.last - 1][item] = value;
  }

  /**
   * If item exists in the symbol table, update it and return true. Otherwise return false. Used for assignment
   * expressions because we first check if the LHS is a locally declared variable. If not then we need to treat it
   * like a hoisted var declaration.
   *
   * @param item
   * @param value
   */
  public updateIfDefined(item: string, value: object): boolean {
    for (let i = this.last; i >= 0; i--) {
      if (this.scopeStack[i][item]) {
        this.scopeStack[i][item] = value;
        return true;
      }
    }
    return false;
  }

  /**
   * Update a function-scoped variable. Get the correct scope from the AST and update enclosing scope.
   *
   * @param path - babel Path instance.
   * @param key - the name of the symbol.
   * @param type - the type of the object
   * @param t - babel's types helper.
   */
  public updateFunctionScoped(path: any, key: string, type: object, t: any): void {
    // Because it adds to scopes only via nodes, will add to actual ST regardless of branching
    let scopeParent = path.getFunctionParent();
    if (scopeParent === null) {
      scopeParent = path.findParent(p => t.isProgram(p));
    }
    const shellScope = scopeParent.node.shellScope;
    if (shellScope === undefined) {
      // scope of the parent is out of scope?
      throw new Error('internal error');
    }
    this.scopeAt(shellScope)[key] = type;
  }

  /**
   * Remove and return the most recent scope.
   */
  public popScope(): object {
    if (this.depth === 1) return;
    return this.scopeStack.pop();
  }

  /**
   * Add a new scope and return it's index.
   */
  public pushScope(): number {
    const scope = {};
    return this.scopeStack.push(scope) - 1;
  }

  /**
   * The depth of the symbol table.
   */
  public get depth(): number {
    return this.scopeStack.length;
  }

  /**
   * The index of the most recent scope.
   */
  public get last(): number {
    return this.depth - 1;
  }

  /**
   * Get the scope at a given index.
   * @param i
   */
  public scopeAt(i: number): object {
    return this.scopeStack[i];
  }

  /**
   * Compare a series of symbol tables. Used for comparing the results of branching expressions.
   *
   * Go through each scope and if any symbols differ, set type to unknown *unless* either is a Shell API type. If so,
   * then error because we cannot infer types since we do not do any branch prediction.
   *
   * If any alternative symbol table has a variable defined that is not in the current symbol table, add it as it must
   * have been a hoisted variable.
   *
   * @param alternates
   */
  public compareSymbolTables(alternates: SymbolTable[]): void {
    this.scopeStack.forEach((thisScope, i) => {
      // Get all the possible keys at the current scope for each alternative
      const keys = new Set();
      alternates.forEach((st) => {
        if (this.depth !== st.depth) {
          throw new Error('Internal Error: scope tracking errored');
        }
        Object.keys(st.scopeAt(i)).forEach(k => keys.add(k));
      });
      keys.forEach((k: number) => {
        const equal = alternates.every((a) => this.compareTypes(a.scopeAt(i)[k], alternates[0].scopeAt(i)[k]));
        if (equal) {
          // If every alternative has the same type, then add it to the current symbol table.
          thisScope[k] = alternates[0].scopeAt(i)[k];
        } else {
          // Otherwise, check if any of the alternatives has that key as a Shell API type.
          const hasAsync = alternates.some((a) => a.scopeAt(i)[k] !== undefined && (a.scopeAt(i)[k].hasAsyncChild || a.scopeAt(i)[k].returnsPromise));
          if (hasAsync) {
            throw new Error(`Error: cannot conditionally assign Shell API types. Type type of ${k} is unable to be inferred. Try using a locally scoped variable instead.`);
          } else {
            // Types differ, but none are async, so can safely just call it unknown.
            thisScope[k] = this.types.unknown;
          }
        }
      });
    });
  }

  /**
   * Return a string representation of a given symbol for debugging.
   *
   * @param symbol
   * @param key
   */
  public printSymbol(symbol: any, key: string): string {
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

  /**
   * Print out the entire symbol table for debugging.
   */
  public print(): void {
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

