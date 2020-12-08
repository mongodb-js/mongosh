import { expose, caller } from 'postmsg-rpc';

function removeTrailingUndefined(arr) {
  if (Array.isArray(arr)) {
    arr = [...arr];
    while (arr[arr.length - 1] === undefined) {
      arr.pop();
    }
  }
  return arr;
}

export function exposeAll(obj, process) {
  Object.entries(obj).forEach(([key, val]) => {
    val.close = expose(key, val, {
      addListener: process.on.bind(process),
      removeListener: process.off.bind(process),
      postMessage: (data) => {
        data.args = removeTrailingUndefined(data.args);
        process.send(data);
      },
      getMessageData: (data) => data,
    });
  });

  return obj;
}

export function createCaller(methodNames, process) {
  const obj = {};
  methodNames.forEach((name) => {
    obj[name] = caller(name, {
      addListener: process.on.bind(process),
      removeListener: process.off.bind(process),
      postMessage: (data) => {
        data.args = removeTrailingUndefined(data.args);
        process.send(data);
      },
      getMessageData: (data) => data,
    });
  });
  return obj;
}
