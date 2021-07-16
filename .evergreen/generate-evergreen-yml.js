'use strict';
const fs = require('fs');

// PHP-like syntax, except it's JS.
// foo: <% for (let i = 0; i < 10; i++) { %>
//   - index: <% out(i) %>
// <% } %>
// is turned into a YAML list with index: 0, index: 1 etc.

const input = fs.readFileSync(process.argv[2], 'utf8');
let asJs = `(function() { let result = "";
  const out = (val) => result += (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;`;
let i = 0;
while (i < input.length) {
  const opening = input.indexOf('<%', i);
  if (opening === -1) {
    asJs += `out(${JSON.stringify(input.slice(i))});\n`;
    break;
  }
  asJs += `out(${JSON.stringify(input.slice(i, opening).replace(/\n\s*$/, ''))});\n`;
  const closing = input.indexOf('%>', opening + 2);
  if (closing === -1) break;
  asJs += input.slice(opening + 2, closing) + ';\n';

  i = closing + 2;
}
asJs += '; return result; })()'
process.stdout.write(eval(asJs));
