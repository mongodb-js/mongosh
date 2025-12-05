export * from './eventually';
export * from './chai';

/**
 * Path to the certificates directory containing test certificates
 */
const TEST_CERTIFICATES_DIR = './certificates';

/** Get the path to a test certificate */
export function getTestCertificatePath(filename: string): string {
  return `${TEST_CERTIFICATES_DIR}/${filename}`;
}
