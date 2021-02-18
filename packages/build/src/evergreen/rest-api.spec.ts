import { expect } from 'chai';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import sinon from 'sinon';
import YAML from 'yaml';
import { EvergreenApi, EvergreenTask } from './rest-api';

describe('evergreen rest-api', () => {
  describe('from user configuration', () => {
    const configData = {
      api_server_host: 'host',
      user: 'user',
      api_key: 'key'
    };
    const writeEvergreenConfiguration = async(content: string): Promise<string> => {
      const configFile = path.join(os.tmpdir(), `evergreen-${new Date().getTime()}-${Math.random()}.yaml`);
      await fs.writeFile(configFile, content, { encoding: 'utf-8' });
      return configFile;
    };

    it('parses a configuration file correctly', async() => {
      const configFile = await writeEvergreenConfiguration(YAML.stringify(configData));
      const api = await EvergreenApi.fromUserConfiguration(configFile);
      expect(api.apiBasepath).to.equal('host');
      expect(api.apiUser).to.equal('user');
      expect(api.apiKey).to.equal('key');
    });

    it('throws an error when the configuration file does not exist', async() => {
      try {
        await EvergreenApi.fromUserConfiguration('kasldjflasjk dfalsd jfsdfk');
      } catch (e) {
        expect(e.message).to.contain('Could not find local evergreen configuration');
        return;
      }
      expect.fail('Expected error');
    });

    ['api_server_host', 'user', 'api_key'].forEach(key => {
      it(`throws an error if ${key} is missing`, async() => {
        const data: Record<string, string> = {
          ...configData
        };
        delete data[key];
        const configFile = await writeEvergreenConfiguration(YAML.stringify(data));
        try {
          await EvergreenApi.fromUserConfiguration(configFile);
        } catch (e) {
          expect(e.message).to.contain(key);
        }
      });
    });
  });

  describe('getTasks', () => {
    let fetch: sinon.SinonStub;
    let api: EvergreenApi;

    beforeEach(() => {
      fetch = sinon.stub();
      api = new EvergreenApi(
        '//basePath/api', 'user', 'key', fetch as any
      );
    });

    it('executes a proper GET', async() => {
      const task: EvergreenTask = {
        task_id: 'task_id',
        version_id: 'version',
        status: 'success',
        display_name: 'Task',
        build_variant: 'variant'
      };
      fetch.resolves({
        status: 200,
        json: sinon.stub().resolves([task])
      });

      const tasks = await api.getTasks('mongosh', 'sha');
      expect(tasks).to.deep.equal([task]);
      expect(fetch).to.have.been.calledWith(
        '//basePath/api/rest/v2/projects/mongosh/revisions/sha/tasks',
        {
          headers: {
            'Api-User': 'user',
            'Api-Key': 'key'
          }
        }
      );
    });

    it('fails if there is a non-200 response code', async() => {
      fetch.resolves({
        status: 404,
        text: sinon.stub().resolves('ERR: Not found')
      });

      try {
        await api.getTasks('mongosh', 'sha');
      } catch (e) {
        expect(e.message).to.equal('Unexpected response status: 404 - ERR: Not found');
        return;
      }
      expect.fail('Expected error');
    });
  });
});
