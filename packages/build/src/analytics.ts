import util from 'util';
import fs from 'fs';
import handlebars from 'handlebars';

/**
 * The template.
 */
const TEMPLATE = 'module.exports = { SEGMENT_API_KEY: "{{segmentKey}}" };';

/**
 * Create the analytics config.
 *
 * @param {string} segmentKey - The segment key.
 *
 * @returns {string} The compiled template.
 */
const createAnalyticsConfig = (segmentKey: string): string => {
  const template = handlebars.compile(TEMPLATE);
  return template({ segmentKey: segmentKey });
};

/**
 * Write the analytics config.
 *
 * @param {string} analyticsConfigFilePath - The filename.
 * @param {string} segmentKey - The segment key.
 */
const writeAnalyticsConfig = (
  analyticsConfigFilePath?: string,
  segmentKey?: string
): Promise<void> => {
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
};

export default writeAnalyticsConfig;
export { createAnalyticsConfig };
