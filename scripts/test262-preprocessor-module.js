const { default: AsyncWriter } = require("@mongosh/async-rewriter2");

module.exports = function (test) {
    const start = Date.now();
    try {
        const asyncWriter = new AsyncWriter();
        test.contents = asyncWriter.process(test.contents);
    } catch (error) {
        test.result = {
	    stdout: "",
	    stderr: String(error),
	    error,
	};
    } finally {
	test.duration = Date.now() - start;
    }

    return test;
};
