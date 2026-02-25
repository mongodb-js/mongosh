const { readFileSync, writeFileSync, existsSync } = require("node:fs");

function loadMochaOutput(path) {
    if (!existsSync(path)) {
        return null;
    }

    const outputJson = readFileSync(path);
    return JSON.parse(outputJson);
}

function sortJson(testJson) {
    testJson.tests.sort((a, b) => a.file.localeCompare(b.file));
    return testJson;
}

function diffJson(baseline, newResult) {
    let success = [];
    let failures = [];
    let newFailures = [];
    
    // Both tests result must have the same amount of tests (they ran the at the same time)
    // but let's add this guard just in case.
    if (baseline.tests.length != newResult.tests.length) {
        console.warn("[WARN] Baseline test results and the new test results do not have the same amount of tests.");
        console.warn(`[WARN] Baseline: ${baseline.tests.length}, Result: ${newResult.tests.length}`);
    }
    
    for (let i = 0; i < baseline.tests.length && i < newResult.tests.length; i++) {
        let base = baseline.tests[i];
        let result = newResult.tests[i];

        if (!base.err.message && result.err.message) {
            // new failure
            result.err.message = "Baseline did succeed.";
            result.err.baselineDuration = base.duration;
            newFailures.push(result);
        }

        if (result.err.message) {
            failures.push(result);
        } else {
            success.push(result);
        }
    }

    return {
        ...newResult,
        passes: success,
        failures,
        newFailures,
    };
}

function outputFailures(count) {
    // in CI it will write to stdout the number of new failures
    // so they can be used in GHA outputs
    if (process.env.CI) {
        console.log(`new_failures=${count}`);
    }
    
    return 0;
}

function main() {
    if (process.argv.length < 5) {
        console.error(`Usage: ${process.argv[0]} ${process.argv[1]} BASELINE.json NEW.json OUTPUT.JSON`);
        return 1;
    }

    const baseline = loadMochaOutput(process.argv[2]);
    const newTest = loadMochaOutput(process.argv[3]);

    if (!baseline) {
        writeFileSync(process.argv[4], JSON.stringify(newTest, undefined, 2));
        return outputFailures(newTest.failures.length);
    }
    
    sortJson(baseline);
    sortJson(newTest);

    const diffOutputJson = diffJson(baseline, newTest);
    writeFileSync(process.argv[4], JSON.stringify(diffOutputJson, undefined, 2));
    return outputFailures(diffOutputJson.newFailures.length);
}

process.exit(main());
