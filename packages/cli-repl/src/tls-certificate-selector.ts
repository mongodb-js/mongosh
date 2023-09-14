import {
  MongoshUnimplementedError,
  MongoshInvalidInputError,
} from '@mongosh/errors';
import { createRequire } from 'module';

type TlsCertificateExporter = (
  search: { subject: string } | { thumbprint: Buffer }
) => { passphrase: string; pfx: Buffer };
export function getTlsCertificateSelector(
  selector: string | undefined
): { passphrase: string; pfx: Buffer } | undefined {
  if (!selector) {
    return;
  }

  const exportCertificateAndPrivateKey = getCertificateExporter();
  if (!exportCertificateAndPrivateKey) {
    throw new MongoshUnimplementedError(
      '--tlsCertificateSelector is not supported on this platform'
    );
  }

  const match = /^(?<key>\w+)=(?<value>.+)/.exec(selector);
  if (!match || !['subject', 'thumbprint'].includes(match.groups?.key ?? '')) {
    throw new MongoshInvalidInputError(
      '--tlsCertificateSelector needs to include subject or thumbprint'
    );
  }
  const { key, value } = match.groups ?? {};
  const search =
    key === 'subject'
      ? { subject: value }
      : { thumbprint: Buffer.from(value, 'hex') };

  try {
    const { passphrase, pfx } = exportCertificateAndPrivateKey(search);
    return { passphrase, pfx };
  } catch (err: any) {
    throw new MongoshInvalidInputError(
      `Could not resolve certificate specification '${selector}': ${err?.message}`
    );
  }
}

function getCertificateExporter(): TlsCertificateExporter | undefined {
  if (process.env.TEST_OS_EXPORT_CERTIFICATE_AND_KEY_PATH) {
    // Not using require() directly because that ends up referring
    // to the webpack require, and even __non_webpack_require__ doesn't
    // fully give us what we need because that can refer to the Node.js
    // internal require() when running from a snapshot, not the public
    // require().
    return createRequire(__filename)(
      process.env.TEST_OS_EXPORT_CERTIFICATE_AND_KEY_PATH
    );
  }

  try {
    switch (process.platform) {
      case 'win32':
        return require('win-export-certificate-and-key');
      case 'darwin':
        return require('macos-export-certificate-and-key');
      default:
        return undefined;
    }
  } catch {
    /* os probably not supported */
  }
  return undefined;
}
