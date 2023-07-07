import { expect } from 'chai';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import sinon from 'sinon';
import YAML from 'yaml';
import type { EvergreenTask } from './rest-api';
import { EvergreenApi } from './rest-api';

describe('evergreen rest-api', function () {
  describe('from user configuration', function () {
    const configData = {
      api_server_host: 'host',
      user: 'user',
      api_key: 'key',
    };
    const writeEvergreenConfiguration = async (
      content: string
    ): Promise<string> => {
      const configFile = path.join(
        os.tmpdir(),
        `evergreen-${new Date().getTime()}-${Math.random()}.yaml`
      );
      await fs.writeFile(configFile, content, { encoding: 'utf-8' });
      return configFile;
    };

    it('parses a configuration file correctly', async function () {
      const configFile = await writeEvergreenConfiguration(
        YAML.stringify(configData)
      );
      const api = await EvergreenApi.fromUserConfiguration(configFile);
      expect(api.apiBasepath).to.equal('host');
      expect(api.apiUser).to.equal('user');
      expect(api.apiKey).to.equal('key');
    });

    it('throws an error when the configuration file does not exist', async function () {
      try {
        await EvergreenApi.fromUserConfiguration('kasldjflasjk dfalsd jfsdfk');
      } catch (e: any) {
        expect(e.message).to.contain(
          'Could not find local evergreen configuration'
        );
        return;
      }
      expect.fail('Expected error');
    });

    ['api_server_host', 'user', 'api_key'].forEach((key) => {
      it(`throws an error if ${key} is missing`, async function () {
        const data: Record<string, string> = {
          ...configData,
        };
        delete data[key];
        const configFile = await writeEvergreenConfiguration(
          YAML.stringify(data)
        );
        try {
          await EvergreenApi.fromUserConfiguration(configFile);
        } catch (e: any) {
          expect(e.message).to.contain(key);
        }
      });
    });
  });

  describe('getTasks', function () {
    let fetch: sinon.SinonStub;
    let api: EvergreenApi;

    beforeEach(function () {
      fetch = sinon.stub();
      api = new EvergreenApi('//basePath/api', 'user', 'key', fetch as any);
    });

    it('returns all tasks from the API when there is no tag filter', async function () {
      const task: EvergreenTask = {
        task_id: 'task_id',
        version_id: 'version',
        status: 'success',
        display_name: 'Task',
        build_variant: 'variant',
      };
      fetch.resolves({
        status: 200,
        json: sinon.stub().resolves([task]),
      });

      const tasks = await api.getTasks('mongosh', 'sha');
      expect(tasks).to.deep.equal([task]);
      expect(fetch).to.have.been.calledWith(
        '//basePath/api/rest/v2/projects/mongosh/revisions/sha/tasks?limit=5000',
        {
          headers: {
            'Api-User': 'user',
            'Api-Key': 'key',
          },
        }
      );
    });

    it('returns only matching tasks from the API for a tag filter', async function () {
      const task1: EvergreenTask = {
        task_id: 'task_id',
        version_id: 'version',
        status: 'success',
        display_name: 'Task',
        build_variant: 'variant',
      };
      const task2: EvergreenTask = {
        task_id: 'task_id2',
        version_id: 'mongosh_v0.8.2_draft.0_29jasdf',
        status: 'success',
        display_name: 'Task',
        build_variant: 'variant',
      };
      fetch.resolves({
        status: 200,
        json: sinon.stub().resolves([task1, task2]),
      });

      const tasks = await api.getTasks('mongosh', 'sha', 'v0.8.2-draft.0');
      expect(tasks).to.deep.equal([task2]);
      expect(fetch).to.have.been.calledWith(
        '//basePath/api/rest/v2/projects/mongosh/revisions/sha/tasks?limit=5000',
        {
          headers: {
            'Api-User': 'user',
            'Api-Key': 'key',
          },
        }
      );
    });

    it('fails if there is a non-200 response code', async function () {
      fetch.resolves({
        status: 404,
        text: sinon.stub().resolves('ERR: Not found'),
      });

      try {
        await api.getTasks('mongosh', 'sha');
      } catch (e: any) {
        expect(e.message).to.equal(
          'Unexpected response status: 404 - ERR: Not found'
        );
        return;
      }
      expect.fail('Expected error');
    });
  });
});
