const path = require('path');

const fs = require('fs');

const yaml = require('js-yaml');

const YAML_DIR = 'yaml';

const proxyTemplate = (contents) => (`    const handler = {
      get: function (obj, prop) {
        if (!(prop in obj)) {
          obj[prop] = new Collection(mapper, database, prop);
        }
        return obj[prop];
      }
    };
${contents}
    return new Proxy(this, handler);
`);

const attrTemplate = (base, name, value, parent) => {
  if (name === 'help') {
    const publicAttr = Object.keys(parent).filter((a) => (!a.startsWith('__') && a !== 'help'));
    value = `${value}
Attributes: ${publicAttr.join(', ')}`;
    return `${base}.${name} = () => (${JSON.stringify(value)});
${base}.${name}.toReplString = () => (${JSON.stringify(value)});`
  }
  return `${base}.${name} = ${JSON.stringify(value)};`;
};

const funcTemplate = (name, parent) => {
  const attr = parent[name];
  if (attr.__type === 'attribute') {
    return attrTemplate('    this', name, attr.__value, parent);
  }
  if (attr.__type === 'function') {
    const base = `    this.${name} = function() {
      return this.mapper.${name}(this, ...arguments);
    };`;

    return Object.keys(attr)
      .filter((a) => (!a.startsWith('__')))
      .reduce((s, k) => (
        `${s}
${attrTemplate(`    this.${name}`, k, attr[k], attr)}`
      ), base);
  }
  return '';
};

const classTemplate = (filename, lib) => {
  const args = ['mapper'].concat(lib.__constructorArgs ? lib.__constructorArgs : []);
  const argsStr = args.reduce((s, k) => (
    `${s}    this.${k} = ${k};\n`
  ), '');
  
  let contents = Object.keys(lib).reduce((s, k) => {
    if (!k.startsWith('__')) {
      const f = funcTemplate(k, lib);
      return `${s}${f}\n`
    }
    return s;
  }, argsStr);

  if (lib.__stringRep) {
    contents = `${contents}
    this.toReplString = () => (this.${lib.__stringRep});
`
  }

  if (filename === 'Database') {
    contents = proxyTemplate(contents);
  }

  return `class ${filename} {
  constructor(${args.join(', ')}) {
${contents}  }
}
`};

const loadLibrary = (dir, file) => {
  const main = fs.readFileSync(path.join(dir, 'main.yaml'));
  const fileContents = fs.readFileSync(path.join(dir, file));
  return yaml.load(`${main}${fileContents}`);
};

const loadAll = () => {
  const yamlDir = path.join(__dirname, YAML_DIR);
  const FILES = fs.readdirSync(yamlDir).filter((s) => (/[A-Z]/.test( s[0])));

  console.log(FILES);
  
  const result = FILES.reduce((s0, f) => {
    console.log(`${f} => lib/shell-api.js`);

    const lib = loadLibrary(yamlDir, f);

    const file = f.slice(0, -5);
    return `${s0}${classTemplate(file, lib)}`;
  }, '');

  const exports = FILES.reduce((s, f) => {
    const name = f.slice(0, -5);
    return `${s}module.exports.${name} = ${name};\n`
  }, 'module.exports = ShellApi;\n');

  fs.writeFileSync(
    path.join(__dirname, 'lib', 'shell-api.js'),
    `${result}\n${exports}`
  );
};

loadAll();
