export interface ExecutablePackageInformation {
  executableOsId: string;
  compileBuildVariant: string;
  kerberosConnectivityTestDockerfiles?: string[];
  packages: PackageInformation[];
}

export interface PackageInformation {
  name: string;
  description: string;
  packageOn: string;
  packageType: string;
  smokeTestKind: 'docker' | 'rpmextract' | 'debextract' | 'none';
  smokeTestDockerfiles?: string[];
  serverLikeTargetList: string[];
}

export declare const RELEASE_PACKAGE_MATRIX: ExecutablePackageInformation[];
