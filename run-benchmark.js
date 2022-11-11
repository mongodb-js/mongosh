const { execFileSync } = require('child_process');

const N = 1000;
const NS_PER_MS = 1e6;
for (let i = 0; i < N; i++) {
  const output = execFileSync('./dist/mongosh', ['--quiet', '--eval', 'JSON.stringify(mongoshStartupTiming, (k,v) => typeof v==="bigint" ? String(v) : v)']);
  const parsed = Object.entries(JSON.parse(output));
  const deltas = [];
  for (let j = 1; j < parsed.length; j++) {
    deltas.push(Number(BigInt(parsed[j][1]) - BigInt(parsed[j-1][1])) / NS_PER_MS);
  }
  if (i === 0) {
    console.log(parsed.map(([key]) => key).slice(1).join(','));
  }
  console.log(deltas.join(','));
}
