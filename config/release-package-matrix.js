'use strict';

const rhel81AndAbove = ['rhel81', 'rhel82', 'rhel83', 'rhel90']
const rhel80AndAbove = ['rhel80', ...rhel81AndAbove]
const rhel72AndAbove = ['rhel72', ...rhel80AndAbove]
const al2AndAbove = ['amazon2', 'amazon2023', ...rhel81AndAbove]
const rhel70AndAboveAndRpmBased = ['rhel70', 'rhel71', ...rhel72AndAbove, 'amazon', ...al2AndAbove, 'suse12', 'suse15']
const ubuntu1804AndAboveAndDebBased = ['ubuntu1804', 'ubuntu1804', 'ubuntu2004', 'ubuntu2204', 'debian10', 'debian11', 'debian12']
const allLinux = [...rhel70AndAboveAndRpmBased, ...ubuntu1804AndAboveAndDebBased]

const publicDescriptions = {
  darwin_x64: 'MacOS x64 (11.0+)',
  darwin_arm64: 'MacOS M1 (11.0+)',
  linux_x64: 'Linux x64',
  linux_arm64: 'Linux arm64',
  debian_x64: 'Debian (10+) / Ubuntu (18.04+) x64',
  debian_arm64: 'Debian (10+) / Ubuntu (18.04+) arm64',
  rhel_x64: 'RHEL / CentOS (7+) x64',
  rhel_arm64: 'RHEL / CentOS (7+) arm64',
  linux_ppc64le: 'Linux ppc64le',
  rhel_ppc64le: 'RHEL / CentOS (7+) ppc64le',
  linux_s390x: 'Linux s390x',
  rhel_s390x: 'RHEL / CentOS (7+) s390x',
  win32_x64: 'Windows x64 (10+)'
};

const krbConnTestsOpenSSL11 = ['rocky8', 'ubuntu2004'];
const krbConnTestsOpenSSL3 = ['node20', 'rocky9', 'ubuntu2204'];

