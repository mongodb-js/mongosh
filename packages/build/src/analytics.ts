import util from 'util';
import fs from 'fs';

/**
 * Create the analytics config.
 *
 * @param {string} segmentKey - The segment key.
 *
 * @returns {string} The compiled template.
 */
export function createAnalyticsConfig(segmentKey: string): string {
  return `module.exports = { SEGMENT_API_KEY: ${JSON.stringify(segmentKey)} };`;
}

/**
 * Write the analytics config.
 *
 * @param analyticsConfigFilePath - The filename.
 * @param segmentKey - The segment key.
 */
export function writeAnalyticsConfig(
  analyticsConfigFilePath?: string,
  segmentKey?: string
): Promise<void> {
  if (!analyticsConfigFilePath) {
    throw new Error('Analytics config file path is required');
  }

  if (!segmentKey) {
    throw new Error('Segment key is required');
  }

  const template = createAnalyticsConfig(segmentKey);
  console.info('mongosh: writing analytics template:', analyticsConfigFilePath);
  // Cannot use fs/promises on Cygwin.
  return util.promisify(fs.writeFile)(analyticsConfigFilePath, template);
}
