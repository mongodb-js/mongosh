export interface ExecutablePackageInformation {
  executableOsId: string;
  compileBuildVariant: string;
  packages: PackageInformation[];
}

export interface PackageInformation {
  name: string;
  description: string;
  packageOn: string;
  smokeTestKind: 'docker' | 'rpmextract' | 'debextract' | 'none';
  smokeTestDockerfiles?: string[];
  serverLikeTargetList: string[];
}

export declare const RELEASE_PACKAGE_MATRIX: ExecutablePackageInformation[];
