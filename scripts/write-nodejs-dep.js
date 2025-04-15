#!/usr/bin/env node
'use strict';
console.log(JSON.stringify([{
  name: '.node.js',
  version: process.env.NODE_JS_VERSION
}]));
