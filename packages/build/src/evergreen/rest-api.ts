import { promises as fs, constants } from 'fs';
import { default as fetchFn } from 'node-fetch';
import os from 'os';
import path from 'path';
import YAML from 'yaml';

export type EvergreenTaskStatus =
  | 'undispatched'
  | 'scheduled'
  | 'started'
  | 'success'
  | 'failed'
  | 'aborted';

// For full specification of all fields see: https://github.com/evergreen-ci/evergreen/wiki/REST-V2-Usage#objects
export interface EvergreenTask {
  task_id: string;
  version_id: string;
  display_name: string;
  build_variant: string;
  status: EvergreenTaskStatus;
}

export class EvergreenApi {
  constructor(
    public readonly apiBasepath: string,
    public readonly apiUser: string,
    public readonly apiKey: string,
    private readonly fetch: typeof fetchFn = fetchFn
  ) {}

  public static async fromUserConfiguration(
    pathToConfiguration = path.join(os.homedir(), '.evergreen.yml')
  ): Promise<EvergreenApi> {
    try {
      await fs.access(pathToConfiguration, constants.R_OK);
    } catch {
      throw new Error(
        `Could not find local evergreen configuration: ${pathToConfiguration}. Ensure it exists and can be read.`
      );
    }

    const configuration = YAML.parse(
      await fs.readFile(pathToConfiguration, { encoding: 'utf-8' })
    );
    ['api_server_host', 'user', 'api_key'].forEach((key) => {
      if (typeof configuration[key] !== 'string') {
        throw new Error(
          `Evergreen configuration ${pathToConfiguration} misses required key ${key}`
        );
      }
    });
    return new EvergreenApi(
      configuration.api_server_host,
      configuration.user,
      configuration.api_key
    );
  }

  /**
   * This will return the tasks that were executed for a given commit SHA.
   * HOWEVER, Evergreen will return tasks from _all_ patch / waterfull runs based on the commit.
   * One way to narrow the tasks down is to filter by a given tag that was used to trigger
   * the waterfall build.
   *
   * @param project The Evergreen project
   * @param commitSha The commit SHA of the desired commit to get tasks for
   * @param tagFilter An optional filter to only look for tasks triggered by a specific tag
   */
  public async getTasks(
    project: string,
    commitSha: string,
    tagFilter?: string
  ): Promise<EvergreenTask[]> {
    // we use limit=5000 to make sure we really get all of those tasks (default limit is 100)
    const tasks = await this.apiGET<EvergreenTask[]>(
      `/projects/${project}/revisions/${commitSha}/tasks?limit=5000`
    );
    return !tagFilter
      ? tasks
      : tasks.filter((t) =>
          t.version_id.startsWith(`${project}_${tagFilter.replace(/-/g, '_')}`)
        );
  }

  private async apiGET<T>(path: string): Promise<T> {
    const response = await this.fetch(`${this.apiBasepath}/rest/v2${path}`, {
      headers: this.getApiHeaders(),
    });

    if (response.status >= 300) {
      throw new Error(
        `Unexpected response status: ${
          response.status
        } - ${await response.text()}`
      );
    }
    return (await response.json()) as T;
  }

  private getApiHeaders(): Record<string, string> {
    return {
      'Api-User': this.apiUser,
      'Api-Key': this.apiKey,
    };
  }
}
