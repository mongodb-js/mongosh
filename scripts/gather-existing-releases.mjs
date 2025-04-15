// Pre-generate a mongosh download JSON feed file from existing github releases.
// Writes the result to `mongosh-versions.json`.

import { Octokit } from '@octokit/rest';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import fetch from 'node-fetch';
import { createHash } from 'crypto';
import { once } from 'events';
import * as path from 'path';

const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN
})

let releases;
let serverFullJSON;
if (process.env.FRESH_DL) {
  serverFullJSON = await (await fetch('https://downloads.mongodb.org/full.json')).json();
  releases = (await octokit.request('GET /repos/{owner}/{repo}/releases', {
    owner: 'mongodb-js',
    repo: 'mongosh',
    per_page: 100,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })).data
  await fs.writeFile('releases.json', JSON.stringify(releases));
  await fs.writeFile('server-full.json', JSON.stringify(serverFullJSON));
} else {
  releases = JSON.parse(await fs.readFile('releases.json', 'utf-8'));
  serverFullJSON = JSON.parse(await fs.readFile('server-full.json', 'utf-8'));
}

const allArchs = [...new Set(serverFullJSON.versions.flatMap(v=>v.downloads).flatMap(v=>v.arch))].sort().filter(Boolean);
const allTargets = [...new Set(serverFullJSON.versions.flatMap(v=>v.downloads).flatMap(v=>v.target))].sort().filter(Boolean);

console.log({allArchs,allTargets})

allTargets.push('debian12')

let productionReleases = releases.filter(release => release.name && !release.name.startsWith('0.'));
let versions = [];
for (const release of productionReleases) {
  versions.push({
    version: release.name,
    githash: execSync(`git rev-parse '${release.tag_name}'`).toString().trim(),
    downloads: await Promise.all(release.assets.filter(({name}) => !name.endsWith('.sig')).map(async ({name}) => {
      const archMatch = name.match(/(\b|_)(aarch64|arm64|ppc64|ppc64le|s390x|x86_64|x64|amd64)(\b|_)/);
      if (!archMatch) throw new Error(`Cannot assign architecture to filename ${name}`);
      const filenameArch = archMatch[2];
      const arch = {
        'aarch64': 'arm64',
        'x64': 'x86_64',
        'amd64': 'x86_64'
      }[filenameArch] ?? filenameArch;
      const url = `https://downloads.mongodb.com/compass/${name}`
      let targets;

      const rhel81AndAbove = ['rhel81', 'rhel82', 'rhel83', 'rhel90']
      const rhel80AndAbove = ['rhel80', ...rhel81AndAbove]
      const rhel72AndAbove = ['rhel72', ...rhel80AndAbove]
      const al2AndAbove = ['amazon2', 'amazon2023', ...rhel81AndAbove]
      const rhel70AndAboveAndRpmBased = ['rhel70', 'rhel71', ...rhel72AndAbove, 'amazon', ...al2AndAbove, 'suse12', 'suse15']
      const ubuntu1804AndAboveAndDebBased = ['ubuntu1804', 'ubuntu1804', 'ubuntu2004', 'ubuntu2204', 'ubuntu2404', 'debian10', 'debian11', 'debian12']
      const allLinux = [...rhel70AndAboveAndRpmBased, ...ubuntu1804AndAboveAndDebBased]

      for (const [re, targets_] of [
        [/^mongodb-mongosh(-shared-openssl\d+)?-1.((5|6|7|8|9|1\d+)\.\d+).(aarch64).rpm$/, al2AndAbove],
        [/^mongodb-mongosh(-shared-openssl\d+)?-1.((5|6|7|8|9|1\d+)\.\d+).(x86_64).rpm$/, rhel70AndAboveAndRpmBased],
        [/^mongodb-mongosh(-shared-openssl\d+)?-1.((5|6|7|8|9|1\d+)\.\d+).(ppc64le).rpm$/, rhel81AndAbove],
        [/^mongodb-mongosh(-shared-openssl\d+)?-1.((5|6|7|8|9|1\d+)\.\d+).(s390x).rpm$/, rhel72AndAbove],

        [/^mongodb-mongosh(-shared-openssl\d+)?_1.(\d+\.\d+)_(amd64|arm64).deb$/, ubuntu1804AndAboveAndDebBased],

        [/^mongosh-1.(\d+\.\d+)-linux-(x64)(-openssl11|-openssl3)?.tgz$/, allLinux],
        [/^mongosh-1.(\d+\.\d+)-linux-(arm64)(-openssl11|-openssl3)?.tgz$/, [...al2AndAbove, ...ubuntu1804AndAboveAndDebBased]],
        [/^mongosh-1.(\d+\.\d+)-linux-(ppc64le)(-openssl11|-openssl3)?.tgz$/, rhel81AndAbove],
        [/^mongosh-1.(\d+\.\d+)-linux-(s390x)(-openssl11|-openssl3)?.tgz$/, rhel72AndAbove],

        [/^mongosh-1.(\d+\.\d+)-darwin-(arm64|x64).zip$/, ['macos']],
        [/^mongosh-1.(\d+\.\d+)-win32-x64.zip$/, ['windows']],
        [/^mongosh-1.(\d+\.\d+)-x64.msi$/, ['windows']],

        [/^mongodb-mongosh(-shared-openssl\d+)?-1.(\d+\.\d+).amzn1.(aarch64|x86_64).rpm$/, ['amazon']],
        [/^mongodb-mongosh(-shared-openssl\d+)?-1.(\d+\.\d+).amzn2.(aarch64|x86_64).rpm$/, ['amazon2']],
        [/^mongodb-mongosh(-shared-openssl\d+)?-1.(\d+\.\d+).el7.(aarch64|x86_64|s390x|ppc64le).rpm$/, ['rhel70', 'rhel71', 'rhel72']],
        [/^mongodb-mongosh(-shared-openssl\d+)?-1.(\d+\.\d+).el8.(aarch64|x86_64|s390x|ppc64le).rpm$/, [...rhel80AndAbove]],
        [/^mongodb-mongosh(-shared-openssl\d+)?-1.(\d+\.\d+).suse12.(aarch64|x86_64).rpm$/, ['suse12', 'suse15']],
      ]) {
        if (re.test(name)) {
          targets = [...new Set(targets_)];
          break;
        }
      }
      if (!targets?.length) throw new Error(`Cannot assign targets list to filename ${name}`);
      if (!(allArchs.includes(arch))) throw new Error(`Unknown or invalid arch value: ${arch}`);
      if (!(targets.every(t => allTargets.includes(t)))) throw new Error(`Unknown or invalid target values: ${targets}`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`unexpected response ${response.statusText} for ${url}`);
      const sha256 = createHash('sha256');
      const sha1 = createHash('sha1');
      response.body.pipe(sha256);
      response.body.pipe(sha1);
      await Promise.all([once(sha1, 'finish'), once(sha256, 'finish')]);
      return {
        arch,
        targets,
        sharedOpenssl: name.includes('-openssl11') ? 'openssl11' : name.includes('-openssl3') ? 'openssl3' : undefined,
        archive: {
          type: path.extname(name).replace(/^\./, ''),
          url: url,
          sha256: sha256.digest('hex'),
          sha1: sha1.digest('hex'),
        }
      }
    }))
  });
}

await fs.writeFile('mongosh-versions.json', JSON.stringify({ versions }, null, 2));
