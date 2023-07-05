import type { PackageVariant } from '../../config';
interface DocumentationFile {
  sourceFilePath: string;
  packagedFilePath: string;
}

interface LicenseInformation extends DocumentationFile {
  debIdentifier: string;
  debCopyright: string;
  rpmIdentifier: string;
}

type ManPage = DocumentationFile;

// This is filled in by the build config file.
export interface PackageInformation {
  binaries: {
    sourceFilePath: string;
    category: 'bin' | 'lib';
    license: LicenseInformation;
  }[];
  otherDocFilePaths: DocumentationFile[];
  manpage?: ManPage;
  metadata: {
    name: string;
    debName: string;
    rpmName: string;
    version: string;
    description: string;
    homepage: string;
    maintainer: string;
    manufacturer: string;
    fullName: string;
    copyright: string;
    icon: string;
    provides: { name: string; version: string }[];
  };
  debTemplateDir: string;
  rpmTemplateDir: string;
  msiTemplateDir: string;
}

export type PackageInformationProvider = (
  packageVariant: PackageVariant
) => PackageInformation;
