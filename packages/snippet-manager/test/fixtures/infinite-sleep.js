#!/usr/bin/env node
const fs = require('fs');
fs.writeFileSync('infinite-sleep.pid', String(process.pid));
setInterval(() => {}, 1000);
