import Mapper from 'mongosh-mapper';
import ShellApi from 'mongosh-shell-api';

export function setupEvaluationContext(context: object, serviceProvider: object): void {
  const mapper = new Mapper(serviceProvider);
  const shellApi = new ShellApi(mapper);

  Object.keys(shellApi)
    .filter(k => (!k.startsWith('_')))
    .forEach(k => {
      const value = shellApi[k];

      if (typeof(value) === 'function') {
        context[k] = value.bind(shellApi);
      } else {
        context[k] = value;
      }
    });

  mapper.setCtx(context);
}
