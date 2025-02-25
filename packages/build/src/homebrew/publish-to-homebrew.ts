import type { GithubRepo } from '@mongodb-js/devtools-github-repo';
import { generateUpdatedFormula as generateUpdatedFormulaFn } from './generate-formula';
import { updateHomebrewFork as updateHomebrewForkFn } from './update-homebrew-fork';
import { httpsSha256 as httpsSha256Fn } from './utils';

export type HomebrewPublisherConfig = {
  homebrewCore: GithubRepo;
  homebrewCoreFork: GithubRepo;
  packageVersion: string;
  githubReleaseLink: string;
  isDryRun?: boolean;
};

export class HomebrewPublisher {
  readonly httpsSha256: typeof httpsSha256Fn;
  readonly generateFormula: typeof generateUpdatedFormulaFn;
  readonly updateHomebrewFork: typeof updateHomebrewForkFn;

  constructor(
    public config: HomebrewPublisherConfig,
    {
      httpsSha256 = httpsSha256Fn,
      generateFormula = generateUpdatedFormulaFn,
      updateHomebrewFork = updateHomebrewForkFn,
    } = {}
  ) {
    this.httpsSha256 = httpsSha256;
    this.generateFormula = generateFormula;
    this.updateHomebrewFork = updateHomebrewFork;
  }

  async publish(): Promise<void> {
    const {
      isDryRun,
      homebrewCore,
      packageVersion,
      homebrewCoreFork,
      githubReleaseLink,
    } = this.config;

    const cliReplPackageUrl = `https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-${packageVersion}.tgz`;
    const packageSha = isDryRun
      ? `dryRun-fakesha256-${Date.now()}`
      : await this.httpsSha256(cliReplPackageUrl);

    const homebrewFormula = await this.generateFormula(
      { version: packageVersion, sha: packageSha },
      homebrewCore,
      isDryRun || false
    );
    if (!homebrewFormula) {
      console.warn('There are no changes to the homebrew formula');
      return;
    }

    const forkBranch = await this.updateHomebrewFork({
      packageVersion,
      packageSha,
      homebrewFormula,
      homebrewCore,
      homebrewCoreFork,
      isDryRun: isDryRun || false,
    });
    if (!forkBranch) {
      console.warn('There are no changes to the homebrew formula');
      return;
    }

    const description = `This PR was created automatically and bumps \`mongosh\` to the latest published version \`${packageVersion}\`.\n\nFor additional details see ${githubReleaseLink}.`;

    if (isDryRun) {
      await homebrewCoreFork.deleteBranch(forkBranch);
      console.warn('Deleted branch instead of creating homebrew PR');
      return;
    }
    const pr = await homebrewCore.createPullRequest(
      `mongosh ${packageVersion}`,
      description,
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `${homebrewCoreFork.repo.owner}:${forkBranch}`,
      'master'
    );
    console.info(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `Created PR #${pr.prNumber} in ${homebrewCore.repo.owner}/${homebrewCore.repo.repo}: ${pr.url}`
    );
  }
}
