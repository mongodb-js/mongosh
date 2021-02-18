/* eslint-disable camelcase */
import { promises as fs, constants } from 'fs';
import { default as fetchFn } from 'node-fetch';
import os from 'os';
import path from 'path';
import YAML from 'yaml';

export type EvergreenTaskStatus = 'undispatched' | 'scheduled' | 'started' | 'success' | 'failed' | 'aborted';

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
      throw new Error(`Could not find local evergreen configuration: ${pathToConfiguration}. Ensure it exists and can be read.`);
    }

    const configuration = YAML.parse(await fs.readFile(pathToConfiguration, { encoding: 'utf-8' }));
    ['api_server_host', 'user', 'api_key'].forEach(key => {
      if (typeof configuration[key] !== 'string') {
        throw new Error(`Evergreen configuration ${pathToConfiguration} misses required key ${key}`);
      }
    });
    return new EvergreenApi(
      configuration.api_server_host,
      configuration.user,
      configuration.api_key,
    );
  }

  public async getTasks(
    project: string,
    commitSha: string
  ): Promise<EvergreenTask[]> {
    return await this.apiGET<EvergreenTask[]>(
      `/projects/${project}/revisions/${commitSha}/tasks`
    );
  }

  private async apiGET<T>(path: string): Promise<T> {
    const response = await this.fetch(
      `${this.apiBasepath}/rest/v2${path}`,
      { headers: this.getApiHeaders() }
    );

    if (response.status >= 300) {
      throw new Error(`Unexpected response status: ${response.status} - ${await response.text()}`);
    }
    return await response.json();
  }

  private getApiHeaders(): Record<string, string> {
    return {
      'Api-User': this.apiUser,
      'Api-Key': this.apiKey,
    };
  }
}
