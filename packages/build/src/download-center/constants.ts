/**
 * The S3 bucket for download center configurations.
 */
export const CONFIGURATIONS_BUCKET = 'info-mongodb-com' as const;

/**
 * The S3 object key for the download center configuration.
 */
export const CONFIGURATION_KEY = 'com-download-center/mongosh.json' as const;

/**
 * The S3 bucket for download center artifacts.
 */
export const ARTIFACTS_BUCKET = 'downloads.10gen.com' as const;

/**
 * The S3 "folder" for uploaded artifacts.
 */
export const ARTIFACTS_FOLDER = 'compass' as const;
