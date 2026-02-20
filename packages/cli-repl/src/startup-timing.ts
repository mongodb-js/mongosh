import {
  TimingCategories,
  type TimingCategory,
  type TimingInterface,
} from '@mongosh/types';
import v8 from 'v8';

let jsTimingEntries: [string, string, bigint][] = [];

function linkTimingInterface(): TimingInterface {
  const boxedNode = (process as any).boxednode;

  // If we are bundled with boxednode, just use the provided interface
  if (boxedNode) {
    return {
      markTime: boxedNode.markTime,
      getTimingData: boxedNode.getTimingData,
      resetTimingData: () => undefined,
    };
  }

  // Otherwise, use a JS implementation (mostly for development)
  return {
    markTime: (category, label) =>
      jsTimingEntries.push([category, label, process.hrtime.bigint()]),
    getTimingData: () => {
      const data = jsTimingEntries.sort((a, b) => Number(a[2] - b[2]));
      // Adjust times so that process initialization happens at time 0
      return data.map(([category, label, time]) => [
        category,
        label,
        Number(time - data[0][2]),
      ]);
    },
    resetTimingData: () => {
      jsTimingEntries = [];
    },
  };
}

export function summariseTimingData(
  timingData: [string | TimingCategory, string, number][]
): {
  [key: string]: number;
} {
  const durationByCategory = new Map<string, number>();
  let lastTimestamp = 0;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [category, _, time] of timingData) {
    const durationInNs = time - lastTimestamp;
    const durationInMs = durationInNs / 1_000_000;
    const durationSum = (durationByCategory.get(category) || 0) + durationInMs;
    durationByCategory.set(category, durationSum);

    lastTimestamp = time;
  }

  return Object.fromEntries(durationByCategory.entries());
}

const timing: TimingInterface = linkTimingInterface();
export const markTime = timing.markTime;
export const getTimingData = timing.getTimingData;
export const resetTimingData = timing.resetTimingData;

function installExitHandler() {
  if (process.env.MONGOSH_SHOW_TIMING_DATA) {
    process.on('exit', function () {
      const rawTimingData = getTimingData();
      if (process.env.MONGOSH_SHOW_TIMING_DATA === 'json') {
        console.log(JSON.stringify(rawTimingData));
      } else {
        console.table(
          rawTimingData.map(([category, label, time], i) => [
            category,
            label,
            `${(time / 1_000_000).toFixed(2)}ms`,
            i > 0
              ? `+${((time - rawTimingData[i - 1][2]) / 1_000_000).toFixed(
                  2
                )}ms`
              : '',
          ])
        );
      }
    });
  }
}

if ((v8 as any)?.startupSnapshot?.isBuildingSnapshot?.()) {
  (v8 as any).startupSnapshot.addDeserializeCallback(() => {
    installExitHandler();
  });
} else {
  installExitHandler();
}

markTime(TimingCategories.REPLInstantiation, 'cli-repl timing initialized');
