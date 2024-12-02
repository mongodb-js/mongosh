'use strict';

module.exports = {
    awsAccessKeyId: process.env.DOWNLOAD_CENTER_AWS_KEY,
    awsSecretAccessKey: process.env.DOWNLOAD_CENTER_AWS_SECRET,
    ctas: {
        // Define the ctas per version here. '*' is the default cta which will be shown if there's no specific cta
        // for the current version.
        // '*': {
        //     chunks: [
        //         { text: 'Example', style: 'bold' },
        //     ]
        // },
        // '1.2.3': {
        //     chunks: [
        //         { text: 'Example', style: 'mongosh:uri' },
        //     ]
        // }
    },
    isDryRun: false,
}
