const path = require('path');

const fs = require('fs');

const yaml = require('js-yaml');

const YAML_DIR = 'yaml';

const proxyTemplate = (contents) => (`    const handler = {
      get: function (obj, prop) {
        if (!(prop in obj)) {
          obj[prop] = new Collection(_mapper, _database, prop);
        }
        return obj[prop];
      }
    };
${contents}
    return new Proxy(this, handler);
`);

/**
 * Generate a single attribute.
 *
 * @param {String} attrName - the name of the attribute being generated.
 * @param {Object} lib - the spec for the parent, either class or method.
 * @param {String} base - the name of the method if a method attribute.
 * @return {String}
 */
const attrTemplate = (attrName, lib, base = '') => {
  const attr = lib[attrName];
  const lhs = `    this${base}.${attrName}`;

  if (attrName === 'help') {
    let attributesToList = Object.keys(lib).filter(
      (a) => (!a.startsWith('__') && a !== 'help')
    );
    if ('__constructorArgs' in lib) {
      const constructorArgs = lib.__constructorArgs.filter((a) => (!a.startsWith('_')));
      attributesToList = attributesToList.concat(constructorArgs);
    }
    const helpValue = `${attr}
Attributes: ${attributesToList.join(', ')}`;

    return `${lhs} = () => (${JSON.stringify(helpValue)});
${lhs}.toReplString = () => (${JSON.stringify(helpValue)});`
  }

  return `${lhs} = ${JSON.stringify(attr)};`;
};

/**
 * Generate a single method and any method attributes.
 *
 * @param {String} methodName - the name of the method being generated
 * @param {Object} lib - the spec for a class
 * @return {String}
 */
const methodTemplate = (methodName, lib) => {
  const method = lib[methodName];
  const firstArg = lib.__methods.firstArg !== '' ? `${lib.__methods.firstArg}, ` : '';
  const methodStr = `    this.${methodName} = function() {
      return this.${lib.__methods.wrappee}.${methodName}(${firstArg}...arguments);
    };`;

  /* add any method attributes, like 'help' */
  const base = `.${methodName}`;
  return Object.keys(method)
    .filter((a) => (!a.startsWith('__')))
    .reduce(
      (str, methodAttrName) => {
        const attrStr = attrTemplate(methodAttrName, method, base);
        return `${str}\n${attrStr}`
      },
      methodStr
    );
};

/**
 * Generate a class from a single file spec.
 *
 * @param {String} className - the name of the class (file name without extension)
 * @param {Object} lib - the spec for a class
 * @return {String} the generated Shell API class
 */
const classTemplate = (className, lib) => {
  /* constructor arguments */
  const args = lib.__constructorArgs;
  let attributes = args.reduce((s, k) => (
    `${s}    this.${k} = ${k};\n`
  ), '');

  /* string representaiton */
  if (lib.__stringRep) {
    attributes = `${attributes}
    this.toReplString = () => (this.${lib.__stringRep});\n`
  }

  /* class methods and attributes */
  let contents = Object.keys(lib).reduce((str, name) => {
    const element = lib[name];
    /* skip metadata */
    if (name.startsWith('__')) {
      return str;
    }

    let elementStr;
    if (element.__type === 'function') {
      elementStr = methodTemplate(name, lib);
    } else {
      elementStr = attrTemplate(name, lib);
    }
    return `${str}${elementStr}\n`;
  }, attributes);

  /* special case for proxy */
  if (className === 'Database') {
    contents = proxyTemplate(contents);
  }

  return `class ${className} {
  constructor(${args.join(', ')}) {
${contents}  }
}
`};

/**
 * Load all the YAML specs and generate the Shell API.
 */
const loadAll = () => {
  const yamlDir = path.join(__dirname, YAML_DIR);
  const main = fs.readFileSync(path.join(yamlDir, 'main.yaml'));
  const mainLib = yaml.load(main);
  const FILES = fs.readdirSync(yamlDir).filter((s) => (/[A-Z]/.test( s[0])));
  let exports = '\nmodule.exports = ShellApi;\n';

  const classes = FILES.reduce((str, fileName) => {
    const className = fileName.slice(0, -5);
    console.log(`${fileName} => lib/shell-api.js`);

    /* load YAML into memory */
    const fileContents = fs.readFileSync(path.join(yamlDir, fileName));
    const lib = yaml.load(`${main}${fileContents}`);

    /* append class to exports */
    exports = `${exports}module.exports.${className} = ${className};\n`;

    /* generate class */
    return `${str}${classTemplate(className, lib.class)}`;
  }, '/* AUTO-GENERATED SHELL API CLASSES*/\n');

  const result = Object.keys(mainLib)
    .filter((f) => !f.startsWith('_'))
    .reduce((str, className) => {
      exports = `${exports}module.exports.${className} = ${className};\n`;
      return `${str}\nconst ${className} = Object.freeze(${JSON.stringify(mainLib[className], null, ' ')});`;
    }, classes);

  fs.writeFileSync(
    path.join(__dirname, 'lib', 'shell-api.js'),
    `${result}\n${exports}`
  );
};

loadAll();
