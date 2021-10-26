interface DocumentationFile {
    sourceFilePath: string;
    packagedFilePath: string;
}

type ManualFile = DocumentationFile;

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
    manualFile: ManualFile;
    otherDocFilePaths: DocumentationFile[];
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
    };
    debTemplateDir: string;
    rpmTemplateDir: string;
    msiTemplateDir: string;
}
