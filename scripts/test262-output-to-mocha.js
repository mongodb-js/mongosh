const { readFileSync, writeFileSync, existsSync, readdirSync } = require("node:fs");
const path = require("node:path")

function readTest262Output(testFile) {
    if (!existsSync(testFile)) {
        throw new Error(`Could not find ${testFile}. Did you run 'npx test-262'?`);
    }

    const outputJson = readFileSync(testFile);
    return JSON.parse(outputJson);
}

function generateMochaStats(test262Result) {
    return {
        suites: 1,
        tests: +test262Result.length,
        passes: test262Result.reduce((count, current) => count + (+current.result.pass ? 1 : 0), 0),
        failures: test262Result.reduce((count, current) => count + (+current.result.pass ? 0 : 1), 0),
        pending: 0
    };
}

function mapTest262TestToMochaTest(test262) {
    return {
        title: test262.file,
        fullTitle: test262.file,
        file: test262.file,
        duration: +test262.duration,
        err: {
            message: test262.result.message,
            stack: test262.result.message
        }
    };
}

function parseMochaTests(test262, filter) {
    return test262.filter(filter).map(mapTest262TestToMochaTest);
}

function main() {
    if (process.argv.length < 4) {
        console.error(`Usage: ${process.argv[0]} ${process.argv[1]} TEST262_OUTPUT_FOLDER OUTPUT_MOCHA_JSON.json`);
        return 1;
    }

    const aggregatedMochaOutputJson = {
        stats: {
            suites: 1,
            tests: 0,
            passes: 0,
            failures: 0,
            pending: 0
        },
        tests: [],
        passes: [],
        failures: [],
        pending: []
    };
    
    for (const outputName of readdirSync(process.argv[2])) {
        const output = path.join(process.argv[2], outputName)
        const test262Result = readTest262Output(output);
        const mochaOutputJson = {
            stats: generateMochaStats(test262Result),
            tests: parseMochaTests(test262Result, () => true),
            passes: parseMochaTests(test262Result, (current) => current.result.pass),
            failures: parseMochaTests(test262Result, (current) => !current.result.pass),
            pending: [],
        };

        aggregatedMochaOutputJson.stats.suites += +mochaOutputJson.stats.suites;
        aggregatedMochaOutputJson.stats.tests += +mochaOutputJson.stats.tests;
        aggregatedMochaOutputJson.stats.passes += +mochaOutputJson.stats.passes;
        aggregatedMochaOutputJson.stats.failures += +mochaOutputJson.stats.failures;
        aggregatedMochaOutputJson.stats.pending += +mochaOutputJson.stats.pending;
        aggregatedMochaOutputJson.tests.push(...mochaOutputJson.tests);
        aggregatedMochaOutputJson.passes.push(...mochaOutputJson.passes);
        aggregatedMochaOutputJson.failures.push(...mochaOutputJson.failures);
        aggregatedMochaOutputJson.pending.push(...mochaOutputJson.pending);
    }
    
    writeFileSync(process.argv[3], JSON.stringify(aggregatedMochaOutputJson, undefined, 2));
    return 0;
}

process.exit(main());
