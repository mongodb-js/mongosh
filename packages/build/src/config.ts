/**
 * Defines the configuration interface for the build system.
 */
export default interface Config {
  version?: string;
  bundleId?: string;
  input?: string;
  execInput?: string;
  outputDir?: string;
  analyticsConfig?: string;
  rootDir?: string;
  project?: string;
  revision?: string;
  branch?: string;
  evgAwsKey?: string;
  evgAwsSecret?: string;
  downloadCenterAwsKey?: string;
  downloadCenterAwsSecret?: string;
  githubToken?: string;
  segmentKey?: string;
  appleUser?: string;
  applePassword?: string;
  appleAppIdentity?: string;
  isCi?: boolean;
  platform?: string;
  repo?: {
    owner: string;
    repo: string;
  };
}
