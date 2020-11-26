#!/usr/bin/env ts-node
import { getMlaunchPath } from '../testing/integration-testing-hooks';
getMlaunchPath().then(console.log).catch(err => process.nextTick(() => { throw err; }));
