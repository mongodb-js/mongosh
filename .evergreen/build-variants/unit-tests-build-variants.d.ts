export type UnitTestsBuildVariant = {
  displayName: string;
  runOn: string;
  executableOsId: string;
  name: string;
  id: string;
  runWithUnitTestsOnly: boolean;
  tags: string[];
  platform: string;
  nShort: string;
  nVersion: string;
  skipNodeVersionCheck: boolean;
  disable: boolean;
};

export const UNIT_TESTS_BUILD_VARIANTS: UnitTestsBuildVariant[];
