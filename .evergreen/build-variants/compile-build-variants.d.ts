export type CompileBuildVariant = {
  name: string;
  displayName: string;
  runOn: string;
  executableOsId: string;
  id?: string;
  sharedOpenSsl?: string;
};

export const COMPILE_BUILD_VARIANTS: CompileBuildVariant[];
