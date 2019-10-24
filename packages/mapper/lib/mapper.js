const { Database } = require('mongodbsh-shell-api');

class Mapper {
  constructor(ctx, serviceProvider) {
    this._ctx = ctx;
    this._ctx.db = new Database(this, 'test');
    this._serviceProvider = serviceProvider;

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
