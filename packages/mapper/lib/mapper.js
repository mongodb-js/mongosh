const { Database, Cursor } = require('mongosh-shell-api');

class Mapper {
  constructor(serviceProvider) {
    this._serviceProvider = serviceProvider;

    this.setCtx = (ctx) => {
      this._ctx = ctx;
      this._ctx.db = new Database(this, 'test');
    };

    /**
     * RunCommand
     * @param database {Database} - reference to the database object this method is called from.
     * @param cmd {Object} - command spec
     * @return {*|Promise} TODO
     */
    this.runCommand = (database, cmd) => {
      return this._serviceProvider.runCommand(database.database, cmd);
    };
    
    this.use = (db) => {
      this._ctx.db = new Database(this, db);
      return `switched to db ${db}`;
    };

    /**
     * Find command
     * @param collection {Collection} - reference to the collection object this method is called from.
     * @param query {Object} - query spec
     * @param projection {Object} - projection spec
     * @return {ShellApi.Cursor} - newly instantiated cursor object
     */
    this.find = (collection, query, projection) => {
      const options = {};
      if (projection) {
        options.projection = projection;
      }
      return new Cursor(
        this,
        this._serviceProvider.find(
          collection.database,
          collection.collection,
          query ? query : {},
          options
        )
      );
    }
  }

}

module.exports = Mapper;
