/* eslint-disable no-sync */
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const YAML_DIR = 'yaml';

const databaseConstructorTemplate = (contents) => (`    const handler = {
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
  const lhs = `    ${base}.${attrName}`;

  if (attrName === 'help') {
    return `${lhs} = () => new Help(${JSON.stringify(attr)});`;
  }

  return `${lhs} = ${JSON.stringify(attr)};`;
};

/**
 * Generate a single method definition.
 *
 * @param {String} methodName - the name of the method being generated
 * @param {Object} lib - the spec for a class
 * @return {String}
 */
const methodTemplate = (methodName, lib) => {
  const method = lib[methodName];
  const firstArg = lib.__methods.firstArg !== '' ? `${lib.__methods.firstArg}, ` : '';
  const wrappeeCall = `this.${lib.__methods.wrappee}.${methodName}(${firstArg}...args)`;

  return method.__fluent ?
    `${methodName}(...args) {
      ${wrappeeCall};
      return this;
    }
` :
    `${methodName}(...args) {
      return ${wrappeeCall};
    }
`;
};

/**
 * Generate a single method attributes.
 * @param {String} className - the name of the class for which the method is being generated
 * @param {String} methodName - the name of the method being generated
 * @param {Object} lib - the spec for a class
 * @return {String}
 */
const methodAttributeTemplate = (className, methodName, lib) => {
  const method = lib[methodName];

  /* add any method attributes, like 'help' */
  const base = `${className}.prototype.${methodName}`;
  return Object.keys(method)
    .filter((a) => (!a.startsWith('__')))
    .reduce(
      (str, methodAttrName) => {
        const attrStr = attrTemplate(methodAttrName, method, base);
        return `${str}\n${attrStr}`;
      },
      ''
    );
};

function methodAttributesTemplate(lib, className) {
  return Object.keys(lib).reduce((str, name) => {
    const element = lib[name];
    /* skip metadata and attributes */
    if (name.startsWith('__') || element.__type !== 'function') {
      return str;
    }
    const elementStr = methodAttributeTemplate(className, name, lib);
    return `${str}${elementStr}\n`;
  }, '');
}

function constructorTemplate(args, lib, className) {
  let constructorBody = args.reduce(
    (s, k) => (
      `${s}    this.${k} = ${k};\n`
    ), ''
  );

  /* string representaiton */
  if (lib.__stringRep) {
    constructorBody = `${constructorBody}
    this.toReplString = () => {
      return ${lib.__stringRep};
    };\n`;
  }

  /* string the shell api type of the object */
  constructorBody = `${constructorBody}
  this.shellApiType = () => {
    return '${className}';
  };\n`;

  /* attributes */
  constructorBody = Object.keys(lib).reduce((str, name) => {
    const element = lib[name];
    /* skip metadata and methods */
    if (name.startsWith('__') || element.__type === 'function') {
      return str;
    }
    const elementStr = attrTemplate(name, lib, 'this');
    return `${str}${elementStr}\n`;
  }, constructorBody);

  /* special case for database as it requires proxy */
  if (className === 'Database') {
    constructorBody = databaseConstructorTemplate(constructorBody);
  }
  return constructorBody;
}

function instanceMethodsTemplate(lib) {
  return Object.keys(lib).reduce((str, name) => {
    const element = lib[name];
    /* skip metadata and attributes */
    if (name.startsWith('__') || element.__type !== 'function') {
      return str;
    }
    const elementStr = methodTemplate(name, lib);
    return `${str}${elementStr}\n`;
  }, '');
}

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
  const constructorBody = constructorTemplate(args, lib, className);
  const instanceMethods = instanceMethodsTemplate(lib);
  const methodAttributes = methodAttributesTemplate(lib, className);

  return `
class ${className} {
  constructor(${args.join(', ')}) {
    ${constructorBody}
  }

  ${instanceMethods || ''}
}

${methodAttributes};
`;
};

const symbolTemplate = (className, lib) => {
  return Object.keys(lib)
    .filter(s => (!s.startsWith('__') && s !== 'help' && s !== 'toReplString'))
    .map((s) => {
      return `    ${s}: { type: 'function', returnsPromise: ${lib[s].returnsPromise}, returnType: '${lib[s].returnType}', serverVersions: ${JSON.stringify(lib[s].serverVersions, null, '')} }`;
    }).join(',\n');
};

/**
 * Load all the YAML specs and generate the Shell API.
 */
const loadAll = () => {
  const yamlDir = path.join(__dirname, '..', YAML_DIR);
  const main = fs.readFileSync(path.join(yamlDir, 'main.yaml'));
  const mainLib = yaml.load(main);
  const FILES = fs.readdirSync(yamlDir).filter((s) => (/[A-Z]/.test( s[0])));
  let exports = '\nexport default ShellApi;\n';
  const types = ['const unknown = {\n  type: \'unknown\',\n  attributes: {}\n}'];
  const typeConsts = ['unknown'];

  const classes = FILES.reduce((str, fileName) => {
    const className = fileName.slice(0, -5);

    /* load YAML into memory */
    const fileContents = fs.readFileSync(path.join(yamlDir, fileName));
    const lib = yaml.load(`${main}${fileContents}`);

    /* append class to exports */
    exports = `${exports}export { ${className}  };\n`;
    types.push(`const ${className} = {\n  type: '${className}',\n  attributes: {\n${symbolTemplate(className, lib.class)}\n  }\n}`);
    typeConsts.push(className);

    /* generate class */
    return `${str}${classTemplate(className, lib.class)}`;
  }, '/* AUTO-GENERATED SHELL API CLASSES*/\nimport {Help} from \'./help\';\n\n');

  const result = Object.keys(mainLib)
    .filter((f) => !f.startsWith('_'))
    .reduce((str, className) => {
      exports = `${exports}export { ${className} };\n`;
      return `${str}\nconst ${className} = Object.freeze(${JSON.stringify(mainLib[className], null, ' ')});`;
    }, classes);

  fs.writeFileSync(
    path.join(__dirname, '..', 'src', 'shell-api.js'),
    `${result}\n${exports}`
  );

  fs.writeFileSync(
    path.join(__dirname, '..', 'src', 'shell-types.js'),
    `${types.join(';\n')};\nexport {\n  ${typeConsts.join(',\n  ')}\n};`
  );
};

loadAll();
