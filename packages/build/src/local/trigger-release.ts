import path from 'path';
import { triggerReleaseDraft } from './trigger-release-draft';
import { triggerReleasePublish } from './trigger-release-publish';

export async function triggerRelease(args: string[]): Promise<void> {
  if (args.length < 1) {
    throw new Error('Missing command to trigger release: draft/publish');
  }

  const repositoryRoot = path.resolve(__dirname, '..', '..', '..', '..');

  const command = args[0];
  switch (command) {
    case 'draft':
      await triggerReleaseDraft(repositoryRoot);
      break;
    case 'publish':
      await triggerReleasePublish(repositoryRoot);
      break;
    default:
      throw new Error(`Unknown command ${command} - must be draft or publish`);
  }
}
