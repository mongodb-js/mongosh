export type E2ETestsBuildVariant = {
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

export const E2E_TESTS_BUILD_VARIANTS: E2ETestsBuildVariant[];
