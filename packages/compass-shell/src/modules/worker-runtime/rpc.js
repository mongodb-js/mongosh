import { serialize, deserialize } from 'v8';
import { expose, caller } from 'postmsg-rpc';

function isRPCMessage(data) {
  return data.sender && data.id && data.func;
}

function send(process, data) {
  return process.send ? process.send(data) : process.postMessage(data);
}

function getRPCOptions(process) {
  return {
    addListener: process.on.bind(process),
    removeListener: process.off.bind(process),
    postMessage(data) {
      if (isRPCMessage(data) && data.args) {
        data.args = serialize(removeTrailingUndefined(data.args)).toString(
          'base64'
        );
      }

      return send(process, data);
    },
    getMessageData(data) {
      if (isRPCMessage(data) && data.args && typeof data.args === 'string') {
        data.args = deserialize(Buffer.from(data.args, 'base64'));
      }

      return data;
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
