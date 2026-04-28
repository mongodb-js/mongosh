export type CompileBuildVariant = {
  name: string;
  displayName: string;
  runOn: string;
  executableOsId: string;
  id?: string;
  sharedOpenSsl?: string;
  nodeJsVersion?: string;
};

export const COMPILE_BUILD_VARIANTS: CompileBuildVariant[];
