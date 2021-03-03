interface DocumentationFile {
    sourceFilePath: string;
    packagedFilePath: string;
}

interface LicenseInformation extends DocumentationFile {
    debIdentifier: string;
    debCopyright: string;
    rpmIdentifier: string;
}

// This is filled in by the build config file.
export interface PackageInformation {
    binaries: {
        sourceFilePath: string;
        category: 'bin' | 'libexec';
        license: LicenseInformation;
    }[];
    otherDocFilePaths: DocumentationFile[];
    metadata: {
        name: string;
        version: string;
        description: string;
        homepage: string;
        maintainer: string;
        manufacturer: string;
        fullName: string;
        copyright: string;
        icon: string;
    };
    debTemplateDir: string;
    rpmTemplateDir: string;
    msiTemplateDir: string;
}
