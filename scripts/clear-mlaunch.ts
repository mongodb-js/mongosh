#!/usr/bin/env ts-node
import { clearMlaunch } from '../testing/integration-testing-hooks';
clearMlaunch().catch(err => process.nextTick(() => { throw err; }));
