export default {
  type: 'ShellApi',
  hasAsyncChild: false,
  attributes: {
    use: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    it: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    show: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] }
  }
};