exports.RELEASE_PACKAGE_MATRIX = [
  {
    executableOsId: 'darwin-x64',
    compileBuildVariant: 'darwin',
    packages: [
      { name: 'darwin-x64', description: publicDescriptions.darwin_x64, packageType: 'zip', packageOn: 'darwin', smokeTestKind: 'macos', serverLikeTargetList: ['macos'] }
    ]
  },
  {
    executableOsId: 'darwin-arm64',
    compileBuildVariant: 'darwin_arm64',
    packages: [
      { name: 'darwin-arm64', description: publicDescriptions.darwin_arm64, packageType: 'zip', packageOn: 'darwin', smokeTestKind: 'macos', serverLikeTargetList: ['macos'] }
    ]
  },
  {
    executableOsId: 'linux-x64',
    compileBuildVariant: 'linux_x64_build',
    kerberosConnectivityTestDockerfiles: [...krbConnTestsOpenSSL11, ...krbConnTestsOpenSSL3],
    packages: [
      { name: 'linux-x64', description: publicDescriptions.linux_x64, packageType: 'tgz', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['ubuntu20.04-tgz'], serverLikeTargetList: [...allLinux] },
      { name: 'deb-x64', description: publicDescriptions.debian_x64, packageType: 'deb', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['ubuntu18.04-deb', 'ubuntu20.04-deb', 'ubuntu22.04-deb', 'ubuntu22.04-nohome-deb', 'ubuntu22.04-qemu-deb', 'debian10-deb', 'debian11-deb', 'debian12-deb'], serverLikeTargetList: [...ubuntu1804AndAboveAndDebBased] },
      { name: 'rpm-x64', description: publicDescriptions.rhel_x64, packageType: 'rpm', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['centos7-rpm', 'amazonlinux2-rpm', 'amazonlinux2023-rpm', 'rocky8-rpm', 'rocky9-rpm', 'fedora34-rpm', 'suse12-rpm', 'suse15-rpm'], serverLikeTargetList: [...rhel70AndAboveAndRpmBased] }
    ]
  },
  {
    executableOsId: 'linux-x64-openssl11',
    compileBuildVariant: 'linux_x64_build_openssl11',
    kerberosConnectivityTestDockerfiles: [...krbConnTestsOpenSSL11],
    packages: [
      { name: 'linux-x64-openssl11', description: publicDescriptions.linux_x64, packageType: 'tgz with shared OpenSSL 1.1', packageOn: 'linux_package', smokeTestKind: 'none', serverLikeTargetList: [...allLinux] },
      { name: 'deb-x64-openssl11', description: publicDescriptions.debian_x64, packageType: 'deb with shared OpenSSL 1.1', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['ubuntu20.04-deb', 'debian10-deb', 'debian11-deb'], serverLikeTargetList: [...ubuntu1804AndAboveAndDebBased] },
      { name: 'rpm-x64-openssl11', description: publicDescriptions.rhel_x64, packageType: 'rpm with shared OpenSSL 1.1', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['centos7-epel-rpm', 'amazonlinux2-rpm', 'rocky8-rpm', 'rocky9-rpm', 'fedora34-rpm'], serverLikeTargetList: [...rhel70AndAboveAndRpmBased] }
    ]
  },
  {
    executableOsId: 'linux-x64-openssl3',
    compileBuildVariant: 'linux_x64_build_openssl3',
    kerberosConnectivityTestDockerfiles: [...krbConnTestsOpenSSL3],
    packages: [
      { name: 'linux-x64-openssl3', description: publicDescriptions.linux_x64, packageType: 'tgz with shared OpenSSL 3', packageOn: 'linux_package', smokeTestKind: 'none', serverLikeTargetList: [...allLinux] },
      { name: 'deb-x64-openssl3', description: publicDescriptions.debian_x64, packageType: 'deb with shared OpenSSL 3', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['ubuntu22.04-deb', 'ubuntu22.04-fips-deb', 'debian12-deb'], serverLikeTargetList: [...ubuntu1804AndAboveAndDebBased] },
      { name: 'rpm-x64-openssl3', description: publicDescriptions.rhel_x64, packageType: 'rpm with shared OpenSSL 3', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['rocky8-epel-rpm', 'rocky9-rpm', 'rocky9-fips-rpm', 'amazonlinux2023-rpm'], serverLikeTargetList: [...rhel70AndAboveAndRpmBased] }
    ]
  },
  {
    executableOsId: 'linux-arm64',
    compileBuildVariant: 'linux_arm64_build',
    kerberosConnectivityTestDockerfiles: [...krbConnTestsOpenSSL11, ...krbConnTestsOpenSSL3],
    packages: [
      { name: 'linux-arm64', description: publicDescriptions.linux_arm64, packageType: 'tgz', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['ubuntu20.04-tgz'], serverLikeTargetList: [...al2AndAbove] },
      { name: 'deb-arm64', description: publicDescriptions.debian_arm64, packageType: 'deb', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['ubuntu18.04-deb', 'ubuntu20.04-deb', 'ubuntu22.04-deb', 'ubuntu22.04-nohome-deb', 'ubuntu22.04-qemu-deb', 'debian10-deb', 'debian11-deb', 'debian12-deb'], serverLikeTargetList: [...ubuntu1804AndAboveAndDebBased] },
      { name: 'rpm-arm64', description: publicDescriptions.rhel_arm64, packageType: 'rpm', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['rocky8-rpm', 'rocky9-rpm', 'fedora34-rpm', 'amazonlinux2-rpm', 'amazonlinux2023-rpm'], serverLikeTargetList: [...al2AndAbove] }
    ]
  },
  {
    executableOsId: 'linux-arm64-openssl11',
    compileBuildVariant: 'linux_arm64_build_openssl11',
    kerberosConnectivityTestDockerfiles: [...krbConnTestsOpenSSL11],
    packages: [
      { name: 'linux-arm64-openssl11', description: publicDescriptions.linux_arm64, packageType: 'tgz with shared OpenSSL 1.1', packageOn: 'linux_package', smokeTestKind: 'none', serverLikeTargetList: [...al2AndAbove] },
      { name: 'deb-arm64-openssl11', description: publicDescriptions.debian_arm64, packageType: 'deb with shared OpenSSL 1.1', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['ubuntu20.04-deb', 'debian10-deb', 'debian11-deb'], serverLikeTargetList: [...ubuntu1804AndAboveAndDebBased] },
      { name: 'rpm-arm64-openssl11', description: publicDescriptions.rhel_arm64, packageType: 'rpm with shared OpenSSL 1.1', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['rocky8-rpm', 'rocky9-rpm', 'fedora34-rpm', 'amazonlinux2-rpm'], serverLikeTargetList: [...al2AndAbove] }
    ]
  },
  {
    executableOsId: 'linux-arm64-openssl3',
    compileBuildVariant: 'linux_arm64_build_openssl3',
    kerberosConnectivityTestDockerfiles: [...krbConnTestsOpenSSL3],
    packages: [
      { name: 'linux-arm64-openssl3', description: publicDescriptions.linux_arm64, packageType: 'tgz with shared OpenSSL 3', packageOn: 'linux_package', smokeTestKind: 'none', serverLikeTargetList: [...al2AndAbove] },
      { name: 'deb-arm64-openssl3', description: publicDescriptions.debian_arm64, packageType: 'deb with shared OpenSSL 3', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['ubuntu22.04-deb', 'ubuntu22.04-fips-deb', 'debian12-deb'], serverLikeTargetList: [...ubuntu1804AndAboveAndDebBased] },
      { name: 'rpm-arm64-openssl3', description: publicDescriptions.rhel_arm64, packageType: 'rpm with shared OpenSSL 3', packageOn: 'linux_package', smokeTestKind: 'docker', smokeTestDockerfiles: ['rocky8-epel-rpm', 'rocky9-rpm', 'rocky9-fips-rpm', 'amazonlinux2023-rpm'], serverLikeTargetList: [...al2AndAbove] }
    ]
  },
  {
    executableOsId: 'linux-ppc64le',
    compileBuildVariant: 'linux_ppc64le_build',
    packages: [
      { name: 'linux-ppc64le', description: publicDescriptions.linux_ppc64le, packageType: 'tgz', packageOn: 'linux_package', smokeTestKind: 'none', serverLikeTargetList: [...rhel81AndAbove] },
      { name: 'rpm-ppc64le', description: publicDescriptions.rhel_ppc64le, packageType: 'rpm', packageOn: 'linux_package', smokeTestKind: 'rpmextract', serverLikeTargetList: [...rhel81AndAbove] }
    ]
  },
  {
    executableOsId: 'linux-s390x',
    compileBuildVariant: 'linux_s390x_build',
    packages: [
      { name: 'linux-s390x', description: publicDescriptions.linux_s390x, packageType: 'tgz', packageOn: 'linux_package', smokeTestKind: 'none', serverLikeTargetList: [...rhel72AndAbove] },
      { name: 'rpm-s390x', description: publicDescriptions.rhel_s390x, packageType: 'rpm', packageOn: 'linux_package', smokeTestKind: 'rpmextract', serverLikeTargetList: [...rhel72AndAbove] }
    ]
  },
  {
    executableOsId: 'win32',
    compileBuildVariant: 'win32_build',
    packages: [
      { name: 'win32-x64', description: publicDescriptions.win32_x64, packageType: 'zip', packageOn: 'win32', smokeTestKind: 'ssh', serverLikeTargetList: ['windows'] },
      { name: 'win32msi-x64', description: publicDescriptions.win32_x64, packageType: 'msi', packageOn: 'win32', smokeTestKind: 'ssh', serverLikeTargetList: ['windows'] }
    ]
  }
];
