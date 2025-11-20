import path from 'path';

export * from './integration-testing-hooks';
export * from './eventually';
export * from './fake-kms';

/**
 * Path to the certificates directory containing test certificates
 */
const TEST_CERTIFICATES_DIR = path.resolve(__dirname, 'certificates');

/** Get the path to a test certificate */
export function getTestCertificatePath(filename: string): string {
  return path.join(TEST_CERTIFICATES_DIR, filename);
}
