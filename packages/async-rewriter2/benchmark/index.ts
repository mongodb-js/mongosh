import AsyncWriter from '../src/index';

const RUNS = 10;

const start = process.hrtime.bigint();
for (let i = 0; i < RUNS; i++)
  new AsyncWriter().unprocessedRuntimeSupportCode();
const stop = process.hrtime.bigint();

// eslint-disable-next-line no-console
console.log(
  'Time for processing runtime support code',
  Number(stop - start) / 1_000_000 / RUNS,
  'ms'
);
