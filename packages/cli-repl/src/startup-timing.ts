const jsTimingEntries: [string, bigint][] = [];
const timing: {
  markTime: (label: string) => void;
  getTimingData: () => [string, number][];
} = !process.env.MONGOSH_SHOW_TIMING_DATA
  ? {
      markTime: () => {
        /* ignore */
      },
      getTimingData: () => [],
    }
  : (process as any).boxednode
  ? {
      markTime: (process as any).boxednode.markTime,
      getTimingData: (process as any).boxednode.getTimingData,
    }
  : {
      markTime: (label: string) => {
        jsTimingEntries.push([label, process.hrtime.bigint()]);
      },
      getTimingData: () => {
        const data = jsTimingEntries.sort((a, b) => Number(a[1] - b[1]));
        // Adjust times so that process initialization happens at time 0
        return data.map(([label, time]) => [label, Number(time - data[0][1])]);
      },
    };

export const markTime = timing.markTime;
export const getTimingData = timing.getTimingData;

if (process.env.MONGOSH_SHOW_TIMING_DATA) {
  process.on('exit', function () {
    const rawTimingData = getTimingData();
    if (process.env.MONGOSH_SHOW_TIMING_DATA === 'json') {
      console.log(JSON.stringify(rawTimingData));
    } else {
      console.table(
        rawTimingData.map(([label, time], i) => [
          label,
          `${(time / 1_000_000).toFixed(2)}ms`,
          i > 0
            ? `+${((time - rawTimingData[i - 1][1]) / 1_000_000).toFixed(2)}ms`
            : '',
        ])
      );
    }
  });
}

markTime('cli-repl timing initialized');
