export type E2ETestsBuildVariantDefinition = {
  displayName: string;
  name: string;
  compileBuildVariant: string;
  runOn: string;
  executableOsId: string;
  mVersion: string;
  tags?: string[];
  disableOpenSslSharedConfig?: boolean;
  fips?: boolean;
  additionalTasks?: string[];
};
