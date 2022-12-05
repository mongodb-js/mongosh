import { MongoshUnimplementedError, MongoshInvalidInputError } from '@mongosh/errors';

type TlsCertificateExporter = (search: { subject: string } | { thumbprint: Buffer }) => { passphrase: string, pfx: Buffer };
export function getTlsCertificateSelector(
  selector: string | undefined
): { passphrase: string, pfx: Buffer }|undefined {
  if (!selector) {
    return;
  }

  const exportCertificateAndPrivateKey = getCertificateExporter();
  if (!exportCertificateAndPrivateKey) {
    throw new MongoshUnimplementedError('--tlsCertificateSelector is not supported on this platform');
  }

  const match = selector.match(/^(?<key>\w+)=(?<value>.+)/);
  if (!match || !['subject', 'thumbprint'].includes(match.groups?.key ?? '')) {
    throw new MongoshInvalidInputError('--tlsCertificateSelector needs to include subject or thumbprint');
  }
  const { key, value } = match.groups ?? {};
  const search = key === 'subject' ? { subject: value } : { thumbprint: Buffer.from(value, 'hex') };

  try {
    const { passphrase, pfx } = exportCertificateAndPrivateKey(search);
    return { passphrase, pfx };
  } catch (err: any) {
    throw new MongoshInvalidInputError(`Could not resolve certificate specification '${selector}': ${err?.message}`);
  }
}

declare global {
  // eslint-disable-next-line camelcase
  const __non_webpack_require__: undefined | typeof require;
}

function getCertificateExporter(): TlsCertificateExporter | undefined {
  if (process.env.TEST_OS_EXPORT_CERTIFICATE_AND_KEY_PATH) {
    // eslint-disable-next-line camelcase
    if (typeof __non_webpack_require__ === 'function') {
      return __non_webpack_require__(process.env.TEST_OS_EXPORT_CERTIFICATE_AND_KEY_PATH);
    }
    return require(process.env.TEST_OS_EXPORT_CERTIFICATE_AND_KEY_PATH);
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
  } catch { /* os probably not supported */ }
  return undefined;
}
