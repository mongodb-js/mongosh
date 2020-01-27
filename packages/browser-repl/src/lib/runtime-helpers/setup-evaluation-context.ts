import Mapper from 'mongosh-mapper';
import ShellApi from 'mongosh-shell-api';

export function setupEvaluationContext(context: object, serviceProvider: object): void {
  const mapper = new Mapper(serviceProvider);
  const shellApi = new ShellApi(mapper);

  Object.keys(shellApi)
    .filter(k => (!k.startsWith('_')))
    .forEach(k => (context[k] = shellApi[k]));
  mapper.setCtx(context);
}
