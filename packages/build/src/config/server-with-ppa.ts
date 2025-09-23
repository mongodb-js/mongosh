export type SupportedServerVersion =
  | '4.4.0'
  | '5.0.0'
  | '6.0.0'
  | '7.0.0'
  | '8.0.0'
  | '8.2.0';

export type PPARepositoryAndServerVersions = {
  repo: PPARepository;
  serverVersions: Array<SupportedServerVersion>;
};

/**
 * All the possible per-Linux-distro repositories that we publish to.
 */
export type PPARepository =
  | 'ubuntu1804'
  | 'ubuntu2004'
  | 'ubuntu2204'
  | 'ubuntu2404'
  | 'debian10'
  | 'debian11'
  | 'debian12'
  | 'rhel70'
  | 'rhel80'
  | 'rhel90'
  | 'amazon1'
  | 'amazon2'
  | 'amazon2023'
  | 'suse12'
  | 'suse15';

export const SERVER_WITH_PPAS: Record<
  SupportedServerVersion,
  Array<PPARepository>
> = {
  '4.4.0': [
    'amazon1', // MONGOSH-924
    'amazon2',
    'amazon2023',
    'debian10',
    'debian11',
    'debian12',
    'rhel70',
    'rhel80',
    'rhel90',
    'suse12',
    'suse15',
    'ubuntu1804',
    'ubuntu2004',
    'ubuntu2204',
  ],
  '5.0.0': [
    'amazon1', // MONGOSH-924
    'amazon2',
    'amazon2023',
    'debian10',
    'debian11',
    'debian12',
    'rhel70',
    'rhel80',
    'rhel90',
    'suse12',
    'suse15',
    'ubuntu1804',
    'ubuntu2004',
    'ubuntu2204',
  ],
  '6.0.0': [
    'amazon1',
    'amazon2',
    'amazon2023',
    'debian10',
    'debian11',
    'debian12',
    'rhel70',
    'rhel80',
    'rhel90',
    'suse12',
    'suse15',
    'ubuntu1804',
    'ubuntu2004',
    'ubuntu2204',
  ],
  '7.0.0': [
    'amazon1',
    'amazon2',
    'amazon2023',
    'debian10',
    'debian11',
    'debian12',
    'rhel70',
    'rhel80',
    'rhel90',
    'suse12',
    'suse15',
    'ubuntu1804',
    'ubuntu2004',
    'ubuntu2204',
  ],
  '8.0.0': [
    'amazon2023',
    'debian12',
    'rhel80',
    'rhel90',
    'suse15',
    'ubuntu2004',
    'ubuntu2204',
    'ubuntu2404',
  ],
  '8.2.0': [
    'amazon2023',
    'debian12',
    'rhel80',
    'rhel90',
    'suse15',
    'ubuntu2004',
    'ubuntu2204',
    'ubuntu2404',
  ],
};

const PPA_WITH_SERVER_VERSIONS = new Map<
  PPARepository,
  Array<SupportedServerVersion>
>();
for (const serverVersion in SERVER_WITH_PPAS) {
  const ppas = SERVER_WITH_PPAS[serverVersion as SupportedServerVersion];
  for (const ppa of ppas) {
    if (!PPA_WITH_SERVER_VERSIONS.has(ppa)) {
      PPA_WITH_SERVER_VERSIONS.set(ppa, []);
    }
    PPA_WITH_SERVER_VERSIONS.get(ppa)!.push(
      serverVersion as SupportedServerVersion
    );
  }
}

export function getSupportedServersForPPAs(
  ppas: Array<PPARepository>
): Array<PPARepositoryAndServerVersions> {
  return ppas.map((repo) => ({
    repo,
    serverVersions: PPA_WITH_SERVER_VERSIONS.get(repo) ?? [],
  }));
}
