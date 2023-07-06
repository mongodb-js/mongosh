import * as os from 'os';
import { promises as fs } from 'fs';

export async function getLinuxOsRelease() {
  if (process.platform !== 'linux') {
    return {};
  }
  try {
    const osRelease = Object.fromEntries(
      (await fs.readFile('/etc/os-release', 'utf-8'))
        .split('\n')
        .map((line): [string, string] | null => {
          const [k, ...v] = line.trim().split('=');
          if (!k || v.length === 0) {
            return null;
          }
          return [k, v.join('=').replace(/^("|')?(.+)?\1$/, '$2')];
        })
        .filter((kv): kv is [string, string] => kv !== null)
    );
    return {
      os_linux_dist: osRelease.ID ?? 'Unknown',
      os_linux_release: osRelease.VERSION_ID ?? 'Unknown',
    };
  } catch {
    return {
      os_linux_dist: 'Unknown',
      os_linux_release: 'Unknown',
    };
  }
}

export async function getOsInfo() {
  return {
    os_type: os.type(),
    os_version: os.version(),
    os_arch: os.arch(),
    ...(await getLinuxOsRelease()),
  };
}
