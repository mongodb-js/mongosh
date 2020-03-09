export default class Types {
  constructor(shellTypes) {
    Object.keys(shellTypes).forEach((t) => {
      this[t] = shellTypes[t];
    });
    const handler = {
      get: function(obj, prop): any {
        if (!(prop in obj)) {
          return;
        }
        return obj[prop];
      }
    };
    return new Proxy(this, handler);
  }
}
