const { Database } = require('mongodbsh-shell-api');

class Mapper {
  constructor(serviceProvider) {
    this._serviceProvider = serviceProvider;

    this.setCtx = (ctx) => {
      this._ctx = ctx;
      this._ctx.db = new Database(this, 'test');
    };

    this.runCommand = (cmd) => {
      return this._serviceProvider.runCommand(this._ctx.db.database, cmd);
    };
    
    this.use = (db) => {
      this._ctx.db = new Database(this, db);
      return `switched to db ${db}`;
    };
  }

}

module.exports = Mapper;
