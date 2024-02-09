const offset = __getTimingData().length;
__loadExternalCode(`for (let i = 0; i < 5; i++) {
  db.hello()
}
`)
const newTimingData = __getTimingData().slice(offset);

const polished = newTimingData.map(([cat, name, T], i) => [cat, name, (T - newTimingData[0][2]) / 1000, (T - newTimingData[i-1]?.[2]) / 1000])
console.table(polished)