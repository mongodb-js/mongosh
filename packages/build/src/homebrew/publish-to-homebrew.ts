import type { GithubRepo } from '@mongodb-js/devtools-github-repo';
import { generateUpdatedFormula as generateUpdatedFormulaFn } from './generate-formula';
import { updateHomebrewFork as updateHomebrewForkFn } from './update-homebrew-fork';
import { npmPackageSha256 as npmPackageSha256Fn } from './utils';

export type HomebrewPublisherConfig = {
  homebrewCore: GithubRepo;
  homebrewCoreFork: GithubRepo;
  packageVersion: string;
  githubReleaseLink: string;
  isDryRun?: boolean;
};

export class HomebrewPublisher {
  public config: HomebrewPublisherConfig;
  readonly npmPackageSha256: typeof npmPackageSha256Fn;
  readonly generateFormula: typeof generateUpdatedFormulaFn;
  readonly updateHomebrewFork: typeof updateHomebrewForkFn;

  constructor(
    config: HomebrewPublisherConfig,
    {
      npmPackageSha256 = npmPackageSha256Fn,
      generateFormula = generateUpdatedFormulaFn,
      updateHomebrewFork = updateHomebrewForkFn,
    } = {}
  ) {
    this.config = config;
    this.npmPackageSha256 = npmPackageSha256;
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

    const cliReplPackageUrl = `https://registry.npmjs.org/@mongosh/cli-repl/${packageVersion}`;
    const packageSha = isDryRun
      ? `dryRun-fakesha256-${Date.now()}`
      : await this.npmPackageSha256(cliReplPackageUrl);

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

    const description = [
      `This PR was created automatically and bumps \`mongosh\` to the latest [published version](${githubReleaseLink}) \`${packageVersion}\`.`,
      '',
      '-----',
      '',
      '<!-- Do not tick a checkbox if you haven\u{2019}t performed its action. Honesty is indispensable for a smooth review process. -->',
      '<!-- Use [x] to mark item done before creation, or just click the checkboxes with device pointer after creation -->',
      "<!-- In the following questions `<formula>` is the name of the formula you're editing. -- > ",
      '',
      '- [x] Have you followed the [guidelines for contributing](https://github.com/Homebrew/homebrew-core/blob/HEAD/CONTRIBUTING.md)?',
      '- [x] Have you ensured that your commits follow the [commit style guide](https://docs.brew.sh/Formula-Cookbook#commit)?',
      "- [x] Have you checked that there aren't other open[pull requests](https://github.com/Homebrew/homebrew-core/pulls) for the same formula update/change?",
      '- [x] Have you built your formula locally with `HOMEBREW_NO_INSTALL_FROM_API=1 brew install --build-from-source <formula>`?',
      '- [x] Is your test running fine `brew test <formula>`?',
      '- [x] Does your build pass `brew audit --strict <formula>` (after doing `HOMEBREW_NO_INSTALL_FROM_API=1 brew install --build-from-source <formula>`)? If this is a new formula, does it pass `brew audit --new <formula>`?',
      '',
      '-----',
      '',
      '- [ ] AI was used to generate or assist with generating this PR. *Please specify below how you used AI to help you, and what steps you have taken to manually verify the changes*.',
      '',
      '-----',
    ].join('\n');

    if (isDryRun) {
      await homebrewCoreFork.deleteBranch(forkBranch);
      console.warn('Deleted branch instead of creating homebrew PR');
      return;
    }
    const pr = await homebrewCore.createPullRequest(
      `mongosh ${packageVersion}`,
      description,
      `${homebrewCoreFork.repo.owner}:${forkBranch}`,
      'main'
    );
    console.info(
      `Created PR #${pr.prNumber} in ${homebrewCore.repo.owner}/${homebrewCore.repo.repo}: ${pr.url}`
    );
  }
}
