import { serialize, deserialize } from 'v8';
import { expose, caller } from 'postmsg-rpc';

function getRPCOptions(process) {
  return {
    addListener: process.on.bind(process),
    removeListener: process.off.bind(process),
    postMessage: (data) => {
      data.args = removeTrailingUndefined(data.args);
      return process.send(serialize(data).toString('base64'));
    },
    getMessageData: (data) => {
      return deserialize(Buffer.from(data, 'base64'));
    },
  };
}

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
    val.close = expose(key, val, getRPCOptions(process));
  });

  return obj;
}

export function createCaller(methodNames, process) {
  const obj = {};
  methodNames.forEach((name) => {
    obj[name] = caller(name, getRPCOptions(process));
  });
  return obj;
}
