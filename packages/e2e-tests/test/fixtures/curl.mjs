#!/usr/bin/env node
'use strict';
import fetch from 'node-fetch';

// fetch() an URL and ignore the response body
(async function () {
  (await fetch(process.argv[2])).body?.resume();
})().catch(err => { process.nextTick(() => { throw err; }); });
