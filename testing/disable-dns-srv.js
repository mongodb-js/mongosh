"use strict";
const dns = require("dns");
// eslint-disable-next-line no-console
console.log(
  "!!! Disabling SRV and TXT DNS queries through the Node.js API !!!"
);

const origResolve = dns.resolve;
const origPromiseResolve = dns.promises.resolve;
const err = Object.assign(new Error("SRV and TXT not available"), {
  code: "ENODATA",
});

dns.resolve = (hostname, type, cb) => {
  if (type === "SRV" || type === "TXT") return process.nextTick(cb, err);
  return origResolve(hostname, type, cb);
};
dns.resolveSrv = (hostname, cb) => {
  return process.nextTick(cb, err);
};
dns.resolveTxt = (hostname, cb) => {
  return process.nextTick(cb, err);
};
dns.promises.resolve = async (hostname, type) => {
  if (type === "SRV" || type === "TXT") throw err;
  await origPromiseResolve;
};
dns.promises.resolveSrv = () => Promise.reject(err);
dns.promises.resolveTxt = () => Promise.reject(err);
