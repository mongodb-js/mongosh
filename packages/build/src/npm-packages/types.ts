export type PackagePublisherConfig = {
  isDryRun?: boolean;
  useAuxiliaryPackagesOnly?: boolean;
};

export interface LernaPackageDescription {
  name: string;
  version: string;
  private: boolean;
  location: string;
}
