const fallback = require('./fallback.json');

/**
 * The S3 bucket for download center configurations.
 */
export const CONFIGURATIONS_BUCKET = 'info-mongodb-com';

/**
 * The S3 object key for the download center configuration.
 */
export const CONFIGURATION_KEY =
  'com-download-center/mongosh.multiversion.json';

/**
 * The S3 bucket for download center artifacts.
 */
export const ARTIFACTS_BUCKET = 'downloads.10gen.com';

/**
 * The S3 bucket for download center artifacts.
 */
export const ARTIFACTS_BUCKET_NEW = 'cdn-origin-compass';

/**
 * The S3 "folder" for uploaded artifacts.
 */
export const ARTIFACTS_FOLDER = 'compass';

/**
 * The S3 artifact key for the versions JSON feed.
 */
export const JSON_FEED_ARTIFACT_KEY = `${ARTIFACTS_FOLDER}/mongosh.json`;

export const ARTIFACTS_URL_PUBLIC_BASE =
  'https://downloads.mongodb.com/compass/';

export const ARTIFACTS_FALLBACK = Object.freeze(fallback);
