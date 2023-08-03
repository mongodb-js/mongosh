'use strict';

exports.RELEASE_PACKAGE_MATRIX = [
  {
    executableOsId: 'darwin-x64',
    compileBuildVariant: 'darwin',
    packages: [
      { name: 'darwin-x64', description: 'MacOS 64-bit (10.14+)', packageOn: 'darwin', smokeTestKind: 'macos' }
    ]
  },
  {
    executableOsId: 'darwin-arm64',
    compileBuildVariant: 'darwin_arm64',
    packages: [
      { name: 'darwin-arm64', description: 'MacOS M1 (11.0+)', packageOn: 'darwin', smokeTestKind: 'macos' }
    ]
  },
  {
    executableOsId: 'linux-x64',
    compileBuildVariant: 'linux_x64_build',
    packages: [
      { name: 'linux-x64', description: 'Linux Tarball 64-bit', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['ubuntu20.04-tgz'] },
      { name: 'deb-x64', description: 'Debian / Ubuntu 64-bit', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['ubuntu18.04-deb', 'ubuntu20.04-deb', 'ubuntu22.04-deb', 'ubuntu22.04-nohome-deb', 'debian9-deb', 'debian10-deb', 'debian11-deb', 'debian12-deb'] },
      { name: 'rpm-x64', description: 'RHEL / CentOS / Fedora / Suse 64-bit', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['centos7-rpm', 'amazonlinux2-rpm', 'amazonlinux2023-rpm', 'rocky8-rpm', 'rocky9-rpm', 'fedora34-rpm', 'suse12-rpm', 'suse15-rpm', 'amazonlinux1-rpm'] }
    ]
  },
  {
    executableOsId: 'linux-x64-openssl11',
    compileBuildVariant: 'linux_x64_build_openssl11',
    packages: [
      { name: 'linux-x64-openssl11', description: 'Linux Tarball 64-bit (shared OpenSSL 1.1)', packageOn: 'linux_package', smokeTestKind: 'none' },
      { name: 'deb-x64-openssl11', description: 'Debian / Ubuntu 64-bit (shared OpenSSL 1.1)', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['ubuntu20.04-deb', 'debian10-deb', 'debian11-deb'] },
      { name: 'rpm-x64-openssl11', description: 'RHEL / CentOS 64-bit (shared OpenSSL 1.1)', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['centos7-epel-rpm', 'amazonlinux2-rpm', 'rocky8-rpm', 'rocky9-rpm', 'fedora34-rpm'] }
    ]
  },
  {
    executableOsId: 'linux-x64-openssl3',
    compileBuildVariant: 'linux_x64_build_openssl3',
    packages: [
      { name: 'linux-x64-openssl3', description: 'Linux Tarball 64-bit (shared OpenSSL 3)', packageOn: 'linux_package', smokeTestKind: 'none' },
      { name: 'deb-x64-openssl3', description: 'Debian / Ubuntu 64-bit (shared OpenSSL 3)', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['ubuntu22.04-deb', 'ubuntu22.04-fips-deb', 'debian12-deb'] },
      { name: 'rpm-x64-openssl3', description: 'RHEL / CentOS 64-bit (shared OpenSSL 3)', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['rocky8-epel-rpm', 'rocky9-rpm', 'rocky9-fips-rpm', 'amazonlinux2023-rpm'] }
    ]
  },
  {
    executableOsId: 'linux-arm64',
    compileBuildVariant: 'linux_arm64_build',
    packages: [
      { name: 'linux-arm64', description: 'Linux Tarball arm64', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['ubuntu20.04-tgz'] },
      { name: 'deb-arm64', description: 'Debian / Ubuntu arm64', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['ubuntu18.04-deb', 'ubuntu20.04-deb', 'ubuntu22.04-deb', 'debian10-deb', 'debian11-deb', 'debian12-deb'] },
      { name: 'rpm-arm64', description: 'RHEL / CentOS arm64', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['rocky8-rpm', 'rocky9-rpm', 'fedora34-rpm', 'amazonlinux2-rpm', 'amazonlinux2023-rpm'] }
    ]
  },
  {
    executableOsId: 'linux-arm64-openssl11',
    compileBuildVariant: 'linux_arm64_build_openssl11',
    packages: [
      { name: 'linux-arm64-openssl11', description: 'Linux Tarball arm64 (shared OpenSSL 1.1)', packageOn: 'linux_package', smokeTestKind: 'none' },
      { name: 'deb-arm64-openssl11', description: 'Debian / Ubuntu arm64 (shared OpenSSL 1.1)', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['ubuntu20.04-deb', 'debian10-deb', 'debian11-deb'] },
      { name: 'rpm-arm64-openssl11', description: 'Redhat / Centos arm64 (shared OpenSSL 1.1)', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['rocky8-rpm', 'rocky9-rpm', 'fedora34-rpm', 'amazonlinux2-rpm'] }
    ]
  },
  {
    executableOsId: 'linux-ppc64le',
    compileBuildVariant: 'linux_ppc64le_build',
    packages: [
      { name: 'linux-ppc64le', description: 'Linux Tarball ppc64le', packageOn: 'linux_package', smokeTestKind: 'none' },
      { name: 'rpm-ppc64le', description: 'Redhat / Centos ppc64le', packageOn: 'linux_package', smokeTestKind: 'rpmextract' }
    ]
  },
  {
    executableOsId: 'linux-s390x',
    compileBuildVariant: 'linux_s390x_build',
    packages: [
      { name: 'linux-s390x', description: 'Linux Tarball s390x', packageOn: 'linux_package', smokeTestKind: 'none' },
      { name: 'rpm-s390x', description: 'Redhat / Centos s390x', packageOn: 'linux_package', smokeTestKind: 'rpmextract' }
    ]
  },
  {
    executableOsId: 'win32',
    compileBuildVariant: 'win32_build',
    packages: [
      { name: 'win32-x64', description: 'Windows 64-bit (8.1+)', packageOn: 'win32', smokeTestKind: 'ssh' },
      { name: 'win32msi-x64', description: 'Windows 64-bit (8.1+) (MSI)', packageOn: 'win32', smokeTestKind: 'ssh' }
    ]
  }
];
